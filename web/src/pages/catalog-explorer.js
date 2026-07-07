import { api } from '../utils/api.js';

// Color map for authority types (updated translations)
const AUTH_TYPE_COLORS = {
  'Autor':            { bg: 'rgba(124, 25, 51, 0.08)',  border: 'rgba(124, 25, 51, 0.25)',  text: '#7c1933' },
  'Tema':             { bg: 'rgba(82, 117, 94, 0.08)',  border: 'rgba(82, 117, 94, 0.25)',  text: '#52755e' },
  'Tema (Persona)':   { bg: 'rgba(82, 117, 94, 0.08)',  border: 'rgba(82, 117, 94, 0.25)',  text: '#52755e' },
  'Tema (Institución)': { bg: 'rgba(82, 117, 94, 0.08)', border: 'rgba(82, 117, 94, 0.25)', text: '#52755e' },
  'Lugar':            { bg: 'rgba(86, 105, 122, 0.08)', border: 'rgba(86, 105, 122, 0.25)', text: '#56697a' },
  'Institución / Organización': { bg: 'rgba(179, 143, 77, 0.08)', border: 'rgba(179, 143, 77, 0.25)', text: '#b38f4d' },
  'Título Uniforme':  { bg: 'rgba(128, 90, 150, 0.08)', border: 'rgba(128, 90, 150, 0.25)', text: '#805a96' },
};

