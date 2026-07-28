const AUTH_KEY = 'plnk3_auth';

/**
 * Simpan state login ke sessionStorage
 */
export function setLoggedIn(username) {
  sessionStorage.setItem(AUTH_KEY, JSON.stringify({ isLoggedIn: true, username }));
}

/**
 * Hapus state login
 */
export function setLoggedOut() {
  sessionStorage.removeItem(AUTH_KEY);
}

/**
 * Cek apakah user sudah login
 */
export function isAuthenticated() {
  const auth = sessionStorage.getItem(AUTH_KEY);
  if (!auth) return false;
  try {
    return JSON.parse(auth).isLoggedIn === true;
  } catch {
    return false;
  }
}

/**
 * Ambil username yang sedang login
 */
export function getUsername() {
  const auth = sessionStorage.getItem(AUTH_KEY);
  if (!auth) return '';
  try {
    return JSON.parse(auth).username || '';
  } catch {
    return '';
  }
}
