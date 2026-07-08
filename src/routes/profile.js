const express = require('express');
const router = express.Router();
const { User, Participant, ChatRequest } = require('../models/mysql');
const { authMiddleware } = require('../middleware/auth');
const { getLatestPhotoLink } = require('../lib/telegram');
const axios = require('axios');
const { Op } = require('sequelize');

/**
 * Helper: compute meetings and connections counts for a user by DB id.
 */
async function getUserStats(userId) {
  const [meetingsCount, connectionsCount] = await Promise.all([
    Participant.count({ where: { userId } }),
    ChatRequest.count({
      where: {
        status: 'accepted',
        [Op.or]: [{ fromId: userId }, { toId: userId }],
      },
    }),
  ]);
  return { meetingsCount, connectionsCount };
}

/**
 * GET /telegram-avatar/:telegramId
 * Secure proxy to serve Telegram profile photos without exposing the bot token.
 */
router.get('/telegram-avatar/:telegramId', async (req, res) => {
    const { telegramId: rawId } = req.params;
    
    // Strip any cosmetic extensions like .jpg or .png to get the numeric ID
    const telegramId = rawId.replace(/\.(jpg|jpeg|png|webp)$/i, '');
    
    try {
      const photoUrl = await getLatestPhotoLink(telegramId);
      
      if (!photoUrl) {
        return res.status(404).json({ error: 'Photo not found' });
      }
      
      // Proxy the image data
      const response = await axios({
        method: 'get',
        url: photoUrl,
        responseType: 'stream',
      });
      
      res.setHeader('Content-Type', 'image/jpeg'); // Force image/jpeg for Telegram photos
      res.setHeader('Content-Disposition', 'inline; filename="avatar.jpg"');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      response.data.pipe(res);
    } catch (err) {
      console.error(`[AVATAR PROXY] Error for ${telegramId}:`, err.message);
      res.status(500).json({ error: 'Failed to fetch avatar' });
    }
});

/**
 * POST /sync-telegram-photo
 * Sync the user's profile photo from Telegram.
 */
router.post('/sync-telegram-photo', authMiddleware, async (req, res) => {
  const telegramId = req.user.telegramId;
  
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Guard: Don't attempt to sync with actual Telegram for mock dev IDs or email users
    if (!telegramId || telegramId === '12345' || isNaN(Number(telegramId))) {
      return res.status(400).json({ error: 'PHOTO_SYNC_UNAVAILABLE_IN_DEV_MODE', message: 'Синхронизация фото невозможна в демо-режиме.' });
    }
    
    // Just verify if the photo exists
    const photoUrl = await getLatestPhotoLink(telegramId);
    if (!photoUrl) {
      return res.status(404).json({ error: 'NO_TELEGRAM_PHOTO' });
    }
    
    // Dynamically detect the current domain (ngrok or localhost)
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const proxyUrl = `${protocol}://${host}/api/profile/telegram-avatar/${telegramId}.jpg`;
    
    await user.update({ avatarUrl: proxyUrl });
    
    res.json({ success: true, avatarUrl: proxyUrl });
  } catch (err) {
    console.error('[PHOTO SYNC] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /profile
 * Returns the current user's full profile.
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const stats = await getUserStats(user.id);
    res.json({ profile: { ...user.toJSON(), ...stats } });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /profile
 */
router.post('/', authMiddleware, async (req, res) => {
  const allowedFields = [
    'firstName', 'lastName', 'bio', 'about', 'lookingFor',
    'company', 'position', 'country', 'region', 'city',
    'email', 'phone', 'telegram', 'whatsapp',
    'interests', 'avatarUrl', 'onboardingCompleted', 'isProfilePublic'
  ];

  const updateData = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) updateData[key] = req.body[key];
  }

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    await user.update(updateData);
    const stats = await getUserStats(user.id);
    res.json({ success: true, profile: { ...user.toJSON(), ...stats } });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /public
 * Search for public profiles.
 */
router.get('/public', authMiddleware, async (req, res) => {
  const { query } = req.query;
  
  try {
    const where = { 
      isProfilePublic: true,
      onboardingCompleted: true 
    };

    const profiles = await User.findAll({ where });

    let filtered = profiles;
    if (query) {
      const q = query.toLowerCase();
      filtered = profiles.filter(p => {
        const first = (p.firstName || '').toLowerCase();
        const last = (p.lastName || '').toLowerCase();
        const pos = (p.position || '').toLowerCase();
        const comp = (p.company || '').toLowerCase();
        
        // Interests is a JSON array
        const interestsArr = Array.isArray(p.interests) ? p.interests : [];
        const hasInterest = interestsArr.some(i => String(i).toLowerCase().includes(q));

        return first.includes(q) || 
               last.includes(q) || 
               pos.includes(q) || 
               comp.includes(q) ||
               hasInterest;
      });
    }

    // Sort by firstName ASC
    filtered.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));

    // Limit to 50 results
    const sliced = filtered.slice(0, 50);

    res.json({ profiles: sliced });
  } catch (err) {
    console.error('Public profile search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
