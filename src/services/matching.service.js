const { Conference, Participant, User } = require('../models/mysql');
const { Op } = require('sequelize');

async function searchProfiles({ conferenceCode, role, text, limit = 20 }) {
  const conference = await Conference.findOne({
    where: { conferenceCode },
    attributes: ['id', 'conferenceCode', 'title']
  });

  if (!conference) throw new Error('CONFERENCE_NOT_FOUND');

  const whereClause = {
    conferenceId: conference.id,
    isVisible: true,
  };

  if (role) {
    whereClause.role = role;
  }

  // Find participants and include their global User profile for text search
  const participants = await Participant.findAll({
    where: whereClause,
    include: [{ model: User, as: 'user' }],
    limit: limit
  });

  if (text && text.trim()) {
    const t = text.trim().toLowerCase();
    const filtered = participants.filter((p) => {
      const u = p.user || {};
      const fields = [
        p.displayName,
        p.bio,
        ...(p.interests || []),
        u.firstName,
        u.lastName,
        u.company,
        u.position,
        u.bio,
        u.lookingFor,
        ...(u.interests || [])
      ].filter(Boolean);
      
      return fields.some((val) => String(val).toLowerCase().includes(t));
    });
    return { conference, profiles: filtered };
  }

  return { conference, profiles: participants };
}

module.exports = {
  searchProfiles,
};
