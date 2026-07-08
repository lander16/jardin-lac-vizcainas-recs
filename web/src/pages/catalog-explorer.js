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
    <span class="catalog-auth-badge clickable-auth-badge" 
          style="background:${color.bg}; border-color:${color.border}; color:${color.text}; cursor:pointer; transition:transform 0.15s ease;" 
          data-id="${auth.authority_id || ''}" 
          data-name="${auth.name}" 
          data-type="${auth.type}" 
          title="Ver conexiones de la autoridad '${auth.name}'">
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

    this.stats = stats;

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
      <div class="search-layout-grid">
        
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
          
          <!-- Stats Summary Grid (Expanded 6-Card Dashboard) -->
          <div>
            <h3 style="font-family:var(--font-display); font-size:1.1rem; font-weight:700; margin:0 0 0.75rem 0;">
              <i class="fa-solid fa-chart-line" style="color:var(--color-accent);"></i> Estadísticas del Acervo
            </h3>
            <div class="catalog-stats-grid">
              <!-- Card 1: Books -->
              <div class="glass-card stat-card" style="padding:0.75rem; display:flex; align-items:center; gap:0.5rem; min-width:0;" title="Cantidad total de registros bibliográficos en Koha">
                <div style="background:rgba(124,25,51,0.06); width:2.2rem; height:2.2rem; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                  <i class="fa-solid fa-book" style="color:var(--color-accent); font-size:0.95rem;"></i>
                </div>
                <div style="min-width:0; flex:1;">
                  <div class="stat-number" style="font-size:1.05rem; font-weight:700;">${totalBooks.toLocaleString()}</div>
                  <div style="font-size:0.65rem; color:var(--text-secondary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">Libros</div>
                </div>
              </div>
              <!-- Card 2: Authorities -->
              <div class="glass-card stat-card" style="padding:0.75rem; display:flex; align-items:center; gap:0.5rem; min-width:0;" title="Descriptores únicos (temas, lugares, personas)">
                <div style="background:rgba(82,117,94,0.06); width:2.2rem; height:2.2rem; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                  <i class="fa-solid fa-tags" style="color:var(--color-sage); font-size:0.95rem;"></i>
                </div>
                <div style="min-width:0; flex:1;">
                  <div class="stat-number" style="font-size:1.05rem; font-weight:700;">${totalAuthorities.toLocaleString()}</div>
                  <div style="font-size:0.65rem; color:var(--text-secondary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">Etiquetas</div>
                </div>
              </div>
              <!-- Card 3: Auth per Book -->
              <div class="glass-card stat-card" style="padding:0.75rem; display:flex; align-items:center; gap:0.5rem; min-width:0;" title="Promedio de etiquetas/autoridades asignadas a cada libro">
                <div style="background:rgba(86,105,122,0.06); width:2.2rem; height:2.2rem; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                  <i class="fa-solid fa-list-ol" style="color:var(--color-slate); font-size:0.95rem;"></i>
                </div>
                <div style="min-width:0; flex:1;">
                  <div class="stat-number" style="font-size:1.05rem; font-weight:700;">${stats.avg_authorities_per_book || 0}</div>
                  <div style="font-size:0.65rem; color:var(--text-secondary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">Etiquetas/Libro</div>
                </div>
              </div>
              <!-- Card 4: Books per Auth -->
              <div class="glass-card stat-card" style="padding:0.75rem; display:flex; align-items:center; gap:0.5rem; min-width:0;" title="Promedio de libros asociados a cada etiqueta">
                <div style="background:rgba(128,90,150,0.06); width:2.2rem; height:2.2rem; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                  <i class="fa-solid fa-network-wired" style="color:#805a96; font-size:0.95rem;"></i>
                </div>
                <div style="min-width:0; flex:1;">
                  <div class="stat-number" style="font-size:1.05rem; font-weight:700;">${stats.avg_books_per_authority || 0}</div>
                  <div style="font-size:0.65rem; color:var(--text-secondary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">Libros/Etiqueta</div>
                </div>
              </div>
              <!-- Card 5: Connections -->
              <div class="glass-card stat-card" style="padding:0.75rem; display:flex; align-items:center; gap:0.5rem; min-width:0;" title="Pares de libros con ≥3 autoridades compartidas">
                <div style="background:rgba(179,143,77,0.06); width:2.2rem; height:2.2rem; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                  <i class="fa-solid fa-diagram-project" style="color:var(--color-gold); font-size:0.95rem;"></i>
                </div>
                <div style="min-width:0; flex:1;">
                  <div class="stat-number" style="font-size:1.05rem; font-weight:700;">${totalConnections.toLocaleString()}</div>
                  <div style="font-size:0.65rem; color:var(--text-secondary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">Conexiones</div>
                </div>
              </div>
              <!-- Card 6: Connected Pct -->
              <div class="glass-card stat-card" style="padding:0.75rem; display:flex; align-items:center; gap:0.5rem; min-width:0;" title="Porcentaje de obras catalogadas que tienen al menos una conexión en la red">
                <div style="background:rgba(82,117,94,0.06); width:2.2rem; height:2.2rem; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                  <i class="fa-solid fa-percent" style="color:var(--color-sage); font-size:0.95rem;"></i>
                </div>
                <div style="min-width:0; flex:1;">
                  <div class="stat-number" style="font-size:1.05rem; font-weight:700;">${stats.percentage_connected_catalog || 0}%</div>
                  <div style="font-size:0.65rem; color:var(--text-secondary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">Interconexión</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Authority types -->
          <div class="glass-card" style="padding:1.25rem;">
            <h3 style="font-family:var(--font-display); font-size:1.1rem; font-weight:700; margin:0 0 0.5rem 0;">
              <i class="fa-solid fa-layer-group" style="color:var(--color-accent);"></i> Tipos de Autoridades
            </h3>
            <p style="font-size:0.75rem; color:var(--text-secondary); margin:0 0 1rem 0;">Haz clic en cualquier tipo para explorar estadísticas avanzadas y descriptores.</p>
            <div class="catalog-type-grid" style="display:flex; flex-direction:column; gap:0.5rem;">
              ${Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                const color = getAuthColor(type);
                const icon = getAuthIcon(type);
                return `
                  <div class="catalog-type-chip" data-type="${type}" style="background:${color.bg}; border:1px solid ${color.border}; display:flex; align-items:center; justify-content:space-between; padding:0.4rem 0.6rem; border-radius:4px;" title="Explorar autoridades de tipo '${type}'">
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
          <div class="catalog-book-header">
            <div class="catalog-book-info" style="min-width:0; flex:1;">
              <a href="#/catalog/graph/${book.biblio_id}" class="catalog-book-title" style="font-family:var(--font-display); font-size:1.05rem; font-weight:700; color:var(--text-primary); text-decoration:none; display:block; margin-bottom:0.25rem;">${book.title}</a>
              ${book.author ? `<div class="catalog-book-author" style="font-size:0.8rem; color:var(--text-secondary);"><i class="fa-solid fa-feather"></i> ${book.author}</div>` : ''}
            </div>
            <div class="catalog-book-meta-right">
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
            <div class="search-match-explanation">
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

    // Dynamic Event Delegation for clickable badges and chips (resists dynamic re-renders!)
    document.addEventListener('click', (e) => {
      // 1. Click on authority type chip in sidebar
      const typeChip = e.target.closest('.catalog-type-chip');
      if (typeChip) {
        const type = typeChip.getAttribute('data-type');
        if (type) {
          this.openAuthorityInspector(type);
        }
        return;
      }

      // 2. Click on any individual authority badge throughout the catalog search results
      const authBadge = e.target.closest('.clickable-auth-badge');
      if (authBadge) {
        const authId = authBadge.getAttribute('data-id');
        const authName = authBadge.getAttribute('data-name');
        const authType = authBadge.getAttribute('data-type');
        if (authType) {
          this.openAuthorityInspector(authType, { id: authId, name: authName });
        }
        return;
      }
    });
  },

  async openAuthorityInspector(type, selectedAuth = null) {
    let modal = document.getElementById('authority-inspector-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'authority-inspector-modal';
      modal.className = 'inspector-modal-overlay';
      document.body.appendChild(modal);
    }

    const color = getAuthColor(type);
    const icon = getAuthIcon(type);
    const typeStats = (this.stats && this.stats.type_stats && this.stats.type_stats[type]) || {};

    modal.innerHTML = `
      <div class="inspector-modal-card">
        <!-- Modal Header -->
        <div style="background:${color.bg}; border-bottom:1px solid ${color.border}; padding:1rem 1.25rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem;">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <div style="width:2.5rem; height:2.5rem; border-radius:50%; background:white; border:1px solid ${color.border}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i class="${icon}" style="color:${color.text}; font-size:1.25rem;"></i>
            </div>
            <div>
              <h2 style="font-family:var(--font-display); font-size:1.25rem; font-weight:700; margin:0; color:var(--text-primary);">${type}</h2>
              <p style="font-size:0.72rem; color:var(--text-secondary); margin:2px 0 0 0;">Análisis y desglose de descriptores catalogados en Koha</p>
            </div>
          </div>
          <div style="display:flex; gap:1.25rem; flex-wrap:wrap; font-size:0.78rem;">
            <div>
              <div style="font-size:0.68rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.02em;">Etiquetas Únicas</div>
              <div style="font-size:1.05rem; font-weight:700; color:var(--text-primary);">${(typeStats.total_authorities || 0).toLocaleString()}</div>
            </div>
            <div>
              <div style="font-size:0.68rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.02em;">Promedio de Libros</div>
              <div style="font-size:1.05rem; font-weight:700; color:var(--text-primary);">${typeStats.avg_books_per_authority || 0}</div>
            </div>
            <div style="max-width: 250px;">
              <div style="font-size:0.68rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.02em;">Etiqueta Más Común</div>
              <div style="font-size:1.05rem; font-weight:700; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${typeStats.top_authority_name || ''}">
                ${typeStats.top_authority_name || 'Ninguna'}
                <span style="font-size:0.75rem; font-weight:normal; color:var(--text-secondary);">(${typeStats.top_authority_count || 0} lib.)</span>
              </div>
            </div>
          </div>
          <button id="close-inspector-modal" style="background:none; border:none; color:var(--text-secondary); font-size:1.75rem; cursor:pointer; padding:0.25rem 0.5rem; line-height:1; transition:color 0.2s;" onmouseover="this.style.color='var(--color-accent)'" onmouseout="this.style.color='var(--text-secondary)'">&times;</button>
        </div>

        <!-- Modal Body Layout -->
        <div style="display:grid; grid-template-columns:1fr 1.2fr; height:calc(100% - 68px); overflow:hidden;" class="modal-body-layout">
          <!-- Left Column: Search & Scrollable Tags list -->
          <div style="border-right:1px solid var(--border-light); display:flex; flex-direction:column; background:var(--bg-primary); padding:1rem; min-width:0; overflow:hidden;">
            <div style="position:relative; margin-bottom:0.75rem; display:flex; align-items:center;">
              <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:0.65rem; color:var(--text-muted); font-size:0.8rem; pointer-events:none;"></i>
              <input type="text" id="inspector-tag-search" placeholder="Filtrar descriptores de este tipo..." 
                     style="width:100%; padding:0.4rem 0.5rem 0.4rem 1.8rem; font-size:0.82rem; border-radius:4px; border:1px solid var(--border-light); background:white; color:var(--text-primary); outline:none;">
            </div>
            <div id="inspector-tags-list" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:0.3rem; padding-right:0.2rem;">
              <div style="text-align:center; padding:2rem;"><i class="fa fa-spinner fa-spin" style="color:var(--color-accent)"></i> Cargando...</div>
            </div>
          </div>

          <!-- Right Column: Detail & Linked Books list -->
          <div id="inspector-books-panel" style="display:flex; flex-direction:column; padding:1.25rem; background:white; overflow-y:auto; min-width:0;">
            <div style="text-align:center; padding:5rem 2rem; color:var(--text-secondary); margin:auto 0;">
              <i class="${icon}" style="font-size:3rem; color:var(--text-muted); margin-bottom:1rem; opacity:0.3;"></i>
              <p style="font-size:1.05rem; font-weight:600;">Selecciona un descriptor de la izquierda</p>
              <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem;">Verás el listado de obras del acervo que comparten esta autoridad catalogada.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Activate modal (fade in)
    setTimeout(() => modal.classList.add('active'), 10);

    const closeBtn = modal.querySelector('#close-inspector-modal');
    const searchInput = modal.querySelector('#inspector-tag-search');
    const tagsListContainer = modal.querySelector('#inspector-tags-list');
    const booksPanel = modal.querySelector('#inspector-books-panel');

    const closeModal = () => {
      modal.classList.remove('active');
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    try {
      // Fetch the list of authorities of this type
      const authorities = await api.getCatalogAuthorities(type, 200);

      const renderTagsList = (list) => {
        if (!list.length) {
          tagsListContainer.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-secondary); font-size:0.8rem;">No se encontraron etiquetas.</div>';
          return;
        }

        tagsListContainer.innerHTML = list.map(auth => {
          const isSelected = selectedAuth && selectedAuth.id === auth.authority_id;
          return `
            <div class="tag-list-item ${isSelected ? 'active' : ''}" data-id="${auth.authority_id}" style="display:flex; align-items:center; justify-content:space-between; padding:0.45rem 0.6rem; border-radius:4px; font-size:0.78rem;">
              <span class="tag-name" style="font-weight:600; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; flex:1; min-width:0; padding-right:0.5rem;" title="${auth.name}">${auth.name}</span>
              <span class="tag-count" style="font-size:0.7rem; font-weight:700; background:rgba(0,0,0,0.05); color:var(--text-secondary); padding:0.05rem 0.35rem; border-radius:10px;">${auth.book_count} lib.</span>
            </div>
          `;
        }).join('');
      };

      const selectTag = async (tagElement, authId, authName) => {
        // Highlight active tag
        modal.querySelectorAll('.tag-list-item').forEach(el => el.classList.remove('active'));
        tagElement.classList.add('active');

        booksPanel.innerHTML = '<div style="text-align:center; padding:5rem 2rem;"><i class="fa fa-spinner fa-spin fa-2x" style="color:var(--color-accent)"></i><p style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.5rem;">Cargando obras asociadas...</p></div>';

        try {
          const detail = await api.getCatalogAuthority(authId);
          if (!detail || !detail.books || !detail.books.length) {
            booksPanel.innerHTML = '<div style="text-align:center; padding:3rem 2rem; color:var(--text-secondary); font-size:0.88rem;">No hay libros asociados a este descriptor.</div>';
            return;
          }

          booksPanel.innerHTML = `
            <div style="margin-bottom:1.25rem; border-bottom:1px solid var(--border-light); padding-bottom:0.75rem;">
              <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:${color.text}; font-weight:700; margin-bottom:0.25rem;">
                <i class="${icon}"></i> ${type}
              </div>
              <h3 style="font-family:var(--font-display); font-size:1.25rem; font-weight:700; color:var(--text-primary); margin:0 0 0.5rem 0;">${detail.name}</h3>
              <p style="font-size:0.8rem; color:var(--text-secondary); margin:0;">
                Esta etiqueta agrupa un total de <strong>${detail.book_count} obras</strong> en el catálogo del Colegio de las Vizcaínas.
              </p>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:0.5rem;">
              ${detail.books.map(book => `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:0.6rem 0.75rem; border:1px solid var(--border-light); border-radius:6px; background:var(--bg-primary); gap:1rem;">
                  <div style="min-width:0; flex:1;">
                    <a href="#/catalog/graph/${book.biblio_id}" class="book-title-link" style="font-family:var(--font-display); font-size:0.95rem; font-weight:700; color:var(--text-primary); text-decoration:none; display:block; margin-bottom:0.15rem;">${book.title}</a>
                    ${book.author ? `<div style="font-size:0.75rem; color:var(--text-secondary);"><i class="fa-solid fa-feather"></i> ${book.author}</div>` : ''}
                  </div>
                  <a href="#/catalog/graph/${book.biblio_id}" class="btn btn-outline book-graph-link" style="font-size:0.7rem; padding:0.25rem 0.55rem; white-space:nowrap; flex-shrink:0;">
                    <i class="fa-solid fa-diagram-project"></i> Ver Grafo
                  </a>
                </div>
              `).join('')}
            </div>
          `;

          // Close modal when navigating to a book detail or graph
          booksPanel.querySelectorAll('.book-title-link, .book-graph-link').forEach(link => {
            link.addEventListener('click', closeModal);
          });

        } catch (err) {
          booksPanel.innerHTML = `<div style="text-align:center; padding:3rem 2rem; color:var(--color-accent); font-size:0.88rem;">Error al cargar detalles: ${err.message}</div>`;
        }
      };

      // Set up click listeners for tag list items (delegated)
      tagsListContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.tag-list-item');
        if (item) {
          const authId = item.getAttribute('data-id');
          const authName = item.querySelector('.tag-name').textContent;
          selectTag(item, authId, authName);
        }
      });

      // Render initial tags list
      renderTagsList(authorities);

      // Set up filter input search behavior
      searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const filtered = authorities.filter(a => {
          const normName = a.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return normName.includes(query);
        });
        renderTagsList(filtered);
      });

      // If a tag was pre-selected (e.g. from clicking a badge in search results)
      if (selectedAuth && selectedAuth.id) {
        // Wait briefly for elements to render
        setTimeout(() => {
          const targetItem = tagsListContainer.querySelector(`.tag-list-item[data-id="${selectedAuth.id}"]`);
          if (targetItem) {
            targetItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
            selectTag(targetItem, selectedAuth.id, selectedAuth.name);
          } else {
            // If the pre-selected tag is not in the first 200 list, fetch it directly
            const tempItem = document.createElement('div');
            tempItem.className = 'tag-list-item active';
            tempItem.setAttribute('data-id', selectedAuth.id);
            tempItem.innerHTML = `<span class="tag-name">${selectedAuth.name}</span>`;
            selectTag(tempItem, selectedAuth.id, selectedAuth.name);
          }
        }, 50);
      }

    } catch (err) {
      tagsListContainer.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--color-accent); font-size:0.8rem;">Error al cargar descriptores: ${err.message}</div>`;
    }
  },
};
