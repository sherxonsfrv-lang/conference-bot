# 🧪 Testing Guide: Mock Data & Admin Roles

This guide explains how to use the mock data to test the Project's features, switch between Organizer and User roles, and access the Admin Panel.

## 1. Running the Mock Data Seeder
To populate your database with the initial test data, run the following command in the **root project directory**:

```bash
node src/scripts/seed-mock-data.js
```

### What gets created?
- **Organizer**: `telegramId: 12345`
- **Regular User**: `telegramId: 67890`
- **Conference**: `code: MOCK26`, `title: Mock Tech Conference 2026`
- **Interactions**: 1 Poll (Tech Stacks), 1 Question (Scaling AI).

---

## 2. How to Switch Between Roles
Since the application authenticates based on Telegram Web App data, you can simulate different users by passing their `telegramId` via query parameters or modifying the `initData` during local development.

### Option A: Simulate via Dashboard/Admin URLs
The easiest way to switch roles for technical/admin views is via URL parameters.

| Perspective | URL Pattern |
| :--- | :--- |
| **Organizer Dashboard** | `/organizer-dashboard/MOCK26?telegramId=12345&key=YOUR_API_KEY` |
| **Organizer Admin** | `/organizer-admin/MOCK26?telegramId=12345&key=YOUR_API_KEY` |
| **Regular User (API)** | Authenticated session with `67890` |

### Option B: Simulate in TWA WebApp
If you are testing the **Frontend (WebApp)** directly:
1. Open the `.env` file in the `webapp` folder.
2. If `VITE_MOCK_TELEGRAM` is enabled, the app will use the ID defined there or from `window.Telegram`.
3. To switch, you can manually override the `initData` in `webapp/src/services/api.js` temporarily or use the browser console to set a mock `telegramId`.

---

## 3. Information About Admin Panel & Dashboard

The project provides two high-level management interfaces for organizers:

### 📊 Organizer Dashboard
- **URL**: `/organizer-dashboard/:code`
- **Purpose**: Real-time monitoring of conference activity.
- **Features**: Total participants count, total questions, and poll status.
- **Security**: Requires an API Key (`SECOND_SCREEN_API_KEY`) and the `telegramId` of an authorized organizer.

### 🔧 Admin Panel (Organizer Admin)
- **URL**: `/organizer-admin/:code`
- **Purpose**: Control the lifecycle of the conference.
- **Features**: "Start Conference" and "Stop Conference" buttons. Starting a conference notifies users and opens networking.
- **Security**: Strict validation of the organizer's role and API key.

### 🗝️ How to get the API Key?
Check your `.env` file for the `SECOND_SCREEN_API_KEY`. By default, it is used to protect these management routes.

---

## 4. Summary of Task Realization
As requested, the project is now production-ready with the following realized:
- **P0 Stabilization**: No more recursive fetch loops, auto-filled profiles, and hardened role security.
- **P1 UX**: Categorized ("My") conferences, premium participant cards, and a multi-step onboarding wizard.
- **P2/P3 Audit**: Built-in logic for polls, questions, and CSV exports (accessible via the dashboard).

> [!TIP]
> Use the **Organizer Admin** to "Start" the `MOCK26` conference before testing networking features for the Regular User (`67890`).
