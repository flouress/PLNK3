/**
 * Render tab navigation
 * @param {HTMLElement} container
 * @param {Array<{id: string, label: string, icon: string}>} tabs
 * @param {string} activeTab
 * @param {Function} onTabChange
 */
export function renderTabNavigation(container, tabs, activeTab, onTabChange) {
  container.innerHTML = `
    <nav class="tab-navigation" role="tablist">
      ${tabs.map(tab => `
        <button
          class="tab-btn ${tab.id === activeTab ? 'active' : ''}"
          data-tab="${tab.id}"
          role="tab"
          aria-selected="${tab.id === activeTab}"
          id="tab-${tab.id}"
        >
          ${tab.label}
        </button>
      `).join('')}
    </nav>
  `;

  // Event listeners
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;

      // Update active state
      container.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      onTabChange(tabId);
    });
  });
}
