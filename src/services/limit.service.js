const { User, Conference, Participant, Poll, Question, Meeting, TariffPlan, Subscription } = require('../models/mysql');
const { Op } = require('sequelize');

/**
 * Get active subscription for a user
 */
async function getUserSubscription(userId) {
  const subscription = await Subscription.findOne({
    where: {
      userId,
      status: ['active', 'trial'],
      [Op.or]: [
        { endsAt: null },
        { endsAt: { [Op.gte]: new Date() } },
      ],
    },
    include: [{ model: TariffPlan, as: 'tariffPlan' }]
  });

  if (!subscription) {
    const defaultPlan = await TariffPlan.findOne({ where: { isDefault: true, isActive: true } });
    if (defaultPlan) {
      return {
        tariffPlan: defaultPlan,
        status: 'active',
        isDefault: true,
      };
    }
    return null;
  }

  return subscription;
}

/**
 * Get active subscription for a conference
 */
async function getConferenceSubscription(conferenceId) {
  const subscription = await Subscription.findOne({
    where: {
      conferenceId,
      status: ['active', 'trial'],
      [Op.or]: [
        { endsAt: null },
        { endsAt: { [Op.gte]: new Date() } },
      ],
    },
    include: [{ model: TariffPlan, as: 'tariffPlan' }]
  });

  if (!subscription) {
    const conference = await Conference.findByPk(conferenceId);
    if (conference && conference.organizerId) {
      return getUserSubscription(conference.organizerId);
    }
  }

  if (!subscription) {
    const defaultPlan = await TariffPlan.findOne({ where: { isDefault: true, isActive: true } });
    if (defaultPlan) {
      return {
        tariffPlan: defaultPlan,
        status: 'active',
        isDefault: true,
      };
    }
  }

  return subscription;
}

async function getLimits(userId = null, conferenceId = null) {
  let subscription = null;
  if (conferenceId) {
    subscription = await getConferenceSubscription(conferenceId);
  } else if (userId) {
    subscription = await getUserSubscription(userId);
  }

  if (!subscription || !subscription.tariffPlan) {
    return {
      maxConferences: 0,
      maxParticipantsPerConference: 0,
      maxPollsPerConference: 0,
      maxQuestionsPerConference: 0,
      maxMeetingsPerConference: 0,
      maxMeetingsPerUser: 0,
    };
  }

  return subscription.tariffPlan.limits;
}

async function checkLimit(limitName, userId = null, conferenceId = null, currentCount = 0) {
  const limits = await getLimits(userId, conferenceId);
  const limit = limits[limitName];
  if (limit === -1 || limit === undefined || limit === null) {
    return { allowed: true, limit: -1, current: currentCount };
  }
  const allowed = currentCount < limit;
  return { allowed, limit, current: currentCount };
}

async function canCreateQuestion(conferenceId) {
  const questionCount = await Question.count({ where: { conferenceId } });
  const result = await checkLimit('maxQuestionsPerConference', null, conferenceId, questionCount);
  return {
    allowed: result.allowed,
    limit: result.limit,
    current: result.current,
    reason: result.allowed ? null : 'LIMIT_EXCEEDED',
  };
}

async function ensureDefaultTariffPlans() {
  const defaultPlans = [
    {
      name: 'free',
      displayName: 'Free Plan',
      description: 'Basic plan for small conferences',
      pricePerMonth: 0,
      limits: {
        maxConferences: 1,
        maxParticipantsPerConference: 50,
        maxPollsPerConference: 10,
        maxQuestionsPerConference: 100,
        maxMeetingsPerConference: 50,
        maxMeetingsPerUser: 10,
        pollsEnabled: true,
      },
      isDefault: true,
      isActive: true,
    },
  ];

  for (const planData of defaultPlans) {
    await TariffPlan.upsert(planData);
  }

  console.log('✅ Default tariff plans ensured');
}

module.exports = {
  getUserSubscription,
  getConferenceSubscription,
  getLimits,
  checkLimit,
  canCreateQuestion,
  ensureDefaultTariffPlans,
};
