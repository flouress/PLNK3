/**
 * Render ranking table sebagai grid cards per unit
 * @param {HTMLElement} container
 * @param {Array<{unitName: string, rankings: Array<{rank: number, nama: string, jumlah: number}>}>} data
 */
export function renderRankingTable(container, data) {
  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="table-container">
        <div class="table-header">
          <h2>Ranking Kinerja Unit</h2>
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

  const cards = data.map(group => `
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
          ${group.rankings.map(entry => `
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
  `).join('');

  container.innerHTML = `
    <div class="ranking-grid">
      ${cards}
    </div>
  `;
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
