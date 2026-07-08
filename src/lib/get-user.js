const { User } = require('../models/mysql');

/**
 * Resolve the authenticated user from req.user.
 * Handles both Telegram users (telegramId present) and email-only users (telegramId = null).
 * Always prefer DB id when available (JWT sets it). Falls back to telegramId lookup for
 * legacy Telegram-only sessions that lack the id field.
 *
 * @param {object} reqUser - req.user set by authMiddleware
 * @returns {Promise<User|null>}
 */
async function getUser(reqUser) {
  if (!reqUser) return null;

  // Primary: look up by DB id (works for both email and Telegram users)
  if (reqUser.id) {
    const user = await User.findByPk(reqUser.id);
    if (user) return user;
  }

  // Fallback: look up by telegramId for legacy sessions without id
  if (reqUser.telegramId) {
    return User.findOne({ where: { telegramId: String(reqUser.telegramId) } });
  }

  return null;
}

module.exports = { getUser };
