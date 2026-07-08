const { DataTypes } = require('sequelize');
const { sequelize } = require('../../lib/sequelize');

const Participant = sequelize.define('Participant', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
  },
  conferenceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'conference_id',
  },
  displayName: {
    type: DataTypes.STRING,
    field: 'display_name',
  },
  role: {
    type: DataTypes.STRING,
  },
  company: {
    type: DataTypes.STRING,
  },
  bio: {
    type: DataTypes.TEXT,
  },
  interests: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  avatarUrl: {
    type: DataTypes.STRING,
    field: 'avatar_url',
  },
  isVisible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_visible',
  },
  ticketCode: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'ticket_code',
  },
}, {
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'conference_id'],
    },
  ],
});

module.exports = { Participant };
