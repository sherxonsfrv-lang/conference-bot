const { DataTypes } = require('sequelize');
const { sequelize } = require('../../lib/sequelize');

const Conference = sequelize.define('Conference', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  conferenceCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'conference_code',
  },
  access: {
    type: DataTypes.ENUM('public', 'private'),
    defaultValue: 'public',
  },
  startsAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'starts_at',
  },
  endsAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'ends_at',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
  isEnded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_ended',
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  coverImage: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'cover_image',
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  maxParticipants: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
    field: 'max_participants',
  },
  duration: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  repeat: {
    type: DataTypes.STRING,
    defaultValue: 'None',
  },
  day: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  gracePeriodHours: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    field: 'grace_period_hours',
  },
  organizerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'organizer_id',
  },
});

module.exports = { Conference };
