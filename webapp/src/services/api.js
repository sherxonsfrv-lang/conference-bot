const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  
  const { protocol, hostname } = window.location;
  // If we're on localhost:5173 (Vite), we proxy to localhost:4000/api
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return '/api'; // Use proxy
  }
  
  // Production: assume /api is on the same host or a subdomain
  return `${protocol}//${hostname}${window.location.port ? `:${window.location.port}` : ''}/api`;
};

const BASE_URL = getBaseUrl();

class ApiClient {
  constructor() {
    this.telegramId = '';
    this.initData = '';
    this.token = localStorage.getItem('token') || '';
  }

  /** Call once after Telegram.WebApp is ready */
  init() {
    const tg = window.Telegram?.WebApp;
    this.initData = tg?.initData || '';
    this.telegramId = String(tg?.initDataUnsafe?.user?.id || '');

    // Development fallback: ONLY on localhost
    if (!this.telegramId && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      console.log('[API] No Telegram user found on localhost, using dev mock ID');
      this.telegramId = '12345';
    }
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  async _request(method, path, body) {
    const headers = {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': this.initData,
      'X-Telegram-Id': this.telegramId, // Dev bypass
      'ngrok-skip-browser-warning': 'true', // Bypass ngrok landing page for CORS
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  authenticate(initData) {
    return this._request('POST', '/auth', { initData });
  }

  getPublicSettings() {
    return this._request('GET', '/auth/settings');
  }

  // ── Conferences ────────────────────────────────────────────────────────────
  getConferences() {
    return this._request('GET', '/conferences');
  }

  getDashboardData() {
    return this._request('GET', '/conferences/dashboard');
  }

  createConference(data) {
    return this._request('POST', '/conferences/create', data);
  }

  joinConference(conferenceCode, ticketCode) {
    return this._request('POST', '/conferences/join', { conferenceCode, ticketCode });
  }

  updateConference(id, data) {
    return this._request('PATCH', `/conferences/${id}`, data);
  }

  // ── Participants ───────────────────────────────────────────────────────────
  getParticipants(conferenceCode) {
    return this._request('GET', `/participants?conferenceCode=${conferenceCode}`);
  }

  organizerUpdateParticipant(participantId, data) {
    return this._request('PUT', `/participants/${participantId}`, data);
  }

  // ── Profile ────────────────────────────────────────────────────────────────
  getProfile() {
    return this._request('GET', '/profile');
  }

  updateProfile(profileData) {
    return this._request('POST', '/profile', profileData);
  }

  syncTelegramPhoto() {
    return this._request('POST', '/profile/sync-telegram-photo');
  }

  searchPublicProfiles(query = '') {
    return this._request('GET', `/profile/public?query=${query}`);
  }

  // ── Global Networking ──────────────────────────────────────────────────────
  searchUsers(query = '') {
    return this._request('GET', `/users?search=${encodeURIComponent(query)}`);
  }

  adminGetUsers() {
    return this._request('GET', '/users/admin');
  }

  adminUpdateUser(userId, data) {
    return this._request('PUT', `/users/admin/${userId}`, data);
  }

  adminGetConferences() {
    return this._request('GET', '/conferences/admin');
  }

  adminUpdateConference(confId, data) {
    return this._request('PATCH', `/conferences/admin/${confId}`, data);
  }

  adminDeleteConference(confId) {
    return this._request('DELETE', `/conferences/admin/${confId}`);
  }

  adminGetSettings() {
    return this._request('GET', '/users/admin/settings');
  }

  adminUpdateSettings(data) {
    return this._request('PUT', '/users/admin/settings', data);
  }

  adminNotifyUser(userId, title, body) {
    return this._request('POST', '/users/admin/notify', { userId, title, body });
  }

  adminCreateConference(data) {
    return this._request('POST', '/conferences/admin/create', data);
  }

  adminGetAnalytics() {
    return this._request('GET', '/users/admin/analytics');
  }

  // ── Polls ─────────────────────────────────────────────────────────────────
  getPolls(conferenceCode) {
    return this._request('GET', `/polls?conferenceCode=${conferenceCode}`);
  }

  votePoll(pollId, optionId) {
    return this._request('POST', `/polls/${pollId}/vote`, { optionId });
  }

  // ── Questions ─────────────────────────────────────────────────────────────
  getQuestions(conferenceCode) {
    return this._request('GET', `/questions?conferenceCode=${conferenceCode}`);
  }

  askQuestion(conferenceCode, text) {
    return this._request('POST', '/questions', { conferenceCode, text });
  }

  upvoteQuestion(questionId) {
    return this._request('POST', `/questions/${questionId}/upvote`);
  }

  updateQuestionStatus(questionId, status) {
    return this._request('PATCH', `/questions/${questionId}/status`, { status });
  }

  deleteQuestion(questionId) {
    return this._request('DELETE', `/questions/${questionId}`);
  }

  // ── Management Endpoints (Organizer Only) ─────────────────────────────────
  createPoll(conferenceCode, question, options) {
    return this._request('POST', '/polls', { conferenceCode, question, options });
  }

  togglePoll(pollId) {
    return this._request('PATCH', `/polls/${pollId}/toggle`);
  }

  deletePoll(pollId) {
    return this._request('DELETE', `/polls/${pollId}`);
  }

  // ── Chat ──────────────────────────────────────────────────────────────────
  getChatList(conferenceCode) {
    const qs = conferenceCode ? `?conferenceCode=${conferenceCode}` : '';
    return this._request('GET', `/chat/list${qs}`);
  }

  getChatMessages(withTelegramId, conferenceCode) {
    const qs = (conferenceCode && conferenceCode !== 'undefined' && conferenceCode !== 'null') ? `&conferenceCode=${conferenceCode}` : '';
    return this._request('GET', `/chat/messages?withTelegramId=${withTelegramId}${qs}`);
  }

  sendMessage(toTelegramId, conferenceCode, text) {
    return this._request('POST', '/chat/message', { toTelegramId, conferenceCode, text });
  }

  // ── Chat Requests ─────────────────────────────────────────────────────────
  getChatRequests() {
    return this._request('GET', '/chat-requests');
  }

  sendChatRequest(toTelegramId, conferenceCode, message) {
    return this._request('POST', '/chat-requests/send', { toTelegramId, conferenceCode, message });
  }

  acceptChatRequest(requestId) {
    return this._request('POST', `/chat-requests/${requestId}/accept`);
  }

  rejectChatRequest(requestId) {
    return this._request('POST', `/chat-requests/${requestId}/reject`);
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  getNotifications() {
    return this._request('GET', '/notifications');
  }

  markNotificationRead(notificationId) {
    return this._request('POST', `/notifications/${notificationId}/read`);
  }

  markAllNotificationsRead() {
    return this._request('POST', '/notifications/read-all');
  }

  // ── Payment ───────────────────────────────────────────────────────────────
  initiatePayment(conferenceCode) {
    return this._request('POST', '/payment/initiate', { conferenceCode });
  }

  getPaymentStatus() {
    return this._request('GET', '/payment/status');
  }
}

export const api = new ApiClient();
