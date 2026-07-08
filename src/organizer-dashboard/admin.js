const express = require('express');
const { Conference } = require('../models/mysql');
const { ensureUserFromTelegram } = require('../services/conference.service');

const router = express.Router();

router.get('/organizer-admin/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const providedKey = req.query.key;
    const telegramId = req.query.telegramId;
    const configuredKey = process.env.SECOND_SCREEN_API_KEY;

    if (!configuredKey) return res.status(500).send('API key not configured.');
    if (!providedKey || providedKey !== configuredKey) return res.status(401).send('Invalid key.');
    if (!telegramId) return res.status(400).send('Telegram ID required.');

    const conference = await Conference.findOne({ where: { conferenceCode: code } });
    if (!conference) return res.status(404).send('Conference not found.');

    const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Админ-панель – ${conference.title}</title>
    <style>
        body { font-family: sans-serif; background: #f3f4f6; color: #1f2937; padding: 20px; }
        .card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .btn { padding: 10px 20px; background: #4f46e5; color: white; border: none; border-radius: 8px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="card">
        <h1>🔧 Админ-панель: ${conference.title}</h1>
        <p>Код: ${conference.conferenceCode}</p>
        <button class="btn" onclick="startConference()">Начать конференцию</button>
        <button class="btn" onclick="stopConference()">Остановить конференцию</button>
    </div>
    <script>
        async function startConference() {
            await fetch('/organizer-api/${code}/conference/start?key=${providedKey}&telegramId=${telegramId}', { method: 'POST' });
            alert('Конференция начата');
        }
        async function stopConference() {
            await fetch('/organizer-api/${code}/conference/stop?key=${providedKey}&telegramId=${telegramId}', { method: 'POST' });
            alert('Конференция остановлена');
        }
    </script>
</body>
</html>
    `;
    res.send(html);
  } catch (err) {
    res.status(500).send('Error');
  }
});

module.exports = { organizerAdminPageRouter: router };
