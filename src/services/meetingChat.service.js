const crypto = require('crypto');
const { Meeting, MeetingChatMessage, MeetingChatToken, User, Participant } = require('../models/mysql');

function generateChatToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function getOrCreateChatToken({ meetingId }) {
  const meeting = await Meeting.findByPk(meetingId);
  if (!meeting) throw new Error('MEETING_NOT_FOUND');

  let tokenDoc = await MeetingChatToken.findOne({ where: { meetingId } });
  if (tokenDoc && tokenDoc.expiresAt > new Date()) return tokenDoc;

  // 1 hour after meeting end
  const expiresAt = new Date(Date.now() + 3600 * 1000); 

  if (tokenDoc) await tokenDoc.destroy();

  return await MeetingChatToken.create({
    meetingId,
    token: generateChatToken(),
    expiresAt,
  });
}

async function validateChatToken({ token }) {
  const tokenDoc = await MeetingChatToken.findOne({ 
    where: { token },
    include: [{ model: Meeting }]
  });

  if (!tokenDoc) throw new Error('INVALID_TOKEN');
  if (tokenDoc.expiresAt <= new Date()) throw new Error('TOKEN_EXPIRED');

  // Load requester and recipient details
  const meeting = await Meeting.findByPk(tokenDoc.meetingId, {
    include: [
      { model: User, as: 'requester', attributes: ['id', 'firstName', 'lastName', 'username'] },
      { model: User, as: 'recipient', attributes: ['id', 'firstName', 'lastName', 'username'] }
    ]
  });

  return { meeting, tokenDoc };
}

async function getChatMessages({ token, limit = 50 }) {
  const tokenDoc = await MeetingChatToken.findOne({ where: { token } });
  if (!tokenDoc) throw new Error('INVALID_TOKEN');

  const messages = await MeetingChatMessage.findAll({
    where: { meetingId: tokenDoc.meetingId },
    include: [{ model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'username'] }],
    order: [['createdAt', 'ASC']],
    limit
  });

  return messages;
}

async function sendChatMessage({ token, telegramUser, text }) {
  const tokenDoc = await MeetingChatToken.findOne({ where: { token } });
  if (!tokenDoc) throw new Error('INVALID_TOKEN');
  if (tokenDoc.expiresAt <= new Date()) throw new Error('TOKEN_EXPIRED');

  const sender = await User.findOne({ where: { telegramId: String(telegramUser.id) } });
  if (!sender) throw new Error('USER_NOT_FOUND');

  const message = await MeetingChatMessage.create({
    meetingId: tokenDoc.meetingId,
    senderId: sender.id,
    text: text.trim(),
  });

  // Attach sender info so the socket response is populated correctly
  message.setDataValue('sender', sender);

  return { message };
}

module.exports = {
  getOrCreateChatToken,
  validateChatToken,
  getChatMessages,
  sendChatMessage,
};
