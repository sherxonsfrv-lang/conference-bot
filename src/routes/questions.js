const express = require('express');
const router = express.Router();
const { Question, QuestionVote, User, Conference, Participant } = require('../models/mysql');
const { authMiddleware } = require('../middleware/auth');

/**
 * GET /questions?conferenceCode=X
 */
router.get('/', authMiddleware, async (req, res) => {
  const { conferenceCode } = req.query;
  if (!conferenceCode) return res.status(400).json({ error: 'conferenceCode is required' });

  try {
    const conf = await Conference.findOne({ where: { conferenceCode: conferenceCode.toUpperCase() } });
    if (!conf) return res.status(404).json({ error: 'Conference not found' });

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const questions = await Question.findAll({
      where: { conferenceId: conf.id },
      include: [
        { model: User, as: 'askedBy', attributes: ['firstName', 'lastName', 'username', 'avatarUrl'] },
        { model: QuestionVote, as: 'votes' }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Check role
    const participant = await Participant.findOne({ where: { userId: user.id, conferenceId: conf.id } });
    const isOrganizer = participant && participant.role === 'organizer';

    const mapped = questions.filter(q => {
      // If organizer, show everything. If user, show only approved or their own.
      if (isOrganizer) return true;
      return q.status === 'approved' || q.askedById === user.id;
    }).map(q => ({
      id: q.id,
      text: q.text,
      status: q.status,
      askedBy: q.askedBy,
      upvotes: q.votes?.length || 0,
      hasUpvoted: q.votes?.some(v => v.userId === user.id),
      isMyQuestion: q.askedById === user.id,
      createdAt: q.createdAt
    }));

    res.json({ questions: mapped, isOrganizer });
  } catch (err) {
    console.error('Get questions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /questions
 */
router.post('/', authMiddleware, async (req, res) => {
  const { conferenceCode, text } = req.body;
  if (!conferenceCode || !text) return res.status(400).json({ error: 'conferenceCode and text are required' });

  try {
    const user = await User.findByPk(req.user.id);
    const conf = await Conference.findOne({ where: { conferenceCode: conferenceCode.toUpperCase() } });
    
    if (!conf) return res.status(404).json({ error: 'Conference not found' });

    const question = await Question.create({
      conferenceId: conf.id,
      askedById: user.id,
      text: text.trim(),
      status: 'pending' // Explictly pending
    });

    res.status(201).json({ success: true, question });
  } catch (err) {
    console.error('Ask question error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /questions/:id/upvote
 */
router.post('/:id/upvote', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const question = await Question.findByPk(req.params.id);
    
    if (!question) return res.status(404).json({ error: 'Question not found' });

    // Check if already upvoted
    const existingVote = await QuestionVote.findOne({
      where: { questionId: question.id, userId: user.id }
    });

    if (existingVote) {
      await existingVote.destroy();
      return res.json({ success: true, action: 'removed' });
    }

    await QuestionVote.create({
      questionId: question.id,
      userId: user.id
    });

    res.json({ success: true, action: 'added' });
  } catch (err) {
    console.error('Upvote error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /questions/:id/status
 */
router.patch('/:id/status', authMiddleware, async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const user = await User.findByPk(req.user.id);
    const question = await Question.findByPk(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    const participant = await Participant.findOne({ where: { userId: user.id, conferenceId: question.conferenceId } });
    if (!participant || participant.role !== 'organizer') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await question.update({ status });
    res.json({ success: true, status: question.status });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /questions/:id
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const question = await Question.findByPk(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    const participant = await Participant.findOne({ where: { userId: user.id, conferenceId: question.conferenceId } });
    if (!participant || participant.role !== 'organizer') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await question.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
