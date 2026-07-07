import { api } from '../utils/api.js';
import * as d3 from 'd3';

// Authority type colors for D3 nodes
const AUTH_NODE_COLORS = {
  'Autor':             '#7c1933',
  'Tema':              '#52755e',
  'Tema (Persona)':    '#52755e',
  'Tema (Institución)':'#52755e',
  'Lugar':             '#56697a',
  'Institución / Organización': '#b38f4d',
  'Título Uniforme':   '#805a96',
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

function getNodeColor(d) {
  if (d.type === 'target_book') return '#7c1933';
  if (d.type === 'connected_book') return '#56697a';
  if (d.type === 'authority') return AUTH_NODE_COLORS[d.authority_type] || '#888';
  return '#888';
}

function getNodeRadius(d) {
  if (d.type === 'target_book') return 18;
  if (d.type === 'authority') return Math.min(8 + (d.book_count || 1) * 1.5, 16);
  if (d.type === 'connected_book') return 10;
  return 8;
}

export const CatalogGraphPage = {
  path: '/catalog/graph/:id',
  navKey: 'catalog',

  async render(container, params) {
    const biblioId = params.id;

    const [bookDetail, graph] = await Promise.all([
      api.getCatalogBook(biblioId),
      api.getCatalogGraph(biblioId, 15),
    ]);

    container.innerHTML = `
      <div style="margin-bottom:1.5rem;">
        <a href="#/catalog" style="color:var(--text-secondary); text-decoration:none; font-size:0.85rem;">
          <i class="fa-solid fa-arrow-left"></i> Volver al Catálogo
        </a>
      </div>

      <div class="glass-card" style="padding:0.75rem 1rem; background:rgba(86,105,122,0.06); border:1px solid var(--border-light); margin-bottom:1.5rem; display:flex; align-items:center; gap:0.75rem; border-radius:0.25rem;">
        <i class="fa-solid fa-circle-info" style="color:var(--color-slate); font-size:1.15rem; flex-shrink:0;"></i>
        <p style="font-size:0.8rem; color:var(--text-secondary); margin:0; line-height:1.4;">
          <strong>Nota de Desempeño:</strong> Por motivos de rendimiento del servidor y velocidad de carga, esta gráfica solo muestra conexiones de libros en Koha que comparten un <strong>mínimo de 3 autoridades</strong>.
        </p>
      </div>

      <div class="glass-card" style="margin-bottom:1.5rem;">
        <h2 style="font-family:var(--font-display); font-size:1.6rem; font-weight:700; margin-bottom:0.35rem; line-height:1.2;">
          ${bookDetail.title}
        </h2>
        ${bookDetail.author ? `<p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:0.75rem;"><i class="fa-solid fa-feather"></i> ${bookDetail.author}</p>` : ''}
        <p style="color:var(--text-muted); font-size:0.82rem;">
          <i class="fa-solid fa-diagram-project"></i> ${bookDetail.total_connections} conexiones con otros libros
          &bull; ${bookDetail.authorities.length} autoridades vinculadas
        </p>
      </div>

      <div class="graph-split">
        <div>
          <div id="catalog-graph-container" class="glass-card" style="padding:0; overflow:hidden;">
            <div id="catalog-graph" style="width:100%; height:680px; position:relative;">
            </div>
            <div class="graph-tooltip" id="catalog-tooltip"></div>
            <div class="graph-legend">
              <div style="font-weight:700; font-size:0.8rem; margin-bottom:0.25rem;">Leyenda</div>
              <div class="legend-item"><div class="legend-dot" style="background:#7c1933;"></div> Libro consultado</div>
              <div class="legend-item"><div class="legend-dot" style="background:#56697a;"></div> Libro conectado</div>
              <div class="legend-item"><div class="legend-dot" style="background:#7c1933; opacity:0.6;"></div> Autor</div>
              <div class="legend-item"><div class="legend-dot" style="background:#52755e;"></div> Tema</div>
              <div class="legend-item"><div class="legend-dot" style="background:#56697a; opacity:0.6;"></div> Lugar</div>
              <div class="legend-item"><div class="legend-dot" style="background:#b38f4d;"></div> Institución / Organización</div>
              <div class="legend-item"><div class="legend-dot" style="background:#805a96;"></div> Título Uniforme</div>
            </div>
          </div>
        </div>

        <div id="catalog-side-panel" class="graph-details-panel">
          <div class="glass-card">
            <div class="graph-details-empty">
              <i class="fa-regular fa-hand-pointer"></i>
              <p>Haz clic en un nodo del grafo para ver sus detalles.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    this.renderGraph(graph, bookDetail);
  },

  renderGraph(graph, bookDetail) {
    const container = document.getElementById('catalog-graph');
    const tooltip = document.getElementById('catalog-tooltip');
    const sidePanel = document.getElementById('catalog-side-panel');

    if (!container || !graph.nodes.length) return;

    const width = container.clientWidth;
    const height = 680;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // Build simulation
    const simulation = d3.forceSimulation(graph.nodes)
      .force('link', d3.forceLink(graph.links).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => getNodeRadius(d) + 5));

    // Draw links
    const link = svg.append('g')
      .selectAll('line')
      .data(graph.links)
      .join('line')
      .attr('stroke', d => {
        const authColor = AUTH_NODE_COLORS[d.authority_type];
        return authColor || '#ccc';
      })
      .attr('stroke-opacity', 0.35)
      .attr('stroke-width', 1.5);

    // Draw nodes
    const node = svg.append('g')
      .selectAll('circle')
      .data(graph.nodes)
      .join('circle')
      .attr('r', d => getNodeRadius(d))
      .attr('fill', d => getNodeColor(d))
      .attr('class', 'node')
      .attr('stroke', '#fff')
      .attr('stroke-width', d => d.type === 'target_book' ? 3 : 1.5)
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Draw labels
    const label = svg.append('g')
      .selectAll('text')
      .data(graph.nodes)
      .join('text')
      .text(d => {
        const maxLen = d.type === 'authority' ? 18 : 22;
        return d.name.length > maxLen ? d.name.substring(0, maxLen) + '…' : d.name;
      })
      .attr('text-anchor', 'middle')
      .attr('dy', d => getNodeRadius(d) + 14)
      .style('font-size', d => d.type === 'target_book' ? '12px' : '10px')
      .style('font-weight', d => d.type === 'target_book' ? '700' : '500')
      .style('fill', 'var(--text-primary)')
      .style('pointer-events', 'none');

    // Hover effects
    node.on('mouseover', function(event, d) {
      tooltip.style.display = 'block';

      // Highlight connected links
      link.style('stroke-opacity', l =>
        (l.source.id === d.id || l.target.id === d.id) ? 0.9 : 0.1
      );
      link.style('stroke-width', l =>
        (l.source.id === d.id || l.target.id === d.id) ? 3 : 1
      );

      let content = '';
      if (d.type === 'target_book') {
        content = `<strong>Libro Consultado:</strong><br>${d.name}`;
      } else if (d.type === 'connected_book') {
        content = `<strong>Libro Conectado:</strong><br>${d.name}<br>Peso: ${d.weight} autoridades compartidas`;
      } else if (d.type === 'authority') {
        content = `<strong>${d.authority_type}:</strong><br>${d.name}<br>Vinculado a ${d.book_count} libros`;
      }

      tooltip.innerHTML = content;
      const rect = container.getBoundingClientRect();
      tooltip.style.left = `${event.clientX - rect.left + 15}px`;
      tooltip.style.top = `${event.clientY - rect.top + 15}px`;
    });

    node.on('mousemove', function(event) {
      const rect = container.getBoundingClientRect();
      tooltip.style.left = `${event.clientX - rect.left + 15}px`;
      tooltip.style.top = `${event.clientY - rect.top + 15}px`;
    });

    node.on('mouseout', function() {
      link.style('stroke-opacity', 0.35);
      link.style('stroke-width', 1.5);
      tooltip.style.display = 'none';
    });

    // Click handler
    node.on('click', async (event, d) => {
      sidePanel.innerHTML = '<div class="glass-card" style="text-align:center; padding:3rem;"><i class="fa fa-spinner fa-spin fa-2x" style="color:var(--color-accent)"></i></div>';

      try {
        if (d.type === 'target_book' || d.type === 'connected_book') {
          const bid = d.id.replace('book_', '');
          const detail = await api.getCatalogBook(bid);

          sidePanel.innerHTML = `
            <div class="glass-card">
              <h4 style="font-family:var(--font-display); font-size:1.15rem; font-weight:700; margin-bottom:0.35rem; line-height:1.2;">${detail.title}</h4>
              ${detail.author ? `<p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:1rem;"><i class="fa-solid fa-feather"></i> ${detail.author}</p>` : ''}

              <h5 style="font-size:0.82rem; font-weight:700; margin-bottom:0.5rem;">
                <i class="fa-solid fa-tags" style="color:var(--color-collab);"></i> Autoridades (${detail.authorities.length})
              </h5>
              <div style="display:flex; flex-wrap:wrap; gap:0.35rem; margin-bottom:1.25rem;">
                ${detail.authorities.map(a => {
                  const color = AUTH_NODE_COLORS[a.type] || '#888';
                  const icon = AUTH_TYPE_ICONS[a.type] || 'fa-solid fa-tag';
                  return `<span class="catalog-auth-badge" style="background:${color}15; border-color:${color}40; color:${color};"><i class="${icon}"></i> ${a.name}</span>`;
                }).join('')}
              </div>

              ${detail.connected_books.length > 0 ? `
                <h5 style="font-size:0.82rem; font-weight:700; margin-bottom:0.5rem;">
                  <i class="fa-solid fa-diagram-project" style="color:var(--color-gold);"></i> Libros Conectados (${detail.total_connections})
                </h5>
                <div class="inspector-scroll-list">
                  ${detail.connected_books.slice(0, 10).map(cb => `
                    <a href="#/catalog/graph/${cb.biblio_id}" class="inspector-book-item">
                      <i class="fa-regular fa-book"></i>
                      <span class="inspector-book-title">${cb.title}</span>
                      <span class="similarity-badge">${cb.weight}</span>
                    </a>
                  `).join('')}
                </div>
              ` : ''}

              ${d.type === 'connected_book' ? `
                <a href="#/catalog/graph/${bid}" class="btn btn-primary" style="width:100%; justify-content:center; margin-top:1rem; font-size:0.8rem;">
                  Ver Grafo de Este Libro
                </a>
              ` : ''}
            </div>
          `;
        } else if (d.type === 'authority') {
          const authId = d.id.replace('auth_', '');
          const detail = await api.getCatalogAuthority(authId);
          const color = AUTH_NODE_COLORS[d.authority_type] || '#888';
          const icon = AUTH_TYPE_ICONS[d.authority_type] || 'fa-solid fa-tag';

          sidePanel.innerHTML = `
            <div class="glass-card">
              <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.75rem;">
                <span style="width:2rem; height:2rem; border-radius:50%; background:${color}; display:flex; align-items:center; justify-content:center;">
                  <i class="${icon}" style="color:#fff; font-size:0.85rem;"></i>
                </span>
                <div>
                  <h4 style="font-family:var(--font-display); font-size:1.1rem; font-weight:700; margin:0; line-height:1.2;">${detail.name}</h4>
                  <span style="font-size:0.75rem; color:${color}; font-weight:600;">${detail.type}</span>
                </div>
              </div>

              <h5 style="font-size:0.82rem; font-weight:700; margin-bottom:0.5rem;">
                <i class="fa-solid fa-book" style="color:var(--color-accent);"></i> Libros Vinculados (${detail.book_count})
              </h5>
              <div class="inspector-scroll-list">
                ${detail.books.map(b => `
                  <a href="#/catalog/graph/${b.biblio_id}" class="inspector-book-item">
                    <i class="fa-regular fa-book"></i>
                    <span class="inspector-book-title">${b.title}</span>
                  </a>
                `).join('')}
              </div>
            </div>
          `;
        }
      } catch (err) {
        sidePanel.innerHTML = `<div class="glass-card" style="text-align:center; padding:2rem; color:var(--color-accent);">Error: ${err.message}</div>`;
      }
    });

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      label
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    });

    // Drag helpers
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  },
};
