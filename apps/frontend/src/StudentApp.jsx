import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { API_URL, CLASS_TIPS, TRIVIA_DATA, DEFAULT_BRANDING, getQuoteForStudent } from './constants';
import { applyBrandingToDocument, mergeBranding, resolveItSupportLabel, resolveLogoUrl } from './branding';
import { playCelebrationSound, unlockCelebrationAudio } from './celebrationSound';

export default function StudentApp() {
  // App views: 'loading' | 'countdown' | 'login' | 'student-dashboard'
  const [view, setView] = useState('loading');
  
  // Release config
  const [targetDate, setTargetDate] = useState('');
  const [isOpened, setIsOpened] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Student auth states
  const [nisn, setNisn] = useState('');
  const [nis, setNis] = useState('');
  const [studentData, setStudentData] = useState(null);
  const [classStats, setClassStats] = useState(null);
  const [portalSettings, setPortalSettings] = useState({ classmatesVisible: true });
  const [showClassmatesModal, setShowClassmatesModal] = useState(false);
  const [classmates, setClassmates] = useState([]);
  const [classmatesLoading, setClassmatesLoading] = useState(false);
  const [classmatesLoaded, setClassmatesLoaded] = useState(false);

  // Help modal for NISN/NIPD lookup instructions
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Feedback states
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [triviaIndex, setTriviaIndex] = useState(0);
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const logoSrc = resolveLogoUrl(branding.logoUrl);

  useEffect(() => {
    applyBrandingToDocument(branding);
  }, [branding]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');

    // Dynamic Trivia rotator
    const triviaInterval = setInterval(() => {
      setTriviaIndex((prev) => (prev + 1) % TRIVIA_DATA.length);
    }, 8000);

    // Initial check of release countdown & session restoring
    checkInitialSession();

    return () => clearInterval(triviaInterval);
  }, []);

  const CELEBRATION_COLORS = ['#000a3d', '#075fab', '#ffd300', '#ba1a1a', '#ff4a36', '#ffffff'];

  const fireConfettiBurst = (options = {}) => {
    confetti({
      particleCount: 120,
      spread: 75,
      startVelocity: 48,
      ticks: 220,
      scalar: 1.15,
      origin: { x: 0.5, y: 0.4 },
      colors: CELEBRATION_COLORS,
      ...options,
    });
  };

  const runCelebration = (soundVariant = 'welcome') => {
    const isBurst = soundVariant === 'burst';

    fireConfettiBurst({
      particleCount: isBurst ? 260 : 200,
      spread: isBurst ? 95 : 85,
      origin: { x: 0.5, y: isBurst ? 0.32 : 0.35 },
      startVelocity: isBurst ? 58 : 50,
    });

    window.setTimeout(() => {
      fireConfettiBurst({
        particleCount: isBurst ? 180 : 140,
        spread: 60,
        origin: { x: 0.08, y: 0.62 },
        angle: 58,
      });
      fireConfettiBurst({
        particleCount: isBurst ? 180 : 140,
        spread: 60,
        origin: { x: 0.92, y: 0.62 },
        angle: 122,
      });
    }, 120);

    window.setTimeout(() => {
      fireConfettiBurst({
        particleCount: isBurst ? 220 : 160,
        spread: isBurst ? 110 : 100,
        origin: { x: 0.5, y: isBurst ? 0.48 : 0.42 },
        startVelocity: isBurst ? 62 : 52,
        scalar: 1.25,
      });
    }, 280);

    if (isBurst) {
      window.setTimeout(() => {
        fireConfettiBurst({
          particleCount: 200,
          spread: 140,
          origin: { x: 0.5, y: 0.28 },
          startVelocity: 42,
          ticks: 260,
        });
      }, 480);
    }

    playCelebrationSound(soundVariant);
  };

  // Confetti + fanfare saat dashboard pertama kali tampil
  useEffect(() => {
    if (view !== 'student-dashboard' || !studentData) return;
    const timer = setTimeout(() => runCelebration('welcome'), 500);
    return () => clearTimeout(timer);
  }, [view, studentData?.id]);

  useEffect(() => {
    if (!showHelpModal) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setShowHelpModal(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showHelpModal]);

  useEffect(() => {
    if (!showClassmatesModal) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setShowClassmatesModal(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [showClassmatesModal]);

  useEffect(() => {
    if (!targetDate || isOpened) return;

    const timer = setInterval(() => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();
      
      if (difference <= 0) {
        setIsOpened(true);
        setView('login');
        clearInterval(timer);
        return;
      }
      
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, isOpened]);

  // Check backend server status & restore token-based session if possible
  const checkInitialSession = async () => {
    try {
      const countdownRes = await fetch(`${API_URL}/countdown`);
      const countdownData = await countdownRes.json();
      setTargetDate(countdownData.targetDate);
      setIsOpened(countdownData.isOpened);
      if (countdownData.branding) {
        setBranding(mergeBranding(countdownData.branding));
      }

      // Restore Student session if token exists and portal is opened
      const savedStudentToken = localStorage.getItem('sman1sooko_student_token');
      if (savedStudentToken) {
        if (countdownData.isOpened) {
          const verifyStudent = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${savedStudentToken}` }
          });
          if (verifyStudent.ok) {
            const studentResult = await verifyStudent.json();
            setStudentData(studentResult.data);
            setClassStats(studentResult.classStats);
            setPortalSettings(studentResult.portalSettings || { classmatesVisible: true });
            setView('student-dashboard');
            return;
          }
        }
        localStorage.removeItem('sman1sooko_student_token');
      }

      // Direct to view based on release status
      if (countdownData.isOpened) {
        setView('login');
      } else {
        setView('countdown');
      }
    } catch (err) {
      setError('Gagal terhubung ke API server. Menggunakan mode demonstrasi luring.');
      setView('login');
    }
  };

  // Student Login lookup
  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    unlockCelebrationAudio();

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nisn: nisn.trim(), nis: nis.trim() })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Kombinasi NISN & NIPD salah atau tidak terdaftar.');
      }

      localStorage.setItem('sman1sooko_student_token', result.token);
      setStudentData(result.data);
      setClassStats(result.classStats);
      setPortalSettings(result.portalSettings || { classmatesVisible: true });
      setShowClassmatesModal(false);
      setClassmates([]);
      setClassmatesLoaded(false);
      setShowHelpModal(false);
      setView('student-dashboard');

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Student Logout session clearing
  const handleStudentLogout = () => {
    localStorage.removeItem('sman1sooko_student_token');
    setStudentData(null);
    setClassStats(null);
    setShowClassmatesModal(false);
    setClassmates([]);
    setClassmatesLoaded(false);
    setNisn('');
    setNis('');
    setShowHelpModal(false);
    setView(isOpened ? 'login' : 'countdown');
  };

  // ==========================================
  // VIEW RENDER HELPERS
  // ==========================================

  function renderStudentFooter({ withMobileNav = false, showGuideLinks = true } = {}) {
    return (
      <footer
        className={`student-site-footer${withMobileNav ? ' student-site-footer--mobile-nav' : ''}`}
      >
        <div className="student-site-footer-inner">
          <div className="student-site-footer-brand">
            <img src={logoSrc} alt="" className="student-site-footer-logo" aria-hidden="true" />
            <div>
              <p className="student-site-footer-title">{branding.schoolName}</p>
              <p className="student-site-footer-copy">{branding.footerCopy}</p>
            </div>
          </div>
          <nav className="student-site-footer-nav" aria-label="Tautan footer">
            <a
              href="https://sman1sooko.sch.id"
              target="_blank"
              rel="noreferrer"
              className="student-site-footer-link"
            >
              Website Sekolah
            </a>
            {showGuideLinks && (
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="student-site-footer-link"
              >
                Panduan NISN & NIPD
              </button>
            )}
          </nav>
        </div>
      </footer>
    );
  }

  function renderCountdownView() {
    const releaseLabel = targetDate
      ? new Date(targetDate).toLocaleString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

    const timerUnits = [
      { value: timeLeft.days, label: 'Hari' },
      { value: timeLeft.hours, label: 'Jam' },
      { value: timeLeft.minutes, label: 'Menit', accent: true },
      { value: timeLeft.seconds, label: 'Detik' },
    ];

    const handleRemind = () => {
      confetti({ particleCount: 40, spread: 50, colors: ['#000a3d', '#075fab', '#ffd300', '#ba1a1a'] });
      setSuccessMsg('Pengingat diaktifkan! Pantau terus hitung mundur ya.');
      setTimeout(() => setSuccessMsg(''), 3000);
    };

    return (
      <div className="student-page countdown-page flex flex-col text-on-surface">
        <header className="app-topbar-shell">
          <div className="app-topbar">
            <div className="app-topbar-brand">
              <img src={logoSrc} alt={`${branding.schoolName} Logo`} className="h-10 w-10 md:h-12 md:w-12 object-contain shrink-0" />
              <div className="flex flex-col text-left min-w-0">
                <span className="text-headline-lg text-primary font-bold leading-tight">{branding.schoolName}</span>
                <span className="text-label-md text-on-surface-variant uppercase tracking-widest hidden sm:block">{branding.schoolTagline}</span>
              </div>
            </div>
            <div className="app-topbar-actions">
              <div className="hidden md:flex bg-surface-container rounded-full px-5 py-2.5 border border-outline-variant items-center gap-2.5">
                <span className="material-symbols-outlined text-secondary text-sm filled">calendar_month</span>
                <span className="text-body-md text-on-surface-variant">Tahun Pelajaran 2026/2027</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="student-guide-btn"
              >
                <span className="material-symbols-outlined text-[18px]">menu_book</span>
                <span className="hidden sm:inline">Panduan</span>
              </button>
            </div>
          </div>
        </header>

        <main className="countdown-page-main flex-grow">
          <section className="countdown-hero">
            <div className={`countdown-status-pill ${isOpened ? 'countdown-status-pill--open' : ''}`}>
              <span className={`material-symbols-outlined ${isOpened ? 'filled' : ''}`}>
                {isOpened ? 'lock_open' : 'lock_clock'}
              </span>
              {isOpened ? 'Gerbang Informasi Dibuka' : 'Gerbang Informasi Belum Dibuka'}
            </div>
            <h1 className="countdown-hero-title">Pengumuman Pembagian Kelas</h1>
            <p className="countdown-hero-desc">
              {releaseLabel
                ? `Portal akan dibuka pada ${releaseLabel} WIB.`
                : 'Portal pembagian kelas akan segera dibuka. Mohon tunggu hitung mundur berakhir.'}
            </p>
          </section>

          <section className="countdown-timer" aria-label="Hitung mundur">
            {timerUnits.map((unit) => (
              <div key={unit.label} className="countdown-unit">
                <span className={`countdown-unit-value ${unit.accent ? 'countdown-unit-value--accent' : ''}`}>
                  {String(unit.value).padStart(2, '0')}
                </span>
                <span className="countdown-unit-label">{unit.label}</span>
              </div>
            ))}
          </section>

          <section className="countdown-info-panel">
            <div className="countdown-info-top">
              <div className="countdown-info-icon">
                <span className="material-symbols-outlined">school</span>
              </div>
              <div className="countdown-info-body">
                <h2>Mempersiapkan Masa Depan Unggul</h2>
                <p>
                  Kami sedang menyinkronkan data kurikulum dan hasil seleksi terbaru untuk memastikan
                  pengalaman yang edukatif, informatif, dan menyenangkan bagi seluruh murid.
                </p>
              </div>
            </div>

            <div className="countdown-trivia">
              <div className="countdown-trivia-label">
                <span className="material-symbols-outlined text-[14px]">lightbulb</span>
                Tahukah Kamu?
              </div>
              <p className="countdown-trivia-text">&ldquo;{TRIVIA_DATA[triviaIndex]}&rdquo;</p>
            </div>

            <div className="countdown-remind-row">
              <p className="text-body-md text-on-surface-variant m-0">
                Aktifkan pengingat agar tidak ketinggalan saat portal dibuka.
              </p>
              <button type="button" onClick={handleRemind} className="countdown-remind-btn">
                <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                Ingatkan Saya
              </button>
            </div>
          </section>

          <section className="countdown-traits">
            <div className="countdown-trait">
              <span className="material-symbols-outlined">verified</span>
              Edukatif
            </div>
            <div className="countdown-trait">
              <span className="material-symbols-outlined">insights</span>
              Informatif
            </div>
            <div className="countdown-trait">
              <span className="material-symbols-outlined">celebration</span>
              Fun
            </div>
          </section>

          {successMsg && (
            <div className="countdown-toast animate-spring">
              <span className="material-symbols-outlined text-[18px] filled">notifications_active</span>
              {successMsg}
            </div>
          )}
        </main>

        {renderStudentFooter()}
      </div>
    );
  }

  function renderLoginView() {
    return (
      <div className="student-page text-on-surface">
      <main className="student-login-main">
        <div className="absolute top-[-10%] left-[-10%] w-72 md:w-96 h-72 md:h-96 atmosphere-blob-primary opacity-30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-64 md:w-80 h-64 md:h-80 atmosphere-blob-secondary opacity-20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md relative z-10 animate-fadeIn">
          <div className="bento-card no-hover shadow-sm overflow-hidden student-login-card">
            <div className="student-login-header">
              <div className="w-20 h-20 md:w-24 md:h-24 p-2 bg-surface-container-low rounded-2xl flex items-center justify-center">
                <img src={logoSrc} alt={`${branding.schoolName} Logo`} className="w-full h-full object-contain" />
              </div>
              <div className="text-center">
                <h1 className="text-headline-lg text-primary tracking-tight">{branding.schoolName}</h1>
                <p className="text-body-md text-on-surface-variant mt-1">Sistem Informasi Pembagian Kelas</p>
              </div>
            </div>

            <form onSubmit={handleStudentLogin} className="student-login-form">
              {error && (
                <div className="p-3 bg-error-container border border-error/30 text-error text-body-md rounded-xl flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="student-login-guide-banner"
              >
                <span className="material-symbols-outlined text-[20px]">menu_book</span>
                <span>
                  <strong>Panduan NISN & NIPD</strong>
                  <span className="student-login-guide-banner-sub">Cara menemukan nomor di rapor atau kartu pelajar murid</span>
                </span>
                <span className="material-symbols-outlined text-[18px] shrink-0">chevron_right</span>
              </button>

              <div className="student-login-field">
                <label className="text-label-md text-on-surface-variant px-1 uppercase" htmlFor="nisn">NISN (10 digit)</label>
                <div className="input-field">
                  <span className="input-field-icon material-symbols-outlined" aria-hidden="true">fingerprint</span>
                  <input
                    type="text"
                    id="nisn"
                    value={nisn}
                    onChange={(e) => setNisn(e.target.value)}
                    required
                    maxLength={10}
                    placeholder="Contoh: 0012345678"
                    className="input-taktil input-taktil--lg input-taktil--icon"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="student-login-field">
                <label className="text-label-md text-on-surface-variant px-1 uppercase" htmlFor="nis">NIPD</label>
                <div className="input-field">
                  <span className="input-field-icon material-symbols-outlined" aria-hidden="true">badge</span>
                  <input
                    type="text"
                    id="nis"
                    value={nis}
                    onChange={(e) => setNis(e.target.value)}
                    required
                    placeholder="Masukkan NIPD Anda"
                    className="input-taktil input-taktil--lg input-taktil--icon"
                    autoComplete="off"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="spring-button btn-primary mt-2"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" aria-hidden="true" />
                    <span>Memeriksa...</span>
                  </>
                ) : (
                  <>
                    <span>Periksa Pembagian Kelas</span>
                    <span className="material-symbols-outlined text-[1.25rem]" aria-hidden="true">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            <div className="student-login-help">
              <p className="text-body-md text-center text-on-surface-variant">
                Kesulitan masuk? Hubungi <span className="font-bold text-secondary">Tenaga Kurikulum</span> di sekolah.
              </p>
              <p className="student-login-help-support text-body-md text-center text-on-surface-variant">
                Bantuan teknis portal: <span className="font-bold text-secondary">{resolveItSupportLabel(branding)}</span>
              </p>
            </div>
          </div>

        </div>
      </main>
      {renderStudentFooter()}
      </div>
    );
  }

  const handleOpenClassmatesModal = async () => {
    setShowClassmatesModal(true);

    if (classmatesLoaded || classmatesLoading) return;

    const token = localStorage.getItem('sman1sooko_student_token');
    if (!token) return;

    setClassmatesLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/classmates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Gagal memuat daftar teman sekelas.');
      }
      setClassmates(result.classmates || []);
      if (result.classStats) {
        setClassStats(result.classStats);
      }
      setClassmatesLoaded(true);
    } catch (err) {
      setError(err.message);
      setShowClassmatesModal(false);
    } finally {
      setClassmatesLoading(false);
    }
  };

  function renderClassmatesModal() {
    if (!showClassmatesModal || !studentData) return null;

    return (
      <div
        className="classmates-modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="classmates-modal-title"
        onClick={() => setShowClassmatesModal(false)}
      >
        <div className="classmates-modal" onClick={(e) => e.stopPropagation()}>
          <div className="classmates-modal-header">
            <div className="flex items-start gap-3 min-w-0">
              <div className="classmates-modal-header-icon">
                <span className="material-symbols-outlined" aria-hidden="true">groups</span>
              </div>
              <div className="classmates-modal-header-text min-w-0">
                <h3 id="classmates-modal-title">Teman Sekelas</h3>
                <p>{studentData.kelas}</p>
                {classStats && (
                  <span className="classmates-modal-meta">
                    {classStats.total} murid · {classStats.boys} L · {classStats.girls} P
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowClassmatesModal(false)}
              className="classmates-modal-close"
              aria-label="Tutup daftar teman sekelas"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="classmates-modal-body">
            {classmatesLoading ? (
              <div className="classmates-modal-status">
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Memuat daftar murid...
              </div>
            ) : classmates.length === 0 ? (
              <div className="classmates-modal-status">Belum ada data murid di kelas ini.</div>
            ) : (
              <ol className="classmates-modal-list">
                {classmates.map((classmate, index) => (
                  <li
                    key={`${classmate.nama}-${index}`}
                    className={`classmates-modal-item ${classmate.isSelf ? 'is-self' : ''}`}
                  >
                    <span className="classmates-modal-order">{classmate.no ?? index + 1}</span>
                    <span className="classmates-modal-name">{classmate.nama}</span>
                    <span className="classmates-modal-jk">{classmate.jk}</span>
                    {classmate.isSelf && <span className="classmates-modal-you">Anda</span>}
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="classmates-modal-footer">
            <button type="button" onClick={() => setShowClassmatesModal(false)} className="classmates-modal-btn">
              Tutup
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderStudentDashboardView() {
    if (!studentData) return null;

    const quote = getQuoteForStudent(studentData);
    const displayName = studentData.nama || '';
    const handleCelebrate = () => {
      unlockCelebrationAudio();
      runCelebration('burst');
    };

    return (
      <div className="student-page student-dashboard text-on-surface flex flex-col overflow-x-hidden">
        <header className="student-dash-header">
          <div className="student-dash-header-inner">
            <div className="student-dash-brand">
              <img src={logoSrc} alt={`Logo ${branding.schoolName}`} className="student-dash-brand-logo" />
              <div className="student-dash-brand-text">
                <span className="student-dash-brand-name">{branding.schoolName}</span>
                <span className="student-dash-brand-context">Pengumuman Pembagian Kelas</span>
              </div>
            </div>
            <button type="button" onClick={handleStudentLogout} className="student-dash-logout">
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Keluar
            </button>
          </div>
        </header>

        <main className="student-dash-main">
          <section className="student-dash-hero animate-spring">
            <div className="student-dash-hero-copy">
              <span className="student-dash-hero-badge">
                <span className="material-symbols-outlined filled text-[16px]">verified</span>
                Lulus Kenaikan Kelas
              </span>
              <h1 className="student-dash-hero-title">
                Selamat, <span className="student-dash-hero-name">{displayName}</span>!
              </h1>
              <p className="student-dash-hero-desc">
                Keberhasilan adalah milik mereka yang tekun berjuang.
              </p>
              <button type="button" onClick={handleCelebrate} className="student-dash-fun-btn">
                <span className="material-symbols-outlined text-[18px]">celebration</span>
                Rayakan Sekarang
              </button>
            </div>

            <div className="student-dash-class-panel">
              <span className="student-dash-class-label">Pembagian Kelas</span>
              <p className="student-dash-class-value">{studentData.kelas}</p>
              <span className="student-dash-class-meta">Tahun Pelajaran 2026/2027</span>

              {portalSettings.classmatesVisible && (
                <button
                  type="button"
                  onClick={handleOpenClassmatesModal}
                  className="student-dash-classmates-btn"
                >
                  <span className="material-symbols-outlined text-[18px]">groups</span>
                  Lihat Teman Sekelas
                  {classStats?.total ? (
                    <span className="student-dash-classmates-count">{classStats.total}</span>
                  ) : null}
                </button>
              )}
            </div>
          </section>

          <section className="student-dash-grid">
            <article className="student-dash-card student-dash-card--profile">
              <header className="student-dash-card-head">
                <span className="student-dash-card-icon">
                  <span className="material-symbols-outlined">badge</span>
                </span>
                <h2>Profil Murid</h2>
              </header>
              <dl className="student-dash-dl">
                <div className="student-dash-dl-item">
                  <dt>Nama Lengkap</dt>
                  <dd>{studentData.nama}</dd>
                </div>
                <div className="student-dash-dl-item">
                  <dt>Jenis Kelamin</dt>
                  <dd>{studentData.jk === 'L' ? 'Laki-laki' : 'Perempuan'}</dd>
                </div>
                <div className="student-dash-dl-item">
                  <dt>NISN</dt>
                  <dd>{studentData.nisn}</dd>
                </div>
                <div className="student-dash-dl-item">
                  <dt>NIPD</dt>
                  <dd>{studentData.nipd}</dd>
                </div>
              </dl>
            </article>

            <article className="student-dash-card">
              <header className="student-dash-card-head">
                <span className="student-dash-card-icon student-dash-card-icon--secondary">
                  <span className="material-symbols-outlined">science</span>
                </span>
                <h2>Program Peminatan</h2>
              </header>
              <p className="student-dash-card-value">{studentData.peminatan}</p>
            </article>

            <article className="student-dash-card">
              <header className="student-dash-card-head">
                <span className="student-dash-card-icon">
                  <span className="material-symbols-outlined">school</span>
                </span>
                <h2>Guru Wali Kelas</h2>
              </header>
              <p className="student-dash-card-value">{studentData.namawalas}</p>
            </article>

            <article className="student-dash-card student-dash-card--quote">
              <header className="student-dash-card-head">
                <span className="student-dash-card-icon student-dash-card-icon--muted">
                  <span className="material-symbols-outlined">format_quote</span>
                </span>
                <h2>Kutipan Hari Ini</h2>
              </header>
              <blockquote className="student-dash-quote-text">&ldquo;{quote.text}&rdquo;</blockquote>
              <footer className="student-dash-quote-author">— {quote.author}</footer>
            </article>

            <article className="student-dash-card student-dash-card--tips">
              <header className="student-dash-card-head">
                <span className="student-dash-card-icon student-dash-card-icon--secondary">
                  <span className="material-symbols-outlined">lightbulb</span>
                </span>
                <h2>Tips Menyongsong Kelas Baru</h2>
              </header>
              <ol className="student-dash-tips">
                {CLASS_TIPS.map((tip) => (
                  <li key={tip} className="student-dash-tip">{tip}</li>
                ))}
              </ol>
            </article>
          </section>

          <footer className="student-dash-footer">
            <p>{branding.footerCopy}</p>
          </footer>
        </main>
        {renderClassmatesModal()}
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-dvh w-full relative z-10 bg-background text-on-surface flex flex-col">
      {view === 'loading' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center gap-4">
          <div className="w-12 h-12 p-2 bg-surface-container rounded-2xl flex items-center justify-center mb-2 float-animation">
            <img src={logoSrc} alt="Loading" className="w-full h-full object-contain" />
          </div>
          <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
          <span className="text-body-md text-on-surface-variant">Menghubungkan ke portal {branding.schoolName}...</span>
        </div>
      )}

      {/* 2. VIEW: COUNTDOWN HITUNG MUNDUR */}
      {view === 'countdown' && renderCountdownView()}

      {/* 3. VIEW: STUDENT LOGIN PORTAL */}
      {view === 'login' && renderLoginView()}

      {view === 'student-dashboard' && renderStudentDashboardView()}

      {showHelpModal && view !== 'student-dashboard' && (
        <div
          className="help-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-modal-title"
          onClick={() => setShowHelpModal(false)}
        >
          <div className="help-modal" onClick={(e) => e.stopPropagation()}>
            <div className="help-modal-header">
              <div className="flex items-start gap-3 min-w-0">
                <div className="help-modal-header-icon">
                  <span className="material-symbols-outlined" aria-hidden="true">help</span>
                </div>
                <div className="help-modal-header-text min-w-0">
                  <h3 id="help-modal-title">Panduan NISN & NIPD</h3>
                  <p>Temukan nomor di rapor, ijazah, atau kartu pelajar murid Anda.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="help-modal-close"
                aria-label="Tutup panduan"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="help-modal-body">
              <div className="help-modal-step">
                <span className="help-modal-step-num">1</span>
                <div className="help-modal-step-content">
                  <div className="help-modal-step-title">
                    <span className="material-symbols-outlined">pin</span>
                    Nomor Induk Siswa Nasional (NISN)
                  </div>
                  <p className="help-modal-step-desc">
                    NISN terdiri dari 10 digit angka unik. Dapat dilihat pada lembar rapor SMP, ijazah kelulusan, atau situs pengecekan NISN Kemendikbud.
                  </p>
                  <span className="help-modal-example">
                    <span className="material-symbols-outlined">tag</span>
                    Contoh: 0101507582
                  </span>
                </div>
              </div>

              <div className="help-modal-step">
                <span className="help-modal-step-num">2</span>
                <div className="help-modal-step-content">
                  <div className="help-modal-step-title">
                    <span className="material-symbols-outlined">badge</span>
                    Nomor Induk Peserta Didik (NIPD)
                  </div>
                  <p className="help-modal-step-desc">
                    NIPD adalah nomor induk peserta didik yang tercantum pada kartu pelajar murid {branding.schoolName} atau lembar pengumuman kenaikan kelas.
                  </p>
                  <span className="help-modal-example">
                    <span className="material-symbols-outlined">tag</span>
                    Contoh: 17662
                  </span>
                </div>
              </div>
            </div>

            <div className="help-modal-footer">
              <p className="help-modal-support">
                Masih butuh bantuan? Hubungi <strong>Tenaga Kurikulum</strong> di sekolah.
                Bantuan teknis: <strong>{resolveItSupportLabel(branding)}</strong>
              </p>
              <button type="button" onClick={() => setShowHelpModal(false)} className="help-modal-btn">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
