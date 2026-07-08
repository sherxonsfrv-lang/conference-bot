import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { RU as t } from '../constants/locales';

const QRGeneratorModal = ({ isOpen, onClose, conferenceCode, title }) => {
  const canvasRef = useRef(null);

  if (!isOpen) return null;

  const downloadQR = () => {
    const canvas = document.getElementById('qr-canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `QR_${conferenceCode}.png`;
    link.href = url;
    link.click();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(conferenceCode).then(() => {
      alert('Код скопирован: ' + conferenceCode);
    });
  };
  return (
    <div className="animate-fade-in" style={{ position: 'fixed', inset: 0, left: 0, right: 0, top: 0, bottom: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', zIndex: 4000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 10px', overflowY: 'auto' }}>
      <div className="card-soft animate-scale-up" style={{ background: 'white', width: '100%', maxWidth: '340px', padding: '24px 20px', textAlign: 'center', borderRadius: '32px', margin: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
          <button style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer' }} onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a202c" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 800, color: '#1a202c' }}>{title || 'Код конференции'}</h3>
        <p style={{ margin: '0 0 16px 0', color: '#718096', fontSize: '13px' }}>Покажите этот код участникам для быстрого входа</p>

        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '20px', display: 'inline-block', marginBottom: '16px' }}>
          <QRCodeCanvas 
            id="qr-canvas"
            value={conferenceCode} 
            size={180}
            level="H"
            includeMargin={true}
          />
        </div>

        <div 
          onClick={copyToClipboard}
          style={{ background: 'var(--accent-blue)', color: 'white', padding: '10px', borderRadius: '14px', fontWeight: 800, fontSize: '16px', letterSpacing: '1px', marginBottom: '12px', cursor: 'pointer' }}
        >
          {conferenceCode}
        </div>

        <button 
          onClick={downloadQR}
          className="btn-outline" 
          style={{ width: '100%', borderRadius: '12px', border: '1.5px solid #edf2f7', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 700, padding: '10px' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Скачать QR-код
        </button>
      </div>
    </div>
  );
};

export default QRGeneratorModal;
