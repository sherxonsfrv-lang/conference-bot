/**
 * Environment variable validation
 * Ensures all required environment variables are set before application starts
 */

function validateEnvironment() {
  const errors = [];
  const warnings = [];

  // Required variables
  const required = {
    TELEGRAM_BOT_TOKEN: 'Telegram bot token from @BotFather',
    DB_HOST: 'MySQL database host',
    DB_USER: 'MySQL database user',
    DB_PASSWORD: 'MySQL database password',
    DB_NAME: 'MySQL database name',
    SECOND_SCREEN_API_KEY: 'API key for second screen protection',
    DB_ENCRYPTION_KEY: 'Encryption key for sensitive user fields (min 32 bytes)',
    JWT_SECRET: 'Secret key for signing TWA user JWT tokens',
  };

  // Check required variables
  for (const [key, description] of Object.entries(required)) {
    if (!process.env[key]) {
      errors.push(`Missing required environment variable: ${key} (${description})`);
    } else if (process.env[key].includes('your-') || process.env[key].includes('here')) {
      warnings.push(`Environment variable ${key} appears to be a placeholder. Please set a real value.`);
    }
  }

  // Check MAIN_ADMIN_TELEGRAM_IDS (optional but recommended)
  if (!process.env.MAIN_ADMIN_TELEGRAM_IDS) {
    warnings.push('MAIN_ADMIN_TELEGRAM_IDS is not set. No users will have main admin privileges.');
  }

  // Validate NODE_ENV
  const validEnvs = ['development', 'staging', 'production'];
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (!validEnvs.includes(nodeEnv)) {
    warnings.push(`NODE_ENV="${nodeEnv}" is not one of: ${validEnvs.join(', ')}. Defaulting to "development".`);
  }

  // Validate SECOND_SCREEN_API_KEY strength (if set)
  if (process.env.SECOND_SCREEN_API_KEY) {
    const key = process.env.SECOND_SCREEN_API_KEY;
    if (key.length < 16) {
      warnings.push('SECOND_SCREEN_API_KEY is too short. Consider using at least 32 characters for better security.');
    }
  }

  // Display warnings
  if (warnings.length > 0) {
    console.warn('\n⚠️  Environment Configuration Warnings:');
    warnings.forEach((warning) => console.warn(`   - ${warning}`));
    console.warn('');
  }

  // Display errors and exit if any
  if (errors.length > 0) {
    console.error('\n❌ Environment Configuration Errors:');
    errors.forEach((error) => console.error(`   - ${error}`));
    console.error('\n💡 Please create a .env file based on .env.example and fill in all required values.\n');
    process.exit(1);
  }

  // Success message
  if (process.env.NODE_ENV === 'production') {
    console.log('✅ Environment validation passed (production mode)');
  } else {
    console.log(`✅ Environment validation passed (${nodeEnv} mode)`);
  }
}

module.exports = {
  validateEnvironment,
};
