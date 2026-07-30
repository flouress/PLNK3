import Chart from 'chart.js/auto';
import { fetchPsa, fetchCvv, fetchBrosur, fetchRanking } from '../api.js';
import { renderRankingTable } from './rankingTable.js';

let isFetched = false;
let allPsaData = [];
let allCvvData = [];
let allBrosurData = [];
let allRankingData = [];
let barChartInstance = null;
let currentRecentFilter = 'today';
let currentRecentSearch = '';
let typeFilters = { PSA: true, CVV: true, BROSUR: true };

export async function renderMainDashboard(container) {
  if (!isFetched) {
    container.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>Memuat grafik ringkasan...</p>
      </div>
    `;
  }

  try {
    if (!isFetched) {
      const [psa, cvv, brosur, ranking] = await Promise.all([
        fetchPsa(),
        fetchCvv(),
        fetchBrosur(),
        fetchRanking()
      ]);
      allPsaData = psa;
      allCvvData = cvv;
      allBrosurData = brosur;
      allRankingData = ranking;
      isFetched = true;
    }

    container.innerHTML = `
      <div class="dashboard-header-row" style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--color-text); margin: 0;">Dashboard Utama</h2>
        <div class="filter-controls">
          <select id="dateFilter" class="filter-select" style="padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid var(--color-border); background: white; font-weight: 500; cursor: pointer; outline: none; font-family: inherit;">
            <option value="all">Semua Waktu (All Time)</option>
            <option value="today">Hari Ini (Today)</option>
            <option value="yesterday">Kemarin (Yesterday)</option>
            <option value="week">7 Hari Terakhir (Last Week)</option>
            <option value="month">30 Hari Terakhir (Last Month)</option>
          </select>
        </div>
      </div>
      <div id="dashboard-content"></div>
    `;

    const contentContainer = document.getElementById('dashboard-content');

    document.getElementById('dateFilter').addEventListener('change', (e) => {
      renderContent(contentContainer, e.target.value);
    });

    renderContent(contentContainer, 'all');

  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">⚠️</div>
        <p>Gagal memuat grafik dashboard.</p>
        <p style="font-size: 12px; color: var(--color-text-muted); margin-top: 8px;">
          ${escapeHtml(err.response?.data?.error || err.response?.data?.message || err.message)}
        </p>
      </div>
    `;
  }
}

