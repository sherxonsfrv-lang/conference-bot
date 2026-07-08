import React from 'react';
import { RU as t } from '../../constants/locales';
import { User, Bell } from 'lucide-react';

const Header = ({ user, activeTab, setActiveTab, onOpenNotifications, unreadCount }) => {
  // Get dynamic title based on tab
  const getTitle = () => {
    switch(activeTab) {
      case 'conferences': return t.home?.public_conferences || 'Конференции';
      case 'networking': return 'Нетворкинг';
      case 'messaging': return t.home?.messaging || 'Сообщения';
      case 'profile': return t.profile?.title || 'Профиль';
      case 'home': return 'Добро пожаловать';
      default: return 'Конференции';
    }
  };

  return (
    <div className="container !pb-0">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', }}>
        <button 
          className="btn-round-back" 
          onClick={() => setActiveTab('profile')}
          style={{ width: '44px', height: '44px' }}
          title={t.profile?.title || 'Профиль'}
        >
          <User size={22} />
        </button>
        <button 
          className="btn-round-back" 
          onClick={onOpenNotifications}
          style={{ width: '44px', height: '44px', position: 'relative' }}
          title={t.common.notifications || 'Уведомления'}
        >
          <Bell size={22} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              background: '#ef4444',
              color: 'white',
              fontSize: '10px',
              fontWeight: 800,
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
              border: '2px solid var(--card-bg)'
            }}>
              {unreadCount}
            </span>
          )}
        </button>
      </div>
      
      {/* <div className="animate-fade-in" style={{ paddingLeft: '4px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '30px', fontWeight: 800, color: 'var(--primary-text)' }}>{getTitle()}</h1>
        {
          activeTab === 'conferences' && (
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: 'var(--secondary-text)' }}>{activeTab === 'conferences' ? 'Все ваши предстоящие и прошедшие конференции' : t.home.subtitle}</p>
          )
        }
      </div> */}
    </div>
  );
};

export default Header;
