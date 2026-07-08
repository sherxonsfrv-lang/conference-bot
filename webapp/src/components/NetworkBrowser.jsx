import React, { useState } from 'react';
import { RU as t } from '../constants/locales';
import { ArrowLeft, Search, User, ChevronRight } from 'lucide-react';
import '../views/Views.css';

const NetworkBrowser = ({ onBack, accessPhase, onOpenPayment, onViewProfile, participants = [], onSearch }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = participants.filter(p =>
    (filter === 'all' || p.role?.toLowerCase() === filter.toLowerCase()) &&
    ((p.displayName || p.name)?.toLowerCase()?.includes(search.toLowerCase()) ||
      p.interests?.some(i => i?.toLowerCase()?.includes(search.toLowerCase())))
  );

  const isRestricted = accessPhase === 'payment_required';

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button className="btn-round-back" onClick={onBack} title="Назад">
          <ArrowLeft size={20} />
        </button>
        <div style={{ position: 'relative', flex: 1 }}>
          <input 
            className="search-input" 
            placeholder={t.networking.search_placeholder} 
            value={search}
            onChange={(e) => {
              const val = e.target.value;
              setSearch(val);
              onSearch?.(val);
            }}
            style={{ width: '100%', padding: '12px 16px 12px 44px', borderRadius: '16px', border: 'none', background: 'var(--card-bg)', boxShadow: 'var(--card-shadow-sm)', color: 'var(--primary-text)', fontWeight: 500 }}
          />
          <span style={{ position: 'absolute', left: '16px', top: '12px', width: '20px', height: '20px', color: 'var(--secondary-text)', opacity: 0.6 }}>
            <Search size={18} />
          </span>
        </div>
      </div>

      {isRestricted && (
        <div className="card-soft" style={{ textAlign: 'center', background: '#fef2f2', border: '1.5px solid #fee2e2', marginBottom: '24px', padding: '24px' }}>
          <h4 style={{ color: '#991b1b', marginBottom: '8px', fontWeight: 700 }}>{t.access.restricted_title}</h4>
          <p style={{ fontSize: '13px', color: '#991b1b', opacity: 0.8, marginBottom: '16px', fontWeight: 500 }}>{t.access.restricted_desc}</p>
          <button className="btn-solid" style={{ background: '#991b1b' }} onClick={onOpenPayment}>
            {t.access.pay_btn}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '8px' }} className="no-scrollbar">
        {['all', 'speaker', 'investor', 'developer', 'founder'].map(f => (
          <button 
            key={f} 
            className={`tab-pill ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
            style={{ 
              padding: '8px 16px', 
              borderRadius: '20px', 
              border: 'none', 
              background: filter === f ? 'var(--primary-solid)' : 'var(--card-bg)', 
              color: filter === f ? '#fff' : 'var(--primary-text)', 
              fontWeight: 600, 
              fontSize: '13px',
              boxShadow: 'var(--card-shadow-sm)',
              whiteSpace: 'nowrap',
              cursor: 'pointer'
            }}
          >
            {f === 'all' ? t.common.all : 
             f === 'speaker' ? 'Спикер' :
             f === 'investor' ? 'Инвестор' :
             f === 'developer' ? 'Разработчик' :
             f === 'founder' ? 'Основатель' : f}
          </button>
        ))}
      </div>

      <div className="participant-list responsive-grid-2" style={{ gap: '12px' }}>
        {filtered.map(p => (
            <div
              key={p.id}
              className="card-soft animate-fade-in networking-card"
              style={{ 
                display: 'flex', 
                gap: '16px', 
                alignItems: 'center', 
                padding: '16px', 
                borderRadius: '24px', 
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                border: '1px solid #f1f5f9'
              }}
              onClick={() => !p.isRestricted && onViewProfile?.(p)}
            >
              <div 
                className="profile-avatar-container"
                style={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '20px', 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(118, 75, 162, 0.2)',
                  color: 'white',
                  overflow: 'hidden'
                }}
              >
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={(p.displayName || p.name)} />
                ) : (
                  <User size={28} style={{ opacity: 0.8 }} />
                )}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 800, color: 'var(--primary-text)', fontSize: '16px', marginBottom: '4px' }}>{p.displayName || p.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--secondary-text)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="badge-role-pill">
                    {p.role || 'Участник'}
                  </span>
                  {p.company && <span style={{ opacity: 0.7 }}>• {p.company}</span>}
                </div>
                {!p.isRestricted && p.interests && p.interests.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                    {p.interests.slice(0, 2).map((tag, idx) => (
                      <span 
                        key={`${tag}-${idx}`} 
                        className="badge-interest-tag"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ color: 'var(--secondary-text)', opacity: 0.5 }}>
                <ChevronRight size={20} />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default NetworkBrowser;
