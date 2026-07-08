const { Markup } = require('telegraf');
const { ensureUserFromTelegram, userIsMainAdmin } = require('../services/conference.service');
const { User, Conference, Participant } = require('../models/mysql');

/**
 * Generate WebApp URL
 * Pointing to the new Netlify host as requested.
 */
function getWebAppUrl() {
  if (process.env.WEBSITE_URL) {
    return process.env.WEBSITE_URL;
  }
  return `http://localhost:3000/app`;
}

/**
 * Get user's effective roles (global + per-conference) using MySQL
 */
async function getUserRoles(telegramUser) {
  const user = await ensureUserFromTelegram(telegramUser);
  const isMainAdmin = userIsMainAdmin(user);
  const isConferenceAdmin = user.globalRole === 'conference_admin' || user.globalRole === 'main_admin';

  // Check participations in MySQL
  const participations = await Participant.findAll({
    where: { userId: user.id },
    include: [{ model: Conference, as: 'conference' }]
  });

  const activeConferences = participations
    .map(p => p.conference)
    .filter(c => c && !c.isEnded);

  const hasSpeakerRole = participations.some(p => p.role === 'speaker');

  return {
    isMainAdmin,
    isConferenceAdmin,
    hasSpeakerRole,
    activeConferences: activeConferences.map(c => ({
      code: c.conferenceCode,
      title: c.title,
    })),
  };
}

/**
 * Main menu - Minimal Launcher
 */
async function getMainMenu(telegramUser) {
  const roles = await getUserRoles(telegramUser);
  const useWebsite = process.env.USE_WEBSITE_MODE === 'true';
  const appUrl = getWebAppUrl();
  const isLocal = appUrl.includes('localhost') || appUrl.includes('127.0.0.1');
  
  const buttons = [
    [(useWebsite && !isLocal)
      ? Markup.button.url('🚀 Открыть сайт', appUrl)
      : Markup.button.webApp('🚀 Открыть приложение', appUrl)
    ]
  ];

  // Optional: Keeping the Admin Panel button if user is an admin
  if (roles.isMainAdmin || roles.isConferenceAdmin) {
    buttons.push([(useWebsite && !isLocal)
      ? Markup.button.url('⚙️ Панель администратора', `${appUrl}/admin`)
      : Markup.button.webApp('⚙️ Панель администратора', `${appUrl}/admin`)
    ]);
  }

  return Markup.inlineKeyboard(buttons);
}

/**
 * Simple Admin Menu (Launcher for the web dashboard)
 */
function getConferenceAdminMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.webApp('🌐 Открыть Web-панель', getWebAppUrl())],
    [Markup.button.callback('◀️ Назад', 'menu:main')],
  ]);
}

module.exports = {
  getUserRoles,
  getMainMenu,
  getWebAppUrl,
  getConferenceAdminMenu,
  // Exporting empty fallbacks for any legacy references in bot.js until it's also simplified
  getReplyKeyboard: () => Markup.removeKeyboard(), 
  removeReplyKeyboard: () => Markup.removeKeyboard(),
};
