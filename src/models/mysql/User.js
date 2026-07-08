const { DataTypes } = require('sequelize');
const { sequelize } = require('../../lib/sequelize');
const { encrypt, decrypt, generateBlindIndex } = require('../../lib/crypto-helper');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  telegramId: {
    type: DataTypes.BIGINT, // Use BIGINT for Telegram IDs
    allowNull: true, // Allow null for website email-registered users
    field: 'telegram_id',
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'first_name',
    get() {
      const val = this.getDataValue('firstName');
      return val ? decrypt(val) : val;
    },
    set(val) {
      this.setDataValue('firstName', val ? encrypt(val) : val);
    }
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'last_name',
    get() {
      const val = this.getDataValue('lastName');
      return val ? decrypt(val) : val;
    },
    set(val) {
      this.setDataValue('lastName', val ? encrypt(val) : val);
    }
  },
  globalRole: {
    type: DataTypes.ENUM('main_admin', 'conference_admin', 'user'),
    defaultValue: 'user',
    field: 'global_role',
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'password_hash',
  },
  passwordSalt: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'password_salt',
  },
  emailHash: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'email_hash',
  },
  allowConferenceCreation: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'allow_conference_creation',
  },
  allowBulkNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'allow_bulk_notifications',
  },
  // Global profile fields (Consolidated from TWA backend)
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  about: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  lookingFor: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'looking_for',
  },
  company: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  position: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  region: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    get() {
      const val = this.getDataValue('email');
      return val ? decrypt(val) : val;
    },
    set(val) {
      if (val) {
        this.setDataValue('email', encrypt(val));
        this.setDataValue('emailHash', generateBlindIndex(val));
      } else {
        this.setDataValue('email', null);
        this.setDataValue('emailHash', null);
      }
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    get() {
      const val = this.getDataValue('phone');
      return val ? decrypt(val) : val;
    },
    set(val) {
      this.setDataValue('phone', val ? encrypt(val) : val);
    }
  },
  telegram: {
    type: DataTypes.STRING,
    allowNull: true,
    get() {
      const val = this.getDataValue('telegram');
      return val ? decrypt(val) : val;
    },
    set(val) {
      this.setDataValue('telegram', val ? encrypt(val) : val);
    }
  },
  whatsapp: {
    type: DataTypes.STRING,
    allowNull: true,
    get() {
      const val = this.getDataValue('whatsapp');
      return val ? decrypt(val) : val;
    },
    set(val) {
      this.setDataValue('whatsapp', val ? encrypt(val) : val);
    }
  },
  interests: {
    type: DataTypes.JSON, // Store as JSON array in MySQL
    allowNull: true,
    defaultValue: [],
  },
  avatarUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'avatar_url',
  },
  onboardingCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'onboarding_completed',
  },
  hasPaidAccess: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'has_paid_access',
  },
  paidAccessUntil: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'paid_access_until',
  },
  isBlocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_blocked',
  },
  rating: {
    type: DataTypes.FLOAT,
    defaultValue: 5.0,
    field: 'rating',
  },
  isProfilePublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_profile_public',
  },
});

module.exports = { User };
