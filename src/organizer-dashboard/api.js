const express = require('express');
const { 
  Conference, 
  User, 
  Participant, 
  Poll, 
  PollOption, 
  Question, 
  Meeting,
  TariffPlan,
  Subscription
} = require('../models/mysql');
const { 
  ensureUserFromTelegram, 
  userIsMainAdmin, 
  updateConference, 
  startConference, 
  createConference, 
  listConferencesForUser, 
  endConference,
  stopConference
} = require('../services/conference.service');
const { setSlide, clearSlide } = require('../services/slide.service');
const { getConferenceIdByCode } = require('../lib/conference-helper');
const { requireSecondScreenKey } = require('../second-screen/ss-middleware');
const { Op } = require('sequelize');

async function isConferenceAdminFor({ user, conference }) {
  const participation = await Participant.findOne({ where: { userId: user.id, conferenceId: conference.id } });
  return participation && participation.role === 'organizer';
}

const router = express.Router();

// Helper middleware to get user without conference requirement
async function requireUser(req, res, next) {
  try {
    const telegramId = req.query.telegramId || req.body.telegramId;
    
    if (!telegramId) {
      return res.status(400).json({ error: 'Telegram ID is required' });
    }

    const user = await ensureUserFromTelegram({ id: parseInt(telegramId, 10) });
    req.user = user;
    next();
  } catch (err) {
    console.error('Error in requireUser:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Middleware to check admin access for a conference
async function requireConferenceAdmin(req, res, next) {
  try {
    const { code } = req.params;
    const telegramId = req.query.telegramId || req.body.telegramId;
    
    if (!telegramId) {
      return res.status(400).json({ error: 'Telegram ID is required' });
    }

    const user = await ensureUserFromTelegram({ id: parseInt(telegramId, 10) });
    const conference = await Conference.findOne({ where: { conferenceCode: code } });
    
    if (!conference) {
      return res.status(404).json({ error: 'Conference not found' });
    }

    const isMainAdmin = userIsMainAdmin(user);
    const isAdmin = await isConferenceAdminFor({ user, conference });
    
    if (!isMainAdmin && !isAdmin) {
      return res.status(403).json({ error: 'Access denied. You must be a conference administrator.' });
    }

    req.user = user;
    req.conference = conference;
    next();
  } catch (err) {
    console.error('Error in requireConferenceAdmin:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Middleware to check global system admin access
async function requireSystemAdmin(req, res, next) {
  try {
    const telegramId = req.query.telegramId || req.body.telegramId;
    if (!telegramId) {
      return res.status(400).json({ error: 'Telegram ID is required' });
    }
    const user = await ensureUserFromTelegram({ id: parseInt(telegramId, 10) });
    if (!userIsMainAdmin(user)) {
      return res.status(403).json({ error: 'Access denied. You must be a system administrator.' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('Error in requireSystemAdmin:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// All routes require second screen key
router.use(requireSecondScreenKey);

// Global user list and toggle for system admin panel (Main Admin only)
router.get('/admin/users', requireSystemAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json({
      items: users.map(u => ({
        id: u.id,
        telegramId: u.telegramId,
        firstName: u.firstName,
        lastName: u.lastName,
        username: u.username,
        email: u.email,
        globalRole: u.globalRole,
        interests: u.interests || [],
        lookingFor: u.lookingFor || '', // purpose of participation
        allowConferenceCreation: u.allowConferenceCreation,
        allowBulkNotifications: u.allowBulkNotifications,
        createdAt: u.createdAt,
      })),
      total: users.length
    });
  } catch (err) {
    console.error('Error in GET /admin/users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/admin/users/:userId', requireSystemAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { globalRole, allowConferenceCreation } = req.body;

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updates = {};
    if (globalRole !== undefined) updates.globalRole = globalRole;
    if (allowConferenceCreation !== undefined) updates.allowConferenceCreation = !!allowConferenceCreation;

    await user.update(updates);
    res.json({ success: true, user });
  } catch (err) {
    console.error('Error in PUT /admin/users/:userId:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Routes that don't require conference code (user-level operations)
router.use('/user', requireUser);

// GET /organizer-api/user/conferences - List all conferences for user
router.get('/user/conferences', async (req, res) => {
  try {
    const conferences = await listConferencesForUser(req.user, { role: 'organizer' });
    
    res.json({
      items: conferences.map(c => ({
        id: c.id,
        code: c.conferenceCode,
        title: c.title,
        description: c.description,
        access: c.access,
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        isActive: c.isActive,
        isEnded: c.isEnded,
        createdAt: c.createdAt,
      })),
      total: conferences.length,
    });
  } catch (err) {
    console.error('Error in GET /user/conferences:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /organizer-api/user/conferences - Create new conference
router.post('/user/conferences', async (req, res) => {
  try {
    // Check permission to create conference
    if (!req.user.allowConferenceCreation && req.user.globalRole !== 'main_admin') {
      return res.status(403).json({ error: 'Conference creation is disabled for your account.' });
    }

    const { title, description, access, startsAt, endsAt } = req.body;
    
    const conference = await createConference({
      createdByUser: { id: req.user.telegramId, username: req.user.username, first_name: req.user.firstName, last_name: req.user.lastName },
      payload: { title, description, access, startsAt, endsAt },
    });

    // Auto-assign creator as organizer
    await Participant.findOrCreate({
      where: { userId: req.user.id, conferenceId: conference.id },
      defaults: { role: 'organizer', status: 'approved' }
    });

    res.status(201).json({
      id: conference.id,
      code: conference.conferenceCode,
      title: conference.title,
      description: conference.description,
      access: conference.access,
      startsAt: conference.startsAt,
      endsAt: conference.endsAt,
    });
  } catch (err) {
    if (err.message === 'LIMIT_EXCEEDED') {
      return res.status(403).json({ 
        error: 'Limit exceeded',
        details: err.details,
      });
    }
    console.error('Error in POST /user/conferences:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Routes that require conference code and admin access
router.use('/:code', requireConferenceAdmin);

// GET /organizer-api/:code/conference - Get conference details
router.get('/:code/conference', async (req, res) => {
  try {
    const { conference } = req;
    res.json({
      id: conference.id,
      code: conference.conferenceCode,
      title: conference.title,
      description: conference.description,
      access: conference.access,
      startsAt: conference.startsAt,
      endsAt: conference.endsAt,
      isActive: conference.isActive,
      isEnded: conference.isEnded,
      currentSlideUrl: conference.currentSlideUrl,
      currentSlideTitle: conference.currentSlideTitle,
    });
  } catch (err) {
    console.error('Error in GET /conference:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /organizer-api/:code/conference - Update conference settings
router.put('/:code/conference', async (req, res) => {
  try {
    const { code } = req.params;
    const updated = await updateConference({
      conferenceCode: code,
      requestedByUser: req.user,
      payload: req.body,
    });
    res.json({
      id: updated.id,
      code: updated.conferenceCode,
      title: updated.title,
      description: updated.description,
      access: updated.access,
      startsAt: updated.startsAt,
      endsAt: updated.endsAt,
      isActive: updated.isActive,
      isEnded: updated.isEnded,
    });
  } catch (err) {
    if (err.message === 'CONFERENCE_NOT_FOUND') {
      return res.status(404).json({ error: 'Conference not found' });
    }
    if (err.message === 'ACCESS_DENIED') {
      return res.status(403).json({ error: 'Access denied' });
    }
    console.error('Error in PUT /conference:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /organizer-api/:code/conference/start - Start conference
router.post('/:code/conference/start', async (req, res) => {
  try {
    const { code } = req.params;
    const updated = await startConference(code);
    res.json({ success: true, conference: updated });
  } catch (err) {
    if (err.message === 'CONFERENCE_NOT_FOUND') {
      return res.status(404).json({ error: 'Conference not found' });
    }
    console.error('Error in POST /conference/start:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /organizer-api/:code/conference/stop - Stop conference
router.post('/:code/conference/stop', async (req, res) => {
  try {
    const { code } = req.params;
    const updated = await stopConference(code);
    res.json({ success: true, conference: updated });
  } catch (err) {
    if (err.message === 'CONFERENCE_NOT_FOUND') {
      return res.status(404).json({ error: 'Conference not found' });
    }
    console.error('Error in POST /conference/stop:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /organizer-api/:code/conference/end - End/archive conference
router.post('/:code/conference/end', async (req, res) => {
  try {
    const { code } = req.params;
    const updated = await endConference(code);
    res.json({ success: true, conference: updated });
  } catch (err) {
    if (err.message === 'CONFERENCE_NOT_FOUND') {
      return res.status(404).json({ error: 'Conference not found' });
    }
    console.error('Error in POST /conference/end:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /organizer-api/:code/conference/code - Update conference code
router.put('/:code/conference/code', async (req, res) => {
  try {
    const { code } = req.params;
    const { newCode } = req.body;

    if (!newCode || !/^[a-zA-Z0-9-]+$/.test(newCode)) {
      return res.status(400).json({ error: 'Invalid conference code format. Use letters, numbers, and hyphens only.' });
    }

    const conference = req.conference;
    
    const existing = await Conference.findOne({ where: { conferenceCode: newCode } });
    if (existing && existing.id !== conference.id) {
      return res.status(409).json({ error: 'Conference code already exists' });
    }

    await conference.update({ conferenceCode: newCode });

    res.json({
      id: conference.id,
      code: conference.conferenceCode,
    });
  } catch (err) {
    console.error('Error in PUT /conference/code:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /organizer-api/:code/slides - Get current slide
router.get('/:code/slides', async (req, res) => {
  try {
    const { conference } = req;
    res.json({
      url: conference.currentSlideUrl || null,
      title: conference.currentSlideTitle || null,
    });
  } catch (err) {
    console.error('Error in GET /slides:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /organizer-api/:code/slides - Set slide
router.post('/:code/slides', async (req, res) => {
  try {
    const { code } = req.params;
    const { url, title } = req.body;

    const updated = await setSlide({
      moderatorUser: { id: req.user.telegramId, username: req.user.username },
      conferenceCode: code,
      url,
      title,
    });

    res.json({
      url: updated.currentSlideUrl,
      title: updated.currentSlideTitle,
    });
  } catch (err) {
    if (err.message === 'CONFERENCE_NOT_FOUND') {
      return res.status(404).json({ error: 'Conference not found' });
    }
    if (err.message === 'ACCESS_DENIED') {
      return res.status(403).json({ error: 'Access denied' });
    }
    console.error('Error in POST /slides:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /organizer-api/:code/slides - Clear slide
router.delete('/:code/slides', async (req, res) => {
  try {
    const { code } = req.params;

    await clearSlide({
      moderatorUser: { id: req.user.telegramId, username: req.user.username },
      conferenceCode: code,
    });

    res.json({ success: true });
  } catch (err) {
    if (err.message === 'CONFERENCE_NOT_FOUND') {
      return res.status(404).json({ error: 'Conference not found' });
    }
    if (err.message === 'ACCESS_DENIED') {
      return res.status(403).json({ error: 'Access denied' });
    }
    console.error('Error in DELETE /slides:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /organizer-api/:code/participants - List all participants with filters
router.get('/:code/participants', async (req, res) => {
  try {
    const { role } = req.query;
    const conferenceId = req.conference.id;
    
    const where = { conferenceId };
    if (role) where.role = role;
    
    const participants = await Participant.findAll({
      where,
      include: [{ 
        model: User, 
        as: 'user', 
        attributes: ['id', 'telegramId', 'firstName', 'lastName', 'username', 'avatarUrl', 'lookingFor'] 
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      items: participants.map(p => ({
        id: p.id,
        telegramId: p.user?.telegramId,
        firstName: p.user?.firstName,
        lastName: p.user?.lastName,
        username: p.user?.username,
        photoUrl: p.user?.avatarUrl,
        role: p.role,
        interests: p.interests || [],
        bio: p.bio || '',
        purpose: p.user?.lookingFor || '', // purpose of participation
        createdAt: p.createdAt,
      })),
      total: participants.length,
    });
  } catch (err) {
    console.error('Error in GET /participants:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /organizer-api/:code/participants/:profileId - Update participant
router.put('/:code/participants/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params;
    const { roles, firstName, lastName, interests, lookingFor } = req.body;

    const participant = await Participant.findByPk(profileId, {
      include: [{ model: User, as: 'user' }]
    });
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    if (participant.conferenceId !== req.conference.id) {
      return res.status(403).json({ error: 'Participant does not belong to this conference' });
    }

    if (roles !== undefined) {
      participant.role = roles;
    }
    if (interests !== undefined) {
      participant.interests = interests;
    }
    await participant.save();

    // Update global user model if fields provided
    if (participant.user) {
      const userUpdates = {};
      if (firstName !== undefined) userUpdates.firstName = firstName;
      if (lastName !== undefined) userUpdates.lastName = lastName;
      if (lookingFor !== undefined) userUpdates.lookingFor = lookingFor;
      await participant.user.update(userUpdates);
    }

    res.json({
      id: participant.id,
      telegramId: participant.user?.telegramId,
      firstName: participant.user?.firstName,
      lastName: participant.user?.lastName,
      roles: participant.role,
      interests: participant.interests,
      lookingFor: participant.user?.lookingFor,
    });
  } catch (err) {
    console.error('Error in PUT /participants/:profileId:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /organizer-api/:code/polls - List all polls
router.get('/:code/polls', async (req, res) => {
  try {
    const { conference } = req;
    const conferenceId = conference.id;
    
    const polls = await Poll.findAll({
      where: { conferenceId },
      include: [{ model: PollOption, as: 'options' }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      items: polls.map(p => ({
        id: p.id,
        question: p.question,
        options: p.options.map(opt => ({
          id: opt.id,
          text: opt.text,
        })),
        isActive: p.isActive,
        createdAt: p.createdAt,
      })),
      total: polls.length,
    });
  } catch (err) {
    console.error('Error in GET /polls:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /organizer-api/:code/polls - Create poll
router.post('/:code/polls', async (req, res) => {
  try {
    const { conference } = req;
    const conferenceId = conference.id;
    const { question, options } = req.body;

    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Question and at least 2 options are required' });
    }

    const poll = await Poll.create({
      conferenceId,
      question,
      isActive: true,
      creatorId: req.user.id
    });

    // Create options
    const createdOptions = [];
    for (const text of options) {
      const opt = await PollOption.create({
        pollId: poll.id,
        text
      });
      createdOptions.push(opt);
    }

    res.status(201).json({
      id: poll.id,
      question: poll.question,
      options: createdOptions,
      isActive: poll.isActive,
      createdAt: poll.createdAt,
    });
  } catch (err) {
    console.error('Error in POST /polls:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /organizer-api/:code/polls/:pollId - Update poll
router.put('/:code/polls/:pollId', async (req, res) => {
  try {
    const { pollId } = req.params;
    const { question, isActive } = req.body;

    const poll = await Poll.findByPk(pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    if (poll.conferenceId !== req.conference.id) {
      return res.status(403).json({ error: 'Poll does not belong to this conference' });
    }

    if (question !== undefined) poll.question = question;
    if (isActive !== undefined) poll.isActive = !!isActive;

    await poll.save();

    res.json({
      id: poll.id,
      question: poll.question,
      isActive: poll.isActive,
    });
  } catch (err) {
    console.error('Error in PUT /polls/:pollId:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /organizer-api/:code/polls/:pollId - Delete poll
router.delete('/:code/polls/:pollId', async (req, res) => {
  try {
    const { pollId } = req.params;

    const poll = await Poll.findByPk(pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    if (poll.conferenceId !== req.conference.id) {
      return res.status(403).json({ error: 'Poll does not belong to this conference' });
    }

    await poll.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /polls/:pollId:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /organizer-api/:code/questions - List all questions
router.get('/:code/questions', async (req, res) => {
  try {
    const { conference } = req;
    const conferenceId = conference.id;
    const { status } = req.query;
    
    const where = { conferenceId };
    if (status) {
      where.status = status;
    }

    const questions = await Question.findAll({
      where,
      include: [{ model: User, as: 'askedBy', attributes: ['firstName', 'lastName', 'telegramId'] }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      items: questions.map(q => ({
        id: q.id,
        text: q.text,
        status: q.status,
        author: q.askedBy ? {
          firstName: q.askedBy.firstName,
          lastName: q.askedBy.lastName,
          telegramId: q.askedBy.telegramId
        } : null,
        createdAt: q.createdAt,
      })),
      total: questions.length,
    });
  } catch (err) {
    console.error('Error in GET /questions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /organizer-api/:code/questions/:questionId - Moderate question (approve/reject)
router.put('/:code/questions/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;
    const { status } = req.body;

    const question = await Question.findByPk(questionId, {
      include: [{ model: User, as: 'askedBy' }]
    });
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    if (question.conferenceId !== req.conference.id) {
      return res.status(403).json({ error: 'Question does not belong to this conference' });
    }

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      question.status = status;
    }

    await question.save();

    res.json({
      id: question.id,
      text: question.text,
      status: question.status,
      author: question.askedBy ? {
        firstName: question.askedBy.firstName,
        lastName: question.askedBy.lastName,
        telegramId: question.askedBy.telegramId,
      } : null,
    });
  } catch (err) {
    console.error('Error in PUT /questions/:questionId:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /organizer-api/:code/meetings - List all meetings
router.get('/:code/meetings', async (req, res) => {
  try {
    const { conference } = req;
    const conferenceId = conference.id;
    const { status } = req.query;
    
    const where = { conferenceId };
    if (status && ['pending', 'accepted', 'rejected', 'cancelled', 'completed'].includes(status)) {
      where.status = status;
    }

    const meetings = await Meeting.findAll({
      where,
      include: [
        { model: User, as: 'requester', attributes: ['firstName', 'lastName', 'telegramId'] },
        { model: User, as: 'recipient', attributes: ['firstName', 'lastName', 'telegramId'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      items: meetings.map(m => ({
        id: m.id,
        requester: m.requester ? {
          firstName: m.requester.firstName,
          lastName: m.requester.lastName,
          telegramId: m.requester.telegramId,
        } : null,
        recipient: m.recipient ? {
          firstName: m.recipient.firstName,
          lastName: m.recipient.lastName,
          telegramId: m.recipient.telegramId,
        } : null,
        proposedTime: m.proposedTime,
        durationMinutes: m.durationMinutes,
        status: m.status,
        message: m.message,
        createdAt: m.createdAt,
      })),
      total: meetings.length,
    });
  } catch (err) {
    console.error('Error in GET /meetings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /organizer-api/:code/meetings/:meetingId - Update meeting status
router.put('/:code/meetings/:meetingId', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'accepted', 'rejected', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    const meeting = await Meeting.findByPk(meetingId, {
      include: [
        { model: User, as: 'requester' },
        { model: User, as: 'recipient' }
      ]
    });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (meeting.conferenceId !== req.conference.id) {
      return res.status(403).json({ error: 'Meeting does not belong to this conference' });
    }

    meeting.status = status;
    await meeting.save();

    res.json({
      id: meeting.id,
      requester: meeting.requester ? {
        firstName: meeting.requester.firstName,
        lastName: meeting.requester.lastName,
        telegramId: meeting.requester.telegramId,
      } : null,
      recipient: meeting.recipient ? {
        firstName: meeting.recipient.firstName,
        lastName: meeting.recipient.lastName,
        telegramId: meeting.recipient.telegramId,
      } : null,
      proposedTime: meeting.proposedTime,
      durationMinutes: meeting.durationMinutes,
      status: meeting.status,
      message: meeting.message,
    });
  } catch (err) {
    console.error('Error in PUT /meetings/:meetingId:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /organizer-api/:code/export/:type - Export data as CSV
router.get('/:code/export/:type', async (req, res) => {
  try {
    const { conference } = req;
    const { type } = req.params;
    const conferenceId = conference.id;
    
    let csv = '';
    let filename = '';

    switch (type) {
      case 'participants': {
        const participants = await Participant.findAll({
          where: { conferenceId },
          include: [{ model: User, as: 'user' }],
          order: [['createdAt', 'DESC']]
        });
        
        filename = `participants-${conference.conferenceCode}-${Date.now()}.csv`;
        csv = 'Telegram ID,First Name,Last Name,Username,Roles,Onboarding Completed,Created At\n';
        
        participants.forEach(p => {
          const row = [
            p.user?.telegramId || '',
            p.user?.firstName || '',
            p.user?.lastName || '',
            p.user?.username || '',
            p.role || '',
            p.user?.onboardingCompleted ? 'Yes' : 'No',
            p.createdAt.toISOString(),
          ];
          csv += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
        });
        break;
      }

      case 'questions': {
        const questions = await Question.findAll({
          where: { conferenceId },
          include: [{ model: User, as: 'askedBy' }],
          order: [['createdAt', 'DESC']]
        });
        
        filename = `questions-${conference.conferenceCode}-${Date.now()}.csv`;
        csv = 'ID,Text,Status,Author Telegram ID,Author Name,Created At\n';
        
        questions.forEach(q => {
          const authorName = q.askedBy ? `${q.askedBy.firstName || ''} ${q.askedBy.lastName || ''}`.trim() : '';
          const row = [
            q.id,
            q.text,
            q.status,
            q.askedBy ? q.askedBy.telegramId : '',
            authorName,
            q.createdAt.toISOString(),
          ];
          csv += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
        });
        break;
      }

      case 'polls': {
        const polls = await Poll.findAll({
          where: { conferenceId },
          include: [{ model: PollOption, as: 'options' }],
          order: [['createdAt', 'DESC']]
        });
        
        filename = `polls-${conference.conferenceCode}-${Date.now()}.csv`;
        csv = 'ID,Question,Options,Active,Created At\n';
        
        polls.forEach(p => {
          const options = p.options.map(opt => opt.text).join('; ');
          const row = [
            p.id,
            p.question,
            options,
            p.isActive ? 'Yes' : 'No',
            p.createdAt.toISOString(),
          ];
          csv += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
        });
        break;
      }

      case 'meetings': {
        const meetings = await Meeting.findAll({
          where: { conferenceId },
          include: [
            { model: User, as: 'requester' },
            { model: User, as: 'recipient' }
          ],
          order: [['createdAt', 'DESC']]
        });
        
        filename = `meetings-${conference.conferenceCode}-${Date.now()}.csv`;
        csv = 'ID,Requester Telegram ID,Requester Name,Recipient Telegram ID,Recipient Name,Status,Proposed Time,Created At\n';
        
        meetings.forEach(m => {
          const requesterName = m.requester ? `${m.requester.firstName || ''} ${m.requester.lastName || ''}`.trim() : '';
          const recipientName = m.recipient ? `${m.recipient.firstName || ''} ${m.recipient.lastName || ''}`.trim() : '';
          const row = [
            m.id,
            m.requester ? m.requester.telegramId : '',
            requesterName,
            m.recipient ? m.recipient.telegramId : '',
            recipientName,
            m.status,
            m.proposedTime ? m.proposedTime.toISOString() : '',
            m.createdAt.toISOString(),
          ];
          csv += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
        });
        break;
      }

      default:
        return res.status(400).json({ error: 'Invalid export type. Use: participants, questions, polls, or meetings' });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // Add BOM for Excel UTF-8 support
  } catch (err) {
    console.error('Error in GET /export/:type:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /organizer-api/:code/tariffs - List available tariff plans
router.get('/:code/tariffs', async (req, res) => {
  try {
    const plans = await TariffPlan.findAll({
      where: { isActive: true },
      order: [['pricePerMonth', 'ASC']]
    });
    
    res.json({
      items: plans.map(p => ({
        id: p.id,
        name: p.name,
        displayName: p.displayName,
        description: p.description,
        pricePerMonth: p.pricePerMonth,
        limits: p.limits,
        isDefault: p.isDefault,
      })),
      total: plans.length,
    });
  } catch (err) {
    console.error('Error in GET /tariffs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /organizer-api/:code/subscription - Assign or update subscription for conference
router.put('/:code/subscription', async (req, res) => {
  try {
    const { conference } = req;
    const { tariffPlanId, status, endsAt } = req.body;
    
    if (!tariffPlanId) {
      return res.status(400).json({ error: 'tariffPlanId is required' });
    }
    
    // Verify tariff plan exists
    const tariffPlan = await TariffPlan.findByPk(tariffPlanId);
    if (!tariffPlan) {
      return res.status(404).json({ error: 'Tariff plan not found' });
    }
    
    // Find or create subscription
    let subscription = await Subscription.findOne({ where: { conferenceId: conference.id } });
    
    if (subscription) {
      // Update existing subscription
      subscription.tariffPlanId = tariffPlanId;
      if (status !== undefined) subscription.status = status;
      if (endsAt !== undefined) subscription.endsAt = endsAt ? new Date(endsAt) : null;
      await subscription.save();
    } else {
      // Create new subscription
      subscription = await Subscription.create({
        conferenceId: conference.id,
        tariffPlanId,
        status: status || 'active',
        startsAt: new Date(),
        endsAt: endsAt ? new Date(endsAt) : null,
      });
    }
    
    res.json({
      id: subscription.id,
      planName: tariffPlan.displayName,
      planId: tariffPlan.id,
      status: subscription.status,
      startsAt: subscription.startsAt,
      endsAt: subscription.endsAt,
    });
  } catch (err) {
    console.error('Error in PUT /subscription:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = {
  organizerApiRouter: router,
};
