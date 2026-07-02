import * as d3 from 'd3';
import { api } from '../utils/api.js';

export const UserGraphPage = {
  path: '/graph/:id',
  navKey: 'dashboard',
  async render(container, params) {
    const userId = params.id;
    
    // Fetch user and graph data
    const [user, graphData] = await Promise.all([
      api.getUserDetail(userId),
      api.getGraphData(userId, 10) // Top 10 similar users as requested
    ]);
    
    if (!user) {
      container.innerHTML = `
        <div class="glass-card" style="text-align:center;padding:3rem;margin-top:2rem;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size:3rem;color:var(--color-accent);margin-bottom:1rem;"></i>
          <h2 style="font-family:var(--font-display);font-weight:700;margin-bottom:0.5rem;">Lector No Encontrado</h2>
          <p style="color:var(--text-secondary);margin-bottom:1.5rem;">No pudimos recuperar la red de conexiones del lector con ID: ${userId}</p>
          <a href="#/" class="btn btn-primary">Volver al Inicio</a>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center;">
        <a href="#/user/${userId}" style="color:var(--text-secondary); text-decoration:none; font-weight:600; font-size:0.9rem;" onmouseover="this.style.color='var(--color-accent)'" onmouseout="this.style.color='var(--text-secondary)'">
          <i class="fa-solid fa-chevron-left"></i> Volver a Recomendaciones
        </a>
        <h2 style="font-family:var(--font-display); font-size:1.35rem; font-weight:700; margin:0;">
          Red de Conexiones de ${user.name}
        </h2>
      </div>

      <div class="graph-split">
        <!-- Interactive Graph Area -->
        <div class="glass-card" style="padding: 1rem; position: relative;">
          <div id="graph-container">
            <!-- Tooltip -->
            <div class="graph-tooltip" id="graph-tooltip"></div>
            
            <!-- Legend -->
            <div class="graph-legend">
              <div class="legend-item">
                <span class="legend-dot" style="background:#f43f5e; box-shadow: 0 0 6px #f43f5e;"></span>
                <span>Lector Principal (${user.name.split(' ')[0]})</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" style="background:var(--color-content); box-shadow: 0 0 6px var(--color-content);"></span>
                <span>Libros Leídos (Historial)</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" style="background:var(--color-collab); box-shadow: 0 0 6px var(--color-collab);"></span>
                <span>Lectores Afines (Taste overlap)</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" style="background:var(--color-hybrid); box-shadow: 0 0 6px var(--color-hybrid);"></span>
                <span>Libros Sugeridos (F. Colaborativo)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Detail Sidepanel -->
        <div class="glass-card" style="height: 600px; display: flex; flex-direction: column;">
          <h3 style="font-family:var(--font-display); font-weight:700; font-size:1.25rem; margin-bottom:1rem; border-bottom:1px solid var(--border-light); padding-bottom:0.4rem;">
            Inspector de Elementos
          </h3>
          <div id="graph-side-panel" class="custom-scroll" style="flex:1; overflow-y:auto;">
            <div class="graph-details-empty">
              <i class="fa-solid fa-hand-pointer"></i>
              <p>Haga clic o pase el cursor sobre cualquier elemento de la red para inspeccionar su historial de préstamos y afinidad.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Render the D3 network graph
    this.renderD3Graph(userId, graphData);
  },

  renderD3Graph(targetUserId, graph) {
    const container = document.getElementById('graph-container');
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    
    // Clear container
    d3.select('#graph-container svg').remove();

    // Create SVG element
    const svg = d3.select('#graph-container')
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Zoom and pan controls
    const g = svg.append('g');
    svg.call(d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      }));

    // Setup Force Simulation
    const simulation = d3.forceSimulation(graph.nodes)
      .force('link', d3.forceLink(graph.links)
        .id(d => d.id)
        .distance(d => {
          if (d.type === 'similarity') return 120; // Distance to similar users
          if (d.type === 'checkout' || d.type === 'shared_checkout') return 65; // Distance user to book
          return 90;
        })
      )
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(22));

    // Define color mappings for light theme
    const getColor = (d) => {
      if (d.type === 'target_user') return '#f43f5e';       // Target user (crimson red)
      if (d.type === 'target_book') return 'var(--color-content)'; // Target's checked out books (slate blue)
      if (d.type === 'similar_user') return 'var(--color-collab)'; // Similar users (sage green)
      if (d.type === 'collab_book') return 'var(--color-hybrid)';  // Collaborative recommendations (gold)
      return '#9e8f80';
    };

    // Draw Links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graph.links)
      .enter().append('line')
      .attr('class', 'link')
      .attr('stroke', d => {
        if (d.type === 'similarity') return 'var(--color-collab)';
        if (d.type === 'checkout') return 'var(--color-content)';
        if (d.type === 'shared_checkout') return 'var(--color-gold)'; // Shared checkouts (brass gold)
        return 'rgba(112, 99, 86, 0.2)';
      })
      .attr('stroke-width', d => {
        if (d.type === 'similarity') return d.value * 8; // thicker for higher Jaccard
        if (d.type === 'checkout' || d.type === 'shared_checkout') return 1.5;
        return 1;
      })
      .attr('stroke-opacity', 0.5)
      .attr('stroke-dasharray', d => {
        if (d.type === 'shared_checkout') return '3,3'; // dashed for shared book connection
        return null;
      });

    // Draw Nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(graph.nodes)
      .enter().append('circle')
      .attr('class', 'node')
      .attr('r', d => {
        if (d.type === 'target_user') return 18;
        if (d.type === 'similar_user') return 12;
        if (d.type === 'target_book') return 8;
        if (d.type === 'collab_book') return 8;
        return 6;
      })
      .attr('fill', getColor)
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      );

    // Node text labels for main user nodes
    const label = g.append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(graph.nodes.filter(d => d.type === 'target_user' || d.type === 'similar_user'))
      .enter().append('text')
      .attr('dy', -20)
      .attr('text-anchor', 'middle')
      .text(d => d.name.split(' ')[0]);

    // Tooltip and detail sidebar interactions
    const tooltip = document.getElementById('graph-tooltip');
    const sidePanel = document.getElementById('graph-side-panel');

    node.on('mouseover', function(event, d) {
      // Highlight connected edges
      link.style('stroke-opacity', l => (l.source.id === d.id || l.target.id === d.id) ? 0.9 : 0.1);
      link.style('stroke-width', l => (l.source.id === d.id || l.target.id === d.id) ? 3 : 1);
      
      // Update Tooltip
      tooltip.style.display = 'block';
      let tooltipContent = '';
      if (d.type === 'target_user') {
        tooltipContent = `<strong>Lector Principal:</strong><br>${d.name}`;
      } else if (d.type === 'similar_user') {
        tooltipContent = `<strong>Lector Afín:</strong><br>${d.name}<br>Afinidad: ${Math.round(d.similarity * 100)}%`;
      } else if (d.type === 'target_book') {
        tooltipContent = `<strong>Libro en Historial:</strong><br>${d.name}`;
      } else if (d.type === 'collab_book') {
        tooltipContent = `<strong>Sugerencia de Red:</strong><br>${d.name}`;
      }
      
      tooltip.innerHTML = tooltipContent;
      
      // Center tooltip
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
      // Reset link styles
      link.style('stroke-opacity', 0.5);
      link.style('stroke-width', l => {
        if (l.type === 'similarity') return l.value * 8;
        if (l.type === 'checkout' || l.type === 'shared_checkout') return 1.5;
        return 1;
      });
      tooltip.style.display = 'none';
    });

    // Node click handler
    node.on('click', async (event, d) => {
      sidePanel.innerHTML = '<div style="text-align:center; padding:3rem;"><i class="fa fa-spinner fa-spin fa-2x" style="color:var(--color-accent)"></i></div>';
      
      try {
        if (d.type === 'similar_user' || d.type === 'target_user') {
          // Fetch user detail
          const uid = d.id;
          const userDetail = await api.getUserDetail(uid);
          
          let jaccardText = '';
          let sharedBooksHtml = '';
          
          if (d.type === 'similar_user') {
            const jaccardPct = Math.round(d.similarity * 100);
            jaccardText = `
              <div style="background:var(--bg-secondary); border:1px solid var(--border-light); border-radius:0.25rem; padding:0.75rem; margin-bottom:1rem; text-align:center;">
                <div style="font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase; font-weight:600;">Afinidad de Lectura (Jaccard)</div>
                <div style="font-size:1.5rem; font-weight:700; color:var(--color-collab); font-family:var(--font-display);">${jaccardPct}%</div>
              </div>
            `;
            
            // Find shared books from links
            const sharedBids = graph.links
              .filter(l => l.type === 'shared_checkout' && l.source.id === uid)
              .map(l => l.target.id.replace('book_', ''));
              
            const sharedBooks = userDetail.checkouts.filter(b => sharedBids.includes(b.book_id));
            
            sharedBooksHtml = `
              <h4 style="font-size:0.85rem; font-weight:700; margin-bottom:0.5rem; color:var(--color-gold);"><i class="fa-solid fa-handshake"></i> Libros Compartidos (${sharedBooks.length})</h4>
              <div style="display:flex; flex-direction:column; gap:0.4rem; margin-bottom:1rem;">
                ${sharedBooks.map(b => `
                  <div class="inspector-shared-book">
                    <i class="fa-regular fa-book"></i>
                    <span>${b.title}</span>
                  </div>
                `).join('')}
              </div>
            `;
          }

          sidePanel.innerHTML = `
            <div>
              <h4 style="font-family:var(--font-display); font-size:1.25rem; font-weight:700; margin-bottom:0.25rem;">${userDetail.name}</h4>
              <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:1rem;"><i class="fa-regular fa-envelope"></i> ${userDetail.email}</p>
              
              ${jaccardText}
              ${sharedBooksHtml}
              
              <h4 style="font-size:0.85rem; font-weight:700; margin-bottom:0.5rem;"><i class="fa-solid fa-list-check"></i> Historial de Préstamos (${userDetail.checkouts.length})</h4>
              <div class="inspector-scroll-list">
                ${userDetail.checkouts.map(b => `
                  <a href="#/book/${b.book_id}" class="inspector-book-item">
                    <i class="fa-regular fa-book"></i>
                    <span class="inspector-book-title">${b.title}</span>
                  </a>
                `).join('')}
              </div>
              
              <a href="#/user/${uid}" class="btn btn-primary" style="width:100%; justify-content:center; margin-top:1.25rem; font-size:0.8rem;">
                Ver Recomendaciones del Lector
              </a>
            </div>
          `;
        } else if (d.type === 'target_book' || d.type === 'collab_book') {
          // Fetch book detail
          const bid = d.id.replace('book_', '');
          const bookDetail = await api.getBookDetail(bid);
          
          let recReason = '';
          if (d.type === 'collab_book') {
            // Find who checked it out among top similar users
            const readers = graph.links
              .filter(l => l.target.id === d.id && l.type === 'checkout')
              .map(l => l.source.name);
              
            recReason = `
              <div style="background:rgba(179, 143, 77, 0.08); border:1px solid rgba(179, 143, 77, 0.2); border-radius:0.25rem; padding:0.75rem; margin-bottom:1rem; font-size:0.8rem;">
                <span style="font-weight:700; color:var(--color-hybrid);"><i class="fa-solid fa-lightbulb"></i> Sugerencia de Red (Colaborativa)</span><br>
                Obra solicitada por otros lectores de gustos afines: <strong>${readers.join(', ')}</strong>.
              </div>
            `;
          } else {
            recReason = `
              <div style="background:rgba(86, 105, 122, 0.08); border:1px solid rgba(86, 105, 122, 0.2); border-radius:0.25rem; padding:0.75rem; margin-bottom:1rem; font-size:0.8rem;">
                <span style="font-weight:700; color:var(--color-content);"><i class="fa-solid fa-book-open"></i> En Historial Activo</span><br>
                Esta obra forma parte de sus préstamos registrados.
              </div>
            `;
          }

          sidePanel.innerHTML = `
            <div>
              <span class="source-badge ${d.type === 'target_book' ? 'content' : 'both'}" style="font-size:0.65rem; margin-bottom:0.4rem;">
                Obra N°: ${bid}
              </span>
              <h4 style="font-family:var(--font-display); font-size:1.25rem; font-weight:700; margin-bottom:0.75rem; line-height:1.2;">${bookDetail.title}</h4>
              
              ${recReason}
              
              <h5 style="font-size:0.8rem; font-weight:700; margin-bottom:0.25rem;">Sinopsis:</h5>
              <div class="inspector-synopsis">
                ${bookDetail.description || 'No hay descripción disponible para esta obra.'}
              </div>
              
              <a href="#/book/${bid}" class="btn btn-primary" style="width:100%; justify-content:center; font-size:0.8rem;">
                Explorar Títulos Similares
              </a>
            </div>
          `;
        }
      } catch (err) {
        sidePanel.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--color-accent);">Error al cargar detalle: ${err.message}</div>`;
      }
    });

    // Tick Simulation function
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

    // Drag Helper Functions
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
  }
};