function renderContent(container, filterValue) {
  const filteredPsa = filterDataByDate(allPsaData, filterValue);
  const filteredCvv = filterDataByDate(allCvvData, filterValue);

  let chartLabels, chartPsa, chartCvv, chartTitle;

  if (filterValue === 'today') {
    const res = aggregateByHour(filteredPsa, filteredCvv);
    chartLabels = res.labels; chartPsa = res.psaCounts; chartCvv = res.cvvCounts;
    chartTitle = "Grafik Laporan Hari Ini (Per Jam)";
  } else if (filterValue === 'yesterday') {
    const res = aggregateByHour(filteredPsa, filteredCvv);
    chartLabels = res.labels; chartPsa = res.psaCounts; chartCvv = res.cvvCounts;
    chartTitle = "Grafik Laporan Kemarin (Per Jam)";
  } else if (filterValue === 'week') {
    const res = aggregateByDayOfWeek(filteredPsa, filteredCvv);
    chartLabels = res.labels; chartPsa = res.psaCounts; chartCvv = res.cvvCounts;
    chartTitle = "Grafik Laporan 7 Hari Terakhir (Per Hari)";
  } else if (filterValue === 'month') {
    const res = aggregateByDate(filteredPsa, filteredCvv, 30);
    chartLabels = res.labels; chartPsa = res.psaCounts; chartCvv = res.cvvCounts;
    chartTitle = "Grafik Laporan 30 Hari Terakhir (Per Tanggal)";
  } else {
    const res = aggregateByMonthYear(allPsaData, allCvvData); // use all data for 'all'
    chartLabels = res.labels; chartPsa = res.psaCounts; chartCvv = res.cvvCounts;
    chartTitle = "Grafik Laporan Sepanjang Waktu (Per Bulan)";
  }

  const activeReporters = new Set([
    ...filteredPsa.map(r => (r.namaInspektor || '').trim()),
    ...filteredCvv.map(r => (r.namaObserver || '').trim())
  ].filter(Boolean));

  container.innerHTML = `
    <!-- Header: 4 KPIs -->
    <div class="dashboard-cards-summary">
      <div class="summary-card">
        <div class="summary-value text-blue-500">${filteredPsa.length}</div>
        <div class="summary-label">Total Laporan PSA</div>
      </div>
      <div class="summary-card">
        <div class="summary-value text-green-500">${filteredCvv.length}</div>
        <div class="summary-label">Total Laporan CCV</div>
      </div>
      <div class="summary-card">
        <div class="summary-value text-yellow-500" style="color: #eab308;">${allBrosurData.length}</div>
        <div class="summary-label">Total Brosur</div>
      </div>
      <div class="summary-card">
        <div class="summary-value text-purple-500" style="color: #a855f7;">${activeReporters.size}</div>
        <div class="summary-label">Pelapor Aktif</div>
      </div>
    </div>

    <!-- 12-Col Grid: Bar Chart (8) & Recent List (4) -->
    <div class="dashboard-grid-12">
      <div class="chart-container-box col-span-8">
        <h3 class="chart-title">${escapeHtml(chartTitle)}</h3>
        <div class="canvas-wrapper">
          <canvas id="barChart"></canvas>
        </div>
      </div>
      
      <div class="chart-container-box col-span-4" style="display:flex; flex-direction:column; max-height: 400px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem;">
          <h3 class="chart-title" style="margin:0;">Aktivitas Terbaru</h3>
          <select id="recentFilterSelect" style="font-size:0.8rem; padding:0.25rem; border-radius: 4px; border: 1px solid var(--color-border); outline: none;">
            <option value="today" ${currentRecentFilter === 'today' ? 'selected' : ''}>Today</option>
            <option value="yesterday" ${currentRecentFilter === 'yesterday' ? 'selected' : ''}>Yesterday</option>
            <option value="week" ${currentRecentFilter === 'week' ? 'selected' : ''}>This Week</option>
          </select>
        </div>
        
        <div style="display:flex; gap: 0.5rem; margin-bottom: 0.75rem;" id="recent-type-filters">
          <button class="type-filter-btn" data-type="PSA" style="flex:1; padding: 0.35rem; border-radius: 6px; border: 1px solid #bfdbfe; background: ${typeFilters.PSA ? '#eff6ff' : '#f8fafc'}; color: ${typeFilters.PSA ? '#1d4ed8' : '#94a3b8'}; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">PSA</button>
          <button class="type-filter-btn" data-type="CVV" style="flex:1; padding: 0.35rem; border-radius: 6px; border: 1px solid #bbf7d0; background: ${typeFilters.CVV ? '#f0fdf4' : '#f8fafc'}; color: ${typeFilters.CVV ? '#15803d' : '#94a3b8'}; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">CCV</button>
          <button class="type-filter-btn" data-type="BROSUR" style="flex:1; padding: 0.35rem; border-radius: 6px; border: 1px solid #fde047; background: ${typeFilters.BROSUR ? '#fefce8' : '#f8fafc'}; color: ${typeFilters.BROSUR ? '#a16207' : '#94a3b8'}; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">BROSUR</button>
        </div>
        
        <input type="text" id="recentSearchInput" value="${escapeHtml(currentRecentSearch)}" placeholder="Cari nama, unit, dll..." style="margin-bottom: 1rem; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--color-border); width: 100%; outline: none; font-family:inherit; font-size: 0.85rem; box-sizing: border-box;" />
        
        <div class="recent-list" id="recent-list-content" style="flex:1; overflow-y:auto; padding-right: 0.5rem;">
        </div>
      </div>
    </div>

    <!-- Full Width: Ranking Table -->
    <div class="dashboard-ranking-section" style="margin-top: 2rem;">
      <div id="dashboard-ranking-container"></div>
    </div>
  `;

  if (barChartInstance) {
    barChartInstance.destroy();
  }
  barChartInstance = initBarChart(document.getElementById('barChart'), chartLabels, chartPsa, chartCvv);

  const rankingDisplayData = allRankingData.map(group => ({
    ...group,
    unitName: group.unitName.replace(/CVV/g, 'CCV')
  }));
  renderRankingTable(document.getElementById('dashboard-ranking-container'), rankingDisplayData);

  // Attach Event Listeners for Recent Activities
  document.getElementById('recentFilterSelect').addEventListener('change', (e) => {
    currentRecentFilter = e.target.value;
    renderRecentActivities();
  });

  document.getElementById('recentSearchInput').addEventListener('input', (e) => {
    currentRecentSearch = e.target.value;
    renderRecentActivities();
  });

  document.querySelectorAll('.type-filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = e.target.dataset.type;
      typeFilters[type] = !typeFilters[type];

      if (typeFilters[type]) {
        if (type === 'PSA') { e.target.style.background = '#eff6ff'; e.target.style.color = '#1d4ed8'; }
        if (type === 'CVV') { e.target.style.background = '#f0fdf4'; e.target.style.color = '#15803d'; }
        if (type === 'BROSUR') { e.target.style.background = '#fefce8'; e.target.style.color = '#a16207'; }
      } else {
        e.target.style.background = '#f8fafc';
        e.target.style.color = '#94a3b8';
      }

      renderRecentActivities();
    });
  });

  renderRecentActivities();
}

