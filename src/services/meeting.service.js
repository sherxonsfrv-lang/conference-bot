const { User, Conference, Participant, Meeting } = require('../models/mysql');
const { Op } = require('sequelize');
const { emitToConference } = require('../lib/realtime');

async function notifyMeetingStarting({ meeting }) {
  try {
    const { getBot } = require('../telegram/bot');
    const bot = getBot();
    if (!bot) return;

    // Use requester and recipient from the meeting (assuming include was used)
    const requester = meeting.requester;
    const recipient = meeting.recipient;

    if (requester && requester.telegramId) {
      await bot.telegram.sendMessage(requester.telegramId, `🔔 Ваша встреча начинается!\n\n📅 Время: ${meeting.proposedTime.toLocaleString('ru-RU')}`);
    }
    if (recipient && recipient.telegramId) {
      await bot.telegram.sendMessage(recipient.telegramId, `🔔 Ваша встреча начинается!\n\n📅 Время: ${meeting.proposedTime.toLocaleString('ru-RU')}`);
    }
  } catch (err) {
    console.error('Error notifying meeting:', err);
  }
}

async function requestMeeting({ telegramUser, conferenceCode, recipientProfileId, proposedTime, message, durationMinutes = 30 }) {
  const user = await User.findOne({ where: { telegramId: String(telegramUser.id) } });
  const conference = await Conference.findOne({ where: { conferenceCode } });
  
  if (!user || !conference) throw new Error('USER_OR_CONFERENCE_NOT_FOUND');

  // Find recipient participant (Profile)
  const recipientParticipant = await Participant.findByPk(recipientProfileId);
  if (!recipientParticipant) throw new Error('RECIPIENT_NOT_FOUND');

  const meeting = await Meeting.create({
    conferenceId: conference.id,
    requesterId: user.id,
    recipientId: recipientParticipant.userId,
    status: 'pending',
    proposedTime,
    durationMinutes,
    message,
  });

  return { meeting, conference };
}

module.exports = {
  requestMeeting,
  notifyMeetingStarting,
};
