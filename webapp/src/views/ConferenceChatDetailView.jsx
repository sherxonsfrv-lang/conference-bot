import React, { useState, useEffect, useRef } from 'react';
import { RU as t } from '../constants/locales';

const formatDividerDate = (dateVal) => {
  if (!dateVal) return '';
  const date = new Date(dateVal);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Сегодня';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Вчера';
  } else {
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }
};

const formatMessageTime = (dateVal) => {
  if (!dateVal) return '';
  const date = new Date(dateVal);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

const ConferenceChatDetailView = ({ chat, messages = [], onBack, onSendMessage, showToast, isSending }) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef(null);

  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = (behavior = 'auto') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior
      });
    }
  };

  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (messages.length > 0) {
      if (lastMsg?.fromSelf || isAtBottom) {
        scrollToBottom('smooth');
      }
    }
  }, [messages.length]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const atBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsAtBottom(atBottom);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !chat?.other?.id) return;
    try {
      await onSendMessage(chat.other.id, inputText, chat.conferenceCode);
      setInputText('');
    } catch (err) {
      showToast(err.message || 'Ошибка отправки сообщения', 'error');
    }
  };

  const otherUser = chat?.other || {};
  const chatMessages = Array.isArray(messages) ? messages : [];

  return (
    <div className="animate-fade-in" style={{ height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '24px', borderBottom: '1.5px solid #edf2f7' }}>
        <button className="btn-outline" style={{ width: '44px', height: '44px', padding: 0, borderRadius: '14px', border: 'none', background: 'white', boxShadow: 'var(--card-shadow-sm)' }} onClick={onBack}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '18px', overflow: 'hidden' }}>
          {otherUser.avatarUrl ? (
            <img src={otherUser.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={otherUser.name} />
          ) : (
            <span>{otherUser.name?.[0] || 'U'}</span>
          )}
        </div>
        <div>
          <div style={{ fontWeight: 800, color: 'var(--primary-text)', fontSize: '17px' }}>{otherUser.name}</div>
          <div style={{ fontSize: '12px', color: '#a0aec0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {chat.conferenceName || 'Чат конференции'}
          </div>
        </div>
      </div>

      {/* Message Area */}
      <div 
        ref={scrollRef} 
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '12px' }} 
        className="no-scrollbar"
      >
        {chatMessages.length > 0 ? (() => {
          let lastDateStr = null;
          return chatMessages.map((msg, idx) => {
            const isMine = msg.fromSelf || msg.isMine;
            const msgTime = msg.time || msg.createdAt;
            
            let dateDivider = null;
            if (msgTime) {
              const currentDate = new Date(msgTime);
              const currentDateStr = currentDate.toDateString();
              if (currentDateStr !== lastDateStr) {
                lastDateStr = currentDateStr;
                dateDivider = (
                  <div style={{
                    position: 'sticky',
                    top: '0px',
                    zIndex: 10,
                    display: 'flex',
                    justifyContent: 'center',
                    margin: '12px 0',
                    pointerEvents: 'none'
                  }}>
                    <span style={{
                      background: 'rgba(226, 232, 240, 0.85)',
                      backdropFilter: 'blur(8px)',
                      color: '#475569',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 14px',
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                      pointerEvents: 'auto'
                    }}>
                      {formatDividerDate(msgTime)}
                    </span>
                  </div>
                );
              }
            }

            return (
              <React.Fragment key={msg.id || idx}>
                {dateDivider}
                <div style={{ 
                  alignSelf: isMine ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMine ? 'flex-end' : 'flex-start'
                }}>
                  <div style={{ 
                    padding: '14px 18px', 
                    borderRadius: isMine ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                    background: isMine ? 'var(--primary-solid)' : 'white',
                    color: isMine ? 'white' : 'var(--primary-text)',
                    fontSize: '15px',
                    fontWeight: 500,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
                  }}>
                    {msg.text}
                  </div>
                  <div style={{ fontSize: '10px', color: '#a0aec0', marginTop: '4px', fontWeight: 600, padding: '0 4px' }}>
                    {msgTime ? formatMessageTime(msgTime) : ''}
                  </div>
                </div>
              </React.Fragment>
            );
          });
        })() : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#a0aec0', fontSize: '14px' }}>
            Нет сообщений. Поздоровайтесь! 👋
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{ paddingTop: '20px', borderTop: '1.5px solid #edf2f7', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input 
            className="form-input" 
            placeholder="Сообщение..." 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            style={{ borderRadius: '24px', paddingRight: '50px', fontSize: '15px', height: '48px' }}
          />
          <button 
            style={{ position: 'absolute', right: '6px', top: '6px', width: '36px', height: '36px', borderRadius: '50%', background: (inputText.trim() || isSending) ? 'var(--primary-solid)' : '#f8fafc', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: (inputText.trim() || isSending) ? 'white' : '#a0aec0', transition: 'all 0.2s' }} 
            onClick={handleSend}
            disabled={isSending}
          >
            {isSending ? (
              <div className="spinner-small" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConferenceChatDetailView;
