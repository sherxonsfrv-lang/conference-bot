// Load environment variables
const nodeEnv = process.env.NODE_ENV || 'development';
require('dotenv').config({ path: `.env.${nodeEnv}` });
require('dotenv').config();

const http = require('http');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const { Op } = require('sequelize');

const { connectMySQL } = require('./lib/sequelize');
const { validateEnvironment } = require('./lib/env-validation');
const { initBot } = require('./telegram/bot');
const { secondScreenRouter } = require('./second-screen/routes');
const { initSecondScreenSocket } = require('./second-screen/socket');
const { requireSecondScreenKey } = require('./second-screen/ss-middleware');
const { secondScreenPageRouter } = require('./second-screen/page');
const { initMeetingChatSocket } = require('./meeting-chat/socket');
const { meetingChatPageRouter } = require('./meeting-chat/page');
const { organizerDashboardPageRouter } = require('./organizer-dashboard/page');
const { organizerAdminPageRouter } = require('./organizer-dashboard/admin');
const { organizerApiRouter } = require('./organizer-dashboard/api');
const { setIO } = require('./lib/realtime');

require('./models/mysql'); // Load associations

/**
 * Schedule job to check for meetings that are starting and notify participants
 */
function startMeetingNotificationScheduler() {
  const { notifyMeetingStarting } = require('./services/meeting.service');
  const { Meeting, User } = require('./models/mysql');

  setInterval(async () => {
    try {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);
      const oneMinuteFromNow = new Date(now.getTime() + 1 * 60 * 1000);

      const startingMeetings = await Meeting.findAll({
        where: {
          status: 'accepted',
          proposedTime: {
            [Op.between]: [oneMinuteAgo, oneMinuteFromNow],
          },
        },
        include: [
          { model: User, as: 'requester', attributes: ['firstName', 'lastName', 'telegramId'] },
          { model: User, as: 'recipient', attributes: ['firstName', 'lastName', 'telegramId'] },
        ],
      });

      for (const meeting of startingMeetings) {
        await notifyMeetingStarting({ meeting });
      }
    } catch (err) {
      console.error('Error in meeting notification scheduler:', err);
    }
  }, 60 * 1000);

  console.log('✅ Meeting notification scheduler started');
}

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  validateEnvironment();
  await connectMySQL();

  // Auto-seed mock main_admin user in development mode, and default settings
  try {
    const { User, SystemSettings } = require('./models/mysql');
    const [mockAdmin, created] = await User.findOrCreate({
      where: { telegramId: 12345 },
      defaults: {
        telegramId: 12345,
        firstName: 'System',
        lastName: 'Administrator',
        username: 'main_admin',
        globalRole: 'main_admin',
        allowConferenceCreation: true,
        onboardingCompleted: true
      }
    });
    if (!created && mockAdmin.globalRole !== 'main_admin') {
      await mockAdmin.update({ globalRole: 'main_admin' });
    }
    console.log('🛡️  Main admin user 12345 seeded and verified.');
    
    await SystemSettings.findOrCreate({
      where: { id: 1 },
      defaults: {
        id: 1,
        allowConferenceCreationUsers: true,
        allowTelegramLogin: true,
        paidLimitsEnabled: true,
        tariffPrice: 249
      }
    });
    console.log('⚙️  Default system settings seeded and verified.');
  } catch (dbErr) {
    console.error('[BOOTSTRAP] Failed to seed admin user or settings:', dbErr);
  }

  const { ensureDefaultTariffPlans } = require('./services/limit.service');
  await ensureDefaultTariffPlans();

  startMeetingNotificationScheduler();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/health', (req, res) => {
    res.json({ ok: true, env: process.env.NODE_ENV || 'development' });
  });

  app.use(secondScreenPageRouter);
  app.use(meetingChatPageRouter);
  app.use(organizerDashboardPageRouter);
  app.use(organizerAdminPageRouter);
  app.use('/organizer-api', organizerApiRouter);

  // Unified TWA API Router
  const apiRouter = express.Router();
  apiRouter.use('/auth', require('./routes/auth'));
  apiRouter.use('/conferences', require('./routes/conferences'));
  apiRouter.use('/participants', require('./routes/participants'));
  apiRouter.use('/profile', require('./routes/profile'));
  apiRouter.use('/polls', require('./routes/polls'));
  apiRouter.use('/questions', require('./routes/questions'));
  apiRouter.use('/chat', require('./routes/chat'));
  apiRouter.use('/chat-requests', require('./routes/chatRequests'));
  apiRouter.use('/notifications', require('./routes/notifications'));
  apiRouter.use('/payment', require('./routes/payment'));
  apiRouter.use('/users', require('./routes/users'));
  app.use('/api', apiRouter);

  // Serve TWA frontend
  app.use('/app', express.static(path.join(__dirname, '../webapp/dist')));
  app.get('/app*', (req, res) => {
    res.sendFile(path.join(__dirname, '../webapp/dist/index.html'));
  });

  app.use('/conference', requireSecondScreenKey, secondScreenRouter);

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  // TWA Client socket handler
  io.on('connection', (socket) => {
    const telegramId = socket.handshake.query.telegramId;
    if (telegramId) {
      socket.join(`user_${telegramId}`);
      console.log(`[SOCKET] TWA client connected and joined user_${telegramId}`);
    }

    // Allow clients to subscribe/unsubscribe to a specific conference room
    socket.on('join_conference_room', ({ conferenceId }) => {
      if (conferenceId) {
        const room = `conference-${conferenceId}`;
        socket.join(room);
        console.log(`[SOCKET] Client joined conference room: ${room}`);
      }
    });

    socket.on('leave_conference_room', ({ conferenceId }) => {
      if (conferenceId) {
        const room = `conference-${conferenceId}`;
        socket.leave(room);
        console.log(`[SOCKET] Client left conference room: ${room}`);
      }
    });
  });

  initSecondScreenSocket(io);
  initMeetingChatSocket(io);
  setIO(io);
  initBot();

  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  }); 

  server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
