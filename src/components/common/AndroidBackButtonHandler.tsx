import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';

export const AndroidBackButtonHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      // 1. Root route: exit app on back press if on root page "/" or "/login"
      if (location.pathname === '/' || location.pathname === '/login') {
        CapacitorApp.minimizeApp();
        return;
      }

      // 2. Can go back in browser history
      if (canGoBack || window.history.length > 1) {
        navigate(-1);
      } else {
        // Fallback to home page if no history
        navigate('/', { replace: true });
      }
    });

    return () => {
      handler.then((h) => h.remove());
    };
  }, [location.pathname, navigate]);

  return null;
};
