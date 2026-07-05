import { api } from '../utils/api.js';

// Color map for authority types
const AUTH_TYPE_COLORS = {
  'Autor':            { bg: 'rgba(124, 25, 51, 0.08)',  border: 'rgba(124, 25, 51, 0.25)',  text: '#7c1933' },
  'Tema':             { bg: 'rgba(82, 117, 94, 0.08)',  border: 'rgba(82, 117, 94, 0.25)',  text: '#52755e' },
  'Tema (Persona)':   { bg: 'rgba(82, 117, 94, 0.08)',  border: 'rgba(82, 117, 94, 0.25)',  text: '#52755e' },
  'Tema (Corporativo)': { bg: 'rgba(82, 117, 94, 0.08)', border: 'rgba(82, 117, 94, 0.25)', text: '#52755e' },
  'Lugar':            { bg: 'rgba(86, 105, 122, 0.08)', border: 'rgba(86, 105, 122, 0.25)', text: '#56697a' },
  'Corporativo':      { bg: 'rgba(179, 143, 77, 0.08)', border: 'rgba(179, 143, 77, 0.25)', text: '#b38f4d' },
  'Título Uniforme':  { bg: 'rgba(128, 90, 150, 0.08)', border: 'rgba(128, 90, 150, 0.25)', text: '#805a96' },
};

const AUTH_TYPE_ICONS = {
  'Autor':            'fa-solid fa-feather',
  'Tema':             'fa-solid fa-tags',
  'Tema (Persona)':   'fa-solid fa-user-tag',
  'Tema (Corporativo)': 'fa-solid fa-building-flag',
  'Lugar':            'fa-solid fa-map-pin',
  'Corporativo':      'fa-solid fa-building',
  'Título Uniforme':  'fa-solid fa-bookmark',
};

function getAuthColor(type) {
  return AUTH_TYPE_COLORS[type] || AUTH_TYPE_COLORS['Tema'];
}

function getAuthIcon(type) {
  return AUTH_TYPE_ICONS[type] || 'fa-solid fa-tag';
}

function renderAuthorityBadge(auth) {
  const color = getAuthColor(auth.type);
  const icon = getAuthIcon(auth.type);
  return `
    <span class="catalog-auth-badge" style="background:${color.bg}; border-color:${color.border}; color:${color.text};" title="${auth.type}: ${auth.name}">
      <i class="${icon}"></i> ${auth.name}
    </span>
  `;
}