function renderRecentActivities() {
  const listContainer = document.getElementById('recent-list-content');
  if (!listContainer) return;

  let combined = [];
  allPsaData.forEach(row => {
    combined.push({ type: 'PSA', timestamp: row.timestamp || '', reporter: row.namaInspektor || 'Tidak Diketahui', unit: row.namaUnit || 'Tidak Diketahui' });
  });
  allCvvData.forEach(row => {
    combined.push({ type: 'CVV', timestamp: row.timestamp || '', reporter: row.namaObserver || 'Tidak Diketahui', unit: row.namaUnit || 'Tidak Diketahui' });
  });
  allBrosurData.forEach(row => {
    combined.push({ type: 'BROSUR', timestamp: row.tanggal || '', reporter: row.pelaksana || 'Tidak Diketahui', unit: row.pekerjaan || 'Tidak Diketahui' });
  });

  // Filter by selected types first
  combined = combined.filter(row => typeFilters[row.type]);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  combined = combined.filter(row => {
    if (!row.timestamp) return false;
    const datePart = row.timestamp.split(' ')[0];
    let d;
    if (datePart.includes('/')) {
      const parts = datePart.split('/');
      if (parts.length === 3) d = new Date(parts[2], parts[1] - 1, parts[0]);
    } else if (datePart.includes('-')) {
      const parts = datePart.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) d = new Date(parts[0], parts[1] - 1, parts[2]);
        else d = new Date(parts[2], parts[1] - 1, parts[0]);
      }
    }
    if (!d || isNaN(d.getTime())) return false;
    d.setHours(0, 0, 0, 0);

    const diffTime = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (currentRecentFilter === 'today') return diffDays === 0;
    if (currentRecentFilter === 'yesterday') return diffDays === 1;
    if (currentRecentFilter === 'week') return diffDays >= 0 && diffDays <= 7;
    return true;
  });

  if (currentRecentSearch) {
    const q = currentRecentSearch.toLowerCase();
    combined = combined.filter(row =>
      row.reporter.toLowerCase().includes(q) ||
      row.unit.toLowerCase().includes(q) ||
      row.type.toLowerCase().includes(q)
    );
  }

  combined.sort((a, b) => {
    const parseD = (ts) => {
      const datePart = ts.split(' ')[0];
      if (datePart.includes('/')) {
        const parts = datePart.split('/');
        return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
      } else if (datePart.includes('-')) {
        const parts = datePart.split('-');
        if (parts[0].length === 4) return new Date(parts[0], parts[1] - 1, parts[2]).getTime();
        return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
      }
      return 0;
    };
    return parseD(b.timestamp) - parseD(a.timestamp);
  });

  const finalData = combined.slice(0, 15);

  const listHtml = finalData.map(act => {
    let iconClass = 'bg-blue-100 text-blue-600';
    if (act.type === 'CVV') iconClass = 'bg-green-100 text-green-600';
    else if (act.type === 'BROSUR') iconClass = 'bg-yellow-100 text-yellow-600';

    let actionText = act.type === 'BROSUR' ? 'pekerjaan di' : 'melaporkan temuan di';
    let displayType = act.type === 'BROSUR' ? 'BRS' : act.type === 'CVV' ? 'CCV' : act.type;

    return `
        <div class="recent-item">
          <div class="recent-icon ${iconClass}">
            ${displayType}
          </div>
          <div class="recent-content">
            <div class="recent-title"><strong>${escapeHtml(act.reporter)}</strong> ${actionText} <strong>${escapeHtml(act.unit)}</strong></div>
            <div class="recent-time">${escapeHtml(act.timestamp)}</div>
          </div>
        </div>
      `;
  }).join('');

  listContainer.innerHTML = listHtml || '<p class="text-sm text-slate-500">Belum ada aktivitas.</p>';
}

function filterDataByDate(data, filterType) {
  if (!filterType || filterType === 'all') return data;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return data.filter(row => {
    if (!row.timestamp) return false;
    const datePart = row.timestamp.split(' ')[0];
    let d;

    if (datePart.includes('/')) {
      const parts = datePart.split('/');
      if (parts.length === 3) d = new Date(parts[2], parts[1] - 1, parts[0]);
    } else if (datePart.includes('-')) {
      const parts = datePart.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) d = new Date(parts[0], parts[1] - 1, parts[2]);
        else d = new Date(parts[2], parts[1] - 1, parts[0]);
      }
    }

    if (!d || isNaN(d.getTime())) return false;
    d.setHours(0, 0, 0, 0);

    const diffTime = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (filterType === 'today') return diffDays === 0;
    if (filterType === 'yesterday') return diffDays === 1;
    if (filterType === 'week') return diffDays >= 0 && diffDays <= 7;
    if (filterType === 'month') return diffDays >= 0 && diffDays <= 30;

    return true;
  });
}

