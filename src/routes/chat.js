const express = require('express');
const router = express.Router();
const { Message, ChatRequest, User, Conference, sequelize } = require('../models/mysql');
const { authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');
const { emitToUser } = require('../lib/realtime');

/**
 * GET /chat/list?conferenceCode=X
 * Returns all accepted chat conversations for this user.
 * If conferenceCode is provided, scopes to that conference.
 */
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const me = await User.findByPk(req.user.id);
    if (!me) return res.status(404).json({ error: 'User not found' });

    const requestFilter = { 
      status: 'accepted', 
      [Op.or]: [{ fromId: me.id }, { toId: me.id }] 
    };

    const { Participant } = require('../models/mysql');

    if (req.query.conferenceCode) {
      const conf = await Conference.findOne({ where: { conferenceCode: req.query.conferenceCode.toUpperCase() } });
      if (conf) {
        const participants = await Participant.findAll({
          where: { conferenceId: conf.id },
          attributes: ['userId']
        });
        const participantUserIds = participants.map(p => p.userId);

        requestFilter[Op.or] = [
          { fromId: me.id, toId: { [Op.in]: participantUserIds } },
          { toId: me.id, fromId: { [Op.in]: participantUserIds } }
        ];
      }
    }

    const accepted = await ChatRequest.findAll({
      where: requestFilter,
      include: [
        { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'username', 'telegramId', 'avatarUrl'] },
        { model: User, as: 'recipient', attributes: ['id', 'firstName', 'lastName', 'username', 'telegramId', 'avatarUrl'] },
        { model: Conference, as: 'conference', attributes: ['id', 'title', 'conferenceCode'] }
      ],
      order: [['updatedAt', 'DESC']]
    });

    const chats = await Promise.all(accepted.map(async (req) => {
      const other = req.fromId === me.id ? req.recipient : req.sender;

      // Get last message
      const lastMsg = await Message.findOne({
        where: {
          conferenceId: req.conferenceId,
          [Op.or]: [
            { fromId: me.id, toId: other.id },
            { fromId: other.id, toId: me.id },
          ]
        },
        order: [['createdAt', 'DESC']]
      });

      const unreadCount = await Message.count({
        where: {
          fromId: other.id,
          toId: me.id,
          conferenceId: req.conferenceId,
          isRead: false,
        }
      });

      return {
        chatRequestId: req.id,
        conferenceCode: req.conference ? req.conference.conferenceCode : null,
        conferenceName: req.conference ? req.conference.title : 'Прямой чат',
        other: {
          id: other.telegramId,
          name: `${other.firstName} ${other.lastName || ''}`.trim(),
          username: other.username,
          avatarUrl: other.avatarUrl,
        },
        lastMessage: lastMsg ? { text: lastMsg.text, time: lastMsg.createdAt } : null,
        // Legacy support mapping for some components
        lastText: lastMsg ? lastMsg.text : null,
        lastMessageAt: lastMsg ? lastMsg.createdAt : null,
        unreadCount,
      };
    }));

    res.json({ chats });
  } catch (err) {
    console.error('Get chats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /chat/messages?withTelegramId=X&conferenceCode=Y
 * Returns all messages between me and another user in a conference.
 */
router.get('/messages', authMiddleware, async (req, res) => {
  const { withTelegramId, conferenceCode } = req.query;
  if (!withTelegramId) {
    return res.status(400).json({ error: 'withTelegramId is required' });
  }

  try {
    const me = await User.findByPk(req.user.id);
    const them = await User.findOne({ where: { telegramId: String(withTelegramId) } });
    if (!them) return res.status(404).json({ error: 'User not found' });

    let conf = null;
    if (conferenceCode && conferenceCode !== 'undefined' && conferenceCode !== 'null') {
      conf = await Conference.findOne({ where: { conferenceCode: conferenceCode.toUpperCase() } });
      if (!conf) return res.status(404).json({ error: 'Conference not found' });
    }

    // Ensure they have an accepted chat request (either globally, for this conference, or in any other context)
    const session = await ChatRequest.findOne({
      where: {
        status: 'accepted',
        [Op.or]: [
          { fromId: me.id, toId: them.id },
          { fromId: them.id, toId: me.id },
        ]
      }
    });

    if (!session) return res.status(403).json({ error: 'No active chat session' });

    const targetConferenceId = conf ? conf.id : session.conferenceId;

    const messages = await Message.findAll({
      where: {
        conferenceId: targetConferenceId,
        [Op.or]: [
          { fromId: me.id, toId: them.id },
          { fromId: them.id, toId: me.id },
        ]
      },
      order: [['createdAt', 'ASC']],
      limit: 200
    });

    // Mark messages as read
    await Message.update(
      { isRead: true },
      { 
        where: { 
          fromId: them.id, 
          toId: me.id, 
          conferenceId: targetConferenceId, 
          isRead: false 
        } 
      }
    );

    const mapped = messages.map(m => ({
      id: m.id,
      text: m.text,
      fromSelf: m.fromId === me.id,
      time: m.createdAt,
    }));

    res.json({ messages: mapped });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /chat/message
 * Body: { toTelegramId, conferenceCode, text }
 */
router.post('/message', authMiddleware, async (req, res) => {
  const { toTelegramId, conferenceCode, text } = req.body;
  if (!toTelegramId || !text?.trim()) {
    return res.status(400).json({ error: 'toTelegramId and text are required' });
  }

  try {
    const me = await User.findByPk(req.user.id);
    const them = await User.findOne({ where: { telegramId: String(toTelegramId) } });
    if (!them) return res.status(404).json({ error: 'Recipient not found' });

    let conf = null;
    if (conferenceCode && conferenceCode !== 'undefined' && conferenceCode !== 'null') {
      conf = await Conference.findOne({ where: { conferenceCode: conferenceCode.toUpperCase() } });
      if (!conf) return res.status(404).json({ error: 'Conference not found' });
    }

    // Verify accepted chat session (either globally, for this conference, or in any other context)
    const session = await ChatRequest.findOne({
      where: {
        status: 'accepted',
        [Op.or]: [
          { fromId: me.id, toId: them.id },
          { fromId: them.id, toId: me.id },
        ]
      }
    });

    if (!session) return res.status(403).json({ error: 'No active chat session' });

    const targetConferenceId = conf ? conf.id : session.conferenceId;

    const message = await Message.create({
      conferenceId: targetConferenceId,
      fromId: me.id,
      toId: them.id,
      text: text.trim(),
    });

    // REAL-TIME: Emit to recipient
    let finalConferenceCode = null;
    if (targetConferenceId) {
      const msgConf = await Conference.findByPk(targetConferenceId);
      finalConferenceCode = msgConf ? msgConf.conferenceCode : null;
    }

    emitToUser(them.telegramId, 'new_message', {
      id: message.id,
      fromTelegramId: me.telegramId,
      senderName: `${me.firstName} ${me.lastName || ''}`.trim(),
      conferenceCode: finalConferenceCode,
      text: message.text,
      time: message.createdAt,
      fromSelf: false,
    });

    res.status(201).json({ success: true, message: { id: message.id, time: message.createdAt } });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
