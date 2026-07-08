const { User, Conference, Participant, Question } = require('../models/mysql');
const { Op } = require('sequelize');
const { ensureUserFromTelegram, userIsMainAdmin } = require('./conference.service');
const { emitToConference } = require('../lib/realtime');

async function askQuestion({ telegramUser, conferenceCode, text, targetSpeakerProfileId = null }) {
  const { validate, questionSchema } = require('../lib/validation');
  
  const validated = validate({ text, conferenceCode }, questionSchema);
  const user = await ensureUserFromTelegram(telegramUser);
  const conference = await Conference.findOne({ where: { conferenceCode: validated.conferenceCode, isEnded: false } });
  
  if (!conference) throw new Error('CONFERENCE_NOT_FOUND_OR_ENDED');

  const participant = await Participant.findOne({
    where: { userId: user.id, conferenceId: conference.id }
  });

  if (!participant) throw new Error('NOT_IN_CONFERENCE');

  const question = await Question.create({
    conferenceId: conference.id,
    askedById: user.id,
    text: validated.text,
    isApproved: false,
    isAnswered: false,
  });

  emitToConference(conference.id, 'question-created', {
    id: question.id,
    text: question.text,
    createdAt: question.createdAt,
  });

  return { question, conference };
}

async function approveQuestion({ moderatorUser, questionId }) {
  const user = await ensureUserFromTelegram(moderatorUser);
  const question = await Question.findByPk(questionId);
  if (!question) throw new Error('QUESTION_NOT_FOUND');

  const conference = await Conference.findByPk(question.conferenceId);
  if (!userIsMainAdmin(user) && conference.organizerId !== user.id) {
    throw new Error('ACCESS_DENIED');
  }

  await question.update({ isApproved: true });

  emitToConference(conference.id, 'question-updated', {
    id: question.id,
    isApproved: true,
  });

  return { question, conference };
}

async function listQuestionsForModeration({ conferenceCode }) {
  const conference = await Conference.findOne({ where: { conferenceCode } });
  if (!conference) throw new Error('CONFERENCE_NOT_FOUND');
  return await Question.findAll({ where: { conferenceId: conference.id, isApproved: false } });
}

async function rejectQuestion({ moderatorUser, questionId }) {
  const question = await Question.findByPk(questionId);
  if (question) await question.destroy();
}

async function answerQuestion({ speakerUser, questionId }) {
  const question = await Question.findByPk(questionId);
  if (question) await question.update({ isAnswered: true });
}

module.exports = {
  askQuestion,
  approveQuestion,
  listQuestionsForModeration,
  rejectQuestion,
  answerQuestion,
};


