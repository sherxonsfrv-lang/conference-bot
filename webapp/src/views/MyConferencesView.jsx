import React, { useState } from 'react';
import { RU as t } from '../constants/locales';
import { Plus, Inbox, Calendar, MapPin } from 'lucide-react';
import './Views.css';

const MyConferencesView = ({ onCreateNew, onSelectConference, activeConferences = [], pastConferences = [] }) => {
  const [activeTab, setActiveTab] = useState('active');

  const currentList = activeTab === 'active' ? activeConferences : pastConferences;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '32px' }}>
      <div className="tab-header-row">
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>{t.conferences.my_list}</h2>
        {onCreateNew && (
          <button onClick={onCreateNew} className="btn-add-action" title="Создать конференцию">
            <Plus size={24} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs-container" style={{ marginBottom: '24px' }}>
        <div 
          className={`tab-item ${activeTab === 'active' ? 'active' : ''}`} 
          onClick={() => setActiveTab('active')}
          style={{ flex: 1, textAlign: 'center', padding: '12px', fontWeight: 700, cursor: 'pointer', borderBottom: activeTab === 'active' ? '3px solid var(--tg-theme-link-color)' : '3px solid transparent', color: activeTab === 'active' ? 'var(--tg-theme-link-color)' : '#a0aec0' }}
        >
          {t.conferences.active}
        </div>
        <div 
          className={`tab-item ${activeTab === 'past' ? 'active' : ''}`} 
          onClick={() => setActiveTab('past')}
          style={{ flex: 1, textAlign: 'center', padding: '12px', fontWeight: 700, cursor: 'pointer', borderBottom: activeTab === 'past' ? '3px solid var(--tg-theme-link-color)' : '3px solid transparent', color: activeTab === 'past' ? 'var(--tg-theme-link-color)' : '#a0aec0' }}
        >
          {t.conferences.past}
        </div>
      </div>

      <div className={`responsive-grid-2 ${currentList.length === 0 && "!grid-cols-1"}`}>
        {currentList.map(conf => {
          const isEnded = conf.isEnded === true;
          const isPending = !conf.isActive && !conf.isEnded;
          return (
          <div
            key={conf.id}
            className="event-card"
            onClick={() => !isEnded && onSelectConference(conf)}
            style={{
              opacity: isEnded ? 0.55 : 1,
              cursor: isEnded ? 'not-allowed' : 'pointer',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <div className="event-title">{conf.name || conf.title || t.common.loading}</div>
                <div className="event-meta" style={{ marginTop: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} style={{ opacity: 0.8 }} />
                    {conf.startsAt ? new Date(conf.startsAt).toLocaleDateString() : (conf.endsAt ? new Date(conf.endsAt).toLocaleDateString() : 'Upcoming')}
                  </span>
                  {conf.location && (
                    <>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} style={{ opacity: 0.8 }} />
                        {conf.location}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div style={{
                background: isEnded ? '#f1f5f9' : isPending ? 'rgba(245,158,11,0.1)' : 'rgba(49,151,149,0.1)',
                color: isEnded ? '#94a3b8' : isPending ? '#b45309' : '#319795',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: 800,
                textTransform: 'uppercase',
                whiteSpace: 'nowrap'
              }}>
                {isEnded ? 'ЗАВЕРШЕНА' : isPending ? 'ОЖИДАЕТ' : 'В ЭФИРЕ'}
              </div>
            </div>
          </div>
          );
        })}
        {currentList.length === 0 && (
          <div className="empty-state">
            <Inbox size={48} className="empty-state-icon" />
            <p className="empty-state-text">{activeTab === 'active' ? t.conferences.empty_active : t.conferences.empty_past}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyConferencesView;
