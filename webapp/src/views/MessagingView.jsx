import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, User, Search, Send as SendIcon } from 'lucide-react';
import './Views.css';

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

const MessagingView = ({ onChatStateChange, onViewProfile, initialSelectedChat, chats = [], messages = [], onSelectChat, onSendMessage, showToast, isSending }) => {
  const [search, setSearch] = useState('');
  const [selectedChat, setSelectedChat] = useState(initialSelectedChat || null);
  const [inputText, setInputText] = useState('');
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const scrollRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (initialSelectedChat) {
      setSelectedChat(initialSelectedChat);
      onChatStateChange?.(true);
    }
  }, [initialSelectedChat]);

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
    if (selectedChat && messages.length > 0) {
      if (lastMsg?.fromSelf || isAtBottom) {
        scrollToBottom('smooth');
      }
    }
  }, [selectedChat, messages.length]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const atBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsAtBottom(atBottom);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    try {
      await onSendMessage?.(selectedChat.other?.id, inputText.trim(), selectedChat.conferenceCode);
      setInputText('');
    } catch (err) {
      showToast?.(err.message || 'Ошибка отправки сообщения', 'error');
    }
  };

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    onSelectChat?.(chat);
    onChatStateChange?.(true);
  };

  const handleBackToList = () => {
    setSelectedChat(null);
    onChatStateChange?.(false);
  };

  const filteredChats = chats.filter(c =>
    (c.other?.name || c.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const renderChatList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <input
          className="form-input"
          placeholder="Поиск по имени..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '16px 16px 16px 48px', marginBottom: 0, borderRadius: '20px', border: 'none', background: 'var(--card-bg)', boxShadow: 'var(--card-shadow-sm)', color: 'var(--primary-text)' }}
        />
        <span style={{ position: 'absolute', left: '16px', top: '16px', opacity: 0.6, color: 'var(--secondary-text)' }}>
          <Search size={20} />
        </span>
      </div>

      {/* Chat List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1 }} className="no-scrollbar">
        {filteredChats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--secondary-text)', fontSize: '14px', lineHeight: 1.5 }}>
            Чатов пока нет. Отправьте запрос участнику конференции, чтобы начать общение.
          </div>
        ) : filteredChats.map(c => {
          const isSelected = selectedChat && (selectedChat.chatRequestId === c.chatRequestId || selectedChat.id === c.id);
          return (
            <div
              key={c.chatRequestId || c.id}
              className="event-card animate-fade-in"
              style={{
                display: 'flex',
                gap: '14px',
                alignItems: 'center',
                padding: '16px 20px',
                borderRadius: '24px',
                background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'var(--card-bg)',
                border: isSelected ? '1.5px solid var(--tg-theme-link-color)' : '1.5px solid transparent',
                cursor: 'pointer'
              }}
              onClick={() => handleSelectChat(c)}
            >
              <div
                style={{ width: '48px', height: '48px', borderRadius: '18px', background: '#edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}
                onClick={(e) => { e.stopPropagation(); c.other && onViewProfile?.(c.other); }}
              >
                {c.other?.avatarUrl ? <img src={c.other.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={c.other.name} /> : <User size={24} style={{ color: '#cbd5e1' }} />}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--primary-text)', fontSize: '15px' }}>{c.other?.name || c.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--secondary-text)', fontWeight: 600 }}>
                    {c.lastMessage?.time ? new Date(c.lastMessage.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : c.time || ''}
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--secondary-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.lastMessage?.text || c.lastMsg || 'Нет сообщений'}
                </div>
                {c.conferenceName && (
                  <div style={{ fontSize: '11px', color: 'var(--tg-theme-link-color)', fontWeight: 600, marginTop: '4px' }}>{c.conferenceName}</div>
                )}
              </div>
              {c.unreadCount > 0 && (
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#ef4444', color: 'white', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{c.unreadCount}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderChatMessages = (hideBackButton = false) => {
    const chatMessages = Array.isArray(messages) ? messages : [];
    const chatName = selectedChat.other?.name || selectedChat.name || 'Чат';
    const chatAvatar = selectedChat.other?.avatarUrl;

    return (
      <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '0 0 24px 0', borderBottom: '1.5px solid #edf2f7' }}>
          {!hideBackButton && (
            <button className="btn-round-back" onClick={handleBackToList} title="Назад">
              <ArrowLeft size={20} />
            </button>
          )}
          <div
            style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1565c0', fontWeight: 700, fontSize: '18px', cursor: 'pointer', overflow: 'hidden', boxShadow: '0 4px 10px rgba(56, 159, 233, 0.2)' }}
            onClick={() => selectedChat.other && onViewProfile?.(selectedChat.other)}
          >
            {chatAvatar ? <img src={chatAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={chatName} /> : <User size={22} style={{ color: 'white' }} />}
          </div>
          <div>
            <div style={{ fontWeight: 800, color: 'var(--primary-text)', fontSize: '17px' }}>{chatName}</div>
            <div style={{ fontSize: '12px', color: 'var(--secondary-text)', fontWeight: 600 }}>
              {selectedChat.conferenceName || selectedChat.conference || 'Чат'}
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
          {chatMessages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--secondary-text)', padding: '40px 20px', fontSize: '14.5px' }}>
              Нет сообщений. Напишите первым!
            </div>
          ) : (() => {
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
                    alignItems: isMine ? 'flex-end' : 'flex-start',
                  }}>
                    <div style={{
                      padding: '14px 18px',
                      borderRadius: isMine ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                      background: isMine ? 'var(--primary-solid)' : 'var(--card-bg)',
                      color: isMine ? 'white' : 'var(--primary-text)',
                      fontSize: '14.5px',
                      fontWeight: 500,
                      boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                      border: isMine ? 'none' : '1px solid #edf2f7'
                    }}>
                      {msg.text}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--secondary-text)', marginTop: '4px', fontWeight: 600, padding: '0 4px' }}>
                      {msgTime ? formatMessageTime(msgTime) : ''}
                    </div>
                  </div>
                </React.Fragment>
              );
            });
          })()}
        </div>

        {/* Input Area */}
        <div style={{ paddingTop: '20px', borderTop: '1.5px solid #edf2f7', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              className="form-input"
              placeholder="Сообщение..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              style={{ borderRadius: '24px', paddingRight: '50px' }}
            />
            <button
              style={{ position: 'absolute', right: '8px', top: '8px', width: '38px', height: '38px', borderRadius: '50%', background: (inputText.trim() || isSending) ? 'var(--primary-solid)' : 'var(--bg-main)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: (inputText.trim() || isSending) ? 'white' : 'var(--secondary-text)', transition: 'all 0.2s', cursor: 'pointer' }}
              onClick={handleSend}
              disabled={isSending}
            >
              {isSending ? (
                <div className="spinner-small" />
              ) : (
                <SendIcon size={18} />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isDesktop) {
    return (
      <div className="messaging-desktop-container" style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 120px)', width: '100%' }}>
        {/* Left Pane: Chats list */}
        <div style={{ width: '340px', display: 'flex', flexDirection: 'column', flexShrink: 0, borderRight: '1.5px solid #edf2f7', paddingRight: '24px' }}>
          {renderChatList()}
        </div>

        {/* Right Pane: Selected chat detail */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: selectedChat ? 'stretch' : 'center' }}>
          {selectedChat ? (
            renderChatMessages(true)
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--secondary-text)' }}>
              <div style={{ fontSize: '64px', marginBottom: '24px', opacity: 0.8 }}>💬</div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary-text)', margin: '0 0 8px 0' }}>Выберите собеседника</h3>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--secondary-text)' }}>Нажмите на любой чат слева, чтобы начать переписку</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Mobile Toggle Layout ────────────────────────────────────────────────
  if (selectedChat) {
    return renderChatMessages(false);
  }
  return renderChatList();
};

export default MessagingView;
