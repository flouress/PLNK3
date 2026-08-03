import Chart from 'chart.js/auto';
import { fetchPsa, fetchCvv, fetchBrosur, fetchRanking } from '../api.js';
import { renderRankingTable } from './rankingTable.js';

let isFetched = false;
let allPsaData = [];
let allCvvData = [];
let allBrosurData = [];
let allRankingData = [];
let barChartInstance = null;
let ccvRekapChartInstance = null;
let brosurRekapChartInstance = null;
let currentMainSlideIndex = 0;
let currentRecentFilter = 'today';
let currentRecentSearch = '';
let typeFilters = { PSA: false, CCV: false, BROSUR: false };
let currentMonitoringFilter = 'today';
let currentRankingPeriod = 'all';
let currentGlobalYear = new Date().getFullYear().toString();

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

    const getAvailableYearsHtml = (currentYearVal) => {
      const years = new Set();
      const addYear = (ts, format) => {
        const d = parseD(ts, format);
        if (d) years.add(d.getFullYear());
      };
      allPsaData.forEach(r => addYear(r.timestamp, 'ID'));
      allCvvData.forEach(r => addYear(r.timestamp, 'US'));
      allBrosurData.forEach(r => addYear(r.tanggal, 'US'));
      years.add(new Date().getFullYear());
      return Array.from(years).sort((a,b) => b - a).map(y => `<option value="${y}" ${currentYearVal === String(y) ? 'selected' : ''}>Tahun: ${y}</option>`).join('');
    };

    container.innerHTML = `
      <div class="dashboard-header-row" style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--color-text); margin: 0;">Dashboard Utama</h2>
        <div class="filter-controls" style="display: flex; gap: 0.5rem;">
          <select id="globalYearFilter" class="filter-select" style="padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid var(--color-border); background: white; font-weight: 500; cursor: pointer; outline: none; font-family: inherit;">
            <option value="all" ${currentGlobalYear === 'all' ? 'selected' : ''}>Semua Tahun</option>
            ${getAvailableYearsHtml(currentGlobalYear)}
          </select>
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

    document.getElementById('globalYearFilter').addEventListener('change', (e) => {
      currentGlobalYear = e.target.value;
      renderContent(contentContainer, document.getElementById('dateFilter').value);
    });

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
  const filteredPsa = filterDataByDate(allPsaData, filterValue, 'ID');
  const filteredCvv = filterDataByDate(allCvvData, filterValue, 'US');
  const filteredBrosur = filterDataByDate(allBrosurData, filterValue, 'US');

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
        <div class="summary-value text-yellow-500" style="color: #eab308;">${filteredBrosur.length}</div>
        <div class="summary-label">Total Brosur</div>
      </div>
      <div class="summary-card">
        <div class="summary-value text-purple-500" style="color: #a855f7;">${activeReporters.size}</div>
        <div class="summary-label">Pelapor Aktif</div>
      </div>
    </div>

    <div class="dashboard-grid-12">
      <div class="chart-container-box col-span-8" style="position: relative; padding: 0; display: flex; flex-direction: column; overflow: hidden; padding-bottom: 8px;">
        
        <!-- Hover Zone Left -->
        <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 60px; z-index: 10; display: flex; align-items: center; justify-content: center;"
             onmouseover="document.getElementById('mainChartLeftArrow').style.opacity='1'"
             onmouseout="document.getElementById('mainChartLeftArrow').style.opacity='0'">
          <button id="mainChartLeftArrow" style="opacity:0; transition:opacity 0.2s; background:rgba(0,0,0,0.4); color:white; border:none; border-radius:50%; width:36px; height:36px; cursor:pointer; display:flex; align-items:center; justify-content:center;" onmouseover="this.style.background='rgba(0,0,0,0.6)'" onmouseout="this.style.background='rgba(0,0,0,0.4)'">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        </div>

        <!-- Hover Zone Right -->
        <div style="position: absolute; right: 0; top: 0; bottom: 0; width: 60px; z-index: 10; display: flex; align-items: center; justify-content: center;"
             onmouseover="document.getElementById('mainChartRightArrow').style.opacity='1'"
             onmouseout="document.getElementById('mainChartRightArrow').style.opacity='0'">
          <button id="mainChartRightArrow" style="opacity:0; transition:opacity 0.2s; background:rgba(0,0,0,0.4); color:white; border:none; border-radius:50%; width:36px; height:36px; cursor:pointer; display:flex; align-items:center; justify-content:center;" onmouseover="this.style.background='rgba(0,0,0,0.6)'" onmouseout="this.style.background='rgba(0,0,0,0.4)'">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
        
        <div id="mainChartCarouselTrack" style="display: flex; width: 300%; transition: transform 0.3s ease; transform: translateX(-${currentMainSlideIndex * 33.3333}%);">
          
          <!-- Slide 1: Main Chart -->
          <div style="width: 33.3333%; padding: 1rem 1.5rem; box-sizing: border-box; flex-shrink: 0; display: flex; flex-direction: column;">
            <h3 class="chart-title">${escapeHtml(chartTitle)}</h3>
            <div class="canvas-wrapper" style="flex: 1; min-height: 350px; position: relative;">
              <canvas id="barChart"></canvas>
            </div>
          </div>

          <!-- Slide 2: CCV Bagian -->
          <div style="width: 33.3333%; padding: 1rem 1.5rem; box-sizing: border-box; flex-shrink: 0; display: flex; flex-direction: column;">
            <h3 class="chart-title">Rekap CCV Berdasarkan Bagian</h3>
            <div class="canvas-wrapper" style="flex: 1; min-height: 350px; position: relative;">
              <canvas id="ccvRekapChart"></canvas>
            </div>
          </div>

          <!-- Slide 3: Brosur Bidang -->
          <div style="width: 33.3333%; padding: 1rem 1.5rem; box-sizing: border-box; flex-shrink: 0; display: flex; flex-direction: column;">
            <h3 class="chart-title">Rekap Brosur Berdasarkan Bidang</h3>
            <div class="canvas-wrapper" style="flex: 1; min-height: 350px; position: relative;">
              <canvas id="brosurRekapChart"></canvas>
            </div>
          </div>
          
        </div>

        <!-- Carousel Dots -->
        <div style="position: absolute; bottom: 4px; left: 0; right: 0; display: flex; justify-content: center; gap: 8px;">
          <button class="main-chart-dot" data-index="0" style="width: 8px; height: 8px; border-radius: 50%; border: none; background: ${currentMainSlideIndex === 0 ? '#3b82f6' : '#cbd5e1'}; cursor: pointer; padding: 0;"></button>
          <button class="main-chart-dot" data-index="1" style="width: 8px; height: 8px; border-radius: 50%; border: none; background: ${currentMainSlideIndex === 1 ? '#3b82f6' : '#cbd5e1'}; cursor: pointer; padding: 0;"></button>
          <button class="main-chart-dot" data-index="2" style="width: 8px; height: 8px; border-radius: 50%; border: none; background: ${currentMainSlideIndex === 2 ? '#3b82f6' : '#cbd5e1'}; cursor: pointer; padding: 0;"></button>
        </div>

      </div>
      
      <div class="chart-container-box col-span-4" style="display:flex; flex-direction:column; max-height: 450px; padding: 1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem;">
          <h3 class="chart-title" style="margin:0;">Aktivitas Terbaru</h3>
          <select id="recentFilterSelect" style="font-size:0.8rem; padding:0.25rem; border-radius: 4px; border: 1px solid var(--color-border); outline: none;">
            <option value="all" ${currentRecentFilter === 'all' ? 'selected' : ''}>Semua Waktu</option>
            <option value="today" ${currentRecentFilter === 'today' ? 'selected' : ''}>Hari Ini</option>
            <option value="yesterday" ${currentRecentFilter === 'yesterday' ? 'selected' : ''}>Kemarin</option>
            <option value="week" ${currentRecentFilter === 'week' ? 'selected' : ''}>Minggu Ini</option>
            <option value="month" ${currentRecentFilter === 'month' ? 'selected' : ''}>Bulan Ini</option>
          </select>
        </div>
        
        <div style="display:flex; gap: 0.5rem; margin-bottom: 0.75rem;" id="recent-type-filters">
          <button class="type-filter-btn" data-type="PSA" style="flex:1; padding: 0.35rem; border-radius: 6px; border: 1px solid ${typeFilters.PSA ? '#bfdbfe' : '#e2e8f0'}; background: ${typeFilters.PSA ? '#eff6ff' : '#f8fafc'}; color: ${typeFilters.PSA ? '#1d4ed8' : '#94a3b8'}; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">PSA</button>
          <button class="type-filter-btn" data-type="CCV" style="flex:1; padding: 0.35rem; border-radius: 6px; border: 1px solid ${typeFilters.CCV ? '#bbf7d0' : '#e2e8f0'}; background: ${typeFilters.CCV ? '#f0fdf4' : '#f8fafc'}; color: ${typeFilters.CCV ? '#15803d' : '#94a3b8'}; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">CCV</button>
          <button class="type-filter-btn" data-type="BROSUR" style="flex:1; padding: 0.35rem; border-radius: 6px; border: 1px solid ${typeFilters.BROSUR ? '#fde047' : '#e2e8f0'}; background: ${typeFilters.BROSUR ? '#fefce8' : '#f8fafc'}; color: ${typeFilters.BROSUR ? '#a16207' : '#94a3b8'}; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">BROSUR</button>
        </div>
        
        <div style="margin-bottom: 0.5rem;">
          <input type="text" id="recentSearchInput" value="${escapeHtml(currentRecentSearch)}" placeholder="Cari nama, unit, dll..." style="width: 100%; padding: 0.4rem 0.5rem; font-size: 0.8rem; border-radius: 4px; border: 1px solid var(--color-border); box-sizing: border-box; outline: none;" />
        </div>
        
        <div id="dashboardRecentActivities" style="flex:1; overflow-y:auto; padding-right: 0.5rem; display:flex; flex-direction:column; gap:0.5rem;"></div>
      </div>
    </div>

    <div class="dashboard-grid-12" style="margin-top: 1.5rem;">
      <div class="chart-container-box col-span-12" style="box-sizing: border-box; padding: 1rem;">
        <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom:1rem;">
          <h3 class="chart-title" style="margin:0;">Monitoring</h3>
          <select id="monitoringFilterSelect" style="padding: 0.4rem 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; outline: none; font-weight: 500; font-family: inherit; background: white; cursor: pointer; color: #1e293b; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
             <option value="today" ${currentMonitoringFilter === 'today' ? 'selected' : ''}>Hari Ini</option>
             <option value="yesterday" ${currentMonitoringFilter === 'yesterday' ? 'selected' : ''}>Kemarin</option>
             ${['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((m, i) => `<option value="${i}" ${currentMonitoringFilter === String(i) ? 'selected' : ''}>Bulan: ${m}</option>`).join('')}
          </select>
        </div>
        ${generateMonitoringHtml()}
      </div>
    </div>
  `;

  if (barChartInstance) barChartInstance.destroy();
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
        filters.year = currentGlobalYear !== 'all' ? parseInt(currentGlobalYear, 10) : new Date().getFullYear();
      } else if (currentGlobalYear !== 'all') {
        filters.year = parseInt(currentGlobalYear, 10);
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

  const rankingContainer = document.getElementById('dashboard-ranking-container');
  if (rankingContainer) {
    const rankingDisplayData = allRankingData.map(group => ({
      ...group,
      unitName: group.unitName.replace(/CVV/g, 'CCV')
    }));
    renderRankingTable(rankingContainer, rankingDisplayData, handleRankingPeriodChange, currentRankingPeriod);
  }
  if (ccvRekapChartInstance) {
    ccvRekapChartInstance.destroy();
  }
  const ccvBagianData = processCcvByBagian(allCvvData);
  ccvRekapChartInstance = initCcvRekapChart(document.getElementById('ccvRekapChart'), ccvBagianData.labels, ccvBagianData.datasets);

  if (brosurRekapChartInstance) {
    brosurRekapChartInstance.destroy();
  }
  const brosurBidangData = processBrosurByBidang(allBrosurData);
  brosurRekapChartInstance = initCcvRekapChart(document.getElementById('brosurRekapChart'), brosurBidangData.labels, brosurBidangData.datasets);

  // Carousel Logic
  const updateMainCarousel = () => {
    const track = document.getElementById('mainChartCarouselTrack');
    if (track) track.style.transform = `translateX(-${currentMainSlideIndex * 33.3333}%)`;
    document.querySelectorAll('.main-chart-dot').forEach(d => {
      d.style.background = parseInt(d.dataset.index, 10) === currentMainSlideIndex ? '#3b82f6' : '#cbd5e1';
    });
  };

  document.querySelectorAll('.main-chart-dot').forEach(dot => {
    dot.addEventListener('click', (e) => {
      currentMainSlideIndex = parseInt(e.currentTarget.dataset.index, 10);
      updateMainCarousel();
    });
  });

  const btnLeft = document.getElementById('mainChartLeftArrow');
  const btnRight = document.getElementById('mainChartRightArrow');
  if (btnLeft) {
    btnLeft.addEventListener('click', () => {
      currentMainSlideIndex = Math.max(0, currentMainSlideIndex - 1);
      updateMainCarousel();
    });
  }
  if (btnRight) {
    btnRight.addEventListener('click', () => {
      currentMainSlideIndex = Math.min(2, currentMainSlideIndex + 1);
      updateMainCarousel();
    });
  }

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
      const type = e.currentTarget.dataset.type;

      // Toggle current filter (Multi-select)
      typeFilters[type] = !typeFilters[type];

      // Update visual styles for all buttons
      document.querySelectorAll('.type-filter-btn').forEach(b => {
        const t = b.dataset.type;
        if (typeFilters[t]) {
          if (t === 'PSA') { b.style.background = '#eff6ff'; b.style.color = '#1d4ed8'; b.style.borderColor = '#bfdbfe'; }
          if (t === 'CCV') { b.style.background = '#f0fdf4'; b.style.color = '#15803d'; b.style.borderColor = '#bbf7d0'; }
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

  document.getElementById('monitoringFilterSelect').addEventListener('change', (e) => {
    currentMonitoringFilter = e.target.value;
    renderContent(container, filterValue);
  });

  renderRecentActivities();
}

function renderRecentActivities() {
  const listContainer = document.getElementById('dashboardRecentActivities');
  if (!listContainer) return;

  let combined = [];
  allPsaData.forEach(row => combined.push({ type: 'PSA', timestamp: row.timestamp || '', format: 'ID', reporter: row.namaInspektor || 'Tidak Diketahui', unit: row.namaUnit || 'Tidak Diketahui' }));
  allCvvData.forEach(row => combined.push({
    type: 'CCV',
    timestamp: row.timestamp || '',
    format: 'US',
    reporter: row.namaObserver || 'Tidak Diketahui',
    unit: row.namaUnit || 'Tidak Diketahui',
    company: row.perusahaan || '',
    section: row.pekerjaanPadaBagian || ''
  }));
  allBrosurData.forEach(row => combined.push({ type: 'BROSUR', timestamp: row.tanggal || '', format: 'US', reporter: row.pelaksana || 'Tidak Diketahui', unit: row.pekerjaan || 'Tidak Diketahui' }));

  const isAnySelected = typeFilters.PSA || typeFilters.CCV || typeFilters.BROSUR;
  combined = combined.filter(row => isAnySelected ? typeFilters[row.type] : true);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  combined = combined.filter(row => {
    const d = parseD(row.timestamp, row.format);
    if (!d) return false;
    
    if (currentGlobalYear !== 'all' && d.getFullYear() !== parseInt(currentGlobalYear, 10)) {
      return false;
    }

    if (currentRecentFilter === 'all') return true;
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (currentRecentFilter === 'today') return diffDays === 0;
    if (currentRecentFilter === 'yesterday') return diffDays === 1;
    if (currentRecentFilter === 'week') return diffDays >= 0 && diffDays <= 7;
    if (currentRecentFilter === 'month') return diffDays >= 0 && diffDays <= 30;
    return true;
  });

  if (currentRecentSearch) {
    const q = currentRecentSearch.toLowerCase();
    combined = combined.filter(r => r.reporter.toLowerCase().includes(q) || r.unit.toLowerCase().includes(q));
  }

  combined.sort((a, b) => {
    const da = parseD(a.timestamp, a.format);
    const db = parseD(b.timestamp, b.format);
    const ta = da ? da.getTime() : 0;
    const tb = db ? db.getTime() : 0;
    return tb - ta;
  });

  listContainer.innerHTML = combined.map(act => {
    let iconSvg = '';
    let iconBg = '';
    let iconColor = '';
    let displayType = act.type === 'BROSUR' ? 'BSR' : act.type;

    if (act.type === 'PSA') {
      iconBg = '#eff6ff'; iconColor = '#3b82f6';
      iconSvg = '<span style="font-weight:800; font-size:0.75rem; letter-spacing:0.5px;">PSA</span>';
    } else if (act.type === 'CCV') {
      iconBg = '#f0fdf4'; iconColor = '#22c55e';
      iconSvg = '<span style="font-weight:800; font-size:0.75rem; letter-spacing:0.5px;">CCV</span>';
    } else { // BROSUR
      iconBg = '#fffbeb'; iconColor = '#f59e0b';
      iconSvg = '<span style="font-weight:800; font-size:0.75rem; letter-spacing:0.5px;">BSR</span>';
    }

    let detailsHtml = '';
    if (act.type === 'CCV' && (act.company || act.section)) {
      let parts = [];
      if (act.company) parts.push(act.company);
      if (act.section) parts.push(act.section);
      detailsHtml = `<div style="font-size: 0.7rem; color: #64748b; margin-top: 2px;">${escapeHtml(parts.join(' - '))}</div>`;
    }

    return `
    <div style="font-size: 0.8rem; padding: 0.75rem; border-bottom: 1px solid #f1f5f9; display: flex; gap: 0.75rem; align-items: flex-start;">
      <div style="background: ${iconBg}; color: ${iconColor}; width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;" title="${displayType}">
        ${iconSvg}
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(act.reporter)}</div>
        <div style="color: #475569; font-size: 0.75rem; margin-top: 2px;">${displayType} • ${escapeHtml(act.unit)}</div>
        ${detailsHtml}
        <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 4px;">${escapeHtml(act.timestamp)}</div>
      </div>
    </div>
    `;
  }).join('') || '<p style="font-size:0.8rem; color:#94a3b8; padding: 0.5rem;">Tidak ada aktivitas.</p>';
}

function filterDataByDate(data, filterType, format = 'ID') {
  if (currentGlobalYear !== 'all') {
    const y = parseInt(currentGlobalYear, 10);
    data = data.filter(row => {
      const rawDate = row.timestamp || row.tanggal;
      if (!rawDate) return false;
      const d = parseD(rawDate, format);
      return d && d.getFullYear() === y;
    });
  }

  if (!filterType || filterType === 'all') return data;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return data.filter(row => {
    const rawDate = row.timestamp || row.tanggal;
    if (!rawDate) return false;
    const d = parseD(rawDate, format);
    if (!d || isNaN(d.getTime())) return false;
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (filterType === 'today') return diffDays === 0;
    if (filterType === 'yesterday') return diffDays === 1;
    if (filterType === 'week') return diffDays >= 0 && diffDays <= 7;
    if (filterType === 'month') return diffDays >= 0 && diffDays <= 30;
    return true;
  });
}

function parseD(ts, format = 'ID') {
  if (!ts) return null;
  const parts = ts.split(/[-/ :T]/);
  if (parts.length < 3) return null;

  let year, month, day;

  if (parts[0].length === 4) {
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  } else if (parts[2].length === 4) {
    year = parseInt(parts[2], 10);
    let p0 = parseInt(parts[0], 10);
    let p1 = parseInt(parts[1], 10);
    
    if (p0 > 12) {
      day = p0;
      month = p1 - 1;
    } else if (p1 > 12) {
      month = p0 - 1;
      day = p1;
    } else {
      if (format === 'US') {
        month = p0 - 1;
        day = p1;
      } else {
        day = p0;
        month = p1 - 1;
      }
    }
  } else {
    return null;
  }

  const hour = parts[3] ? parseInt(parts[3], 10) : 0;
  const minute = parts[4] ? parseInt(parts[4], 10) : 0;
  const second = parts[5] ? parseInt(parts[5], 10) : 0;

  const d = new Date(year, month, day, hour, minute, second);
  return isNaN(d.getTime()) ? null : d;
}

function aggregateByHour(psa, cvv) {
  const labels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
  const psaCounts = new Array(24).fill(0);
  const cvvCounts = new Array(24).fill(0);
  psa.forEach(r => { const d = parseD(r.timestamp, 'ID'); if (d) psaCounts[d.getHours()]++; });
  cvv.forEach(r => { const d = parseD(r.timestamp, 'US'); if (d) cvvCounts[d.getHours()]++; });
  return { labels, psaCounts, cvvCounts };
}

function aggregateByDayOfWeek(psa, cvv) {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const labels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() - (6 - i) * 86400000);
    return days[d.getDay()];
  });
  const psaCounts = new Array(7).fill(0);
  const cvvCounts = new Array(7).fill(0);
  const process = (data, counts, format) => data.forEach(r => {
    const d = parseD(r.timestamp, format);
    if (d) {
      d.setHours(0, 0, 0, 0);
      const diff = Math.round((now - d) / 86400000);
      if (diff >= 0 && diff < 7) counts[6 - diff]++;
    }
  });
  process(psa, psaCounts, 'ID');
  process(cvv, cvvCounts, 'US');
  return { labels, psaCounts, cvvCounts };
}

