const { OnboardingState, User, Participant } = require('../models/mysql');

async function getOnboardingState(telegramId) {
  return await OnboardingState.findOne({ where: { telegramId: String(telegramId) } });
}

async function createOnboardingState(telegramId) {
  return await OnboardingState.create({
    telegramId: String(telegramId),
    step: 1,
    data: {},
  });
}

async function updateOnboardingState(telegramId, updates) {
  const state = await getOnboardingState(telegramId);
  if (!state) throw new Error('ONBOARDING_STATE_NOT_FOUND');
  
  const updateData = {};
  if (updates.step !== undefined) updateData.step = updates.step;
  if (updates.data !== undefined) updateData.data = { ...state.data, ...updates.data };
  if (updates.completedAt !== undefined) updateData.completedAt = updates.completedAt;
  
  await state.update(updateData);
  return state;
}

async function clearOnboardingState(telegramId) {
  await OnboardingState.destroy({ where: { telegramId: String(telegramId) } });
}

async function getOnboardingStatistics({ conferenceId = null } = {}) {
  const totalStarted = await OnboardingState.count();
  const totalCompleted = await User.count({ where: { onboardingCompleted: true } });
  const totalUsers = await User.count();
  
  return {
    totalStarted,
    totalCompleted,
    totalParticipants: totalUsers, // Approximation
    completionRate: totalUsers > 0 ? Math.round((totalCompleted / totalUsers) * 100) : 0,
    stepDistribution: {}, // Simplified
    conferenceId,
  };
}

function formatOnboardingStatistics(stats) {
  return [
    '📊 Статистика онбординга',
    `Начали: ${stats.totalStarted}`,
    `Завершили: ${stats.totalCompleted}`,
    `Процент завершения: ${stats.completionRate}%`
  ].join('\n');
}

module.exports = {
  getOnboardingState,
  createOnboardingState,
  updateOnboardingState,
  clearOnboardingState,
  getOnboardingStatistics,
  formatOnboardingStatistics,
};
