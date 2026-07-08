const express = require('express');
const router = express.Router();
const { User, ChatRequest } = require('../models/mysql');
const { authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');
const { emitToUser } = require('../lib/realtime');

/**
 * GET /api/users
 * Returns a list of users who have completed onboarding.
 * Used for global networking when not in a conference.
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search } = req.query;
    
    const me = await User.findByPk(req.user.id);
    if (!me) return res.status(404).json({ error: 'User not found' });

    let where = { 
      onboardingCompleted: true,
      id: { [Op.ne]: me.id } // Don't show self
    };

    if (search) {
      const searchLower = `%${search.toLowerCase()}%`;
      where[Op.or] = [
        { firstName: { [Op.like]: searchLower } },
        { lastName: { [Op.like]: searchLower } },
        { position: { [Op.like]: searchLower } },
        { company: { [Op.like]: searchLower } },
        { bio: { [Op.like]: searchLower } }
      ];
    }

    const users = await User.findAll({
      where,
      limit: 50,
      order: [['updatedAt', 'DESC']]
    });

    const requests = await ChatRequest.findAll({
      where: {
        [Op.or]: [{ fromId: me.id }, { toId: me.id }]
      }
    });

    const statusMap = {};
    for (const r of requests) {
      const targetId = r.fromId === me.id ? r.toId : r.fromId;
      if (!statusMap[targetId] || statusMap[targetId] !== 'accepted') {
        statusMap[targetId] = r.status;
      }
    }
    
    const mapped = users.map(u => {
      const chatStatus = statusMap[u.id] || null;
      return {
        id: u.id,
        userId: u.telegramId,
        displayName: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        role: u.position || 'Member',
        company: u.company,
        bio: u.bio,
        interests: u.interests,
        avatarUrl: u.avatarUrl,
        isRestricted: false,
        chatStatus,
      };
    });

    res.json({ users: mapped });
  } catch (err) {
    console.error('Get users search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/admin
 * Returns all users (system admin only)
 */
router.get('/admin', authMiddleware, async (req, res) => {
  try {
    if (req.user.globalRole !== 'main_admin') {
      return res.status(403).json({ error: 'Access denied. Main admin only.' });
    }

    const users = await User.findAll({
      order: [['createdAt', 'DESC']]
    });

    res.json({
      users: users.map(u => ({
        id: u.id,
        telegramId: u.telegramId,
        firstName: u.firstName,
        lastName: u.lastName,
        username: u.username,
        email: u.email,
        globalRole: u.globalRole,
        interests: u.interests || [],
        lookingFor: u.lookingFor || '',
        allowConferenceCreation: u.allowConferenceCreation,
        allowBulkNotifications: u.allowBulkNotifications,
        createdAt: u.createdAt,
        isBlocked: u.isBlocked,
        rating: u.rating,
        avatarUrl: u.avatarUrl,
        phone: u.phone,
        company: u.company,
        position: u.position,
      }))
    });
  } catch (err) {
    console.error('Admin get users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/admin/settings
 * Retrieve administrative system settings
 */
router.get('/admin/settings', authMiddleware, async (req, res) => {
  try {
    if (req.user.globalRole !== 'main_admin') {
      return res.status(403).json({ error: 'Access denied. Main admin only.' });
    }
    const { SystemSettings } = require('../models/mysql');
    const settings = await SystemSettings.findOne({ where: { id: 1 } });
    res.json({ settings });
  } catch (err) {
    console.error('Admin get settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/users/admin/settings
 * Update administrative system settings
 */
router.put('/admin/settings', authMiddleware, async (req, res) => {
  try {
    if (req.user.globalRole !== 'main_admin') {
      return res.status(403).json({ error: 'Access denied. Main admin only.' });
    }
    const { SystemSettings } = require('../models/mysql');
    const { allowConferenceCreationUsers, allowTelegramLogin, paidLimitsEnabled, tariffPrice } = req.body;

    const settings = await SystemSettings.findOne({ where: { id: 1 } });
    if (!settings) return res.status(404).json({ error: 'Settings not found' });

    const updates = {};
    if (allowConferenceCreationUsers !== undefined) updates.allowConferenceCreationUsers = !!allowConferenceCreationUsers;
    if (allowTelegramLogin !== undefined) updates.allowTelegramLogin = !!allowTelegramLogin;
    if (paidLimitsEnabled !== undefined) updates.paidLimitsEnabled = !!paidLimitsEnabled;
    if (tariffPrice !== undefined) updates.tariffPrice = parseInt(tariffPrice, 10) || 0;

    await settings.update(updates);
    res.json({ success: true, settings });
  } catch (err) {
    console.error('Admin update settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/users/admin/:userId
 * Updates user global role and permissions (system admin only)
 */
router.put('/admin/:userId', authMiddleware, async (req, res) => {
  try {
    if (req.user.globalRole !== 'main_admin') {
      return res.status(403).json({ error: 'Access denied. Main admin only.' });
    }

    const { userId } = req.params;
    const { globalRole, allowConferenceCreation, allowBulkNotifications, isBlocked, rating } = req.body;

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updates = {};
    if (globalRole !== undefined) updates.globalRole = globalRole;
    if (allowConferenceCreation !== undefined) updates.allowConferenceCreation = !!allowConferenceCreation;
    if (allowBulkNotifications !== undefined) updates.allowBulkNotifications = !!allowBulkNotifications;
    if (isBlocked !== undefined) updates.isBlocked = !!isBlocked;
    if (rating !== undefined) updates.rating = parseFloat(rating);

    await user.update(updates);
    res.json({ success: true, user });
  } catch (err) {
    console.error('Admin update user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/users/admin/notify
 * Send push notification and socket notification to user
 */
router.post('/admin/notify', authMiddleware, async (req, res) => {
  try {
    if (req.user.globalRole !== 'main_admin') {
      return res.status(403).json({ error: 'Access denied. Main admin only.' });
    }
    const { userId, title, body } = req.body;
    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'userId, title, and body are required' });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { Notification } = require('../models/mysql');
    const notification = await Notification.create({
      userId: user.id,
      type: 'system_notification',
      title,
      body,
      data: { system: true }
    });

    // Send real-time socket notification
    try {
      emitToUser(user.telegramId, 'admin_notification', {
        id: notification.id,
        title,
        body,
        createdAt: notification.createdAt
      });
    } catch (sockErr) {
      console.warn('⚠️ Could not emit socket notification:', sockErr.message);
    }

    res.json({ success: true, notification });
  } catch (err) {
    console.error('Admin notify error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/admin/analytics
 * Retrieve system dashboard analytics
 */
router.get('/admin/analytics', authMiddleware, async (req, res) => {
  try {
    if (req.user.globalRole !== 'main_admin') {
      return res.status(403).json({ error: 'Access denied. Main admin only.' });
    }
    const { Payment, Conference, sequelize } = require('../models/mysql');

    const totalUsers = await User.count();
    const totalConferences = await Conference.count();
    const activeConferences = await Conference.count({ where: { isActive: true } });
    
    const revenueKopecks = await Payment.sum('amount', { where: { status: 'succeeded' } }) || 0;
    const totalRevenue = Math.round(revenueKopecks / 100);

    const avgRating = parseFloat((await User.aggregate('rating', 'avg') || 5.0).toFixed(2));

    const recentUsers = await User.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10,
      attributes: ['firstName', 'lastName', 'username', 'createdAt', 'rating', 'hasPaidAccess']
    });

    res.json({
      metrics: {
        totalUsers,
        totalConferences,
        activeConferences,
        totalRevenue,
        avgRating
      },
      recentUsers: recentUsers.map(u => ({
        displayName: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        username: u.username,
        createdAt: u.createdAt,
        rating: u.rating,
        hasPaid: u.hasPaidAccess
      }))
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