function aggregateByDate(psa, cvv, daysCount) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const labels = Array.from({ length: daysCount }, (_, i) => {
    const d = new Date(now.getTime() - (daysCount - 1 - i) * 86400000);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const psaCounts = new Array(daysCount).fill(0);
  const cvvCounts = new Array(daysCount).fill(0);
  const process = (data, counts, format) => data.forEach(r => {
    const d = parseD(r.timestamp, format);
    if (d) {
      d.setHours(0, 0, 0, 0);
      const diff = Math.round((now - d) / 86400000);
      if (diff >= 0 && diff < daysCount) counts[daysCount - 1 - diff]++;
    }
  });
  process(psa, psaCounts, 'ID'); process(cvv, cvvCounts, 'US');
  return { labels, psaCounts, cvvCounts };
}

function aggregateByMonthYear(psa, cvv) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const countMap = {};
  const process = (data, isCvv, format) => {
    data.forEach(r => {
      const d = parseD(r.timestamp, format);
      if (d) {
        const label = `${months[d.getMonth()]} ${d.getFullYear()}`;
        if (!countMap[label]) countMap[label] = { time: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), psa: 0, cvv: 0 };
        if (isCvv) countMap[label].cvv++; else countMap[label].psa++;
      }
    });
  };
  process(psa, false, 'ID');
  process(cvv, true, 'US');
  const labels = Object.keys(countMap).sort((a, b) => countMap[a].time - countMap[b].time);
  return { labels, psaCounts: labels.map(l => countMap[l].psa), cvvCounts: labels.map(l => countMap[l].cvv) };
}

