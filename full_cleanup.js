const { sequelize } = require('./twa-backend/src/lib/sequelize');

/**
 * TOTAL DATABASE RESET
 * Drops all tables to resolve ER_TOO_MANY_KEYS and foreign key conflicts.
 * After running this, both services will recreate the schema cleanly.
 */
async function totalCleanup() {
  try {
    console.log('⏳ Connecting to shared database...');
    await sequelize.authenticate();
    
    console.log('⚠️ DROPPING ALL TABLES...');
    
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Get all tables
    const [tables] = await sequelize.query("SHOW TABLES");
    const tableKey = Object.keys(tables[0])[0];
    
    for (const tableRow of tables) {
      const tableName = tableRow[tableKey];
      console.log(`- Dropping ${tableName}...`);
      await sequelize.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    }
    
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('✅ All tables dropped successfully.');
    console.log('🚀 Start the bot and the backend now to recreate the clean schema.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Reset failed:', err);
    process.exit(1);
  }
}

totalCleanup();
