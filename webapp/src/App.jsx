import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, AlertTriangle, Ban, X } from 'lucide-react';
import ProfileForm from './components/ProfileForm';
import PaymentModal from './components/PaymentModal';
import MemberProfileModal from './components/MemberProfileModal';

// Layout Components
import Header from './components/layout/Header';
import MainNavigationBar from './components/layout/MainNavigationBar';
import ConferenceNavigationBar from './components/layout/ConferenceNavigationBar';
import NotificationsDrawer from './components/layout/NotificationsDrawer';
import DebugConsole from './components/DebugConsole';
import Toast from './components/layout/Toast';

// Main Views
import HomeView from './views/HomeView';
import MessagingView from './views/MessagingView';
import PublicConferencesView from './views/PublicConferencesView';
import ProfileView from './views/ProfileView';
import NetworkingView from './views/NetworkingView';
import CreateConferenceView from './views/CreateConferenceView';
import MyConferencesView from './views/MyConferencesView';

// Conference Views
import ConferenceHomeView from './views/ConferenceHomeView';
import ConferenceMembersView from './views/ConferenceMembersView';
import ConferenceAskView from './views/ConferenceAskView';
import ConferencePollsView from './views/ConferencePollsView';
import ConferenceQuestionsListView from './views/ConferenceQuestionsListView';
import ConferenceChatListView from './views/ConferenceChatListView';
import ConferenceChatDetailView from './views/ConferenceChatDetailView';
import ConferenceDashboardView from './views/ConferenceDashboardView';
import SearchProfilesView from './views/SearchProfilesView';
import QRGeneratorModal from './components/QRGeneratorModal';
import LandingView from './views/LandingView';
import GlobalAdminView from './views/GlobalAdminView';

// Utilities
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";

import { io } from 'socket.io-client';
import { api } from './services/api';
import { RU as t } from './constants/locales';
import './App.css';

