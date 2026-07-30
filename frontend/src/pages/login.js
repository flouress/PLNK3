import { login as apiLogin } from '../api.js';
import { setLoggedIn } from '../auth.js';

/**
 * Render halaman login ke dalam container
 * @param {HTMLElement} container
 * @param {Function} onLoginSuccess - callback setelah login berhasil
 */
export function renderLogin(container, onLoginSuccess) {
  container.innerHTML = `
    <div class="login-container">
      <div class="login-card">
      <div class="login-logo">
        <div class="icon" style="background: transparent; box-shadow: none;">
          <img src="/images.jpg" alt="Logo PLN" style="width: 50px; height: 50px; border-radius: 8px; object-fit: contain;" />
        </div>
        <h1>Dashboard <span class="highlight">K3</span></h1>
          <p>PLN UP3 Kebon Jeruk</p>
        </div>

        <div id="login-error" class="login-error"></div>

        <form id="login-form">
          <div class="form-group">
            <label for="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Masukkan username"
              autocomplete="username"
              required
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Masukkan password"
              autocomplete="current-password"
              required
            />
          </div>

          <button type="submit" class="btn-login" id="btn-login">
            Masuk
          </button>
        </form>
      </div>
    </div>
  `;

  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');
  const btnLogin = document.getElementById('btn-login');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      showError(errorEl, 'Username dan password wajib diisi');
      return;
    }

    // Disable button & show loading
    btnLogin.disabled = true;
    btnLogin.textContent = 'Memproses...';
    hideError(errorEl);

    try {
      const result = await apiLogin(username, password);

      if (result.success) {
        setLoggedIn(result.username, result.token);
        onLoginSuccess();
      } else {
        showError(errorEl, result.message || 'Login gagal');
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        showError(errorEl, err.response.data?.message || 'Username atau password salah');
      } else {
        showError(errorEl, 'Tidak dapat terhubung ke server. Pastikan backend berjalan.');
      }
    } finally {
      btnLogin.disabled = false;
      btnLogin.textContent = 'Masuk';
    }
  });
}

function showError(el, message) {
  el.textContent = message;
  el.classList.add('show');
}

function hideError(el) {
  el.classList.remove('show');
}
