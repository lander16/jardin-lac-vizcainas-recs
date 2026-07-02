import { api } from '../utils/api.js';

export const UserRecommendationsPage = {
  path: '/user/:id',
  navKey: 'dashboard',
  async render(container, params) {
    const userId = params.id;
    
    // Fetch initial details and recommendations
    const [user, recsData] = await Promise.all([
      api.getUserDetail(userId),
      api.getRecommendations(userId, 0.5)
    ]);
    
    if (!user) {
      container.innerHTML = `
        <div class="glass-card" style="text-align:center;padding:3rem;margin-top:2rem;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size:3rem;color:var(--color-accent);margin-bottom:1rem;"></i>
          <h2 style="font-family:var(--font-display);font-weight:700;margin-bottom:0.5rem;">Lector No Encontrado</h2>
          <p style="color:var(--text-secondary);margin-bottom:1.5rem;">No se pudieron recuperar los datos del lector con ID: ${userId}</p>
          <a href="#/" class="btn btn-primary">Volver al Inicio</a>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="margin-bottom:1.5rem;">
        <a href="#/" style="color:var(--text-secondary); text-decoration:none; font-weight:600; font-size:0.9rem;" onmouseover="this.style.color='var(--color-accent)'" onmouseout="this.style.color='var(--text-secondary)'">
          <i class="fa-solid fa-chevron-left"></i> Volver al Inicio
        </a>
      </div>

      <div class="user-profile-header">
        <div class="user-info-block">
          <div class="avatar-large">
            ${user.name.split(' ').map(n => n[0]).slice(0,2).join('')}
          </div>
          <div class="user-details">
            <h2>${user.name}</h2>
            <p><i class="fa-regular fa-id-card"></i> Credencial: ${user.cardnumber} &bull; <i class="fa-regular fa-envelope"></i> ${user.email}</p>
          </div>
        </div>
        <div>
          <a href="#/graph/${user.user_id}" class="btn btn-secondary">
            <i class="fa-solid fa-circle-nodes"></i> Ver Red de Conexiones
          </a>
        </div>
      </div>

      <div class="split-view">
        <!-- Sidebar controls -->
        <div class="controls-sidebar">
          
          <!-- Alpha weight slider -->
          <div class="glass-card slider-container">
            <h3 style="font-family:var(--font-display); font-size:1.25rem; font-weight:700; display:flex; align-items:center; gap:0.4rem;">
              <i class="fa-solid fa-sliders" style="color:var(--color-gold)"></i> Balance de Recomendación
            </h3>
            <p style="font-size:0.85rem; color:var(--text-secondary); line-height:1.4;">Ajuste el balance entre similitudes de contenido (descripciones de libros) y filtrado colaborativo (red de lectores).</p>
            
            <input type="range" id="alpha-slider" min="0" max="1" step="0.05" value="0.5">
            
            <div class="slider-labels">
              <span class="slider-label-content"><i class="fa-solid fa-tag"></i> Contenido (Coseno)</span>
              <span class="slider-label-collab">Red (Jaccard) <i class="fa-solid fa-user-friends"></i></span>
            </div>
            
            <div class="alpha-value-display" id="alpha-value-display">
              Balance: 50% Contenido / 50% Red
            </div>
          </div>

          <!-- Active checkouts -->
          <div class="glass-card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
              <h3 style="font-family:var(--font-display); font-size:1.25rem; font-weight:700; margin:0;">
                <i class="fa-solid fa-book-open" style="color:var(--color-accent)"></i> Historial Activo
              </h3>
              <span class="source-badge content" style="font-family:var(--font-display); font-weight:700; padding:0.15rem 0.5rem; font-size:0.75rem;">
                ${user.checkouts.length} libros
              </span>
            </div>
            <button class="btn btn-primary" id="btn-add-checkout" style="width:100%; justify-content:center; margin-bottom:1rem; padding:0.45rem;">
              <i class="fa-solid fa-plus"></i> Simular Préstamo de Libro
            </button>
            <div class="checkout-list">
              ${user.checkouts.map(book => `
                <div class="checkout-item">
                  <div class="checkout-item-title" title="${book.title}">
                    <a href="#/book/${book.book_id}" style="color:var(--text-primary); text-decoration:none;" onmouseover="this.style.color='var(--color-accent)'" onmouseout="this.style.color='var(--text-primary)'">${book.title}</a>
                  </div>
                  <i class="fa-regular fa-circle-check" style="color:var(--color-collab)"></i>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Recommendations Column -->
        <div style="display:flex; flex-direction:column; gap:1rem;">
          <h2 style="font-family:var(--font-display); font-size:1.75rem; font-weight:700; display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
            <i class="fa-solid fa-star" style="color:var(--color-gold)"></i> Sugerencias de Lectura
          </h2>
          
          <div class="recs-container" id="recs-container">
            ${this.renderRecommendationsList(recsData.recommendations)}
          </div>
        </div>
      </div>

      <!-- Add Checkout Modal overlay -->
      <div class="modal-overlay" id="checkout-modal">
        <div class="glass-card modal-content">
          <div class="modal-header">
            <h3>Registrar Simulación de Préstamo</h3>
            <button class="modal-close" id="modal-close-btn">&times;</button>
          </div>
          <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:1rem;">Busque un libro por título o palabra clave en el catálogo para agregarlo al historial de ${user.name.split(' ')[0]}.</p>
          <div class="search-container" style="margin-bottom:0;">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input type="text" id="modal-book-search" class="search-input" placeholder="Buscar libros por título o palabra clave...">
          </div>
          <div class="checkout-search-results" id="modal-search-results">
            <div style="text-align:center; padding:2rem; color:var(--text-secondary);">Comience a escribir para buscar libros...</div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(userId, user.checkouts);
  },

  renderRecommendationsList(recs) {
    if (recs.length === 0) {
      return `
        <div class="glass-card" style="text-align:center;padding:3rem;">
          <i class="fa-solid fa-heart-crack" style="font-size:3rem;color:var(--text-muted);margin-bottom:1rem;"></i>
          <h3 style="font-family:var(--font-display);font-weight:700;margin-bottom:0.5rem;">No hay sugerencias disponibles</h3>
          <p style="color:var(--text-secondary);">Agregue libros al historial activo de este lector para poder generar sugerencias.</p>
        </div>
      `;
    }

    return recs.map(rec => {
      let badgeClass = '';
      let badgeLabel = '';
      let badgeIcon = '';
      let barFillClass = '';
      
      if (rec.source === 'both') {
        badgeClass = 'both';
        badgeLabel = 'Híbrido';
        badgeIcon = '<i class="fa-solid fa-circle-nodes"></i>';
        barFillClass = 'both';
      } else if (rec.source === 'content') {
        badgeClass = 'content';
        badgeLabel = 'Contenido';
        badgeIcon = '<i class="fa-solid fa-tag"></i>';
        barFillClass = 'content';
      } else {
        badgeClass = 'collaborative';
        badgeLabel = 'Red de Lectura';
        badgeIcon = '<i class="fa-solid fa-user-friends"></i>';
        barFillClass = 'collaborative';
      }

      // Convert score to percentage
      const scorePct = Math.round(rec.hybrid_score * 100);

      return `
        <div class="glass-card rec-card">
          <div class="rec-header">
            <div class="rec-title-desc">
              <a href="#/book/${rec.book_id}" style="text-decoration:none; color:inherit;">
                <h3 class="rec-title">${rec.title}</h3>
              </a>
              <p class="rec-description">${rec.description || 'No hay descripción disponible para esta obra.'}</p>
            </div>
            
            <div class="score-badge-area">
              <span class="source-badge ${badgeClass}">
                ${badgeIcon} ${badgeLabel}
              </span>
              <div class="score-meter-container">
                <div class="score-track">
                  <div class="score-fill ${barFillClass}" style="width: ${scorePct}%"></div>
                </div>
                <span class="score-label">${scorePct}%</span>
              </div>
            </div>
          </div>
          
          <!-- Accordion explanation trigger -->
          <div class="explanation-btn" data-book-id="${rec.book_id}">
            <span>¿Por qué esta sugerencia?</span> <i class="fa-solid fa-chevron-down"></i>
          </div>
          
          <!-- Explanation details -->
          <div class="explanation-panel" id="exp-panel-${rec.book_id}">
            ${this.renderExplanationDetails(rec.explanation)}
          </div>
        </div>
      `;
    }).join('');
  },

  renderExplanationDetails(exp) {
    let contentHtml = '';
    let collabHtml = '';

    if (exp.content_details && exp.content_details.length > 0) {
      contentHtml = `
        <div class="explanation-section">
          <div class="explanation-title content">
            <i class="fa-solid fa-tag"></i> Afinidad en la temática de la obra
          </div>
          ${exp.content_details.map(item => {
            const pct = Math.round(item.similarity * 100);
            return `
              <div class="explanation-row">
                <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:320px;" title="${item.related_title}">
                  Similar a: <strong>${item.related_title}</strong>
                </div>
                <div class="explanation-bar-wrapper">
                  <div class="explanation-bar">
                    <div class="explanation-bar-fill content" style="width:${pct}%"></div>
                  </div>
                  <span style="font-weight:600; font-family:monospace; font-size:0.75rem;">${pct}%</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    if (exp.collab_details && exp.collab_details.length > 0) {
      collabHtml = `
        <div class="explanation-section">
          <div class="explanation-title collab">
            <i class="fa-solid fa-user-friends"></i> Preferencia en lectores similares
          </div>
          ${exp.collab_details.map(item => {
            const pct = Math.round(item.similarity * 100);
            return `
              <div class="explanation-row">
                <div>Prestado a: <strong>${item.name}</strong></div>
                <div class="explanation-bar-wrapper">
                  <span style="font-size:0.75rem; color:var(--text-muted); margin-right:0.2rem;">Afinidad de gustos:</span>
                  <div class="explanation-bar">
                    <div class="explanation-bar-fill collab" style="width:${pct}%"></div>
                  </div>
                  <span style="font-weight:600; font-family:monospace; font-size:0.75rem;">${pct}%</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    return contentHtml + (contentHtml && collabHtml ? '<div style="margin: 0.75rem 0; border-top:1px solid rgba(0,0,0,0.05);"></div>' : '') + collabHtml;
  },

  bindEvents(userId, existingCheckouts) {
    const alphaSlider = document.getElementById('alpha-slider');
    const alphaVal = document.getElementById('alpha-value-display');
    const recsContainer = document.getElementById('recs-container');
    const addCheckoutBtn = document.getElementById('btn-add-checkout');
    const modal = document.getElementById('checkout-modal');
    const modalClose = document.getElementById('modal-close-btn');
    const modalSearch = document.getElementById('modal-book-search');
    const modalResults = document.getElementById('modal-search-results');
    
    // Set of existing book_ids for checkout checks
    const existingIds = new Set(existingCheckouts.map(b => b.book_id));

    // Dynamic slider updates
    if (alphaSlider && alphaVal && recsContainer) {
      alphaSlider.addEventListener('input', async (e) => {
        const val = parseFloat(e.target.value);
        
        // Update label
        const contentPct = Math.round(val * 100);
        const collabPct = 100 - contentPct;
        alphaVal.innerHTML = `Balance: ${contentPct}% Contenido / ${collabPct}% Red`;
        
        // Fetch recommendations dynamically!
        try {
          const freshData = await api.getRecommendations(userId, val);
          recsContainer.innerHTML = this.renderRecommendationsList(freshData.recommendations);
          
          // Re-bind accordion clicks on dynamically generated elements
          this.bindAccordions();
        } catch (err) {
          console.error("Failed to fetch dynamic recommendations:", err);
        }
      });
    }

    // Modal controls
    if (addCheckoutBtn && modal && modalClose) {
      addCheckoutBtn.addEventListener('click', () => {
        modal.classList.add('active');
        modalSearch.value = '';
        modalSearch.focus();
        modalResults.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-secondary);">Comience a escribir para buscar libros...</div>';
      });

      modalClose.addEventListener('click', () => {
        modal.classList.remove('active');
      });

      // Hide modal when clicking overlay background
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });

      // Search inside modal
      let searchTimeout = null;
      modalSearch.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
          modalResults.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-secondary);">Escriba al menos 2 caracteres para buscar...</div>';
          return;
        }

        modalResults.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-secondary);"><i class="fa fa-spinner fa-spin"></i> Buscando...</div>';
        
        searchTimeout = setTimeout(async () => {
          try {
            const results = await api.searchBooks(query);
            if (results.length === 0) {
              modalResults.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-secondary);">No se encontraron obras que coincidan.</div>';
              return;
            }

            modalResults.innerHTML = results.map(book => {
              const alreadyRead = existingIds.has(book.book_id);
              return `
                <div class="search-result-item">
                  <div class="search-result-info">
                    <div class="search-result-title">${book.title}</div>
                    <div class="search-result-desc">${book.description || 'Sin descripción disponible'}</div>
                  </div>
                  ${alreadyRead ? `
                    <button class="btn btn-secondary" style="font-size:0.75rem; padding:0.25rem 0.5rem;" disabled>Leído</button>
                  ` : `
                    <button class="btn btn-primary checkout-action-btn" data-book-id="${book.book_id}" data-book-title="${book.title.replace(/"/g, '&quot;')}" style="font-size:0.75rem; padding:0.25rem 0.5rem;">
                      Prestar
                    </button>
                  `}
                </div>
              `;
            }).join('');

            // Bind click to checkout action button
            document.querySelectorAll('.checkout-action-btn').forEach(btn => {
              btn.addEventListener('click', async (e) => {
                const bId = e.target.dataset.bookId;
                const bTitle = e.target.dataset.bookTitle;
                
                try {
                  e.target.disabled = true;
                  e.target.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
                  
                  await api.checkoutBook(userId, bId, bTitle);
                  
                  alert(`¡Préstamo de "${bTitle}" registrado con éxito! Actualizando recomendaciones...`);
                  modal.classList.remove('active');
                  
                  // Reload page
                  window.location.reload();
                } catch (err) {
                  alert(`Error al registrar el préstamo: ${err.message}`);
                  e.target.disabled = false;
                  e.target.innerHTML = 'Prestar';
                }
              });
            });

          } catch (err) {
            modalResults.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--color-accent);">Error en la búsqueda: ${err.message}</div>`;
          }
        }, 300);
      });
    }

    // Accordions
    this.bindAccordions();
  },

  bindAccordions() {
    document.querySelectorAll('.explanation-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Handle click on nested spans/icons
        const targetBtn = e.target.closest('.explanation-btn');
        const bookId = targetBtn.dataset.bookId;
        const panel = document.getElementById(`exp-panel-${bookId}`);
        const icon = targetBtn.querySelector('i');

        if (panel) {
          const isActive = panel.classList.contains('active');
          if (isActive) {
            panel.classList.remove('active');
            icon.className = 'fa-solid fa-chevron-down';
          } else {
            panel.classList.add('active');
            icon.className = 'fa-solid fa-chevron-up';
          }
        }
      });
    });
  }
};
