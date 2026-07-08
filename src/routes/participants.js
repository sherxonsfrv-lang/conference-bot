const express = require('express');
const router = express.Router();
const { User, Participant, Conference, ChatRequest } = require('../models/mysql');
const { authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');

/**
 * GET /participants?conferenceCode=X
 * Returns participants for the conference with access-based filtering.
 */
router.get('/', authMiddleware, async (req, res) => {
  const { conferenceCode } = req.query;
  if (!conferenceCode) return res.status(400).json({ error: 'conferenceCode is required' });

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const conf = await Conference.findOne({ where: { conferenceCode: conferenceCode.toUpperCase() } });
    if (!conf) return res.status(404).json({ error: 'Conference not found' });

    // Replicate getAccessPhase logic
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

    const isRestricted = accessPhase === 'payment_required';

    // Get chat requests to determine connection status immediately
    const requests = await ChatRequest.findAll({
      where: {
        [Op.or]: [{ fromId: user.id }, { toId: user.id }]
      }
    });

    const statusMap = {};
    for (const r of requests) {
      const targetId = r.fromId === user.id ? r.toId : r.fromId;
      if (!statusMap[targetId] || statusMap[targetId] !== 'accepted') {
        statusMap[targetId] = r.status;
      }
    }

    const participants = await Participant.findAll({
      where: { conferenceId: conf.id, isVisible: true },
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'username', 'interests', 'avatarUrl', 'telegramId'] }]
    });

    const mapped = participants.map(p => {
      const u = p.user;
      if (isRestricted) {
        // Mask names and hide contact info
        return {
          id: p.id,
          displayName: u?.firstName ? `${u.firstName} ***` : 'Участник ***',
          role: p.role,
          isRestricted: true,
        };
      }
      const chatStatus = u ? (statusMap[u.id] || null) : null;
      return {
        id: p.id,
        userId: u?.telegramId,
        displayName: p.displayName || `${u?.firstName || ''} ${u?.lastName || ''}`.trim(),
        role: p.role,
        company: p.company,
        bio: p.bio,
        interests: p.interests?.length ? p.interests : u?.interests,
        avatarUrl: p.avatarUrl || u?.avatarUrl,
        isRestricted: false,
        chatStatus,
      };
    });

    res.json({ participants: mapped, accessPhase });
  } catch (err) {
    console.error('Get participants error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /participants/:id
 * Updates participant role and interests. Authorized for organizer or main admin.
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, company, bio, interests } = req.body;

    const participant = await Participant.findByPk(id);
    if (!participant) return res.status(404).json({ error: 'Participant not found' });

    // Check authorization: must be system admin or organizer of this conference
    const isSystemAdmin = req.user.globalRole === 'main_admin';
    const isOrganizer = await Participant.findOne({
      where: { userId: req.user.id, conferenceId: participant.conferenceId, role: 'organizer' }
    });

    if (!isSystemAdmin && !isOrganizer) {
      return res.status(403).json({ error: 'Access denied. Only organizers can modify participants.' });
    }

    const updates = {};
    if (role !== undefined) updates.role = role;
    if (company !== undefined) updates.company = company;
    if (bio !== undefined) updates.bio = bio;
    if (interests !== undefined) updates.interests = interests;

    await participant.update(updates);
    res.json({ success: true, participant });
  } catch (err) {
    console.error('Update participant error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
