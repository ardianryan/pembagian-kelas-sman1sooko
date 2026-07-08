import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import StudentApp from './StudentApp';
import AdminApp from './AdminApp';
import OfflineView from './OfflineView';
import { useNetworkStatus } from './useNetworkStatus';
import { loadCachedBranding, applyBrandingToDocument, resolveLogoUrl } from './branding';

function BootSplash() {
  const branding = loadCachedBranding();
  const logoSrc = resolveLogoUrl(branding.logoUrl);

  return (
    <div className="min-h-screen min-h-dvh flex flex-col items-center justify-center p-4 text-center gap-4 bg-background text-on-surface">
      <div className="w-12 h-12 p-2 bg-surface-container rounded-2xl flex items-center justify-center">
        <img src={logoSrc} alt="Loading" className="w-full h-full object-contain" />
      </div>
      <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
      <span className="text-body-md text-on-surface-variant">Memuat portal {branding.schoolName}...</span>
    </div>
  );
}

export default function App() {
  const { isOnline, recheck } = useNetworkStatus();
  const [booting, setBooting] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [offlineGate, setOfflineGate] = useState({ active: false, mode: 'offline' });

  const evaluateConnection = useCallback(async () => {
    if (!navigator.onLine) {
      setOfflineGate({ active: true, mode: 'offline' });
      setBooting(false);
      return false;
    }

    const result = await recheck();
    setOfflineGate({ active: !result.ok, mode: result.mode || 'server' });
    setBooting(false);
    return result.ok;
  }, [recheck]);

  useEffect(() => {
    applyBrandingToDocument(loadCachedBranding());
    evaluateConnection();
  }, [evaluateConnection]);

  useEffect(() => {
    const handleOffline = () => {
      setOfflineGate({ active: true, mode: 'offline' });
      setBooting(false);
    };

    const handleOnline = () => {
      evaluateConnection();
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [evaluateConnection]);

  const handleRetry = async () => {
    setRetrying(true);
    const ok = await evaluateConnection();
    setRetrying(false);
    return ok;
  };

  if (booting) {
    return <BootSplash />;
  }

  if (offlineGate.active) {
    return (
      <OfflineView
        mode={offlineGate.mode}
        onRetry={handleRetry}
        retrying={retrying}
      />
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/back-office/*" element={<AdminApp />} />
        <Route path="/*" element={<StudentApp />} />
      </Routes>
    </BrowserRouter>
  );
}