const { getConferenceIdByCode } = require('../lib/conference-helper');

function initSecondScreenSocket(io) {
  io.on('connection', (socket) => {
    const { secondScreenKey } = socket.handshake.auth || {};
    const configuredKey = process.env.SECOND_SCREEN_API_KEY;

    // Only handle if secondScreenKey is provided
    if (secondScreenKey) {
      if (!configuredKey || secondScreenKey !== configuredKey) {
        socket.emit('error', 'Invalid second screen key');
        socket.disconnect(true);
        return;
      }

      socket.on('join-conference', async ({ code }) => {
        try {
          if (!code) return socket.emit('error', 'Conference code required');
          const conferenceId = await getConferenceIdByCode(code);
          const room = `conference-${conferenceId}`;
          socket.join(room);
          socket.emit('joined-conference', { room, conferenceId });
        } catch (err) {
          socket.emit('error', err.message);
        }
      });
    }
  });
}

module.exports = {
  initSecondScreenSocket,
};
