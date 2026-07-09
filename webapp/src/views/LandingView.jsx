import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Users, 
  Mail, 
  Lock, 
  User, 
  Send, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Ticket 
} from 'lucide-react';
import './LandingView.css';

const LandingView = ({ onAuthSuccess, systemSettings }) => {
  const [isEmailMode, setIsEmailMode] = useState(false);

  useEffect(() => {
    if (systemSettings && systemSettings.allowTelegramLogin === false) {
      setIsEmailMode(true);
    }
  }, [systemSettings]);

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [consent, setConsent] = useState(false);
  
  const [tgLoading, setTgLoading] = useState(false);
  const [tgToken, setTgToken] = useState(null);
  const [tgBotUrl, setTgBotUrl] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Strict list of allowed TLDs to filter out fake ones (like gmail.gmail or aksksja)
  const VALID_TLDS = new Set([
    'com', 'org', 'net', 'edu', 'gov', 'mil', 'biz', 'info', 'mobi', 'name', 
    'aero', 'coop', 'museum', 'io', 'me', 'co', 'tv', 'cc', 'ru', 'su', 
    'ua', 'by', 'kz', 'us', 'uk', 'ca', 'fr', 'de', 'jp', 'cn', 'in', 
    'xyz', 'online', 'site', 'tech', 'store', 'app', 'dev', 'ai'
  ]);

  const validateEmailFormat = (val) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(val)) return false;
    
    const parts = val.split('@');
    if (parts.length !== 2) return false;
    
    const domain = parts[1].toLowerCase();
    const domainParts = domain.split('.');
    if (domainParts.length < 2) return false;
    
    const tld = domainParts[domainParts.length - 1];
    return VALID_TLDS.has(tld);
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!consent) {
      setError('Вы должны дать согласие на обработку персональных данных.');
      return;
    }

    if (!email || !password) {
      setError('Заполните адрес почты и пароль.');
      return;
    }

    if (!validateEmailFormat(email)) {
      setError('Пожалуйста, введите корректный адрес почты с существующим доменом.');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен состоять минимум из 6 символов.');
      return;
    }

    try {
      if (isRegister) {
        if (!firstName.trim()) {
          setError('Пожалуйста, укажите ваше имя.');
          return;
        }
        const data = await api.registerEmail(email, password, firstName, lastName, consent);
        
        setSuccessMsg('Регистрация успешна! Вход...');
        setTimeout(() => {
          onAuthSuccess(data);
        }, 1000);
      } else {
        const data = await api.loginEmail(email, password);
        onAuthSuccess(data);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Telegram deep-link login token polling lifecycle
  const handleTelegramAuth = async () => {
    setError('');
    if (!consent) {
      setError('Вы должны дать согласие на обработку персональных данных.');
      return;
    }

    setTgLoading(true);
    try {
      const data = await api.telegramToken();

      setTgToken(data.token);
      setTgBotUrl(data.botUrl);
      
      // Open link in new tab automatically
      window.open(data.botUrl, '_blank');
    } catch (err) {
      setError(err.message);
      setTgLoading(false);
    }
  };

  // Polling Telegram authorization status
  useEffect(() => {
    if (!tgToken) return;

    const interval = setInterval(async () => {
      try {
        const data = await api.telegramPoll(tgToken);
        
        if (data.status === 'completed') {
          clearInterval(interval);
          setTgLoading(false);
          setTgToken(null);
          onAuthSuccess(data);
        } else if (data.status === 'expired') {
          clearInterval(interval);
          setTgLoading(false);
          setTgToken(null);
          setError('Срок действия сессии Telegram истёк. Попробуйте снова.');
        }
      } catch (err) {
        console.error('Error polling Telegram auth:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [tgToken, onAuthSuccess]);

  return (
    <div className="landing-container animate-fade-in">
      <div className="landing-card card-soft">
        <div className="landing-logo">
          <div className="landing-logo-icon">
            <Users size={32} />
          </div>
        </div>
        
        <h1 className="landing-title">Приветик</h1>
        <p className="landing-subtitle">Удобная платформа для профессионального нетворкинга и участия в конференциях</p>

        {error && (
          <div className="error-banner animate-pop-in">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="success-banner animate-pop-in">
            <CheckCircle2 size={18} className="flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Polling/Verification State */}
        {tgLoading && tgToken && (
          <div className="tg-polling-state animate-pop-in">
            <Loader2 className="spinner-large animate-spin" />
            <h3>Ожидание подтверждения...</h3>
            <p>Мы открыли бота в Telegram. Пожалуйста, запустите его нажатием кнопки <b>Старт / Start</b>.</p>
            <a href={tgBotUrl} target="_blank" rel="noreferrer" className="btn-solid btn-tg-redirect">
              <Send size={18} />
              Открыть Telegram вручную
            </a>
            <button className="btn-outline font-russo !text-black btn-cancel-tg" onClick={() => { setTgToken(null); setTgLoading(false); }}>
              Отменить
            </button>
          </div>
        )}

        {/* Auth form options */}
        {!tgLoading && (
          <>
            {!isEmailMode ? (
              <div className="landing-options">
                {(!systemSettings || systemSettings.allowTelegramLogin !== false) ? (
                  <>
                    <p className="hint-text">Войдите через Telegram для мгновенной синхронизации вашего профиля:</p>
                    <button className="btn-solid font-russo btn-tg-login" onClick={handleTelegramAuth}>
                      {/* <Send size={18} /> */}
                      Войти через Telegram
                    </button>
                    <div className="divider"><span>или</span></div>
                    <button className="btn-outline font-russo !text-gray-500" onClick={() => setIsEmailMode(true)}>
                      {/* <Mail size={18} /> */}
                      Использовать Email
                    </button>
                  </>
                ) : (
                  <button className="btn-solid" style={{ height: '54px' }} onClick={() => setIsEmailMode(true)}>
                    <Mail size={18} />
                    Войти с помощью Email
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleEmailAuth} className="landing-email-form animate-fade-in">
                <h3>{isRegister ? 'Создать аккаунт' : 'Вход в аккаунт'}</h3>
                
                <div className="form-group">
                  <label>Email почта</label>
                  <div className="form-input-container">
                    <Mail size={18} className="form-input-icon" />
                    <input 
                      type="email" 
                      className="form-input form-input-with-icon" 
                      placeholder="name@example.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Пароль</label>
                  <div className="form-input-container">
                    <Lock size={18} className="form-input-icon" />
                    <input 
                      type="password" 
                      className="form-input form-input-with-icon" 
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {isRegister && (
                  <>
                    <div className="form-group">
                      <label>Ваше имя</label>
                      <div className="form-input-container">
                        <User size={18} className="form-input-icon" />
                        <input 
                          type="text" 
                          className="form-input form-input-with-icon" 
                          placeholder="Иван" 
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Ваша фамилия (необязательно)</label>
                      <div className="form-input-container">
                        <User size={18} className="form-input-icon" />
                        <input 
                          type="text" 
                          className="form-input form-input-with-icon" 
                          placeholder="Иванов" 
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                <button type="submit" className="btn-solid btn-submit-auth">
                  {isRegister ? 'Зарегистрироваться' : 'Войти'}
                </button>

                <div className="auth-toggle-link">
                  <span onClick={() => setIsRegister(!isRegister)}>
                    {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
                  </span>
                </div>

                {(!systemSettings || systemSettings.allowTelegramLogin !== false) && (
                  <button type="button" className="btn-outline btn-back-auth" onClick={() => setIsEmailMode(false)}>
                    <ArrowLeft size={18} />
                    Назад
                  </button>
                )}
              </form>
            )}

            {/* Legal Consent Block */}
            <div className="legal-consent-block">
              <label className="checkbox-container">
                <input 
                  type="checkbox" 
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span className="checkmark"></span>
                <span className="consent-text">
                  Я согласен на обработку персональных данных и их хранение сервисом
                </span>
              </label>
            </div>

            <div className="sales-landing-footer">
              <a href="https://example.com/sales" target="_blank" rel="noreferrer" className="sales-link">
                <Ticket size={16} />
                Получить доступ / Купить билеты
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LandingView;
