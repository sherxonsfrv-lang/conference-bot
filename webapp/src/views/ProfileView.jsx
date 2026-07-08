import React from 'react';
import { RU as t } from '../constants/locales';
import { 
  User, 
  Send, 
  Phone, 
  BookOpen, 
  Search, 
  Briefcase, 
  MapPin, 
  Mail, 
  PhoneCall, 
  CheckCircle,
  Edit2
} from 'lucide-react';
import './Views.css';

const ProfileView = ({ profile, onEdit }) => (
  <div className="animate-fade-in" style={{ paddingBottom: '48px' }}>
    <div className="card-soft" style={{ textAlign: 'center', padding: '40px 24px', marginBottom: '24px', position: 'relative' }}>
      <button 
        onClick={onEdit} 
        className="btn-round-back" 
        style={{ position: 'absolute', top: '20px', right: '20px', width: '36px', height: '36px' }}
        title="Редактировать профиль"
      >
        <Edit2 size={16} />
      </button>

      <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--accent-blue)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', overflow: 'hidden', boxShadow: '0 8px 20px rgba(56, 159, 233, 0.2)' }}>
        {profile?.avatarUrl ? (
          <img src={profile.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <User size={48} style={{ opacity: 0.8 }} />
        )}
      </div>
      <h2 style={{ color: 'var(--primary-text)', marginBottom: '4px', fontSize: '22px', fontWeight: 800 }}>{profile?.firstName} {profile?.lastName}</h2>
      <p style={{ color: 'var(--secondary-text)', marginBottom: 0, fontSize: '13.5px', fontWeight: 500 }}>@{profile?.username || 'username'}</p>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginTop: '32px' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '20px', color: 'var(--primary-text)' }}>{profile?.meetingsCount ?? 0}</div>
          <div style={{ fontSize: '11px', color: 'var(--secondary-text)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>{t.profile.meetings}</div>
        </div>
        <div style={{ width: '1px', background: '#edf2f7' }} />
        <div>
          <div style={{ fontWeight: 800, fontSize: '20px', color: 'var(--primary-text)' }}>{profile?.connectionsCount ?? 0}</div>
          <div style={{ fontSize: '11px', color: 'var(--secondary-text)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>{t.profile.connections}</div>
        </div>
      </div>
    </div>

    <div className="card-soft" style={{ padding: '24px', marginBottom: '24px' }}>
      <h3 style={{ color: 'var(--primary-text)', marginBottom: '20px', fontSize: '16.5px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Send size={18} style={{ transform: 'rotate(-20deg)', color: '#389fe9' }} />
        {t.profile.messengers}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <InfoRow icon={<Send size={15} />} label="Telegram" value={profile?.telegram ? `@${profile.telegram}` : null} />
        <InfoRow icon={<Phone size={15} />} label="WhatsApp" value={profile?.whatsapp} />
      </div>
    </div>

    <div className="card-soft" style={{ padding: '24px', marginBottom: '100px' }}>
      <h3 style={{ color: 'var(--primary-text)', marginBottom: '20px', fontSize: '16.5px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BookOpen size={18} style={{ color: 'var(--accent-purple)' }} />
        {t.profile.personal_info}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <InfoRow icon={<BookOpen size={15} />} label={t.profile.about} value={profile?.about} isBio />
        <InfoRow icon={<Search size={15} />} label={t.profile.looking_for} value={profile?.lookingFor} />
        <div style={{ height: '1px', background: '#edf2f7', margin: '4px 0' }} />
        <InfoRow icon={<Briefcase size={15} />} label={t.profile.company} value={profile?.company} />
        <InfoRow icon={<Briefcase size={15} />} label={t.profile.position} value={profile?.position} />
        <div style={{ height: '1px', background: '#edf2f7', margin: '4px 0' }} />
        <InfoRow icon={<MapPin size={15} />} label={t.profile.country} value={profile?.country} />
        <InfoRow icon={<MapPin size={15} />} label={t.profile.region} value={profile?.region} />
        <InfoRow icon={<MapPin size={15} />} label={t.profile.city} value={profile?.city} />
        <div style={{ height: '1px', background: '#edf2f7', margin: '4px 0' }} />
        <InfoRow icon={<Mail size={15} />} label={t.profile.email} value={profile?.email} />
        <InfoRow icon={<PhoneCall size={15} />} label={t.profile.phone} value={profile?.phone} />
      </div>
      
      <button className="btn-solid btn-submit-auth" onClick={onEdit} style={{ marginTop: '32px' }}>
        {t.profile.update_btn}
      </button>
    </div>
  </div>
);

const InfoRow = ({ icon, label, value, isBio }) => (
  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
    <div style={{ marginTop: '3px', color: 'var(--secondary-text)', opacity: 0.7 }}>
      {icon}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
      <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--secondary-text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      <div style={{ 
        color: value ? 'var(--primary-text)' : '#cbd5e0', 
        fontWeight: 600, 
        fontSize: '14.5px',
        lineHeight: isBio ? 1.5 : 1.2
      }}>
        {value || t.profile.not_set}
      </div>
    </div>
  </div>
);

export default ProfileView;
