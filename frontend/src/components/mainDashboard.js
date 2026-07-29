import Chart from 'chart.js/auto';
import { fetchPsa, fetchCvv } from '../api.js';

export async function renderMainDashboard(container) {
  container.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Memuat grafik ringkasan...</p>
    </div>
  `;

  try {
    // Jalankan kedua fetch secara paralel agar lebih cepat
    const [psaData, cvvData] = await Promise.all([
      fetchPsa(),
      fetchCvv()
    ]);

    // Agregasi Data
    const { unitLabels, psaUnitCounts, cvvUnitCounts } = aggregateByUnit(psaData, cvvData);
    const { monthLabels, psaMonthCounts, cvvMonthCounts } = aggregateByMonth(psaData, cvvData);
    const { topReporterLabels, topReporterCounts } = aggregateTopReporters(psaData, cvvData);
    const recentActivities = getRecentActivities(psaData, cvvData, 5);

    // Render Canvas UI
    container.innerHTML = `
      <div class="dashboard-cards-summary">
        <div class="summary-card">
          <div class="summary-value text-blue-500">${psaData.length}</div>
          <div class="summary-label">Total Laporan PSA</div>
        </div>
        <div class="summary-card">
          <div class="summary-value text-green-500">${cvvData.length}</div>
          <div class="summary-label">Total Laporan CVV</div>
        </div>
      </div>
      <div class="charts-grid">
        <div class="chart-container-box">
          <h3 class="chart-title">Perbandingan Laporan per Unit</h3>
          <div class="canvas-wrapper">
            <canvas id="barChart"></canvas>
          </div>
        </div>
        <div class="chart-container-box">
          <h3 class="chart-title">Tren Laporan per Bulan</h3>
          <div class="canvas-wrapper">
            <canvas id="lineChart"></canvas>
          </div>
        </div>
      </div>
      
      <div class="charts-grid" style="margin-top: 1.5rem;">
        <div class="chart-container-box" style="flex: 1;">
          <h3 class="chart-title">Top 5 Pelapor Teraktif</h3>
          <div class="canvas-wrapper">
            <canvas id="pieChart"></canvas>
          </div>
        </div>
        <div class="chart-container-box" style="flex: 2;">
          <h3 class="chart-title">Aktivitas Terbaru</h3>
          <div class="recent-list">
            ${recentActivities.map(act => `
              <div class="recent-item">
                <div class="recent-icon ${act.type === 'PSA' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}">
                  ${act.type}
                </div>
                <div class="recent-content">
                  <div class="recent-title"><strong>${escapeHtml(act.reporter)}</strong> melaporkan temuan di <strong>${escapeHtml(act.unit)}</strong></div>
                  <div class="recent-time">${escapeHtml(act.timestamp)}</div>
                </div>
              </div>
            `).join('')}
            ${recentActivities.length === 0 ? '<p class="text-sm text-slate-500">Belum ada aktivitas.</p>' : ''}
          </div>
        </div>
      </div>
    `;

    // Initialize Charts
    initBarChart(document.getElementById('barChart'), unitLabels, psaUnitCounts, cvvUnitCounts);
    initLineChart(document.getElementById('lineChart'), monthLabels, psaMonthCounts, cvvMonthCounts);
    initPieChart(document.getElementById('pieChart'), topReporterLabels, topReporterCounts);

  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">⚠️</div>
        <p>Gagal memuat grafik dashboard.</p>
        <p style="font-size: 12px; color: var(--color-text-muted); margin-top: 8px;">
          ${escapeHtml(err.message)}
        </p>
      </div>
    `;
  }
}

function aggregateByUnit(psaData, cvvData) {
  const counts = {};

  const processRow = (row, type) => {
    const unit = (row.namaUnit || 'Tidak Diketahui').trim();
    if (!counts[unit]) counts[unit] = { psa: 0, cvv: 0 };
    counts[unit][type]++;
  };

  psaData.forEach(row => processRow(row, 'psa'));
  cvvData.forEach(row => processRow(row, 'cvv'));

  const unitLabels = Object.keys(counts).sort();
  const psaUnitCounts = unitLabels.map(u => counts[u].psa);
  const cvvUnitCounts = unitLabels.map(u => counts[u].cvv);

  return { unitLabels, psaUnitCounts, cvvUnitCounts };
}

