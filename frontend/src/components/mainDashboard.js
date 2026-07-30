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
let typeFilters = { PSA: false, CVV: false, BROSUR: false };
let currentSlideIndex = 0;
let currentMonitoringMonth = new Date().getMonth();
let currentRankingPeriod = 'all';

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
      <div class="chart-container-box col-span-8" style="position: relative; overflow: hidden; padding-bottom: 2.5rem; display: flex; flex-direction: column;">
        
        <div id="dashboardCarousel" style="display: flex; width: 200%; transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); transform: translateX(${currentSlideIndex === 0 ? '0' : '-50%'});">
          
          <!-- Slide 1: Chart -->
          <div style="width: 50%; flex-shrink: 0; padding-right: 1rem; box-sizing: border-box;">
            <h3 class="chart-title">${escapeHtml(chartTitle)}</h3>
            <div class="canvas-wrapper">
              <canvas id="barChart"></canvas>
            </div>
          </div>
          
          <!-- Slide 2: Monitoring -->
          <div style="width: 50%; flex-shrink: 0; padding-left: 1rem; box-sizing: border-box; max-height: 400px; overflow-y: auto;">
            <div style="display:flex; justify-content:flex-end; margin-bottom:1rem;">
              <select id="monitoringMonthSelect" style="padding: 0.4rem 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; outline: none; font-weight: 500; font-family: inherit; background: white; cursor: pointer; color: #1e293b; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                 ${['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((m, i) => `<option value="${i}" ${currentMonitoringMonth === i ? 'selected' : ''}>Bulan: ${m}</option>`).join('')}
              </select>
            </div>
            ${generateMonitoringHtml()}
          </div>
        </div>

        <!-- Carousel Dots -->
        <div style="position: absolute; bottom: 1rem; left: 50%; transform: translateX(-50%); display: flex; gap: 0.5rem; z-index: 10;">
           <button class="carousel-dot-btn" data-index="0" style="width: 12px; height: 12px; border-radius: 50%; border: none; background: ${currentSlideIndex === 0 ? '#3b82f6' : '#cbd5e1'}; cursor: pointer; transition: background 0.3s, transform 0.2s; padding:0; outline:none;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"></button>
           <button class="carousel-dot-btn" data-index="1" style="width: 12px; height: 12px; border-radius: 50%; border: none; background: ${currentSlideIndex === 1 ? '#3b82f6' : '#cbd5e1'}; cursor: pointer; transition: background 0.3s, transform 0.2s; padding:0; outline:none;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"></button>
        </div>

        <!-- Carousel Arrows -->
        <button class="carousel-arrow-btn" data-dir="-1" style="position: absolute; top: 50%; left: 0.5rem; transform: translateY(-50%); width: 36px; height: 36px; border-radius: 50%; background: white; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; color: #64748b; outline: none; transition: all 0.3s; opacity: ${currentSlideIndex === 0 ? '0.2' : '0.5'}; pointer-events: ${currentSlideIndex === 0 ? 'none' : 'auto'};" onmouseover="this.style.opacity='1'; this.style.background='#f8fafc'; this.style.color='#0f172a';" onmouseout="this.style.opacity='0.5'; this.style.background='white'; this.style.color='#64748b';">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <button class="carousel-arrow-btn" data-dir="1" style="position: absolute; top: 50%; right: 0.5rem; transform: translateY(-50%); width: 36px; height: 36px; border-radius: 50%; background: white; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; color: #64748b; outline: none; transition: all 0.3s; opacity: ${currentSlideIndex === 1 ? '0.2' : '0.5'}; pointer-events: ${currentSlideIndex === 1 ? 'none' : 'auto'};" onmouseover="this.style.opacity='1'; this.style.background='#f8fafc'; this.style.color='#0f172a';" onmouseout="this.style.opacity='0.5'; this.style.background='white'; this.style.color='#64748b';">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
        
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
          <button class="type-filter-btn" data-type="PSA" style="flex:1; padding: 0.35rem; border-radius: 6px; border: 1px solid ${typeFilters.PSA ? '#bfdbfe' : '#e2e8f0'}; background: ${typeFilters.PSA ? '#eff6ff' : '#f8fafc'}; color: ${typeFilters.PSA ? '#1d4ed8' : '#94a3b8'}; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">PSA</button>
          <button class="type-filter-btn" data-type="CVV" style="flex:1; padding: 0.35rem; border-radius: 6px; border: 1px solid ${typeFilters.CVV ? '#bbf7d0' : '#e2e8f0'}; background: ${typeFilters.CVV ? '#f0fdf4' : '#f8fafc'}; color: ${typeFilters.CVV ? '#15803d' : '#94a3b8'}; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">CCV</button>
          <button class="type-filter-btn" data-type="BROSUR" style="flex:1; padding: 0.35rem; border-radius: 6px; border: 1px solid ${typeFilters.BROSUR ? '#fde047' : '#e2e8f0'}; background: ${typeFilters.BROSUR ? '#fefce8' : '#f8fafc'}; color: ${typeFilters.BROSUR ? '#a16207' : '#94a3b8'}; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">BROSUR</button>
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

  const handleRankingPeriodChange = async (newPeriod) => {
    currentRankingPeriod = newPeriod;
    const rankingContainer = document.getElementById('dashboard-ranking-container');
    if (!rankingContainer) return;

    rankingContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--color-text-muted);">Memuat data ranking...</div>';

    try {
      let filters = {};
      if (newPeriod === 'this_month') {
        filters.month = new Date().getMonth() + 1; // 1-12
      }
      allRankingData = await fetchRanking(filters);
      const displayData = allRankingData.map(group => ({
        ...group,
        unitName: group.unitName.replace(/CVV/g, 'CCV')
      }));
      renderRankingTable(rankingContainer, displayData, handleRankingPeriodChange, currentRankingPeriod);
    } catch (e) {
      console.error('Failed to fetch ranking for new period:', e);
      rankingContainer.innerHTML = '<div style="color: red; text-align: center;">Gagal memuat ranking.</div>';
    }
  };

  const rankingDisplayData = allRankingData.map(group => ({
    ...group,
    unitName: group.unitName.replace(/CVV/g, 'CCV')
  }));
  renderRankingTable(document.getElementById('dashboard-ranking-container'), rankingDisplayData, handleRankingPeriodChange, currentRankingPeriod);

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
      const isCurrentlyActive = typeFilters[type];

      typeFilters.PSA = false;
      typeFilters.CVV = false;
      typeFilters.BROSUR = false;

      if (!isCurrentlyActive) {
        typeFilters[type] = true;
      }

      document.querySelectorAll('.type-filter-btn').forEach(b => {
        const t = b.dataset.type;
        if (typeFilters[t]) {
          if (t === 'PSA') { b.style.background = '#eff6ff'; b.style.color = '#1d4ed8'; b.style.borderColor = '#bfdbfe'; }
          if (t === 'CVV') { b.style.background = '#f0fdf4'; b.style.color = '#15803d'; b.style.borderColor = '#bbf7d0'; }
          if (t === 'BROSUR') { b.style.background = '#fefce8'; b.style.color = '#a16207'; b.style.borderColor = '#fde047'; }
        } else {
          b.style.background = '#f8fafc';
          b.style.color = '#94a3b8';
          b.style.borderColor = '#e2e8f0';
        }
      });

      renderRecentActivities();
    });
  });

  const updateCarouselUI = () => {
    const track = document.getElementById('dashboardCarousel');
    if (track) track.style.transform = `translateX(${currentSlideIndex === 0 ? '0' : '-50%'})`;
    
    document.querySelectorAll('.carousel-dot-btn').forEach(d => {
      const idx = parseInt(d.dataset.index, 10);
      d.style.background = idx === currentSlideIndex ? '#3b82f6' : '#cbd5e1';
    });
    
    const arrowPrev = document.querySelector('.carousel-arrow-btn[data-dir="-1"]');
    const arrowNext = document.querySelector('.carousel-arrow-btn[data-dir="1"]');
    if (arrowPrev) {
      arrowPrev.style.opacity = currentSlideIndex === 0 ? '0.2' : '0.5';
      arrowPrev.style.pointerEvents = currentSlideIndex === 0 ? 'none' : 'auto';
    }
    if (arrowNext) {
      arrowNext.style.opacity = currentSlideIndex === 1 ? '0.2' : '0.5';
      arrowNext.style.pointerEvents = currentSlideIndex === 1 ? 'none' : 'auto';
    }
  };

  document.querySelectorAll('.carousel-dot-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentSlideIndex = parseInt(e.target.dataset.index, 10);
      updateCarouselUI();
    });
  });

  document.querySelectorAll('.carousel-arrow-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const dir = parseInt(e.currentTarget.dataset.dir, 10);
      let newIndex = currentSlideIndex + dir;
      if (newIndex < 0) newIndex = 0;
      if (newIndex > 1) newIndex = 1;
      if (newIndex !== currentSlideIndex) {
        currentSlideIndex = newIndex;
        updateCarouselUI();
      }
    });
  });

  const monthSelect = document.getElementById('monitoringMonthSelect');
  if (monthSelect) {
    monthSelect.addEventListener('change', (e) => {
      currentMonitoringMonth = parseInt(e.target.value, 10);
      renderContent(container, filterValue);
    });
  }

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
  const isAnySelected = typeFilters.PSA || typeFilters.CVV || typeFilters.BROSUR;
  combined = combined.filter(row => isAnySelected ? typeFilters[row.type] : true);

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

    let displayType = act.type === 'BROSUR' ? 'BRS' : act.type === 'CVV' ? 'CCV' : act.type;
    let actionText = act.type === 'BROSUR' ? 'pekerjaan di' : `mengisi ${displayType} di`;

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

