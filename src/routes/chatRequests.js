const express = require('express');
const router = express.Router();
const { ChatRequest, Conference, User, Notification, sequelize } = require('../models/mysql');
const { authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');
const { emitToUser } = require('../lib/realtime');

/**
 * POST /chat-requests/send
 * Body: { toTelegramId, conferenceCode, message? }
 * Send a chat request to another participant.
 */
router.post('/send', authMiddleware, async (req, res) => {
  const { toTelegramId, conferenceCode, message } = req.body;
  if (!toTelegramId) {
    return res.status(400).json({ error: 'toTelegramId is required' });
  }

  try {
    const me = await User.findByPk(req.user.id);
    if (!me) return res.status(404).json({ error: 'User not found' });

    const them = await User.findOne({ where: { telegramId: String(toTelegramId) } });
    if (!them) return res.status(404).json({ error: 'User not found' });
    if (me.id === them.id) {
      return res.status(400).json({ error: 'Cannot send a request to yourself' });
    }

    let conf = null;
    if (conferenceCode && conferenceCode !== 'undefined' && conferenceCode !== 'null') {
      conf = await Conference.findOne({ where: { conferenceCode: conferenceCode.toUpperCase() } });
      if (!conf) return res.status(404).json({ error: 'Conference not found' });
    }

    // Check if there is an active (pending or accepted) request
    const activeRequest = await ChatRequest.findOne({
      where: {
        status: { [Op.in]: ['pending', 'accepted'] },
        [Op.or]: [
          { fromId: me.id, toId: them.id },
          { fromId: them.id, toId: me.id },
        ],
      },
    });

    if (activeRequest) {
      return res.status(409).json({
        error: 'Active chat request already exists',
        status: activeRequest.status,
        id: activeRequest.id,
      });
    }

    // Count previous rejected requests sent from me to them
    const rejectCount = await ChatRequest.count({
      where: {
        fromId: me.id,
        toId: them.id,
        status: 'rejected',
      },
    });

    if (rejectCount >= 5) {
      return res.status(403).json({
        error: 'REJECTION_LIMIT_REACHED',
        message: 'Вы получили 5 отказов и больше не можете отправлять запросы этому пользователю.',
      });
    }

    const chatRequest = await ChatRequest.create({
      conferenceId: conf ? conf.id : null,
      fromId: me.id,
      toId: them.id,
      message: message?.trim(),
    });

    const bodyText = conf 
      ? `${me.firstName} ${me.lastName || ''} хочет начать с вами чат в конференции «${conf.title}»`.trim()
      : `${me.firstName} ${me.lastName || ''} хочет начать с вами прямой чат`.trim();

    // Create a notification for the recipient
    const notification = await Notification.create({
      userId: them.id,
      type: 'chat_request',
      title: 'Новый запрос на чат',
      body: bodyText,
      data: { 
        chatRequestId: chatRequest.id, 
        conferenceCode: conf ? conf.conferenceCode : null,
        senderName: `${me.firstName} ${me.lastName || ''}`.trim()
      },
    });

    // REAL-TIME: Emit to recipient
    emitToUser(them.telegramId, 'chat_request_received', {
      notification: {
        id: notification.id,
        type: 'chat_request',
        title: notification.title,
        body: notification.body,
        data: notification.data
      }
    });

    res.status(201).json({ success: true, chatRequestId: chatRequest.id, status: 'pending' });
  } catch (err) {
    console.error('Send chat request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /chat-requests
 * Returns all chat requests for the current user (incoming + outgoing).
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const me = await User.findByPk(req.user.id);
    if (!me) return res.status(404).json({ error: 'User not found' });

    const requests = await ChatRequest.findAll({
      where: { [Op.or]: [{ fromId: me.id }, { toId: me.id }] },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'username', 'telegramId', 'avatarUrl'] },
        { model: User, as: 'recipient', attributes: ['id', 'firstName', 'lastName', 'username', 'telegramId', 'avatarUrl'] },
        { model: Conference, as: 'conference', attributes: ['id', 'title', 'conferenceCode'] }
      ],
      order: [['updatedAt', 'DESC']]
    });

    const mapped = requests.map(r => ({
      id: r.id,
      isMine: r.fromId === me.id,
      status: r.status,
      message: r.message,
      conference: r.conference ? { name: r.conference.title, code: r.conference.conferenceCode } : null,
      from: { name: `${r.sender.firstName} ${r.sender.lastName || ''}`.trim(), telegramId: r.sender.telegramId, avatarUrl: r.sender.avatarUrl },
      to: { name: `${r.recipient.firstName} ${r.recipient.lastName || ''}`.trim(), telegramId: r.recipient.telegramId, avatarUrl: r.recipient.avatarUrl },
      createdAt: r.createdAt,
    }));

    res.json({ requests: mapped });
  } catch (err) {
    console.error('Get requests error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /chat-requests/:id/accept
 */
router.post('/:id/accept', authMiddleware, async (req, res) => {
  try {
    const me = await User.findByPk(req.user.id);
    if (!me) return res.status(404).json({ error: 'User not found' });

    const chatRequest = await ChatRequest.findByPk(req.params.id, {
      include: [
        { model: Conference, as: 'conference' },
        { model: User, as: 'sender' }
      ]
    });

    if (!chatRequest) return res.status(404).json({ error: 'Запрос не найден' });
    if (chatRequest.toId !== me.id) {
      return res.status(403).json({ error: 'Это не ваша просьба принять.' });
    }
    if (chatRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Запрос уже выполнен.' });
    }

    await chatRequest.update({ status: 'accepted' });

    // Auto-mark the incoming notification as read
    await Notification.update(
      { isRead: true },
      { 
        where: { 
          userId: me.id, 
          type: 'chat_request',
          'data.chatRequestId': chatRequest.id
        } 
      }
    ).catch(e => console.error('Failed to mark notification as read:', e));

    // Notify the requester
    const notification = await Notification.create({
      userId: chatRequest.fromId,
      type: 'request_accepted',
      title: 'Запрос принят!',
      body: chatRequest.conference 
        ? `${me.firstName} принял ваш запрос на чат в «${chatRequest.conference.title}»`
        : `${me.firstName} принял ваш запрос на прямой чат`,
      data: { 
        chatRequestId: chatRequest.id, 
        conferenceCode: chatRequest.conference ? chatRequest.conference.conferenceCode : null 
      },
    });

    // REAL-TIME: Emit to sender and recipient (to sync all their open client tabs)
    emitToUser(chatRequest.sender.telegramId, 'chat_request_accepted', {
      chatRequestId: chatRequest.id,
      conferenceCode: chatRequest.conference ? chatRequest.conference.conferenceCode : null,
      acceptedBy: { name: me.firstName, telegramId: me.telegramId }
    });

    emitToUser(me.telegramId, 'chat_request_accepted', {
      chatRequestId: chatRequest.id,
      conferenceCode: chatRequest.conference ? chatRequest.conference.conferenceCode : null,
      acceptedBy: { name: me.firstName, telegramId: me.telegramId }
    });

    res.json({ success: true, status: 'accepted' });
  } catch (err) {
    console.error('Accept request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /chat-requests/:id/reject
 */
router.post('/:id/reject', authMiddleware, async (req, res) => {
  try {
    const me = await User.findByPk(req.user.id);
    if (!me) return res.status(404).json({ error: 'User not found' });

    const chatRequest = await ChatRequest.findByPk(req.params.id, {
      include: [{ model: User, as: 'sender' }]
    });

    if (!chatRequest) return res.status(404).json({ error: 'Запрос не найден' });
    if (chatRequest.toId !== me.id) {
      return res.status(403).json({ error: 'Это не ваша просьба отклонить.' });
    }
    if (chatRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Запрос уже выполнен.' });
    }

    await chatRequest.update({ status: 'rejected' });

    // Auto-mark the incoming notification as read
    await Notification.update(
      { isRead: true },
      { 
        where: { 
          userId: me.id, 
          type: 'chat_request',
          'data.chatRequestId': chatRequest.id
        } 
      }
    ).catch(e => console.error('Failed to mark notification as read:', e));

    await Notification.create({
      userId: chatRequest.fromId,
      type: 'request_rejected',
      title: 'Запрос отклонён',
      body: `${me.firstName} отклонил ваш запрос на чат`,
      data: { chatRequestId: chatRequest.id },
    });

    // REAL-TIME: Emit to sender
    emitToUser(chatRequest.sender.telegramId, 'chat_request_rejected', {
      chatRequestId: chatRequest.id
    });

    res.json({ success: true, status: 'rejected' });
  } catch (err) {
    console.error('Reject request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
