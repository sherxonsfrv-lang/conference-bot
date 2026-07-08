import React from 'react';
import { RU as t } from '../constants/locales';

const MemberProfileModal = ({ isOpen, member, requestStatus, rejectCounts = {}, onSendRequest, onOpenChat, onClose, currentUserTelegramId, isRequestsLoaded = true }) => {
  if (!isOpen || !member) return null;

  // Lookup status by telegramId, which is our consistent key
  const targetId = member.telegramId || member.userId || member.id;
  const currentStatus = member.chatStatus || requestStatus[targetId];

  const InfoRow = ({ label, value, isBio }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
      <label style={{ fontSize: '10px', fontWeight: 800, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      <div style={{
        color: value ? 'var(--primary-text)' : '#cbd5e0',
        fontWeight: 600,
        fontSize: '15px',
        lineHeight: isBio ? 1.5 : 1.2
      }}>
        {value || t.profile.not_set}
      </div>
    </div>
  );

  const isMe = String(member.telegramId || member.userId) === String(currentUserTelegramId);
  const fullName = member.displayName || member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || t.profile.not_set;

  return (
    <div className="modal-overlay animate-fade-in" style={{ zIndex: 2100 }} onClick={onClose}>
      <div
        className="modal-content no-scrollbar animate-pop-in"
        style={{ paddingBottom: '32px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{ position: 'absolute', right: '20px', top: '20px', background: '#f8fafc', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M5.29289 5.29289C5.68342 4.90237 6.31658 4.90237 6.70711 5.29289L12 10.5858L17.2929 5.29289C17.6834 4.90237 18.3166 4.90237 18.7071 5.29289C19.0976 5.68342 19.0976 6.31658 18.7071 6.70711L13.4142 12L18.7071 17.2929C19.0976 17.6834 19.0976 18.3166 18.7071 18.7071C18.3166 19.0976 17.6834 19.0976 17.2929 18.7071L12 13.4142L6.70711 18.7071C6.31658 19.0976 5.68342 19.0976 5.29289 18.7071C4.90237 18.3166 4.90237 17.6834 5.29289 17.2929L10.5858 12L5.29289 6.70711C4.90237 6.31658 4.90237 5.68342 5.29289 5.29289Z" fill="#0F1729" />
          </svg>
        </button>

        <div style={{ textAlign: 'center', marginBottom: '32px', marginTop: '10px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '28px', background: 'var(--accent-blue)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', color: 'var(--primary)', fontWeight: 700 }}>
            {fullName[0]}
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)', marginBottom: '4px' }}>{fullName}</h2>
          <div style={{ fontSize: '14px', color: '#a0aec0', fontWeight: 600 }}>{member.role || t.modal.role} @ {member.company || t.modal.company}</div>
        </div>

        <div style={{ background: '#f8fafc', borderRadius: '24px', padding: '24px', marginBottom: '32px' }}>
          <InfoRow label={t.profile.about} value={member.about} isBio />
          <InfoRow label={t.profile.looking_for} value={member.lookingFor} />

          <div style={{ height: '1.5px', background: '#edf2f7', margin: '8px 0 20px' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <InfoRow label={t.profile.country} value={member.country} />
            <InfoRow label={t.profile.city} value={member.city} />
          </div>

          <div style={{ height: '1.5px', background: '#edf2f7', margin: '8px 0 20px' }} />

          {/* Masked Contact Details */}
          {(() => {
            const showContacts = isMe || currentStatus === 'accepted';
            const mask = (val) => (val ? '***' : null);

            return (
              <>
                <InfoRow label={t.profile.email} value={showContacts ? member.email : mask(member.email)} />
                <InfoRow label="Телефон" value={showContacts ? member.phone : mask(member.phone)} />
                <InfoRow label="Telegram" value={showContacts ? (member.telegram ? `@${member.telegram.replace('@', '')}` : null) : mask(member.telegram)} />
                <InfoRow label="WhatsApp" value={showContacts ? member.whatsapp : mask(member.whatsapp)} />
              </>
            );
          })()}
        </div>

        {!isMe && (
          <div style={{ display: 'flex', gap: '12px' }}>
            {!isRequestsLoaded ? (
              <button
                className="btn-solid"
                style={{
                  flex: 1,
                  height: '56px',
                  background: '#edf2f7',
                  color: '#a0aec0',
                  cursor: 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                disabled
              >
                <div className="spinner-small" />
                Загрузка...
              </button>
            ) : currentStatus === 'accepted' ? (
              <button
                className="btn-solid"
                style={{ flex: 1, height: '56px', background: 'var(--accent-blue)', color: 'white' }}
                onClick={() => { onOpenChat(member); onClose(); }}
              >
                {t.modal.chat_btn}
              </button>
            ) : (rejectCounts[targetId] >= 5) ? (
              <button
                className="btn-outline"
                style={{ flex: 1, height: '56px', border: 'none', background: '#fff5f5', color: '#e53e3e', cursor: 'not-allowed', fontWeight: 700 }}
                disabled
              >
                Запросы заблокированы (5 отказов)
              </button>
            ) : (currentStatus === 'pending' || member.isSendingRequest) ? (
              <button
                className="btn-solid"
                style={{
                  flex: 1,
                  height: '56px',
                  background: '#edf2f7',
                  color: '#a0aec0',
                  cursor: 'not-allowed'
                }}
                disabled
              >
                {member.isSendingRequest ? 'Отправка...' : t.modal.pending}
              </button>
            ) : (
              <button
                className="btn-solid"
                style={{
                  flex: 1,
                  height: '56px',
                  background: 'var(--primary-solid)',
                  color: 'white'
                }}
                onClick={() => onSendRequest(member)}
              >
                {t.modal.write_btn}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberProfileModal;
