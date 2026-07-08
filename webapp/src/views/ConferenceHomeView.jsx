import React from 'react';
import { RU as t } from '../constants/locales';
import { Users, Key, Clock, User, Mic, QrCode, MessageSquare, HelpCircle, BarChart3 } from 'lucide-react';
import './Views.css';

const ConferenceHomeView = ({ conference, onSeeAllQuestions, onSeeAllPolls, onViewProfile, onShowQR, members = [], polls = [], questions = [] }) => {
  const audience = members.slice(0, 7);
  const latestQuestion = questions.find(q => q.status === 'approved') || questions[0];
  const activePoll = polls.find(p => p.isActive) || polls[0];

  return (
    <div className="animate-fade-in" style={{ padding: '0 0 100px 0' }}>
      {/* Dark Host Card */}
      <div className="card-soft" style={{ background: '#111111', color: 'white', padding: '24px', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid var(--accent-blue)', padding: '2px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {conference?.organizer?.avatarUrl ? (
                  <img src={conference.organizer.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="Host" />
                ) : (
                  <User size={20} style={{ color: '#aaa' }} />
                )}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Организатор</div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>
                {conference?.organizer
                  ? `${conference.organizer.firstName || ''} ${conference.organizer.lastName || ''}`.trim() || 'Без имени'
                  : conference?.organizerName || 'Организатор'}
              </div>
            </div>
          </div>
          {conference?.isActive && !conference?.isEnded && (
            <div className="badge-live">
              <span className="badge-live-dot"></span>
              LIVE
            </div>
          )}
          {conference?.isEnded && (
            <div style={{ background: 'rgba(255,255,255,0.1)', color: '#94a3b8', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>
              ЗАВЕРШЕНА
            </div>
          )}
          {!conference?.isActive && !conference?.isEnded && (
            <div style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>
              ОЖИДАЕТ
            </div>
          )}
        </div>

        <h2 style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.3, marginBottom: '24px', color: 'white' }}>{conference?.name || conference?.title || 'Конференция'}</h2>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={14} />
            {members.length}
          </div>
          {conference?.code && (
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Key size={14} />
              {conference.code}
            </div>
          )}
          {conference?.startsAt && (
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} />
              {new Date(conference.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>

        {conference?.myRole === 'organizer' && (
          <button 
            className="btn-solid" 
            onClick={onShowQR}
            style={{ 
              marginTop: '20px', 
              background: 'white', 
              color: 'black', 
              padding: '12px', 
              borderRadius: '16px', 
              fontSize: '13px', 
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <QrCode size={16} />
            Показать QR-код
          </button>
        )}
      </div>

      {/* Audience Section */}
      <div style={{ marginTop: '24px', padding: '0 4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--primary-text)' }}>Аудитория</h3>
        </div>

        <div
        className='grid grid-cols-4 xl:grid-cols-6 gap-x-4 gap-y-3'
        >
          {audience.map((m, idx) => (
            <div key={m.id || idx} style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => onViewProfile?.(m)}>
              <div style={{ width: '100%', aspectRatio: '1/1', position: 'relative', marginBottom: '8px' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt={m.displayName} />
                  ) : (
                    <User size={24} style={{ color: '#cbd5e1' }} />
                  )}
                </div>
                {m.role?.toLowerCase().includes('speaker') && (
                  <div style={{ position: 'absolute', right: '0', bottom: '0', width: '26px', height: '26px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', color: 'var(--tg-theme-link-color)' }}>
                    <Mic size={14} />
                  </div>
                )}
              </div>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--primary-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.displayName?.split(' ')[0] || m.name}
              </div>
            </div>
          ))}
          {members.length > 7 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: '50%', background: 'var(--card-bg)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary-text)', fontWeight: 700, fontSize: '12px' }}>
                +{members.length - 7}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Featured Widgets Section */}
      <div style={{ marginTop: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--primary-text)' }}>Последние вопросы</h3>
          <span style={{ fontSize: '12px', color: 'var(--tg-theme-link-color)', fontWeight: 700, cursor: 'pointer' }} onClick={onSeeAllQuestions}>Все</span>
        </div>
        {latestQuestion ? (
          <div className="card-soft" style={{ padding: '20px', cursor: 'pointer', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {latestQuestion.authorAvatarUrl ? (
                  <img src={latestQuestion.authorAvatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="author" />
                ) : (
                  <User size={14} style={{ color: '#cbd5e1' }} />
                )}
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--primary-text)' }}>{latestQuestion.authorName || latestQuestion.authorFirstName}</div>
            </div>
            <p style={{ margin: 0, fontSize: '14.5px', color: 'var(--primary-text)', fontWeight: 500, lineHeight: 1.5 }}>{latestQuestion.text}</p>
          </div>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--secondary-text)', fontSize: '13.5px', marginBottom: '24px' }}>Нет вопросов</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--primary-text)' }}>Активные опросы</h3>
          <span style={{ fontSize: '12px', color: 'var(--tg-theme-link-color)', fontWeight: 700, cursor: 'pointer' }} onClick={onSeeAllPolls}>Все</span>
        </div>
        {activePoll ? (
          <div className="card-soft" style={{ padding: '24px', borderRadius: '28px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: 'var(--primary-text)' }}>{activePoll.question}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activePoll.options?.map(o => (
                <div key={o.id} style={{ position: 'relative', height: '44px', borderRadius: '12px', background: '#f8fafc', overflow: 'hidden', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${o.percent || 0}%`, background: 'rgba(120, 134, 255, 0.08)' }}></div>
                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '13px', fontWeight: 600 }}>
                    <span>{o.text}</span>
                    <span style={{ color: 'var(--tg-theme-link-color)' }}>{o.percent || 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--secondary-text)', fontSize: '13.5px' }}>Нет активных опросов</div>
        )}
      </div>
    </div>
  );
};

export default ConferenceHomeView;