function initBarChart(canvas, labels, psaData, cvvData) {
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'PSA', data: psaData, backgroundColor: '#3b82f6', borderRadius: 4 },
        { label: 'CCV', data: cvvData, backgroundColor: '#22c55e', borderRadius: 4 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
  });
}

function processCcvByBagian(cvvData) {
  const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  
  const countMap = {};
  const bagianSet = new Set();
  let minMonthIndex = 12;
  let maxMonthIndex = -1;
  
  cvvData.forEach(row => {
    let bagian = (row.pekerjaanPadaBagian || 'TIDAK DIKETAHUI').trim().toUpperCase();
    const d = parseD(row.timestamp, 'US');
    if (d) {
      bagianSet.add(bagian);
      if (!countMap[bagian]) countMap[bagian] = new Array(12).fill(0);
      countMap[bagian][d.getMonth()]++;
      if (d.getMonth() > maxMonthIndex) maxMonthIndex = d.getMonth();
      if (d.getMonth() < minMonthIndex) minMonthIndex = d.getMonth();
    }
  });
  
  const finalLabels = [];
  const finalIndices = [];
  
  if (maxMonthIndex === -1) {
    // Fallback jika tidak ada data sama sekali, tampilkan semua 12 bulan
    finalLabels.push(...allMonths);
    for (let i = 0; i < 12; i++) finalIndices.push(i);
  } else {
    // Tampilkan dari bulan minimum hingga bulan maksimum yang ada datanya
    for (let i = minMonthIndex; i <= maxMonthIndex; i++) {
      finalLabels.push(allMonths[i]);
      finalIndices.push(i);
    }
  }
  
  const bagianArray = Array.from(bagianSet).sort();
  const colors = [
    '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', 
    '#14b8a6', '#f43f5e', '#6366f1', '#8b5cf6', '#d946ef', '#0ea5e9', '#84cc16'
  ];
  
  const datasets = bagianArray.map((bagian, index) => {
    const filteredData = finalIndices.map(idx => countMap[bagian][idx]);
    return {
      label: bagian,
      data: filteredData,
      backgroundColor: colors[index % colors.length],
      borderRadius: 2
    };
  });
  
  // Fallback jika dataset kosong (menghindari crash)
  if (datasets.length === 0) {
    datasets.push({
      label: 'Tidak ada data',
      data: new Array(finalLabels.length).fill(0),
      backgroundColor: '#cbd5e1'
    });
  }
  
  return { labels: finalLabels, datasets };
}