const App = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [conferences, setConferences] = useState([]);
  const [activeConferences, setActiveConferences] = useState([]); // P1.2
  const [pastConferences, setPastConferences] = useState([]);     // P1.2
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'conferences';
  });
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState(null);
  const isInitialized = useRef(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [accessPhase, setAccessPhase] = useState('free');
  const [activeConference, setActiveConference] = useState(() => {
    const saved = localStorage.getItem('activeConference');
    return saved ? JSON.parse(saved) : null;
  });
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketConferenceCode, setTicketConferenceCode] = useState('');
  const [ticketCodeVal, setTicketCodeVal] = useState('');
  const [ticketError, setTicketError] = useState('');
  const scannerRef = useRef(null);
  const socketRef = useRef(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const lastProcessedNotificationId = useRef(null);

  const [isChatRequestOpen, setIsChatRequestOpen] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [isInChat, setIsInChat] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [selectedConfChat, setSelectedConfChat] = useState(null);
  const [initialDirectChat, setInitialDirectChat] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [requestStatuses, setRequestStatuses] = useState({});
  const [rejectCounts, setRejectCounts] = useState({});
  const [sendingRequests, setSendingRequests] = useState({});
  const [isRequestsLoaded, setIsRequestsLoaded] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState(null); // { message, type, onClick }
  const [isBlockedAccount, setIsBlockedAccount] = useState(false);
  const [systemSettings, setSystemSettings] = useState({
    allowTelegramLogin: true,
    paidLimitsEnabled: true,
    tariffPrice: 249,
    allowConferenceCreationUsers: true
  });

  const isDesktop = window.innerWidth > 768;


  // Refs to allow socket listeners to see fresh state without reconnecting
  const activeTabRef = useRef(activeTab);
  const selectedChatRef = useRef(selectedConfChat);
  const directChatRef = useRef(initialDirectChat);
  const isInChatRef = useRef(isInChat);
  const activeConferenceRef = useRef(activeConference);
  const userRef = useRef(user);

  useEffect(() => {
    activeTabRef.current = activeTab;
    selectedChatRef.current = selectedConfChat;
    directChatRef.current = initialDirectChat;
    isInChatRef.current = isInChat;
    activeConferenceRef.current = activeConference;
    userRef.current = user;
  }, [activeTab, selectedConfChat, initialDirectChat, isInChat, activeConference, user]);

  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { selectedChatRef.current = selectedConfChat; }, [selectedConfChat]);
  useEffect(() => { directChatRef.current = initialDirectChat; }, [initialDirectChat]);
  useEffect(() => { isInChatRef.current = isInChat; }, [isInChat]);

  // Centralized background scroll blocking when any modal or scanner is open
  useEffect(() => {
    const isAnyModalOpen =
      isNotificationsOpen ||
      isScannerOpen ||
      isChatRequestOpen ||
      isMemberModalOpen ||
      isPaymentOpen ||
      isTicketModalOpen ||
      isQRModalOpen;

    if (isAnyModalOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }

    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, [
    isNotificationsOpen,
    isScannerOpen,
    isChatRequestOpen,
    isMemberModalOpen,
    isPaymentOpen,
    isTicketModalOpen,
    isQRModalOpen
  ]);

  // ── Conference-scoped state ─────────────────────────────────────────────
  const [participants, setParticipants] = useState([]);
  const [polls, setPolls] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [chatList, setChatList] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatRequests, setChatRequests] = useState([]);
  const [globalUsers, setGlobalUsers] = useState([]);

  // ── SVG Icons ─────────────────────────────────────────────────────────────
  const Icons = {
    Home: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
    Message: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
    Networking: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    Conference: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="16" x="4" y="4" rx="2" /><path d="M9 22v-4h6v4M8 4v.01M16 4v.01M8 8v.01M16 8v.01M8 12v.01M16 12v.01M8 16v.01M16 16v.01" /></svg>,
    Profile: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    Notification: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>,
    Close: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>,
    Plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  };

  const showToast = useCallback((message, type = 'success', onClick = null) => {
    setToast({ message, type, onClick });
  }, []);

  const localizeError = useCallback((errMsg) => {
    if (!errMsg) return t.toast.error;
    // Check for "Limit reached" prefix
    if (errMsg.startsWith('Limit reached')) return t.backend_errors['Limit reached'];
    return t.backend_errors[errMsg] || errMsg || t.toast.error;
  }, []);

  // ── Auth & Fetchers ────────────────────────────────────────────────────────
  const authenticate = useCallback(async (initData) => {
    try {
      const data = await api.authenticate(initData);
      if (data && data.user) {
        if (data.profile?.isBlocked) {
          setIsBlockedAccount(true);
          setProfile(data.profile);
          setUser(data.user);
          return;
        }
        setUser(data.user);
        setProfile(data.profile);
        setConferences(data.conferences || []);
        setActiveConferences(data.activeConferences || []);
        setPastConferences(data.pastConferences || []);

        // If the initial auth doesn't provide enough data, fetch it
        if (!data.activeConferences) {
          fetchDashboardData();
        }

        if (data.conferences?.[0]) setAccessPhase(data.conferences[0].accessPhase);

        // REDIRECT TO PROFILE ON FIRST ENTRY
        if (!data.profile?.onboardingCompleted) {
          setActiveTab('profile');
        }
      } else {
        throw new Error(t.common.error_data_missing || 'User data missing in response');
      }
    } catch (err) {
      console.error('Auth error:', err);
      if (err.message?.includes('ACCOUNT_BLOCKED') || err.message?.includes('заблокирован')) {
        setIsBlockedAccount(true);
        setBootError(err.message || 'Аккаунт заблокирован');
        return;
      }
      showToast(err.message || 'Ошибка авторизации', 'error');
      // Fallback for development or failed auth
      setUser(prev => {
        if (prev) return prev;
        return { id: 'guest', firstName: 'Guest', lastName: '' };
      });
      setProfile(prev => {
        if (prev) return prev;
        return { onboardingCompleted: false };
      });

      if (initData) {
        setBootError(err.message || 'Failed to authenticate');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConferences = useCallback(async () => {
    try {
      const data = await api.getConferences();
      setConferences(data.conferences || []);
    } catch (err) {
      console.error('Fetch conferences error:', err);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Fetch notifications error:', err);
    }
  }, [api]);

  // ── Socket.io Connection ──────────────────────────────────────────────────
  useEffect(() => {
    // Connect socket for both Telegram users (telegramId) and email users (user.id)
    if (user && (user.telegramId || user.id) && !socketRef.current) {
      const socketUserId = user.telegramId || user.id;
      console.log('[SOCKET] Initializing connection for:', socketUserId);
      const getSocketUrl = () => {
        const envApiUrl = import.meta.env.VITE_API_URL;
        if (envApiUrl) {
          return envApiUrl.replace(/\/api\/?$/, '');
        }
        
        const { hostname } = window.location;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          return window.location.origin;
        }
        return 'https://conference-bot-production.up.railway.app';
      };
      const socketUrl = getSocketUrl();
      console.log('[SOCKET] Connecting to:', socketUrl);
      const socket = io(socketUrl, {
        query: { telegramId: socketUserId },
        reconnectionAttempts: 10,
        timeout: 10000
      });

      socket.on('connect', () => {
        console.log('[SOCKET] Connected to real-time server');
      });

      socket.on('new_message', (data) => {
        console.log('[SOCKET] New message received:', data);

        // Use Refs to check if we are currently looking at this chat
        const currentSelectedChat = selectedChatRef.current;
        const currentDirectChat = directChatRef.current;
        const currentIsInChat = isInChatRef.current;

        const isCurrentlyChattingWithSender = currentIsInChat &&
          (currentSelectedChat?.other?.id === data.fromTelegramId ||
            currentDirectChat?.other?.id === data.fromTelegramId);

        if (isCurrentlyChattingWithSender) {
          const newMsg = {
            id: data.id,
            text: data.text,
            fromSelf: false,
            time: data.time
          };
          setChatMessages(prev => {
            if (prev.find(m => m.id === data.id)) return prev;
            return [...prev, newMsg];
          });
          // Still fetch list to update timestamps/last text in sidebar
          fetchChatList(data.conferenceCode);
        } else {
          fetchChatList();
          showToast(`Новое сообщение от ${data.senderName || data.fromTelegramId}`);
        }
      });

      socket.on('chat_request_received', (data) => {
        console.log('[SOCKET] Chat request received:', data);
        fetchNotifications();
        fetchChatRequests();
        const notif = data.notification;
        if (notif) {
          showToast(
            `💬 ${notif.title}: ${notif.body}`,
            'info',
            () => {
              const reqObj = {
                id: notif.data?.chatRequestId,
                from: {
                  name: notif.data?.senderName || 'Участник',
                  telegramId: notif.data?.fromTelegramId || notif.data?.senderTelegramId
                },
                conferenceCode: notif.data?.conferenceCode,
                notificationId: notif.id
              };
              setPendingRequest(reqObj);
              setIsChatRequestOpen(true);
              setToast(null);
            }
          );
        }
      });

      socket.on('chat_request_accepted', (data) => {
        console.log('[SOCKET] Request accepted:', data);
        if (userRef.current && String(data.acceptedBy?.telegramId) !== String(userRef.current.telegramId)) {
          showToast(`Запрос принят: ${data.acceptedBy.name}`);
        }
        // Fetch fresh data to update UI buttons
        fetchChatRequests();
        fetchDashboardData();
        if (activeTabRef.current === 'conf_chats' || activeTabRef.current === 'conf_chat_detail') {
          fetchChatList(activeConferenceRef.current?.code);
        } else {
          fetchChatList();
        }
      });

      socket.on('chat_request_rejected', (data) => {
        console.log('[SOCKET] Request rejected:', data);
        fetchChatRequests();
        fetchNotifications();
      });

      socket.on('admin_notification', (data) => {
        console.log('[SOCKET] Admin notification received:', data);
        showToast(`📢 ${data.title}: ${data.body}`, 'info');
        fetchNotifications();
      });

      // Conference ended: kick the user out of the conference view
      socket.on('conference_ended', (data) => {
        console.log('[SOCKET] Conference ended:', data);
        const currentConf = activeConferenceRef.current;
        if (currentConf && (currentConf.id === data.conferenceId || currentConf.code === data.conferenceCode)) {
          showToast(`🏁 Конференция "${data.title || currentConf.name}" завершена организатором.`, 'warning');
          // Leave the conference
          setActiveConference(null);
          setActiveTab('conferences');
          setParticipants([]);
          setPolls([]);
          setQuestions([]);
          setChatList([]);
          fetchDashboardData();
        }
      });

      socketRef.current = socket;

      return () => {
        console.log('[SOCKET] Cleaning up connection');
        socket.disconnect();
        socketRef.current = null;
      };
    }
  }, [user]); // Only reconnect if USER changes

  // Join/leave conference socket room whenever activeConference changes
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    if (activeConference?.id) {
      socket.emit('join_conference_room', { conferenceId: activeConference.id });
      return () => {
        socket.emit('leave_conference_room', { conferenceId: activeConference.id });
      };
    }
  }, [activeConference?.id]);

  const fetchGlobalUsers = useCallback(async (query = '') => {
    try {
      const data = await api.searchUsers(query);
      setGlobalUsers(data.users || []);
    } catch (err) {
      console.error('Fetch global users error:', err);
      showToast('Ошибка поиска участников', 'error');
    }
  }, [showToast]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const data = await api.getDashboardData();
      setConferences(data.conferences || []);
      setActiveConferences(data.activeConferences || []);
      setPastConferences(data.pastConferences || []);
      // Also update overall polls if applicable
      if (data.polls) setPolls(data.polls);
    } catch (err) {
      console.error('Fetch dashboard data error:', err);
    }
  }, []);

  const fetchChatRequests = useCallback(async () => {
    try {
      const data = await api.getChatRequests();
      setChatRequests(data.requests || []);

      const statuses = {};
      const rCounts = {};

      if (data.requests) {
        // Loop backwards so latest status takes precedence
        for (let i = data.requests.length - 1; i >= 0; i--) {
          const req = data.requests[i];
          const targetId = req.isMine ? req.to.telegramId : req.from.telegramId;

          statuses[targetId] = req.status;
          statuses[req.id] = req.status;

          if (req.isMine && req.status === 'rejected') {
            rCounts[targetId] = (rCounts[targetId] || 0) + 1;
          }
        }
      }

      setRequestStatuses(statuses);
      setRejectCounts(rCounts);
    } catch (err) {
      console.error('Fetch chat requests error:', err);
    } finally {
      setIsRequestsLoaded(true);
    }
  }, []);

  const fetchChatList = useCallback(async (code) => {
    try {
      const data = await api.getChatList(code);
      setChatList(data.chats || []);
    } catch (err) {
      console.error('Fetch chat list error:', err);
    }
  }, []);

  const loadConferenceData = useCallback(async (code) => {
    if (!code) return;
    try {
      const [partData, pollData, qData] = await Promise.allSettled([
        api.getParticipants(code),
        api.getPolls(code),
        api.getQuestions(code),
      ]);
      if (partData.status === 'fulfilled') setParticipants(partData.value.participants || []);
      if (pollData.status === 'fulfilled') setPolls(pollData.value.polls || []);
      if (qData.status === 'fulfilled') setQuestions(qData.value.questions || []);

      // Fetch chats separately or within the same load
      fetchChatList(code);
    } catch (err) {
      console.error('Load conference data error:', err);
    }
  }, []);

  const handleUpdateProfile = async (data) => {
    try {
      const result = await api.updateProfile({ ...data, onboardingCompleted: true });
      if (result.success && result.profile) {
        setProfile(result.profile);
        setActiveTab('home');
        showToast(t.common.profile_updated || 'Профиль обновлен', 'success');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      showToast(localizeError(err.message), 'error');
      // For local update on failure (optimistic UI or fallback)
      setProfile(prev => ({ ...(prev || {}), ...data }));
    }
  };

  const handleCreateConference = async (data) => {
    try {
      const result = await api.createConference(data);
      if (result.success) {
        await fetchDashboardData();
        setActiveTab('conferences');
        showToast('Конференция создана', 'success');
      }
    } catch (err) {
      console.error('Create conference error:', err);
      showToast(localizeError(err.message), 'error');
      throw err;
    }
  };

  const handleVote = async (pollId, optionId) => {
    try {
      const result = await api.votePoll(pollId, optionId);
      setPolls(prev => prev.map(p =>
        p.id === pollId ? { ...p, options: result.options, totalVotes: result.totalVotes } : p
      ));
      showToast('Голос учтен!', 'success');
    } catch (err) {
      console.error('Vote error:', err);
      showToast(localizeError(err.message), 'error');
    }
  };

  const handleAskQuestion = async (text) => {
    if (!activeConference?.code) return;
    try {
      await api.askQuestion(activeConference.code, text);
      const data = await api.getQuestions(activeConference.code);
      setQuestions(data.questions || []);
      showToast('Вопрос отправлен на модерацию', 'success');
    } catch (err) {
      console.error('Ask question error:', err);
      showToast(localizeError(err.message), 'error');
    }
  };

  const handleUpvoteQuestion = async (questionId) => {
    try {
      await api.upvoteQuestion(questionId);
      if (activeConference?.code) {
        const data = await api.getQuestions(activeConference.code);
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error('Upvote error:', err);
    }
  };

  const handleSelectChat = async (chat) => {
    setSelectedConfChat(chat);
    const code = chat?.conferenceCode || activeConference?.code || null;
    if (chat?.other?.id) {
      try {
        const data = await api.getChatMessages(chat.other.id, code);
        setChatMessages(data.messages || []);
      } catch (err) {
        console.error('Fetch messages error:', err);
      }
    }
  };

  const handleSendMessage = async (userId, text, code) => {
    const targetUserId = userId || selectedConfChat?.other?.id;
    const conferenceCode = code || (selectedConfChat?.conferenceCode) || activeConference?.code || null;

    if (!targetUserId) return;

    // Optimistic Update: Add message immediately
    const tempId = Date.now();
    const optimisticMsg = {
      id: tempId,
      text: text.trim(),
      fromSelf: true,
      time: new Date().toISOString(),
      isOptimistic: true // Marker for UI if needed
    };
    setChatMessages(prev => [...prev, optimisticMsg]);
    setIsSendingMessage(true);

    try {
      const res = await api.sendMessage(targetUserId, conferenceCode, text);

      // Update the optimistic message with the real server data (ID and Time)
      setChatMessages(prev => prev.map(m =>
        m.id === tempId ? { ...m, id: res.message.id, time: res.message.time, isOptimistic: false } : m
      ));

      fetchChatList(activeConference?.code);
    } catch (err) {
      console.error('Send message error:', err);
      showToast(localizeError(err.message), 'error');
      // Rollback optimistic update on error
      setChatMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSendChatRequest = async (member) => {
    const targetId = member.userId || member.telegramId || member.id;
    const conferenceCode = activeConference?.code;

    // Check local status first for immediate feedback
    const curStatus = requestStatuses[targetId];
    if (curStatus === 'pending') {
      showToast('Вы уже отправили запрос, ожидайте ответа', 'info');
      return;
    }
    if (curStatus === 'accepted') {
      showToast('Вы уже общаетесь с этим пользователем', 'info');
      return;
    }

    setSendingRequests(prev => ({ ...prev, [targetId]: true }));
    setSelectedMember(prev => prev ? { ...prev, isSendingRequest: true } : null);

    try {
      await api.sendChatRequest(targetId, conferenceCode);
      showToast(t.toast.request_sent);
      await fetchChatRequests();
    } catch (err) {
      if (err.message?.includes('already exists')) {
        showToast('Запрос уже обработан или отправлен ранее', 'info');
      } else {
        console.error('Send request error:', err);
        showToast(localizeError(err.message), 'error');
      }
    } finally {
      setSendingRequests(prev => ({ ...prev, [targetId]: false }));
      setSelectedMember(prev => prev ? { ...prev, isSendingRequest: false } : null);
    }
  };

  const handleAcceptChatRequest = async (requestId) => {
    try {
      // Mark notification as read immediately
      if (pendingRequest?.notificationId) {
        api.markNotificationRead(pendingRequest.notificationId).catch(() => { });
      }

      await api.acceptChatRequest(requestId);
      showToast('Запрос принят. Теперь вы можете общаться!', 'success');
      setIsChatRequestOpen(false);
      setPendingRequest(null);

      // Refresh local state
      fetchChatRequests();
      fetchDashboardData();
      if (activeTab === 'conf_chats' || activeTab === 'conf_chat_detail') {
        fetchChatList(activeConference?.code);
      } else {
        fetchChatList();
      }

      // Smart navigation based on current context
      if (activeConference) {
        setActiveTab('conf_chats');
      } else {
        setInitialDirectChat(null);
        setActiveTab('messaging');
      }
    } catch (err) {
      console.error('Accept request error:', err);
      showToast(localizeError(err.message), 'error');
    }
  };

  const handleRejectChatRequest = async (requestId) => {
    try {
      if (pendingRequest?.notificationId) {
        api.markNotificationRead(pendingRequest.notificationId).catch(console.error);
      }
      await api.rejectChatRequest(requestId);
      fetchNotifications();
      setIsChatRequestOpen(false);
      showToast(t.toast.request_rejected, 'warning');
    } catch (err) {
      console.error('Reject error:', err);
      showToast(localizeError(err.message), 'error');
    }
  };

  // ── Management Handlers ───────────────────────────────────────────────────
  const handleCreatePoll = async (question, options) => {
    try {
      await api.createPoll(activeConference.code, question, options);
      showToast('Опрос создан!', 'success');
      loadConferenceData(activeConference.code);
    } catch (err) {
      console.error('Create poll error:', err);
      showToast(localizeError(err.message), 'error');
    }
  };

  const handleTogglePoll = async (pollId) => {
    try {
      await api.togglePoll(pollId);
      loadConferenceData(activeConference.code);
    } catch (err) {
      showToast(localizeError(err.message), 'error');
    }
  };

  const handleDeletePoll = async (pollId) => {
    try {
      await api.deletePoll(pollId);
      showToast('Опрос удален', 'warning');
      loadConferenceData(activeConference.code);
    } catch (err) {
      showToast(localizeError(err.message), 'error');
    }
  };

  const handleUpdateQuestionStatus = async (qId, status) => {
    try {
      await api.updateQuestionStatus(qId, status);
      showToast(status === 'approved' ? 'Вопрос одобрен' : 'Вопрос отклонен', 'success');
      loadConferenceData(activeConference.code);
    } catch (err) {
      showToast(localizeError(err.message), 'error');
    }
  };

  const handleDeleteQuestion = async (qId) => {
    try {
      await api.deleteQuestion(qId);
      showToast('Вопрос удален', 'warning');
      loadConferenceData(activeConference.code);
    } catch (err) {
      showToast(localizeError(err.message), 'error');
    }
  };

  // ── Conference Navigation ─────────────────────────────────────────────────
  const joinConference = useCallback(async (conf, ticketCode) => {
    // Determine the code
    const code = (typeof conf === 'string') ? conf : conf?.code;
    if (!code) return;

    try {
      // Always call join API to ensure participation and get latest data
      const data = await api.joinConference(code, ticketCode);
      const fullConf = data.conference;

      setActiveConference(fullConf);
      setAccessPhase(fullConf.accessPhase || 'free');
      setActiveTab('conf_home');
      loadConferenceData(fullConf.code);

      // Clean up modal states on successful join
      setIsTicketModalOpen(false);
      setTicketConferenceCode('');
      setTicketCodeVal('');
      setTicketError('');

      if (typeof conf === 'string') showToast(t.scanner.success);
    } catch (err) {
      console.error('Join error:', err);
      if (err.message === 'TICKET_REQUIRED') {
        setTicketConferenceCode(code);
        setIsTicketModalOpen(true);
        setTicketError('');
      } else if (err.message === 'INVALID_TICKET' || err.message === 'TICKET_USED') {
        setTicketError(localizeError(err.message));
      } else if (err.message === 'CONFERENCE_ENDED') {
        // Hard block — never enter an ended conference
        showToast('🏁 Конференция завершена и недоступна для входа.', 'error');
      } else if (err.message === 'CONFERENCE_NOT_STARTED') {
        // Hard block — conference not started yet
        showToast('⏳ Конференция ещё не началась. Ожидайте старта от организатора.', 'warning');
      } else {
        // Fallback only for genuine network/server errors, and only if not ended
        if (typeof conf === 'object' && conf.id && !conf.isEnded) {
          setActiveConference(conf);
          setAccessPhase(conf.accessPhase || 'free');
          setActiveTab('conf_home');
          loadConferenceData(conf.code);
        } else {
          showToast(localizeError(err.message), 'error');
        }
      }
    }
  }, [api, showToast, localizeError, loadConferenceData]);

  const leaveConference = () => {
    setActiveConference(null);
    setActiveTab('conferences');
    setParticipants([]);
    setPolls([]);
    setQuestions([]);
    setChatList([]);
    fetchDashboardData(); // Refresh lists so the "left" conference shows updated state
  };

  const authenticateToken = useCallback(async () => {
    try {
      const data = await api.getProfile();
      if (data && data.profile) {
        if (data.profile.isBlocked) {
          setIsBlockedAccount(true);
          setProfile(data.profile);
          setUser({ id: data.profile.telegramId });
          return;
        }
        setUser({
          id: data.profile.telegramId,
          firstName: data.profile.firstName,
          lastName: data.profile.lastName,
          username: data.profile.username
        });
        setProfile(data.profile);

        try {
          const dashData = await api.getDashboardData();
          setConferences(dashData.conferences || []);
          setActiveConferences(dashData.activeConferences || []);
          setPastConferences(dashData.pastConferences || []);
        } catch (dashErr) {
          console.error('[AUTH] Fetch dashboard data error:', dashErr);
        }

        if (!data.profile.onboardingCompleted) {
          setActiveTab('profile');
        } else {
          const savedTab = localStorage.getItem('activeTab');
          if (savedTab && savedTab !== 'profile') {
            setActiveTab(savedTab);
          } else {
            setActiveTab('home');
          }
        }
      }
    } catch (err) {
      console.error('[AUTH] Token authentication failed:', err);
      if (err.message?.includes('ACCOUNT_BLOCKED') || err.message?.includes('заблокирован')) {
        setIsBlockedAccount(true);
        setBootError(err.message || 'Аккаунт заблокирован');
        return;
      }
      api.setToken('');
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Always enforce Light/White theme
  useEffect(() => {
    document.body.classList.remove('dark');
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.classList.remove('dark');
    }
  }, []);

  // Toggle has-nav class on root element for desktop sidebar padding
  useEffect(() => {
    const showNav = user && activeTab !== 'global_admin' && !isScannerOpen && !isQRModalOpen;
    const rootEl = document.getElementById('root');
    if (rootEl) {
      if (showNav) {
        rootEl.classList.add('has-nav');
      } else {
        rootEl.classList.remove('has-nav');
      }
    }
  }, [user, activeTab, isScannerOpen, isQRModalOpen]);

  // Disable body scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = isScannerOpen || isQRModalOpen || isNotificationsOpen || isMemberModalOpen || isPaymentOpen || isChatRequestOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isScannerOpen, isQRModalOpen, isNotificationsOpen, isMemberModalOpen, isPaymentOpen, isChatRequestOpen]);

  // Sync activeTab and activeConference changes to localStorage
  useEffect(() => {
    if (activeTab) {
      localStorage.setItem('activeTab', activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeConference) {
      localStorage.setItem('activeConference', JSON.stringify(activeConference));
    } else {
      localStorage.removeItem('activeConference');
    }
  }, [activeConference]);

  // Restore active conference data on load or change
  useEffect(() => {
    if (activeConference?.code) {
      loadConferenceData(activeConference.code);
    }
  }, [activeConference?.code, loadConferenceData]);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const token = localStorage.getItem('token');
    const tg = window.Telegram?.WebApp;

    api.init();

    // Fetch public settings on startup
    api.getPublicSettings()
      .then(data => {
        if (data) setSystemSettings(data);
      })
      .catch(err => console.error('[BOOT] Failed to fetch system settings:', err));

    if (token) {
      authenticateToken();
    } else if (tg && tg.initData) {
      tg.ready();
      tg.expand();
      authenticate(tg.initData);
    } else {
      // Allow mock user on localhost if URL search parameters ask for it, or fall back to Landing page
      const params = new URLSearchParams(window.location.search);
      if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && params.get('mock') === 'true') {
        console.log('[AUTH] Mock Mode activated on localhost');
        setUser({ id: '12345', firstName: 'Dablo', lastName: 'User' });
        setProfile({
          firstName: 'Dablo', lastName: 'User', username: 'dablo_dev',
          interests: ['AI', 'React'], bio: 'Frontend Developer.',
          telegram: 'dablo_dev', whatsapp: '+79001234567',
          about: 'Разрабатываю крутые интерфейсы', lookingFor: 'Интересные проекты',
          company: 'Freelance', position: 'Senior Developer',
          country: 'Россия', region: 'Московская область',
          city: 'Москва', email: 'mail@mail.ru', phone: '+7 (999) 000-00-00',
          onboardingCompleted: true,
        });
        fetchConferences();
        setLoading(false);
      } else {
        // Standalone browser mode - will trigger LandingView
        setLoading(false);
      }
    }
  }, [authenticate, authenticateToken, fetchConferences]);

  useEffect(() => {
    if (user && !bootError) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications, bootError]);

  useEffect(() => {
    if (activeTab === 'networking' && !activeConference) {
      fetchGlobalUsers();
    }
  }, [activeTab, activeConference, fetchGlobalUsers]);

  // Refresh profile stats (meetings, connections) when user visits the profile tab
  useEffect(() => {
    if (activeTab === 'profile' && user) {
      api.getProfile().then(data => {
        if (data?.profile) setProfile(data.profile);
      }).catch(err => console.error('[Profile Tab] Refresh error:', err));
    }
  }, [activeTab, user]);

  // Load conference specific data when activeConference changes
  useEffect(() => {
    if (activeConference?.code) {
      loadConferenceData(activeConference.code);
    }
  }, [activeConference?.code, loadConferenceData]);

  // Handle automatic data refreshing when switching to chat tabs
  useEffect(() => {
    if (activeTab === 'messaging') {
      fetchChatList(); // Global chats
    } else if (activeTab === 'conf_chats' && activeConference?.code) {
      fetchChatList(activeConference.code); // Scoped chats
    }
  }, [activeTab, activeConference, fetchChatList]);

  // Consolidated Conference & Notification Polling (3s)
  useEffect(() => {
    const poll = async () => {
      // Always poll notifications and chat requests
      fetchNotifications();
      fetchChatRequests();

      // If in conference, poll specialized data
      if (activeConference?.code) {
        loadConferenceData(activeConference.code);
        const currentTab = activeTabRef.current;
        if (currentTab === 'conf_chats' || currentTab === 'conf_chat_detail') {
          fetchChatList(activeConference.code);
        } else {
          fetchChatList();
        }
      } else {
        // Global polling
        fetchChatList();
        fetchConferences();
      }

      // If in a specific chat, poll messages
      const currentChat = selectedConfChat || initialDirectChat;
      if (isInChat && currentChat?.other?.id) {
        const targetId = currentChat.other.id;
        const code = currentChat.conferenceCode || activeConference?.code || null;
        try {
          const data = await api.getChatMessages(targetId, code);
          setChatMessages(data.messages || []);
        } catch (err) {
          console.error('Chat polling error:', err);
        }
      }
    };

    const pollIntervalTime = isInChat ? 5000 : 30000;
    const interval = setInterval(poll, pollIntervalTime);
    return () => clearInterval(interval);
  }, [activeConference?.code, isInChat, selectedConfChat?.other?.id, initialDirectChat?.other?.id, fetchNotifications, loadConferenceData, fetchChatList, fetchChatRequests, fetchConferences]);

  const handleUpdateConference = async (updates) => {
    if (!activeConference?.id) return;
    try {
      const data = await api.updateConference(activeConference.id, updates);
      if (data.success) {
        // Merge updates into state immediately for instant UI refresh
        // reconcile name/title consistency
        const refinedUpdates = { ...updates };
        if (updates.title) refinedUpdates.name = updates.title;

        setActiveConference(prev => ({ ...prev, ...refinedUpdates }));
        showToast('Настройки обновлены');
        fetchDashboardData(); // Refresh underlying lists
      }
    } catch (err) {
      showToast(localizeError(err.message), 'error');
    }
  };

  const handleInitiatePayment = async () => {
    try {
      const data = await api.initiatePayment(activeConference?.code);
      if (data.paymentUrl) {
        window.open(data.paymentUrl, '_blank');
      }
    } catch (err) {
      console.error('Payment error:', err);
      showToast(localizeError(err.message), 'error');
    }
    setIsPaymentOpen(false);
  };

  // ── QR Scanner Lifecycle ──
  useEffect(() => {
    let html5QrCode = null;
    let timer = null;
    let isStarted = false;

    if (isScannerOpen && !scannerError) {
      // Small delay to ensure the #reader div is mounted in the DOM
      timer = setTimeout(async () => {
        try {
          // Initialize the low-level library
          html5QrCode = new Html5Qrcode("reader");
          scannerRef.current = html5QrCode;

          const config = {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          };

          await html5QrCode.start(
            { facingMode: "environment" }, // Prefer back camera
            config,
            (decodedText) => {
              // onSuccess
              html5QrCode.stop().catch(e => console.error("Scanner stop error:", e));
              setIsScannerOpen(false);
              joinConference(decodedText.trim().toUpperCase());
            },
            (errorMessage) => {
              // onScan (ignore constant scan failures)
            }
          );
          isStarted = true;
        } catch (err) {
          console.error("Scanner start failed:", err);
          showToast("Ошибка доступа к камере", "error");
          setScannerError(err.message || "Camera access denied");
        }
      }, 150);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (scannerRef.current) {
        if (isStarted) {
          scannerRef.current.stop().catch(() => { });
        }
        scannerRef.current = null;
      }
      if (!isScannerOpen) {
        setScannerError(null);
      }
    };
  }, [isScannerOpen, scannerError, joinConference, showToast]);


  // ── Loading state ─────────────────────────────────────────────────────────
  if (bootError) {
    return (
      <div className="container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', textAlign: 'center', padding: '24px' }}>
        <AlertTriangle size={48} style={{ color: '#d97706', marginBottom: '24px' }} />
        <h2 style={{ marginBottom: '12px' }}>Ошибка подключения</h2>
        <p style={{ color: '#a0aec0', marginBottom: '32px' }}>{bootError}</p>
        <button className="btn-solid" onClick={() => window.location.reload()}>Попробовать снова</button>
      </div>
    );
  }

  if (isBlockedAccount || (profile && profile.isBlocked)) {
    return (
      <div className="container animate-fade-in" style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        height: '100vh', width: '100vw', padding: '24px', textAlign: 'center',
        background: '#fef2f2', color: '#991b1b', position: 'fixed', inset: 0, zIndex: 9999
      }}>
        <Ban size={80} style={{ color: '#ef4444', marginBottom: '24px' }} />
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px', fontFamily: 'Outfit' }}>Доступ ограничен</h1>
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#7f1d1d', maxWidth: '400px', lineHeight: 1.6, marginBottom: '32px' }}>
          Ваш аккаунт заблокирован администратором системы. Если вы считаете, что это ошибка, пожалуйста, свяжитесь с поддержкой.
        </p>
        <div style={{ fontSize: '13px', color: '#b91c1c', fontWeight: 700, opacity: 0.8 }}>
          Telegram ID: {profile?.telegramId || user?.id}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="loader">{t.common.loading}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <LandingView
        systemSettings={systemSettings}
        onAuthSuccess={(data) => {
          api.setToken(data.token);
          setUser(data.user);
          setProfile(data.profile);
          setConferences(data.conferences || []);
          setActiveConferences(data.activeConferences || []);
          setPastConferences(data.pastConferences || []);
          if (data.profile?.onboardingCompleted) {
            setActiveTab('home');
          } else {
            setActiveTab('profile');
          }
        }}
      />
    );
  }

  if (activeTab === 'global_admin') {
    return (
      <div style={{ background: '#f8fafc', minHeight: '100vh', width: '100vw' }}>
        <GlobalAdminView
          currentUser={profile}
          showToast={showToast}
          onBack={() => setActiveTab('home')}
        />
      </div>
    );
  }

  return (
    <>
      <div className="animate-fade-in"
      // style={{ paddingBottom: 'var(--nav-height)' }}
      >
        {!['conf_chat_detail'].includes(activeTab) && !(activeTab === 'messaging') && (
          <Header
            user={user}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenNotifications={() => { setIsNotificationsOpen(true); fetchNotifications(); }}
            unreadCount={unreadCount}
          />
        )}

        <div className="container" style={{ minHeight: '100vh' }}>
          {/* ── Main Navigation Views ── */}
          {['home', 'networking', 'messaging', 'conferences', 'public_conferences', 'profile', 'create_conference', 'search_profiles', 'global_admin'].includes(activeTab) && (
            <>
              {activeTab === 'home' && (
                <HomeView
                  user={user}
                  accessPhase={accessPhase}
                  conferences={conferences.filter(c => !c.isEnded)}
                  polls={polls}
                  onJoin={(conf) => {
                    if (conf?.code) joinConference(conf);
                    else setActiveTab('public_conferences');
                  }}
                  onPolls={() => {
                    if (activeConference) setActiveTab('conf_polls');
                    else setActiveTab('conferences');
                  }}
                  showToast={showToast}
                />
              )}
              {activeTab === 'networking' && (
                <NetworkingView
                  onBack={() => setActiveTab('home')}
                  accessPhase={accessPhase}
                  onOpenPayment={() => setIsPaymentOpen(true)}
                  onViewProfile={(m) => { setSelectedMember(m); setIsMemberModalOpen(true); }}
                  participants={activeConference ? participants : globalUsers}
                  onSearch={(q) => activeConference ? null : fetchGlobalUsers(q)}
                  showToast={showToast}
                />
              )}
              {activeTab === 'messaging' && (
                <MessagingView
                  onChatStateChange={(state) => { setIsInChat(state); if (!state) setInitialDirectChat(null); }}
                  initialSelectedChat={initialDirectChat}
                  onViewProfile={(m) => { setSelectedMember(m); setIsMemberModalOpen(true); }}
                  chats={chatList}
                  messages={chatMessages}
                  onSelectChat={handleSelectChat}
                  onSendMessage={handleSendMessage}
                  showToast={showToast}
                  isSending={isSendingMessage}
                />
              )}
              {activeTab === 'conferences' && (
                <MyConferencesView
                  onBack={() => setActiveTab('home')}
                  activeConferences={activeConferences}
                  pastConferences={pastConferences}
                  onSelectConference={(conf) => {
                    joinConference(conf);
                  }}
                  onJoinMore={() => setActiveTab('public_conferences')}
                  onCreateNew={(() => {
                    const isAdmin = profile?.globalRole === 'main_admin' || user?.globalRole === 'main_admin';
                    if (isAdmin) return () => setActiveTab('create_conference');

                    if (!systemSettings.allowConferenceCreationUsers) return null;
                    if (profile?.allowConferenceCreation === false || user?.allowConferenceCreation === false) return null;

                    const hasPaid = !systemSettings.paidLimitsEnabled || user?.hasPaidAccess || profile?.hasPaidAccess;
                    if (hasPaid) {
                      return () => setActiveTab('create_conference');
                    } else {
                      return () => {
                        setIsPaymentOpen(true);
                        showToast(t.access.creation_tariff_required, 'info');
                      };
                    }
                  })()}
                />
              )}
              {activeTab === 'public_conferences' && (
                (!systemSettings.paidLimitsEnabled || user?.hasPaidAccess || profile?.hasPaidAccess) ? (
                  <PublicConferencesView
                    onBack={() => setActiveTab('conferences')}
                    onJoinConference={joinConference}
                    onCreateNew={(() => {
                      const isAdmin = profile?.globalRole === 'main_admin' || user?.globalRole === 'main_admin';
                      if (isAdmin) return () => setActiveTab('create_conference');

                      if (!systemSettings.allowConferenceCreationUsers) return null;
                      if (profile?.allowConferenceCreation === false || user?.allowConferenceCreation === false) return null;

                      const hasPaid = !systemSettings.paidLimitsEnabled || user?.hasPaidAccess || profile?.hasPaidAccess;
                      if (hasPaid) {
                        return () => setActiveTab('create_conference');
                      } else {
                        return () => {
                          setIsPaymentOpen(true);
                          showToast(t.access.creation_tariff_required, 'info');
                        };
                      }
                    })()}
                    conferences={conferences}
                    showToast={showToast}
                  />
                ) : (
                  <div className="animate-fade-in" style={{ padding: '24px 16px' }}>
                    <div className="card-soft" style={{
                      background: 'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)',
                      borderRadius: '32px',
                      padding: '40px 24px',
                      textAlign: 'center',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {/* Premium Badge */}
                      <div style={{
                        position: 'absolute', top: '16px', right: '16px',
                        background: 'rgba(255,255,255,0.1)', color: '#fbbf24',
                        padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 800
                      }}>
                        PRO
                      </div>

                      <div style={{ fontSize: '60px', marginBottom: '20px' }}>💎</div>

                      <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', marginBottom: '16px' }}>
                        Публичные конференции
                      </h2>

                      <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', lineHeight: 1.6, marginBottom: '32px', fontWeight: 500 }}>
                        {t.access.public_tariff_required} Откройте полный каталог событий и нетворкинг-сессий сообщества!
                      </p>

                      <div style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '24px',
                        padding: '20px',
                        textAlign: 'left',
                        marginBottom: '32px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 600 }}>
                          <span>🔓</span> <span>Поиск по всем открытым событиям</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 600 }}>
                          <span>➕</span> <span>Создание собственных конференций</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 600 }}>
                          <span>✉️</span> <span>Безлимитный нетворкинг и чаты</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button className="btn-solid" style={{
                          background: 'linear-gradient(90deg, #d97706 0%, #fbbf24 100%)',
                          color: 'black', fontWeight: 800, border: 'none', height: '56px', borderRadius: '18px'
                        }} onClick={() => setIsPaymentOpen(true)}>
                          💎 Активировать тариф
                        </button>
                        <button className="btn-outline" style={{
                          border: 'none', color: 'rgba(255,255,255,0.6)', background: 'transparent'
                        }} onClick={() => setActiveTab('conferences')}>
                          {t.common.back}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
              {activeTab === 'create_conference' && (
                <CreateConferenceView
                  onBack={() => setActiveTab('conferences')}
                  onCreate={handleCreateConference}
                  showToast={showToast}
                />
              )}
              {activeTab === 'profile' && profile?.onboardingCompleted && !isEditingProfile && (
                <ProfileView
                  profile={profile}
                  onEdit={() => setIsEditingProfile(true)}
                />
              )}
              {activeTab === 'profile' && (isEditingProfile || !profile?.onboardingCompleted) && (
                <ProfileForm
                  profile={profile}
                  onSave={async (data) => {
                    await handleUpdateProfile(data);
                    setIsEditingProfile(false);
                  }}
                  onCancel={() => {
                    if (profile?.onboardingCompleted) {
                      setIsEditingProfile(false);
                    } else {
                      setActiveTab('home');
                    }
                  }}
                  showToast={showToast}
                  hasTelegramId={!!(profile?.telegramId)}
                />
              )}
              {activeTab === 'search_profiles' && (
                <SearchProfilesView
                  profile={profile}
                  onBack={() => setActiveTab('home')}
                  onViewProfile={(m) => { setSelectedMember(m); setIsMemberModalOpen(true); }}
                  showToast={showToast}
                />
              )}
              {activeTab === 'global_admin' && (
                <GlobalAdminView
                  currentUser={profile}
                  showToast={showToast}
                />
              )}
            </>
          )}

          {/* ── QR Scanner ── */}
          {isScannerOpen && (
            <div className="animate-fade-in" style={{ position: 'fixed', inset: 0, left: 0, right: 0, top: 0, bottom: 0, width: '100vw', height: '100vh', background: '#0a0a0a', zIndex: 3000, display: 'flex', flexDirection: 'column', padding: '20px', boxSizing: 'border-box', overflow: 'hidden', justifyContent: 'space-between' }}>

              {/* Top Row: Title & Close Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', height: '50px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'white' }}>{t.scanner.title || 'Сканирование QR-кода'}</h3>
                <button
                  className="btn-round-back"
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '40px', height: '40px' }}
                  onClick={() => setIsScannerOpen(false)}
                  title={t.common.cancel}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Middle Section: Scanner Frame / Error */}
              <div style={{ flex: 1, width: '100%', maxWidth: '400px', margin: '12px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: 0 }}>
                {scannerError ? (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '24px',
                    border: '2px dashed rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                    textAlign: 'center',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '16px'
                    }}>
                      <AlertTriangle size={28} />
                    </div>
                    <h4 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700 }}>Доступ к камере заблокирован</h4>
                    <p style={{ color: '#a0aec0', margin: '0 0 20px 0', fontSize: '13px', lineHeight: 1.5 }}>
                      Для сканирования QR-кодов разрешите приложению доступ к камере в настройках браузера или устройства.
                    </p>
                    <button
                      className="btn-solid"
                      onClick={() => setScannerError(null)}
                      style={{ background: 'white', color: 'black', height: '40px', borderRadius: '12px', fontSize: '13px', fontWeight: 800, padding: '0 20px', border: 'none', cursor: 'pointer' }}
                    >
                      🔄 Попробовать снова
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="scanner-laser" />
                    <div
                      id="reader"
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        border: '2px solid rgba(255,255,255,0.15)',
                        background: '#000'
                      }}
                    />
                  </>
                )}
              </div>

              {/* Bottom Section: Manual Code Entry */}
              <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    className="form-input"
                    placeholder={t.scanner.placeholder || 'Код конференции'}
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', flex: 1, height: '48px', borderRadius: '16px', fontSize: '14px' }}
                  />
                  <button
                    className="btn-solid"
                    style={{ background: 'white', color: 'black', width: 'auto', padding: '0 20px', height: '48px', borderRadius: '16px', fontWeight: 800 }}
                    onClick={() => {
                      if (manualCode.trim()) {
                        joinConference(manualCode.trim().toUpperCase());
                        setIsScannerOpen(false);
                        setManualCode('');
                      }
                    }}
                  >
                    {t.scanner.btn || 'Вход'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Conference Context Views ── */}
          {activeConference && ['conf_home', 'conf_members', 'conf_ask', 'conf_polls', 'conf_questions', 'conf_chats', 'conf_chat_detail', 'conf_admin'].includes(activeTab) && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <button className="btn-outline" style={{ width: '36px', height: '36px', padding: 0, borderRadius: '14px', border: 'none', background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} onClick={leaveConference}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                </button>
                <div style={{ background: '#111111', padding: '10px 18px', borderRadius: '16px', fontSize: '12px', fontWeight: 800, color: 'white', letterSpacing: '0.4px' }}>
                  {(activeConference?.name || activeConference?.title || 'КОНФЕРЕНЦИЯ').toUpperCase()}
                </div>
              </div>

              {activeTab === 'conf_home' && (
                <ConferenceHomeView
                  conference={activeConference}
                  members={participants}
                  polls={polls}
                  questions={questions}
                  onSeeAllQuestions={() => setActiveTab('conf_questions')}
                  onSeeAllPolls={() => setActiveTab('conf_polls')}
                  onViewProfile={(m) => { setSelectedMember(m); setIsMemberModalOpen(true); }}
                  onShowQR={() => setIsQRModalOpen(true)}
                />
              )}
              {activeTab === 'conf_members' && (
                <ConferenceMembersView
                  members={participants}
                  requestStatus={requestStatuses}
                  rejectCounts={rejectCounts}
                  sendingRequests={sendingRequests}
                  onOpenChat={(member) => {
                    const chatObj = {
                      other: {
                        id: member.userId || member.telegramId || member.id,
                        name: member.displayName || member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim(),
                        avatarUrl: member.avatarUrl
                      },
                      conferenceCode: activeConference?.code || null
                    };
                    handleSelectChat(chatObj);
                    setActiveTab('conf_chat_detail');
                  }}
                  onViewProfile={(member) => { setSelectedMember(member); setIsMemberModalOpen(true); }}
                  onSendRequest={handleSendChatRequest}
                  showToast={showToast}
                />
              )}
              {activeTab === 'conf_ask' && (
                <ConferenceAskView
                  questions={questions.filter(q => q.isMyQuestion)}
                  onSeeAll={() => setActiveTab('conf_questions')}
                  onSubmitQuestion={handleAskQuestion}
                  showToast={showToast}
                />
              )}
              {activeTab === 'conf_polls' && (
                <ConferencePollsView polls={polls} onVote={handleVote} showToast={showToast} />
              )}
              {activeTab === 'conf_questions' && (
                <ConferenceQuestionsListView
                  questions={questions}
                  onBack={() => setActiveTab('conf_ask')}
                  onUpvote={handleUpvoteQuestion}
                />
              )}
              {activeTab === 'conf_chats' && (
                <ConferenceChatListView
                  chats={chatList}
                  onSelectChat={(chat) => {
                    handleSelectChat(chat);
                    setActiveTab('conf_chat_detail');
                  }}
                  onViewProfile={(m) => { setSelectedMember(m); setIsMemberModalOpen(true); }}
                />
              )}
              {activeTab === 'conf_chat_detail' && (
                <ConferenceChatDetailView
                  chat={selectedConfChat}
                  messages={chatMessages}
                  onBack={() => setActiveTab('conf_chats')}
                  onSendMessage={handleSendMessage}
                  showToast={showToast}
                  isSending={isSendingMessage}
                />
              )}
              {activeTab === 'conf_admin' && (
                <ConferenceDashboardView
                  conference={activeConference}
                  polls={polls}
                  questions={questions}
                  onCreatePoll={handleCreatePoll}
                  onTogglePoll={handleTogglePoll}
                  onDeletePoll={handleDeletePoll}
                  onUpdateQuestionStatus={handleUpdateQuestionStatus}
                  onDeleteQuestion={handleDeleteQuestion}
                  onUpdateSettings={handleUpdateConference}
                  currentUser={profile}
                />
              )}
            </>
          )}

          {/* ── Incomplete profile confirmation ── */}
          {activeTab === 'profile' && profile?.isIncomplete && (
            <div className="card-soft animate-fade-in" style={{ textAlign: 'center', padding: '40px 24px', borderRadius: '32px' }}>
              <div style={{ width: '90px', height: '90px', borderRadius: '45px', background: '#111111', margin: '0 auto 28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', color: 'white', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                {profile?.firstName?.[0] || 'U'}
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>{t.onboarding.confirm_title}</h2>
              <p style={{ marginBottom: '32px', color: '#a0aec0', fontWeight: 500 }}>{t.onboarding.confirm_desc}</p>

              <div className="card-soft" style={{ textAlign: 'left', marginBottom: '32px', background: '#f8fafc', padding: '20px', border: 'none' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#a0aec0', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Имя Фамилия</div>
                <div style={{ fontWeight: 700, color: 'var(--primary-text)', fontSize: '17px' }}>{profile.firstName} {profile.lastName}</div>
                {profile.username && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#a0aec0', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Username</div>
                    <div style={{ fontWeight: 700, color: 'var(--primary-text)', fontSize: '17px' }}>@{profile.username}</div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button className="btn-solid" onClick={() => handleUpdateProfile({ ...profile, isIncomplete: false, onboardingCompleted: true })}>
                  {t.onboarding.accept_btn}
                </button>
                <button className="btn-outline" onClick={() => setProfile({ ...profile, isIncomplete: false })}>
                  {t.onboarding.edit_btn}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onPay={handleInitiatePayment}
      />

      <QRGeneratorModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        conferenceCode={activeConference?.code}
        title={activeConference?.name || activeConference?.title}
      />

      {isTicketModalOpen && (
        <div className="modal-overlay animate-fade-in" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', zIndex: 3000
        }}>
          <div className="card-soft" style={{
            width: '100%', maxWidth: '340px', padding: '32px',
            textAlign: 'center', background: '#ffffff', borderRadius: '32px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: 'none'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎟️</div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary-text)', marginBottom: '8px' }}>
              {t.access.ticket_modal_title}
            </h2>
            <p style={{ color: '#a0aec0', fontSize: '14px', fontWeight: 500, lineHeight: 1.5, marginBottom: '24px' }}>
              {t.access.ticket_modal_desc}
            </p>

            <div style={{ marginBottom: '24px' }}>
              <input
                className="form-input"
                placeholder={t.access.ticket_placeholder}
                value={ticketCodeVal}
                onChange={(e) => {
                  setTicketCodeVal(e.target.value);
                  setTicketError('');
                }}
                style={{
                  width: '100%', padding: '16px', borderRadius: '16px',
                  border: '1.5px solid #edf2f7', background: '#f8fafc',
                  color: 'var(--primary-text)', fontSize: '15px', fontWeight: 600,
                  textAlign: 'center'
                }}
              />
              {ticketError && (
                <div style={{ color: '#e53e3e', fontSize: '12px', fontWeight: 600, marginTop: '8px' }}>
                  ⚠️ {ticketError}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button className="btn-solid" style={{ height: '54px', borderRadius: '16px', fontWeight: 800 }} onClick={() => {
                if (ticketCodeVal.trim()) {
                  joinConference(ticketConferenceCode, ticketCodeVal.trim());
                } else {
                  setTicketError('Введите штрих-код билета');
                }
              }}>
                {t.access.ticket_submit}
              </button>
              <button className="btn-outline" style={{ border: 'none', height: '54px', fontWeight: 700 }} onClick={() => {
                setIsTicketModalOpen(false);
                setTicketConferenceCode('');
                setTicketCodeVal('');
                setTicketError('');
              }}>
                {t.common.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {isNotificationsOpen && (
        <NotificationsDrawer
          onClose={() => setIsNotificationsOpen(false)}
          notifications={notifications}
          requestStatuses={requestStatuses}
          onOpenRequest={(req) => {
            const senderId = req.from?.telegramId;
            const status = senderId ? requestStatuses[senderId] : null;
            if (status && status !== 'pending') {
              showToast('Этот запрос уже обработан', 'info');
              return;
            }
            setPendingRequest(req);
            setIsChatRequestOpen(true);
            setIsNotificationsOpen(false);
          }}
          onClickNotification={(notificationId) => {
            api.markNotificationRead(notificationId)
              .then(() => fetchNotifications())
              .catch(err => console.error('Error marking notification read:', err));
          }}
          onMarkAllRead={() => {
            api.markAllNotificationsRead().then(fetchNotifications);
          }}
        />
      )}

      <MemberProfileModal
        isOpen={isMemberModalOpen}
        member={selectedMember}
        currentUserTelegramId={profile?.telegramId}
        requestStatus={requestStatuses}
        rejectCounts={rejectCounts}
        isRequestsLoaded={isRequestsLoaded}
        onClose={() => setIsMemberModalOpen(false)}
        onSendRequest={handleSendChatRequest}
        onOpenChat={(m) => {
          setIsMemberModalOpen(false);
          const targetId = m.userId || m.telegramId || m.id;

          // Find the accepted request to determine context
          const req = chatRequests.find(r =>
            r.status === 'accepted' &&
            (String(r.from?.telegramId) === String(targetId) || String(r.to?.telegramId) === String(targetId))
          );

          const chatObj = {
            other: {
              id: targetId,
              name: m.displayName || m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim(),
              avatarUrl: m.avatarUrl
            },
            conferenceCode: req?.conference ? req.conference.code : null
          };

          if (req?.conference) {
            handleSelectChat(chatObj);
            setActiveTab('conf_chat_detail');
          } else {
            setInitialDirectChat(chatObj);
            handleSelectChat(chatObj);
            setActiveTab('messaging');
          }
        }}
      />

      {isChatRequestOpen && pendingRequest && (
        <div className="modal-overlay">
          <div className="card-soft" style={{ width: '100%', maxWidth: '340px', padding: '32px', textAlign: 'center', position: 'relative' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '40px', background: 'rgba(228, 96, 248, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 10px 20px rgba(0,0,0,0.02)', color: 'var(--accent-purple)' }}>
              <User size={40} />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>Новый запрос</h2>
            <p style={{ color: '#718096', fontSize: '14px', marginBottom: '28px', lineHeight: 1.5 }}>
              {pendingRequest.conference?.name ? (
                <>
                  <b>{pendingRequest.from?.name || pendingRequest.sender}</b> хочет начать с вами чат в конференции <b>{pendingRequest.conference.name}</b>.
                </>
              ) : (
                <>
                  <b>{pendingRequest.from?.name || pendingRequest.sender}</b> хочет начать с вами прямой чат.
                </>
              )}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button className="btn-solid" onClick={() => handleAcceptChatRequest(pendingRequest.id)}>
                Принять
              </button>
              <button className="btn-outline" style={{ border: 'none' }} onClick={() => handleRejectChatRequest(pendingRequest.id)}>
                Отклонить
              </button>
            </div>
          </div>
        </div>
      )}
      {
        !isScannerOpen && (isDesktop || (!isInChat && !isMemberModalOpen && !isChatRequestOpen && !isNotificationsOpen)) && !isPaymentOpen && !isQRModalOpen && (
          <>
            {(!activeConference) ? (
              <MainNavigationBar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onOpenScanner={() => setIsScannerOpen(true)}
                isMainAdmin={profile?.globalRole === 'main_admin'}
              />
            ) : (
              <ConferenceNavigationBar activeTab={activeTab} setActiveTab={setActiveTab} myRole={activeConference.myRole} />
            )}
          </>
        )
      }
      <DebugConsole />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClick={toast.onClick}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

export default App;
