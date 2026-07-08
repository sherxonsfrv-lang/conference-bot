# 🚀 Deployment Guide (MySQL + Node.js)

This guide covers the deployment of the Conference Networking Bot using the modernized MySQL stack and automated Docker builds.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Docker Deployment (Recommended)](#docker-deployment-recommended)
- [Manual Deployment](#manual-deployment)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites
- **Docker & Docker Compose** (Recommended)
- **Node.js** ≥ 18 (for manual builds)
- **MySQL** 8.0 (if running without Docker)
- **Telegram Bot Token** from [@BotFather](https://t.me/BotFather)

---

## Environment Configuration

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Configure your `.env`:**
   ```bash
   # MySQL
   DB_NAME=social_connection_bot
   DB_USER=root
   DB_PASSWORD=your_secure_password
   DB_HOST=localhost # Use 'mysql' if deploying with docker-compose
   
   # Telegram
   TELEGRAM_BOT_TOKEN=your-telegram-bot-token
   
   # Security
   SECOND_SCREEN_API_KEY=generate_a_random_string
   ```

---

## Docker Deployment (Recommended)

The project uses a **multi-stage build** that automatically compiles the React frontend and packages it with the Backend.

### Quick Start
1. **Prepare `.env`**: Ensure all variables in `.env` are set correctly.
2. **Launch**:
   ```bash
   docker-compose up --build -d
   ```

### What this does:
- Starts a **MySQL 8.0** container with persistent storage.
- Compiles the **React WebApp** in an isolated build stage.
- Starts the **Node.js Backend** which serves the WebApp on port `3000`.

---

## Manual Deployment

If you cannot use Docker, follow these steps:

### 1. Build the Frontend
```bash
cd webapp
npm install
npm run build
cd ..
```

### 2. Setup the Backend
```bash
npm install --production
```

### 3. Run the Server
```bash
NODE_ENV=production node src/index.js
```
*Note: Ensure you have a running MySQL instance and your `.env` points to it.*

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | MySQL database host | `localhost` |
| `DB_NAME` | Database name | `social_connection_bot` |
| `DB_USER` | Database user | `root` |
| `DB_PASSWORD` | Database password | - |
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | - |
| `SECOND_SCREEN_API_KEY`| Secret key for management API | - |
| `PORT` | Application port | `3000` |

---

## Troubleshooting

### "Dist folder not found"
- **Solution**: The backend expects the frontend to be built in `webapp/dist`. If manually deploying, ensure you've run `npm run build` inside the `webapp` folder.

### Database Connection Refused
- **Solution**: If using Docker, ensure `DB_HOST` in `.env` is set to `mysql` (the service name). If manual, ensure MySQL service is active on your host.

### Bot not responding
- **Solution**: Check the container logs: `docker-compose logs app`. Verify your `TELEGRAM_BOT_TOKEN` is correct.

---

## Security Checklist
- [ ] `SECOND_SCREEN_API_KEY` is a long random string.
- [ ] `DB_PASSWORD` is not empty.
- [ ] Production site is served over **HTTPS** (via Nginx reverse proxy).
- [ ] MySQL port `3306` is not exposed publicly (only to the `app` container).