const { sequelize } = require('./src/lib/sequelize');

/**
 * RESET DATABASE TABLES
 * This script drops the tables that have reached the 64-index limit (ER_TOO_MANY_KEYS).
 * Since Sequelize sync(alter: true) was looping, these tables are now blocked.
 */
async function cleanup() {
  try {
    console.log('⏳ Connecting to database...');
    await sequelize.authenticate();
    
    console.log('⚠️ DROPPING BLOCKED TABLES...');
    
    // We drop these tables because they reached the 64-index limit.
    // Sequelize will recreate them cleanly on the next start.
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.query('DROP TABLE IF EXISTS meeting_chat_tokens');
    await sequelize.query('DROP TABLE IF EXISTS users');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('✅ Tables dropped successfully.');
    console.log('🚀 You can now run "npm run dev" to recreate them cleanly.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Cleanup failed:', err);
    process.exit(1);
  }
}

cleanup();