function processBrosurByBidang(brosurData) {
  const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  
  const categories = ['YANTEK', 'P2TL', 'MANBIL'];
  const countMap = {
    'YANTEK': new Array(12).fill(0),
    'P2TL': new Array(12).fill(0),
    'MANBIL': new Array(12).fill(0)
  };
  let minMonthIndex = 12;
  let maxMonthIndex = -1;
  
  brosurData.forEach(row => {
    // Mengecek baik di kolom pelaksana maupun pekerjaan untuk memastikan datanya tidak terlewat
    let raw = ((row.pelaksana || '') + ' ' + (row.pekerjaan || '')).trim().toUpperCase();
    let bidang = null;
    
    if (raw.includes('YANTEK')) bidang = 'YANTEK';
    else if (raw.includes('P2TL')) bidang = 'P2TL';
    else if (raw.includes('MANBIL') || raw.includes('BACA METER') || raw.includes('BILLING')) bidang = 'MANBIL';
    
    let d = parseD(row.tanggal, 'US');
    
    if (d && !isNaN(d.getTime()) && bidang) {
      countMap[bidang][d.getMonth()]++;
      if (d.getMonth() > maxMonthIndex) maxMonthIndex = d.getMonth();
      if (d.getMonth() < minMonthIndex) minMonthIndex = d.getMonth();
    }
  });
  
  const finalLabels = [];
  const finalIndices = [];
  
  if (maxMonthIndex === -1) {
    // Jika tidak ada data yang cocok sama sekali, fallback tampilkan semua bulan 
    finalLabels.push(...allMonths);
    for (let i = 0; i < 12; i++) finalIndices.push(i);
  } else {
    // Tampilkan rentang berurut dari bulan awal hingga bulan akhir
    for (let i = minMonthIndex; i <= maxMonthIndex; i++) {
      finalLabels.push(allMonths[i]);
      finalIndices.push(i);
    }
  }
  
  const colors = ['#3b82f6', '#10b981', '#f59e0b']; // Biru, Hijau, Oranye
  
  const datasets = categories.map((b, i) => {
    const filteredData = finalIndices.map(idx => countMap[b][idx]);
    return {
      label: b,
      data: filteredData,
      backgroundColor: colors[i % colors.length],
      borderRadius: 2
    };
  });
  
  return { labels: finalLabels, datasets };
}

