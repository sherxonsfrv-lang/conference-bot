const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'twa-backend/.env') });

const jwtHelper = require('./twa-backend/src/lib/jwt-helper');

// Base URL for backend server
const BASE_URL = 'http://localhost:4000/api';

async function runTests() {
  console.log('⏳ Starting API and administrative verification tests...');

  // User payloads
  // Main admin user (telegramId: 12345)
  const adminPayload = { id: 3, telegramId: '12345' };
  const adminToken = jwtHelper.sign(adminPayload);

  // Normal user (telegramId: 1000000000002)
  const userPayload = { id: 2, telegramId: '1000000000002' };
  const userToken = jwtHelper.sign(userPayload);

  console.log('Generated JWT tokens for admin and test user.');

  try {
    // -------------------------------------------------------------
    // Test 1: Fetch Admin Settings (Main Admin Only)
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Fetch Admin Settings ---');
    const settingsRes = await fetch(`${BASE_URL}/users/admin/settings`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (!settingsRes.ok) {
      throw new Error(`Failed to fetch admin settings: ${settingsRes.status} ${settingsRes.statusText}`);
    }
    
    const settingsData = await settingsRes.json();
    console.log('✅ Admin Settings fetched successfully:', settingsData.settings);

    // Verify access denied for non-admin
    const nonAdminSettingsRes = await fetch(`${BASE_URL}/users/admin/settings`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    if (nonAdminSettingsRes.status === 403) {
      console.log('✅ Correctly blocked non-admin user from retrieving settings (403).');
    } else {
      throw new Error(`Non-admin could retrieve settings: status ${nonAdminSettingsRes.status}`);
    }

    // -------------------------------------------------------------
    // Test 2: Toggle settings (e.g. disable Telegram Login)
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Toggle allowTelegramLogin = false ---');
    const updateSettingsRes = await fetch(`${BASE_URL}/users/admin/settings`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ allowTelegramLogin: false })
    });
    
    if (!updateSettingsRes.ok) {
      throw new Error(`Failed to update admin settings: ${updateSettingsRes.status}`);
    }
    
    console.log('✅ Settings updated (allowTelegramLogin set to false).');

    // Verify public settings endpoint shows update
    const publicSettingsRes = await fetch(`${BASE_URL}/auth/settings`);
    const publicSettingsData = await publicSettingsRes.json();
    console.log('Public Settings:', publicSettingsData);
    if (publicSettingsData.allowTelegramLogin === false) {
      console.log('✅ Public settings correctly reflect disabled Telegram login.');
    } else {
      throw new Error('Public settings did not update.');
    }

    // Verify /api/auth/telegram-token endpoint returns error when disabled
    const tgTokenRes = await fetch(`${BASE_URL}/auth/telegram-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const tgTokenData = await tgTokenRes.json();
    console.log('Telegram Token Request status:', tgTokenRes.status, tgTokenData);
    if (tgTokenRes.status === 400 && tgTokenData.error === 'TELEGRAM_LOGIN_DISABLED') {
      console.log('✅ Requesting telegram token was correctly blocked when Telegram login is disabled.');
    } else {
      throw new Error('Telegram login was not blocked or returned incorrect error.');
    }

    // Restore settings
    await fetch(`${BASE_URL}/users/admin/settings`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ allowTelegramLogin: true })
    });
    console.log('✅ Settings restored (allowTelegramLogin set to true).');

    // -------------------------------------------------------------
    // Test 3: Block Test User & Verify Access Rejection
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Block User & Check Gate ---');
    // Block user 2
    const blockRes = await fetch(`${BASE_URL}/users/admin/2`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isBlocked: true })
    });
    
    if (!blockRes.ok) {
      throw new Error(`Failed to block user: ${blockRes.status}`);
    }
    console.log('✅ Test user blocked successfully in DB.');

    // Attempt access as blocked user
    const blockedAccessRes = await fetch(`${BASE_URL}/profile`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    const blockedAccessData = await blockedAccessRes.json();
    console.log('Blocked User Profile Request status:', blockedAccessRes.status, blockedAccessData);
    
    if (blockedAccessRes.status === 403 && blockedAccessData.error === 'ACCOUNT_BLOCKED') {
      console.log('✅ Auth middleware correctly blocked suspended user (403 ACCOUNT_BLOCKED).');
    } else {
      throw new Error(`Blocked user access was not restricted. Status: ${blockedAccessRes.status}`);
    }

    // Unblock test user
    await fetch(`${BASE_URL}/users/admin/2`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isBlocked: false })
    });
    console.log('✅ Test user unblocked successfully.');

    // -------------------------------------------------------------
    // Test 4: Custom Push Notification Trigger
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Send Custom Admin Notification ---');
    const notifyRes = await fetch(`${BASE_URL}/users/admin/notify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: 2,
        title: 'Уведомление от системы',
        body: 'Ваш профиль был проверен администрацией.'
      })
    });
    
    if (!notifyRes.ok) {
      throw new Error(`Failed to send custom notification: ${notifyRes.status}`);
    }
    const notifyData = await notifyRes.json();
    console.log('✅ Notification created in DB:', notifyData.notification);

    // -------------------------------------------------------------
    // Test 5: Admin Analytics Retrieval
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Retrieve Admin Analytics ---');
    const analyticsRes = await fetch(`${BASE_URL}/users/admin/analytics`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (!analyticsRes.ok) {
      throw new Error(`Failed to retrieve analytics: ${analyticsRes.status}`);
    }
    const analyticsData = await analyticsRes.json();
    console.log('✅ Analytics metrics fetched successfully:', analyticsData.metrics);
    console.log('✅ Recent users list:', analyticsData.recentUsers);

    // -------------------------------------------------------------
    // Test 6: Direct Conference Creation (Admin)
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Create Conference via Admin Panel ---');
    const createConfRes = await fetch(`${BASE_URL}/conferences/admin/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Админское Событие',
        description: 'Создано напрямую через панель управления',
        location: 'Москва, Сити',
        startsAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        endsAt: new Date(Date.now() + 7200 * 1000).toISOString(),
        access: 'public',
        maxParticipants: 500
      })
    });

    if (!createConfRes.ok) {
      throw new Error(`Failed to create conference as admin: ${createConfRes.status}`);
    }
    const createConfData = await createConfRes.json();
    console.log('✅ Admin Conference created successfully:', createConfData.conference);

    console.log('\n🎉 ALL ADMINISTRATIVE SYSTEM FUNCTIONALITY VERIFIED SUCCESSFULY! 🎉\n');
  } catch (err) {
    console.error('❌ VERIFICATION TEST FAILED:', err.message);
    process.exit(1);
  }
}

runTests();
