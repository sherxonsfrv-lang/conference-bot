import { useState } from 'react';
import { User, Calendar, Clock, RotateCcw } from 'lucide-react';
import './Views.css';

const PublicConferencesView = ({ onBack, onJoinConference, onCreateNew, conferences = [] }) => {
  const [activeTab, setActiveTab] = useState('upcoming');

  const upcomingConferences = conferences.filter(c => !c.isEnded);
  const pastConferences = conferences.filter(c => c.isEnded);

  const monthsRU = {
    '01': 'ЯНВ', '02': 'ФЕВ', '03': 'МАР', '04': 'АПР', '05': 'МАЙ', '06': 'ИЮН',
    '07': 'ИЮЛ', '08': 'АВГ', '09': 'СЕН', '10': 'ОКТ', '11': 'НОЯ', '12': 'ДЕК'
  };

  const getMonthName = (dateStr) => {
    if (!dateStr) return 'МАЙ';
    const parts = dateStr.split('-');
    if (parts.length < 2) return 'МАЙ';
    return monthsRU[parts[1]] || 'МАЙ';
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '32px' }}>
      {/* Tabs */}
      <div className="tabs-container" style={{ marginBottom: '24px' }}>
        <div 
          className={`tab-item ${activeTab === 'upcoming' ? 'active' : ''}`} 
          onClick={() => setActiveTab('upcoming')}
          style={{ flex: 1, textAlign: 'center', padding: '12px', fontWeight: 700, cursor: 'pointer', borderBottom: activeTab === 'upcoming' ? '3px solid var(--tg-theme-link-color)' : '3px solid transparent', color: activeTab === 'upcoming' ? 'var(--tg-theme-link-color)' : '#a0aec0' }}
        >
          Предстоящие
        </div>
        <div 
          className={`tab-item ${activeTab === 'past' ? 'active' : ''}`} 
          onClick={() => setActiveTab('past')}
          style={{ flex: 1, textAlign: 'center', padding: '12px', fontWeight: 700, cursor: 'pointer', borderBottom: activeTab === 'past' ? '3px solid var(--tg-theme-link-color)' : '3px solid transparent', color: activeTab === 'past' ? 'var(--tg-theme-link-color)' : '#a0aec0' }}
        >
          Прошлые
        </div>
      </div>

      {activeTab === 'upcoming' ? (
        <div className="upcoming-list responsive-grid-2" style={{ gap: '20px' }}>
          {upcomingConferences.map(conf => (
            <div key={conf.id} className="event-promo-card animate-fade-in" style={{ marginBottom: 0 }}>
              <div className="event-promo-header">
                <div className="badge-live">
                  <span className="badge-live-dot"></span>
                  {(conf.day || 'СЕГОДНЯ')}
                </div>
                <div className="badge-date">
                  <div className="badge-date-num">{conf.date?.split('-')[2] || '20'}</div>
                  <div className="badge-date-month">{getMonthName(conf.date)}</div>
                </div>
              </div>
              
              <div className="event-promo-body">
                <h2 className="event-promo-title">{conf.name || conf.title}</h2>
                
                <div className="info-grid">
                  <div className="info-grid-cell">
                    <div className="info-grid-label">Начало</div>
                    <div className="info-grid-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} style={{ opacity: 0.8 }} />
                      {conf.startingIn || 'Скоро'}
                    </div>
                  </div>
                  <div className="info-grid-cell">
                    <div className="info-grid-label">Длительность</div>
                    <div className="info-grid-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} style={{ opacity: 0.8 }} />
                      {conf.duration || '2ч'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ 
                      background: 'rgba(120, 134, 255, 0.08)', 
                      color: 'var(--tg-theme-link-color)', 
                      padding: '6px 12px', 
                      borderRadius: '12px', 
                      fontSize: '11px', 
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <RotateCcw size={12} />
                      {(conf.repeat === 'None' ? 'Разово' : conf.repeat) || 'Разово'}
                    </div>
                  </div>
                  <div className="participant-avatar-stack">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="stack-avatar">
                        <User size={14} style={{ color: '#a0aec0' }} />
                      </div>
                    ))}
                    <div className="stack-avatar stack-avatar-more">
                      {conf.participants || 0}+
                    </div>
                  </div>
                </div>
                
                <button className="btn-solid" style={{ marginTop: '24px' }} onClick={() => onJoinConference(conf.code)}>
                  Присоединиться к сессии
                </button>
              </div>
            </div>
          ))}
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--secondary-text)', fontSize: '13px', gridColumn: '1 / -1' }}>
             Всего конференций: {upcomingConferences.length}
          </div>
        </div>
      ) : (
        <div className={`past-list responsive-grid-2 ${pastConferences.length == 0 && "!grid-cols-1"}`} style={{ gap: '16px' }}>
          {pastConferences.map(conf => (
            <div key={conf.id} className="event-card animate-fade-in" style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '16.5px', color: 'var(--primary-text)', margin: '0 0 6px 0', fontWeight: 700, lineHeight: 1.4 }}>{conf.name || conf.title}</h3>
                  <div className="event-meta">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} />
                      {conf.date || 'Прошло'}
                    </span>
                    {conf.time && (
                      <>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={13} />
                          {conf.time}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ background: '#f1f5f9', color: '#718096', padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>
                  Завершено
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--secondary-text)', fontWeight: 600 }}>Участников:</span>
                <div className="participant-avatar-stack">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="stack-avatar" style={{ width: '26px', height: '26px' }}>
                      <User size={12} style={{ color: '#cbd5e1' }} />
                    </div>
                  ))}
                  <div className="stack-avatar stack-avatar-more" style={{ width: '26px', height: '26px', fontSize: '9px' }}>
                    {conf.participants || 0}+
                  </div>
                </div>
              </div>
            </div>
          ))}
          {pastConferences.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--secondary-text)' }}>
              Нет завершенных событий
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PublicConferencesView;
