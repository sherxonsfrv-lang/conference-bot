const { User, Conference, Participant } = require('../models/mysql');
const { Op } = require('sequelize');

function parseMainAdminIdsFromEnv() {
  const raw = process.env.MAIN_ADMIN_TELEGRAM_IDS || '';
  return raw.split(',').map((x) => x.trim()).filter(Boolean);
}

async function ensureUserFromTelegram(telegramUser) {
  if (!telegramUser || !telegramUser.id) throw new Error('Invalid Telegram user object');
  const telegramId = String(telegramUser.id);
  let user = await User.findOne({ where: { telegramId } });
  
  const userData = {
    telegramId,
    username: telegramUser.username,
    firstName: telegramUser.first_name,
    lastName: telegramUser.last_name,
  };

  const mainAdminIds = parseMainAdminIdsFromEnv();
  if (mainAdminIds.includes(telegramId)) userData.globalRole = 'main_admin';

  if (!user) {
    user = await User.create(userData);
  } else {
    await user.update(userData);
  }
  return user;
}

function userIsMainAdmin(user) {
  if (!user) return false;
  if (user.globalRole === 'main_admin') return true;
  return parseMainAdminIdsFromEnv().includes(String(user.telegramId));
}

function generateConferenceCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function createConference({ createdByUser, payload }) {
  const user = await ensureUserFromTelegram(createdByUser);
  const conference = await Conference.create({
    title: payload.title,
    description: payload.description,
    access: payload.access || 'public',
    startsAt: payload.startsAt ? new Date(payload.startsAt) : null,
    endsAt: payload.endsAt ? new Date(payload.endsAt) : null,
    conferenceCode: generateConferenceCode(payload.title),
    organizerId: user.id
  });
  return conference;
}

async function joinConference({ telegramUser, code }) {
  const user = await ensureUserFromTelegram(telegramUser);
  const conference = await Conference.findOne({ where: { conferenceCode: code, isEnded: false } });
  if (!conference) throw new Error('CONFERENCE_NOT_FOUND');

  let participant = await Participant.findOne({ where: { userId: user.id, conferenceId: conference.id } });
  if (!participant) {
    participant = await Participant.create({
      userId: user.id,
      conferenceId: conference.id,
      displayName: `${user.firstName} ${user.lastName || ''}`.trim(),
      role: 'participant'
    });
  }
  return { conference, profile: participant, user };
}

async function listConferencesForUser(user, { role } = {}) {
  if (!user) return [];
  
  const where = { userId: user.id };
  if (role) where.role = role;

  if (userIsMainAdmin(user) && !role) {
    return Conference.findAll({ order: [['startsAt', 'ASC']] });
  }

  const participations = await Participant.findAll({ 
    where,
    include: [{ model: Conference, as: 'conference' }]
  });
  return participations.map(p => p.conference).filter(c => c && !c.isEnded);
}

async function updateConference({ conferenceCode, updates }) {
  const conference = await Conference.findOne({ where: { conferenceCode } });
  if (!conference) throw new Error('CONFERENCE_NOT_FOUND');
  await conference.update(updates);
  return conference;
}

async function startConference(conferenceCode) {
  return await updateConference({ conferenceCode, updates: { isActive: true, isEnded: false } });
}

async function stopConference(conferenceCode) {
  return await updateConference({ conferenceCode, updates: { isActive: false } });
}

async function endConference(conferenceCode) {
  return await updateConference({ conferenceCode, updates: { isActive: false, isEnded: true } });
}

async function deleteConference(conferenceCode) {
  const conference = await Conference.findOne({ where: { conferenceCode } });
  if (conference) await conference.destroy();
}

module.exports = {
  ensureUserFromTelegram,
  userIsMainAdmin,
  createConference,
  joinConference,
  listConferencesForUser,
  updateConference,
  startConference,
  stopConference,
  endConference,
  deleteConference,
};
