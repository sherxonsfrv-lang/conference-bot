const express = require('express');
const router = express.Router();
const { Notification, User } = require('../models/mysql');
const { authMiddleware } = require('../middleware/auth');

/**
 * GET /notifications
 * Returns the user's notifications, newest first.
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const notifications = await Notification.findAll({
      where: { userId: user.id },
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    const unreadCount = await Notification.count({
      where: { userId: user.id, isRead: false }
    });

    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /notifications/:id/read
 * Mark a single notification as read.
 */
router.post('/:id/read', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await Notification.update(
      { isRead: true },
      { where: { id: req.params.id, userId: user.id } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /notifications/read-all
 * Mark all notifications as read.
 */
router.post('/read-all', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await Notification.update(
      { isRead: true },
      { where: { userId: user.id, isRead: false } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
