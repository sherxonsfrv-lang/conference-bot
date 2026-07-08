import React, { useState, useEffect } from 'react';
import { RU as t } from '../constants/locales';
import { api } from '../services/api';
import { ArrowLeft, Search, X, ChevronRight, User } from 'lucide-react';
import './Views.css';

const SearchProfilesView = ({ onBack, onViewProfile, showToast, profile }) => {
  const [query, setQuery] = useState('');
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  console.log(profile)

  const fetchProfiles = async (q = '') => {
    setLoading(true);
    try {
      const data = await api.searchPublicProfiles(q);
      setProfiles(data.profiles || []);
    } catch (err) {
      console.error('Search profiles error:', err);
      showToast('Ошибка поиска профилей', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProfiles(query);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleClear = () => {
    setQuery('');
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        {/* <button className="btn-round-back" onClick={onBack} title="Назад">
          <ArrowLeft size={20} />
        </button> */}
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--primary-text)' }}>Поиск контактов</h2>
      </div>

      {/* Search Bar */}
      <div className="card-soft" style={{ background: 'var(--card-bg)', marginBottom: '24px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', border: '1.5px solid #edf2f7' }}>
        <Search size={20} style={{ color: 'var(--secondary-text)', opacity: 0.6 }} />
        <input 
          placeholder="Поиск по имени, компании или интересам..." 
          style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '15px', color: 'var(--primary-text)' }}
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <button onClick={handleClear} style={{ background: 'none', border: 'none', color: 'var(--secondary-text)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--secondary-text)' }}>Загрузка...</div>
      ) : profiles.length === 0 ? (
        <div className="empty-state">
          <Search size={48} className="empty-state-icon" />
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary-text)' }}>Профили не найдены</div>
          <p className="empty-state-text" style={{ marginTop: '8px' }}>Попробуйте изменить запрос</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {profiles
            .filter((p) => p?.email && p.id !== profile?.id && String(p.telegramId) !== String(profile?.telegramId))
            .map(p => (
              <div 
                key={p.id} 
                className="event-card animate-scale-up" 
                onClick={() => onViewProfile(p)}
                style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px' }}
              >
                <div style={{ width: '56px', height: '56px', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#edf2f7' }}>
                  {p.avatarUrl ? (
                    <img 
                      src={p.avatarUrl} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      alt={p.firstName}
                    />
                  ) : (
                    <User size={24} style={{ color: '#cbd5e1' }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-text)' }}>{p.firstName} {p.lastName}</div>
                  <div style={{ fontSize: '13px', color: 'var(--secondary-text)', marginTop: '2px' }}>
                    {p.position}{p.company ? ` @ ${p.company}` : ''}
                  </div>
                  {p.interests && p.interests.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {(Array.isArray(p.interests) ? p.interests : []).slice(0, 3).map((interest, i) => (
                        <span key={i} className="badge-interest-tag" style={{ fontSize: '9.5px', padding: '2px 8px', borderRadius: '6px' }}>
                          #{interest}
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
      )}
    </div>
  );
};

export default SearchProfilesView;
