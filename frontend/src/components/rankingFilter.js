export function renderRankingFilter(container, currentFilters, onApply) {
  let selectedValue = 'all';
  if (currentFilters.month) {
    const now = new Date();
    const isLastMonth = currentFilters.year === (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear())
      && currentFilters.month === (now.getMonth() === 0 ? 12 : now.getMonth());
    selectedValue = isLastMonth ? 'last_month' : 'this_month';
  } else if (currentFilters.startDate) {
    selectedValue = 'this_week';
  }

  container.innerHTML = `
    <div class="filter-panel" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
      <div class="filter-group search-group" style="flex: 1; max-width: 300px;">
        <input 
          type="text" 
          id="ranking-search" 
          placeholder="Cari nama pegawai..." 
          value="${currentFilters.search || ''}"
          style="padding: 0.5rem; width: 100%; border: 1px solid var(--color-border); border-radius: 6px; outline: none; font-family: inherit;"
        />
      </div>

      <div class="filter-group">
        <label for="ranking-period" style="margin-right: 0.5rem;">Pilih Periode:</label>
        <select id="ranking-period" style="padding:0.4rem; border:1px solid var(--color-border); border-radius:6px; outline:none; font-family:inherit;">
          <option value="all" ${selectedValue === 'all' ? 'selected' : ''}>Semua Waktu</option>
          <option value="this_month" ${selectedValue === 'this_month' ? 'selected' : ''}>Bulan Ini</option>
          <option value="last_month" ${selectedValue === 'last_month' ? 'selected' : ''}>Bulan Lalu</option>
          <option value="this_week" ${selectedValue === 'this_week' ? 'selected' : ''}>Minggu Ini</option>
        </select>
      </div>
    </div>
  `;

  const getFilters = () => {
    const val = document.getElementById('ranking-period').value;
    const search = document.getElementById('ranking-search').value.trim();

    let filters = { search };

    if (val === 'this_month') {
      const now = new Date();
      filters.month = now.getMonth() + 1;
      filters.year = now.getFullYear();
    } else if (val === 'last_month') {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      filters.month = lastMonth.getMonth() + 1;
      filters.year = lastMonth.getFullYear();
    } else if (val === 'this_week') {
      const now = new Date();
      const day = now.getDay();
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);

      const startOfWeek = new Date(now);
      startOfWeek.setDate(diffToMonday);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      filters.startDate = startOfWeek.toISOString().split('T')[0];
      filters.endDate = endOfWeek.toISOString().split('T')[0];
    }

    return filters;
  };

  document.getElementById('ranking-period').addEventListener('change', () => {
    onApply(getFilters());
  });

  let debounceTimer;
  document.getElementById('ranking-search').addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      onApply(getFilters());
    }, 300);
  });
}
