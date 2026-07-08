const express = require('express');
const router = express.Router();
const { Poll, PollOption, PollVote, User, Conference, Participant } = require('../models/mysql');
const { authMiddleware } = require('../middleware/auth');

/**
 * GET /polls?conferenceCode=X
 */
router.get('/', authMiddleware, async (req, res) => {
  const { conferenceCode } = req.query;
  if (!conferenceCode) return res.status(400).json({ error: 'conferenceCode is required' });

  try {
    const conf = await Conference.findOne({ where: { conferenceCode: conferenceCode.toUpperCase() } });
    if (!conf) return res.status(404).json({ error: 'Conference not found' });

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const polls = await Poll.findAll({
      where: { conferenceId: conf.id },
      include: [{
        model: PollOption,
        as: 'options',
        include: [{ model: PollVote, as: 'votes' }]
      }],
      order: [['createdAt', 'DESC']]
    });

    const mapped = polls.map(p => {
      const totalVotes = p.options.reduce((s, o) => s + (o.votes?.length || 0), 0);
      const options = p.options.map(o => ({
        id: o.id,
        text: o.text,
        votes: o.votes?.length || 0,
        percent: totalVotes > 0 ? Math.round((o.votes?.length || 0) / totalVotes * 100) : 0,
        hasVoted: o.votes?.some(v => v.userId === user.id),
      }));

      return {
        id: p.id,
        question: p.question,
        isActive: p.isActive,
        totalVotes,
        options,
      };
    });

    res.json({ polls: mapped });
  } catch (err) {
    console.error('Get polls error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /polls/:pollId/vote
 * Body: { optionId }
 */
router.post('/:pollId/vote', authMiddleware, async (req, res) => {
  const { optionId } = req.body;
  if (!optionId) return res.status(400).json({ error: 'optionId is required' });

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const poll = await Poll.findByPk(req.params.pollId, {
      include: [{ model: PollOption, as: 'options' }]
    });
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (!poll.isActive) return res.status(400).json({ error: 'Poll is closed' });

    // Remove existing votes from this poll for this user (one vote per poll)
    const optionIds = poll.options.map(o => o.id);
    await PollVote.destroy({
      where: {
        userId: user.id,
        pollOptionId: optionIds
      }
    });

    // Add new vote
    await PollVote.create({
      userId: user.id,
      pollOptionId: optionId
    });

    // Fetch updated totals
    const updatedPoll = await Poll.findByPk(req.params.pollId, {
      include: [{
        model: PollOption,
        as: 'options',
        include: [{ model: PollVote, as: 'votes' }]
      }]
    });

    const totalVotes = updatedPoll.options.reduce((s, o) => s + (o.votes?.length || 0), 0);
    const options = updatedPoll.options.map(o => ({
      id: o.id,
      text: o.text,
      votes: o.votes?.length || 0,
      percent: totalVotes > 0 ? Math.round((o.votes?.length || 0) / totalVotes * 100) : 0,
    }));

    res.json({ success: true, options, totalVotes });
  } catch (err) {
    console.error('Vote error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /
 * Create a new poll (Organizer only)
 */
router.post('/', authMiddleware, async (req, res) => {
  const { conferenceCode, question, options } = req.body;
  if (!conferenceCode || !question || !options || !options.length) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const user = await User.findByPk(req.user.id);
    const conf = await Conference.findOne({ where: { conferenceCode: conferenceCode.toUpperCase() } });
    if (!conf) return res.status(404).json({ error: 'Conference not found' });

    // Verify organizer role
    const participant = await Participant.findOne({ where: { userId: user.id, conferenceId: conf.id } });
    if (!participant || participant.role !== 'organizer') {
      return res.status(403).json({ error: 'Only organizers can create polls' });
    }

    const poll = await Poll.create({
      conferenceId: conf.id,
      creatorId: user.id,
      question: question.trim(),
      isActive: true
    });

    for (const optText of options) {
      await PollOption.create({
        pollId: poll.id,
        text: optText.trim()
      });
    }

    res.status(201).json({ success: true, pollId: poll.id });
  } catch (err) {
    console.error('Create poll error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /:id/toggle
 */
router.patch('/:id/toggle', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const poll = await Poll.findByPk(req.params.id);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    const participant = await Participant.findOne({ where: { userId: user.id, conferenceId: poll.conferenceId } });
    if (!participant || participant.role !== 'organizer') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await poll.update({ isActive: !poll.isActive });
    res.json({ success: true, isActive: poll.isActive });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /:id
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const poll = await Poll.findByPk(req.params.id);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    const participant = await Participant.findOne({ where: { userId: user.id, conferenceId: poll.conferenceId } });
    if (!participant || participant.role !== 'organizer') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await poll.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
