const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User, Conference, Participant, SystemSettings, sequelize } = require('../models/mysql');
const { authMiddleware } = require('../middleware/auth');
const crypto = require('crypto');
const { emitToConference } = require('../lib/realtime');

async function generateUniqueCode() {
  let code;
  let exists = true;
  while (exists) {
    code = crypto.randomBytes(3).toString('hex').toUpperCase();
    const found = await Conference.findOne({ where: { conferenceCode: code } });
    if (!found) exists = false;
  }
  return code;
}

/**
 * GET /dashboard
 * Returns categorized conferences for the current user.
 */
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const settings = await SystemSettings.findOne({ where: { id: 1 } });
    const paidLimitsEnabled = !settings || settings.paidLimitsEnabled;

    const participations = await Participant.findAll({
      where: { userId: user.id },
      include: [{ model: Conference, as: 'conference' }],
      order: [['created_at', 'DESC']]
    });

    const now = new Date();
    const all = [];
    const active = [];
    const past = [];

    participations.forEach(p => {
      const conf = p.conference;
      if (!conf) return;

      let accessPhase = 'free';
      if (conf.endsAt && conf.endsAt < now) {
        const graceHours = conf.gracePeriodHours !== undefined && conf.gracePeriodHours !== null ? conf.gracePeriodHours : 1;
        const graceEnd = new Date(conf.endsAt.getTime() + graceHours * 3600 * 1000);
        if (now <= graceEnd) {
          accessPhase = 'grace';
        } else if (paidLimitsEnabled && (!user.hasPaidAccess || (user.paidAccessUntil && user.paidAccessUntil < now))) {
          accessPhase = 'payment_required';
        }
      }

      const confData = {
        id: conf.id,
        code: conf.conferenceCode,
        name: conf.title,
        title: conf.title,
        description: conf.description,
        startsAt: conf.startsAt,
        endsAt: conf.endsAt,
        isActive: conf.isActive,
        isEnded: conf.isEnded || false,
        accessPhase,
        myRole: p.role,
        coverImage: conf.coverImage,
        location: conf.location,
        tags: conf.tags,
      };

      all.push(confData);
      
      const isActuallyActive = conf.isActive && !conf.isEnded;
      if (isActuallyActive) {
        active.push(confData);
      } else {
        past.push(confData);
      }
    });

    res.json({ 
      conferences: all,
      activeConferences: active,
      pastConferences: past
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const settings = await SystemSettings.findOne({ where: { id: 1 } });
    const now = new Date();
    const hasActivePaidAccess = (settings && !settings.paidLimitsEnabled) || 
                                user.globalRole === 'main_admin' || 
                                (user.hasPaidAccess && (!user.paidAccessUntil || user.paidAccessUntil > now));

    // If user has paid access, they can browse all public conferences.
    // If not, they can only see/find public conferences they are already participating in.
    const whereClause = hasActivePaidAccess ? {
      [Op.or]: [
        { access: 'public' },
        { '$Participants.user_id$': user.id }
      ]
    } : {
      '$Participants.user_id$': user.id
    };

    const conferencesRaw = await Conference.findAll({
      where: whereClause,
      include: [{ 
        model: Participant, 
        required: !hasActivePaidAccess,
        where: { userId: user.id }
      }],
      order: [['startsAt', 'DESC']]
    });

    const conferences = await Promise.all(conferencesRaw.map(async conf => {
      const participation = conf.Participants && conf.Participants[0];
      if (!conf) return null;
      
      // Calculate access phase
      let accessPhase = 'free';
      if (conf.endsAt && conf.endsAt < now) {
        const graceHours = conf.gracePeriodHours !== undefined && conf.gracePeriodHours !== null ? conf.gracePeriodHours : 1;
        const graceEnd = new Date(conf.endsAt.getTime() + graceHours * 3600 * 1000);
        if (now <= graceEnd) {
          accessPhase = 'grace';
        } else if (!user.hasPaidAccess || (user.paidAccessUntil && user.paidAccessUntil < now)) {
          accessPhase = 'payment_required';
        }
      }

      // Calculate participant count
      const participantCount = await Participant.count({ where: { conferenceId: conf.id } });

      // Format date: YYYY-MM-DD
      const dateStr = conf.startsAt ? new Date(conf.startsAt).toISOString().split('T')[0] : null;
      
      // Format time: HH:MM
      const timeStr = conf.startsAt ? new Date(conf.startsAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : null;

      // Calculate startingIn
      let startingInStr = 'Скоро';
      if (conf.startsAt) {
        const diffMs = new Date(conf.startsAt) - now;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 0) startingInStr = 'Сегодня';
        else if (diffDays === 1) startingInStr = 'Завтра';
        else if (diffDays > 1) startingInStr = `через ${diffDays} дн.`;
      }

      let dayVal = conf.day || 'СЕГОДНЯ';
      if (conf.startsAt) {
        const diffMs = new Date(conf.startsAt) - now;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          dayVal = new Date(conf.startsAt).toLocaleDateString('ru-RU', { weekday: 'short' }).toUpperCase();
        }
      }

      return {
        id: conf.id,
        code: conf.conferenceCode,
        name: conf.title,
        description: conf.description,
        startsAt: conf.startsAt,
        endsAt: conf.endsAt,
        isActive: conf.isActive,
        isEnded: conf.isEnded || false,
        accessPhase,
        access: conf.access,
        myRole: participation ? participation.role : null,
        location: conf.location,
        day: dayVal,
        date: dateStr,
        time: timeStr,
        startingIn: startingInStr,
        participants: participantCount,
        duration: conf.duration,
        repeat: conf.repeat,
        coverImage: conf.coverImage,
        tags: conf.tags,
        maxParticipants: conf.maxParticipants,
      };
    }));

    res.json({ conferences });
  } catch (err) {
    console.error('Get conferences error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /create
 */
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Load SystemSettings
    const settings = await SystemSettings.findOne({ where: { id: 1 } });
    
    // Check if user is allowed to create conferences
    if (user.globalRole !== 'main_admin') {
      if (settings && !settings.allowConferenceCreationUsers) {
        return res.status(403).json({
          error: 'CREATION_DISABLED',
          message: 'Создание конференций временно отключено администратором.'
        });
      }
      if (!user.allowConferenceCreation) {
        return res.status(403).json({
          error: 'USER_CREATION_DISABLED',
          message: 'Вам запрещено создание конференций администратором.'
        });
      }
    }

    // Enforce paid tariff to create conferences (if limits are enabled)
    const now = new Date();
    const paidLimitsEnabled = !settings || settings.paidLimitsEnabled;
    const hasActivePaidAccess = !paidLimitsEnabled || (user.hasPaidAccess && (!user.paidAccessUntil || user.paidAccessUntil > now));
    
    if (!hasActivePaidAccess) {
      return res.status(403).json({ 
        error: 'TARIFF_REQUIRED',
        message: 'Для создания конференции необходимо приобрести тариф.' 
      });
    }

    // SaaS Limits Check
    const activeConferencesCount = await Conference.count({ 
      where: { organizerId: user.id, isActive: true } 
    });
    
    const LIMITS = {
      free: { maxActiveConferences: 1, maxParticipants: 50 },
      paid: { maxActiveConferences: 10, maxParticipants: 500 }
    };

    const userTier = 'paid'; // Enforced paid
    const tierLimits = LIMITS[userTier];

    if (paidLimitsEnabled && activeConferencesCount >= tierLimits.maxActiveConferences) {
      return res.status(403).json({ 
        error: `Limit reached. ${userTier} users can only have ${tierLimits.maxActiveConferences} active conference(s).` 
      });
    }

    const { 
      name, description, location, startsAt, endsAt, 
      tags, maxParticipants, duration, repeat, day, access 
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    const code = await generateUniqueCode();

    const conference = await Conference.create({
      conferenceCode: code,
      title: name,
      description,
      location,
      access: access || 'public', // Set closed/open based on request
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      tags: tags || [],
      maxParticipants: Math.min(maxParticipants || tierLimits.maxParticipants, tierLimits.maxParticipants),
      duration,
      repeat,
      day,
      organizerId: user.id
    });

    // Automatically join as organizer
    await Participant.create({
      userId: user.id,
      conferenceId: conference.id,
      role: 'organizer',
      displayName: `${user.firstName} ${user.lastName || ''}`.trim()
    });

    res.status(201).json({ success: true, conference });
  } catch (err) {
    console.error('Create conference error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/conferences/admin/create
 * Direct conference creation by system administrator
 */
router.post('/admin/create', authMiddleware, async (req, res) => {
  try {
    if (req.user.globalRole !== 'main_admin') {
      return res.status(403).json({ error: 'Access denied. Main admin only.' });
    }

    const { 
      name, description, location, startsAt, endsAt, 
      tags, maxParticipants, duration, repeat, day, access 
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    const code = await generateUniqueCode();

    const conference = await Conference.create({
      conferenceCode: code,
      title: name,
      description,
      location,
      access: access || 'public',
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      tags: tags || [],
      maxParticipants: maxParticipants || 500,
      duration,
      repeat,
      day,
      organizerId: req.user.id
    });

    // Automatically join as organizer
    await Participant.create({
      userId: req.user.id,
      conferenceId: conference.id,
      role: 'organizer',
      displayName: 'System Admin'
    });

    res.status(201).json({ success: true, conference });
  } catch (err) {
    console.error('Admin create conference error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /admin
 * Returns all conferences (system admin only)
 */
router.get('/admin', authMiddleware, async (req, res) => {
  try {
    if (req.user.globalRole !== 'main_admin') {
      return res.status(403).json({ error: 'Access denied. Main admin only.' });
    }
    const conferences = await Conference.findAll({
      include: [{ model: User, as: 'organizer', attributes: ['firstName', 'lastName', 'username'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ conferences });
  } catch (err) {
    console.error('Admin get conferences error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /admin/:id
 * Toggle conference active status (system admin only)
 */
router.patch('/admin/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.globalRole !== 'main_admin') {
      return res.status(403).json({ error: 'Access denied. Main admin only.' });
    }
    const { id } = req.params;
    const { isActive } = req.body;
    const conf = await Conference.findByPk(id);
    if (!conf) return res.status(404).json({ error: 'Conference not found' });
    
    await conf.update({ isActive: !!isActive });
    res.json({ success: true, conference: conf });
  } catch (err) {
    console.error('Admin update conference error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /admin/:id
 * Delete conference (system admin only)
 */
router.delete('/admin/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.globalRole !== 'main_admin') {
      return res.status(403).json({ error: 'Access denied. Main admin only.' });
    }
    const { id } = req.params;
    const conf = await Conference.findByPk(id);
    if (!conf) return res.status(404).json({ error: 'Conference not found' });
    
    await conf.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete conference error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /join
 */
router.post('/join', authMiddleware, async (req, res) => {
  const { conferenceCode, ticketCode } = req.body;
  if (!conferenceCode) return res.status(400).json({ error: 'conferenceCode is required' });

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const conf = await Conference.findOne({
      where: { conferenceCode: conferenceCode.toUpperCase() },
      include: [{ model: User, as: 'organizer', attributes: ['firstName', 'lastName', 'avatarUrl', 'position', 'company'] }]
    });
    if (!conf) return res.status(404).json({ error: 'Conference not found' });

    if (conf.isEnded) {
      return res.status(400).json({ error: 'CONFERENCE_ENDED', message: 'Конференция уже завершена.' });
    }

    if (!conf.isActive) {
      return res.status(400).json({ error: 'CONFERENCE_NOT_STARTED', message: 'Конференция ещё не началась.' });
    }

    let participant = await Participant.findOne({
      where: { userId: user.id, conferenceId: conf.id }
    });

    if (!participant) {
      // Access control:
      // If private: requires a valid ticket code.
      if (conf.access === 'private') {
        if (!ticketCode) {
          return res.status(400).json({ error: 'TICKET_REQUIRED' });
        }
        if (ticketCode.trim().length < 4) {
          return res.status(400).json({ error: 'INVALID_TICKET' });
        }
        const ticketUsed = await Participant.findOne({
          where: { conferenceId: conf.id, ticketCode: ticketCode.trim() }
        });
        if (ticketUsed) {
          return res.status(400).json({ error: 'TICKET_USED' });
        }
      }

      // Max participants limit check
      const participantCount = await Participant.count({ where: { conferenceId: conf.id } });
      if (conf.maxParticipants && participantCount >= conf.maxParticipants) {
        return res.status(403).json({ error: 'CONFERENCE_FULL', message: 'Конференция заполнена.' });
      }

      participant = await Participant.create({
        userId: user.id,
        conferenceId: conf.id,
        role: 'participant',
        displayName: `${user.firstName} ${user.lastName || ''}`.trim(),
        ticketCode: conf.access === 'private' ? ticketCode.trim() : null
      });
    }

    // Access phase logic
    let accessPhase = 'free';
    const now = new Date();
    if (conf.endsAt && conf.endsAt < now) {
      const graceHours = conf.gracePeriodHours !== undefined && conf.gracePeriodHours !== null ? conf.gracePeriodHours : 1;
      const graceEnd = new Date(conf.endsAt.getTime() + graceHours * 3600 * 1000);
      if (now <= graceEnd) {
        accessPhase = 'grace';
      } else if (!user.hasPaidAccess || (user.paidAccessUntil && user.paidAccessUntil < now)) {
        accessPhase = 'payment_required';
      }
    }

    res.json({ conference: { ...conf.toJSON(), code: conf.conferenceCode, accessPhase, myRole: participant.role } });
  } catch (err) {
    console.error('Join conference error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /:code
 */
router.get('/:code', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const conf = await Conference.findOne({ 
      where: { conferenceCode: req.params.code.toUpperCase() },
      include: [{ model: User, as: 'organizer', attributes: ['firstName', 'lastName', 'avatarUrl', 'position', 'company'] }]
    });
    
    if (!conf) return res.status(404).json({ error: 'Conference not found' });

    const now = new Date();
    const settings = await SystemSettings.findOne({ where: { id: 1 } });
    const hasActivePaidAccess = (settings && !settings.paidLimitsEnabled) || 
                                user.globalRole === 'main_admin' || 
                                (user.hasPaidAccess && (!user.paidAccessUntil || user.paidAccessUntil > now));
    let participant = await Participant.findOne({
      where: { userId: user.id, conferenceId: conf.id }
    });
    const isOrganizer = conf.organizerId === user.id;

    if (conf.access === 'public' && !hasActivePaidAccess && !participant && !isOrganizer) {
      return res.status(403).json({
        error: 'TARIFF_REQUIRED',
        message: 'Для доступа к публичным конференциям необходимо приобрести платный тариф.'
      });
    }

    // Access phase logic
    let accessPhase = 'free';
    if (conf.endsAt && conf.endsAt < now) {
      const graceHours = conf.gracePeriodHours !== undefined && conf.gracePeriodHours !== null ? conf.gracePeriodHours : 1;
      const graceEnd = new Date(conf.endsAt.getTime() + graceHours * 3600 * 1000);
      if (now <= graceEnd) {
        accessPhase = 'grace';
      } else if (!user.hasPaidAccess || (user.paidAccessUntil && user.paidAccessUntil < now)) {
        accessPhase = 'payment_required';
      }
    }

    res.json({ conference: { ...conf.toJSON(), code: conf.conferenceCode, accessPhase } });
  } catch (err) {
    console.error('Get conference details error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /:id
 * Update conference details (Organizer only)
 */
router.patch('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, name, access, isActive, isEnded } = req.body;

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const conf = await Conference.findByPk(id);
    if (!conf) return res.status(404).json({ error: 'Conference not found' });

    if (conf.organizerId !== user.id) {
      return res.status(403).json({ error: 'Only the organizer can update settings' });
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (name !== undefined) updates.title = name; // handle both name/title
    if (access !== undefined) updates.access = access;
    if (isActive !== undefined) updates.isActive = isActive;
    if (isEnded !== undefined) updates.isEnded = isEnded;

    await conf.update(updates);

    // Broadcast conference end to all attendees in the socket room
    if (isEnded === true) {
      emitToConference(conf.id, 'conference_ended', {
        conferenceId: conf.id,
        conferenceCode: conf.conferenceCode,
        title: conf.title,
      });
    }

    res.json({ 
      success: true, 
      conference: {
        id: conf.id,
        code: conf.conferenceCode,
        name: conf.title,
        title: conf.title,
        access: conf.access,
        isActive: conf.isActive,
        isEnded: conf.isEnded
      } 
    });
  } catch (err) {
    console.error('Update conference error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
