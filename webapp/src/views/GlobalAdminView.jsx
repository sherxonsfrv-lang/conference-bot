import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Settings, Users, Calendar, BarChart3, FileText, ArrowLeft,
  Download, Search, RefreshCw, Bell, Trash2, ShieldAlert,
  Check, Lock, Unlock, TrendingUp, Info, UserCheck, Play, StopCircle,
  Clipboard, Plus, CheckCircle, XCircle, Shield, Award, Mail, Ban,
  Sparkles, DollarSign, Activity, ChevronRight, UserMinus, Globe
} from 'lucide-react';

const GlobalAdminView = ({ currentUser, showToast, onBack }) => {
  const [activeMenu, setActiveMenu] = useState('settings');
  const [users, setUsers] = useState([]);
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Settings State
  const [settings, setSettings] = useState({
    allowConferenceCreationUsers: true,
    allowTelegramLogin: true,
    paidLimitsEnabled: true,
    tariffPrice: 249
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Modals State
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  const [notifyUserId, setNotifyUserId] = useState(null);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyBody, setNotifyBody] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);

  const [isCreateConfOpen, setIsCreateConfOpen] = useState(false);
  const [newConf, setNewConf] = useState({
    name: '',
    description: '',
    location: '',
    startsAt: '',
    endsAt: '',
    access: 'public',
    maxParticipants: 100
  });
  const [creatingConf, setCreatingConf] = useState(false);

  // Analytics State
  const [analytics, setAnalytics] = useState(null);

  const fetchSettings = async () => {
    try {
      const data = await api.adminGetSettings();
      if (data && data.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      showToast(err.message || 'Ошибка загрузки настроек', 'error');
    }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.adminUpdateSettings(settings);
      showToast('Настройки системы успешно сохранены');
    } catch (err) {
      showToast(err.message || 'Ошибка сохранения настроек', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetUsers();
      setUsers(data.users || []);
    } catch (err) {
      showToast(err.message || 'Ошибка загрузки пользователей', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchConferences = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetConferences();
      setConferences(data.conferences || []);
    } catch (err) {
      showToast(err.message || 'Ошибка загрузки конференций', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetAnalytics();
      setAnalytics(data);
    } catch (err) {
      showToast(err.message || 'Ошибка загрузки аналитики', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeMenu === 'settings') {
      fetchSettings();
    } else if (activeMenu === 'users') {
      fetchUsers();
    } else if (activeMenu === 'conferences') {
      fetchConferences();
    } else if (activeMenu === 'analytics') {
      fetchAnalytics();
    }
  }, [activeMenu]);

  // User Actions
  const handleToggleBlock = async (userId, currentBlocked) => {
    const act = currentBlocked ? 'разблокировать' : 'заблокировать';
    if (!window.confirm(`Вы уверены, что хотите ${act} этого пользователя?`)) return;

    try {
      await api.adminUpdateUser(userId, { isBlocked: !currentBlocked });
      showToast(`Пользователь успешно ${currentBlocked ? 'разблокирован' : 'заблокирован'}`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBlocked: !currentBlocked } : u));
    } catch (err) {
      showToast(err.message || 'Ошибка изменения статуса блокировки', 'error');
    }
  };

  const handleUpdateRating = async (userId, newRating) => {
    try {
      await api.adminUpdateUser(userId, { rating: parseFloat(newRating) });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, rating: parseFloat(newRating) } : u));
    } catch (err) {
      showToast(err.message || 'Ошибка изменения рейтинга', 'error');
    }
  };

  const handleToggleCreation = async (userId, currentValue) => {
    try {
      await api.adminUpdateUser(userId, { allowConferenceCreation: !currentValue });
      showToast('Права создания конференций обновлены');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, allowConferenceCreation: !currentValue } : u));
    } catch (err) {
      showToast(err.message || 'Ошибка обновления', 'error');
    }
  };

  const handleToggleAdminRole = async (userId, currentRole) => {
    const nextRole = currentRole === 'main_admin' ? 'user' : 'main_admin';
    if (!window.confirm(`Вы действительно хотите изменить роль на ${nextRole === 'main_admin' ? 'Администратора' : 'Пользователя'}?`)) return;
    try {
      await api.adminUpdateUser(userId, { globalRole: nextRole });
      showToast('Глобальная роль успешно изменена');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, globalRole: nextRole } : u));
    } catch (err) {
      showToast(err.message || 'Ошибка обновления роли', 'error');
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notifyTitle.trim() || !notifyBody.trim()) {
      showToast('Заполните тему и текст уведомления', 'error');
      return;
    }
    setSendingNotification(true);
    try {
      await api.adminNotifyUser(notifyUserId, notifyTitle, notifyBody);
      showToast('Уведомление успешно доставлено');
      setIsNotifyOpen(false);
      setNotifyTitle('');
      setNotifyBody('');
    } catch (err) {
      showToast(err.message || 'Ошибка отправки', 'error');
    } finally {
      setSendingNotification(false);
    }
  };

  // Conference Actions
  const handleToggleConfActive = async (confId, currentValue) => {
    try {
      await api.adminUpdateConference(confId, { isActive: !currentValue });
      showToast('Статус активности конференции изменен');
      setConferences(prev => prev.map(c => c.id === confId ? { ...c, isActive: !currentValue } : c));
    } catch (err) {
      showToast(err.message || 'Ошибка изменения статуса', 'error');
    }
  };

  const handleDeleteConference = async (confId) => {
    if (!window.confirm('Вы действительно хотите полностью удалить эту конференцию? Это действие необратимо.')) return;
    try {
      await api.adminDeleteConference(confId);
      showToast('Конференция удалена', 'warning');
      setConferences(prev => prev.filter(c => c.id !== confId));
    } catch (err) {
      showToast(err.message || 'Ошибка удаления конференции', 'error');
    }
  };

  const handleCreateConference = async (e) => {
    e.preventDefault();
    if (!newConf.name.trim()) {
      showToast('Введите название события', 'error');
      return;
    }
    setCreatingConf(true);
    try {
      await api.adminCreateConference(newConf);
      showToast('Конференция успешно создана');
      setIsCreateConfOpen(false);
      setNewConf({
        name: '',
        description: '',
        location: '',
        startsAt: '',
        endsAt: '',
        access: 'public',
        maxParticipants: 100
      });
      fetchConferences();
    } catch (err) {
      showToast(err.message || 'Ошибка создания конференции', 'error');
    } finally {
      setCreatingConf(false);
    }
  };

  // Export Analytics (CSV)
  const handleExportCSV = () => {
    if (users.length === 0) {
      showToast('Нет данных пользователей для экспорта', 'error');
      return;
    }
    const headers = ['ID', 'Telegram ID', 'Имя', 'Фамилия', 'Username', 'Email', 'Телефон', 'Компания', 'Должность', 'Рейтинг', 'Роль', 'Блокировка', 'Оплата', 'Дата регистрации'];
    const rows = users.map(u => [
      u.id,
      u.telegramId,
      u.firstName || '',
      u.lastName || '',
      u.username ? `@${u.username}` : '',
      u.email || '',
      u.phone || '',
      u.company || '',
      u.position || '',
      u.rating !== undefined ? u.rating : 5.0,
      u.globalRole,
      u.isBlocked ? 'Заблокирован' : 'Активен',
      u.allowConferenceCreation ? 'Разрешено' : 'Запрещено',
      new Date(u.createdAt).toLocaleDateString()
    ]);

    // Use BOM \uFEFF to support Cyrillic characters in Excel
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `users_metrics_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Файл Excel (CSV) загружен');
  };

  // Download Code of Demo Showcase Page
  const handleDownloadDemoCode = async () => {
    try {
      const res = await fetch('/demo-overview.html');
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "demo-overview.html");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Код демонстрационной страницы загружен');
    } catch (err) {
      showToast('Не удалось загрузить код страницы', 'error');
    }
  };

  // Filters
  const filteredUsers = users.filter(u =>
    `${u.firstName || ''} ${u.lastName || ''} ${u.username || ''} ${u.email || ''} ${u.telegramId || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredConferences = conferences.filter(c =>
    `${c.title || ''} ${c.conferenceCode || ''} ${c.organizer?.firstName || ''} ${c.organizer?.lastName || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen w-full bg-white border border-zinc-200 rounded-lg shadow-sm text-zinc-950 font-sans animate-fade-in">
      {/* Sidebar Navigation */}
      <aside className="w-64 sticky top-0 h-[97vh] border-r border-zinc-200 bg-zinc-50/40 flex flex-col justify-between p-6 shrink-0">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 px-2 py-1">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-md object-cover" />
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900">Привет!</h2>
          </div>

          <nav className="flex flex-col gap-1">
            <button
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors text-left w-full cursor-pointer ${activeMenu === 'settings'
                  ? 'bg-zinc-100 text-zinc-900 font-semibold'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              onClick={() => { setActiveMenu('settings'); setSearch(''); }}
            >
              <Settings size={16} /> Настройки системы
            </button>
            <button
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors text-left w-full cursor-pointer ${activeMenu === 'users'
                  ? 'bg-zinc-100 text-zinc-900 font-semibold'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              onClick={() => { setActiveMenu('users'); setSearch(''); }}
            >
              <Users size={16} /> Картотека пользователей
            </button>
            <button
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors text-left w-full cursor-pointer ${activeMenu === 'conferences'
                  ? 'bg-zinc-100 text-zinc-900 font-semibold'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              onClick={() => { setActiveMenu('conferences'); setSearch(''); }}
            >
              <Calendar size={16} /> Управление событиями
            </button>
            <button
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors text-left w-full cursor-pointer ${activeMenu === 'analytics'
                  ? 'bg-zinc-100 text-zinc-900 font-semibold'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              onClick={() => { setActiveMenu('analytics'); setSearch(''); }}
            >
              <BarChart3 size={16} /> Отчеты и статистика
            </button>
            <button
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors text-left w-full cursor-pointer ${activeMenu === 'showcase'
                  ? 'bg-zinc-100 text-zinc-900 font-semibold'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              onClick={() => { setActiveMenu('showcase'); setSearch(''); }}
            >
              <Globe size={16} /> Страница-презентация
            </button>
          </nav>
        </div>

        <div className="pt-4 border-t border-zinc-200">
          <button
            className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-zinc-200 bg-white text-zinc-900 text-xs font-medium rounded-md hover:bg-zinc-50 transition-colors shadow-sm cursor-pointer"
            onClick={onBack}
          >
            <ArrowLeft size={14} /> Вернуться назад
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-8 overflow-y-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-zinc-200 gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
              {activeMenu === 'settings' && <><Settings className="w-6 h-6 text-zinc-500" /> Настройки системы</>}
              {activeMenu === 'users' && <><Users className="w-6 h-6 text-zinc-500" /> Картотека пользователей</>}
              {activeMenu === 'conferences' && <><Calendar className="w-6 h-6 text-zinc-500" /> Управление событиями</>}
              {activeMenu === 'analytics' && <><BarChart3 className="w-6 h-6 text-zinc-500" /> Отчеты и статистика</>}
              {activeMenu === 'showcase' && <><FileText className="w-6 h-6 text-zinc-500" /> Страница-презентация</>}
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              {activeMenu === 'settings' && 'Управление глобальными настройками, лимитами и тарифами.'}
              {activeMenu === 'users' && 'Просмотр списка зарегистрированных участников, управление правами и блокировками.'}
              {activeMenu === 'conferences' && 'Создание, закрытие и удаление конференций в системе.'}
              {activeMenu === 'analytics' && 'Генерация отчетов, экспорт данных и просмотр ключевых метрик.'}
              {activeMenu === 'showcase' && 'Публичные материалы и файлы презентации проекта.'}
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
           <div className="flex items-center gap-3">
             {activeMenu === 'conferences' && (
              <button
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer"
                onClick={() => setIsCreateConfOpen(true)}
              >
                <Plus size={16} /> Создать конференцию
              </button>
            )}



            <button
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm cursor-pointer"
              onClick={() => {
                if (activeMenu === 'settings') fetchSettings();
                else if (activeMenu === 'users') fetchUsers();
                else if (activeMenu === 'conferences') fetchConferences();
                else if (activeMenu === 'analytics') fetchAnalytics();
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Обновить</span>
            </button>
           </div>

            {['users', 'conferences'].includes(activeMenu) && (
              <div className="relative w-full">
                <Search size={16} className="absolute left-3 top-2.5 text-zinc-400" />
                <input
                  className="w-full pl-9 pr-3 py-1.5 border border-zinc-200 rounded-md text-sm placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 focus-visible:border-zinc-950"
                  placeholder={activeMenu === 'users' ? 'Поиск пользователей...' : 'Поиск конференций...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
          </div>
        </header>

        <section className="flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-4">
              <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
              <p className="text-sm font-medium">Загрузка данных...</p>
            </div>
          ) : (
            <>
              {/* SETTINGS VIEW */}
              {activeMenu === 'settings' && (
                <form onSubmit={saveSettings} className="space-y-6 max-w-4xl animate-fade-in">
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Switch Card 1 */}
                    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <h4 className="text-sm font-semibold leading-none tracking-tight text-zinc-900">Создание конференций</h4>
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={settings.allowConferenceCreationUsers}
                              onChange={(e) => setSettings({ ...settings, allowConferenceCreationUsers: e.target.checked })}
                            />
                            <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-zinc-900"></div>
                          </label>
                        </div>
                        <p className="text-xs text-zinc-500 leading-normal">
                          Разрешить стандартным участникам системы самостоятельно создавать свои конференции в приложении.
                        </p>
                      </div>
                      <div className="text-[10px] font-medium text-zinc-400">
                        * Если выключено, обычные пользователи не смогут создавать события.
                      </div>
                    </div>

                    {/* Switch Card 2 */}
                    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <h4 className="text-sm font-semibold leading-none tracking-tight text-zinc-900">Вход через Telegram</h4>
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={settings.allowTelegramLogin}
                              onChange={(e) => setSettings({ ...settings, allowTelegramLogin: e.target.checked })}
                            />
                            <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-zinc-900"></div>
                          </label>
                        </div>
                        <p className="text-xs text-zinc-500 leading-normal">
                          Разрешить вход и автоматическую регистрацию на сайте с помощью связки с официальным Telegram-ботом.
                        </p>
                      </div>
                      <div className="text-[10px] font-medium text-zinc-400">
                        * При отключении пользователи смогут входить только через email и пароль.
                      </div>
                    </div>

                    {/* Switch Card 3 */}
                    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <h4 className="text-sm font-semibold leading-none tracking-tight text-zinc-950 font-semibold font-semibold">Платные лимиты тарифов (Paywall)</h4>
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={settings.paidLimitsEnabled}
                              onChange={(e) => setSettings({ ...settings, paidLimitsEnabled: e.target.checked })}
                            />
                            <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-zinc-900"></div>
                          </label>
                        </div>
                        <p className="text-xs text-zinc-500 leading-normal">
                          Ограничения на нетворкинг и количество событий. Если отключено, все функции бесплатны для пользователей.
                        </p>
                      </div>
                      <div className="text-[10px] font-medium text-zinc-400">
                        * Выключите лимиты, чтобы сделать приложение полностью бесплатным.
                      </div>
                    </div>

                    {/* Price Input Card */}
                    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm flex flex-col justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-semibold leading-none tracking-tight text-zinc-950 font-semibold mb-2">Цена премиум-доступа подписки</h4>
                        <div className="flex items-center gap-3 mt-3">
                          <input
                            type="number"
                            className="w-32 px-3 py-1.5 border border-zinc-200 rounded-md text-sm font-semibold text-zinc-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 focus-visible:border-zinc-950"
                            value={settings.tariffPrice}
                            onChange={(e) => setSettings({ ...settings, tariffPrice: parseInt(e.target.value, 10) || 0 })}
                            required
                          />
                          <span className="text-sm font-semibold text-zinc-700">рублей (₽)</span>
                        </div>
                        <p className="text-xs text-zinc-500 leading-normal mt-2">
                          Стоимость активации тарифа для получения безлимитного доступа ко всем функциям и чатам.
                        </p>
                      </div>
                      <div className="text-[10px] font-medium text-zinc-400">
                        * Изменения применяются мгновенно.
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-md text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {savingSettings ? 'Сохранение...' : <> Сохранить настройки</>}
                    </button>
                  </div>
                </form>
              )}

              {/* USERS LIST VIEW */}
              {activeMenu === 'users' && (
                <div className="space-y-4 animate-fade-in">
                  {filteredUsers.length === 0 ? (
                    <div className="rounded-lg border border-zinc-200 border-dashed bg-white p-12 text-center text-zinc-500 text-sm">
                      Пользователи по вашему поисковому запросу не найдены
                    </div>
                  ) : (
                    filteredUsers.map(u => (
                      <div key={u.id} className={`rounded-lg border bg-white p-6 shadow-sm transition-all flex flex-col gap-6 ${u.isBlocked ? 'border-red-200 bg-red-50/10 opacity-90' : 'border-zinc-200'}`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700 text-lg font-semibold overflow-hidden border border-zinc-200 shrink-0">
                              {u.avatarUrl ? (
                                <img src={u.avatarUrl} alt={u.firstName} className="w-full h-full object-cover" />
                              ) : (
                                u.firstName?.[0] || 'U'
                              )}
                            </div>
                            <div>
                              <h4 className={`text-base font-semibold text-zinc-950 flex items-center gap-2 flex-wrap ${u.isBlocked ? 'line-through text-zinc-500' : ''}`}>
                                {u.firstName} {u.lastName || ''}
                                {u.isBlocked && (
                                  <span className="px-2.5 py-0.5 text-[10px] font-semibold border rounded-full bg-red-50 text-red-700 border-red-200 inline-flex items-center gap-1">
                                    <Ban size={10} /> Заблокирован
                                  </span>
                                )}
                              </h4>
                              <p className="text-xs text-zinc-500 mt-1">
                                <b>Telegram ID:</b> {u.telegramId} • <b>Username:</b> {u.username ? `@${u.username}` : 'не указан'}
                              </p>
                              {u.email && (
                                <p className="text-xs text-zinc-600 mt-1 flex items-center gap-1.5 font-medium">
                                  <Mail size={12} className="text-zinc-400" />
                                  <span>Email: {u.email}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center">
                            <span className={`px-2.5 py-0.5 text-[10px] font-semibold border rounded-full inline-flex items-center gap-1.5 ${u.globalRole === 'main_admin' ? 'bg-zinc-900 text-zinc-50 border-zinc-900' : 'bg-zinc-50 text-zinc-600 border-zinc-200'}`}>
                              <Shield size={10} /> {u.globalRole === 'main_admin' ? 'Администратор' : 'Пользователь'}
                            </span>
                          </div>
                        </div>

                        <div className="border-t border-zinc-100 pt-6 flex flex-col gap-6">
                          {/* Activity rating slider */}
                          {/* <div className="bg-zinc-50/50 border border-zinc-100 p-4 rounded-md">
                            <span className="text-xs font-semibold text-zinc-700 flex items-center gap-2">
                              <Award size={14} className="text-yellow-500" />
                              Текущий рейтинг активности: <b className="text-zinc-900 font-bold">{u.rating !== undefined ? u.rating.toFixed(1) : '5.0'}</b> из 10.0
                            </span>
                            <div className="flex items-center gap-4 mt-3">
                              <span className="text-[10px] text-zinc-400 font-medium">1.0</span>
                              <input
                                type="range"
                                min="1.0"
                                max="10.0"
                                step="0.5"
                                value={u.rating !== undefined ? u.rating : 5.0}
                                onChange={(e) => handleUpdateRating(u.id, e.target.value)}
                                className="flex-1 h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900 focus:outline-none"
                              />
                              <span className="text-[10px] text-zinc-400 font-medium">10.0</span>
                            </div>
                          </div> */}

                          <div className="space-y-2">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Действия администратора:</span>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full">
                              <button
                                className="h-8 px-3 rounded-md text-xs font-medium border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm inline-flex items-center justify-center gap-1.5 cursor-pointer"
                                onClick={() => handleToggleCreation(u.id, u.allowConferenceCreation)}
                              >
                                {u.allowConferenceCreation ? <><Lock size={12} className="text-amber-500" /> Запретить создание</> : <><Unlock size={12} className="text-emerald-500" /> Разрешить создание</>}
                              </button>

                              <button
                                className="h-8 px-3 rounded-md text-xs font-medium border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm inline-flex items-center justify-center gap-1.5 cursor-pointer"
                                onClick={() => handleToggleAdminRole(u.id, u.globalRole)}
                              >
                                {u.globalRole === 'main_admin' ? <><UserMinus size={12} className="text-red-500" /> Снять роль админа</> : <><UserCheck size={12} className="text-violet-500" /> Назначить админом</>}
                              </button>

                              <button
                                className="h-8 px-3 rounded-md text-xs font-medium border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm inline-flex items-center justify-center gap-1.5 cursor-pointer"
                                onClick={() => { setNotifyUserId(u.id); setIsNotifyOpen(true); }}
                              >
                                <Mail size={12} className="text-zinc-500" /> Отправить пуш
                              </button>

                              <button
                                className={`h-8 px-3 rounded-md text-xs font-medium shadow-sm inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors border ${u.isBlocked
                                    ? 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                                    : 'text-red-700 border-red-200 bg-red-50 hover:bg-red-100'
                                  }`}
                                onClick={() => handleToggleBlock(u.id, u.isBlocked)}
                              >
                                {u.isBlocked ? <><Unlock size={12} /> Разблокировать</> : <><Ban size={12} /> Заблокировать</>}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* CONFERENCES VIEW */}
              {activeMenu === 'conferences' && (
                <div className="space-y-4 animate-fade-in">
                  {filteredConferences.length === 0 ? (
                    <div className="rounded-lg border border-zinc-200 border-dashed bg-white p-12 text-center text-zinc-500 text-sm">
                      Конференции по вашему поисковому запросу не найдены
                    </div>
                  ) : (
                    filteredConferences.map(c => (
                      <div key={c.id} className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm hover:border-zinc-300 transition-colors flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex gap-4 items-start">
                            <div className="w-12 h-12 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center border border-pink-100 shrink-0">
                              {/* <Sparkles size={20} /> */}
                            </div>
                            <div>
                              <h4 className="text-base font-semibold text-zinc-950">{c.title}</h4>
                              <p className="text-xs text-zinc-500 mt-1">
                                <b>Код доступа:</b> <span className="font-mono text-zinc-900 font-semibold">{c.conferenceCode}</span> • <b>Лимит участников:</b> {c.maxParticipants || 50}
                              </p>
                              <p className="text-xs text-zinc-500 mt-1">
                                <b>Организатор:</b> {c.organizer ? `${c.organizer.firstName} ${c.organizer.lastName || ''}`.trim() : 'Администрация'}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0">
                            <span className={`px-2.5 py-0.5 text-[10px] font-semibold border rounded-full inline-flex items-center gap-1.5 ${c.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
                              {c.isActive ? <><CheckCircle size={10} /> Активна</> : <><XCircle size={10} /> Закрыта</>}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-zinc-100 pt-4 mt-2 gap-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500 font-medium">Статус доступа:</span>
                            <button
                              className={`h-8 px-3 rounded-md text-xs font-medium border shadow-sm inline-flex items-center gap-1.5 cursor-pointer transition-colors ${c.isActive
                                  ? 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100'
                                  : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                }`}
                              onClick={() => handleToggleConfActive(c.id, c.isActive)}
                            >
                              {c.isActive ? <><StopCircle size={12} /> Закрыть доступ</> : <><Play size={12} /> Открыть доступ</>}
                            </button>
                          </div>

                          <button
                            className="h-8 px-3 rounded-md text-xs font-medium text-red-600 border border-red-200 bg-white hover:bg-red-50 transition-colors shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                            onClick={() => handleDeleteConference(c.id)}
                          >
                            <Trash2 size={12} /> Удалить событие
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ANALYTICS VIEW */}
              {activeMenu === 'analytics' && analytics && (
                <div className="space-y-6 animate-fade-in" id="printable-analytics-report">
                  {/* Visual Dashboard Cards */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {/* KPI 1 */}
                    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col gap-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Пользователи</span>
                        <Users size={16} className="text-zinc-400" />
                      </div>
                      <div className="text-2xl font-bold tracking-tight text-zinc-900">{analytics.metrics?.totalUsers || 0}</div>
                      <div className="text-[10px] text-zinc-400">Всего участников в базе</div>
                    </div>

                    {/* KPI 2 */}
                    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col gap-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Всего событий</span>
                        <Calendar size={16} className="text-zinc-400" />
                      </div>
                      <div className="text-2xl font-bold tracking-tight text-zinc-900">{analytics.metrics?.totalConferences || 0}</div>
                      <div className="text-[10px] text-zinc-400">Конференций создано</div>
                    </div>

                    {/* KPI 3 */}
                    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col gap-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Активные</span>
                        <Activity size={16} className="text-zinc-400" />
                      </div>
                      <div className="text-2xl font-bold tracking-tight text-zinc-900">{analytics.metrics?.activeConferences || 0}</div>
                      <div className="text-[10px] text-zinc-400">Событий проходит сейчас</div>
                    </div>

                    {/* KPI 4 */}
                    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col gap-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Сборы</span>
                        <DollarSign size={16} className="text-zinc-400" />
                      </div>
                      <div className="text-2xl font-bold tracking-tight text-zinc-900">{analytics.metrics?.totalRevenue || 0} ₽</div>
                      <div className="text-[10px] text-zinc-400">Выручка от подписок</div>
                    </div>

                    {/* KPI 5 */}
                    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col gap-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Рейтинг</span>
                        <Award size={16} className="text-zinc-400" />
                      </div>
                      <div className="text-2xl font-bold tracking-tight text-zinc-900">{analytics.metrics?.avgRating || '5.0'}</div>
                      <div className="text-[10px] text-zinc-400">Средняя активность</div>
                    </div>
                  </div>

                  {/* Reports exporting block */}
                  <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
                    <h3 className="text-sm font-semibold tracking-tight text-zinc-900 mb-1">Выгрузка отчетов и Экспорт базы данных</h3>
                    <p className="text-xs text-zinc-500 mb-4">
                      Скачайте список всех пользователей со всеми данными в виде Excel-таблицы (формат CSV) или распечатайте официальный системный отчет в PDF.
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer"
                        onClick={handleExportCSV}
                      >
                        <Download size={16} /> Скачать таблицу CSV
                      </button>
                      <button
                        className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md text-sm font-medium border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm cursor-pointer"
                        onClick={() => window.print()}
                      >
                        <FileText size={16} /> Печать отчета PDF
                      </button>
                    </div>
                  </div>

                  {/* Recent Users Activity table */}
                  <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm overflow-hidden">
                    <h3 className="text-sm font-semibold tracking-tight text-zinc-900 mb-4 flex items-center gap-2">
                      <Users size={16} className="text-zinc-500" /> Последние 10 регистраций участников
                    </h3>
                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-zinc-200">
                            <th className="pb-3 pt-2 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Имя Участника</th>
                            <th className="pb-3 pt-2 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Username</th>
                            <th className="pb-3 pt-2 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Рейтинг</th>
                            <th className="pb-3 pt-2 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Статус</th>
                            <th className="pb-3 pt-2 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Дата</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.recentUsers?.map((u, i) => (
                            <tr key={i} className="hover:bg-zinc-50/50 transition-colors border-b border-zinc-100 last:border-0">
                              <td className="py-3 px-4 text-zinc-955 font-medium">{u.displayName}</td>
                              <td className="py-3 px-4 text-zinc-600">{u.username ? `@${u.username}` : '—'}</td>
                              <td className="py-3 px-4 text-zinc-900 font-medium">
                                <span className="inline-flex items-center gap-1">
                                  <Award size={12} className="text-yellow-500" />
                                  {u.rating !== undefined ? u.rating.toFixed(1) : '5.0'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 text-[10px] font-semibold border rounded-full ${u.hasPaid ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
                                  {u.hasPaid ? 'Премиум' : 'Бесплатно'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-zinc-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SHOWCASE VIEW */}
              {activeMenu === 'showcase' && (
                <div className="rounded-lg border border-zinc-200 bg-white p-8 shadow-sm text-center max-w-2xl mx-auto animate-fade-in flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-200 flex items-center justify-center mb-2">
                    <Globe size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-950">Презентация проекта (Showcase)</h3>
                  <p className="text-xs text-zinc-500 max-w-md mx-auto leading-normal">
                    Здесь вы можете скопировать публичную ссылку на презентацию проекта или скачать готовый HTML-файл для отправки инвесторам и партнерам. Презентация описывает архитектуру и стек технологий.
                  </p>

                  <div className="w-full max-w-md bg-zinc-50 border border-zinc-200 p-4 rounded-md text-left font-mono text-xs my-2 flex items-center justify-between gap-4">
                    <span className="text-zinc-600 truncate flex-1">{window.location.origin}/demo-overview.html</span>
                    <button
                      className="text-zinc-900 hover:text-zinc-700 font-bold shrink-0 underline cursor-pointer"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.origin + '/demo-overview.html');
                        showToast('Ссылка скопирована в буфер обмена');
                      }}
                    >
                      Копировать
                    </button>
                  </div>

                  <div className="flex gap-2 justify-center flex-wrap pt-2">
                    <button
                      className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md text-sm font-medium bg-zinc-950 text-white hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.origin + '/demo-overview.html');
                        showToast('Ссылка скопирована в буфер обмена');
                      }}
                    >
                      <Clipboard size={16} /> Копировать ссылку
                    </button>
                    <button
                      className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md text-sm font-medium border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm cursor-pointer"
                      onClick={handleDownloadDemoCode}
                    >
                      <Download size={16} /> Скачать HTML файл
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* NOTIFY MODAL */}
      {isNotifyOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-lg shadow-lg p-6 relative flex flex-col gap-4 animate-pop-in">
            <h3 className="text-base font-semibold text-zinc-955 flex items-center gap-2">
              <Bell size={18} className="text-zinc-700" /> Системное уведомление
            </h3>
            <p className="text-xs text-zinc-500 leading-normal">
              Пользователь получит это сообщение на свой телефон в реальном времени в виде всплывающего пуш-уведомления от бота.
            </p>

            <form onSubmit={handleSendNotification} className="space-y-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-700">Тема сообщения:</label>
                <input
                  className="w-full px-3 py-2 border border-zinc-200 rounded-md text-sm placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 focus-visible:border-zinc-950"
                  placeholder="Введите тему (например: Важная новость)"
                  value={notifyTitle}
                  onChange={(e) => setNotifyTitle(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-700">Текст уведомления:</label>
                <textarea
                  className="w-full px-3 py-2 border border-zinc-200 rounded-md text-sm placeholder-zinc-400 min-h-[100px] resize-y focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 focus-visible:border-zinc-950"
                  placeholder="Введите подробный текст сообщения..."
                  value={notifyBody}
                  onChange={(e) => setNotifyBody(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={sendingNotification}
                  className="flex-1 h-9 rounded-md text-sm font-medium bg-zinc-950 text-white hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50 inline-flex items-center justify-center cursor-pointer"
                >
                  {sendingNotification ? 'Отправка...' : 'Отправить'}
                </button>
                <button
                  type="button"
                  className="flex-1 h-9 rounded-md text-sm font-medium border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm inline-flex items-center justify-center cursor-pointer"
                  onClick={() => setIsNotifyOpen(false)}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CONFERENCE MODAL */}
      {isCreateConfOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-lg shadow-lg p-6 relative flex flex-col gap-4 animate-pop-in">
            <h3 className="text-base font-semibold text-zinc-955 flex items-center gap-2">
              <Calendar size={18} className="text-zinc-700" /> Создать новое событие
            </h3>
            <p className="text-xs text-zinc-500 leading-normal">
              Зарегистрировать и опубликовать новую конференцию от лица Администрации.
            </p>

            <form onSubmit={handleCreateConference} className="space-y-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-700">Название события:</label>
                <input
                  className="w-full px-3 py-2 border border-zinc-200 rounded-md text-sm placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 focus-visible:border-zinc-950"
                  placeholder="Введите название (например: Осенний Бизнес Форум)"
                  value={newConf.name}
                  onChange={(e) => setNewConf({ ...newConf, name: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-700">Краткое описание:</label>
                <textarea
                  className="w-full px-3 py-2 border border-zinc-200 rounded-md text-sm placeholder-zinc-400 min-h-[80px] resize-y focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 focus-visible:border-zinc-950"
                  placeholder="Опишите программу конференции..."
                  value={newConf.description}
                  onChange={(e) => setNewConf({ ...newConf, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-zinc-700">Место проведения:</label>
                  <input
                    className="w-full px-3 py-2 border border-zinc-200 rounded-md text-sm placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 focus-visible:border-zinc-950"
                    placeholder="Напр: Москва"
                    value={newConf.location}
                    onChange={(e) => setNewConf({ ...newConf, location: e.target.value })}
                  />
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-zinc-700">Лимит участников:</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-md text-sm placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 focus-visible:border-zinc-950 text-center"
                    value={newConf.maxParticipants}
                    onChange={(e) => setNewConf({ ...newConf, maxParticipants: parseInt(e.target.value, 10) || 50 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-zinc-700">Начало события:</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-md text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 focus-visible:border-zinc-950"
                    value={newConf.startsAt}
                    onChange={(e) => setNewConf({ ...newConf, startsAt: e.target.value })}
                  />
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs font-semibold text-zinc-700">Конец события:</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-md text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 focus-visible:border-zinc-950"
                    value={newConf.endsAt}
                    onChange={(e) => setNewConf({ ...newConf, endsAt: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-zinc-700">Тип доступа:</label>
                <select
                  className="w-full px-3 py-2 border border-zinc-200 rounded-md text-sm bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 focus-visible:border-zinc-950"
                  value={newConf.access}
                  onChange={(e) => setNewConf({ ...newConf, access: e.target.value })}
                >
                  <option value="public">Открытый для всех (Public)</option>
                  <option value="private">Закрытый по билетам (Private)</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={creatingConf}
                  className="flex-1 h-9 rounded-md text-sm font-medium bg-zinc-950 text-white hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50 inline-flex items-center justify-center cursor-pointer"
                >
                  {creatingConf ? 'Создание...' : 'Опубликовать'}
                </button>
                <button
                  type="button"
                  className="flex-1 h-9 rounded-md text-sm font-medium border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm inline-flex items-center justify-center cursor-pointer"
                  onClick={() => setIsCreateConfOpen(false)}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalAdminView;
