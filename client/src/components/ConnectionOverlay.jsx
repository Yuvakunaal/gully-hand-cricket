import React, { useState, useEffect } from 'react';

const ConnectionOverlay = ({ status }) => {
  const [dots, setDots] = useState('');
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  // Animated dots
  useEffect(() => {
    if (status === 'connected') return;
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, [status]);

  // Fade out when connected
  useEffect(() => {
    if (status === 'connected') {
      setFadeOut(true);
      const timer = setTimeout(() => setVisible(false), 800);
      return () => clearTimeout(timer);
    } else {
      setVisible(true);
      setFadeOut(false);
    }
  }, [status]);

  if (!visible) return null;

  const statusText = status === 'connecting'
    ? 'Waking up server'
    : status === 'disconnected'
      ? 'Reconnecting'
      : 'Connected!';

  const subText = status === 'connecting'
    ? 'Free servers sleep after inactivity. Hang tight!'
    : status === 'disconnected'
      ? 'Connection lost. Trying to reconnect...'
      : 'You\'re all set!';

  return (
    <div className={`connection-overlay ${fadeOut ? 'fade-out' : ''}`}>
      <div className="connection-content">
        {/* Spinner */}
        {status !== 'connected' ? (
          <div className="connection-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ball">🏏</div>
          </div>
        ) : (
          <div className="connection-check">✓</div>
        )}

        <h2 className="connection-title">{statusText}{status !== 'connected' ? dots : ''}</h2>
        <p className="connection-sub">{subText}</p>

        {status !== 'connected' && (
          <div className="connection-progress">
            <div className="connection-progress-bar"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionOverlay;
