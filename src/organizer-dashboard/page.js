const express = require('express');
const { Conference, User } = require('../models/mysql');
const { generateOrganizerReport } = require('../services/report.service');
const { ensureUserFromTelegram } = require('../services/conference.service');

const router = express.Router();

router.get('/organizer-dashboard/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const providedKey = req.query.key;
    const telegramId = req.query.telegramId;
    const configuredKey = process.env.SECOND_SCREEN_API_KEY;

    if (!configuredKey) return res.status(500).send('Dashboard API key not configured.');
    if (!providedKey || providedKey !== configuredKey) return res.status(401).send('Invalid key.');
    if (!telegramId) return res.status(400).send('Telegram ID required.');

    const conference = await Conference.findOne({ where: { conferenceCode: code } });
    if (!conference) return res.status(404).send('Conference not found.');

    const report = await generateOrganizerReport({ telegramUser: { id: parseInt(telegramId) }, conferenceCode: code });

    const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Отчёт организатора – ${conference.title}</title>
    <style>
        body { font-family: sans-serif; background: #f3f4f6; color: #1f2937; padding: 20px; }
        .card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 20px; }
        h1 { color: #111827; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .metric { font-size: 24px; font-weight: bold; color: #4f46e5; }
    </style>
</head>
<body>
    <div class="card">
        <h1>📊 Отчёт организатора: ${conference.title}</h1>
        <p>Код: ${conference.conferenceCode}</p>
    </div>
    <div class="grid">
        <div class="card">
            <h3>Участники</h3>
            <div class="metric">${report.participants.total}</div>
        </div>
        <div class="card">
            <h3>Вопросы</h3>
            <div class="metric">${report.questions.total}</div>
        </div>
        <div class="card">
            <h3>Опросы</h3>
            <div class="metric">${report.polls.total}</div>
        </div>
    </div>
</body>
</html>
    `;
    res.send(html);
  } catch (err) {
    res.status(500).send('Error');
  }
});

module.exports = { organizerDashboardPageRouter: router };
