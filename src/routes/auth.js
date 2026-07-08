const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { User, Conference, Participant, TempLoginToken } = require('../models/mysql');
const { verifyInitData } = require('../middleware/auth');
const { hashPassword, verifyPassword, generateBlindIndex } = require('../lib/crypto-helper');
const jwtHelper = require('../lib/jwt-helper');
const { Op } = require('sequelize');

// List of allowed standard top-level domains to prevent fake domains
const VALID_TLDS = new Set([
  'com', 'org', 'net', 'edu', 'gov', 'mil', 'biz', 'info', 'mobi', 'name',
  'aero', 'coop', 'museum', 'io', 'me', 'co', 'tv', 'cc', 'ru', 'su',
  'ua', 'by', 'kz', 'us', 'uk', 'ca', 'fr', 'de', 'jp', 'cn', 'in',
  'xyz', 'online', 'site', 'tech', 'store', 'app', 'dev', 'ai'
]);

/**
 * Strict email domain and TLD validator
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  // Basic format check
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) return false;

  const parts = email.split('@');
  if (parts.length !== 2) return false;

  const domain = parts[1].toLowerCase();
  const domainParts = domain.split('.');
  if (domainParts.length < 2) return false;

  const tld = domainParts[domainParts.length - 1];

  // TLD validation (must be 2-20 alphabetical chars and in our standard set)
  if (!/^[a-z]{2,20}$/.test(tld)) return false;
  if (domain.includes('..')) return false;
  if (!VALID_TLDS.has(tld)) return false;

  return true;
}

/**
 * Helper to fetch user's conferences
 */
async function fetchUserConferences(user) {
  const participations = await Participant.findAll({
    where: { userId: user.id },
    include: [{ model: Conference, as: 'conference' }],
    order: [['created_at', 'DESC']]
  });

  return participations.map(p => {
    const conf = p.conference;
    if (!conf) return null;

    const now = new Date();
    let accessPhase = 'free';
    if (conf.endsAt && conf.endsAt < now) {
      const graceEnd = new Date(conf.endsAt.getTime() + (conf.gracePeriodHours || 48) * 3600 * 1000);
      if (now <= graceEnd) {
        accessPhase = 'grace';
      } else if (!user.hasPaidAccess || (user.paidAccessUntil && user.paidAccessUntil < now)) {
        accessPhase = 'payment_required';
      }
    }

    return {
      id: conf.id,
      code: conf.conferenceCode,
      name: conf.title,
      description: conf.description,
      startsAt: conf.startsAt,
      endsAt: conf.endsAt,
      isActive: conf.isActive,
      accessPhase,
    };
  }).filter(Boolean);
}

/**
 * GET /api/auth/settings
 * Public endpoint to fetch system configuration on boot
 */
