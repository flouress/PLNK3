import { getUsername, setLoggedOut } from '../auth.js';
import { fetchPsa, fetchCvv, fetchBrosur, fetchRanking } from '../api.js';
import { renderDataTable } from '../components/dataTable.js';
import { renderRankingTable } from '../components/rankingTable.js';
import { renderTabNavigation } from '../components/tabNavigation.js';
import { renderDateFilter } from '../components/dateFilter.js';

const TABS = [
  { id: 'psa', label: 'PSA' },
  { id: 'cvv', label: 'CVV' },
  { id: 'brosur', label: 'Brosur' },
  { id: 'ranking', label: 'Ranking' },
];

const PSA_COLUMNS = [
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'namaInspektor', label: 'Nama Inspektor' },
  { key: 'jabatanInspektor', label: 'Jabatan' },
  { key: 'periodeInspeksi', label: 'Periode Inspeksi' },
  { key: 'namaUnit', label: 'Nama Unit' },
];

const CVV_COLUMNS = [
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'namaObserver', label: 'Nama Observer' },
  { key: 'perusahaan', label: 'Perusahaan' },
  { key: 'jabatanObserver', label: 'Jabatan' },
  { key: 'pekerjaanPadaBagian', label: 'Pekerjaan Pada Bagian' },
  { key: 'namaUnit', label: 'Nama Unit' },
];

const BROSUR_COLUMNS = [
  { key: 'tanggal', label: 'Tanggal' },
  { key: 'pekerjaan', label: 'Pekerjaan' },
  { key: 'pelaksana', label: 'Pelaksana' },
];

let currentTab = 'psa';
let currentFilters = {};

/**
 * Render halaman dashboard
 * @param {HTMLElement} container
 * @param {Function} onLogout - callback setelah logout
 */
export function renderDashboard(container, onLogout) {
  const username = getUsername();

  container.innerHTML = `
    <div class="dashboard-container">
      <header class="dashboard-header">
        <div class="header-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          <div>
            <h1>Dashboard K3</h1>
            <span>PLN UP3 Kebon Jeruk</span>
          </div>
        </div>
        <div class="header-user">
          <span class="username">Halo, <strong>${escapeHtml(username)}</strong></span>
          <button class="btn-logout" id="btn-logout">Keluar</button>
        </div>
      </header>

      <main class="dashboard-content">
        <div id="tab-container"></div>
        <div id="filter-container"></div>
        <div id="table-container"></div>
      </main>
    </div>
  `;

  // Logout handler
  document.getElementById('btn-logout').addEventListener('click', () => {
    setLoggedOut();
    onLogout();
  });

  // Render tabs
  renderTabNavigation(
    document.getElementById('tab-container'),
    TABS,
    currentTab,
    (tabId) => {
      currentTab = tabId;
      currentFilters = {};
      renderFilterAndTable();
    }
  );

  // Initial render
  renderFilterAndTable();
}

function renderFilterAndTable() {
  const filterContainer = document.getElementById('filter-container');
  const tableContainer = document.getElementById('table-container');

  // Filter hanya untuk PSA dan CVV
  if (currentTab === 'psa' || currentTab === 'cvv') {
    renderDateFilter(filterContainer, currentFilters, (filters) => {
      currentFilters = filters;
      loadTableData(tableContainer);
    });
  } else {
    filterContainer.innerHTML = '';
  }

  loadTableData(tableContainer);
}

async function loadTableData(container) {
  // Show loading
  container.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Memuat data...</p>
    </div>
  `;

  try {
    switch (currentTab) {
      case 'psa': {
        const data = await fetchPsa(currentFilters);
        renderDataTable(container, 'Laporan PSA', PSA_COLUMNS, data);
        break;
      }
      case 'cvv': {
        const data = await fetchCvv(currentFilters);
        renderDataTable(container, 'Laporan CVV', CVV_COLUMNS, data);
        break;
      }
      case 'brosur': {
        const data = await fetchBrosur();
        renderDataTable(container, 'Data Brosur', BROSUR_COLUMNS, data);
        break;
      }
      case 'ranking': {
        const data = await fetchRanking();
        renderRankingTable(container, data);
        break;
      }
    }
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">⚠️</div>
        <p>Gagal memuat data. Pastikan backend berjalan.</p>
        <p style="font-size: 12px; color: var(--color-text-muted); margin-top: 8px;">
          ${escapeHtml(err.message)}
        </p>
      </div>
    `;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
