/**
 * Render data table (untuk PSA, CVV, Brosur) dengan fitur pagination
 * @param {HTMLElement} container
 * @param {string} title
 * @param {Array<{key: string, label: string}>} columns
 * @param {Array<object>} data
 */
export function renderDataTable(container, title, columns, data) {
  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="table-container">
        <div class="table-header">
          <h2>${title}</h2>
        </div>
        <div class="empty-state">
          <div class="icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-slate-500">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <p>Tidak ada data ditemukan</p>
        </div>
      </div>
    `;
    return;
  }

  // State untuk pagination
  let currentPage = 1;
  let itemsPerPage = 10;
  const totalItems = data.length;

  function render() {
    const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = itemsPerPage === 'all' ? 0 : (currentPage - 1) * itemsPerPage;
    const endIdx = itemsPerPage === 'all' ? totalItems : Math.min(startIdx + itemsPerPage, totalItems);
    const paginatedData = data.slice(startIdx, endIdx);

    const rows = paginatedData.map(row => `
      <tr>
        ${columns.map(col => `
          <td>${escapeHtml(row[col.key] || '-')}</td>
        `).join('')}
      </tr>
    `).join('');

    const pageButtons = [];
    if (totalPages > 1) {
      for (let i = 1; i <= totalPages; i++) {
        // Tampilkan 2 halaman sebelum dan sesudah current page, ditambah hal pertama dan terakhir
        if (
          i === 1 || 
          i === totalPages || 
          (i >= currentPage - 1 && i <= currentPage + 1)
        ) {
          pageButtons.push(`
            <button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
              ${i}
            </button>
          `);
        } else if (
          i === currentPage - 2 || 
          i === currentPage + 2
        ) {
          pageButtons.push(`<span class="page-dots">...</span>`);
        }
      }
    }

    container.innerHTML = `
      <div class="table-container">
        <div class="table-header">
          <h2>
            ${title}
            <span class="count">${totalItems} data</span>
          </h2>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                ${columns.map(col => `<th>${col.label}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
        
        <div class="pagination-container">
          <div class="pagination-info">
            <span>Menampilkan</span>
            <select id="limit-select" class="limit-select">
              <option value="10" ${itemsPerPage === 10 ? 'selected' : ''}>10</option>
              <option value="20" ${itemsPerPage === 20 ? 'selected' : ''}>20</option>
              <option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>50</option>
              <option value="all" ${itemsPerPage === 'all' ? 'selected' : ''}>Semua</option>
            </select>
            <span>data dari total <strong>${totalItems}</strong></span>
          </div>
          
          ${totalPages > 1 ? `
          <div class="pagination-controls">
            <button class="page-btn nav-btn" data-action="prev" ${currentPage === 1 ? 'disabled' : ''}>
              &laquo; Prev
            </button>
            ${pageButtons.join('')}
            <button class="page-btn nav-btn" data-action="next" ${currentPage === totalPages ? 'disabled' : ''}>
              Next &raquo;
            </button>
          </div>
          ` : ''}
        </div>
      </div>
    `;

    // Bind events
    const limitSelect = container.querySelector('#limit-select');
    if (limitSelect) {
      limitSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        itemsPerPage = val === 'all' ? 'all' : parseInt(val, 10);
        currentPage = 1;
        render();
      });
    }

    const pageBtns = container.querySelectorAll('.page-btn');
    pageBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (btn.hasAttribute('disabled')) return;
        
        const action = btn.dataset.action;
        const page = btn.dataset.page;
        
        if (action === 'prev') {
          currentPage--;
        } else if (action === 'next') {
          currentPage++;
        } else if (page) {
          currentPage = parseInt(page, 10);
        }
        
        render();
      });
    });
  }

  // Initial render
  render();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
