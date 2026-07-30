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

  // State untuk pagination & sort & filter
  let currentPage = 1;
  let itemsPerPage = 10;
  let sortKey = null;
  let sortOrder = 'asc';
  
  let globalSearch = '';
  let columnFilters = {};
  let isFilterPopupOpen = false;
  let focusSearch = false;
  
  const totalItemsInitial = data.length;

  function render() {
    // 1. Apply Filters
    let displayData = data.filter(row => {
      // Global search
      if (globalSearch) {
        const q = globalSearch.toLowerCase();
        const match = columns.some(col => (row[col.key] || '').toString().toLowerCase().includes(q));
        if (!match) return false;
      }
      
      // Column filters
      for (const [key, selectedVals] of Object.entries(columnFilters)) {
         if (selectedVals && selectedVals.length > 0) {
             const rowVal = (row[key] || '').toString();
             if (!selectedVals.includes(rowVal)) return false;
         }
      }
      
      return true;
    });

    const totalItems = displayData.length;

    // 2. Sort Data
    if (sortKey) {
        displayData.sort((a, b) => {
            let valA = (a[sortKey] || '').toString();
            let valB = (b[sortKey] || '').toString();
            
            if (sortKey.toLowerCase().includes('timestamp') || sortKey.toLowerCase().includes('tanggal')) {
                const parseDate = (ts) => {
                    if (!ts) return 0;
                    const datePart = ts.split(' ')[0];
                    if (datePart.includes('/')) {
                        const p = datePart.split('/');
                        if (p.length===3) return new Date(p[2], p[1]-1, p[0]).getTime();
                    } else if (datePart.includes('-')) {
                        const p = datePart.split('-');
                        if (p.length===3) {
                            if (p[0].length === 4) return new Date(p[0], p[1]-1, p[2]).getTime();
                            return new Date(p[2], p[1]-1, p[0]).getTime();
                        }
                    }
                    return 0;
                };
                valA = parseDate(valA);
                valB = parseDate(valB);
                return sortOrder === 'asc' ? valA - valB : valB - valA;
            } else {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
                if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            }
        });
    }

    const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = itemsPerPage === 'all' ? 0 : (currentPage - 1) * itemsPerPage;
    const endIdx = itemsPerPage === 'all' ? totalItems : Math.min(startIdx + itemsPerPage, totalItems);
    const paginatedData = displayData.slice(startIdx, endIdx);

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
                ${columns.map(col => `
                  <th class="sortable-header" data-key="${col.key}" style="cursor: pointer; user-select: none; transition: background 0.2s;" onmouseover="this.style.backgroundColor='rgba(0,0,0,0.05)'" onmouseout="this.style.backgroundColor='transparent'">
                    <div style="display: flex; align-items: center; gap: 4px;">
                      ${col.label}
                      <span style="font-size: 0.8rem; color: ${sortKey === col.key ? 'var(--color-primary)' : 'rgba(0,0,0,0.2)'};">
                        ${sortKey === col.key ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </div>
                  </th>
                `).join('')}
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

    // Limit event
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

    const headers = container.querySelectorAll('.sortable-header');
    headers.forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.key;
        if (sortKey === key) {
          sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          sortKey = key;
          sortOrder = 'asc';
        }
        currentPage = 1; // reset to page 1 on sort
        render();
      });
    });
    
    // Render the toolbar externally
    renderToolbar();
  }

  function renderToolbar() {
    const toolbarContainer = document.getElementById('dt-toolbar-container');
    if (!toolbarContainer) return;

    toolbarContainer.innerHTML = `
       <input type="text" id="dt-search" value="${escapeHtml(globalSearch)}" placeholder="Cari data..." style="flex:1; padding: 0.4rem 0.75rem; border: 1px solid var(--color-border); border-radius: 6px; outline:none; font-family:inherit; min-width:150px; box-sizing: border-box;" />
       <button id="dt-filter-btn" style="padding: 0.4rem 0.75rem; border: 1px solid var(--color-border); border-radius: 6px; background: ${Object.values(columnFilters).some(v => v && v.length > 0) ? 'var(--color-primary)' : 'white'}; color: ${Object.values(columnFilters).some(v => v && v.length > 0) ? 'white' : 'var(--color-text)'}; cursor:pointer; display:flex; align-items:center; gap:4px; font-family:inherit;">
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
         Filter
       </button>
       
       ${isFilterPopupOpen ? `
         <div class="filter-popup" style="position:absolute; top:115%; right:0; background:white; border:1px solid var(--color-border); border-radius:8px; padding:1rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); z-index:100; min-width:250px; text-align:left;">
            <h4 style="margin-top:0; margin-bottom:1rem; font-size:0.9rem; color:var(--color-text);">Filter Lanjutan</h4>
            
            <div style="max-height:300px; overflow-y:auto; padding-right:0.5rem;">
                ${columns.map(col => {
                    if (col.key.toLowerCase() === 'timestamp' || col.key.toLowerCase() === 'tanggal') return '';
                    
                    const uniqueVals = [...new Set(data.map(r => (r[col.key] || '').toString().trim()).filter(Boolean))].sort();
                    if (uniqueVals.length === 0) return '';
                    
                    return `
                      <div style="margin-bottom:0.75rem;">
                         <label style="display:block; font-size:0.75rem; color:var(--color-text-muted); margin-bottom:0.25rem; font-weight: 500;">${col.label}</label>
                         <div style="max-height: 140px; overflow-y: auto; border: 1px solid var(--color-border); border-radius: 4px; padding: 0.4rem; background: white;">
                           ${uniqueVals.map(val => `
                             <label style="display: flex; align-items: flex-start; gap: 0.4rem; font-size: 0.8rem; cursor: pointer; padding: 0.25rem 0; border-bottom: 1px solid #f9f9f9;">
                               <input type="checkbox" class="dt-col-filter-cb" data-key="${col.key}" value="${escapeHtml(val)}" ${(columnFilters[col.key] || []).includes(val) ? 'checked' : ''} style="margin-top: 2px; cursor: pointer;" />
                               <span style="word-break: break-word;">${escapeHtml(val)}</span>
                             </label>
                           `).join('')}
                         </div>
                      </div>
                    `;
                }).join('')}
            </div>
            
            <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1rem;">
               <button id="dt-filter-reset" style="padding:0.4rem 0.75rem; border:1px solid var(--color-border); background:white; color:var(--color-text); border-radius:4px; cursor:pointer; font-size:0.8rem; font-family:inherit;">Reset</button>
               <button id="dt-filter-apply" style="padding:0.4rem 0.75rem; border:none; background:var(--color-primary); color:white; border-radius:4px; cursor:pointer; font-size:0.8rem; font-family:inherit;">Terapkan</button>
            </div>
         </div>
       ` : ''}
    `;

    // Bind toolbar events
    const searchInput = toolbarContainer.querySelector('#dt-search');
    if (focusSearch && searchInput) {
        searchInput.focus();
        searchInput.setSelectionRange(globalSearch.length, globalSearch.length);
        focusSearch = false;
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            globalSearch = e.target.value;
            currentPage = 1;
            focusSearch = true;
            render();
        });
    }
    
    const filterBtn = toolbarContainer.querySelector('#dt-filter-btn');
    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            isFilterPopupOpen = !isFilterPopupOpen;
            renderToolbar(); // Only re-render toolbar to open/close popup, no need to re-render full table
        });
    }
    
    if (isFilterPopupOpen) {
        toolbarContainer.querySelectorAll('.dt-col-filter-cb').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const key = e.target.dataset.key;
                const val = e.target.value;
                if (!columnFilters[key]) columnFilters[key] = [];
                
                if (e.target.checked) {
                    if (!columnFilters[key].includes(val)) columnFilters[key].push(val);
                } else {
                    columnFilters[key] = columnFilters[key].filter(v => v !== val);
                }
            });
        });
        
        toolbarContainer.querySelector('#dt-filter-reset').addEventListener('click', () => {
            columnFilters = {};
            isFilterPopupOpen = false;
            currentPage = 1;
            render();
        });
        
        toolbarContainer.querySelector('#dt-filter-apply').addEventListener('click', () => {
            isFilterPopupOpen = false;
            currentPage = 1;
            render();
        });
    }
  }

  // Initial render
  render();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
