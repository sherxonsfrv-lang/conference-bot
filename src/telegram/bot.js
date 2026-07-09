const { Telegraf, Markup } = require('telegraf');
const { 
  ensureUserFromTelegram, 
  userIsMainAdmin 
} = require('../services/conference.service');
const {
  getUserRoles,
  getMainMenu,
  getWebAppUrl,
  getReplyKeyboard,
} = require('./menus');

/**
 * Minimal Telegram Bot Launcher
 * Stripped of all legacy logic and complex in-bot flows.
 */

let botInstance;

function initBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN is not set, Telegram bot will not start');
    return;
  }

  const bot = new Telegraf(token);
  botInstance = bot;

  // Global Middleware to block suspended users
  bot.use(async (ctx, next) => {
    try {
      if (ctx.from) {
        const user = await ensureUserFromTelegram(ctx.from);
        if (user && user.isBlocked) {
          if (ctx.callbackQuery) {
            await ctx.answerCbQuery('🚫 Доступ ограничен. Ваш аккаунт заблокирован.', { show_alert: true });
          } else {
            await ctx.reply('🚫 Ваш аккаунт заблокирован администратором системы.');
          }
          return;
        }
      }
    } catch (err) {
      console.error('[BOT MIDDLEWARE] Error verifying block status:', err.message);
    }
    await next();
  });

  // ========== START COMMAND ==========
  bot.start(async (ctx) => {
    try {
      const payload = ctx.payload;
      
      // Check for deep-linking one-time login token from the website
      if (payload && payload.startsWith('login_')) {
        const token = payload.substring(6);
        const { TempLoginToken } = require('../models/mysql');
        
        const tokenEntry = await TempLoginToken.findOne({ where: { token } });
        if (!tokenEntry || new Date() > tokenEntry.expiresAt) {
          return await ctx.reply('❌ Ссылка для авторизации недействительна или её срок действия истёк. Пожалуйста, запросите новую ссылку на сайте.');
        }

        // Register/update user
        const user = await ensureUserFromTelegram(ctx.from);
        
        // Mark token as completed
        await tokenEntry.update({
          telegramId: user.telegramId,
          userId: user.id,
          status: 'completed'
        });

        const websiteUrl = process.env.WEBSITE_URL || 'https://spiffy-melba-b84412.netlify.app/';
        const isLocal = websiteUrl.includes('localhost') || websiteUrl.includes('127.0.0.1');

        const successText = `🎉 Вы успешно авторизовались на сайте!\n\nВы вошли как ${user.firstName}.\n\nВернитесь к вкладке браузера или используйте ссылку ниже, чтобы перейти на сайт:`;

        if (isLocal) {
          await ctx.reply(`${successText}\n\n${websiteUrl}`);
        } else {
          try {
            await ctx.reply(successText, Markup.inlineKeyboard([
              [Markup.button.url('↗️ Перейти на сайт', websiteUrl)]
            ]));
          } catch (btnErr) {
            console.error('[BOT] Failed to send inline button URL, sending raw link instead:', btnErr.message);
            await ctx.reply(`${successText}\n\n${websiteUrl}`);
          }
        }
        return;
      }

      // Normal start without website token payload
      await ensureUserFromTelegram(ctx.from);
      
      const roles = await getUserRoles(ctx.from);

      let welcomeText = '👋 Добро пожаловать!\n\n';
      
      if (roles.isMainAdmin) {
        welcomeText += '👑 Вы администратор системы\n';
      }
      
      welcomeText += 'Используйте кнопку ниже для запуска приложения:';

      // Send the main launcher menu
      await ctx.reply(welcomeText, await getMainMenu(ctx.from));
      
      // Remove any leftover reply keyboards from previous versions
      await ctx.reply('🚀 Приложение готово к работе', Markup.removeKeyboard());
    } catch (err) {
      console.error('Error in bot.start:', err);
      await ctx.reply('❌ Ошибка при запуске. Пожалуйста, попробуйте позже.');
    }
  });

  // ========== HELP COMMAND ==========
  bot.help(async (ctx) => {
    await ctx.reply('Данный бот является лаунчером для Mini App. Нажмите /start для получения кнопки входа.');
  });

  // ========== CALLBACK ACTIONS (Minimal) ==========
  bot.action('menu:main', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('🏠 Главное меню', await getMainMenu(ctx.from));
  });

  bot.action('menu:conference_admin', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('⚙️ Панель администратора', Markup.inlineKeyboard([
      [Markup.button.webApp('🌐 Открыть Web-панель', getWebAppUrl())],
      [Markup.button.callback('◀️ Назад', 'menu:main')]
    ]));
  });

  // Launch Bot
  bot.launch().then(() => {
    console.log('Telegram bot started (Minimal Launcher Mode)');
  });

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

function getBotInstance() {
  return botInstance;
}

module.exports = {
  initBot,
  getBotInstance,
};