function parseD(ts) {
  if (!ts) return null;
  const parts = ts.split(' ');
  const datePart = parts[0];
  let d;
  if (datePart.includes('/')) {
    const p = datePart.split('/');
    if (p.length === 3) d = new Date(p[2], p[1] - 1, p[0]);
  } else if (datePart.includes('-')) {
    const p = datePart.split('-');
    if (p.length === 3) {
      if (p[0].length === 4) d = new Date(p[0], p[1] - 1, p[2]);
      else d = new Date(p[2], p[1] - 1, p[0]);
    }
  }
  if (!d || isNaN(d.getTime())) return null;

  if (parts[1]) {
    const timeParts = parts[1].split(':');
    if (timeParts.length >= 2) {
      d.setHours(parseInt(timeParts[0], 10), parseInt(timeParts[1], 10), 0, 0);
    }
  } else {
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

function aggregateByHour(psa, cvv) {
  const labels = [];
  const countMap = {};
  for (let i = 0; i < 24; i++) {
    const label = `${i.toString().padStart(2, '0')}:00`;
    labels.push(label);
    countMap[label] = { psa: 0, cvv: 0 };
  }

  const process = (data, type) => {
    data.forEach(row => {
      const d = parseD(row.timestamp);
      if (d) {
        const label = `${d.getHours().toString().padStart(2, '0')}:00`;
        if (countMap[label]) countMap[label][type]++;
      }
    });
  };
  process(psa, 'psa');
  process(cvv, 'cvv');

  return { labels, psaCounts: labels.map(l => countMap[l].psa), cvvCounts: labels.map(l => countMap[l].cvv) };
}

function aggregateByDayOfWeek(psa, cvv) {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const labels = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    labels.push(days[d.getDay()]);
  }

  const countMap = {};
  labels.forEach(l => countMap[l] = { psa: 0, cvv: 0 });

  const process = (data, type) => {
    data.forEach(row => {
      const d = parseD(row.timestamp);
      if (d) {
        const dayName = days[d.getDay()];
        if (countMap[dayName]) countMap[dayName][type]++;
      }
    });
  };
  process(psa, 'psa');
  process(cvv, 'cvv');

  return { labels, psaCounts: labels.map(l => countMap[l].psa), cvvCounts: labels.map(l => countMap[l].cvv) };
}

function aggregateByDate(psa, cvv, daysCount) {
  const labels = [];
  const countMap = {};
  const now = new Date();
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const label = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    labels.push(label);
    countMap[label] = { psa: 0, cvv: 0 };
  }

  const process = (data, type) => {
    data.forEach(row => {
      const d = parseD(row.timestamp);
      if (d) {
        const label = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        if (countMap[label]) countMap[label][type]++;
      }
    });
  };
  process(psa, 'psa');
  process(cvv, 'cvv');

  return { labels, psaCounts: labels.map(l => countMap[l].psa), cvvCounts: labels.map(l => countMap[l].cvv) };
}

function aggregateByMonthYear(psa, cvv) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const countMap = {};

  const process = (data, type) => {
    data.forEach(row => {
      const d = parseD(row.timestamp);
      if (d) {
        const label = `${months[d.getMonth()]} ${d.getFullYear()}`;
        if (!countMap[label]) {
          countMap[label] = { time: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), psa: 0, cvv: 0 };
        }
        countMap[label][type]++;
      }
    });
  };
  process(psa, 'psa');
  process(cvv, 'cvv');

  const labels = Object.keys(countMap).sort((a, b) => countMap[a].time - countMap[b].time);
  if (labels.length === 0) {
    return { labels: ['Belum Ada Data'], psaCounts: [0], cvvCounts: [0] };
  }
  return { labels, psaCounts: labels.map(l => countMap[l].psa), cvvCounts: labels.map(l => countMap[l].cvv) };
}





function initBarChart(canvas, labels, psaData, cvvData) {
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'PSA',
          data: psaData,
          backgroundColor: 'rgba(59, 130, 246, 0.8)', // blue-500
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: 'CCV',
          data: cvvData,
          backgroundColor: 'rgba(34, 197, 94, 0.8)', // green-500
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' }
      },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}



function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
