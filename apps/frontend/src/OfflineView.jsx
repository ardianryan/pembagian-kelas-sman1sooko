import React, { useEffect, useState } from 'react';
import DinoRunnerGame from './DinoRunnerGame';
import { loadCachedBranding, applyBrandingToDocument, resolveLogoUrl } from './branding';

export default function OfflineView({ mode = 'offline', onRetry, retrying = false }) {
  const [branding, setBranding] = useState(loadCachedBranding);
  const logoSrc = resolveLogoUrl(branding.logoUrl);

  useEffect(() => {
    applyBrandingToDocument(branding);
  }, [branding]);

  const isOffline = mode === 'offline';
  const title = isOffline ? 'Kamu Sedang Offline' : 'Portal Tidak Dapat Dijangkau';
  const description = isOffline
    ? 'Tidak ada koneksi internet. Main game di bawah sambil menunggu sinyal kembali, lalu muat ulang halaman.'
    : 'Koneksi internet ada, tetapi server portal belum bisa dihubungi. Coba lagi sebentar.';

  return (
    <div className="offline-page text-on-surface flex flex-col min-h-screen min-h-dvh">
      <header className="offline-page-header">
        <div className="offline-page-brand">
          <img src={logoSrc} alt={`Logo ${branding.schoolName}`} className="offline-page-logo" />
          <div>
            <p className="offline-page-school">{branding.schoolName}</p>
            <p className="offline-page-tagline">{branding.schoolTagline}</p>
          </div>
        </div>
      </header>

      <main className="offline-page-main">
        <section className="offline-status-card">
          <div className={`offline-status-icon${isOffline ? '' : ' offline-status-icon--server'}`}>
            <span className="material-symbols-outlined filled">
              {isOffline ? 'wifi_off' : 'cloud_off'}
            </span>
          </div>
          <h1 className="offline-status-title">{title}</h1>
          <p className="offline-status-desc">{description}</p>
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="offline-retry-btn"
          >
            <span className={`material-symbols-outlined text-[18px]${retrying ? ' animate-spin' : ''}`}>
              {retrying ? 'progress_activity' : 'refresh'}
            </span>
            {retrying ? 'Mencoba menghubungkan...' : 'Coba Hubungkan Lagi'}
          </button>
          {isOffline && (
            <p className="offline-status-tip">
              Tip: Buka portal sekali saat online agar halaman ini tersimpan untuk mode offline.
            </p>
          )}
        </section>

        <section className="offline-game-section">
          <DinoRunnerGame />
        </section>
      </main>

      <footer className="offline-page-footer">
        <p>{branding.footerCopy}</p>
      </footer>
    </div>
  );
}