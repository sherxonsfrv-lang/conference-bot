import React from 'react';
import { RU as t } from '../../constants/locales';

const MainNavigationBar = ({ activeTab, setActiveTab, onOpenScanner, isMainAdmin }) => {
  return (
    <nav className="nav-bar">
      <div className={`nav-item flex md:!flex-row md:!justify-start ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
        <span className="nav-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </span>
        <span className="nav-label">Главная</span>
      </div>
      <div className={`nav-item flex md:!flex-row md:!justify-start ${activeTab === 'search_profiles' ? 'active' : ''}`} onClick={() => setActiveTab('search_profiles')}>
        <span className="nav-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </span>
        <span className="nav-label">Поиск контактов</span>
      </div>
      
      <div className="nav-fab-container">
        <div className="nav-fab" onClick={onOpenScanner} style={{ background: 'var(--primary-solid)', boxShadow: '0 8px 20px rgba(0,0,0,0.2)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '28px', height: '28px' }}>
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
            <line x1="7" y1="7" x2="7" y2="7"></line>
            <line x1="17" y1="7" x2="17" y2="7"></line>
            <line x1="7" y1="17" x2="7" y2="17"></line>
          </svg>
        </div>
      </div>

      <div className={`nav-item flex md:!flex-row md:!justify-start ${activeTab === 'messaging' ? 'active' : ''}`} onClick={() => setActiveTab('messaging')}>
        <span className="nav-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </span>
        <span className="nav-label">Сообщения</span>
      </div>
      <div className={`nav-item flex md:!flex-row md:!justify-start ${activeTab === 'conferences' ? 'active' : ''}`} onClick={() => setActiveTab('conferences')}>
        <span className="nav-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </span>
        <span className="nav-label">Мои события</span>
      </div>
      {isMainAdmin && (
        <div className={`nav-item flex md:!flex-row md:!justify-start ${activeTab === 'global_admin' ? 'active' : ''}`} onClick={() => setActiveTab('global_admin')}>
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </span>
          <span className="nav-label">Админ панель</span>
        </div>
      )}
    </nav>
  );
};

export default MainNavigationBar;
