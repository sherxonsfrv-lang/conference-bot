import React, { useEffect, useState } from 'react';

const Toast = ({ message, type = 'success', onClose, onClick, duration = 4000 }) => {
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;

    const timer = setTimeout(onClose, duration);
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
    }, 20);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [onClose, duration, isHovered]);

  const colors = {
    success: {
      bg: 'rgba(240, 253, 244, 0.85)',
      border: 'rgba(187, 247, 208, 0.6)',
      text: '#14532d',
      progressBg: 'linear-gradient(90deg, #4ade80, #22c55e)',
      icon: '✅',
      glow: 'rgba(34, 197, 94, 0.15)'
    },
    error: {
      bg: 'rgba(254, 242, 242, 0.85)',
      border: 'rgba(254, 205, 205, 0.6)',
      text: '#7f1d1d',
      progressBg: 'linear-gradient(90deg, #f87171, #ef4444)',
      icon: '❌',
      glow: 'rgba(239, 68, 68, 0.15)'
    },
    warning: {
      bg: 'rgba(255, 251, 235, 0.85)',
      border: 'rgba(253, 230, 138, 0.6)',
      text: '#78350f',
      progressBg: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
      icon: '⚠️',
      glow: 'rgba(245, 158, 11, 0.15)'
    },
    info: {
      bg: 'rgba(240, 249, 255, 0.85)',
      border: 'rgba(186, 230, 253, 0.6)',
      text: '#0c4a6e',
      progressBg: 'linear-gradient(90deg, #38bdf8, #0ea5e9)',
      icon: '💬',
      glow: 'rgba(14, 165, 233, 0.15)'
    }
  };

  const style = colors[type] || colors.success;
  const isDesktop = window.innerWidth > 768;

  return (
    <div 
      className="animate-pop-in"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      style={{ 
        position: 'fixed', 
        top: '20px', 
        right: isDesktop ? '24px' : '50%',
        left: isDesktop ? 'auto' : '50%',
        transform: isDesktop ? 'none' : 'translateX(-50%)',
        zIndex: 99999,
        background: style.bg,
        border: `1.5px solid ${style.border}`,
        borderRadius: '20px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        boxShadow: `0 20px 40px -15px ${style.glow}, 0 8px 16px -8px rgba(0, 0, 0, 0.05)`,
        minWidth: '320px',
        maxWidth: 'calc(100vw - 48px)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        userSelect: 'none'
      }}
    >
      {/* Toast Content */}
      <span style={{ 
        fontSize: '20px', 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.6)',
        width: '36px',
        height: '36px',
        borderRadius: '12px',
        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.8)'
      }}>
        {style.icon}
      </span>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
        <span style={{ 
          color: style.text, 
          fontSize: '13.5px', 
          fontWeight: 700,
          lineHeight: 1.4
        }}>
          {message}
        </span>
        {onClick && (
          <span style={{ fontSize: '10.5px', color: style.text, opacity: 0.7, fontWeight: 600, marginTop: '2px', textDecoration: 'underline' }}>
            Нажмите, чтобы открыть
          </span>
        )}
      </div>

      <button 
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{ 
          background: 'rgba(0, 0, 0, 0.04)', 
          border: 'none', 
          color: style.text, 
          cursor: 'pointer',
          padding: '2px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          fontWeight: 700,
          transition: 'background 0.2s',
          outline: 'none'
        }}
      >
        ×
      </button>
      
      {/* Progress Bar */}
      <div 
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: `${progress}%`,
          height: '4px',
          background: style.progressBg,
          transition: 'width 25ms linear'
        }}
      />
    </div>
  );
};

export default Toast;
