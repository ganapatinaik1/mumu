import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
  duration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, duration = 2400 }) => {
  const [isVisible, setIsVisible] = useState(() => {
    return !sessionStorage.getItem('hasSeenSplashScreen');
  });
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    sessionStorage.setItem('hasSeenSplashScreen', 'true');

    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, duration - 600);

    const removeTimer = setTimeout(() => {
      setIsVisible(false);
      if (onFinish) onFinish();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [duration, isVisible, onFinish]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#09090b',
        color: '#ffffff',
        overflow: 'hidden',
        opacity: isFadingOut ? 0 : 1,
        transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: isFadingOut ? 'none' : 'auto',
      }}
    >
      {/* Dynamic Background Glow */}
      <div
        style={{
          position: 'absolute',
          width: '260px',
          height: '260px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, rgba(59, 130, 247, 0.15) 50%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'pulseGlow 2s infinite alternate ease-in-out',
          willChange: 'opacity',
        }}
      />

      <style>{`
        @keyframes pulseGlow {
          0% { opacity: 0.6; }
          100% { opacity: 1; }
        }
        @keyframes logoPop {
          0% { transform: scale(0.8); opacity: 0; }
          60% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes textFadeUp {
          0% { transform: translateY(12px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* App Icon Container — fixed size, isolated transform to prevent layout shift */}
      <div
        style={{
          position: 'relative',
          width: '120px',
          height: '120px',
          borderRadius: '28px',
          overflow: 'hidden',
          boxShadow: '0 20px 40px -10px rgba(168, 85, 247, 0.4), 0 0 20px rgba(0,0,0,0.8)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          flexShrink: 0,
          willChange: 'transform, opacity',
          animation: 'logoPop 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        <img
          src="/app_icon.jpg"
          alt="MuMu Icon"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>

      {/* App Name */}
      <h1
        style={{
          marginTop: '24px',
          fontSize: '2.5rem',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          background: 'linear-gradient(135deg, #ffffff 0%, #a855f7 50%, #3b82f6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 10px 20px rgba(168, 85, 247, 0.2)',
          animation: 'textFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards',
          opacity: 0,
          willChange: 'transform, opacity',
        }}
      >
        mumu
      </h1>
    </div>
  );
};
