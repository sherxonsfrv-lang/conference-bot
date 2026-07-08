import React, { useState, useEffect } from 'react';
import { RU as t } from '../constants/locales';

const ProfileForm = ({ profile, onSave, onCancel, showToast, hasTelegramId = false }) => {
  // If user has already completed onboarding, skip Step 1 (consent)
  const hasOnboarded = profile?.onboardingCompleted === true;
  const [step, setStep] = useState(hasOnboarded ? 2 : 1);
  const totalSteps = hasOnboarded ? 2 : 3;
  // Map displayed step -> visual progress bar index
  const progressStep = hasOnboarded ? step - 1 : step;
  
  const [formData, setFormData] = useState({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    about: profile?.about || '',
    lookingFor: profile?.lookingFor || '',
    company: profile?.company || '',
    position: profile?.position || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    country: profile?.country || '',
    region: profile?.region || '',
    city: profile?.city || '',
    telegram: profile?.telegram || profile?.username || '',
    whatsapp: profile?.whatsapp || '',
    interests: Array.isArray(profile?.interests) ? profile.interests : [],
    avatarUrl: profile?.avatarUrl || '',
    isProfilePublic: profile?.isProfilePublic || false,
    allowBulkNotifications: profile?.allowBulkNotifications !== false,
  });

  const [consent, setConsent] = useState(profile?.onboardingCompleted || false);

  const interestOptions = [
    'AI', 'SaaS', 'Fintech', 'Crypto', 'Web3', 'Blockchain', 'Investing', 'Startups', 
    'Marketing', 'Sales', 'Design', 'Strategy', 'Java', 'Python', 'React', 'Node.js',
    'Product Management', 'Networking', 'Venture Capital', 'E-commerce', 'No-code'
  ];

  useEffect(() => {
    // Attempt auto-fill from Telegram WebApp
    const tg = window.Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user) {
      const u = tg.initDataUnsafe.user;
      setFormData(prev => ({
        ...prev,
        firstName: prev.firstName || u.first_name || '',
        lastName: prev.lastName || u.last_name || '',
        telegram: prev.telegram || u.username || '',
        avatarUrl: prev.avatarUrl || u.photo_url || '',
      }));
    }
  }, []);

  const toggleInterest = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const renderField = (label, key, placeholder, type = "text") => (
    <div className="form-group" style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#4a5568', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</label>
      {type === "textarea" ? (
        <textarea 
          className="form-input"
          value={formData[key] || ''}
          onChange={(e) => setFormData({...formData, [key]: e.target.value})}
          placeholder={placeholder}
          style={{ height: '100px', resize: 'none', padding: '14px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc' }}
        />
      ) : (
        <input 
          className="form-input"
          type={type}
          value={formData[key] || ''}
          onChange={(e) => setFormData({...formData, [key]: e.target.value})}
          placeholder={placeholder}
          style={{ padding: '14px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc' }}
        />
      )}
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ padding: '24px 16px', maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#1a202c', margin: 0 }}>
          {!hasOnboarded && step === 1 && "Согласие на обработку"}
          {step === 2 && "Данные профиля"}
          {step === 3 && "Ваши интересы"}
        </h1>
        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--tg-theme-link-color)', background: '#eff6ff', padding: '4px 12px', borderRadius: '12px' }}>
          Шаг {progressStep} из {totalSteps}
        </div>
      </div>

      <div className="step-indicator" style={{ display: 'flex', gap: '8px', marginBottom: '40px' }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: '6px', borderRadius: '3px', background: i + 1 <= progressStep ? 'var(--tg-theme-link-color)' : '#e2e8f0', transition: '0.4s' }} />
        ))}
      </div>
      
      {!hasOnboarded && step === 1 && (
        <div className="animate-fade-in" style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '50px', marginBottom: '24px' }}>📋</div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>Персональные данные</h3>
          <p style={{ color: '#4a5568', fontSize: '14px', lineHeight: 1.6, marginBottom: '32px' }}>
            Для создания вашего профиля, нетворкинга и участия в конференциях нашему сервису требуется согласие на обработку персональных данных. Мы храним ваши данные в зашифрованном виде.
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', textAlign: 'left', background: '#f8fafc', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <input 
              type="checkbox" 
              id="consent-check"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer', marginTop: '2px' }}
            />
            <label htmlFor="consent-check" style={{ fontSize: '14px', color: '#4a5568', fontWeight: 600, cursor: 'pointer', lineHeight: 1.4 }}>
              Я согласен на обработку персональных данных и их хранение сервисом
            </label>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: '96px', height: '96px', borderRadius: '28px', background: 'linear-gradient(135deg, #f6f8fb 0%, #e2e8f0 100%)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid white', boxShadow: '0 12px 24px rgba(0,0,0,0.08)' }}>
                {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '32px', color: '#a0aec0', fontWeight: 800 }}>{formData.firstName?.[0] || 'U'}</span>
                )}
              </div>
              {hasTelegramId && (
              <button 
                type="button"
                onClick={async () => {
                  try {
                    const { api } = await import('../services/api');
                    const result = await api.syncTelegramPhoto();
                    if (result.success && result.avatarUrl) {
                      setFormData(prev => ({ ...prev, avatarUrl: result.avatarUrl }));
                    }
                  } catch (err) {
                    console.error('Photo sync failed:', err);
                    if (err.message?.includes('NO_TELEGRAM_PHOTO') || err.message?.includes('404')) {
                      showToast("Фото в Telegram не обнаружено. Убедитесь, что у вас установлен аватар.", 'warning');
                    } else if (err.message?.includes('401')) {
                      showToast("Ошибка авторизации. Пожалуйста, перезапустите приложение.", 'error');
                    } else {
                      showToast("Не удалось загрузить фото из Telegram.", 'error');
                    }
                  }
                }}
                style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '36px', height: '36px', borderRadius: '12px', background: 'var(--tg-theme-link-color)', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 6px 12px rgba(59, 130, 246, 0.3)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </button>
              )}
            </div>
          </div>
          
          <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#4a5568', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Основное</h3>
          {renderField("Имя *", "firstName", "Как вас зовут?")}
          {renderField("Фамилия *", "lastName", "Ваша фамилия")}
          {renderField("О себе *", "about", "Кратко о ваших компетенциях", "textarea")}
          {renderField("Цель визита", "lookingFor", "Что вы ищете или предлагаете?")}
          
          <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#4a5568', marginTop: '32px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Организация</h3>
          {renderField("Компания", "company", "Где вы работаете?")}
          {renderField("Должность", "position", "Ваша должность")}
          
          <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#4a5568', marginTop: '32px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Контакты</h3>
          {renderField("Email", "email", "name@example.com", "email")}
          {renderField("Телефон", "phone", "+7...", "tel")}
          {renderField("Telegram", "telegram", "@username")}
          {renderField("WhatsApp", "whatsapp", "+7...")}

          <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#4a5568', marginTop: '32px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Настройки</h3>
          
          {/* Public Profile Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderRadius: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800 }}>Публичный профиль</div>
              <div style={{ fontSize: '12px', color: '#718096', marginTop: '2px' }}>Показывать ваш профиль в глобальном поиске</div>
            </div>
            <button 
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, isProfilePublic: !prev.isProfilePublic }))}
              style={{ 
                width: '48px', height: '26px', borderRadius: '13px', position: 'relative', border: 'none', cursor: 'pointer',
                background: formData.isProfilePublic ? 'var(--tg-theme-link-color)' : '#cbd5e0',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ 
                position: 'absolute', top: '3px', width: '20px', height: '20px', borderRadius: '10px', background: 'white',
                left: formData.isProfilePublic ? '25px' : '3px',
                transition: 'all 0.2s'
              }} />
            </button>
          </div>

          {/* Bulk Notifications Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderRadius: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800 }}>Уведомления сообщества</div>
              <div style={{ fontSize: '12px', color: '#718096', marginTop: '2px' }}>Получать рассылки о поисках и действиях участников</div>
            </div>
            <button 
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, allowBulkNotifications: !prev.allowBulkNotifications }))}
              style={{ 
                width: '48px', height: '26px', borderRadius: '13px', position: 'relative', border: 'none', cursor: 'pointer',
                background: formData.allowBulkNotifications ? 'var(--tg-theme-link-color)' : '#cbd5e0',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ 
                position: 'absolute', top: '3px', width: '20px', height: '20px', borderRadius: '10px', background: 'white',
                left: formData.allowBulkNotifications ? '25px' : '3px',
                transition: 'all 0.2s'
              }} />
            </button>
          </div>

          <div className="card-soft" style={{ background: '#f0f9ff', border: '1px solid #e0f2fe', padding: '16px 20px', borderRadius: '20px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#0369a1', fontWeight: 600, lineHeight: 1.5 }}>
              🔒 Ваши контактные данные видны только тем пользователям, чьи запросы на переписку вы одобрили.
            </p>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="animate-fade-in">
          <p style={{ color: '#718096', marginBottom: '24px', fontSize: '14px', lineHeight: 1.5 }}>
            Выберите профессиональные и личные интересы. Это поможет алгоритму рекомендовать подходящих людей.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '40px' }}>
            {interestOptions.map(opt => (
              <button 
                key={opt} 
                type="button"
                className={`tag-pill ${formData.interests.includes(opt) ? 'active' : ''}`}
                onClick={() => toggleInterest(opt)}
                style={{
                  padding: '10px 18px', borderRadius: '16px', border: '1px solid currentColor',
                  background: formData.interests.includes(opt) ? 'var(--tg-theme-link-color)' : 'transparent',
                  color: formData.interests.includes(opt) ? 'white' : 'var(--tg-theme-link-color)',
                  borderColor: formData.interests.includes(opt) ? 'var(--tg-theme-link-color)' : '#e2e8f0',
                  fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: '0.3s'
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', marginTop: '48px' }}>
        {step > 1 ? (
          <button className="btn-outline" style={{ flex: 1, height: '56px', borderRadius: '18px', fontWeight: 800 }} onClick={() => setStep(step - 1)}>
            Назад
          </button>
        ) : (
          <button className="btn-outline" style={{ flex: 1, height: '56px', borderRadius: '18px', fontWeight: 800 }} onClick={onCancel}>
            Отмена
          </button>
        )}
        
        {step < totalSteps ? (
          <button 
            className="btn-solid" 
            style={{ flex: 2, height: '56px', borderRadius: '18px', fontWeight: 800, background: 'var(--tg-theme-link-color)', color: 'white' }} 
            onClick={() => {
              if (step === 1 && !consent) {
                showToast("Вы должны дать согласие на обработку персональных данных.", 'warning');
                return;
              }
              if (step === 2 && (!formData.firstName?.trim() || !formData.lastName?.trim() || !formData.about?.trim())) {
                showToast("Пожалуйста, заполните обязательные поля: Имя, Фамилия и О себе.", 'warning');
                return;
              }
              setStep(step + 1);
            }}
          >
            Далее
          </button>
        ) : (
          <button 
            className="btn-solid" 
            style={{ flex: 2, height: '56px', borderRadius: '18px', fontWeight: 800, background: 'var(--tg-theme-link-color)', color: 'white' }} 
            onClick={() => onSave(formData)}
          >
            Готово
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileForm;
