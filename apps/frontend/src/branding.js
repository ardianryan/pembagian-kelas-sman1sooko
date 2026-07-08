import { API_BASE, API_URL, APP_NAME, DEFAULT_BRANDING } from './constants';

export function resolveLogoUrl(logoPath) {
  if (!logoPath) return '/icon.png';
  if (logoPath.startsWith('http')) return logoPath;
  if (logoPath.startsWith('/uploads/')) return `${API_BASE}${logoPath}`;
  return logoPath;
}

export function mergeBranding(data) {
  return {
    ...DEFAULT_BRANDING,
    ...(data || {}),
  };
}

const BRANDING_CACHE_KEY = 'sman1sooko_cached_branding';

export function cacheBrandingForOffline(branding) {
  try {
    localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(mergeBranding(branding)));
  } catch {
    // ignore quota / private mode errors
  }
}

export function loadCachedBranding() {
  try {
    const raw = localStorage.getItem(BRANDING_CACHE_KEY);
    if (raw) {
      return mergeBranding(JSON.parse(raw));
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_BRANDING;
}

export function resolveItSupportLabel(branding) {
  const custom = String(branding?.itTeamLabel ?? '').trim();
  if (custom) return custom;

  const schoolName = String(branding?.schoolName || DEFAULT_BRANDING.schoolName).trim();
  return `Tim IT ${schoolName}`;
}

export async function fetchBranding() {
  try {
    const res = await fetch(`${API_URL}/branding`);
    if (!res.ok) return DEFAULT_BRANDING;
    const data = await res.json();
    return mergeBranding(data);
  } catch {
    return DEFAULT_BRANDING;
  }
}

export function applyBrandingToDocument(branding, { portal = 'student' } = {}) {
  if (!branding?.schoolName) return;
  document.title = portal === 'admin'
    ? `${APP_NAME} - ${branding.schoolName}`
    : `${branding.schoolName} - ${APP_NAME}`;

  const faviconHref = resolveLogoUrl(branding.logoUrl);
  let favicon = document.querySelector('link[rel="icon"]');
  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    document.head.appendChild(favicon);
  }
  favicon.href = faviconHref;
  favicon.type = faviconHref.endsWith('.svg') ? 'image/svg+xml' : 'image/png';

  let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
  if (!appleIcon) {
    appleIcon = document.createElement('link');
    appleIcon.rel = 'apple-touch-icon';
    document.head.appendChild(appleIcon);
  }
  appleIcon.href = faviconHref;
}