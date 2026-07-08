import React from 'react';
import { RU as t } from '../../constants/locales';
import { X, UserPlus, Megaphone, MessageSquare, Bell } from 'lucide-react';

const NotificationsDrawer = ({ onClose, onOpenRequest, onClickNotification, notifications = [], onMarkAllRead, requestStatuses = {} }) => {
  
  // Helper to fetch request status by requestId or senderId
  const getRequestStatus = (n) => {
    if (n.type !== 'chat_request') return null;
    const chatRequestId = n.data?.chatRequestId;
    const senderId = n.data?.fromTelegramId || n.data?.senderTelegramId;
    
    if (chatRequestId && requestStatuses[chatRequestId]) {
      return requestStatuses[chatRequestId];
    }
    if (senderId) {
      return requestStatuses[senderId] || requestStatuses[String(senderId)] || requestStatuses[Number(senderId)];
    }
    return null;
  };

  // Keep all notifications, including processed chat requests
  const filteredNotifications = notifications;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer" style={{ background: 'var(--bg-main)', padding: '32px 24px', display: 'flex', flexDirection: 'column' }}>
        <div className="drawer-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary-text)', margin: 0 }}>
            {t.common.notifications || 'Уведомления'}
          </h2>
          <button className="close-btn" onClick={onClose} style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--card-bg)', border: 'none', boxShadow: 'var(--card-shadow-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--primary-text)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }} className="no-scrollbar">
          {filteredNotifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--secondary-text)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
               <Bell size={40} style={{ opacity: 0.3 }} />
               <span>{t.common.no_notifications || 'Уведомлений пока нет'}</span>
            </div>
          ) : filteredNotifications.map(n => {
            const senderId = n.data?.fromTelegramId || n.data?.senderTelegramId;
            const status = getRequestStatus(n);
            const isProcessedRequest = n.type === 'chat_request' && status && status !== 'pending';

            return (
              <div 
                key={n.id} 
                className={`card-soft animate-fade-in ${n.isRead ? '' : 'unread'}`} 
                style={{ 
                  background: 'var(--card-bg)', 
                  padding: '16px', 
                  borderRadius: '20px', 
                  border: n.isRead ? '1px solid rgba(0,0,0,0.02)' : n.type === 'system_notification' ? '1.5px solid var(--accent-orange)' : '1.5px solid var(--accent-blue)',
                  cursor: isProcessedRequest ? 'default' : 'pointer',
                  position: 'relative',
                  opacity: isProcessedRequest ? 0.6 : 1,
                  boxShadow: 'var(--card-shadow-sm)'
                }}
                
                onClick={() => {
                  // Always mark notification as read when clicked
                  if(n.isRead) return
                  if (!n.isRead && onClickNotification) {
                     onClickNotification(n.id);
                  }
                  
                  if (n.type === 'chat_request') {
                    // Do not open modal if request has already been handled (accepted/rejected)
                    if (isProcessedRequest) {
                      return;
                    }
                    
                    const hasConf = n.data.conferenceCode && n.data.conferenceCode !== 'null' && n.data.conferenceCode !== 'undefined';
                    onOpenRequest({
                      id: n.data.chatRequestId,
                      from: { 
                        name: n.data.senderName || 'Участник',
                        telegramId: senderId 
                      },
                      conference: hasConf ? { name: n.body.split('«')[1]?.split('»')[0] || 'Конференция' } : null,
                      conferenceCode: n.data.conferenceCode,
                      notificationId: n.id
                    });
                  }
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '12px', 
                    background: n.type === 'chat_request' ? 'var(--accent-purple)' : n.type === 'system_notification' ? 'var(--accent-orange)' : 'var(--accent-blue)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: 'white', 
                    flexShrink: 0 
                  }}>
                    {n.type === 'chat_request' ? <UserPlus size={18} /> : n.type === 'system_notification' ? <Megaphone size={18} /> : <MessageSquare size={18} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary-text)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {n.title}
                      {isProcessedRequest && (
                        <span style={{ 
                          fontSize: '10px', 
                          fontWeight: 800, 
                          padding: '2px 8px', 
                          borderRadius: '8px', 
                          background: status === 'accepted' ? '#ebfbf5' : '#fff5f5', 
                          color: status === 'accepted' ? '#065f46' : '#9b2c2c',
                          textTransform: 'uppercase'
                        }}>
                          {status === 'accepted' ? 'Принят' : 'Отклонён'}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--secondary-text)', fontWeight: 500, lineHeight: 1.4 }}>{n.body}</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--secondary-text)', marginTop: '8px', fontWeight: 600, opacity: 0.8 }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {!n.isRead && (
                     <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: n.type === 'system_notification' ? 'var(--accent-orange)' : 'var(--accent-blue)', position: 'absolute', right: '16px', top: '16px' }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {notifications.length > 0 && (
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #edf2f7' }}>
            <button 
              className="btn-outline" 
              onClick={onMarkAllRead}
              style={{ width: '100%', border: 'none', background: 'transparent', color: 'var(--tg-theme-link-color)', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
            >
              {t.common.mark_all_read || 'Отметить все как прочитанные'}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationsDrawer;