function initCcvRekapChart(canvas, labels, datasets) {
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: false },
        y: { stacked: false, beginAtZero: true, ticks: { precision: 0 } }
      },
      plugins: {
        legend: {
          position: 'right',
          labels: { font: { size: 10 }, boxWidth: 12 },
          onHover: function (e, legendItem, legend) {
            const index = legendItem.datasetIndex;
            const ds = legend.chart.data.datasets[index];
            const total = ds.data.reduce((a, b) => a + b, 0);
            if (!ds._originalLabel) ds._originalLabel = ds.label;
            ds.label = `${ds._originalLabel} (Total: ${total})`;
            legend.chart.update();
          },
          onLeave: function (e, legendItem, legend) {
            const index = legendItem.datasetIndex;
            const ds = legend.chart.data.datasets[index];
            if (ds._originalLabel) {
              ds.label = ds._originalLabel;
              legend.chart.update();
            }
          }
        }
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
  const targetFilter = currentMonitoringFilter;
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const isMatch = (timestamp, unit, format) => {
    const d = parseD(timestamp, format);
    if (!d || !((unit || '').toUpperCase().includes(targetUnit))) return false;
    
    if (currentGlobalYear !== 'all' && d.getFullYear() !== parseInt(currentGlobalYear, 10)) return false;
    
    if (targetFilter === 'today') {
      d.setHours(0, 0, 0, 0);
      return (now.getTime() - d.getTime()) === 0;
    } else if (targetFilter === 'yesterday') {
      d.setHours(0, 0, 0, 0);
      return Math.floor((now.getTime() - d.getTime()) / 86400000) === 1;
    } else if (targetFilter === 'this_month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    } else {
      return d.getMonth() === parseInt(targetFilter, 10);
    }
  };

  const psaFiltered = allPsaData.filter(r => isMatch(r.timestamp, r.namaUnit, 'ID'));
  const ccvFiltered = allCvvData.filter(r => isMatch(r.timestamp, r.namaUnit, 'US'));
  const brosurFiltered = allBrosurData.filter(r => { 
    const d = parseD(r.tanggal, 'US');
    if (!d) return false;
    
    if (currentGlobalYear !== 'all' && d.getFullYear() !== parseInt(currentGlobalYear, 10)) return false;
    
    if (targetFilter === 'today') {
      d.setHours(0, 0, 0, 0);
      return (now.getTime() - d.getTime()) === 0;
    } else if (targetFilter === 'yesterday') {
      d.setHours(0, 0, 0, 0);
      return Math.floor((now.getTime() - d.getTime()) / 86400000) === 1;
    } else if (targetFilter === 'this_month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    } else {
      return d.getMonth() === parseInt(targetFilter, 10);
    }
  });

  const manajemenRoles = ['MANAGER', 'ASMAN JAR', 'ASMAN KONS', 'ASMAN TEL', 'ASMAN AGA', 'ASMAN SAR', 'ASMAN KU'];
  const tlRoles = ['TL OP', 'TL HAR', 'TL DALKON', 'TL BUNGTUS', 'TL LOG', 'TL P2TL', 'TL BACA METER', 'TL DALAPP', 'TL ME', 'TL K4L'];
  const flyerRoles = ['YANTEK', 'MANBILL', 'P2TL'];

  const psaCounts = {};
  const unmappedPsaRoles = {};
  manajemenRoles.concat(tlRoles).forEach(r => psaCounts[r] = 0);
  psaFiltered.forEach(r => {
      let j = (r.jabatanInspektor || '').toUpperCase();
      
      // Normalisasi sebutan jabatan agar cocok dengan kode singkatan
      j = j.replace('TEAM LEADER', 'TL');
      j = j.replace('ASISTEN MANAJER', 'ASMAN').replace('ASISTEN MANAGER', 'ASMAN');
      j = j.replace('OPERASI', 'OP');
      j = j.replace('PEMELIHARAAN', 'HAR');
      j = j.replace('PENGENDALIAN KONSTRUKSI', 'DALKON');
      j = j.replace('SAMBUNG PUTUS', 'BUNGTUS').replace('PENYAMBUNGAN DAN PEMUTUSAN', 'BUNGTUS');
      j = j.replace('LOGISTIK', 'LOG');
      j = j.replace('PENGENDALIAN APP', 'DALAPP');
      j = j.replace('K3L', 'K4L');
      j = j.replace('JARINGAN', 'JAR').replace('KONSTRUKSI', 'KONS');
      
      // Normalisasi Manajemen
      j = j.replace('TRANSAKSI ENERGI LISTRIK', 'TEL').replace('TRANSAKSI ENERGI', 'TEL');
      j = j.replace('NIAGA', 'AGA');
      j = j.replace('PEMASARAN', 'SAR');
      j = j.replace('KEUANGAN DAN UMUM', 'KU').replace('KEUANGAN & UMUM', 'KU');
      j = j.replace('MANAJER', 'MANAGER').replace('MGR', 'MANAGER');

      let matched = false;
      manajemenRoles.concat(tlRoles).forEach(role => { 
        if(j.includes(role)) {
           psaCounts[role]++; 
           matched = true;
        } 
      });
      
      if (!matched && r.jabatanInspektor) {
         unmappedPsaRoles[r.jabatanInspektor] = (unmappedPsaRoles[r.jabatanInspektor] || 0) + 1;
      }
  });

  const unmappedPsaList = Object.entries(unmappedPsaRoles).sort((a, b) => b[1] - a[1]);

  const brosurCounts = {};
  flyerRoles.forEach(r => brosurCounts[r] = 0);
  brosurFiltered.forEach(r => {
      let text = ((r.pekerjaan || '') + ' ' + (r.pelaksana || '')).toUpperCase();
      flyerRoles.forEach(role => { 
        if (role === 'MANBILL' && (text.includes('MANBIL') || text.includes('BACA METER') || text.includes('BILLING'))) {
          brosurCounts[role]++;
        } else if (role !== 'MANBILL' && text.includes(role)) {
          brosurCounts[role]++; 
        }
      });
  });

  const normalizeCompany = (name) => {
    if (!name) return 'TIDAK DIKETAHUI';
    let n = name.toUpperCase().trim();
    n = n.replace(/^(PT|CV|UD|FIRMA)\s*\.?\s*/g, '');
    n = n.replace(/\(PERSERO\)/g, '').replace(/TBK\.?/g, '');
    n = n.replace(/[^\w\s]/g, ''); // remove punctuation
    n = n.replace(/\s+/g, ' ').trim();
    if (n.includes('PLN') && !n.includes('HALEYORA') && !n.includes('ICON')) return 'PLN';
    if (n.includes('HALEYORA') || n === 'HPI') return 'HALEYORA POWERINDO';
    return n || 'TIDAK DIKETAHUI';
  };

  const ccvCounts = {};
  ccvFiltered.forEach(r => {
    const comp = normalizeCompany(r.perusahaan);
    ccvCounts[comp] = (ccvCounts[comp] || 0) + 1;
  });

  const sortedCcv = Object.entries(ccvCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  return `
    <div style="font-family: inherit; color: #334155;">
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem;">
          
          <!-- Manajemen Card -->
          <div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 1.25rem; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
             <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                <span style="display:inline-block; width:8px; height:8px; background:#3b82f6; border-radius:50%;"></span>
                <h4 style="font-weight: 600; font-size: 0.95rem; margin: 0; color: #0f172a;">Manajemen</h4>
             </div>
             <ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem;">
                ${manajemenRoles.map(r => `
                  <li style="display:flex; justify-content:space-between; align-items:center; font-size: 0.8rem; padding: 0.4rem 0; border-bottom: 1px solid #f8fafc;">
                    <span style="color:#475569;">${r}</span>
                    <strong style="color: ${psaCounts[r] > 0 ? '#2563eb' : '#94a3b8'}; background: ${psaCounts[r] > 0 ? '#eff6ff' : 'transparent'}; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 600;">
                        ${psaCounts[r]}
                    </strong>
                  </li>`).join('')}
             </ul>
          </div>

          <!-- Team Leader Card -->
          <div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 1.25rem; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
             <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                <span style="display:inline-block; width:8px; height:8px; background:#8b5cf6; border-radius:50%;"></span>
                <h4 style="font-weight: 600; font-size: 0.95rem; margin: 0; color: #0f172a;">Team Leader</h4>
             </div>
             <ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem;">
                ${tlRoles.map(r => `
                  <li style="display:flex; justify-content:space-between; align-items:center; font-size: 0.8rem; padding: 0.4rem 0; border-bottom: 1px solid #f8fafc;">
                    <span style="color:#475569;">${r}</span>
                    <strong style="color: ${psaCounts[r] > 0 ? '#7c3aed' : '#94a3b8'}; background: ${psaCounts[r] > 0 ? '#f5f3ff' : 'transparent'}; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 600;">
                        ${psaCounts[r]}
                    </strong>
                  </li>`).join('')}
             </ul>
          </div>

          <!-- Flyer K3 Card -->
          <div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 1.25rem; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
             <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                <span style="display:inline-block; width:8px; height:8px; background:#f59e0b; border-radius:50%;"></span>
                <h4 style="font-weight: 600; font-size: 0.95rem; margin: 0; color: #0f172a;">Flyer K3</h4>
             </div>
             <ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem;">
                ${flyerRoles.map(r => `
                  <li style="display:flex; justify-content:space-between; align-items:center; font-size: 0.8rem; padding: 0.4rem 0; border-bottom: 1px solid #f8fafc;">
                    <span style="color:#475569;">${r}</span>
                    <strong style="color: ${brosurCounts[r] > 0 ? '#d97706' : '#94a3b8'}; background: ${brosurCounts[r] > 0 ? '#fffbeb' : 'transparent'}; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 600;">
                        ${brosurCounts[r]}
                    </strong>
                  </li>`).join('')}
             </ul>
          </div>

          <!-- CCV Perusahaan Card -->
          <div style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 1.25rem; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
             <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                <span style="display:inline-block; width:8px; height:8px; background:#10b981; border-radius:50%;"></span>
                <h4 style="font-weight: 600; font-size: 0.95rem; margin: 0; color: #0f172a;">CCV (Mitra)</h4>
             </div>
             <ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem; max-height: 250px; overflow-y: auto; padding-right: 0.5rem;">
                ${sortedCcv.length === 0 ? '<li style="color:#94a3b8; font-size:0.8rem;">Tidak ada data CCV</li>' : sortedCcv.map(([comp, count]) => `
                  <li style="display:flex; justify-content:space-between; align-items:center; font-size: 0.8rem; padding: 0.4rem 0; border-bottom: 1px solid #f8fafc;">
                    <span style="color:#475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px;" title="${comp}">${comp}</span>
                    <strong style="color: #059669; background: #d1fae5; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 600;">
                        ${count}
                    </strong>
                  </li>`).join('')}
             </ul>
          </div>

          <!-- Unmapped PSA Card -->
          ${unmappedPsaList.length > 0 ? `
          <div style="background: white; border-radius: 12px; border: 1px solid #fee2e2; padding: 1.25rem; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
             <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                <span style="display:inline-block; width:8px; height:8px; background:#ef4444; border-radius:50%;"></span>
                <h4 style="font-weight: 600; font-size: 0.95rem; margin: 0; color: #7f1d1d;">Jabatan Lain (Unmapped)</h4>
             </div>
             <ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem; max-height: 250px; overflow-y: auto; padding-right: 0.5rem;">
                ${unmappedPsaList.map(([role, count]) => `
                  <li style="display:flex; justify-content:space-between; align-items:center; font-size: 0.8rem; padding: 0.4rem 0; border-bottom: 1px solid #fef2f2;">
                    <span style="color:#991b1b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px;" title="${role}">${role}</span>
                    <strong style="color: #b91c1c; background: #fee2e2; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 600;">
                        ${count}
                    </strong>
                  </li>`).join('')}
             </ul>
          </div>
          ` : ''}

      </div>
    </div>
  `;
}