export const CatalogExplorerPage = {
  path: '/catalog',
  navKey: 'catalog',

  async render(container) {
    const [stats, books] = await Promise.all([
      api.getCatalogStats().catch(() => ({})),
      api.getCatalogBooks('', 100).catch(() => []),
    ]);

    const totalBooks = stats.total_books || 0;
    const totalAuthorities = stats.total_authorities || 0;
    const totalConnections = stats.total_connections || 0;
    const typeCounts = stats.type_counts || {};

    container.innerHTML = `
      <section class="hero">
        <h1>Catálogo — Jardín LAC Vizcaínas</h1>
        <p>Explora el acervo real de la biblioteca y descubre cómo los libros se conectan a través de sus autoridades catalogadas en Koha.</p>
      </section>

      <div class="stats-grid" style="margin-bottom:2rem;">
        <div class="glass-card stat-card">
          <div class="stat-icon users" style="background:rgba(124,25,51,0.08);">
            <i class="fa-solid fa-book" style="color:var(--color-accent);"></i>
          </div>
          <div>
            <div class="stat-number">${totalBooks.toLocaleString()}</div>
            <div class="stat-label">Obras Catalogadas</div>
          </div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-icon books" style="background:rgba(82,117,94,0.08);">
            <i class="fa-solid fa-tags" style="color:var(--color-collab);"></i>
          </div>
          <div>
            <div class="stat-number">${totalAuthorities.toLocaleString()}</div>
            <div class="stat-label">Autoridades</div>
          </div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-icon checkouts" style="background:rgba(179,143,77,0.08);">
            <i class="fa-solid fa-diagram-project" style="color:var(--color-gold);"></i>
          </div>
          <div>
            <div class="stat-number">${totalConnections.toLocaleString()}</div>
            <div class="stat-label">Conexiones</div>
          </div>
        </div>
      </div>

      <!-- Authority type summary -->
      <div class="glass-card" style="margin-bottom:2rem;">
        <h3 style="font-family:var(--font-display); font-size:1.15rem; font-weight:700; margin-bottom:1rem;">
          <i class="fa-solid fa-layer-group" style="color:var(--color-accent);"></i> Tipos de Autoridades
        </h3>
        <div class="catalog-type-grid">
          ${Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
            const color = getAuthColor(type);
            const icon = getAuthIcon(type);
            return `
              <div class="catalog-type-chip" style="background:${color.bg}; border:1px solid ${color.border};">
                <i class="${icon}" style="color:${color.text};"></i>
                <span style="font-weight:600; color:${color.text};">${type}</span>
                <span class="catalog-type-count" style="color:${color.text};">${count}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Advanced statistics panel -->
      <div class="glass-card" style="margin-bottom:2rem;">
        <h3 style="font-family:var(--font-display); font-size:1.15rem; font-weight:700; margin-bottom:1.25rem;">
          <i class="fa-solid fa-square-poll-vertical" style="color:var(--color-accent);"></i> Análisis de Interconexión en el Grafo
        </h3>
        
        <div class="stats-insights-grid">
          <div class="insight-column">
            <h4 style="font-size:0.9rem; font-weight:700; margin-bottom:0.75rem; color:var(--text-secondary);">
              <i class="fa-solid fa-circle-nodes" style="color:var(--color-accent);"></i> Métricas de Red
            </h4>
            <div style="display:flex; flex-direction:column; gap:0.75rem; margin-bottom:1.5rem;">
              <div class="insight-stat-item">
                <span class="insight-label">Promedio de conexiones por libro:</span>
                <span class="insight-value">${stats.avg_connections_per_book || 0}</span>
              </div>
              <div class="insight-stat-item">
                <span class="insight-label">Libros huérfanos (sin conexiones fuertes):</span>
                <span class="insight-value" style="color:var(--color-accent);">${stats.orphaned_books_count || 0}</span>
              </div>
            </div>
            
            <h4 style="font-size:0.9rem; font-weight:700; margin-bottom:0.75rem; color:var(--text-secondary);">
              <i class="fa-solid fa-ghost" style="color:var(--text-muted);"></i> Libros sin Conexión (Huérfanos)
            </h4>
            <div class="inspector-scroll-list" style="max-height: 150px; background:var(--bg-secondary); border-radius:0.25rem; border:1px solid var(--border-light); padding:0.5rem;">
              ${(stats.sample_orphaned_books && stats.sample_orphaned_books.length > 0) ? stats.sample_orphaned_books.map(b => `
                <div class="inspector-book-item" style="cursor:default; pointer-events:none; padding:0.35rem 0.5rem; display:flex; justify-content:space-between; align-items:center;">
                  <span class="inspector-book-title" style="font-size:0.8rem; font-weight:600; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width:240px;">${b.title}</span>
                  ${b.author ? `<span style="font-size:0.7rem; color:var(--text-muted);">${b.author}</span>` : ''}
                </div>
              `).join('') : '<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:1rem;">Ninguno detectado</div>'}
            </div>
          </div>
          
          <div class="insight-column">
            <h4 style="font-size:0.9rem; font-weight:700; margin-bottom:0.75rem; color:var(--text-secondary);">
              <i class="fa-solid fa-crown" style="color:var(--color-gold);"></i> Obras más Conectadas del Catálogo
            </h4>
            <div class="inspector-scroll-list" style="max-height: 250px; background:var(--bg-secondary); border-radius:0.25rem; border:1px solid var(--border-light); padding:0.5rem;">
              ${(stats.most_connected_books && stats.most_connected_books.length > 0) ? stats.most_connected_books.map(b => `
                <a href="#/catalog/graph/${b.biblio_id}" class="inspector-book-item" style="padding:0.4rem 0.5rem; display:flex; align-items:center; justify-content:space-between; text-decoration:none; color:var(--text-primary);">
                  <div style="display:flex; align-items:center; gap:0.45rem; min-width:0; flex:1;">
                    <i class="fa-solid fa-book" style="color:var(--color-accent); font-size:0.8rem; flex-shrink:0;"></i>
                    <span class="inspector-book-title" style="font-size:0.8rem; font-weight:600; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${b.title}</span>
                  </div>
                  <span class="similarity-badge" style="background:rgba(124, 25, 51, 0.08); color:var(--color-accent); border:1px solid rgba(124, 25, 51, 0.15); font-weight:700; padding:0.1rem 0.4rem; border-radius:0.2rem; font-size:0.72rem; flex-shrink:0; margin-left:0.5rem;" title="${b.connection_count} conexiones">${b.connection_count}</span>
                </a>
              `).join('') : '<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:1rem;">Cargando...</div>'}
            </div>
          </div>
        </div>
      </div>

      <!-- Search and books list -->
      <div class="glass-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; flex-wrap:wrap; gap:0.75rem;">
          <h3 style="font-family:var(--font-display); font-size:1.25rem; font-weight:700; margin:0;">
            <i class="fa-solid fa-building-columns" style="color:var(--color-accent);"></i> Explorador del Acervo
          </h3>
          <div class="search-bar" style="max-width:350px;">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input type="text" id="catalog-search" placeholder="Buscar por título, autor o autoridad..." class="search-input">
          </div>
        </div>

        <div id="catalog-books-list">
          ${this.renderBooksList(books)}
        </div>
      </div>
    `;

    this.bindEvents();
  },

  renderBooksList(books) {
    if (!books.length) {
      return `
        <div style="text-align:center; padding:2rem; color:var(--text-secondary);">
          <i class="fa-solid fa-book-open" style="font-size:2rem; color:var(--text-muted); margin-bottom:0.75rem;"></i>
          <p>No se encontraron obras con las autoridades especificadas.</p>
        </div>
      `;
    }

    return books.map(book => `
      <div class="catalog-book-card">
        <div class="catalog-book-header">
          <div class="catalog-book-info">
            <a href="#/catalog/graph/${book.biblio_id}" class="catalog-book-title">${book.title}</a>
            ${book.author ? `<div class="catalog-book-author"><i class="fa-solid fa-feather"></i> ${book.author}</div>` : ''}
          </div>
          <div class="catalog-book-stats">
            ${book.connection_count > 0 ? `
              <a href="#/catalog/graph/${book.biblio_id}" class="btn btn-outline" style="font-size:0.75rem; padding:0.3rem 0.65rem;">
                <i class="fa-solid fa-diagram-project"></i> ${book.connection_count} conexiones
              </a>
            ` : `
              <span style="font-size:0.75rem; color:var(--text-muted);">Sin conexiones</span>
            `}
          </div>
        </div>
        <div class="catalog-auth-list">
          ${book.authorities.map(auth => renderAuthorityBadge(auth)).join('')}
        </div>
      </div>
    `).join('');
  },

  bindEvents() {
    const searchInput = document.getElementById('catalog-search');
    const listContainer = document.getElementById('catalog-books-list');
    let debounceTimer;

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          const query = searchInput.value.trim();
          listContainer.innerHTML = '<div style="text-align:center; padding:2rem;"><i class="fa fa-spinner fa-spin fa-2x" style="color:var(--color-accent)"></i></div>';

          try {
            const books = await api.getCatalogBooks(query, 100);
            listContainer.innerHTML = this.renderBooksList(books);
          } catch (err) {
            listContainer.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--color-accent);">Error al buscar: ${err.message}</div>`;
          }
        }, 350);
      });
    }
  },
};