router.get('/settings', async (req, res) => {
  try {
    const { SystemSettings } = require('../models/mysql');
    const settings = await SystemSettings.findOne({ where: { id: 1 } });
    if (!settings) {
      return res.json({
        allowTelegramLogin: true,
        paidLimitsEnabled: true,
        tariffPrice: 249,
        allowConferenceCreationUsers: true
      });
    }
    res.json({
      allowTelegramLogin: settings.allowTelegramLogin,
      paidLimitsEnabled: settings.paidLimitsEnabled,
      tariffPrice: settings.tariffPrice,
      allowConferenceCreationUsers: settings.allowConferenceCreationUsers
    });
  } catch (err) {
    console.error('Fetch public settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth
 * Body: { initData }
 * Returns: { user, profile, conferences, token }
 * Authenticates TWA users
 */
router.post('/', async (req, res) => {
  const { initData } = req.body;
  if (!initData) return res.status(400).json({ error: 'initData is required' });

  let tgUser;
  try {
    if (process.env.NODE_ENV === 'development' && !process.env.TELEGRAM_BOT_TOKEN) {
      tgUser = JSON.parse(new URLSearchParams(initData).get('user') || '{}');
      if (!tgUser.id) tgUser = { id: '12345', first_name: 'Dev', last_name: 'User', username: 'dev_user' };
    } else {
      tgUser = verifyInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
    }
  } catch (err) {
    return res.status(401).json({ error: 'Invalid Telegram auth: ' + err.message });
  }

  try {
    let user = await User.findOne({ where: { telegramId: String(tgUser.id) } });

    const userData = {
      telegramId: String(tgUser.id),
      firstName: tgUser.first_name,
      lastName: tgUser.last_name,
      username: tgUser.username,
      avatarUrl: tgUser.photo_url || null,
    };

    if (!user) {
      user = await User.create(userData);
    } else {
      await user.update(userData);
    }

    const conferences = await fetchUserConferences(user);
    const token = jwtHelper.sign({ id: user.id, telegramId: user.telegramId });

    res.json({
      token,
      user: {
        id: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      },
      profile: {
        ...user.toJSON(),
        isIncomplete: !user.onboardingCompleted,
      },
      conferences,
    });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/register-email
 * Website registration with email
 */
router.post('/register-email', async (req, res) => {
  const { email, password, firstName, lastName, consent } = req.body;

  if (!consent) {
    return res.status(400).json({ error: 'You must consent to personal data processing.' });
  }
  if (!email || !password || !firstName?.trim()) {
    return res.status(400).json({ error: 'Required fields: Email, password, first name.' });
  }
  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address with a legitimate domain.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  try {
    const emailHash = generateBlindIndex(email);
    const existing = await User.findOne({ where: { emailHash } });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const { hash, salt } = hashPassword(password);

    // Email-only users: telegramId stays null. They are identified by their DB id.
    const user = await User.create({
      email,
      firstName: firstName.trim(),
      lastName: lastName?.trim() || null,
      passwordHash: hash,
      passwordSalt: salt,
      globalRole: 'user',
      telegramId: null,
      onboardingCompleted: false,
    });

    // Sign token with DB id; telegramId is null for email users
    const token = jwtHelper.sign({ id: user.id, email: user.email, telegramId: null });

    res.status(201).json({
      token,
      user: {
        id: null,
        firstName: user.firstName,
        lastName: user.lastName,
        username: null,
      },
      profile: {
        ...user.toJSON(),
        isIncomplete: true
      },
      conferences: []
    });
  } catch (err) {
    console.error('Email registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login-email
 * Website login with email
 */
router.post('/login-email', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const emailHash = generateBlindIndex(email);
    const user = await User.findOne({ where: { emailHash } });

    // Generic error to prevent email harvesting
    if (!user || !user.passwordHash || !user.passwordSalt) {
      return res.status(401).json({ error: 'Неверный адрес электронной почты или пароль.' });
    }

    const isValid = verifyPassword(password, user.passwordHash, user.passwordSalt);
    if (!isValid) {
      return res.status(401).json({ error: 'Неверный адрес электронной почты или пароль.' });
    }

    const conferences = await fetchUserConferences(user);
    const token = jwtHelper.sign({ id: user.id, email: user.email, telegramId: user.telegramId });

    res.json({
      token,
      user: {
        id: user.telegramId || null,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username || null,
      },
      profile: {
        ...user.toJSON(),
        isIncomplete: !user.onboardingCompleted,
      },
      conferences,
    });
  } catch (err) {
    console.error('Email login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/telegram-token
 * Request one-time token for web Telegram authorization
 */
router.post('/telegram-token', async (req, res) => {
  try {
    const { SystemSettings } = require('../models/mysql');
    const settings = await SystemSettings.findOne({ where: { id: 1 } });
    if (settings && !settings.allowTelegramLogin) {
      return res.status(400).json({
        error: 'TELEGRAM_LOGIN_DISABLED',
        message: 'Вход через Telegram временно отключен администратором.'
      });
    }

    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    await TempLoginToken.create({
      token,
      status: 'pending',
      expiresAt
    });

    // Resolve Bot name from environment
    const botUser = process.env.TELEGRAM_BOT_USERNAME || 'avtostatus_info_bot';

    res.json({
      token,
      botUrl: `https://t.me/${botUser}?start=login_${token}`
    });
  } catch (err) {
    console.error('Telegram token request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/telegram-poll
 * Poll one-time token status from website
 */
router.get('/telegram-poll', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token is required' });

  try {
    const entry = await TempLoginToken.findOne({ where: { token } });
    if (!entry) return res.status(404).json({ error: 'Token not found' });

    if (new Date() > entry.expiresAt) {
      await entry.update({ status: 'expired' });
      return res.json({ status: 'expired' });
    }

    if (entry.status === 'pending') {
      return res.json({ status: 'pending' });
    }

    if (entry.status === 'completed') {
      const user = await User.findByPk(entry.userId);
      if (!user) return res.status(404).json({ error: 'User registered in token was not found' });

      const conferences = await fetchUserConferences(user);
      const jwtToken = jwtHelper.sign({ id: user.id, telegramId: user.telegramId });

      // Clean up token after successful use
      await entry.destroy();

      return res.json({
        status: 'completed',
        token: jwtToken,
        user: {
          id: user.telegramId,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
        },
        profile: {
          ...user.toJSON(),
          isIncomplete: !user.onboardingCompleted,
        },
        conferences
      });
    }

    res.json({ status: entry.status });
  } catch (err) {
    console.error('Telegram token polling error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
