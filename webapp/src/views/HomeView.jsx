import React from 'react';
import { RU as t } from '../constants/locales';
import { AlertTriangle, Calendar, MapPin, BarChart3 } from 'lucide-react';
import './Views.css';

const HomeView = ({ user, onJoin, onPolls, accessPhase, conferences = [], polls = [] }) => (
  <div className="animate-fade-in" style={{ paddingBottom: '32px' }}>
    {/* {accessPhase === 'grace' && (
      <div className="badge-phase-grace">
        <AlertTriangle size={20} />
        <p>{t.access.grace_period} 1 {t.access.hours} 59 {t.access.minutes}</p>
      </div>
    )} */}

    <div className="card-hero">
      <h1 className="card-hero-title">{t.home.hero_title}</h1>
      <p className="card-hero-desc">{t.home.hero_desc}</p>
      
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <button className="btn-hero-action" onClick={onJoin}>
          {t.home.hero_btn}
        </button>
      </div>
    </div>

    <div style={{ marginTop: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: 'var(--primary)' }}>{t.home.top_events}</h3>
        <span style={{ fontSize: '13px', color: 'var(--tg-theme-link-color)', fontWeight: 700, cursor: 'pointer' }} onClick={onJoin}>{t.home.view_all}</span>
      </div>
      <div className="responsive-grid-2">
        {conferences.slice(0, 3).map(conf => (
          <div key={conf.id} className="event-card" onClick={() => onJoin(conf)}>
            <div className="event-title">{conf.name}</div>
            <div className="event-meta">
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={14} style={{ opacity: 0.8 }} />
                {conf.location || 'Online'}
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={14} style={{ opacity: 0.8 }} />
                {conf.startsAt ? new Date(conf.startsAt).toLocaleDateString() : 'Upcoming'}
              </span>
            </div>
          </div>
        ))}
        {conferences.length === 0 && (
          <div style={{ color: 'var(--secondary-text)', fontSize: '13px', padding: '12px 4px' }}>{t.home.no_events}</div>
        )}
      </div>
    </div>
    
    <div style={{ marginTop: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: 'var(--primary)' }}>{t.home.trending_polls}</h3>
      </div>
      <div className="responsive-grid-2">
        {polls.slice(0, 2).map(poll => (
          <div key={poll.id} className="event-card" style={{ marginBottom: 0 }} onClick={onPolls}>
            <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--primary-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={16} className="text-secondary-text" style={{ opacity: 0.8 }} />
              {poll.question}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--secondary-text)', marginTop: '8px', paddingLeft: '24px' }}>
              {poll.options?.length} варианта • {poll.totalVotes || 0} голосов
            </div>
          </div>
        ))}
        {polls.length === 0 && (
          <div style={{ color: 'var(--secondary-text)', fontSize: '13px', padding: '12px 4px' }}>{t.home.no_polls}</div>
        )}
      </div>
    </div>
  </div>
);

export default HomeView;