function aggregateByMonth(psaData, cvvData) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const counts = Array.from({ length: 12 }, () => ({ psa: 0, cvv: 0 }));

  const processRow = (row, type) => {
    const ts = row.timestamp;
    if (!ts) return;
    
    // Parse tanggal (asumsi format bisa YYYY-MM-DD atau DD/MM/YYYY)
    let datePart = ts.split(' ')[0];
    let monthIdx = -1;
    
    if (datePart.includes('-')) {
      const parts = datePart.split('-');
      // Jika bagian pertama 4 digit, itu YYYY-MM-DD
      monthIdx = parts[0].length === 4 ? parseInt(parts[1], 10) - 1 : parseInt(parts[1], 10) - 1;
    } else if (datePart.includes('/')) {
      const parts = datePart.split('/');
      // Biasanya DD/MM/YYYY
      monthIdx = parseInt(parts[1], 10) - 1;
    }

    if (monthIdx >= 0 && monthIdx < 12) {
      counts[monthIdx][type]++;
    }
  };

  psaData.forEach(row => processRow(row, 'psa'));
  cvvData.forEach(row => processRow(row, 'cvv'));

  const psaMonthCounts = counts.map(c => c.psa);
  const cvvMonthCounts = counts.map(c => c.cvv);

  return { monthLabels: months, psaMonthCounts, cvvMonthCounts };
}

function aggregateTopReporters(psaData, cvvData) {
  const counts = {};

  psaData.forEach(row => {
    const name = (row.namaInspektor || 'Tidak Diketahui').trim();
    counts[name] = (counts[name] || 0) + 1;
  });

  cvvData.forEach(row => {
    const name = (row.namaObserver || 'Tidak Diketahui').trim();
    counts[name] = (counts[name] || 0) + 1;
  });

  // Urutkan berdasarkan jumlah terbanyak
  const sortedNames = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const topNames = sortedNames.slice(0, 5); // Ambil Top 5

  const topReporterLabels = topNames;
  const topReporterCounts = topNames.map(name => counts[name]);

  return { topReporterLabels, topReporterCounts };
}

function getRecentActivities(psaData, cvvData, limit = 5) {
  const combined = [];

  psaData.forEach(row => {
    combined.push({
      type: 'PSA',
      timestamp: row.timestamp || '',
      reporter: row.namaInspektor || 'Tidak Diketahui',
      unit: row.namaUnit || 'Tidak Diketahui'
    });
  });

  cvvData.forEach(row => {
    combined.push({
      type: 'CVV',
      timestamp: row.timestamp || '',
      reporter: row.namaObserver || 'Tidak Diketahui',
      unit: row.namaUnit || 'Tidak Diketahui'
    });
  });

  // Sort descending by timestamp string (assuming format allows simple string sort, e.g., YYYY-MM-DD or DD/MM/YYYY with padded zeroes)
  // Note: if format is DD/MM/YYYY it might sort wrong natively, but for "recent" a simple reverse or parse is needed.
  // For safety, let's reverse them first (assuming newest is usually at the bottom of the sheet).
  combined.reverse();
  
  return combined.slice(0, limit);
}

function initBarChart(canvas, labels, psaData, cvvData) {
  new Chart(canvas, {
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
          label: 'CVV',
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

function initLineChart(canvas, labels, psaData, cvvData) {
  new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'PSA',
          data: psaData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          tension: 0.3,
          fill: true
        },
        {
          label: 'CVV',
          data: cvvData,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 2,
          tension: 0.3,
          fill: true
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

function initPieChart(canvas, labels, data) {
  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)', // blue
          'rgba(34, 197, 94, 0.8)',  // green
          'rgba(245, 158, 11, 0.8)', // yellow
          'rgba(239, 68, 68, 0.8)',  // red
          'rgba(168, 85, 247, 0.8)'  // purple
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' }
      }
    }
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
