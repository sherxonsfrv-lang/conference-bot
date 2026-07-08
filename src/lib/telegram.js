const { Telegraf } = require('telegraf');

/**
 * Shared Telegraf instance for API calls (non-interactive)
 */
let bot;

function getBot() {
  if (!bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN_MISSING');
    }
    bot = new Telegraf(token);
  }
  return bot;
}

/**
 * Get the direct download link for a user's latest profile photo
 */
async function getLatestPhotoLink(telegramId) {
  const telegram = getBot().telegram;
  
  try {
    const photos = await telegram.getUserProfilePhotos(telegramId, 0, 1);
    
    if (!photos || photos.total_count === 0) {
      return null;
    }
    
    // Get the largest version of the latest photo
    const latestPhoto = photos.photos[0];
    const fileId = latestPhoto[latestPhoto.length - 1].file_id;
    
    const file = await telegram.getFile(fileId);
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    return `https://api.telegram.org/file/bot${token}/${file.file_path}`;
  } catch (err) {
    console.error(`[TELEGRAM LIB] Error fetching photo for ${telegramId}:`, err.message);
    return null;
  }
}

module.exports = {
  getBot,
  getLatestPhotoLink,
};
