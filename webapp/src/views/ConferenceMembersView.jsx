import React, { useState } from 'react';
import { RU as t } from '../constants/locales';
import { MessageSquare, Clock, MessageCircle, User, X } from 'lucide-react';
import './Views.css';

const ConferenceMembersView = ({ members = [], requestStatus, rejectCounts = {}, sendingRequests = {}, onOpenChat, onViewProfile, onSendRequest, showToast }) => {
  const [showAll, setShowAll] = useState(false);

  const handleAction = async (m) => {
    const targetId = m.userId || m.telegramId || m.id;
    if (!requestStatus[targetId] || requestStatus[targetId] === 'rejected') {
      try {
        await onSendRequest?.(m);
      } catch (err) {
        // Handled by App.jsx
      }
    } else if (requestStatus[targetId] === 'accepted') {
      onOpenChat?.(m);
    }
  };

  const isLargeConf = members.length > 10;
  const displayedMembers = (isLargeConf && !showAll) ? members.slice(0, 5) : members;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, color: 'var(--primary-text)', fontSize: '20px', fontWeight: 800 }}>Участники ({members.length})</h3>
        {isLargeConf && members.length > 5 && (
          <button 
            className="btn-outline" 
            style={{ padding: '6px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, height: 'auto', border: '1px solid #cbd5e0', width: 'auto' }} 
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Скрыть' : 'Показать всех'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {displayedMembers.map(m => {
          const targetId = m.userId || m.telegramId || m.id;
          let status = m.chatStatus || requestStatus[targetId];
          const rejectCount = rejectCounts[targetId] || 0;
          const isSending = sendingRequests[targetId];
          const isOrganizer = m.role?.toLowerCase().includes('организатор') || m.role?.toLowerCase().includes('admin') || m.role?.toLowerCase().includes('creator');

          if (status === 'rejected' && rejectCount < 5) {
            status = null;
          }

          return (
            <div 
              key={m.id} 
              className="event-card animate-fade-in"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px', 
                padding: '16px', 
                borderRadius: '24px', 
                cursor: 'default'
              }}
            >
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, cursor: 'pointer' }}
                onClick={() => onViewProfile?.(m)}
              >
                <div style={{ 
                  width: '52px', 
                  height: '52px', 
                  borderRadius: '18px', 
                  background: isOrganizer ? 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)' : 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: isOrganizer ? '#0369a1' : '#6b21a8', 
                  fontWeight: 800, 
                  fontSize: '18px',
                  position: 'relative',
                  flexShrink: 0,
                  overflow: 'hidden'
                }}>
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={m.displayName || m.name} />
                  ) : (
                    <User size={24} style={{ opacity: 0.8 }} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, color: 'var(--primary-text)', fontSize: '15px' }}>
                      {m.displayName || m.name}
                    </span>
                    <span style={{ 
                      fontSize: '9.5px', 
                      fontWeight: 800, 
                      padding: '2px 8px', 
                      borderRadius: '8px', 
                      textTransform: 'uppercase',
                      background: isOrganizer ? '#e0f2fe' : '#f3e8ff',
                      color: isOrganizer ? '#0369a1' : '#6b21a8'
                    }}>
                      {isOrganizer ? 'Орг' : 'Участник'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--secondary-text)', fontWeight: 600, marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {m.position || m.role || 'Участник'}{m.company ? ` @ ${m.company}` : ''}
                  </div>
                  
                  {Array.isArray(m.interests) && m.interests.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {m.interests.slice(0, 2).map((interest, idx) => (
                        <span 
                          key={idx} 
                          className="badge-interest-tag"
                          style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px' }}
                        >
                          #{interest}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <button 
                className="icon-btn" 
                style={{ 
                  color: isSending ? 'var(--secondary-text)' : (status === 'accepted' ? 'var(--accent-blue)' : (status === 'pending' ? 'var(--secondary-text)' : (status === 'rejected' ? '#ef4444' : 'var(--tg-theme-link-color)'))), 
                  background: 'var(--bg-main)', 
                  border: 'none', 
                  width: '44px',
                  height: '44px',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: (status === 'pending' || isSending || status === 'rejected') ? 'default' : 'pointer',
                  transition: '0.2s',
                  flexShrink: 0
                }} 
                onClick={() => status !== 'pending' && !isSending && status !== 'rejected' && handleAction(m)}
                disabled={isSending || status === 'pending' || status === 'rejected'}
              >
                {isSending && <div className="loader-mini" style={{ width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.1)', borderTop: '2px solid var(--tg-theme-link-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />}
                {!isSending && !status && <MessageSquare size={18} />}
                {!isSending && status === 'pending' && <Clock size={18} />}
                {!isSending && status === 'accepted' && <MessageCircle size={18} />}
                {!isSending && status === 'rejected' && <X size={18} style={{ color: '#ef4444' }} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConferenceMembersView;
