import { useCallback, useEffect, useState } from 'react';
import { API_URL } from './constants';

export async function checkPortalReachable() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, mode: 'offline' };
  }

  try {
    const res = await fetch(`${API_URL}/countdown`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return { ok: false, mode: 'server' };
    }
    return { ok: true, mode: null };
  } catch {
    const mode = typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'server';
    return { ok: false, mode };
  }
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    () => (typeof navigator !== 'undefined' ? navigator.onLine : true)
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const recheck = useCallback(() => checkPortalReachable(), []);

  return { isOnline, recheck };
}