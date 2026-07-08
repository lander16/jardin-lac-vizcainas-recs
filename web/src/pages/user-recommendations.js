import { api } from '../utils/api.js';

export const UserRecommendationsPage = {
  path: '/user/:id',
  navKey: 'dashboard',
  async render(container, params) {
    const userId = params.id;
    
    // Fetch initial details and recommendations
    const [user, recsData] = await Promise.all([
      api.getUserDetail(userId),
      api.getRecommendations(userId, 0.33, 0.33, 0.34)
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
          
          <!-- Weight sliders -->
          <div class="glass-card slider-container">
            <h3 style="font-family:var(--font-display); font-size:1.25rem; font-weight:700; display:flex; align-items:center; gap:0.4rem; margin-bottom: 0.5rem;">
              <i class="fa-solid fa-sliders" style="color:var(--color-gold)"></i> Balance de Recomendación
            </h3>
            <p style="font-size:0.85rem; color:var(--text-secondary); line-height:1.4; margin-bottom: 1.25rem;">Ajuste la relevancia de cada dimensión para personalizar las sugerencias de lectura.</p>
            
            <!-- Content weight slider -->
            <div style="margin-bottom:1rem;">
              <div class="slider-labels" style="display:flex; justify-content:space-between; margin-bottom:0.25rem; font-size:0.8rem; font-weight:600;">
                <span><i class="fa-solid fa-tag" style="color:var(--color-content)"></i> Contenido (Temático)</span>
                <span id="weight-content-pct" style="color:var(--color-content)">33%</span>
              </div>
              <input type="range" id="weight-content-slider" class="slider-range-content" min="0" max="100" step="1" value="33" style="width:100%;">
            </div>

            <!-- Collab weight slider -->
            <div style="margin-bottom:1rem;">
              <div class="slider-labels" style="display:flex; justify-content:space-between; margin-bottom:0.25rem; font-size:0.8rem; font-weight:600;">
                <span><i class="fa-solid fa-user-group" style="color:var(--color-collab)"></i> Lectores (Afinidad)</span>
                <span id="weight-collab-pct" style="color:var(--color-collab)">33%</span>
              </div>
              <input type="range" id="weight-collab-slider" class="slider-range-collab" min="0" max="100" step="1" value="33" style="width:100%;">
            </div>

            <!-- Authority weight slider -->
            <div style="margin-bottom:1rem;">
              <div class="slider-labels" style="display:flex; justify-content:space-between; margin-bottom:0.25rem; font-size:0.8rem; font-weight:600;">
                <span><i class="fa-solid fa-bookmark" style="color:var(--color-authority)"></i> Autoridades (Catálogo)</span>
                <span id="weight-auth-pct" style="color:var(--color-authority)">34%</span>
              </div>
              <input type="range" id="weight-auth-slider" class="slider-range-auth" min="0" max="100" step="1" value="34" style="width:100%;">
            </div>
            
            <div class="alpha-value-display" id="weights-value-display" style="font-size:0.8rem; text-align:center; font-weight:700; border-top:1px solid var(--border-light); padding-top:0.75rem; margin-top:0.75rem; color:var(--text-secondary);">
              Configuración: 33% Contenido / 33% Lectores / 34% Autoridades
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
      
      if (rec.source === 'all') {
        badgeClass = 'both';
        badgeLabel = 'Alta Recomendación';
        badgeIcon = '<i class="fa-solid fa-star" style="color:var(--color-gold);"></i>';
        barFillClass = 'all';
      } else if (rec.source === 'multiple') {
        badgeClass = 'both';
        badgeLabel = 'Multi-fuente';
        badgeIcon = '<i class="fa-solid fa-layer-group"></i>';
        barFillClass = 'multiple';
      } else if (rec.source === 'content') {
        badgeClass = 'content';
        badgeLabel = 'Contenido';
        badgeIcon = '<i class="fa-solid fa-tag"></i>';
        barFillClass = 'content';
      } else if (rec.source === 'collaborative') {
        badgeClass = 'collaborative';
        badgeLabel = 'Red de Lectores';
        badgeIcon = '<i class="fa-solid fa-user-group"></i>';
        barFillClass = 'collaborative';
      } else if (rec.source === 'authority') {
        badgeClass = 'authority';
        badgeLabel = 'Autoridades';
        badgeIcon = '<i class="fa-solid fa-bookmark"></i>';
        barFillClass = 'authority';
      } else {
        badgeClass = 'both';
        badgeLabel = 'Recomendado';
        badgeIcon = '<i class="fa-solid fa-star"></i>';
        barFillClass = 'both';
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
    let authHtml = '';

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

    if (exp.auth_details && exp.auth_details.length > 0) {
      authHtml = `
        <div class="explanation-section">
          <div class="explanation-title auth">
            <i class="fa-solid fa-bookmark"></i> Conexión por autoridades Koha
          </div>
          ${exp.auth_details.map(item => {
            const authList = item.shared_authorities.map(auth => {
              let typeLabel = auth.type;
              let badgeColor = '';
              if (auth.type === 'Autor') { badgeColor = '#7c1933'; }
              else if (auth.type === 'Tema') { badgeColor = '#52755e'; }
              else if (auth.type === 'Lugar') { badgeColor = '#56697a'; }
              else if (auth.type === 'Institución / Organización' || auth.type === 'Corporativo') { badgeColor = '#b38f4d'; }
              else { badgeColor = '#7d4f9b'; }
              
              return `<span class="tag" style="background:${badgeColor}15; color:${badgeColor}; border:1px solid ${badgeColor}30; padding:0.1rem 0.35rem; border-radius:3px; font-size:0.75rem; font-weight:600; margin-right:0.25rem; white-space:nowrap; display:inline-block; margin-top:0.25rem;">${auth.name} (${typeLabel})</span>`;
            }).join(' ');

            return `
              <div class="explanation-row" style="flex-direction:column; align-items:flex-start; gap:0.25rem; margin-bottom:0.75rem;">
                <div style="font-size:0.8rem;">
                  Conectado con: <strong>${item.related_title}</strong>
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:0.15rem; margin-top:0.15rem; width:100%;">
                  ${authList}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    const parts = [contentHtml, collabHtml, authHtml].filter(p => p !== '');
    return parts.join('<div style="margin: 0.75rem 0; border-top:1px solid rgba(0,0,0,0.05);"></div>');
  },

  bindEvents(userId, existingCheckouts) {
    const sliderContent = document.getElementById('weight-content-slider');
    const sliderCollab = document.getElementById('weight-collab-slider');
    const sliderAuth = document.getElementById('weight-auth-slider');
    
    const labelContent = document.getElementById('weight-content-pct');
    const labelCollab = document.getElementById('weight-collab-pct');
    const labelAuth = document.getElementById('weight-auth-pct');
    const labelOverall = document.getElementById('weights-value-display');
    const recsContainer = document.getElementById('recs-container');
    const addCheckoutBtn = document.getElementById('btn-add-checkout');
    const modal = document.getElementById('checkout-modal');
    const modalClose = document.getElementById('modal-close-btn');
    const modalSearch = document.getElementById('modal-book-search');
    const modalResults = document.getElementById('modal-search-results');
    
    // Set of existing book_ids for checkout checks
    const existingIds = new Set(existingCheckouts.map(b => b.book_id));

    let prevWeights = {
      content: 33,
      collab: 33,
      auth: 34
    };

    const updateWeights = async (changedKey, newVal) => {
      newVal = parseInt(newVal);
      const otherKeys = ['content', 'collab', 'auth'].filter(k => k !== changedKey);
      
      const otherSumPrev = prevWeights[otherKeys[0]] + prevWeights[otherKeys[1]];
      const remaining = 100 - newVal;
      
      let val0, val1;
      if (otherSumPrev > 0) {
        val0 = Math.round((prevWeights[otherKeys[0]] / otherSumPrev) * remaining);
        val1 = remaining - val0;
      } else {
        val0 = Math.round(remaining / 2);
        val1 = remaining - val0;
      }
      
      prevWeights[changedKey] = newVal;
      prevWeights[otherKeys[0]] = val0;
      prevWeights[otherKeys[1]] = val1;
      
      sliderContent.value = prevWeights.content;
      sliderCollab.value = prevWeights.collab;
      sliderAuth.value = prevWeights.auth;
      
      labelContent.innerText = `${prevWeights.content}%`;
      labelCollab.innerText = `${prevWeights.collab}%`;
      labelAuth.innerText = `${prevWeights.auth}%`;
      
      labelOverall.innerHTML = `Configuración: ${prevWeights.content}% Contenido / ${prevWeights.collab}% Lectores / ${prevWeights.auth}% Autoridades`;
      
      try {
        const freshData = await api.getRecommendations(
          userId, 
          prevWeights.content / 100, 
          prevWeights.collab / 100, 
          prevWeights.auth / 100
        );
        recsContainer.innerHTML = this.renderRecommendationsList(freshData.recommendations);
        this.bindAccordions();
      } catch (err) {
        console.error("Failed to fetch dynamic recommendations:", err);
      }
    };
    
    if (sliderContent && sliderCollab && sliderAuth && recsContainer) {
      sliderContent.addEventListener('input', (e) => updateWeights('content', e.target.value));
      sliderCollab.addEventListener('input', (e) => updateWeights('collab', e.target.value));
      sliderAuth.addEventListener('input', (e) => updateWeights('auth', e.target.value));
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
