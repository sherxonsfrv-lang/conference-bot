const express = require('express');
const { Poll, PollOption, Question, Conference } = require('../models/mysql');
const { getConferenceIdByCode } = require('../lib/conference-helper');

const router = express.Router();

router.get('/:code/polls', async (req, res) => {
  try {
    const { code } = req.params;
    const conferenceId = await getConferenceIdByCode(code);

    const polls = await Poll.findAll({
      where: { conferenceId, isActive: true },
      include: [{ model: PollOption, as: 'options' }]
    });

    res.json({ items: polls });
  } catch (err) {
    if (err.message === 'CONFERENCE_NOT_FOUND') return res.status(404).json({ error: 'Conference not found' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:code/questions', async (req, res) => {
  try {
    const { code } = req.params;
    const conferenceId = await getConferenceIdByCode(code);

    const questions = await Question.findAll({
      where: { conferenceId, isApproved: true },
      order: [['createdAt', 'ASC']]
    });

    res.json({ items: questions });
  } catch (err) {
    if (err.message === 'CONFERENCE_NOT_FOUND') return res.status(404).json({ error: 'Conference not found' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:code/stats', async (req, res) => {
  try {
    const { code } = req.params;
    const conference = await Conference.findOne({ 
      where: { conferenceCode: code },
      attributes: ['id', 'conferenceCode', 'title', 'currentSlideUrl', 'currentSlideTitle']
    });
    if (!conference) return res.status(404).json({ error: 'Conference not found' });

    const pollCount = await Poll.count({ where: { conferenceId: conference.id } });
    const questionCount = await Question.count({ where: { conferenceId: conference.id } });

    res.json({
      conference,
      stats: { polls: pollCount, questions: questionCount },
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = {
  secondScreenRouter: router,
};
