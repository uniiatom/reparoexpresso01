export const LOGO_TITLE_SRC = '/logo-titulo.png';
export const LOGO_SHIELD_SRC = '/logo-re-transparente.png';

const FIRST_LOGIN_SPLASH_KEY = (userId) => `reparo_first_login_splash_${userId}`;
export const PENDING_LOGIN_SPLASH_KEY = 'reparo_pending_login_splash';

export function shouldShowFirstLoginSplash(userId) {
  if (!userId || typeof window === 'undefined') return false;
  if (sessionStorage.getItem(PENDING_LOGIN_SPLASH_KEY) !== '1') return false;
  return !localStorage.getItem(FIRST_LOGIN_SPLASH_KEY(userId));
}

export function markFirstLoginSplashSeen(userId) {
  if (!userId || typeof window === 'undefined') return;
  localStorage.setItem(FIRST_LOGIN_SPLASH_KEY(userId), '1');
  sessionStorage.removeItem(PENDING_LOGIN_SPLASH_KEY);
}

export function markPendingLoginSplash() {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PENDING_LOGIN_SPLASH_KEY, '1');
}
