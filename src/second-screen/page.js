const express = require('express');
const { Conference } = require('../models/mysql');

const router = express.Router();

router.get('/second-screen/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const providedKey = req.query.key;
    const configuredKey = process.env.SECOND_SCREEN_API_KEY;

    if (!configuredKey) return res.status(500).send('Second screen API key not configured.');
    if (!providedKey || providedKey !== configuredKey) return res.status(401).send('Invalid key.');

    const conference = await Conference.findOne({ where: { conferenceCode: code } });
    if (!conference) return res.status(404).send('Conference not found.');

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Second Screen – ${conference.title}</title>
    <style>
        body { font-family: sans-serif; background: #050816; color: white; padding: 20px; }
        .card { background: #0f172a; padding: 20px; border-radius: 10px; border: 1px solid #334155; }
        ul { list-style: none; padding: 0; }
        li { padding: 10px; border-bottom: 1px solid #1e293b; }
    </style>
</head>
<body>
    <h1>${conference.title}</h1>
    <div class="card">
        <h2>Вопросы участников</h2>
        <ul id="questionsList"></ul>
    </div>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const code = ${JSON.stringify(code)};
        const apiKey = ${JSON.stringify(configuredKey)};
        const questionsList = document.getElementById('questionsList');

        fetch('/conference/' + code + '/questions')
            .then(r => r.json())
            .then(data => {
                data.items.forEach(q => {
                    const li = document.createElement('li');
                    li.textContent = q.text;
                    questionsList.appendChild(li);
                });
            });

        const socket = io(window.location.origin, { auth: { secondScreenKey: apiKey } });
        socket.on('connect', () => socket.emit('join-conference', { code }));
        socket.on('question-updated', (q) => {
            if (q.isApproved) {
                const li = document.createElement('li');
                li.textContent = q.text;
                questionsList.appendChild(li);
            }
        });
    </script>
</body>
</html>
    `;
    res.send(html);
  } catch (err) {
    res.status(500).send('Error');
  }
});

module.exports = { secondScreenPageRouter: router };
