const { Conference, Participant, Question, Poll, Meeting, User } = require('../models/mysql');
const { ensureUserFromTelegram, userIsMainAdmin } = require('./conference.service');

async function generateOrganizerReport({ telegramUser, conferenceCode }) {
  const user = await ensureUserFromTelegram(telegramUser);
  const conference = await Conference.findOne({ where: { conferenceCode } });
  if (!conference) throw new Error('CONFERENCE_NOT_FOUND');

  // Permission check
  if (!userIsMainAdmin(user) && conference.organizerId !== user.id) {
    throw new Error('ACCESS_DENIED');
  }

  const participants = await Participant.findAll({ where: { conferenceId: conference.id } });
  const totalQuestions = await Question.count({ where: { conferenceId: conference.id } });
  const totalPolls = await Poll.count({ where: { conferenceId: conference.id } });
  const totalMeetings = await Meeting.count({ where: { conferenceId: conference.id } });

  return {
    conference: {
      title: conference.title,
      conferenceCode: conference.conferenceCode,
      status: conference.isEnded ? 'Завершена' : conference.isActive ? 'Активна' : 'Остановлена',
    },
    participants: {
      total: participants.length,
    },
    questions: {
      total: totalQuestions,
    },
    polls: {
      total: totalPolls,
    },
    meetings: {
      total: totalMeetings,
    },
  };
}

function formatReportAsText(report) {
  return [
    `📊 ОТЧЁТ ОРГАНИЗАТОРА`,
    `📋 Конференция: ${report.conference.title}`,
    `Участников: ${report.participants.total}`,
    `Вопросов: ${report.questions.total}`,
    `Опросов: ${report.polls.total}`,
    `Встреч: ${report.meetings.total}`,
  ].join('\n');
}

module.exports = {
  generateOrganizerReport,
  formatReportAsText,
};
