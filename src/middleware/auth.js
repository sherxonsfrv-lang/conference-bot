const crypto = require('crypto');
const jwtHelper = require('../lib/jwt-helper');
const { User } = require('../models/mysql');

/**
 * Verify Telegram Web App initData signature.
 * Returns the parsed user object if valid, throws otherwise.
 */
function verifyInitData(initData, botToken) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');

  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (calculatedHash !== hash) throw new Error('Invalid initData signature');

  const userStr = urlParams.get('user');
  if (!userStr) throw new Error('No user in initData');
  return JSON.parse(userStr);
}

/**
 * Express middleware that validates JWT or TWA initData or uses X-Telegram-Id in development.
 */
async function authMiddleware(req, res, next) {
  try {
    // 1. Try JWT validation first (for website users)
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwtHelper.verify(token);
      if (decoded) {
        const user = await User.findByPk(decoded.id);
        if (!user) {
          return res.status(401).json({ error: 'User account not found' });
        }
        if (user.isBlocked) {
          return res.status(403).json({ error: 'ACCOUNT_BLOCKED', message: 'Ваш аккаунт заблокирован администратором.' });
        }
        req.user = {
          id: user.id,
          telegramId: user.telegramId,
          globalRole: user.globalRole,
          allowConferenceCreation: user.allowConferenceCreation
        };
        return next();
      } else {
        return res.status(401).json({ error: 'Invalid or expired session token' });
      }
    }

    // 2. Development bypass: allow X-Telegram-Id header directly ONLY if on localhost
    const isLocal = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
    if (process.env.NODE_ENV === 'development' && isLocal) {
      const devId = req.headers['x-telegram-id'];
      if (devId) {
        console.log(`[AUTH DEBUG] Dev Bypass used for ID: ${devId}`);
        const user = await User.findOne({ where: { telegramId: String(devId) } });
        if (user) {
          if (user.isBlocked) {
            return res.status(403).json({ error: 'ACCOUNT_BLOCKED', message: 'Ваш аккаунт заблокирован администратором.' });
          }
          req.user = {
            id: user.id,
            telegramId: user.telegramId,
            globalRole: user.globalRole,
            allowConferenceCreation: user.allowConferenceCreation
          };
        } else {
          req.user = { id: devId, telegramId: devId, globalRole: 'user', allowConferenceCreation: true };
        }
        return next();
      }
    }

    // 3. Fallback to Telegram Web App initData
    const initData = req.headers['x-telegram-init-data'];
    if (!initData) {
      console.error(`[AUTH DEBUG] Missing authentication header from ${req.ip}`);
      return res.status(401).json({ error: 'Missing authentication header' });
    }

    const tgUser = verifyInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
    console.log(`[AUTH DEBUG] Success: User ${tgUser.id} verified.`);
    
    const user = await User.findOne({ where: { telegramId: String(tgUser.id) } });
    if (!user) {
      return res.status(401).json({ error: 'User account not registered' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ error: 'ACCOUNT_BLOCKED', message: 'Ваш аккаунт заблокирован администратором.' });
    }

    req.user = {
      id: user.id,
      telegramId: user.telegramId,
      globalRole: user.globalRole,
      allowConferenceCreation: user.allowConferenceCreation
    };
    next();
  } catch (err) {
    console.error(`[AUTH DEBUG] Auth failed: ${err.message}`);
    return res.status(401).json({ error: 'Authentication failed: ' + err.message });
  }
}

module.exports = { authMiddleware, verifyInitData };
