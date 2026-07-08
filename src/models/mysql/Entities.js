const { DataTypes } = require('sequelize');
const { sequelize } = require('../../lib/sequelize');
const { encrypt, decrypt } = require('../../lib/crypto-helper');


const Poll = sequelize.define('Poll', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  conferenceId: {
    type: DataTypes.INTEGER,
    field: 'conference_id',
  },
  creatorId: {
    type: DataTypes.INTEGER,
    field: 'creator_id',
  },
  question: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
  totalVotes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_votes',
  },
  endsAt: { type: DataTypes.DATE, field: 'ends_at' },
});

const PollOption = sequelize.define('PollOption', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  pollId: {
    type: DataTypes.INTEGER,
    field: 'poll_id',
  },
  text: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  votesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'votes_count',
  },
});

const Question = sequelize.define('Question', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  conferenceId: {
    type: DataTypes.INTEGER,
    field: 'conference_id',
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  upvotesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'upvotes_count',
  },
  isAnswered: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_answered',
  },
  isApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_approved',
  },
  askedById: { type: DataTypes.INTEGER, allowNull: true, field: 'asked_by_id' },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
});

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  fromId: {
    type: DataTypes.INTEGER,
    field: 'from_id',
  },
  toId: {
    type: DataTypes.INTEGER,
    field: 'to_id',
  },
  conferenceId: {
    type: DataTypes.INTEGER,
    field: 'conference_id',
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
    get() {
      const val = this.getDataValue('text');
      return val ? decrypt(val) : val;
    },
    set(val) {
      this.setDataValue('text', val ? encrypt(val) : val);
    }
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_read',
  },
});

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    field: 'user_id',
  },
  type: { 
    type: DataTypes.ENUM('chat_request', 'request_accepted', 'request_rejected', 'new_message', 'poll_started', 'conference_ending', 'system_notification'),
    allowNull: false 
  },
  title: { type: DataTypes.STRING },
  body: { type: DataTypes.TEXT },
  data: { type: DataTypes.JSON, defaultValue: {} },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_read',
  },
});

const TariffPlan = sequelize.define('TariffPlan', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, unique: true, allowNull: false },
  displayName: { type: DataTypes.STRING, field: 'display_name' },
  description: { type: DataTypes.TEXT },
  pricePerMonth: { type: DataTypes.INTEGER, defaultValue: 0, field: 'price_per_month' },
  limits: { type: DataTypes.JSON, defaultValue: {} },
  isDefault: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_default' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
});

const Subscription = sequelize.define('Subscription', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, field: 'user_id' },
  conferenceId: { type: DataTypes.INTEGER, field: 'conference_id' },
  tariffPlanId: { type: DataTypes.INTEGER, field: 'tariff_plan_id' },
  status: { type: DataTypes.ENUM('active', 'trial', 'expired', 'cancelled'), defaultValue: 'active' },
  startsAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'starts_at' },
  endsAt: { type: DataTypes.DATE, allowNull: true, field: 'ends_at' },
});

const Meeting = sequelize.define('Meeting', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  conferenceId: { type: DataTypes.INTEGER, field: 'conference_id' },
  requesterId: { type: DataTypes.INTEGER, field: 'requester_id' },
  recipientId: { type: DataTypes.INTEGER, field: 'recipient_id' },
  status: { type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'cancelled', 'completed'), defaultValue: 'pending' },
  proposedTime: { type: DataTypes.DATE, field: 'proposed_time' },
  durationMinutes: { type: DataTypes.INTEGER, defaultValue: 30, field: 'duration_minutes' },
  message: { type: DataTypes.TEXT },
  location: { type: DataTypes.STRING },
});

const OnboardingState = sequelize.define('OnboardingState', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  telegramId: { type: DataTypes.STRING, unique: true, allowNull: false, field: 'telegram_id' },
  step: { type: DataTypes.INTEGER, defaultValue: 1 },
  data: { type: DataTypes.JSON, defaultValue: {} },
  completedAt: { type: DataTypes.DATE, allowNull: true, field: 'completed_at' },
  startedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'started_at' },
});

const MeetingChatMessage = sequelize.define('MeetingChatMessage', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  meetingId: { type: DataTypes.INTEGER, field: 'meeting_id' },
  senderId: { type: DataTypes.INTEGER, field: 'sender_id' },
  text: { 
    type: DataTypes.TEXT, 
    allowNull: false,
    get() {
      const val = this.getDataValue('text');
      return val ? decrypt(val) : val;
    },
    set(val) {
      this.setDataValue('text', val ? encrypt(val) : val);
    }
  },
});

const MeetingChatToken = sequelize.define('MeetingChatToken', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  meetingId: { type: DataTypes.INTEGER, field: 'meeting_id' },
  token: { type: DataTypes.STRING, unique: true, allowNull: false },
  expiresAt: { type: DataTypes.DATE, field: 'expires_at' },
});
const TempLoginToken = sequelize.define('TempLoginToken', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  token: { type: DataTypes.STRING, unique: true, allowNull: false },
  telegramId: { type: DataTypes.BIGINT, allowNull: true, field: 'telegram_id' },
  userId: { type: DataTypes.INTEGER, allowNull: true, field: 'user_id' },
  status: { type: DataTypes.ENUM('pending', 'completed', 'expired'), defaultValue: 'pending' },
  expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
});

const PollVote = sequelize.define('PollVote', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  pollOptionId: { type: DataTypes.INTEGER, allowNull: false, field: 'poll_option_id' },
  userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
});

const QuestionVote = sequelize.define('QuestionVote', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  questionId: { type: DataTypes.INTEGER, allowNull: false, field: 'question_id' },
  userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
});

const ChatRequest = sequelize.define('ChatRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  conferenceId: { type: DataTypes.INTEGER, allowNull: true, field: 'conference_id' },
  fromId: { type: DataTypes.INTEGER, allowNull: false, field: 'from_id' },
  toId: { type: DataTypes.INTEGER, allowNull: false, field: 'to_id' },
  message: { type: DataTypes.STRING(300) },
  status: { type: DataTypes.ENUM('pending', 'accepted', 'rejected'), defaultValue: 'pending' },
});

const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
  conferenceId: { type: DataTypes.INTEGER, field: 'conference_id' },
  amount: { type: DataTypes.INTEGER, allowNull: false },
  currency: { type: DataTypes.STRING, defaultValue: 'RUB' },
  status: { type: DataTypes.ENUM('pending', 'succeeded', 'failed', 'cancelled'), defaultValue: 'pending' },
  providerOrderId: { type: DataTypes.STRING, field: 'provider_order_id' },
  providerPaymentUrl: { type: DataTypes.TEXT, field: 'provider_payment_url' },
  paidAt: { type: DataTypes.DATE, field: 'paid_at' },
});

const SystemSettings = sequelize.define('SystemSettings', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  allowConferenceCreationUsers: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'allow_conference_creation_users' },
  allowTelegramLogin: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'allow_telegram_login' },
  paidLimitsEnabled: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'paid_limits_enabled' },
  tariffPrice: { type: DataTypes.INTEGER, defaultValue: 249, field: 'tariff_price' }
}, {
  tableName: 'system_settings'
});

module.exports = { 
  Poll, 
  PollOption, 
  Question, 
  Message, 
  Notification, 
  TariffPlan, 
  Subscription, 
  Meeting,
  OnboardingState,
  MeetingChatMessage,
  MeetingChatToken,
  TempLoginToken,
  PollVote,
  QuestionVote,
  ChatRequest,
  Payment,
  SystemSettings
};
