import React from 'react';
import { ArrowLeft, User, ThumbsUp } from 'lucide-react';
import './Views.css';

const ConferenceQuestionsListView = ({ onBack, questions = [], onUpvote }) => {
  return (
    <div className="animate-fade-in" style={{ paddingBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button className="btn-round-back" onClick={onBack} title="Назад">
          <ArrowLeft size={20} />
        </button>
        <h3 style={{ margin: 0, fontWeight: 800, fontSize: '20px', color: 'var(--primary-text)' }}>Все вопросы конференции</h3>
      </div>

      {questions.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--secondary-text)', fontSize: '14px', padding: '40px 0' }}>
          Вопросов ещё нет
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {questions.map(q => (
            <div key={q.id} className="card-soft" style={{ padding: '20px', borderRadius: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {q.authorAvatarUrl ? (
                      <img src={q.authorAvatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="author" />
                    ) : (
                      <User size={16} style={{ color: '#cbd5e1' }} />
                    )}
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--primary-text)' }}>{q.authorName || q.authorFirstName || 'Аноним'}</div>
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--secondary-text)', fontWeight: 600 }}>
                  {new Date(q.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <p style={{ margin: '0 0 16px 0', fontSize: '14.5px', color: 'var(--primary-text)', lineHeight: 1.5 }}>{q.text}</p>
              {onUpvote && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => onUpvote(q.id)}
                    style={{
                      background: q.hasUpvoted ? 'var(--accent-blue)' : 'none',
                      border: '1.5px solid var(--accent-blue)',
                      borderRadius: '10px',
                      padding: '6px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: q.hasUpvoted ? 'white' : 'var(--accent-blue)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <ThumbsUp size={13} />
                    <span>{q.upvotes || 0}</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConferenceQuestionsListView;
