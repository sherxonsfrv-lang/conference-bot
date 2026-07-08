const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'social_connection_bot',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: true, // Use snake_case for fields in DB
    },
  }
);

async function connectMySQL() {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL connection has been established successfully.');
    // In dev, we can sync models, but in production we should use migrations
    if (process.env.NODE_ENV === 'development') {
      // DISABLED alter: true because it was causing ER_TOO_MANY_KEYS loop in MySQL
      await sequelize.sync({ alter: false });
      
      // Ensure all missing/new columns exist in the database
      try {
        const [pCols] = await sequelize.query("SHOW COLUMNS FROM participants LIKE 'ticket_code'");
        if (pCols.length === 0) {
          await sequelize.query("ALTER TABLE participants ADD COLUMN ticket_code VARCHAR(255) NULL");
          console.log('✅ Created ticket_code column in participants table.');
        }

        const [pollsCols] = await sequelize.query("SHOW COLUMNS FROM polls LIKE 'total_votes'");
        if (pollsCols.length === 0) {
          await sequelize.query("ALTER TABLE polls ADD COLUMN total_votes INT DEFAULT 0");
          console.log('✅ Created total_votes column in polls table.');
        }

        const [optCols] = await sequelize.query("SHOW COLUMNS FROM poll_options LIKE 'votes_count'");
        if (optCols.length === 0) {
          await sequelize.query("ALTER TABLE poll_options ADD COLUMN votes_count INT DEFAULT 0");
          console.log('✅ Created votes_count column in poll_options table.');
        }

        const [qUpvotesCols] = await sequelize.query("SHOW COLUMNS FROM questions LIKE 'upvotes_count'");
        if (qUpvotesCols.length === 0) {
          await sequelize.query("ALTER TABLE questions ADD COLUMN upvotes_count INT DEFAULT 0");
          console.log('✅ Created upvotes_count column in questions table.');
        }

        const [qAnsweredCols] = await sequelize.query("SHOW COLUMNS FROM questions LIKE 'is_answered'");
        if (qAnsweredCols.length === 0) {
          await sequelize.query("ALTER TABLE questions ADD COLUMN is_answered TINYINT(1) DEFAULT 0");
          console.log('✅ Created is_answered column in questions table.');
        }

        const [qApprovedCols] = await sequelize.query("SHOW COLUMNS FROM questions LIKE 'is_approved'");
        if (qApprovedCols.length === 0) {
          await sequelize.query("ALTER TABLE questions ADD COLUMN is_approved TINYINT(1) DEFAULT 0");
          console.log('✅ Created is_approved column in questions table.');
        }
      } catch (columnErr) {
        console.warn('⚠️ Could not check/create database columns:', columnErr.message);
      }

      console.log('✅ MySQL models synchronized (Stable mode).');
    }
  } catch (error) {
    console.error('❌ Unable to connect to the MySQL database:', error);
    process.exit(1);
  }
}

module.exports = {
  sequelize,
  connectMySQL,
};
