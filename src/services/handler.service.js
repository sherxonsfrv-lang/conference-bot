const { Poll, Question, Conference, Participant, User } = require('../models/mysql');
const { ensureUserFromTelegram, userIsMainAdmin } = require('./conference.service');
const { getMainMenu, getUserMenu, getConferenceAdminMenu, getMainAdminMenu } = require('../telegram/menus');

function formatErrorMessage(error) {
  const errorMessages = {
    'CONFERENCE_NOT_FOUND': '❌ Конференция не найдена.',
    'CONFERENCE_PRIVATE': '❌ Эта конференция приватная.',
    'NOT_IN_CONFERENCE': '❌ Вы не участвуете в этой конференции.',
    'ACCESS_DENIED': '❌ У вас нет прав.',
    'QUESTION_NOT_FOUND': '❌ Вопрос не найден.',
    'POLL_NOT_FOUND': '❌ Опрос не найден.',
  };
  return errorMessages[error.message] || '❌ Произошла ошибка. Попробуйте ещё раз.';
}

async function getMenuForUser(telegramUser) {
  const { getUserRoles } = require('../telegram/menus');
  const roles = await getUserRoles(telegramUser);
  if (roles.isMainAdmin) return getMainAdminMenu();
  return getUserMenu();
}

async function handleHandlerError(ctx, error, defaultMenu = null) {
  console.error('Handler error:', error);
  const errorMsg = formatErrorMessage(error);
  const menu = defaultMenu || await getMenuForUser(ctx.from);
  try {
    await ctx.reply(errorMsg, menu);
  } catch (err) {
    console.error('Failed to send error:', err);
  }
}

function formatConferenceDetails(conference, conferenceCode) {
  const status = conference.isEnded ? 'Завершена' : (conference.isActive ? 'Активна' : 'Остановлена');
  return `📋 ${conference.title}\n\nКод: ${conferenceCode}\nСтатус: ${status}\n\n${conference.description || ''}`;
}

async function getConferenceCodeFromPoll(pollId) {
  const poll = await Poll.findByPk(pollId, { include: [{ model: Conference }] });
  return poll && poll.Conference ? poll.Conference.conferenceCode : null;
}

module.exports = {
  formatErrorMessage,
  getMenuForUser,
  handleHandlerError,
  formatConferenceDetails,
  getConferenceCodeFromPoll,
};
