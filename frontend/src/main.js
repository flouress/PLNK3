import './style.css';
import { isAuthenticated } from './auth.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';

const app = document.getElementById('app');

/**
 * Simple hash-based router
 * - #/login → Login page
 * - #/dashboard → Dashboard page (protected)
 * - Default → redirect based on auth state
 */
function router() {
  const hash = window.location.hash;

  if (isAuthenticated()) {
    // User sudah login
    if (hash === '#/login' || !hash || hash === '#/') {
      window.location.hash = '#/dashboard';
      return;
    }
    renderDashboard(app, () => {
      window.location.hash = '#/login';
    });
  } else {
    // User belum login → paksa ke login
    if (hash !== '#/login') {
      window.location.hash = '#/login';
      return;
    }
    renderLogin(app, () => {
      window.location.hash = '#/dashboard';
    });
  }
}

// Listen for hash changes
window.addEventListener('hashchange', router);

// Initial route
router();
