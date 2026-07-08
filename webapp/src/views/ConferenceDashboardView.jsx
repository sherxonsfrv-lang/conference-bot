import React, { useState } from 'react';
import { RU as t } from '../constants/locales';
import { api } from '../services/api';

const ConferenceDashboardView = ({ 
  conference = {},
  polls = [], 
  questions = [], 
  onCreatePoll, 
  onTogglePoll, 
  onDeletePoll,
  onUpdateQuestionStatus,
  onDeleteQuestion,
  onUpdateSettings,
  currentUser = {}
}) => {
  // Defensive checks to avoid empty screens if data is missing
  if (!conference) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#a0aec0' }}>Загрузка данных конференции...</div>;
  }

  const confCode = conference.code || conference.conferenceCode || 'N/A';
  const confTitle = conference.name || conference.title || 'Без названия';
  const confStatus = conference.isActive ? 'Активна' : 'Закрыта';
  
  const [activeSubTab, setActiveSubTab] = useState('general');
  const [showNewPoll, setShowNewPoll] = useState(false);
  const [newPollData, setNewPollData] = useState({ question: '', options: '' });

  const [adminUsers, setAdminUsers] = useState([]);
  const [confParticipants, setConfParticipants] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const loadAdminUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await api.adminGetUsers();
      setAdminUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching admin users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadConfParticipants = async () => {
    setUsersLoading(true);
    try {
      const data = await api.getParticipants(confCode);
      setConfParticipants(data.participants || []);
    } catch (err) {
      console.error('Error fetching conference participants:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleCreatePoll = () => {
    const opts = newPollData.options.split('\n').map(o => o.trim()).filter(Boolean);
    if (!newPollData.question || opts.length < 2) return;
    onCreatePoll(newPollData.question, opts);
    setNewPollData({ question: '', options: '' });
    setShowNewPoll(false);
  };

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(confTitle);

  // Sync internal state with props if it changes externally
  React.useEffect(() => {
    setEditedName(confTitle);
  }, [confTitle]);

  const handleUpdateName = () => {
    onUpdateSettings({ title: editedName });
    setIsEditingName(false);
  };

  const handleToggleAccess = () => {
    const nextAccess = conference.access === 'public' ? 'private' : 'public';
    onUpdateSettings({ access: nextAccess });
  };

  const handleFinishConference = () => {
    if (window.confirm('Вы уверены, что хотите завершить конференцию? Это действие нельзя отменить.')) {
      onUpdateSettings({ isActive: false, isEnded: true });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Скопировано: ' + text);
    });
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 800 }}>{t.admin.title}</h2>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'rgba(0,0,0,0.05)', padding: '4px', borderRadius: '16px' }}>
        <button 
          onClick={() => setActiveSubTab('general')}
          style={{ 
            flex: 1, padding: '10px', borderRadius: '12px', border: 'none', fontSize: '13px', fontWeight: 700,
            background: activeSubTab === 'general' ? 'white' : 'transparent',
            color: activeSubTab === 'general' ? 'black' : '#666',
            boxShadow: activeSubTab === 'general' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          Общее
        </button>
        <button 
          onClick={() => setActiveSubTab('polls')}
          style={{ 
            flex: 1, padding: '10px', borderRadius: '12px', border: 'none', fontSize: '13px', fontWeight: 700,
            background: activeSubTab === 'polls' ? 'white' : 'transparent',
            color: activeSubTab === 'polls' ? 'black' : '#666',
            boxShadow: activeSubTab === 'polls' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          {t.admin.polls}
        </button>
        <button 
          onClick={() => setActiveSubTab('questions')}
          style={{ 
            flex: 1, padding: '10px', borderRadius: '12px', border: 'none', fontSize: '13px', fontWeight: 700,
            background: activeSubTab === 'questions' ? 'white' : 'transparent',
            color: activeSubTab === 'questions' ? 'black' : '#666',
            boxShadow: activeSubTab === 'questions' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          {t.admin.questions}
        </button>
        <button 
          onClick={() => {
            setActiveSubTab('users');
            loadConfParticipants();
          }}
          style={{ 
            flex: 1, padding: '10px', borderRadius: '12px', border: 'none', fontSize: '13px', fontWeight: 700,
            background: activeSubTab === 'users' ? 'white' : 'transparent',
            color: activeSubTab === 'users' ? 'black' : '#666',
            boxShadow: activeSubTab === 'users' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          Участники
        </button>
      </div>

      {activeSubTab === 'general' && (
        <div className="animate-fade-in">
          <div className="card-soft" style={{ background: 'white', marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#a0aec0', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>КОД КОНФЕРЕНЦИИ</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '2px', color: 'var(--primary-text)' }}>{confCode}</div>
              <button 
                className="btn-outline" 
                onClick={() => copyToClipboard(confCode)}
                style={{ width: 'auto', padding: '10px 16px', fontSize: '12px', borderRadius: '12px', background: '#f8fafc', border: 'none' }}
              >
                Копировать
              </button>
            </div>
          </div>

          <div className="card-soft" style={{ background: 'white' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#a0aec0', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>ИНФОРМАЦИЯ</div>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Название</div>
              {!isEditingName ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>{confTitle}</div>
                  <button 
                    onClick={() => setIsEditingName(true)}
                    style={{ background: 'none', border: 'none', color: 'var(--link-color)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Изменить
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    className="form-input" 
                    value={editedName} 
                    onChange={e => setEditedName(e.target.value)} 
                    style={{ padding: '8px 12px', height: '40px' }}
                  />
                  <button className="btn-solid" onClick={handleUpdateName} style={{ width: 'auto', padding: '0 16px', height: '40px', fontSize: '12px' }}>ОК</button>
                  <button className="btn-outline" onClick={() => setIsEditingName(false)} style={{ width: 'auto', padding: '0 16px', height: '40px', border: 'none', fontSize: '12px' }}>Отмена</button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Статус</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ 
                    width: '8px', height: '8px', borderRadius: '4px', 
                    background: conference.isEnded ? '#94a3b8' : conference.isActive ? '#22c55e' : '#f59e0b' 
                  }}></div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>
                    {conference.isEnded ? 'Завершена' : conference.isActive ? 'Активна' : 'Ожидает старта'}
                  </div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Доступ</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-blue)' }}>
                  {conference.access === 'public' ? 'Публичная' : 'Приватная'}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>Публичный доступ</div>
                  <div style={{ fontSize: '12px', color: '#a0aec0' }}>Показывать в общем списке</div>
                </div>
                <button 
                  onClick={handleToggleAccess}
                  style={{ 
                    width: '44px', height: '24px', borderRadius: '12px', position: 'relative', border: 'none', cursor: 'pointer',
                    background: conference.access === 'public' ? 'var(--accent-blue)' : '#cbd5e0',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ 
                    position: 'absolute', top: '3px', width: '18px', height: '18px', borderRadius: '9px', background: 'white',
                    left: conference.access === 'public' ? '23px' : '3px',
                    transition: 'all 0.2s'
                  }} />
                </button>
              </div>

              {!conference.isActive && !conference.isEnded && (
                <button 
                  className="btn-solid" 
                  onClick={() => {
                    if (window.confirm('Запустить конференцию? Участники смогут присоединиться после этого.')) {
                      onUpdateSettings({ isActive: true });
                    }
                  }}
                  style={{ background: '#22c55e', color: 'white', border: 'none', marginTop: '8px', boxShadow: '0 4px 12px rgba(34,197,94,0.25)' }}
                >
                  🚀 Запустить конференцию
                </button>
              )}

              {conference.isActive && !conference.isEnded && (
                <button 
                  className="btn-outline" 
                  onClick={handleFinishConference}
                  style={{ color: '#ef4444', border: '1.5px solid #fee2e2', background: '#fef2f2', marginTop: '8px' }}
                >
                  Завершить конференцию
                </button>
              )}
            </div>
          </div>

          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: '#a0aec0', lineHeight: 1.5 }}>
              Вы являетесь организатором этого события.<br/>
              Управляйте вопросами и опросами в соответствующих вкладках выше.
            </p>
          </div>
        </div>
      )}

      {activeSubTab === 'polls' && (
        <div className="animate-fade-in">
          {!showNewPoll ? (
            <button 
              className="btn-solid" 
              onClick={() => setShowNewPoll(true)}
              style={{ marginBottom: '24px', background: 'black', color: 'white', borderRadius: '18px', padding: '16px' }}
            >
              + {t.admin.new_poll}
            </button>
          ) : (
            <div className="card-soft" style={{ marginBottom: '24px', border: '1.5px solid #edf2f7', background: '#fff' }}>
              <h3 style={{ marginTop: 0, fontSize: '18px', marginBottom: '16px' }}>{t.admin.new_poll}</h3>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#666', display: 'block', marginBottom: '6px' }}>{t.admin.poll_question}</label>
                <input 
                  className="form-input" 
                  placeholder="Например: Как вам первый доклад?"
                  value={newPollData.question}
                  onChange={e => setNewPollData(prev => ({ ...prev, question: e.target.value }))}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#666', display: 'block', marginBottom: '6px' }}>{t.admin.options}</label>
                <textarea 
                  className="form-input" 
                  placeholder="Вариант 1&#10;Вариант 2&#10;Вариант 3"
                  rows={4}
                  value={newPollData.options}
                  onChange={e => setNewPollData(prev => ({ ...prev, options: e.target.value }))}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-solid" onClick={handleCreatePoll} style={{ flex: 2 }}>{t.admin.create_btn}</button>
                <button className="btn-outline" onClick={() => setShowNewPoll(false)} style={{ flex: 1, border: 'none' }}>{t.common.cancel}</button>
              </div>
            </div>
          )}

          {polls.length === 0 ? (
            <div className="card-soft" style={{ textAlign: 'center', padding: '48px 0', background: 'transparent', border: '2px dashed #edf2f7', boxShadow: 'none' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>📊</div>
              <div style={{ fontWeight: 700, color: '#a0aec0' }}>{t.admin.no_polls}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {polls.map(poll => (
                <div key={poll.id} className="card-soft" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px' }}>
                  <div style={{ flex: 1, marginRight: '16px' }}>
                    <div style={{ fontWeight: 700, marginBottom: '6px', fontSize: '16px' }}>{poll.question}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', padding: '2px 8px', borderRadius: '6px',
                        background: poll.isActive ? '#ebfbf5' : '#f8fafc',
                        color: poll.isActive ? '#065f46' : '#a0aec0'
                      }}>
                        {poll.isActive ? 'Активен' : 'Завершен'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#a0aec0', fontWeight: 500 }}>
                        {poll.totalVotes || 0} голосов
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => onTogglePoll(poll.id)}
                      title={poll.isActive ? "Завершить" : "Активировать"}
                      style={{ background: '#f8fafc', border: 'none', padding: '10px', borderRadius: '12px', color: poll.isActive ? '#f59e0b' : '#22c55e' }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button 
                      onClick={() => onDeletePoll(poll.id)}
                      style={{ background: '#fef2f2', border: 'none', padding: '10px', borderRadius: '12px', color: '#ef4444' }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'questions' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.admin.moderation}</div>
            <div style={{ fontSize: '12px', color: '#a0aec0', fontWeight: 600 }}>{questions.length} всего</div>
          </div>
          
          {questions.length === 0 ? (
            <div className="card-soft" style={{ textAlign: 'center', padding: '48px 0', background: 'transparent', border: '2px dashed #edf2f7', boxShadow: 'none' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>❓</div>
              <div style={{ fontWeight: 700, color: '#a0aec0' }}>{t.admin.no_questions}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {questions.map(q => (
                <div key={q.id} className="card-soft" style={{ padding: '20px', border: q.status === 'pending' ? '1.5px solid var(--accent-purple)' : 'none' }}>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                      <img src={q.askedBy?.avatarUrl || "https://ui-avatars.com/api/?name=User"} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: '14px', fontWeight: 800 }}>{q.askedBy?.firstName} {q.askedBy?.lastName}</div>
                        <div style={{ 
                          fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', padding: '3px 8px', borderRadius: '6px',
                          background: q.status === 'approved' ? '#ebfbf5' : q.status === 'rejected' ? '#fef2f2' : '#fefce8',
                          color: q.status === 'approved' ? '#065f46' : q.status === 'rejected' ? '#9b2c2c' : '#854d0e'
                        }}>
                          {q.status === 'pending' ? 'На модерации' : q.status === 'approved' ? 'Одобрен' : 'Отклонен'}
                        </div>
                      </div>
                      <div style={{ fontSize: '15px', color: 'var(--primary-text)', marginTop: '6px', lineHeight: 1.4, fontWeight: 500 }}>{q.text}</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                    <button 
                      onClick={() => onDeleteQuestion(q.id)}
                      style={{ background: 'none', border: 'none', padding: '8px', borderRadius: '10px', color: '#a0aec0', marginRight: 'auto' }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>

                    {q.status !== 'rejected' && (
                      <button 
                        onClick={() => onUpdateQuestionStatus(q.id, 'rejected')}
                        style={{ border: 'none', background: '#fef2f2', color: '#ef4444', padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 700 }}
                      >
                        {t.admin.reject}
                      </button>
                    )}
                    
                    {q.status !== 'approved' && (
                      <button 
                        onClick={() => onUpdateQuestionStatus(q.id, 'approved')}
                        style={{ border: 'none', background: '#22c55e', color: 'white', padding: '8px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)' }}
                      >
                        {t.admin.approve}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'users' && (
        <div className="animate-fade-in">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Участники события</h4>
              <button className="btn-outline" style={{ height: 'auto', padding: '6px 12px', fontSize: '12px' }} onClick={loadConfParticipants}>Обновить</button>
            </div>
            
            {usersLoading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#a0aec0' }}>Загрузка участников...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {confParticipants.map(p => (
                  <div key={p.id} className="card-soft" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '15px' }}>{p.displayName}</div>
                        <div style={{ fontSize: '12px', color: '#a0aec0' }}>@{p.username || 'no_username'} • {p.role || 'Member'}</div>
                      </div>
                    </div>

                    {p.purpose && (
                      <div style={{ fontSize: '13px', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', color: '#4a5568' }}>
                        <b>Цель:</b> {p.purpose}
                      </div>
                    )}

                    {Array.isArray(p.interests) && p.interests.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '12px', color: '#64748b' }}>
                        {p.interests.slice(0, 3).map((interest, i) => (
                          <span key={i} style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>#{interest}</span>
                        ))}
                      </div>
                    )}

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#4a5568' }}>Назначить организатором</span>
                      <button
                        type="button"
                        onClick={async () => {
                          const newRole = p.role === 'organizer' ? 'participant' : 'organizer';
                          try {
                            await api.organizerUpdateParticipant(p.id, { role: newRole });
                            loadConfParticipants();
                          } catch (err) {
                            alert(err.message || 'Ошибка обновления');
                          }
                        }}
                        style={{
                          width: '44px', height: '24px', borderRadius: '12px', position: 'relative', border: 'none', cursor: 'pointer',
                          background: p.role === 'organizer' ? 'var(--link-color)' : '#cbd5e0',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{
                          position: 'absolute', top: '3px', width: '18px', height: '18px', borderRadius: '9px', background: 'white',
                          left: p.role === 'organizer' ? '23px' : '3px',
                          transition: 'all 0.2s'
                        }} />
                      </button>
                    </div>
                  </div>
                ))}
                {confParticipants.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#a0aec0' }}>Участники не найдены</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConferenceDashboardView;