const AUTH_TYPE_ICONS = {
  'Autor':            'fa-solid fa-feather',
  'Tema':             'fa-solid fa-tags',
  'Tema (Persona)':   'fa-solid fa-user-tag',
  'Tema (Institución)': 'fa-solid fa-building-flag',
  'Lugar':            'fa-solid fa-map-pin',
  'Institución / Organización': 'fa-solid fa-building',
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

      <!-- Prominent Search Console -->
      <div class="glass-card" style="margin-bottom:2rem; padding:2rem; background:linear-gradient(135deg, rgba(124, 25, 51, 0.02) 0%, rgba(86, 105, 122, 0.05) 100%); border:1px solid var(--border-light); border-radius: 8px;">
        <div style="max-width:650px; margin:0 auto; text-align:center;">
          <h2 style="font-family:var(--font-display); font-size:1.5rem; font-weight:700; color:var(--text-primary); margin:0 0 0.5rem 0;">
            <i class="fa-solid fa-magnifying-glass-chart" style="color:var(--color-accent);"></i> Búsqueda Inteligente del Catálogo
          </h2>
          <p style="color:var(--text-secondary); font-size:0.88rem; margin:0 0 1.5rem 0;">
            Busca por título, autor o autoridades (temas, lugares, instituciones). Tolera errores ortográficos y ordena por relevancia.
          </p>
          <div style="position:relative; width:100%; display:flex; align-items:center;">
            <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:1.15rem; color:var(--color-accent); font-size:1.1rem; pointer-events:none;"></i>
            <input type="text" id="catalog-search" placeholder="Escribe tu búsqueda (ej. 'garcia marquez', 'sor juana', 'historia')..." 
                   class="search-input" 
                   style="width:100%; padding:0.85rem 1rem 0.85rem 2.85rem; font-size:1.05rem; border-radius:24px; border:1px solid var(--border-light); background:var(--bg-primary); color:var(--text-primary); box-shadow:0 4px 20px rgba(0,0,0,0.02); transition:all 0.2s ease; outline:none;">
          </div>
        </div>
      </div>

      <!-- Informational Performance Banner -->
      <div class="glass-card" style="padding:0.75rem 1rem; background:rgba(86,105,122,0.05); border:1px solid var(--border-light); margin-bottom:2rem; display:flex; align-items:center; gap:0.75rem; border-radius:0.25rem;">
        <i class="fa-solid fa-circle-info" style="color:var(--color-slate); font-size:1.15rem; flex-shrink:0;"></i>
        <p style="font-size:0.8rem; color:var(--text-secondary); margin:0; line-height:1.4;">
          <strong>Nota de Desempeño:</strong> Por motivos de rendimiento del servidor y velocidad de carga, las interconexiones en esta sección solo muestran conexiones de libros en Koha que comparten un <strong>mínimo de 3 autoridades</strong>.
        </p>
      </div>

      <!-- Main Columns Layout -->
      <div class="search-layout-grid" style="display:grid; grid-template-columns: 1.55fr 1fr; gap:2rem; align-items: start;">
        
        <!-- Left Column: Search Results Explorer -->
        <div class="glass-card" style="padding:1.5rem;">
          <h3 style="font-family:var(--font-display); font-size:1.2rem; font-weight:700; margin:0 0 1.25rem 0; display:flex; align-items:center; gap:0.5rem;">
            <i class="fa-solid fa-building-columns" style="color:var(--color-accent);"></i> Resultados del Acervo
          </h3>
          <div id="catalog-books-list">
            ${this.renderBooksList(books)}
          </div>
        </div>

        <!-- Right Column: Stats and Insights -->
        <div style="display:flex; flex-direction:column; gap:2rem;">
          
          <!-- Stats Summary Grid -->
          <div style="display:grid; grid-template-columns:1fr; gap:1rem;">
            <div class="glass-card stat-card" style="padding:1rem; display:flex; align-items:center; gap:0.75rem;">
              <div class="stat-icon users" style="background:rgba(124,25,51,0.08); width:2.5rem; height:2.5rem; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i class="fa-solid fa-book" style="color:var(--color-accent); font-size:1.1rem;"></i>
              </div>
              <div>
                <div class="stat-number" style="font-size:1.25rem; font-weight:700;">${totalBooks.toLocaleString()}</div>
                <div class="stat-label" style="font-size:0.75rem; color:var(--text-secondary);">Obras Catalogadas</div>
              </div>
            </div>
            <div class="glass-card stat-card" style="padding:1rem; display:flex; align-items:center; gap:0.75rem;">
              <div class="stat-icon books" style="background:rgba(82,117,94,0.08); width:2.5rem; height:2.5rem; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i class="fa-solid fa-tags" style="color:var(--color-collab); font-size:1.1rem;"></i>
              </div>
              <div>
                <div class="stat-number" style="font-size:1.25rem; font-weight:700;">${totalAuthorities.toLocaleString()}</div>
                <div class="stat-label" style="font-size:0.75rem; color:var(--text-secondary);">Autoridades</div>
              </div>
            </div>
            <div class="glass-card stat-card" style="padding:1rem; display:flex; align-items:center; gap:0.75rem;">
              <div class="stat-icon checkouts" style="background:rgba(179,143,77,0.08); width:2.5rem; height:2.5rem; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i class="fa-solid fa-diagram-project" style="color:var(--color-gold); font-size:1.1rem;"></i>
              </div>
              <div>
                <div class="stat-number" style="font-size:1.25rem; font-weight:700;">${totalConnections.toLocaleString()}</div>
                <div class="stat-label" style="font-size:0.75rem; color:var(--text-secondary);">Conexiones</div>
              </div>
            </div>
          </div>

          <!-- Authority types -->
          <div class="glass-card" style="padding:1.25rem;">
            <h3 style="font-family:var(--font-display); font-size:1.1rem; font-weight:700; margin:0 0 1rem 0;">
              <i class="fa-solid fa-layer-group" style="color:var(--color-accent);"></i> Tipos de Autoridades
            </h3>
            <div class="catalog-type-grid" style="display:flex; flex-direction:column; gap:0.5rem;">
              ${Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                const color = getAuthColor(type);
                const icon = getAuthIcon(type);
                return `
                  <div class="catalog-type-chip" style="background:${color.bg}; border:1px solid ${color.border}; display:flex; align-items:center; justify-content:space-between; padding:0.4rem 0.6rem; border-radius:4px;">
                    <span style="display:flex; align-items:center; gap:0.4rem; font-size:0.8rem; font-weight:600; color:${color.text};">
                      <i class="${icon}" style="color:${color.text};"></i>
                      ${type}
                    </span>
                    <span class="catalog-type-count" style="font-size:0.75rem; font-weight:700; color:${color.text}; background:rgba(255,255,255,0.4); padding:0.1rem 0.4rem; border-radius:10px;">${count}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Advanced analysis -->
          <div class="glass-card" style="padding:1.25rem;">
            <h3 style="font-family:var(--font-display); font-size:1.1rem; font-weight:700; margin:0 0 1rem 0;">
              <i class="fa-solid fa-crown" style="color:var(--color-gold);"></i> Obras Clave (Más Conectadas)
            </h3>
            <div class="inspector-scroll-list" style="display:flex; flex-direction:column; gap:0.35rem; max-height: 350px; overflow-y:auto; padding-right:0.25rem;">
              ${(stats.most_connected_books && stats.most_connected_books.length > 0) ? stats.most_connected_books.slice(0, 15).map(b => `
                <a href="#/catalog/graph/${b.biblio_id}" class="inspector-book-item" style="padding:0.4rem; display:flex; align-items:center; justify-content:space-between; text-decoration:none; color:var(--text-primary); background:var(--bg-secondary); border-radius:4px; border:1px solid var(--border-light); min-width:0;">
                  <div style="display:flex; align-items:center; gap:0.45rem; min-width:0; flex:1;">
                    <i class="fa-solid fa-book" style="color:var(--color-accent); font-size:0.75rem; flex-shrink:0;"></i>
                    <span class="inspector-book-title" style="font-size:0.75rem; font-weight:600; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${b.title}</span>
                  </div>
                  <span class="similarity-badge" style="background:rgba(124, 25, 51, 0.08); color:var(--color-accent); font-weight:700; padding:0.05rem 0.35rem; border-radius:3px; font-size:0.68rem; flex-shrink:0; margin-left:0.5rem;">${b.connection_count}</span>
                </a>
              `).join('') : '<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:1rem;">Cargando...</div>'}
            </div>
          </div>

        </div>

      </div>
    `;

    this.bindEvents();
  },

  renderBooksList(books) {
    if (!books.length) {
      return `
        <div style="text-align:center; padding:3rem 2rem; color:var(--text-secondary);">
          <i class="fa-solid fa-book-open" style="font-size:2.5rem; color:var(--text-muted); margin-bottom:1rem;"></i>
          <p style="font-size:1.05rem; font-weight:500;">No se encontraron obras con los términos especificados.</p>
          <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.25rem;">Intenta buscar por palabras clave o revisa la ortografía.</p>
        </div>
      `;
    }

    return books.map(book => {
      const hasMatch = book.match_score !== undefined;
      
      let scoreBadge = '';
      if (hasMatch) {
        let badgeColor = '#52755e'; // Green for high relevance
        if (book.match_score < 80) badgeColor = '#b38f4d'; // Gold for medium
        if (book.match_score < 65) badgeColor = '#56697a'; // Slate for low
        
        scoreBadge = `
          <div class="search-match-badge" style="background:${badgeColor}12; color:${badgeColor}; border:1px solid ${badgeColor}25; font-size:0.75rem; font-weight:700; padding:0.2rem 0.5rem; border-radius:4px; display:inline-flex; align-items:center; gap:0.25rem;" title="Similitud de búsqueda">
            <i class="fa-solid fa-chart-simple"></i> Relevancia: ${book.match_score}%
          </div>
        `;
      }

      return `
        <div class="catalog-book-card" style="position:relative; overflow:hidden; padding: 1rem; border-bottom: 1px solid var(--border-light); margin-bottom: 0.75rem; background: var(--bg-primary); border-radius: 6px;">
          ${hasMatch ? `<div style="position:absolute; top:0; left:0; width:3px; height:100%; background:var(--color-accent);"></div>` : ''}
          <div class="catalog-book-header" style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem;">
            <div class="catalog-book-info" style="min-width:0; flex:1;">
              <a href="#/catalog/graph/${book.biblio_id}" class="catalog-book-title" style="font-family:var(--font-display); font-size:1.05rem; font-weight:700; color:var(--text-primary); text-decoration:none; display:block; margin-bottom:0.25rem;">${book.title}</a>
              ${book.author ? `<div class="catalog-book-author" style="font-size:0.8rem; color:var(--text-secondary);"><i class="fa-solid fa-feather"></i> ${book.author}</div>` : ''}
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem; flex-shrink:0;">
              ${scoreBadge}
              <div class="catalog-book-stats">
                ${book.connection_count > 0 ? `
                  <a href="#/catalog/graph/${book.biblio_id}" class="btn btn-outline" style="font-size:0.72rem; padding:0.25rem 0.55rem; white-space:nowrap;">
                    <i class="fa-solid fa-diagram-project"></i> ${book.connection_count} conexiones
                  </a>
                ` : `
                  <span style="font-size:0.72rem; color:var(--text-muted);">Sin conexiones</span>
                `}
              </div>
            </div>
          </div>
          
          ${book.match_explanation ? `
            <div style="margin-top: 0.6rem; font-size: 0.78rem; color: var(--text-secondary); background: rgba(86,105,122,0.04); padding: 0.4rem 0.6rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.35rem; border: 1px dashed rgba(86,105,122,0.15);">
              <i class="fa-solid fa-magnifying-glass-chart" style="color:var(--color-accent); font-size:0.85rem;"></i>
              <span><strong>Motivo del ranking:</strong> ${book.match_explanation}</span>
            </div>
          ` : ''}

          <div class="catalog-auth-list" style="margin-top:0.75rem; display:flex; flex-wrap:wrap; gap:0.35rem;">
            ${book.authorities.map(auth => renderAuthorityBadge(auth)).join('')}
          </div>
        </div>
      `;
    }).join('');
  },

  bindEvents() {
    const searchInput = document.getElementById('catalog-search');
    const listContainer = document.getElementById('catalog-books-list');
    let debounceTimer;

    if (searchInput) {
      // Focus style bindings via Javascript fallback just in case
      searchInput.addEventListener('focus', () => {
        searchInput.style.borderColor = 'var(--color-accent)';
        searchInput.style.boxShadow = '0 4px 20px rgba(124, 25, 51, 0.08)';
      });
      searchInput.addEventListener('blur', () => {
        searchInput.style.borderColor = 'var(--border-light)';
        searchInput.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.02)';
      });

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
