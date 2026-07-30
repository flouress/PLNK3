/**
 * Render ranking table sebagai grid cards per unit
 * @param {HTMLElement} container
 * @param {Array<{unitName: string, rankings: Array<{rank: number, nama: string, jumlah: number}>}>} data
 */
let currentLimit = 15;

export function renderRankingTable(container, data, onPeriodChange = null, currentPeriod = 'all') {
  function render() {
    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="table-container">
          <div class="table-header">
            <h2>Ranking Kinerja</h2>
          </div>
          <div class="empty-state">
            <div class="icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-slate-500">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <p>Tidak ada data ranking ditemukan</p>
          </div>
        </div>
      `;
      return;
    }

    const periodSelectHTML = onPeriodChange ? `
      <label for="ranking-period-table" style="color:var(--color-text-muted); margin-left: 1rem;">Periode:</label>
      <select id="ranking-period-table" style="padding:0.4rem; border:1px solid var(--color-border); border-radius:6px; outline:none; font-family:inherit;">
        <option value="all" ${currentPeriod === 'all' ? 'selected' : ''}>Semua Periode</option>
        <option value="this_month" ${currentPeriod === 'this_month' ? 'selected' : ''}>Bulan Ini</option>
      </select>
    ` : '';

    const limitSelectHTML = `
      <div style="display:flex; justify-content:flex-end; align-items:center; margin-bottom:1rem; gap:0.5rem; font-size:0.9rem;">
        <label for="ranking-limit" style="color:var(--color-text-muted);">Tampilkan:</label>
        <select id="ranking-limit" style="padding:0.4rem; border:1px solid var(--color-border); border-radius:6px; outline:none; font-family:inherit;">
          <option value="5" ${currentLimit === 5 ? 'selected' : ''}>Top 5</option>
          <option value="15" ${currentLimit === 15 ? 'selected' : ''}>Top 15</option>
          <option value="50" ${currentLimit === 50 ? 'selected' : ''}>Top 50</option>
          <option value="all" ${currentLimit === 'all' ? 'selected' : ''}>Semua</option>
        </select>
        ${periodSelectHTML}
      </div>
    `;

    const cards = data.map(group => {
      const displayRankings = currentLimit === 'all' ? group.rankings : group.rankings.slice(0, currentLimit);
      return `
        <div class="ranking-card">
          <div class="ranking-card-header">
            <h3>${escapeHtml(group.unitName)}</h3>
          </div>
          <table class="ranking-table">
            <thead>
              <tr>
                <th style="width: 60px;">Rank</th>
                <th>Nama</th>
                <th style="width: 80px; text-align: right;">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              ${displayRankings.map(entry => `
                <tr>
                  <td>
                    <span class="rank-badge ${getRankClass(entry.rank)}">
                      ${entry.rank}
                    </span>
                  </td>
                  <td>${escapeHtml(entry.nama)}</td>
                  <td style="text-align: right; font-weight: 600; color: var(--color-blue-soft);">
                    ${entry.jumlah}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      ${limitSelectHTML}
      <div class="ranking-grid">
        ${cards}
      </div>
    `;

    const limitSelect = container.querySelector('#ranking-limit');
    if (limitSelect) {
      limitSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        currentLimit = val === 'all' ? 'all' : parseInt(val, 10);
        render();
      });
    }

    const periodSelect = container.querySelector('#ranking-period-table');
    if (periodSelect && onPeriodChange) {
      periodSelect.addEventListener('change', (e) => {
        onPeriodChange(e.target.value);
      });
    }
  }

  render();
}

function getRankClass(rank) {
  switch (rank) {
    case 1: return 'rank-1';
    case 2: return 'rank-2';
    case 3: return 'rank-3';
    default: return 'rank-default';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