function generateMonitoringHtml() {
  const targetUnit = 'UP3 KEBON JERUK';
  const targetMonth = currentMonitoringMonth;
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const monthName = monthNames[targetMonth];

  const now = new Date();
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const currentDay = days[now.getDay()];
  const currentDate = now.getDate();
  const currentMonthName = monthNames[now.getMonth()];
  const currentYear = now.getFullYear();

  const isMatch = (timestamp, unit) => {
    if (!timestamp) return false;
    const d = parseD(timestamp);
    if (!d) return false;
    if (d.getMonth() !== targetMonth) return false;
    const unitUpper = (unit || '').toUpperCase();
    return unitUpper.includes(targetUnit);
  };

  const isBrosurMatch = (tanggal) => {
      if (!tanggal) return false;
      const d = parseD(tanggal);
      if (!d) return false;
      return d.getMonth() === targetMonth;
  };

  const psaFiltered = allPsaData.filter(r => isMatch(r.timestamp, r.namaUnit));
  const cvvFiltered = allCvvData.filter(r => isMatch(r.timestamp, r.namaUnit));
  const brosurFiltered = allBrosurData.filter(r => isBrosurMatch(r.tanggal));

  const manajemenRoles = ['MANAGER', 'ASMAN JAR', 'ASMAN KONS', 'ASMAN TEL', 'ASMAN AGA', 'ASMAN SAR', 'ASMAN KU'];
  const tlRoles = ['TL OP', 'TL HAR', 'TL DALKON', 'TL BUNGTUS', 'TL LOG', 'TL P2TL', 'TL BACA METER', 'TL DALAPP', 'TL ME', 'TL K4L'];
  const flyerRoles = ['YANTEK', 'MANBILL', 'P2TL'];
  const ccvRoles = ['YANTEK', 'MANBILL', 'P2TL', 'PENGAWAS'];

  const psaCounts = {};
  manajemenRoles.concat(tlRoles).forEach(r => psaCounts[r] = 0);
  
  const jabatanMapping = {
    'MANAGER': ['MANAGER UP3/ UP2D', 'MANAGER UP3/UP2D', 'MANAGER'],
    'ASMAN JAR': ['ASMAN JARINGAN'],
    'ASMAN KONS': ['ASMAN KONSTRUKSI'],
    'ASMAN TEL': ['ASMAN TRANSAKSI ENERGI LISTRIK'],
    'ASMAN AGA': ['ASMAN NIAGA'],
    'ASMAN SAR': ['ASMAN PEMASARAN'],
    'ASMAN KU': ['ASMAN KEUANGAN DAN UMUM'],
    'TL OP': ['TEAM LEADER OPERASI', 'TL OPERASI'],
    'TL HAR': ['TEAM LEADER PEMELIHARAAN', 'TL PEMELIHARAAN'],
    'TL DALKON': ['TEAM LEADER PENGENDALIAN KONSTRUKSI', 'TL PENGENDALIAN KONSTRUKSI', 'TEAM LEADER DALKON'],
    'TL BUNGTUS': ['TEAM LEADER SAMBUNG PUTUS', 'TEAM LEADER BUNGTUS'],
    'TL LOG': ['TEAM LEADER LOGISTIK'],
    'TL P2TL': ['TEAM LEADER P2TL'],
    'TL BACA METER': ['TEAM LEADER BACA METER'],
    'TL DALAPP': ['TEAM LEADER DALAPP'],
    'TL ME': ['TEAM LEADER ME', 'TEAM LEADER MANAJEMEN ENERGI'],
    'TL K4L': ['TEAM LEADER K3L', 'TEAM LEADER K4L']
  };

  psaFiltered.forEach(r => {
      let j = (r.jabatanInspektor || '').toUpperCase();
      for (const role of manajemenRoles.concat(tlRoles)) {
          const mappedNames = jabatanMapping[role] || [];
          const matched = mappedNames.some(name => j.includes(name) || name.includes(j));
          if (matched || j.includes(role)) {
              psaCounts[role]++;
              break;
          }
      }
  });

  const brosurCounts = {};
  flyerRoles.forEach(r => brosurCounts[r] = 0);
  brosurFiltered.forEach(r => {
      let text = ((r.pekerjaan || '') + ' ' + (r.pelaksana || '')).toUpperCase();
      for (const role of flyerRoles) {
          if (text.includes(role)) {
              brosurCounts[role]++;
              break;
          }
      }
  });

  const cvvCounts = {};
  ccvRoles.forEach(r => cvvCounts[r] = 0);
  cvvFiltered.forEach(r => {
      let text = ((r.pekerjaanPadaBagian || '') + ' ' + (r.jabatanObserver || '')).toUpperCase();
      for (const role of ccvRoles) {
          if (text.includes(role)) {
              cvvCounts[role]++;
              break;
          }
      }
  });

  return `
    <div style="font-family: inherit; color: #334155; padding: 1.5rem; border-radius: 12px; background: white; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);">
      <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2 style="font-size:1.25rem; font-weight:700; margin: 0 0 0.25rem 0; color: #0f172a;">Monitoring K3 UP3 Kebon Jeruk</h2>
          <div style="font-size:0.875rem; color: #64748b; margin: 0;">${currentDay}, ${currentDate} ${currentMonthName} ${currentYear}</div>
        </div>
        <h3 style="font-size:0.875rem; font-weight:700; text-transform:uppercase; margin: 0; color: #2563eb; background: #eff6ff; padding: 0.5rem 1rem; border-radius: 9999px; border: 1px solid #bfdbfe;">PERIODE ${monthName}</h3>
      </div>
      
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem;">
          <div>
             <h4 style="font-weight:700; font-size:1rem; margin-top:0; margin-bottom:1rem; color: #0f172a; display:flex; align-items:center; gap:0.5rem;"><span style="display:inline-block; width:10px; height:10px; background:#3b82f6; border-radius:50%;"></span> Manajemen</h4>
             <ul style="list-style: none; margin: 0; padding: 0; display:flex; flex-direction:column; gap:0.5rem;">
                ${manajemenRoles.map(r => `
                  <li style="display:flex; justify-content:space-between; align-items:center; font-size: 0.875rem; padding: 0.5rem 0.75rem; background: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.05)';" onmouseout="this.style.transform='none'; this.style.boxShadow='none';">
                    <span style="color:#475569; font-weight:500;">${r}</span>
                    <strong style="background:#e2e8f0; padding:2px 8px; border-radius:12px; color:#0f172a; font-size: 0.8rem;">${psaCounts[r]}</strong>
                  </li>`).join('')}
             </ul>
          </div>
          <div>
             <h4 style="font-weight:700; font-size:1rem; margin-top:0; margin-bottom:1rem; color: #0f172a; display:flex; align-items:center; gap:0.5rem;"><span style="display:inline-block; width:10px; height:10px; background:#8b5cf6; border-radius:50%;"></span> Team Leader</h4>
             <ul style="list-style: none; margin: 0; padding: 0; display:flex; flex-direction:column; gap:0.5rem;">
                ${tlRoles.map(r => `
                  <li style="display:flex; justify-content:space-between; align-items:center; font-size: 0.875rem; padding: 0.5rem 0.75rem; background: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.05)';" onmouseout="this.style.transform='none'; this.style.boxShadow='none';">
                    <span style="color:#475569; font-weight:500;">${r}</span>
                    <strong style="background:#e2e8f0; padding:2px 8px; border-radius:12px; color:#0f172a; font-size: 0.8rem;">${psaCounts[r]}</strong>
                  </li>`).join('')}
             </ul>
          </div>
          <div>
             <h4 style="font-weight:700; font-size:1rem; margin-top:0; margin-bottom:1rem; color: #0f172a; display:flex; align-items:center; gap:0.5rem;"><span style="display:inline-block; width:10px; height:10px; background:#eab308; border-radius:50%;"></span> Flyer K3</h4>
             <ul style="list-style: none; margin: 0; padding: 0; display:flex; flex-direction:column; gap:0.5rem;">
                ${flyerRoles.map(r => `
                  <li style="display:flex; justify-content:space-between; align-items:center; font-size: 0.875rem; padding: 0.5rem 0.75rem; background: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.05)';" onmouseout="this.style.transform='none'; this.style.boxShadow='none';">
                    <span style="color:#475569; font-weight:500;">${r}</span>
                    <strong style="background:#e2e8f0; padding:2px 8px; border-radius:12px; color:#0f172a; font-size: 0.8rem;">${brosurCounts[r]}</strong>
                  </li>`).join('')}
             </ul>
          </div>
      </div>
    </div>
  `;
}
