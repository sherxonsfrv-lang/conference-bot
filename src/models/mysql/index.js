const { User } = require('./User');
const { Conference } = require('./Conference');
const { Participant } = require('./Participant');
const { 
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
} = require('./Entities');

// Associations
MeetingChatMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// User <-> Participant <-> Conference
User.hasMany(Participant, { foreignKey: 'userId' });
Participant.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Conference.hasMany(Participant, { foreignKey: 'conferenceId' });
Participant.belongsTo(Conference, { foreignKey: 'conferenceId', as: 'conference' });

// Conference <-> Organizer (User)
Conference.belongsTo(User, { foreignKey: 'organizerId', as: 'organizer' });
User.hasMany(Conference, { foreignKey: 'organizerId', as: 'organizedConferences' });

// Poll <-> Conference
Conference.hasMany(Poll, { foreignKey: 'conferenceId' });
Poll.belongsTo(Conference, { foreignKey: 'conferenceId', as: 'conference' });
User.hasMany(Poll, { foreignKey: 'creatorId' });
Poll.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });

// Poll <-> PollOption <-> PollVote
Poll.hasMany(PollOption, { foreignKey: 'pollId', as: 'options', onDelete: 'CASCADE' });
PollOption.belongsTo(Poll, { foreignKey: 'pollId' });

PollOption.hasMany(PollVote, { foreignKey: 'pollOptionId', as: 'votes', onDelete: 'CASCADE' });
PollVote.belongsTo(PollOption, { foreignKey: 'pollOptionId' });
User.hasMany(PollVote, { foreignKey: 'userId' });
PollVote.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Question <-> Conference/User/QuestionVote
Conference.hasMany(Question, { foreignKey: 'conferenceId' });
Question.belongsTo(Conference, { foreignKey: 'conferenceId', as: 'conference' });

User.hasMany(Question, { foreignKey: 'askedById' });
Question.belongsTo(User, { foreignKey: 'askedById', as: 'askedBy' });

Question.hasMany(QuestionVote, { foreignKey: 'questionId', as: 'votes', onDelete: 'CASCADE' });
QuestionVote.belongsTo(Question, { foreignKey: 'questionId' });
User.hasMany(QuestionVote, { foreignKey: 'userId' });
QuestionVote.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Message <-> User/Conference
User.hasMany(Message, { foreignKey: 'fromId', as: 'sentMessages' });
User.hasMany(Message, { foreignKey: 'toId', as: 'receivedMessages' });
Message.belongsTo(User, { foreignKey: 'fromId', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'toId', as: 'recipient' });
Message.belongsTo(Conference, { foreignKey: 'conferenceId' });

// Notification <-> User
User.hasMany(Notification, { foreignKey: 'userId' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Subscription <-> TariffPlan <-> User/Conference
Subscription.belongsTo(TariffPlan, { foreignKey: 'tariffPlanId', as: 'tariffPlan' });
TariffPlan.hasMany(Subscription, { foreignKey: 'tariffPlanId' });

Subscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Subscription, { foreignKey: 'userId' });

Subscription.belongsTo(Conference, { foreignKey: 'conferenceId', as: 'conference' });
Conference.hasMany(Subscription, { foreignKey: 'conferenceId' });

// Meeting <-> Conference/Users
Meeting.belongsTo(Conference, { foreignKey: 'conferenceId' });
Meeting.belongsTo(User, { foreignKey: 'requesterId', as: 'requester' });
Meeting.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });

// Chat Requests
User.hasMany(ChatRequest, { foreignKey: 'fromId', as: 'sentRequests' });
User.hasMany(ChatRequest, { foreignKey: 'toId', as: 'receivedRequests' });
ChatRequest.belongsTo(User, { foreignKey: 'fromId', as: 'sender' });
ChatRequest.belongsTo(User, { foreignKey: 'toId', as: 'recipient' });
Conference.hasMany(ChatRequest, { foreignKey: 'conferenceId' });
ChatRequest.belongsTo(Conference, { foreignKey: 'conferenceId', as: 'conference' });

// Payments
User.hasMany(Payment, { foreignKey: 'userId' });
Payment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Conference.hasMany(Payment, { foreignKey: 'conferenceId' });
Payment.belongsTo(Conference, { foreignKey: 'conferenceId', as: 'conference' });

module.exports = {
  User,
  Conference,
  Participant,
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
