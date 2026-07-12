import { useState, useEffect } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true); // optimistic default
  const [isReady, setIsReady] = useState(false);  // don't show banner until first check done

  const checkBackEnd = async () => {
    const result = await window.api.checkInternet();
    setIsOnline(result);
    setIsReady(true); // ← first check complete, safe to show banner now
  };

  useEffect(() => {
    checkBackEnd();

    const handleOnline = () => checkBackEnd();
    const handleOffline = () => setIsOnline(false);
const interval = setInterval(checkBackEnd, 30_000);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return { isOnline, isReady };
}