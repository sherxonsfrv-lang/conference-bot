const { User, Participant } = require('../models/mysql');
const { validate, userProfileSchema } = require('../lib/validation');

/**
 * Upsert global user profile data (independent of conferences).
 * Used by onboarding flow to persist validated profile info.
 */
async function upsertGlobalProfile({ telegramId, data }) {
  if (!telegramId) {
    throw new Error('MISSING_TELEGRAM_ID');
  }

  // Validate only known fields via Joi
  const validated = validate(data, userProfileSchema);

  let user = await User.findOne({ where: { telegramId: String(telegramId) } });

  if (!user) {
    user = await User.create({
      telegramId: String(telegramId),
      ...validated,
      onboardingCompleted: true,
    });
  } else {
    await user.update({
      ...validated,
      onboardingCompleted: true,
    });
  }

  // Clear onboarding state after successful completion
  const { clearOnboardingState } = require('./onboarding.service');
  try {
    await clearOnboardingState(telegramId);
  } catch (err) {
    // Ignore errors if state doesn't exist
    console.warn('Could not clear onboarding state:', err.message);
  }

  return user;
}

/**
 * Get global user profile
 */
async function getGlobalProfile(telegramId) {
  return await User.findOne({ where: { telegramId: String(telegramId) } });
}

/**
 * Update specific fields in global profile
 */
async function updateGlobalProfile(telegramId, updates) {
  const user = await getGlobalProfile(telegramId);
  
  if (!user) {
    throw new Error('PROFILE_NOT_FOUND');
  }
  
  // Filter out role-related updates to prevent self-assignment (P0.4)
  const safeUpdates = { ...updates };
  delete safeUpdates.role;
  delete safeUpdates.globalRole;
  
  // Validate updates if needed
  if (safeUpdates.firstName || safeUpdates.lastName) {
    const { validate, userProfileSchema } = require('../lib/validation');
    validate({ firstName: safeUpdates.firstName || user.firstName, lastName: safeUpdates.lastName || user.lastName }, userProfileSchema);
  }
  
  if (safeUpdates.interests) {
    const { validate, userProfileSchema } = require('../lib/validation');
    validate({ interests: safeUpdates.interests }, userProfileSchema);
  }
  
  // Update fields
  await user.update(safeUpdates);
  
  return user;
}

/**
 * Copy global profile data to conference-specific profile when user joins a conference.
 */
async function copyGlobalProfileToConference({ telegramId, conferenceId }) {
  const user = await getGlobalProfile(telegramId);
  
  if (!user) {
    return null; // No global profile to copy
  }

  let participant = await Participant.findOne({
    where: {
      userId: user.id,
      conferenceId: conferenceId,
    }
  });

  const participantData = {
    userId: user.id,
    conferenceId: conferenceId,
    displayName: `${user.firstName} ${user.lastName || ''}`.trim(),
    avatarUrl: user.avatarUrl,
    interests: user.interests || [],
    bio: user.bio,
    isVisible: true,
  };

  if (!participant) {
    participant = await Participant.create(participantData);
  } else {
    await participant.update(participantData);
  }

  return participant;
}

/**
 * Upsert user profile data for a given conference.
 * @deprecated Use upsertGlobalProfile instead.
 */
async function upsertProfileForConference({ telegramId, conferenceId, data }) {
  // For backward compatibility, we update both Global and Participant
  const user = await upsertGlobalProfile({ telegramId, data });
  const participant = await copyGlobalProfileToConference({ telegramId, conferenceId });
  return participant;
}

module.exports = {
  upsertGlobalProfile,
  getGlobalProfile,
  updateGlobalProfile,
  copyGlobalProfileToConference,
  upsertProfileForConference,
};


