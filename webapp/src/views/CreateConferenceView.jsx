import React, { useState } from 'react';
import { RU as t } from '../constants/locales';
import { ArrowLeft, Calendar, Clock, MapPin, Tag, Users, FileText } from 'lucide-react';
import './Views.css';

const CreateConferenceView = ({ onBack, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    date: '',
    time: '',
    duration: '2h',
    repeat: 'None',
    tags: '',
    maxParticipants: 50,
    coverImage: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      return;
    }
    setLoading(true);
    try {
      // Process tags
      const processedData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        startsAt: new Date(`${formData.date}T${formData.time}`),
        day: new Date(formData.date).toLocaleDateString('ru-RU', { weekday: 'short' }).toUpperCase()
      };
      await onCreate(processedData);
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button className="btn-round-back" onClick={onBack} title="Назад">
          <ArrowLeft size={20} />
        </button>
        <h3 style={{ margin: 0, fontWeight: 800, fontSize: '20px', color: 'var(--primary-text)' }}>Создать конференцию</h3>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
        <div className="form-group">
          <label>Название конференции</label>
          <input 
            className="form-input" 
            name="name" 
            value={formData.name} 
            onChange={handleChange} 
            placeholder="Напр: Технологический саммит 2026" 
            required 
          />
        </div>

        <div className="form-group">
          <label>Описание</label>
          <textarea 
            className="form-input" 
            name="description" 
            value={formData.description} 
            onChange={handleChange} 
            placeholder="Расскажите участникам о программе и темах события..." 
            style={{ height: '100px', resize: 'none' }} 
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Дата проведения</label>
            <div className="form-input-container">
              <Calendar size={18} className="form-input-icon" />
              <input 
                className="form-input form-input-with-icon" 
                type="date" 
                name="date" 
                value={formData.date} 
                onChange={handleChange} 
                required 
              />
            </div>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Время начала</label>
            <div className="form-input-container">
              <Clock size={18} className="form-input-icon" />
              <input 
                className="form-input form-input-with-icon" 
                type="time" 
                name="time" 
                value={formData.time} 
                onChange={handleChange} 
                required 
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Длительность</label>
            <input 
              className="form-input" 
              name="duration" 
              value={formData.duration} 
              onChange={handleChange} 
              placeholder="2ч 30м" 
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Повторяемость</label>
            <select 
              className="form-input" 
              name="repeat" 
              value={formData.repeat} 
              onChange={handleChange} 
              style={{ appearance: 'none', background: 'var(--card-bg)' }}
            >
              <option value="None">Без повтора</option>
              <option value="Daily">Ежедневно</option>
              <option value="Weekly">Еженедельно</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Место проведения</label>
          <div className="form-input-container">
            <MapPin size={18} className="form-input-icon" />
            <input 
              className="form-input form-input-with-icon" 
              name="location" 
              value={formData.location} 
              onChange={handleChange} 
              placeholder="Online или физический адрес" 
            />
          </div>
        </div>

        <div className="form-group">
          <label>Теги (через запятую)</label>
          <div className="form-input-container">
            <Tag size={18} className="form-input-icon" />
            <input 
              className="form-input form-input-with-icon" 
              name="tags" 
              value={formData.tags} 
              onChange={handleChange} 
              placeholder="AI, Маркетинг, Нетворкинг" 
            />
          </div>
        </div>

        <div className="form-group">
          <label>Макс. количество участников</label>
          <div className="form-input-container">
            <Users size={18} className="form-input-icon" />
            <input 
              className="form-input form-input-with-icon" 
              type="number" 
              name="maxParticipants" 
              value={formData.maxParticipants} 
              onChange={handleChange} 
            />
          </div>
        </div>

        <button className="btn-solid btn-submit-auth" type="submit" disabled={loading} style={{ marginTop: '12px' }}>
          {loading ? 'Создание...' : 'Создать и опубликовать'}
        </button>
      </form>
    </div>
  );
};

export default CreateConferenceView;
