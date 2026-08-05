/**
 * Render date filter panel
 * @param {HTMLElement} container
 * @param {object} currentFilters - { startDate, endDate, month }
 * @param {Function} onApply - callback with new filters
 */
export function renderDateFilter(container, currentFilters, onApply) {
  const months = [
    { value: '', label: 'Semua Bulan' },
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ];

  container.innerHTML = `
    <div class="filter-panel">
      <div class="filter-group">
        <label for="filter-start">Tanggal Mulai</label>
        <input
          type="date"
          id="filter-start"
          value="${currentFilters.startDate || ''}"
        />
      </div>

      <div class="filter-group">
        <label for="filter-end">Tanggal Akhir</label>
        <input
          type="date"
          id="filter-end"
          value="${currentFilters.endDate || ''}"
        />
      </div>

      <div class="filter-group">
        <label for="filter-month">Bulan</label>
        <select id="filter-month">
          ${months.map(m => `
            <option value="${m.value}" ${String(currentFilters.month || '') === m.value ? 'selected' : ''}>
              ${m.label}
            </option>
          `).join('')}
        </select>
      </div>

      <button class="btn-reset" id="btn-reset-filter">
        Atur Ulang
      </button>
      
      <div id="dt-toolbar-container" style="display:flex; gap:0.5rem; position:relative; margin-left:auto; align-items:center;"></div>
    </div>
  `;

  // Apply filter on change
  const applyFilter = () => {
    const startDate = document.getElementById('filter-start').value || null;
    const endDate = document.getElementById('filter-end').value || null;
    const monthVal = document.getElementById('filter-month').value;
    const month = monthVal ? parseInt(monthVal) : null;

    onApply({ startDate, endDate, month });
  };

  document.getElementById('filter-start').addEventListener('change', applyFilter);
  document.getElementById('filter-end').addEventListener('change', applyFilter);
  document.getElementById('filter-month').addEventListener('change', applyFilter);

  // Reset filter
  document.getElementById('btn-reset-filter').addEventListener('click', () => {
    onApply({});
  });
}
