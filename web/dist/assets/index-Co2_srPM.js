(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=class{constructor(e,t=`app`){this.routes=e,this.container=document.getElementById(t),window.addEventListener(`hashchange`,()=>this.handleRoute())}init(){this.handleRoute()}navigate(e){window.location.hash=e}handleRoute(){let e=window.location.hash||`#/`;this.renderLayout();let t=document.getElementById(`router-view`);if(!t)return;let n=null,r={};for(let t of this.routes){let i=t.path,a=i.replace(/:[a-zA-Z0-9]+/g,`([^/]+)`),o=e.match(RegExp(`^#${a}$`));if(o){n=t,r=(i.match(/:[a-zA-Z0-9]+/g)||[]).map(e=>e.slice(1)).reduce((e,t,n)=>(e[t]=o[n+1],e),{});break}}n?(this.updateActiveNav(n.navKey),t.innerHTML=`<div style="display:flex;justify-content:center;align-items:center;height:200px;"><i class="fa fa-spinner fa-spin fa-2x" style="color:var(--color-accent)"></i></div>`,n.render(t,r).catch(e=>{t.innerHTML=`
            <div class="glass-card" style="text-align:center;padding:3rem;margin-top:2rem;">
              <i class="fa-solid fa-triangle-exclamation" style="font-size:3rem;color:var(--color-accent);margin-bottom:1rem;"></i>
              <h2 style="font-family:var(--font-display);font-weight:700;margin-bottom:0.5rem;">Error de Conexión</h2>
              <p style="color:var(--text-secondary);margin-bottom:1.5rem;">No se pudo conectar con el servidor de recomendaciones. Por favor, asegúrese de que la API esté ejecutándose en el puerto 8000.</p>
              <button class="btn btn-primary" onclick="window.location.reload()">Reintentar <i class="fa-solid fa-rotate-right"></i></button>
            </div>
          `,console.error(e)})):t.innerHTML=`
        <div class="glass-card" style="text-align:center;padding:3rem;margin-top:2rem;">
          <i class="fa-solid fa-compass" style="font-size:3rem;color:var(--color-accent);margin-bottom:1rem;"></i>
          <h2 style="font-family:var(--font-display);font-weight:700;margin-bottom:0.5rem;">Página no encontrada</h2>
          <p style="color:var(--text-secondary);margin-bottom:1.5rem;">La ruta que está intentando acceder no existe.</p>
          <a href="#/" class="btn btn-primary">Ir al Inicio</a>
        </div>
      `}renderLayout(){document.getElementById(`router-view`)||(this.container.innerHTML=`
      <header>
        <a href="#/" class="logo">
          <i class="fa-solid fa-book-open"></i>
          <span>Jardín LAC Vizcaínas</span>
        </a>
        <nav class="nav-links">
          <a href="#/" class="nav-link" id="nav-dashboard">
            <i class="fa-solid fa-chart-line"></i> Inicio
          </a>
        </nav>
      </header>
      <main class="container" id="router-view"></main>
      <footer style="text-align:center;padding:1.5rem;color:var(--text-muted);font-size:0.8rem;border-top:1px solid var(--border-light);margin-top:2rem;">
        &copy; 2026 Jardín LAC Vizcaínas &bull; POC de Sistema de Recomendaciones
      </footer>
    `)}updateActiveNav(e){document.querySelectorAll(`.nav-link`).forEach(e=>e.classList.remove(`active`));let t=document.getElementById(`nav-${e}`);t&&t.classList.add(`active`)}},t=window.location.origin.includes(`:5173`)?`http://127.0.0.1:8000/api`:`/api`;async function n(e,n={}){try{let r=`${t}${e}`,i=await fetch(r,{...n,headers:{"Content-Type":`application/json`,...n.headers||{}}});if(!i.ok){let e=await i.json().catch(()=>({}));throw Error(e.detail||`HTTP error! status: ${i.status}`)}return await i.json()}catch(t){throw console.error(`API Error on ${e}:`,t),t}}var r={getUsers:()=>n(`/users`),getUserDetail:e=>n(`/users/${e}`),getRecommendations:(e,t=.5)=>n(`/users/${e}/recommendations?alpha=${t}`),checkoutBook:(e,t,r=``,i=``)=>n(`/users/${e}/checkout`,{method:`POST`,body:JSON.stringify({book_id:t,title:r,description:i})}),getBookDetail:e=>n(`/books/${e}`),searchBooks:e=>n(`/books?q=${encodeURIComponent(e)}`),getGraphData:(e,t=15)=>n(`/graph/${e}?limit=${t}`),getStats:()=>n(`/stats`),resetCheckouts:()=>n(`/reset`,{method:`POST`})},i={path:`/`,navKey:`dashboard`,async render(e){let[t,n]=await Promise.all([r.getStats(),r.getUsers()]);e.innerHTML=`
      <section class="hero">
        <h1>Sistema de Recomendaciones - Jardín LAC Vizcaínas</h1>
        <p>Un motor de recomendación híbrido que asocia embeddings semánticos de libros y redes de préstamos de usuarios.</p>
      </section>

      <div class="stats-grid">
        <div class="glass-card stat-card">
          <div class="stat-icon users">
            <i class="fa-solid fa-users"></i>
          </div>
          <div class="stat-info">
            <h3>Lectores</h3>
            <p>${t.total_users}</p>
          </div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-icon books">
            <i class="fa-solid fa-book"></i>
          </div>
          <div class="stat-info">
            <h3>Títulos Únicos</h3>
            <p>${t.total_books}</p>
          </div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-icon checkouts">
            <i class="fa-solid fa-book-open-reader"></i>
          </div>
          <div class="stat-info">
            <h3>Préstamos Totales</h3>
            <p>${t.total_checkouts}</p>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="glass-card">
          <div class="section-title">
            <i class="fa-solid fa-address-book" style="color:var(--color-accent)"></i>
            <h2>Directorio de Lectores</h2>
          </div>
          
          <div class="search-container">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input type="text" id="user-search" class="search-input" placeholder="Buscar lectores por nombre, correo o número de credencial...">
          </div>

          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Credencial</th>
                  <th>Correo Electrónico</th>
                  <th style="text-align:center;">Préstamos</th>
                  <th style="text-align:right;">Acciones</th>
                </tr>
              </thead>
              <tbody id="users-table-body">
                ${this.renderUsersRows(n)}
              </tbody>
            </table>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:2fr;">
          <div class="glass-card" style="margin-bottom:1.5rem;">
            <div class="section-title">
              <i class="fa-solid fa-fire" style="color:var(--color-collab)"></i>
              <h2>Libros Más Solicitados</h2>
            </div>
            <div style="display:flex; flex-direction:column; gap:0.75rem;">
              ${t.popular_books.map((e,t)=>`
                <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-primary); padding:0.6rem 0.8rem; border-radius:0.25rem; border:1px solid var(--border-light)">
                  <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:200px; font-size:0.88rem; font-weight:500;">
                    <span style="color:var(--text-muted); margin-right:0.4rem; font-family:var(--font-display); font-weight:700;">#${t+1}</span>
                    <a href="#/book/${e.book_id}" style="color:var(--text-primary); text-decoration:none; font-family:var(--font-sans);" onmouseover="this.style.color='var(--color-accent)'" onmouseout="this.style.color='var(--text-primary)'">${e.title}</a>
                  </div>
                  <span class="source-badge collaborative" style="font-size:0.68rem; padding:0.15rem 0.4rem;">
                    <i class="fa-solid fa-check"></i> ${e.checkout_count} lecturas
                  </span>
                </div>
              `).join(``)}
            </div>
          </div>
          
          <div class="glass-card">
            <div class="section-title">
              <i class="fa-solid fa-wrench" style="color:var(--color-hybrid)"></i>
              <h2>Controles del POC</h2>
            </div>
            <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:1rem;">Permite restablecer las lecturas de los usuarios al estado original del archivo CSV para realizar nuevas pruebas.</p>
            <button class="btn btn-secondary" id="btn-reset-checkouts" style="width:100%; justify-content:center; border-color:rgba(124, 25, 51, 0.2); color:var(--color-accent);">
              <i class="fa-solid fa-rotate-left"></i> Restablecer Préstamos
            </button>
          </div>
        </div>
      </div>
    `,this.bindEvents(n)},renderUsersRows(e){return e.length===0?`<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:2rem;">No se encontraron lectores.</td></tr>`:e.map(e=>`
      <tr>
        <td>
          <a href="#/user/${e.user_id}" style="color:var(--text-primary); font-weight:600; text-decoration:none;">${e.name}</a>
        </td>
        <td style="font-family:monospace; color:var(--text-secondary);">${e.cardnumber}</td>
        <td style="color:var(--text-secondary);">${e.email}</td>
        <td style="text-align:center; font-weight:600; font-family:var(--font-display); font-size:1.1rem;">${e.checkout_count}</td>
        <td style="text-align:right;">
          <div style="display:inline-flex; gap:0.5rem;">
            <a href="#/user/${e.user_id}" class="btn btn-primary" style="padding:0.35rem 0.75rem; font-size:0.8rem;">
              Recomendar
            </a>
            <a href="#/graph/${e.user_id}" class="btn btn-secondary" style="padding:0.35rem 0.75rem; font-size:0.8rem;">
              Grafo
            </a>
          </div>
        </td>
      </tr>
    `).join(``)},bindEvents(e){let t=document.getElementById(`user-search`),n=document.getElementById(`users-table-body`),i=document.getElementById(`btn-reset-checkouts`);t&&n&&t.addEventListener(`input`,t=>{let r=t.target.value.toLowerCase().trim(),i=e.filter(e=>e.name.toLowerCase().includes(r)||e.email.toLowerCase().includes(r)||e.cardnumber.includes(r));n.innerHTML=this.renderUsersRows(i)}),i&&i.addEventListener(`click`,async()=>{if(confirm(`¿Está seguro de que desea restablecer todos los préstamos agregados de vuelta a los datos base del CSV? Se perderán las simulaciones registradas.`))try{i.disabled=!0,i.innerHTML=`<i class="fa fa-spinner fa-spin"></i> Restableciendo...`,await r.resetCheckouts(),alert(`¡Préstamos restablecidos con éxito!`),window.location.reload()}catch(e){alert(`Error al restablecer: ${e.message}`),i.disabled=!1,i.innerHTML=`<i class="fa-solid fa-rotate-left"></i> Restablecer Préstamos`}})}},a={path:`/user/:id`,navKey:`dashboard`,async render(e,t){let n=t.id,[i,a]=await Promise.all([r.getUserDetail(n),r.getRecommendations(n,.5)]);if(!i){e.innerHTML=`
        <div class="glass-card" style="text-align:center;padding:3rem;margin-top:2rem;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size:3rem;color:var(--color-accent);margin-bottom:1rem;"></i>
          <h2 style="font-family:var(--font-display);font-weight:700;margin-bottom:0.5rem;">Lector No Encontrado</h2>
          <p style="color:var(--text-secondary);margin-bottom:1.5rem;">No se pudieron recuperar los datos del lector con ID: ${n}</p>
          <a href="#/" class="btn btn-primary">Volver al Inicio</a>
        </div>
      `;return}e.innerHTML=`
      <div style="margin-bottom:1.5rem;">
        <a href="#/" style="color:var(--text-secondary); text-decoration:none; font-weight:600; font-size:0.9rem;" onmouseover="this.style.color='var(--color-accent)'" onmouseout="this.style.color='var(--text-secondary)'">
          <i class="fa-solid fa-chevron-left"></i> Volver al Inicio
        </a>
      </div>

      <div class="user-profile-header">
        <div class="user-info-block">
          <div class="avatar-large">
            ${i.name.split(` `).map(e=>e[0]).slice(0,2).join(``)}
          </div>
          <div class="user-details">
            <h2>${i.name}</h2>
            <p><i class="fa-regular fa-id-card"></i> Credencial: ${i.cardnumber} &bull; <i class="fa-regular fa-envelope"></i> ${i.email}</p>
          </div>
        </div>
        <div>
          <a href="#/graph/${i.user_id}" class="btn btn-secondary">
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
                ${i.checkouts.length} libros
              </span>
            </div>
            <button class="btn btn-primary" id="btn-add-checkout" style="width:100%; justify-content:center; margin-bottom:1rem; padding:0.45rem;">
              <i class="fa-solid fa-plus"></i> Simular Préstamo de Libro
            </button>
            <div class="checkout-list">
              ${i.checkouts.map(e=>`
                <div class="checkout-item">
                  <div class="checkout-item-title" title="${e.title}">
                    <a href="#/book/${e.book_id}" style="color:var(--text-primary); text-decoration:none;" onmouseover="this.style.color='var(--color-accent)'" onmouseout="this.style.color='var(--text-primary)'">${e.title}</a>
                  </div>
                  <i class="fa-regular fa-circle-check" style="color:var(--color-collab)"></i>
                </div>
              `).join(``)}
            </div>
          </div>
        </div>

        <!-- Recommendations Column -->
        <div style="display:flex; flex-direction:column; gap:1rem;">
          <h2 style="font-family:var(--font-display); font-size:1.75rem; font-weight:700; display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
            <i class="fa-solid fa-star" style="color:var(--color-gold)"></i> Sugerencias de Lectura
          </h2>
          
          <div class="recs-container" id="recs-container">
            ${this.renderRecommendationsList(a.recommendations)}
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
          <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:1rem;">Busque un libro por título o palabra clave en el catálogo para agregarlo al historial de ${i.name.split(` `)[0]}.</p>
          <div class="search-container" style="margin-bottom:0;">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input type="text" id="modal-book-search" class="search-input" placeholder="Buscar libros por título o palabra clave...">
          </div>
          <div class="checkout-search-results" id="modal-search-results">
            <div style="text-align:center; padding:2rem; color:var(--text-secondary);">Comience a escribir para buscar libros...</div>
          </div>
        </div>
      </div>
    `,this.bindEvents(n,i.checkouts)},renderRecommendationsList(e){return e.length===0?`
        <div class="glass-card" style="text-align:center;padding:3rem;">
          <i class="fa-solid fa-heart-crack" style="font-size:3rem;color:var(--text-muted);margin-bottom:1rem;"></i>
          <h3 style="font-family:var(--font-display);font-weight:700;margin-bottom:0.5rem;">No hay sugerencias disponibles</h3>
          <p style="color:var(--text-secondary);">Agregue libros al historial activo de este lector para poder generar sugerencias.</p>
        </div>
      `:e.map(e=>{let t=``,n=``,r=``,i=``;e.source===`both`?(t=`both`,n=`Híbrido`,r=`<i class="fa-solid fa-circle-nodes"></i>`,i=`both`):e.source===`content`?(t=`content`,n=`Contenido`,r=`<i class="fa-solid fa-tag"></i>`,i=`content`):(t=`collaborative`,n=`Red de Lectura`,r=`<i class="fa-solid fa-user-friends"></i>`,i=`collaborative`);let a=Math.round(e.hybrid_score*100);return`
        <div class="glass-card rec-card">
          <div class="rec-header">
            <div class="rec-title-desc">
              <a href="#/book/${e.book_id}" style="text-decoration:none; color:inherit;">
                <h3 class="rec-title">${e.title}</h3>
              </a>
              <p class="rec-description">${e.description||`No hay descripción disponible para esta obra.`}</p>
            </div>
            
            <div class="score-badge-area">
              <span class="source-badge ${t}">
                ${r} ${n}
              </span>
              <div class="score-meter-container">
                <div class="score-track">
                  <div class="score-fill ${i}" style="width: ${a}%"></div>
                </div>
                <span class="score-label">${a}%</span>
              </div>
            </div>
          </div>
          
          <!-- Accordion explanation trigger -->
          <div class="explanation-btn" data-book-id="${e.book_id}">
            <span>¿Por qué esta sugerencia?</span> <i class="fa-solid fa-chevron-down"></i>
          </div>
          
          <!-- Explanation details -->
          <div class="explanation-panel" id="exp-panel-${e.book_id}">
            ${this.renderExplanationDetails(e.explanation)}
          </div>
        </div>
      `}).join(``)},renderExplanationDetails(e){let t=``,n=``;return e.content_details&&e.content_details.length>0&&(t=`
        <div class="explanation-section">
          <div class="explanation-title content">
            <i class="fa-solid fa-tag"></i> Afinidad en la temática de la obra
          </div>
          ${e.content_details.map(e=>{let t=Math.round(e.similarity*100);return`
              <div class="explanation-row">
                <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:320px;" title="${e.related_title}">
                  Similar a: <strong>${e.related_title}</strong>
                </div>
                <div class="explanation-bar-wrapper">
                  <div class="explanation-bar">
                    <div class="explanation-bar-fill content" style="width:${t}%"></div>
                  </div>
                  <span style="font-weight:600; font-family:monospace; font-size:0.75rem;">${t}%</span>
                </div>
              </div>
            `}).join(``)}
        </div>
      `),e.collab_details&&e.collab_details.length>0&&(n=`
        <div class="explanation-section">
          <div class="explanation-title collab">
            <i class="fa-solid fa-user-friends"></i> Preferencia en lectores similares
          </div>
          ${e.collab_details.map(e=>{let t=Math.round(e.similarity*100);return`
              <div class="explanation-row">
                <div>Prestado a: <strong>${e.name}</strong></div>
                <div class="explanation-bar-wrapper">
                  <span style="font-size:0.75rem; color:var(--text-muted); margin-right:0.2rem;">Afinidad de gustos:</span>
                  <div class="explanation-bar">
                    <div class="explanation-bar-fill collab" style="width:${t}%"></div>
                  </div>
                  <span style="font-weight:600; font-family:monospace; font-size:0.75rem;">${t}%</span>
                </div>
              </div>
            `}).join(``)}
        </div>
      `),t+(t&&n?`<div style="margin: 0.75rem 0; border-top:1px solid rgba(0,0,0,0.05);"></div>`:``)+n},bindEvents(e,t){let n=document.getElementById(`alpha-slider`),i=document.getElementById(`alpha-value-display`),a=document.getElementById(`recs-container`),o=document.getElementById(`btn-add-checkout`),s=document.getElementById(`checkout-modal`),c=document.getElementById(`modal-close-btn`),l=document.getElementById(`modal-book-search`),u=document.getElementById(`modal-search-results`),d=new Set(t.map(e=>e.book_id));if(n&&i&&a&&n.addEventListener(`input`,async t=>{let n=parseFloat(t.target.value),o=Math.round(n*100),s=100-o;i.innerHTML=`Balance: ${o}% Contenido / ${s}% Red`;try{let t=await r.getRecommendations(e,n);a.innerHTML=this.renderRecommendationsList(t.recommendations),this.bindAccordions()}catch(e){console.error(`Failed to fetch dynamic recommendations:`,e)}}),o&&s&&c){o.addEventListener(`click`,()=>{s.classList.add(`active`),l.value=``,l.focus(),u.innerHTML=`<div style="text-align:center; padding:2rem; color:var(--text-secondary);">Comience a escribir para buscar libros...</div>`}),c.addEventListener(`click`,()=>{s.classList.remove(`active`)}),s.addEventListener(`click`,e=>{e.target===s&&s.classList.remove(`active`)});let t=null;l.addEventListener(`input`,n=>{clearTimeout(t);let i=n.target.value.trim();if(i.length<2){u.innerHTML=`<div style="text-align:center; padding:2rem; color:var(--text-secondary);">Escriba al menos 2 caracteres para buscar...</div>`;return}u.innerHTML=`<div style="text-align:center; padding:2rem; color:var(--text-secondary);"><i class="fa fa-spinner fa-spin"></i> Buscando...</div>`,t=setTimeout(async()=>{try{let t=await r.searchBooks(i);if(t.length===0){u.innerHTML=`<div style="text-align:center; padding:2rem; color:var(--text-secondary);">No se encontraron obras que coincidan.</div>`;return}u.innerHTML=t.map(e=>{let t=d.has(e.book_id);return`
                <div class="search-result-item">
                  <div class="search-result-info">
                    <div class="search-result-title">${e.title}</div>
                    <div class="search-result-desc">${e.description||`Sin descripción disponible`}</div>
                  </div>
                  ${t?`
                    <button class="btn btn-secondary" style="font-size:0.75rem; padding:0.25rem 0.5rem;" disabled>Leído</button>
                  `:`
                    <button class="btn btn-primary checkout-action-btn" data-book-id="${e.book_id}" data-book-title="${e.title.replace(/"/g,`&quot;`)}" style="font-size:0.75rem; padding:0.25rem 0.5rem;">
                      Prestar
                    </button>
                  `}
                </div>
              `}).join(``),document.querySelectorAll(`.checkout-action-btn`).forEach(t=>{t.addEventListener(`click`,async t=>{let n=t.target.dataset.bookId,i=t.target.dataset.bookTitle;try{t.target.disabled=!0,t.target.innerHTML=`<i class="fa fa-spinner fa-spin"></i>`,await r.checkoutBook(e,n,i),alert(`¡Préstamo de "${i}" registrado con éxito! Actualizando recomendaciones...`),s.classList.remove(`active`),window.location.reload()}catch(e){alert(`Error al registrar el préstamo: ${e.message}`),t.target.disabled=!1,t.target.innerHTML=`Prestar`}})})}catch(e){u.innerHTML=`<div style="text-align:center; padding:2rem; color:var(--color-accent);">Error en la búsqueda: ${e.message}</div>`}},300)})}this.bindAccordions()},bindAccordions(){document.querySelectorAll(`.explanation-btn`).forEach(e=>{e.addEventListener(`click`,e=>{let t=e.target.closest(`.explanation-btn`),n=t.dataset.bookId,r=document.getElementById(`exp-panel-${n}`),i=t.querySelector(`i`);r&&(r.classList.contains(`active`)?(r.classList.remove(`active`),i.className=`fa-solid fa-chevron-down`):(r.classList.add(`active`),i.className=`fa-solid fa-chevron-up`))})})}},o={path:`/book/:id`,navKey:`dashboard`,async render(e,t){let n=t.id,i=await r.getBookDetail(n);if(!i){e.innerHTML=`
        <div class="glass-card" style="text-align:center;padding:3rem;margin-top:2rem;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size:3rem;color:var(--color-accent);margin-bottom:1rem;"></i>
          <h2 style="font-family:var(--font-display);font-weight:700;margin-bottom:0.5rem;">Libro No Encontrado</h2>
          <p style="color:var(--text-secondary);margin-bottom:1.5rem;">No pudimos recuperar la información del libro con ID: ${n}</p>
          <a href="#/" class="btn btn-primary">Volver al Inicio</a>
        </div>
      `;return}e.innerHTML=`
      <div style="margin-bottom:1.5rem;">
        <button class="btn btn-secondary" onclick="window.history.back()" style="padding:0.4rem 0.8rem; font-size:0.85rem; font-weight:600;">
          <i class="fa-solid fa-arrow-left"></i> Volver
        </button>
      </div>

      <div class="dashboard-grid">
        <!-- Book Details -->
        <div class="glass-card">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem;">
            <div>
              <span class="source-badge content" style="font-size:0.7rem; margin-bottom:0.5rem; display:inline-block;">
                <i class="fa-solid fa-book"></i> Código de la Obra: ${i.book_id}
              </span>
              <h1 style="font-family:var(--font-display); font-size:2.25rem; font-weight:700; line-height:1.2; margin-top:0.25rem;">
                ${i.title}
              </h1>
            </div>
          </div>
          
          <div style="margin-bottom:2rem;">
            <h3 style="font-family:var(--font-display); font-weight:700; font-size:1.25rem; margin-bottom:0.75rem; color:var(--text-primary); border-bottom:1px solid var(--border-light); padding-bottom:0.4rem;">
              Sinopsis / Descripción
            </h3>
            <p style="color:var(--text-secondary); font-size:0.95rem; line-height:1.6; white-space:pre-line;">
              ${i.description||`No hay descripción disponible para esta obra en la base de datos.`}
            </p>
          </div>

          <!-- Checkout History -->
          <div>
            <h3 style="font-family:var(--font-display); font-weight:700; font-size:1.25rem; margin-bottom:0.75rem; color:var(--text-primary); border-bottom:1px solid var(--border-light); padding-bottom:0.4rem;">
              Historial de Lectores (${i.checked_by.length} lectores)
            </h3>
            ${i.checked_by.length===0?`
              <p style="color:var(--text-muted); font-style:italic; font-size:0.9rem;">Esta obra no ha sido solicitada por ningún lector todavía.</p>
            `:`
              <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
                ${i.checked_by.map(e=>`
                  <a href="#/user/${e.user_id}" class="btn btn-secondary" style="font-size:0.8rem; padding:0.3rem 0.6rem; text-decoration:none;">
                    <i class="fa-regular fa-user"></i> ${e.name}
                  </a>
                `).join(``)}
              </div>
            `}
          </div>
        </div>

        <!-- Similar Books (Cosine similarities list) -->
        <div class="glass-card">
          <div class="section-title">
            <i class="fa-solid fa-tag" style="color:var(--color-content)"></i>
            <h2>Títulos Similares</h2>
          </div>
          <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:1.25rem; line-height:1.4;">Generados mediante la distancia vectorial de similitud coseno de los títulos y sinopsis.</p>
          
          <div style="display:flex; flex-direction:column; gap:0.75rem;">
            ${i.similar_books.length===0?`
              <div style="text-align:center; padding:2rem; color:var(--text-secondary); font-style:italic;">No se encontraron obras similares. Intente ejecutar el pipeline de procesamiento semanal.</div>
            `:i.similar_books.map((e,t)=>{let n=Math.round(e.similarity*100);return`
                <div style="display:flex; flex-direction:column; background:var(--bg-primary); padding:0.75rem; border-radius:0.25rem; border:1px solid var(--border-light)">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem; gap:0.5rem;">
                    <a href="#/book/${e.book_id}" style="color:var(--text-primary); font-weight:600; font-size:0.88rem; text-decoration:none; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;" title="${e.title}">
                      ${e.title}
                    </a>
                    <span class="similarity-badge">${n}% afinidad</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:0.5rem;">
                    <div class="score-track" style="height:4px; flex:1; background:#e3dbcf;">
                      <div class="score-fill content" style="width: ${n}%"></div>
                    </div>
                  </div>
                </div>
              `}).join(``)}
          </div>
        </div>
      </div>
    `}},s={value:()=>{}};function c(){for(var e=0,t=arguments.length,n={},r;e<t;++e){if(!(r=arguments[e]+``)||r in n||/[\s.]/.test(r))throw Error(`illegal type: `+r);n[r]=[]}return new l(n)}function l(e){this._=e}function u(e,t){return e.trim().split(/^|\s+/).map(function(e){var n=``,r=e.indexOf(`.`);if(r>=0&&(n=e.slice(r+1),e=e.slice(0,r)),e&&!t.hasOwnProperty(e))throw Error(`unknown type: `+e);return{type:e,name:n}})}l.prototype=c.prototype={constructor:l,on:function(e,t){var n=this._,r=u(e+``,n),i,a=-1,o=r.length;if(arguments.length<2){for(;++a<o;)if((i=(e=r[a]).type)&&(i=d(n[i],e.name)))return i;return}if(t!=null&&typeof t!=`function`)throw Error(`invalid callback: `+t);for(;++a<o;)if(i=(e=r[a]).type)n[i]=f(n[i],e.name,t);else if(t==null)for(i in n)n[i]=f(n[i],e.name,null);return this},copy:function(){var e={},t=this._;for(var n in t)e[n]=t[n].slice();return new l(e)},call:function(e,t){if((i=arguments.length-2)>0)for(var n=Array(i),r=0,i,a;r<i;++r)n[r]=arguments[r+2];if(!this._.hasOwnProperty(e))throw Error(`unknown type: `+e);for(a=this._[e],r=0,i=a.length;r<i;++r)a[r].value.apply(t,n)},apply:function(e,t,n){if(!this._.hasOwnProperty(e))throw Error(`unknown type: `+e);for(var r=this._[e],i=0,a=r.length;i<a;++i)r[i].value.apply(t,n)}};function d(e,t){for(var n=0,r=e.length,i;n<r;++n)if((i=e[n]).name===t)return i.value}function f(e,t,n){for(var r=0,i=e.length;r<i;++r)if(e[r].name===t){e[r]=s,e=e.slice(0,r).concat(e.slice(r+1));break}return n!=null&&e.push({name:t,value:n}),e}var p={svg:`http://www.w3.org/2000/svg`,xhtml:`http://www.w3.org/1999/xhtml`,xlink:`http://www.w3.org/1999/xlink`,xml:`http://www.w3.org/XML/1998/namespace`,xmlns:`http://www.w3.org/2000/xmlns/`};function m(e){var t=e+=``,n=t.indexOf(`:`);return n>=0&&(t=e.slice(0,n))!==`xmlns`&&(e=e.slice(n+1)),p.hasOwnProperty(t)?{space:p[t],local:e}:e}function h(e){return function(){var t=this.ownerDocument,n=this.namespaceURI;return n===`http://www.w3.org/1999/xhtml`&&t.documentElement.namespaceURI===`http://www.w3.org/1999/xhtml`?t.createElement(e):t.createElementNS(n,e)}}function g(e){return function(){return this.ownerDocument.createElementNS(e.space,e.local)}}function _(e){var t=m(e);return(t.local?g:h)(t)}function v(){}function y(e){return e==null?v:function(){return this.querySelector(e)}}function b(e){typeof e!=`function`&&(e=y(e));for(var t=this._groups,n=t.length,r=Array(n),i=0;i<n;++i)for(var a=t[i],o=a.length,s=r[i]=Array(o),c,l,u=0;u<o;++u)(c=a[u])&&(l=e.call(c,c.__data__,u,a))&&(`__data__`in c&&(l.__data__=c.__data__),s[u]=l);return new w(r,this._parents)}function x(e){return e==null?[]:Array.isArray(e)?e:Array.from(e)}function ee(){return[]}function S(e){return e==null?ee:function(){return this.querySelectorAll(e)}}function te(e){return function(){return x(e.apply(this,arguments))}}function ne(e){e=typeof e==`function`?te(e):S(e);for(var t=this._groups,n=t.length,r=[],i=[],a=0;a<n;++a)for(var o=t[a],s=o.length,c,l=0;l<s;++l)(c=o[l])&&(r.push(e.call(c,c.__data__,l,o)),i.push(c));return new w(r,i)}function re(e){return function(){return this.matches(e)}}function ie(e){return function(t){return t.matches(e)}}var ae=Array.prototype.find;function oe(e){return function(){return ae.call(this.children,e)}}function se(){return this.firstElementChild}function ce(e){return this.select(e==null?se:oe(typeof e==`function`?e:ie(e)))}var le=Array.prototype.filter;function ue(){return Array.from(this.children)}function de(e){return function(){return le.call(this.children,e)}}function fe(e){return this.selectAll(e==null?ue:de(typeof e==`function`?e:ie(e)))}function pe(e){typeof e!=`function`&&(e=re(e));for(var t=this._groups,n=t.length,r=Array(n),i=0;i<n;++i)for(var a=t[i],o=a.length,s=r[i]=[],c,l=0;l<o;++l)(c=a[l])&&e.call(c,c.__data__,l,a)&&s.push(c);return new w(r,this._parents)}function me(e){return Array(e.length)}function he(){return new w(this._enter||this._groups.map(me),this._parents)}function ge(e,t){this.ownerDocument=e.ownerDocument,this.namespaceURI=e.namespaceURI,this._next=null,this._parent=e,this.__data__=t}ge.prototype={constructor:ge,appendChild:function(e){return this._parent.insertBefore(e,this._next)},insertBefore:function(e,t){return this._parent.insertBefore(e,t)},querySelector:function(e){return this._parent.querySelector(e)},querySelectorAll:function(e){return this._parent.querySelectorAll(e)}};function _e(e){return function(){return e}}function ve(e,t,n,r,i,a){for(var o=0,s,c=t.length,l=a.length;o<l;++o)(s=t[o])?(s.__data__=a[o],r[o]=s):n[o]=new ge(e,a[o]);for(;o<c;++o)(s=t[o])&&(i[o]=s)}function ye(e,t,n,r,i,a,o){var s,c,l=new Map,u=t.length,d=a.length,f=Array(u),p;for(s=0;s<u;++s)(c=t[s])&&(f[s]=p=o.call(c,c.__data__,s,t)+``,l.has(p)?i[s]=c:l.set(p,c));for(s=0;s<d;++s)p=o.call(e,a[s],s,a)+``,(c=l.get(p))?(r[s]=c,c.__data__=a[s],l.delete(p)):n[s]=new ge(e,a[s]);for(s=0;s<u;++s)(c=t[s])&&l.get(f[s])===c&&(i[s]=c)}function be(e){return e.__data__}function xe(e,t){if(!arguments.length)return Array.from(this,be);var n=t?ye:ve,r=this._parents,i=this._groups;typeof e!=`function`&&(e=_e(e));for(var a=i.length,o=Array(a),s=Array(a),c=Array(a),l=0;l<a;++l){var u=r[l],d=i[l],f=d.length,p=Se(e.call(u,u&&u.__data__,l,r)),m=p.length,h=s[l]=Array(m),g=o[l]=Array(m);n(u,d,h,g,c[l]=Array(f),p,t);for(var _=0,v=0,y,b;_<m;++_)if(y=h[_]){for(_>=v&&(v=_+1);!(b=g[v])&&++v<m;);y._next=b||null}}return o=new w(o,r),o._enter=s,o._exit=c,o}function Se(e){return typeof e==`object`&&`length`in e?e:Array.from(e)}function Ce(){return new w(this._exit||this._groups.map(me),this._parents)}function we(e,t,n){var r=this.enter(),i=this,a=this.exit();return typeof e==`function`?(r=e(r),r&&=r.selection()):r=r.append(e+``),t!=null&&(i=t(i),i&&=i.selection()),n==null?a.remove():n(a),r&&i?r.merge(i).order():i}function Te(e){for(var t=e.selection?e.selection():e,n=this._groups,r=t._groups,i=n.length,a=r.length,o=Math.min(i,a),s=Array(i),c=0;c<o;++c)for(var l=n[c],u=r[c],d=l.length,f=s[c]=Array(d),p,m=0;m<d;++m)(p=l[m]||u[m])&&(f[m]=p);for(;c<i;++c)s[c]=n[c];return new w(s,this._parents)}function Ee(){for(var e=this._groups,t=-1,n=e.length;++t<n;)for(var r=e[t],i=r.length-1,a=r[i],o;--i>=0;)(o=r[i])&&(a&&o.compareDocumentPosition(a)^4&&a.parentNode.insertBefore(o,a),a=o);return this}function De(e){e||=Oe;function t(t,n){return t&&n?e(t.__data__,n.__data__):!t-!n}for(var n=this._groups,r=n.length,i=Array(r),a=0;a<r;++a){for(var o=n[a],s=o.length,c=i[a]=Array(s),l,u=0;u<s;++u)(l=o[u])&&(c[u]=l);c.sort(t)}return new w(i,this._parents).order()}function Oe(e,t){return e<t?-1:e>t?1:e>=t?0:NaN}function ke(){var e=arguments[0];return arguments[0]=this,e.apply(null,arguments),this}function Ae(){return Array.from(this)}function je(){for(var e=this._groups,t=0,n=e.length;t<n;++t)for(var r=e[t],i=0,a=r.length;i<a;++i){var o=r[i];if(o)return o}return null}function Me(){let e=0;for(let t of this)++e;return e}function Ne(){return!this.node()}function Pe(e){for(var t=this._groups,n=0,r=t.length;n<r;++n)for(var i=t[n],a=0,o=i.length,s;a<o;++a)(s=i[a])&&e.call(s,s.__data__,a,i);return this}function Fe(e){return function(){this.removeAttribute(e)}}function Ie(e){return function(){this.removeAttributeNS(e.space,e.local)}}function Le(e,t){return function(){this.setAttribute(e,t)}}function Re(e,t){return function(){this.setAttributeNS(e.space,e.local,t)}}function ze(e,t){return function(){var n=t.apply(this,arguments);n==null?this.removeAttribute(e):this.setAttribute(e,n)}}function Be(e,t){return function(){var n=t.apply(this,arguments);n==null?this.removeAttributeNS(e.space,e.local):this.setAttributeNS(e.space,e.local,n)}}function Ve(e,t){var n=m(e);if(arguments.length<2){var r=this.node();return n.local?r.getAttributeNS(n.space,n.local):r.getAttribute(n)}return this.each((t==null?n.local?Ie:Fe:typeof t==`function`?n.local?Be:ze:n.local?Re:Le)(n,t))}function He(e){return e.ownerDocument&&e.ownerDocument.defaultView||e.document&&e||e.defaultView}function Ue(e){return function(){this.style.removeProperty(e)}}function We(e,t,n){return function(){this.style.setProperty(e,t,n)}}function Ge(e,t,n){return function(){var r=t.apply(this,arguments);r==null?this.style.removeProperty(e):this.style.setProperty(e,r,n)}}function Ke(e,t,n){return arguments.length>1?this.each((t==null?Ue:typeof t==`function`?Ge:We)(e,t,n??``)):C(this.node(),e)}function C(e,t){return e.style.getPropertyValue(t)||He(e).getComputedStyle(e,null).getPropertyValue(t)}function qe(e){return function(){delete this[e]}}function Je(e,t){return function(){this[e]=t}}function Ye(e,t){return function(){var n=t.apply(this,arguments);n==null?delete this[e]:this[e]=n}}function Xe(e,t){return arguments.length>1?this.each((t==null?qe:typeof t==`function`?Ye:Je)(e,t)):this.node()[e]}function Ze(e){return e.trim().split(/^|\s+/)}function Qe(e){return e.classList||new $e(e)}function $e(e){this._node=e,this._names=Ze(e.getAttribute(`class`)||``)}$e.prototype={add:function(e){this._names.indexOf(e)<0&&(this._names.push(e),this._node.setAttribute(`class`,this._names.join(` `)))},remove:function(e){var t=this._names.indexOf(e);t>=0&&(this._names.splice(t,1),this._node.setAttribute(`class`,this._names.join(` `)))},contains:function(e){return this._names.indexOf(e)>=0}};function et(e,t){for(var n=Qe(e),r=-1,i=t.length;++r<i;)n.add(t[r])}function tt(e,t){for(var n=Qe(e),r=-1,i=t.length;++r<i;)n.remove(t[r])}function nt(e){return function(){et(this,e)}}function rt(e){return function(){tt(this,e)}}function it(e,t){return function(){(t.apply(this,arguments)?et:tt)(this,e)}}function at(e,t){var n=Ze(e+``);if(arguments.length<2){for(var r=Qe(this.node()),i=-1,a=n.length;++i<a;)if(!r.contains(n[i]))return!1;return!0}return this.each((typeof t==`function`?it:t?nt:rt)(n,t))}function ot(){this.textContent=``}function st(e){return function(){this.textContent=e}}function ct(e){return function(){var t=e.apply(this,arguments);this.textContent=t??``}}function lt(e){return arguments.length?this.each(e==null?ot:(typeof e==`function`?ct:st)(e)):this.node().textContent}function ut(){this.innerHTML=``}function dt(e){return function(){this.innerHTML=e}}function ft(e){return function(){var t=e.apply(this,arguments);this.innerHTML=t??``}}function pt(e){return arguments.length?this.each(e==null?ut:(typeof e==`function`?ft:dt)(e)):this.node().innerHTML}function mt(){this.nextSibling&&this.parentNode.appendChild(this)}function ht(){return this.each(mt)}function gt(){this.previousSibling&&this.parentNode.insertBefore(this,this.parentNode.firstChild)}function _t(){return this.each(gt)}function vt(e){var t=typeof e==`function`?e:_(e);return this.select(function(){return this.appendChild(t.apply(this,arguments))})}function yt(){return null}function bt(e,t){var n=typeof e==`function`?e:_(e),r=t==null?yt:typeof t==`function`?t:y(t);return this.select(function(){return this.insertBefore(n.apply(this,arguments),r.apply(this,arguments)||null)})}function xt(){var e=this.parentNode;e&&e.removeChild(this)}function St(){return this.each(xt)}function Ct(){var e=this.cloneNode(!1),t=this.parentNode;return t?t.insertBefore(e,this.nextSibling):e}function wt(){var e=this.cloneNode(!0),t=this.parentNode;return t?t.insertBefore(e,this.nextSibling):e}function Tt(e){return this.select(e?wt:Ct)}function Et(e){return arguments.length?this.property(`__data__`,e):this.node().__data__}function Dt(e){return function(t){e.call(this,t,this.__data__)}}function Ot(e){return e.trim().split(/^|\s+/).map(function(e){var t=``,n=e.indexOf(`.`);return n>=0&&(t=e.slice(n+1),e=e.slice(0,n)),{type:e,name:t}})}function kt(e){return function(){var t=this.__on;if(t){for(var n=0,r=-1,i=t.length,a;n<i;++n)a=t[n],(!e.type||a.type===e.type)&&a.name===e.name?this.removeEventListener(a.type,a.listener,a.options):t[++r]=a;++r?t.length=r:delete this.__on}}}function At(e,t,n){return function(){var r=this.__on,i,a=Dt(t);if(r){for(var o=0,s=r.length;o<s;++o)if((i=r[o]).type===e.type&&i.name===e.name){this.removeEventListener(i.type,i.listener,i.options),this.addEventListener(i.type,i.listener=a,i.options=n),i.value=t;return}}this.addEventListener(e.type,a,n),i={type:e.type,name:e.name,value:t,listener:a,options:n},r?r.push(i):this.__on=[i]}}function jt(e,t,n){var r=Ot(e+``),i,a=r.length,o;if(arguments.length<2){var s=this.node().__on;if(s){for(var c=0,l=s.length,u;c<l;++c)for(i=0,u=s[c];i<a;++i)if((o=r[i]).type===u.type&&o.name===u.name)return u.value}return}for(s=t?At:kt,i=0;i<a;++i)this.each(s(r[i],t,n));return this}function Mt(e,t,n){var r=He(e),i=r.CustomEvent;typeof i==`function`?i=new i(t,n):(i=r.document.createEvent(`Event`),n?(i.initEvent(t,n.bubbles,n.cancelable),i.detail=n.detail):i.initEvent(t,!1,!1)),e.dispatchEvent(i)}function Nt(e,t){return function(){return Mt(this,e,t)}}function Pt(e,t){return function(){return Mt(this,e,t.apply(this,arguments))}}function Ft(e,t){return this.each((typeof t==`function`?Pt:Nt)(e,t))}function*It(){for(var e=this._groups,t=0,n=e.length;t<n;++t)for(var r=e[t],i=0,a=r.length,o;i<a;++i)(o=r[i])&&(yield o)}var Lt=[null];function w(e,t){this._groups=e,this._parents=t}function T(){return new w([[document.documentElement]],Lt)}function Rt(){return this}w.prototype=T.prototype={constructor:w,select:b,selectAll:ne,selectChild:ce,selectChildren:fe,filter:pe,data:xe,enter:he,exit:Ce,join:we,merge:Te,selection:Rt,order:Ee,sort:De,call:ke,nodes:Ae,node:je,size:Me,empty:Ne,each:Pe,attr:Ve,style:Ke,property:Xe,classed:at,text:lt,html:pt,raise:ht,lower:_t,append:vt,insert:bt,remove:St,clone:Tt,datum:Et,on:jt,dispatch:Ft,[Symbol.iterator]:It};function E(e){return typeof e==`string`?new w([[document.querySelector(e)]],[document.documentElement]):new w([[e]],Lt)}function zt(e){let t;for(;t=e.sourceEvent;)e=t;return e}function D(e,t){if(e=zt(e),t===void 0&&(t=e.currentTarget),t){var n=t.ownerSVGElement||t;if(n.createSVGPoint){var r=n.createSVGPoint();return r.x=e.clientX,r.y=e.clientY,r=r.matrixTransform(t.getScreenCTM().inverse()),[r.x,r.y]}if(t.getBoundingClientRect){var i=t.getBoundingClientRect();return[e.clientX-i.left-t.clientLeft,e.clientY-i.top-t.clientTop]}}return[e.pageX,e.pageY]}var Bt={passive:!1},O={capture:!0,passive:!1};function Vt(e){e.stopImmediatePropagation()}function k(e){e.preventDefault(),e.stopImmediatePropagation()}function Ht(e){var t=e.document.documentElement,n=E(e).on(`dragstart.drag`,k,O);`onselectstart`in t?n.on(`selectstart.drag`,k,O):(t.__noselect=t.style.MozUserSelect,t.style.MozUserSelect=`none`)}function Ut(e,t){var n=e.document.documentElement,r=E(e).on(`dragstart.drag`,null);t&&(r.on(`click.drag`,k,O),setTimeout(function(){r.on(`click.drag`,null)},0)),`onselectstart`in n?r.on(`selectstart.drag`,null):(n.style.MozUserSelect=n.__noselect,delete n.__noselect)}var Wt=e=>()=>e;function Gt(e,{sourceEvent:t,subject:n,target:r,identifier:i,active:a,x:o,y:s,dx:c,dy:l,dispatch:u}){Object.defineProperties(this,{type:{value:e,enumerable:!0,configurable:!0},sourceEvent:{value:t,enumerable:!0,configurable:!0},subject:{value:n,enumerable:!0,configurable:!0},target:{value:r,enumerable:!0,configurable:!0},identifier:{value:i,enumerable:!0,configurable:!0},active:{value:a,enumerable:!0,configurable:!0},x:{value:o,enumerable:!0,configurable:!0},y:{value:s,enumerable:!0,configurable:!0},dx:{value:c,enumerable:!0,configurable:!0},dy:{value:l,enumerable:!0,configurable:!0},_:{value:u}})}Gt.prototype.on=function(){var e=this._.on.apply(this._,arguments);return e===this._?this:e};function Kt(e){return!e.ctrlKey&&!e.button}function qt(){return this.parentNode}function Jt(e,t){return t??{x:e.x,y:e.y}}function Yt(){return navigator.maxTouchPoints||`ontouchstart`in this}function Xt(){var e=Kt,t=qt,n=Jt,r=Yt,i={},a=c(`start`,`drag`,`end`),o=0,s,l,u,d,f=0;function p(e){e.on(`mousedown.drag`,m).filter(r).on(`touchstart.drag`,_).on(`touchmove.drag`,v,Bt).on(`touchend.drag touchcancel.drag`,y).style(`touch-action`,`none`).style(`-webkit-tap-highlight-color`,`rgba(0,0,0,0)`)}function m(n,r){if(!(d||!e.call(this,n,r))){var i=b(this,t.call(this,n,r),n,r,`mouse`);i&&(E(n.view).on(`mousemove.drag`,h,O).on(`mouseup.drag`,g,O),Ht(n.view),Vt(n),u=!1,s=n.clientX,l=n.clientY,i(`start`,n))}}function h(e){if(k(e),!u){var t=e.clientX-s,n=e.clientY-l;u=t*t+n*n>f}i.mouse(`drag`,e)}function g(e){E(e.view).on(`mousemove.drag mouseup.drag`,null),Ut(e.view,u),k(e),i.mouse(`end`,e)}function _(n,r){if(e.call(this,n,r)){var i=n.changedTouches,a=t.call(this,n,r),o=i.length,s,c;for(s=0;s<o;++s)(c=b(this,a,n,r,i[s].identifier,i[s]))&&(Vt(n),c(`start`,n,i[s]))}}function v(e){var t=e.changedTouches,n=t.length,r,a;for(r=0;r<n;++r)(a=i[t[r].identifier])&&(k(e),a(`drag`,e,t[r]))}function y(e){var t=e.changedTouches,n=t.length,r,a;for(d&&clearTimeout(d),d=setTimeout(function(){d=null},500),r=0;r<n;++r)(a=i[t[r].identifier])&&(Vt(e),a(`end`,e,t[r]))}function b(e,t,r,s,c,l){var u=a.copy(),d=D(l||r,t),f,m,h;if((h=n.call(e,new Gt(`beforestart`,{sourceEvent:r,target:p,identifier:c,active:o,x:d[0],y:d[1],dx:0,dy:0,dispatch:u}),s))!=null)return f=h.x-d[0]||0,m=h.y-d[1]||0,function n(r,a,l){var g=d,_;switch(r){case`start`:i[c]=n,_=o++;break;case`end`:delete i[c],--o;case`drag`:d=D(l||a,t),_=o;break}u.call(r,e,new Gt(r,{sourceEvent:a,subject:h,target:p,identifier:c,active:_,x:d[0]+f,y:d[1]+m,dx:d[0]-g[0],dy:d[1]-g[1],dispatch:u}),s)}}return p.filter=function(t){return arguments.length?(e=typeof t==`function`?t:Wt(!!t),p):e},p.container=function(e){return arguments.length?(t=typeof e==`function`?e:Wt(e),p):t},p.subject=function(e){return arguments.length?(n=typeof e==`function`?e:Wt(e),p):n},p.touchable=function(e){return arguments.length?(r=typeof e==`function`?e:Wt(!!e),p):r},p.on=function(){var e=a.on.apply(a,arguments);return e===a?p:e},p.clickDistance=function(e){return arguments.length?(f=(e=+e)*e,p):Math.sqrt(f)},p}function Zt(e,t,n){e.prototype=t.prototype=n,n.constructor=e}function Qt(e,t){var n=Object.create(e.prototype);for(var r in t)n[r]=t[r];return n}function A(){}var $t=.7,en=1/$t,j=`\\s*([+-]?\\d+)\\s*`,M=`\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*`,N=`\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*`,tn=/^#([0-9a-f]{3,8})$/,nn=RegExp(`^rgb\\(${j},${j},${j}\\)$`),rn=RegExp(`^rgb\\(${N},${N},${N}\\)$`),an=RegExp(`^rgba\\(${j},${j},${j},${M}\\)$`),on=RegExp(`^rgba\\(${N},${N},${N},${M}\\)$`),sn=RegExp(`^hsl\\(${M},${N},${N}\\)$`),cn=RegExp(`^hsla\\(${M},${N},${N},${M}\\)$`),ln={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074};Zt(A,P,{copy(e){return Object.assign(new this.constructor,this,e)},displayable(){return this.rgb().displayable()},hex:un,formatHex:un,formatHex8:dn,formatHsl:fn,formatRgb:pn,toString:pn});function un(){return this.rgb().formatHex()}function dn(){return this.rgb().formatHex8()}function fn(){return Cn(this).formatHsl()}function pn(){return this.rgb().formatRgb()}function P(e){var t,n;return e=(e+``).trim().toLowerCase(),(t=tn.exec(e))?(n=t[1].length,t=parseInt(t[1],16),n===6?mn(t):n===3?new F(t>>8&15|t>>4&240,t>>4&15|t&240,(t&15)<<4|t&15,1):n===8?hn(t>>24&255,t>>16&255,t>>8&255,(t&255)/255):n===4?hn(t>>12&15|t>>8&240,t>>8&15|t>>4&240,t>>4&15|t&240,((t&15)<<4|t&15)/255):null):(t=nn.exec(e))?new F(t[1],t[2],t[3],1):(t=rn.exec(e))?new F(t[1]*255/100,t[2]*255/100,t[3]*255/100,1):(t=an.exec(e))?hn(t[1],t[2],t[3],t[4]):(t=on.exec(e))?hn(t[1]*255/100,t[2]*255/100,t[3]*255/100,t[4]):(t=sn.exec(e))?Sn(t[1],t[2]/100,t[3]/100,1):(t=cn.exec(e))?Sn(t[1],t[2]/100,t[3]/100,t[4]):ln.hasOwnProperty(e)?mn(ln[e]):e===`transparent`?new F(NaN,NaN,NaN,0):null}function mn(e){return new F(e>>16&255,e>>8&255,e&255,1)}function hn(e,t,n,r){return r<=0&&(e=t=n=NaN),new F(e,t,n,r)}function gn(e){return e instanceof A||(e=P(e)),e?(e=e.rgb(),new F(e.r,e.g,e.b,e.opacity)):new F}function _n(e,t,n,r){return arguments.length===1?gn(e):new F(e,t,n,r??1)}function F(e,t,n,r){this.r=+e,this.g=+t,this.b=+n,this.opacity=+r}Zt(F,_n,Qt(A,{brighter(e){return e=e==null?en:en**+e,new F(this.r*e,this.g*e,this.b*e,this.opacity)},darker(e){return e=e==null?$t:$t**+e,new F(this.r*e,this.g*e,this.b*e,this.opacity)},rgb(){return this},clamp(){return new F(I(this.r),I(this.g),I(this.b),xn(this.opacity))},displayable(){return-.5<=this.r&&this.r<255.5&&-.5<=this.g&&this.g<255.5&&-.5<=this.b&&this.b<255.5&&0<=this.opacity&&this.opacity<=1},hex:vn,formatHex:vn,formatHex8:yn,formatRgb:bn,toString:bn}));function vn(){return`#${L(this.r)}${L(this.g)}${L(this.b)}`}function yn(){return`#${L(this.r)}${L(this.g)}${L(this.b)}${L((isNaN(this.opacity)?1:this.opacity)*255)}`}function bn(){let e=xn(this.opacity);return`${e===1?`rgb(`:`rgba(`}${I(this.r)}, ${I(this.g)}, ${I(this.b)}${e===1?`)`:`, ${e})`}`}function xn(e){return isNaN(e)?1:Math.max(0,Math.min(1,e))}function I(e){return Math.max(0,Math.min(255,Math.round(e)||0))}function L(e){return e=I(e),(e<16?`0`:``)+e.toString(16)}function Sn(e,t,n,r){return r<=0?e=t=n=NaN:n<=0||n>=1?e=t=NaN:t<=0&&(e=NaN),new R(e,t,n,r)}function Cn(e){if(e instanceof R)return new R(e.h,e.s,e.l,e.opacity);if(e instanceof A||(e=P(e)),!e)return new R;if(e instanceof R)return e;e=e.rgb();var t=e.r/255,n=e.g/255,r=e.b/255,i=Math.min(t,n,r),a=Math.max(t,n,r),o=NaN,s=a-i,c=(a+i)/2;return s?(o=t===a?(n-r)/s+(n<r)*6:n===a?(r-t)/s+2:(t-n)/s+4,s/=c<.5?a+i:2-a-i,o*=60):s=c>0&&c<1?0:o,new R(o,s,c,e.opacity)}function wn(e,t,n,r){return arguments.length===1?Cn(e):new R(e,t,n,r??1)}function R(e,t,n,r){this.h=+e,this.s=+t,this.l=+n,this.opacity=+r}Zt(R,wn,Qt(A,{brighter(e){return e=e==null?en:en**+e,new R(this.h,this.s,this.l*e,this.opacity)},darker(e){return e=e==null?$t:$t**+e,new R(this.h,this.s,this.l*e,this.opacity)},rgb(){var e=this.h%360+(this.h<0)*360,t=isNaN(e)||isNaN(this.s)?0:this.s,n=this.l,r=n+(n<.5?n:1-n)*t,i=2*n-r;return new F(Dn(e>=240?e-240:e+120,i,r),Dn(e,i,r),Dn(e<120?e+240:e-120,i,r),this.opacity)},clamp(){return new R(Tn(this.h),En(this.s),En(this.l),xn(this.opacity))},displayable(){return(0<=this.s&&this.s<=1||isNaN(this.s))&&0<=this.l&&this.l<=1&&0<=this.opacity&&this.opacity<=1},formatHsl(){let e=xn(this.opacity);return`${e===1?`hsl(`:`hsla(`}${Tn(this.h)}, ${En(this.s)*100}%, ${En(this.l)*100}%${e===1?`)`:`, ${e})`}`}}));function Tn(e){return e=(e||0)%360,e<0?e+360:e}function En(e){return Math.max(0,Math.min(1,e||0))}function Dn(e,t,n){return(e<60?t+(n-t)*e/60:e<180?n:e<240?t+(n-t)*(240-e)/60:t)*255}var On=e=>()=>e;function kn(e,t){return function(n){return e+n*t}}function An(e,t,n){return e**=+n,t=t**+n-e,n=1/n,function(r){return(e+r*t)**+n}}function jn(e){return(e=+e)==1?Mn:function(t,n){return n-t?An(t,n,e):On(isNaN(t)?n:t)}}function Mn(e,t){var n=t-e;return n?kn(e,n):On(isNaN(e)?t:e)}var Nn=(function e(t){var n=jn(t);function r(e,t){var r=n((e=_n(e)).r,(t=_n(t)).r),i=n(e.g,t.g),a=n(e.b,t.b),o=Mn(e.opacity,t.opacity);return function(t){return e.r=r(t),e.g=i(t),e.b=a(t),e.opacity=o(t),e+``}}return r.gamma=e,r})(1);function z(e,t){return e=+e,t=+t,function(n){return e*(1-n)+t*n}}var Pn=/[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,Fn=new RegExp(Pn.source,`g`);function In(e){return function(){return e}}function Ln(e){return function(t){return e(t)+``}}function Rn(e,t){var n=Pn.lastIndex=Fn.lastIndex=0,r,i,a,o=-1,s=[],c=[];for(e+=``,t+=``;(r=Pn.exec(e))&&(i=Fn.exec(t));)(a=i.index)>n&&(a=t.slice(n,a),s[o]?s[o]+=a:s[++o]=a),(r=r[0])===(i=i[0])?s[o]?s[o]+=i:s[++o]=i:(s[++o]=null,c.push({i:o,x:z(r,i)})),n=Fn.lastIndex;return n<t.length&&(a=t.slice(n),s[o]?s[o]+=a:s[++o]=a),s.length<2?c[0]?Ln(c[0].x):In(t):(t=c.length,function(e){for(var n=0,r;n<t;++n)s[(r=c[n]).i]=r.x(e);return s.join(``)})}var zn=180/Math.PI,Bn={translateX:0,translateY:0,rotate:0,skewX:0,scaleX:1,scaleY:1};function Vn(e,t,n,r,i,a){var o,s,c;return(o=Math.sqrt(e*e+t*t))&&(e/=o,t/=o),(c=e*n+t*r)&&(n-=e*c,r-=t*c),(s=Math.sqrt(n*n+r*r))&&(n/=s,r/=s,c/=s),e*r<t*n&&(e=-e,t=-t,c=-c,o=-o),{translateX:i,translateY:a,rotate:Math.atan2(t,e)*zn,skewX:Math.atan(c)*zn,scaleX:o,scaleY:s}}var Hn;function Un(e){let t=new(typeof DOMMatrix==`function`?DOMMatrix:WebKitCSSMatrix)(e+``);return t.isIdentity?Bn:Vn(t.a,t.b,t.c,t.d,t.e,t.f)}function Wn(e){return e==null||(Hn||=document.createElementNS(`http://www.w3.org/2000/svg`,`g`),Hn.setAttribute(`transform`,e),!(e=Hn.transform.baseVal.consolidate()))?Bn:(e=e.matrix,Vn(e.a,e.b,e.c,e.d,e.e,e.f))}function Gn(e,t,n,r){function i(e){return e.length?e.pop()+` `:``}function a(e,r,i,a,o,s){if(e!==i||r!==a){var c=o.push(`translate(`,null,t,null,n);s.push({i:c-4,x:z(e,i)},{i:c-2,x:z(r,a)})}else(i||a)&&o.push(`translate(`+i+t+a+n)}function o(e,t,n,a){e===t?t&&n.push(i(n)+`rotate(`+t+r):(e-t>180?t+=360:t-e>180&&(e+=360),a.push({i:n.push(i(n)+`rotate(`,null,r)-2,x:z(e,t)}))}function s(e,t,n,a){e===t?t&&n.push(i(n)+`skewX(`+t+r):a.push({i:n.push(i(n)+`skewX(`,null,r)-2,x:z(e,t)})}function c(e,t,n,r,a,o){if(e!==n||t!==r){var s=a.push(i(a)+`scale(`,null,`,`,null,`)`);o.push({i:s-4,x:z(e,n)},{i:s-2,x:z(t,r)})}else(n!==1||r!==1)&&a.push(i(a)+`scale(`+n+`,`+r+`)`)}return function(t,n){var r=[],i=[];return t=e(t),n=e(n),a(t.translateX,t.translateY,n.translateX,n.translateY,r,i),o(t.rotate,n.rotate,r,i),s(t.skewX,n.skewX,r,i),c(t.scaleX,t.scaleY,n.scaleX,n.scaleY,r,i),t=n=null,function(e){for(var t=-1,n=i.length,a;++t<n;)r[(a=i[t]).i]=a.x(e);return r.join(``)}}}var Kn=Gn(Un,`px, `,`px)`,`deg)`),qn=Gn(Wn,`, `,`)`,`)`),Jn=1e-12;function Yn(e){return((e=Math.exp(e))+1/e)/2}function Xn(e){return((e=Math.exp(e))-1/e)/2}function Zn(e){return((e=Math.exp(2*e))-1)/(e+1)}var Qn=(function e(t,n,r){function i(e,i){var a=e[0],o=e[1],s=e[2],c=i[0],l=i[1],u=i[2],d=c-a,f=l-o,p=d*d+f*f,m,h;if(p<Jn)h=Math.log(u/s)/t,m=function(e){return[a+e*d,o+e*f,s*Math.exp(t*e*h)]};else{var g=Math.sqrt(p),_=(u*u-s*s+r*p)/(2*s*n*g),v=(u*u-s*s-r*p)/(2*u*n*g),y=Math.log(Math.sqrt(_*_+1)-_);h=(Math.log(Math.sqrt(v*v+1)-v)-y)/t,m=function(e){var r=e*h,i=Yn(y),c=s/(n*g)*(i*Zn(t*r+y)-Xn(y));return[a+c*d,o+c*f,s*i/Yn(t*r+y)]}}return m.duration=h*1e3*t/Math.SQRT2,m}return i.rho=function(t){var n=Math.max(.001,+t),r=n*n;return e(n,r,r*r)},i})(Math.SQRT2,2,4),B=0,$n=0,er=0,tr=1e3,nr,V,rr=0,H=0,ir=0,U=typeof performance==`object`&&performance.now?performance:Date,ar=typeof window==`object`&&window.requestAnimationFrame?window.requestAnimationFrame.bind(window):function(e){setTimeout(e,17)};function or(){return H||=(ar(sr),U.now()+ir)}function sr(){H=0}function cr(){this._call=this._time=this._next=null}cr.prototype=lr.prototype={constructor:cr,restart:function(e,t,n){if(typeof e!=`function`)throw TypeError(`callback is not a function`);n=(n==null?or():+n)+(t==null?0:+t),!this._next&&V!==this&&(V?V._next=this:nr=this,V=this),this._call=e,this._time=n,mr()},stop:function(){this._call&&(this._call=null,this._time=1/0,mr())}};function lr(e,t,n){var r=new cr;return r.restart(e,t,n),r}function ur(){or(),++B;for(var e=nr,t;e;)(t=H-e._time)>=0&&e._call.call(void 0,t),e=e._next;--B}function dr(){H=(rr=U.now())+ir,B=$n=0;try{ur()}finally{B=0,pr(),H=0}}function fr(){var e=U.now(),t=e-rr;t>tr&&(ir-=t,rr=e)}function pr(){for(var e,t=nr,n,r=1/0;t;)t._call?(r>t._time&&(r=t._time),e=t,t=t._next):(n=t._next,t._next=null,t=e?e._next=n:nr=n);V=e,mr(r)}function mr(e){B||($n&&=clearTimeout($n),e-H>24?(e<1/0&&($n=setTimeout(dr,e-U.now()-ir)),er&&=clearInterval(er)):(er||=(rr=U.now(),setInterval(fr,tr)),B=1,ar(dr)))}function hr(e,t,n){var r=new cr;return t=t==null?0:+t,r.restart(n=>{r.stop(),e(n+t)},t,n),r}var gr=c(`start`,`end`,`cancel`,`interrupt`),_r=[];function vr(e,t,n,r,i,a){var o=e.__transition;if(!o)e.__transition={};else if(n in o)return;br(e,n,{name:t,index:r,group:i,on:gr,tween:_r,time:a.time,delay:a.delay,duration:a.duration,ease:a.ease,timer:null,state:0})}function yr(e,t){var n=G(e,t);if(n.state>0)throw Error(`too late; already scheduled`);return n}function W(e,t){var n=G(e,t);if(n.state>3)throw Error(`too late; already running`);return n}function G(e,t){var n=e.__transition;if(!n||!(n=n[t]))throw Error(`transition not found`);return n}function br(e,t,n){var r=e.__transition,i;r[t]=n,n.timer=lr(a,0,n.time);function a(e){n.state=1,n.timer.restart(o,n.delay,n.time),n.delay<=e&&o(e-n.delay)}function o(a){var l,u,d,f;if(n.state!==1)return c();for(l in r)if(f=r[l],f.name===n.name){if(f.state===3)return hr(o);f.state===4?(f.state=6,f.timer.stop(),f.on.call(`interrupt`,e,e.__data__,f.index,f.group),delete r[l]):+l<t&&(f.state=6,f.timer.stop(),f.on.call(`cancel`,e,e.__data__,f.index,f.group),delete r[l])}if(hr(function(){n.state===3&&(n.state=4,n.timer.restart(s,n.delay,n.time),s(a))}),n.state=2,n.on.call(`start`,e,e.__data__,n.index,n.group),n.state===2){for(n.state=3,i=Array(d=n.tween.length),l=0,u=-1;l<d;++l)(f=n.tween[l].value.call(e,e.__data__,n.index,n.group))&&(i[++u]=f);i.length=u+1}}function s(t){for(var r=t<n.duration?n.ease.call(null,t/n.duration):(n.timer.restart(c),n.state=5,1),a=-1,o=i.length;++a<o;)i[a].call(e,r);n.state===5&&(n.on.call(`end`,e,e.__data__,n.index,n.group),c())}function c(){for(var i in n.state=6,n.timer.stop(),delete r[t],r)return;delete e.__transition}}function xr(e,t){var n=e.__transition,r,i,a=!0,o;if(n){for(o in t=t==null?null:t+``,n){if((r=n[o]).name!==t){a=!1;continue}i=r.state>2&&r.state<5,r.state=6,r.timer.stop(),r.on.call(i?`interrupt`:`cancel`,e,e.__data__,r.index,r.group),delete n[o]}a&&delete e.__transition}}function Sr(e){return this.each(function(){xr(this,e)})}function Cr(e,t){var n,r;return function(){var i=W(this,e),a=i.tween;if(a!==n){r=n=a;for(var o=0,s=r.length;o<s;++o)if(r[o].name===t){r=r.slice(),r.splice(o,1);break}}i.tween=r}}function wr(e,t,n){var r,i;if(typeof n!=`function`)throw Error();return function(){var a=W(this,e),o=a.tween;if(o!==r){i=(r=o).slice();for(var s={name:t,value:n},c=0,l=i.length;c<l;++c)if(i[c].name===t){i[c]=s;break}c===l&&i.push(s)}a.tween=i}}function Tr(e,t){var n=this._id;if(e+=``,arguments.length<2){for(var r=G(this.node(),n).tween,i=0,a=r.length,o;i<a;++i)if((o=r[i]).name===e)return o.value;return null}return this.each((t==null?Cr:wr)(n,e,t))}function Er(e,t,n){var r=e._id;return e.each(function(){var e=W(this,r);(e.value||={})[t]=n.apply(this,arguments)}),function(e){return G(e,r).value[t]}}function Dr(e,t){var n;return(typeof t==`number`?z:t instanceof P?Nn:(n=P(t))?(t=n,Nn):Rn)(e,t)}function Or(e){return function(){this.removeAttribute(e)}}function kr(e){return function(){this.removeAttributeNS(e.space,e.local)}}function Ar(e,t,n){var r,i=n+``,a;return function(){var o=this.getAttribute(e);return o===i?null:o===r?a:a=t(r=o,n)}}function jr(e,t,n){var r,i=n+``,a;return function(){var o=this.getAttributeNS(e.space,e.local);return o===i?null:o===r?a:a=t(r=o,n)}}function Mr(e,t,n){var r,i,a;return function(){var o,s=n(this),c;return s==null?void this.removeAttribute(e):(o=this.getAttribute(e),c=s+``,o===c?null:o===r&&c===i?a:(i=c,a=t(r=o,s)))}}function Nr(e,t,n){var r,i,a;return function(){var o,s=n(this),c;return s==null?void this.removeAttributeNS(e.space,e.local):(o=this.getAttributeNS(e.space,e.local),c=s+``,o===c?null:o===r&&c===i?a:(i=c,a=t(r=o,s)))}}function Pr(e,t){var n=m(e),r=n===`transform`?qn:Dr;return this.attrTween(e,typeof t==`function`?(n.local?Nr:Mr)(n,r,Er(this,`attr.`+e,t)):t==null?(n.local?kr:Or)(n):(n.local?jr:Ar)(n,r,t))}function Fr(e,t){return function(n){this.setAttribute(e,t.call(this,n))}}function Ir(e,t){return function(n){this.setAttributeNS(e.space,e.local,t.call(this,n))}}function Lr(e,t){var n,r;function i(){var i=t.apply(this,arguments);return i!==r&&(n=(r=i)&&Ir(e,i)),n}return i._value=t,i}function Rr(e,t){var n,r;function i(){var i=t.apply(this,arguments);return i!==r&&(n=(r=i)&&Fr(e,i)),n}return i._value=t,i}function zr(e,t){var n=`attr.`+e;if(arguments.length<2)return(n=this.tween(n))&&n._value;if(t==null)return this.tween(n,null);if(typeof t!=`function`)throw Error();var r=m(e);return this.tween(n,(r.local?Lr:Rr)(r,t))}function Br(e,t){return function(){yr(this,e).delay=+t.apply(this,arguments)}}function Vr(e,t){return t=+t,function(){yr(this,e).delay=t}}function Hr(e){var t=this._id;return arguments.length?this.each((typeof e==`function`?Br:Vr)(t,e)):G(this.node(),t).delay}function Ur(e,t){return function(){W(this,e).duration=+t.apply(this,arguments)}}function Wr(e,t){return t=+t,function(){W(this,e).duration=t}}function Gr(e){var t=this._id;return arguments.length?this.each((typeof e==`function`?Ur:Wr)(t,e)):G(this.node(),t).duration}function Kr(e,t){if(typeof t!=`function`)throw Error();return function(){W(this,e).ease=t}}function qr(e){var t=this._id;return arguments.length?this.each(Kr(t,e)):G(this.node(),t).ease}function Jr(e,t){return function(){var n=t.apply(this,arguments);if(typeof n!=`function`)throw Error();W(this,e).ease=n}}function Yr(e){if(typeof e!=`function`)throw Error();return this.each(Jr(this._id,e))}function Xr(e){typeof e!=`function`&&(e=re(e));for(var t=this._groups,n=t.length,r=Array(n),i=0;i<n;++i)for(var a=t[i],o=a.length,s=r[i]=[],c,l=0;l<o;++l)(c=a[l])&&e.call(c,c.__data__,l,a)&&s.push(c);return new K(r,this._parents,this._name,this._id)}function Zr(e){if(e._id!==this._id)throw Error();for(var t=this._groups,n=e._groups,r=t.length,i=n.length,a=Math.min(r,i),o=Array(r),s=0;s<a;++s)for(var c=t[s],l=n[s],u=c.length,d=o[s]=Array(u),f,p=0;p<u;++p)(f=c[p]||l[p])&&(d[p]=f);for(;s<r;++s)o[s]=t[s];return new K(o,this._parents,this._name,this._id)}function Qr(e){return(e+``).trim().split(/^|\s+/).every(function(e){var t=e.indexOf(`.`);return t>=0&&(e=e.slice(0,t)),!e||e===`start`})}function $r(e,t,n){var r,i,a=Qr(t)?yr:W;return function(){var o=a(this,e),s=o.on;s!==r&&(i=(r=s).copy()).on(t,n),o.on=i}}function ei(e,t){var n=this._id;return arguments.length<2?G(this.node(),n).on.on(e):this.each($r(n,e,t))}function ti(e){return function(){var t=this.parentNode;for(var n in this.__transition)if(+n!==e)return;t&&t.removeChild(this)}}function ni(){return this.on(`end.remove`,ti(this._id))}function ri(e){var t=this._name,n=this._id;typeof e!=`function`&&(e=y(e));for(var r=this._groups,i=r.length,a=Array(i),o=0;o<i;++o)for(var s=r[o],c=s.length,l=a[o]=Array(c),u,d,f=0;f<c;++f)(u=s[f])&&(d=e.call(u,u.__data__,f,s))&&(`__data__`in u&&(d.__data__=u.__data__),l[f]=d,vr(l[f],t,n,f,l,G(u,n)));return new K(a,this._parents,t,n)}function ii(e){var t=this._name,n=this._id;typeof e!=`function`&&(e=S(e));for(var r=this._groups,i=r.length,a=[],o=[],s=0;s<i;++s)for(var c=r[s],l=c.length,u,d=0;d<l;++d)if(u=c[d]){for(var f=e.call(u,u.__data__,d,c),p,m=G(u,n),h=0,g=f.length;h<g;++h)(p=f[h])&&vr(p,t,n,h,f,m);a.push(f),o.push(u)}return new K(a,o,t,n)}var ai=T.prototype.constructor;function oi(){return new ai(this._groups,this._parents)}function si(e,t){var n,r,i;return function(){var a=C(this,e),o=(this.style.removeProperty(e),C(this,e));return a===o?null:a===n&&o===r?i:i=t(n=a,r=o)}}function ci(e){return function(){this.style.removeProperty(e)}}function li(e,t,n){var r,i=n+``,a;return function(){var o=C(this,e);return o===i?null:o===r?a:a=t(r=o,n)}}function ui(e,t,n){var r,i,a;return function(){var o=C(this,e),s=n(this),c=s+``;return s??(c=s=(this.style.removeProperty(e),C(this,e))),o===c?null:o===r&&c===i?a:(i=c,a=t(r=o,s))}}function di(e,t){var n,r,i,a=`style.`+t,o=`end.`+a,s;return function(){var c=W(this,e),l=c.on,u=c.value[a]==null?s||=ci(t):void 0;(l!==n||i!==u)&&(r=(n=l).copy()).on(o,i=u),c.on=r}}function fi(e,t,n){var r=(e+=``)==`transform`?Kn:Dr;return t==null?this.styleTween(e,si(e,r)).on(`end.style.`+e,ci(e)):typeof t==`function`?this.styleTween(e,ui(e,r,Er(this,`style.`+e,t))).each(di(this._id,e)):this.styleTween(e,li(e,r,t),n).on(`end.style.`+e,null)}function pi(e,t,n){return function(r){this.style.setProperty(e,t.call(this,r),n)}}function mi(e,t,n){var r,i;function a(){var a=t.apply(this,arguments);return a!==i&&(r=(i=a)&&pi(e,a,n)),r}return a._value=t,a}function hi(e,t,n){var r=`style.`+(e+=``);if(arguments.length<2)return(r=this.tween(r))&&r._value;if(t==null)return this.tween(r,null);if(typeof t!=`function`)throw Error();return this.tween(r,mi(e,t,n??``))}function gi(e){return function(){this.textContent=e}}function _i(e){return function(){var t=e(this);this.textContent=t??``}}function vi(e){return this.tween(`text`,typeof e==`function`?_i(Er(this,`text`,e)):gi(e==null?``:e+``))}function yi(e){return function(t){this.textContent=e.call(this,t)}}function bi(e){var t,n;function r(){var r=e.apply(this,arguments);return r!==n&&(t=(n=r)&&yi(r)),t}return r._value=e,r}function xi(e){var t=`text`;if(arguments.length<1)return(t=this.tween(t))&&t._value;if(e==null)return this.tween(t,null);if(typeof e!=`function`)throw Error();return this.tween(t,bi(e))}function Si(){for(var e=this._name,t=this._id,n=Ei(),r=this._groups,i=r.length,a=0;a<i;++a)for(var o=r[a],s=o.length,c,l=0;l<s;++l)if(c=o[l]){var u=G(c,t);vr(c,e,n,l,o,{time:u.time+u.delay+u.duration,delay:0,duration:u.duration,ease:u.ease})}return new K(r,this._parents,e,n)}function Ci(){var e,t,n=this,r=n._id,i=n.size();return new Promise(function(a,o){var s={value:o},c={value:function(){--i===0&&a()}};n.each(function(){var n=W(this,r),i=n.on;i!==e&&(t=(e=i).copy(),t._.cancel.push(s),t._.interrupt.push(s),t._.end.push(c)),n.on=t}),i===0&&a()})}var wi=0;function K(e,t,n,r){this._groups=e,this._parents=t,this._name=n,this._id=r}function Ti(e){return T().transition(e)}function Ei(){return++wi}var q=T.prototype;K.prototype=Ti.prototype={constructor:K,select:ri,selectAll:ii,selectChild:q.selectChild,selectChildren:q.selectChildren,filter:Xr,merge:Zr,selection:oi,transition:Si,call:q.call,nodes:q.nodes,node:q.node,size:q.size,empty:q.empty,each:q.each,on:ei,attr:Pr,attrTween:zr,style:fi,styleTween:hi,text:vi,textTween:xi,remove:ni,tween:Tr,delay:Hr,duration:Gr,ease:qr,easeVarying:Yr,end:Ci,[Symbol.iterator]:q[Symbol.iterator]};function Di(e){return((e*=2)<=1?e*e*e:(e-=2)*e*e+2)/2}var Oi={time:null,delay:0,duration:250,ease:Di};function ki(e,t){for(var n;!(n=e.__transition)||!(n=n[t]);)if(!(e=e.parentNode))throw Error(`transition ${t} not found`);return n}function Ai(e){var t,n;e instanceof K?(t=e._id,e=e._name):(t=Ei(),(n=Oi).time=or(),e=e==null?null:e+``);for(var r=this._groups,i=r.length,a=0;a<i;++a)for(var o=r[a],s=o.length,c,l=0;l<s;++l)(c=o[l])&&vr(c,e,t,l,o,n||ki(c,t));return new K(r,this._parents,e,t)}T.prototype.interrupt=Sr,T.prototype.transition=Ai;var{abs:ji,max:Mi,min:Ni}=Math;[`w`,`e`].map(Pi),[`n`,`s`].map(Pi),[`n`,`w`,`e`,`s`,`nw`,`ne`,`sw`,`se`].map(Pi);function Pi(e){return{type:e}}function Fi(e,t){var n,r=1;e??=0,t??=0;function i(){var i,a=n.length,o,s=0,c=0;for(i=0;i<a;++i)o=n[i],s+=o.x,c+=o.y;for(s=(s/a-e)*r,c=(c/a-t)*r,i=0;i<a;++i)o=n[i],o.x-=s,o.y-=c}return i.initialize=function(e){n=e},i.x=function(t){return arguments.length?(e=+t,i):e},i.y=function(e){return arguments.length?(t=+e,i):t},i.strength=function(e){return arguments.length?(r=+e,i):r},i}function Ii(e){let t=+this._x.call(null,e),n=+this._y.call(null,e);return Li(this.cover(t,n),t,n,e)}function Li(e,t,n,r){if(isNaN(t)||isNaN(n))return e;var i,a=e._root,o={data:r},s=e._x0,c=e._y0,l=e._x1,u=e._y1,d,f,p,m,h,g,_,v;if(!a)return e._root=o,e;for(;a.length;)if((h=t>=(d=(s+l)/2))?s=d:l=d,(g=n>=(f=(c+u)/2))?c=f:u=f,i=a,!(a=a[_=g<<1|h]))return i[_]=o,e;if(p=+e._x.call(null,a.data),m=+e._y.call(null,a.data),t===p&&n===m)return o.next=a,i?i[_]=o:e._root=o,e;do i=i?i[_]=[,,,,]:e._root=[,,,,],(h=t>=(d=(s+l)/2))?s=d:l=d,(g=n>=(f=(c+u)/2))?c=f:u=f;while((_=g<<1|h)==(v=(m>=f)<<1|p>=d));return i[v]=a,i[_]=o,e}function Ri(e){var t,n,r=e.length,i,a,o=Array(r),s=Array(r),c=1/0,l=1/0,u=-1/0,d=-1/0;for(n=0;n<r;++n)isNaN(i=+this._x.call(null,t=e[n]))||isNaN(a=+this._y.call(null,t))||(o[n]=i,s[n]=a,i<c&&(c=i),i>u&&(u=i),a<l&&(l=a),a>d&&(d=a));if(c>u||l>d)return this;for(this.cover(c,l).cover(u,d),n=0;n<r;++n)Li(this,o[n],s[n],e[n]);return this}function zi(e,t){if(isNaN(e=+e)||isNaN(t=+t))return this;var n=this._x0,r=this._y0,i=this._x1,a=this._y1;if(isNaN(n))i=(n=Math.floor(e))+1,a=(r=Math.floor(t))+1;else{for(var o=i-n||1,s=this._root,c,l;n>e||e>=i||r>t||t>=a;)switch(l=(t<r)<<1|e<n,c=[,,,,],c[l]=s,s=c,o*=2,l){case 0:i=n+o,a=r+o;break;case 1:n=i-o,a=r+o;break;case 2:i=n+o,r=a-o;break;case 3:n=i-o,r=a-o;break}this._root&&this._root.length&&(this._root=s)}return this._x0=n,this._y0=r,this._x1=i,this._y1=a,this}function Bi(){var e=[];return this.visit(function(t){if(!t.length)do e.push(t.data);while(t=t.next)}),e}function Vi(e){return arguments.length?this.cover(+e[0][0],+e[0][1]).cover(+e[1][0],+e[1][1]):isNaN(this._x0)?void 0:[[this._x0,this._y0],[this._x1,this._y1]]}function J(e,t,n,r,i){this.node=e,this.x0=t,this.y0=n,this.x1=r,this.y1=i}function Hi(e,t,n){var r,i=this._x0,a=this._y0,o,s,c,l,u=this._x1,d=this._y1,f=[],p=this._root,m,h;for(p&&f.push(new J(p,i,a,u,d)),n==null?n=1/0:(i=e-n,a=t-n,u=e+n,d=t+n,n*=n);m=f.pop();)if(!(!(p=m.node)||(o=m.x0)>u||(s=m.y0)>d||(c=m.x1)<i||(l=m.y1)<a))if(p.length){var g=(o+c)/2,_=(s+l)/2;f.push(new J(p[3],g,_,c,l),new J(p[2],o,_,g,l),new J(p[1],g,s,c,_),new J(p[0],o,s,g,_)),(h=(t>=_)<<1|e>=g)&&(m=f[f.length-1],f[f.length-1]=f[f.length-1-h],f[f.length-1-h]=m)}else{var v=e-+this._x.call(null,p.data),y=t-+this._y.call(null,p.data),b=v*v+y*y;if(b<n){var x=Math.sqrt(n=b);i=e-x,a=t-x,u=e+x,d=t+x,r=p.data}}return r}function Ui(e){if(isNaN(u=+this._x.call(null,e))||isNaN(d=+this._y.call(null,e)))return this;var t,n=this._root,r,i,a,o=this._x0,s=this._y0,c=this._x1,l=this._y1,u,d,f,p,m,h,g,_;if(!n)return this;if(n.length)for(;;){if((m=u>=(f=(o+c)/2))?o=f:c=f,(h=d>=(p=(s+l)/2))?s=p:l=p,t=n,!(n=n[g=h<<1|m]))return this;if(!n.length)break;(t[g+1&3]||t[g+2&3]||t[g+3&3])&&(r=t,_=g)}for(;n.data!==e;)if(i=n,!(n=n.next))return this;return(a=n.next)&&delete n.next,i?(a?i.next=a:delete i.next,this):t?(a?t[g]=a:delete t[g],(n=t[0]||t[1]||t[2]||t[3])&&n===(t[3]||t[2]||t[1]||t[0])&&!n.length&&(r?r[_]=n:this._root=n),this):(this._root=a,this)}function Wi(e){for(var t=0,n=e.length;t<n;++t)this.remove(e[t]);return this}function Gi(){return this._root}function Ki(){var e=0;return this.visit(function(t){if(!t.length)do++e;while(t=t.next)}),e}function qi(e){var t=[],n,r=this._root,i,a,o,s,c;for(r&&t.push(new J(r,this._x0,this._y0,this._x1,this._y1));n=t.pop();)if(!e(r=n.node,a=n.x0,o=n.y0,s=n.x1,c=n.y1)&&r.length){var l=(a+s)/2,u=(o+c)/2;(i=r[3])&&t.push(new J(i,l,u,s,c)),(i=r[2])&&t.push(new J(i,a,u,l,c)),(i=r[1])&&t.push(new J(i,l,o,s,u)),(i=r[0])&&t.push(new J(i,a,o,l,u))}return this}function Ji(e){var t=[],n=[],r;for(this._root&&t.push(new J(this._root,this._x0,this._y0,this._x1,this._y1));r=t.pop();){var i=r.node;if(i.length){var a,o=r.x0,s=r.y0,c=r.x1,l=r.y1,u=(o+c)/2,d=(s+l)/2;(a=i[0])&&t.push(new J(a,o,s,u,d)),(a=i[1])&&t.push(new J(a,u,s,c,d)),(a=i[2])&&t.push(new J(a,o,d,u,l)),(a=i[3])&&t.push(new J(a,u,d,c,l))}n.push(r)}for(;r=n.pop();)e(r.node,r.x0,r.y0,r.x1,r.y1);return this}function Yi(e){return e[0]}function Xi(e){return arguments.length?(this._x=e,this):this._x}function Zi(e){return e[1]}function Qi(e){return arguments.length?(this._y=e,this):this._y}function $i(e,t,n){var r=new ea(t??Yi,n??Zi,NaN,NaN,NaN,NaN);return e==null?r:r.addAll(e)}function ea(e,t,n,r,i,a){this._x=e,this._y=t,this._x0=n,this._y0=r,this._x1=i,this._y1=a,this._root=void 0}function ta(e){for(var t={data:e.data},n=t;e=e.next;)n=n.next={data:e.data};return t}var Y=$i.prototype=ea.prototype;Y.copy=function(){var e=new ea(this._x,this._y,this._x0,this._y0,this._x1,this._y1),t=this._root,n,r;if(!t)return e;if(!t.length)return e._root=ta(t),e;for(n=[{source:t,target:e._root=[,,,,]}];t=n.pop();)for(var i=0;i<4;++i)(r=t.source[i])&&(r.length?n.push({source:r,target:t.target[i]=[,,,,]}):t.target[i]=ta(r));return e},Y.add=Ii,Y.addAll=Ri,Y.cover=zi,Y.data=Bi,Y.extent=Vi,Y.find=Hi,Y.remove=Ui,Y.removeAll=Wi,Y.root=Gi,Y.size=Ki,Y.visit=qi,Y.visitAfter=Ji,Y.x=Xi,Y.y=Qi;function X(e){return function(){return e}}function Z(e){return(e()-.5)*1e-6}function na(e){return e.x+e.vx}function ra(e){return e.y+e.vy}function ia(e){var t,n,r,i=1,a=1;typeof e!=`function`&&(e=X(e==null?1:+e));function o(){for(var e,o=t.length,c,l,u,d,f,p,m=0;m<a;++m)for(c=$i(t,na,ra).visitAfter(s),e=0;e<o;++e)l=t[e],f=n[l.index],p=f*f,u=l.x+l.vx,d=l.y+l.vy,c.visit(h);function h(e,t,n,a,o){var s=e.data,c=e.r,m=f+c;if(s){if(s.index>l.index){var h=u-s.x-s.vx,g=d-s.y-s.vy,_=h*h+g*g;_<m*m&&(h===0&&(h=Z(r),_+=h*h),g===0&&(g=Z(r),_+=g*g),_=(m-(_=Math.sqrt(_)))/_*i,l.vx+=(h*=_)*(m=(c*=c)/(p+c)),l.vy+=(g*=_)*m,s.vx-=h*(m=1-m),s.vy-=g*m)}return}return t>u+m||a<u-m||n>d+m||o<d-m}}function s(e){if(e.data)return e.r=n[e.data.index];for(var t=e.r=0;t<4;++t)e[t]&&e[t].r>e.r&&(e.r=e[t].r)}function c(){if(t){var r,i=t.length,a;for(n=Array(i),r=0;r<i;++r)a=t[r],n[a.index]=+e(a,r,t)}}return o.initialize=function(e,n){t=e,r=n,c()},o.iterations=function(e){return arguments.length?(a=+e,o):a},o.strength=function(e){return arguments.length?(i=+e,o):i},o.radius=function(t){return arguments.length?(e=typeof t==`function`?t:X(+t),c(),o):e},o}function aa(e){return e.index}function oa(e,t){var n=e.get(t);if(!n)throw Error(`node not found: `+t);return n}function sa(e){var t=aa,n=d,r,i=X(30),a,o,s,c,l,u=1;e??=[];function d(e){return 1/Math.min(s[e.source.index],s[e.target.index])}function f(t){for(var n=0,i=e.length;n<u;++n)for(var o=0,s,d,f,p,m,h,g;o<i;++o)s=e[o],d=s.source,f=s.target,p=f.x+f.vx-d.x-d.vx||Z(l),m=f.y+f.vy-d.y-d.vy||Z(l),h=Math.sqrt(p*p+m*m),h=(h-a[o])/h*t*r[o],p*=h,m*=h,f.vx-=p*(g=c[o]),f.vy-=m*g,d.vx+=p*(g=1-g),d.vy+=m*g}function p(){if(o){var n,i=o.length,l=e.length,u=new Map(o.map((e,n)=>[t(e,n,o),e])),d;for(n=0,s=Array(i);n<l;++n)d=e[n],d.index=n,typeof d.source!=`object`&&(d.source=oa(u,d.source)),typeof d.target!=`object`&&(d.target=oa(u,d.target)),s[d.source.index]=(s[d.source.index]||0)+1,s[d.target.index]=(s[d.target.index]||0)+1;for(n=0,c=Array(l);n<l;++n)d=e[n],c[n]=s[d.source.index]/(s[d.source.index]+s[d.target.index]);r=Array(l),m(),a=Array(l),h()}}function m(){if(o)for(var t=0,i=e.length;t<i;++t)r[t]=+n(e[t],t,e)}function h(){if(o)for(var t=0,n=e.length;t<n;++t)a[t]=+i(e[t],t,e)}return f.initialize=function(e,t){o=e,l=t,p()},f.links=function(t){return arguments.length?(e=t,p(),f):e},f.id=function(e){return arguments.length?(t=e,f):t},f.iterations=function(e){return arguments.length?(u=+e,f):u},f.strength=function(e){return arguments.length?(n=typeof e==`function`?e:X(+e),m(),f):n},f.distance=function(e){return arguments.length?(i=typeof e==`function`?e:X(+e),h(),f):i},f}var ca=1664525,la=1013904223,ua=4294967296;function da(){let e=1;return()=>(e=(ca*e+la)%ua)/ua}function fa(e){return e.x}function pa(e){return e.y}var ma=10,ha=Math.PI*(3-Math.sqrt(5));function ga(e){var t,n=1,r=.001,i=1-r**(1/300),a=0,o=.6,s=new Map,l=lr(f),u=c(`tick`,`end`),d=da();e??=[];function f(){p(),u.call(`tick`,t),n<r&&(l.stop(),u.call(`end`,t))}function p(r){var c,l=e.length,u;r===void 0&&(r=1);for(var d=0;d<r;++d)for(n+=(a-n)*i,s.forEach(function(e){e(n)}),c=0;c<l;++c)u=e[c],u.fx==null?u.x+=u.vx*=o:(u.x=u.fx,u.vx=0),u.fy==null?u.y+=u.vy*=o:(u.y=u.fy,u.vy=0);return t}function m(){for(var t=0,n=e.length,r;t<n;++t){if(r=e[t],r.index=t,r.fx!=null&&(r.x=r.fx),r.fy!=null&&(r.y=r.fy),isNaN(r.x)||isNaN(r.y)){var i=ma*Math.sqrt(.5+t),a=t*ha;r.x=i*Math.cos(a),r.y=i*Math.sin(a)}(isNaN(r.vx)||isNaN(r.vy))&&(r.vx=r.vy=0)}}function h(t){return t.initialize&&t.initialize(e,d),t}return m(),t={tick:p,restart:function(){return l.restart(f),t},stop:function(){return l.stop(),t},nodes:function(n){return arguments.length?(e=n,m(),s.forEach(h),t):e},alpha:function(e){return arguments.length?(n=+e,t):n},alphaMin:function(e){return arguments.length?(r=+e,t):r},alphaDecay:function(e){return arguments.length?(i=+e,t):+i},alphaTarget:function(e){return arguments.length?(a=+e,t):a},velocityDecay:function(e){return arguments.length?(o=1-e,t):1-o},randomSource:function(e){return arguments.length?(d=e,s.forEach(h),t):d},force:function(e,n){return arguments.length>1?(n==null?s.delete(e):s.set(e,h(n)),t):s.get(e)},find:function(t,n,r){var i=0,a=e.length,o,s,c,l,u;for(r==null?r=1/0:r*=r,i=0;i<a;++i)l=e[i],o=t-l.x,s=n-l.y,c=o*o+s*s,c<r&&(u=l,r=c);return u},on:function(e,n){return arguments.length>1?(u.on(e,n),t):u.on(e)}}}function _a(){var e,t,n,r,i=X(-30),a,o=1,s=1/0,c=.81;function l(n){var i,a=e.length,o=$i(e,fa,pa).visitAfter(d);for(r=n,i=0;i<a;++i)t=e[i],o.visit(f)}function u(){if(e){var t,n=e.length,r;for(a=Array(n),t=0;t<n;++t)r=e[t],a[r.index]=+i(r,t,e)}}function d(e){var t=0,n,r,i=0,o,s,c;if(e.length){for(o=s=c=0;c<4;++c)(n=e[c])&&(r=Math.abs(n.value))&&(t+=n.value,i+=r,o+=r*n.x,s+=r*n.y);e.x=o/i,e.y=s/i}else{n=e,n.x=n.data.x,n.y=n.data.y;do t+=a[n.data.index];while(n=n.next)}e.value=t}function f(e,i,l,u){if(!e.value)return!0;var d=e.x-t.x,f=e.y-t.y,p=u-i,m=d*d+f*f;if(p*p/c<m)return m<s&&(d===0&&(d=Z(n),m+=d*d),f===0&&(f=Z(n),m+=f*f),m<o&&(m=Math.sqrt(o*m)),t.vx+=d*e.value*r/m,t.vy+=f*e.value*r/m),!0;if(!(e.length||m>=s)){(e.data!==t||e.next)&&(d===0&&(d=Z(n),m+=d*d),f===0&&(f=Z(n),m+=f*f),m<o&&(m=Math.sqrt(o*m)));do e.data!==t&&(p=a[e.data.index]*r/m,t.vx+=d*p,t.vy+=f*p);while(e=e.next)}}return l.initialize=function(t,r){e=t,n=r,u()},l.strength=function(e){return arguments.length?(i=typeof e==`function`?e:X(+e),u(),l):i},l.distanceMin=function(e){return arguments.length?(o=e*e,l):Math.sqrt(o)},l.distanceMax=function(e){return arguments.length?(s=e*e,l):Math.sqrt(s)},l.theta=function(e){return arguments.length?(c=e*e,l):Math.sqrt(c)},l}var va=e=>()=>e;function ya(e,{sourceEvent:t,target:n,transform:r,dispatch:i}){Object.defineProperties(this,{type:{value:e,enumerable:!0,configurable:!0},sourceEvent:{value:t,enumerable:!0,configurable:!0},target:{value:n,enumerable:!0,configurable:!0},transform:{value:r,enumerable:!0,configurable:!0},_:{value:i}})}function Q(e,t,n){this.k=e,this.x=t,this.y=n}Q.prototype={constructor:Q,scale:function(e){return e===1?this:new Q(this.k*e,this.x,this.y)},translate:function(e,t){return e===0&t===0?this:new Q(this.k,this.x+this.k*e,this.y+this.k*t)},apply:function(e){return[e[0]*this.k+this.x,e[1]*this.k+this.y]},applyX:function(e){return e*this.k+this.x},applyY:function(e){return e*this.k+this.y},invert:function(e){return[(e[0]-this.x)/this.k,(e[1]-this.y)/this.k]},invertX:function(e){return(e-this.x)/this.k},invertY:function(e){return(e-this.y)/this.k},rescaleX:function(e){return e.copy().domain(e.range().map(this.invertX,this).map(e.invert,e))},rescaleY:function(e){return e.copy().domain(e.range().map(this.invertY,this).map(e.invert,e))},toString:function(){return`translate(`+this.x+`,`+this.y+`) scale(`+this.k+`)`}};var ba=new Q(1,0,0);xa.prototype=Q.prototype;function xa(e){for(;!e.__zoom;)if(!(e=e.parentNode))return ba;return e.__zoom}function Sa(e){e.stopImmediatePropagation()}function $(e){e.preventDefault(),e.stopImmediatePropagation()}function Ca(e){return(!e.ctrlKey||e.type===`wheel`)&&!e.button}function wa(){var e=this;return e instanceof SVGElement?(e=e.ownerSVGElement||e,e.hasAttribute(`viewBox`)?(e=e.viewBox.baseVal,[[e.x,e.y],[e.x+e.width,e.y+e.height]]):[[0,0],[e.width.baseVal.value,e.height.baseVal.value]]):[[0,0],[e.clientWidth,e.clientHeight]]}function Ta(){return this.__zoom||ba}function Ea(e){return-e.deltaY*(e.deltaMode===1?.05:e.deltaMode?1:.002)*(e.ctrlKey?10:1)}function Da(){return navigator.maxTouchPoints||`ontouchstart`in this}function Oa(e,t,n){var r=e.invertX(t[0][0])-n[0][0],i=e.invertX(t[1][0])-n[1][0],a=e.invertY(t[0][1])-n[0][1],o=e.invertY(t[1][1])-n[1][1];return e.translate(i>r?(r+i)/2:Math.min(0,r)||Math.max(0,i),o>a?(a+o)/2:Math.min(0,a)||Math.max(0,o))}function ka(){var e=Ca,t=wa,n=Oa,r=Ea,i=Da,a=[0,1/0],o=[[-1/0,-1/0],[1/0,1/0]],s=250,l=Qn,u=c(`start`,`zoom`,`end`),d,f,p,m=500,h=150,g=0,_=10;function v(e){e.property(`__zoom`,Ta).on(`wheel.zoom`,ne,{passive:!1}).on(`mousedown.zoom`,re).on(`dblclick.zoom`,ie).filter(i).on(`touchstart.zoom`,ae).on(`touchmove.zoom`,oe).on(`touchend.zoom touchcancel.zoom`,se).style(`-webkit-tap-highlight-color`,`rgba(0,0,0,0)`)}v.transform=function(e,t,n,r){var i=e.selection?e.selection():e;i.property(`__zoom`,Ta),e===i?i.interrupt().each(function(){S(this,arguments).event(r).start().zoom(null,typeof t==`function`?t.apply(this,arguments):t).end()}):ee(e,t,n,r)},v.scaleBy=function(e,t,n,r){v.scaleTo(e,function(){return this.__zoom.k*(typeof t==`function`?t.apply(this,arguments):t)},n,r)},v.scaleTo=function(e,r,i,a){v.transform(e,function(){var e=t.apply(this,arguments),a=this.__zoom,s=i==null?x(e):typeof i==`function`?i.apply(this,arguments):i,c=a.invert(s),l=typeof r==`function`?r.apply(this,arguments):r;return n(b(y(a,l),s,c),e,o)},i,a)},v.translateBy=function(e,r,i,a){v.transform(e,function(){return n(this.__zoom.translate(typeof r==`function`?r.apply(this,arguments):r,typeof i==`function`?i.apply(this,arguments):i),t.apply(this,arguments),o)},null,a)},v.translateTo=function(e,r,i,a,s){v.transform(e,function(){var e=t.apply(this,arguments),s=this.__zoom,c=a==null?x(e):typeof a==`function`?a.apply(this,arguments):a;return n(ba.translate(c[0],c[1]).scale(s.k).translate(typeof r==`function`?-r.apply(this,arguments):-r,typeof i==`function`?-i.apply(this,arguments):-i),e,o)},a,s)};function y(e,t){return t=Math.max(a[0],Math.min(a[1],t)),t===e.k?e:new Q(t,e.x,e.y)}function b(e,t,n){var r=t[0]-n[0]*e.k,i=t[1]-n[1]*e.k;return r===e.x&&i===e.y?e:new Q(e.k,r,i)}function x(e){return[(+e[0][0]+ +e[1][0])/2,(+e[0][1]+ +e[1][1])/2]}function ee(e,n,r,i){e.on(`start.zoom`,function(){S(this,arguments).event(i).start()}).on(`interrupt.zoom end.zoom`,function(){S(this,arguments).event(i).end()}).tween(`zoom`,function(){var e=this,a=arguments,o=S(e,a).event(i),s=t.apply(e,a),c=r==null?x(s):typeof r==`function`?r.apply(e,a):r,u=Math.max(s[1][0]-s[0][0],s[1][1]-s[0][1]),d=e.__zoom,f=typeof n==`function`?n.apply(e,a):n,p=l(d.invert(c).concat(u/d.k),f.invert(c).concat(u/f.k));return function(e){if(e===1)e=f;else{var t=p(e),n=u/t[2];e=new Q(n,c[0]-t[0]*n,c[1]-t[1]*n)}o.zoom(null,e)}})}function S(e,t,n){return!n&&e.__zooming||new te(e,t)}function te(e,n){this.that=e,this.args=n,this.active=0,this.sourceEvent=null,this.extent=t.apply(e,n),this.taps=0}te.prototype={event:function(e){return e&&(this.sourceEvent=e),this},start:function(){return++this.active===1&&(this.that.__zooming=this,this.emit(`start`)),this},zoom:function(e,t){return this.mouse&&e!==`mouse`&&(this.mouse[1]=t.invert(this.mouse[0])),this.touch0&&e!==`touch`&&(this.touch0[1]=t.invert(this.touch0[0])),this.touch1&&e!==`touch`&&(this.touch1[1]=t.invert(this.touch1[0])),this.that.__zoom=t,this.emit(`zoom`),this},end:function(){return--this.active===0&&(delete this.that.__zooming,this.emit(`end`)),this},emit:function(e){var t=E(this.that).datum();u.call(e,this.that,new ya(e,{sourceEvent:this.sourceEvent,target:v,type:e,transform:this.that.__zoom,dispatch:u}),t)}};function ne(t,...i){if(!e.apply(this,arguments))return;var s=S(this,i).event(t),c=this.__zoom,l=Math.max(a[0],Math.min(a[1],c.k*2**r.apply(this,arguments))),u=D(t);if(s.wheel)(s.mouse[0][0]!==u[0]||s.mouse[0][1]!==u[1])&&(s.mouse[1]=c.invert(s.mouse[0]=u)),clearTimeout(s.wheel);else if(c.k===l)return;else s.mouse=[u,c.invert(u)],xr(this),s.start();$(t),s.wheel=setTimeout(d,h),s.zoom(`mouse`,n(b(y(c,l),s.mouse[0],s.mouse[1]),s.extent,o));function d(){s.wheel=null,s.end()}}function re(t,...r){if(p||!e.apply(this,arguments))return;var i=t.currentTarget,a=S(this,r,!0).event(t),s=E(t.view).on(`mousemove.zoom`,d,!0).on(`mouseup.zoom`,f,!0),c=D(t,i),l=t.clientX,u=t.clientY;Ht(t.view),Sa(t),a.mouse=[c,this.__zoom.invert(c)],xr(this),a.start();function d(e){if($(e),!a.moved){var t=e.clientX-l,r=e.clientY-u;a.moved=t*t+r*r>g}a.event(e).zoom(`mouse`,n(b(a.that.__zoom,a.mouse[0]=D(e,i),a.mouse[1]),a.extent,o))}function f(e){s.on(`mousemove.zoom mouseup.zoom`,null),Ut(e.view,a.moved),$(e),a.event(e).end()}}function ie(r,...i){if(e.apply(this,arguments)){var a=this.__zoom,c=D(r.changedTouches?r.changedTouches[0]:r,this),l=a.invert(c),u=a.k*(r.shiftKey?.5:2),d=n(b(y(a,u),c,l),t.apply(this,i),o);$(r),s>0?E(this).transition().duration(s).call(ee,d,c,r):E(this).call(v.transform,d,c,r)}}function ae(t,...n){if(e.apply(this,arguments)){var r=t.touches,i=r.length,a=S(this,n,t.changedTouches.length===i).event(t),o,s,c,l;for(Sa(t),s=0;s<i;++s)c=r[s],l=D(c,this),l=[l,this.__zoom.invert(l),c.identifier],a.touch0?!a.touch1&&a.touch0[2]!==l[2]&&(a.touch1=l,a.taps=0):(a.touch0=l,o=!0,a.taps=1+!!d);d&&=clearTimeout(d),o&&(a.taps<2&&(f=l[0],d=setTimeout(function(){d=null},m)),xr(this),a.start())}}function oe(e,...t){if(this.__zooming){var r=S(this,t).event(e),i=e.changedTouches,a=i.length,s,c,l,u;for($(e),s=0;s<a;++s)c=i[s],l=D(c,this),r.touch0&&r.touch0[2]===c.identifier?r.touch0[0]=l:r.touch1&&r.touch1[2]===c.identifier&&(r.touch1[0]=l);if(c=r.that.__zoom,r.touch1){var d=r.touch0[0],f=r.touch0[1],p=r.touch1[0],m=r.touch1[1],h=(h=p[0]-d[0])*h+(h=p[1]-d[1])*h,g=(g=m[0]-f[0])*g+(g=m[1]-f[1])*g;c=y(c,Math.sqrt(h/g)),l=[(d[0]+p[0])/2,(d[1]+p[1])/2],u=[(f[0]+m[0])/2,(f[1]+m[1])/2]}else if(r.touch0)l=r.touch0[0],u=r.touch0[1];else return;r.zoom(`touch`,n(b(c,l,u),r.extent,o))}}function se(e,...t){if(this.__zooming){var n=S(this,t).event(e),r=e.changedTouches,i=r.length,a,o;for(Sa(e),p&&clearTimeout(p),p=setTimeout(function(){p=null},m),a=0;a<i;++a)o=r[a],n.touch0&&n.touch0[2]===o.identifier?delete n.touch0:n.touch1&&n.touch1[2]===o.identifier&&delete n.touch1;if(n.touch1&&!n.touch0&&(n.touch0=n.touch1,delete n.touch1),n.touch0)n.touch0[1]=this.__zoom.invert(n.touch0[0]);else if(n.end(),n.taps===2&&(o=D(o,this),Math.hypot(f[0]-o[0],f[1]-o[1])<_)){var s=E(this).on(`dblclick.zoom`);s&&s.apply(this,arguments)}}}return v.wheelDelta=function(e){return arguments.length?(r=typeof e==`function`?e:va(+e),v):r},v.filter=function(t){return arguments.length?(e=typeof t==`function`?t:va(!!t),v):e},v.touchable=function(e){return arguments.length?(i=typeof e==`function`?e:va(!!e),v):i},v.extent=function(e){return arguments.length?(t=typeof e==`function`?e:va([[+e[0][0],+e[0][1]],[+e[1][0],+e[1][1]]]),v):t},v.scaleExtent=function(e){return arguments.length?(a[0]=+e[0],a[1]=+e[1],v):[a[0],a[1]]},v.translateExtent=function(e){return arguments.length?(o[0][0]=+e[0][0],o[1][0]=+e[1][0],o[0][1]=+e[0][1],o[1][1]=+e[1][1],v):[[o[0][0],o[0][1]],[o[1][0],o[1][1]]]},v.constrain=function(e){return arguments.length?(n=e,v):n},v.duration=function(e){return arguments.length?(s=+e,v):s},v.interpolate=function(e){return arguments.length?(l=e,v):l},v.on=function(){var e=u.on.apply(u,arguments);return e===u?v:e},v.clickDistance=function(e){return arguments.length?(g=(e=+e)*e,v):Math.sqrt(g)},v.tapDistance=function(e){return arguments.length?(_=+e,v):_},v}var Aa=[i,a,o,{path:`/graph/:id`,navKey:`dashboard`,async render(e,t){let n=t.id,[i,a]=await Promise.all([r.getUserDetail(n),r.getGraphData(n,10)]);if(!i){e.innerHTML=`
        <div class="glass-card" style="text-align:center;padding:3rem;margin-top:2rem;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size:3rem;color:var(--color-accent);margin-bottom:1rem;"></i>
          <h2 style="font-family:var(--font-display);font-weight:700;margin-bottom:0.5rem;">Lector No Encontrado</h2>
          <p style="color:var(--text-secondary);margin-bottom:1.5rem;">No pudimos recuperar la red de conexiones del lector con ID: ${n}</p>
          <a href="#/" class="btn btn-primary">Volver al Inicio</a>
        </div>
      `;return}e.innerHTML=`
      <div style="margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center;">
        <a href="#/user/${n}" style="color:var(--text-secondary); text-decoration:none; font-weight:600; font-size:0.9rem;" onmouseover="this.style.color='var(--color-accent)'" onmouseout="this.style.color='var(--text-secondary)'">
          <i class="fa-solid fa-chevron-left"></i> Volver a Recomendaciones
        </a>
        <h2 style="font-family:var(--font-display); font-size:1.35rem; font-weight:700; margin:0;">
          Red de Conexiones de ${i.name}
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
                <span>Lector Principal (${i.name.split(` `)[0]})</span>
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
    `,this.renderD3Graph(n,a)},renderD3Graph(e,t){let n=document.getElementById(`graph-container`),i=n.clientWidth||800,a=n.clientHeight||600;E(`#graph-container svg`).remove();let o=E(`#graph-container`).append(`svg`).attr(`width`,i).attr(`height`,a),s=o.append(`g`);o.call(ka().scaleExtent([.1,4]).on(`zoom`,e=>{s.attr(`transform`,e.transform)}));let c=ga(t.nodes).force(`link`,sa(t.links).id(e=>e.id).distance(e=>e.type===`similarity`?120:e.type===`checkout`||e.type===`shared_checkout`?65:90)).force(`charge`,_a().strength(-150)).force(`center`,Fi(i/2,a/2)).force(`collide`,ia().radius(22)),l=e=>e.type===`target_user`?`#f43f5e`:e.type===`target_book`?`var(--color-content)`:e.type===`similar_user`?`var(--color-collab)`:e.type===`collab_book`?`var(--color-hybrid)`:`#9e8f80`,u=s.append(`g`).attr(`class`,`links`).selectAll(`line`).data(t.links).enter().append(`line`).attr(`class`,`link`).attr(`stroke`,e=>e.type===`similarity`?`var(--color-collab)`:e.type===`checkout`?`var(--color-content)`:e.type===`shared_checkout`?`var(--color-gold)`:`rgba(112, 99, 86, 0.2)`).attr(`stroke-width`,e=>e.type===`similarity`?e.value*8:e.type===`checkout`||e.type===`shared_checkout`?1.5:1).attr(`stroke-opacity`,.5).attr(`stroke-dasharray`,e=>e.type===`shared_checkout`?`3,3`:null),d=s.append(`g`).attr(`class`,`nodes`).selectAll(`circle`).data(t.nodes).enter().append(`circle`).attr(`class`,`node`).attr(`r`,e=>e.type===`target_user`?18:e.type===`similar_user`?12:e.type===`target_book`||e.type===`collab_book`?8:6).attr(`fill`,l).call(Xt().on(`start`,h).on(`drag`,g).on(`end`,_)),f=s.append(`g`).attr(`class`,`labels`).selectAll(`text`).data(t.nodes.filter(e=>e.type===`target_user`||e.type===`similar_user`)).enter().append(`text`).attr(`dy`,-20).attr(`text-anchor`,`middle`).text(e=>e.name.split(` `)[0]),p=document.getElementById(`graph-tooltip`),m=document.getElementById(`graph-side-panel`);d.on(`mouseover`,function(e,t){u.style(`stroke-opacity`,e=>e.source.id===t.id||e.target.id===t.id?.9:.1),u.style(`stroke-width`,e=>e.source.id===t.id||e.target.id===t.id?3:1),p.style.display=`block`;let r=``;t.type===`target_user`?r=`<strong>Lector Principal:</strong><br>${t.name}`:t.type===`similar_user`?r=`<strong>Lector Afín:</strong><br>${t.name}<br>Afinidad: ${Math.round(t.similarity*100)}%`:t.type===`target_book`?r=`<strong>Libro en Historial:</strong><br>${t.name}`:t.type===`collab_book`&&(r=`<strong>Sugerencia de Red:</strong><br>${t.name}`),p.innerHTML=r;let i=n.getBoundingClientRect();p.style.left=`${e.clientX-i.left+15}px`,p.style.top=`${e.clientY-i.top+15}px`}),d.on(`mousemove`,function(e){let t=n.getBoundingClientRect();p.style.left=`${e.clientX-t.left+15}px`,p.style.top=`${e.clientY-t.top+15}px`}),d.on(`mouseout`,function(){u.style(`stroke-opacity`,.5),u.style(`stroke-width`,e=>e.type===`similarity`?e.value*8:e.type===`checkout`||e.type===`shared_checkout`?1.5:1),p.style.display=`none`}),d.on(`click`,async(e,n)=>{m.innerHTML=`<div style="text-align:center; padding:3rem;"><i class="fa fa-spinner fa-spin fa-2x" style="color:var(--color-accent)"></i></div>`;try{if(n.type===`similar_user`||n.type===`target_user`){let e=n.id,i=await r.getUserDetail(e),a=``,o=``;if(n.type===`similar_user`){a=`
              <div style="background:var(--bg-secondary); border:1px solid var(--border-light); border-radius:0.25rem; padding:0.75rem; margin-bottom:1rem; text-align:center;">
                <div style="font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase; font-weight:600;">Afinidad de Lectura (Jaccard)</div>
                <div style="font-size:1.5rem; font-weight:700; color:var(--color-collab); font-family:var(--font-display);">${Math.round(n.similarity*100)}%</div>
              </div>
            `;let r=t.links.filter(t=>t.type===`shared_checkout`&&t.source.id===e).map(e=>e.target.id.replace(`book_`,``)),s=i.checkouts.filter(e=>r.includes(e.book_id));o=`
              <h4 style="font-size:0.85rem; font-weight:700; margin-bottom:0.5rem; color:var(--color-gold);"><i class="fa-solid fa-handshake"></i> Libros Compartidos (${s.length})</h4>
              <div style="display:flex; flex-direction:column; gap:0.4rem; margin-bottom:1rem;">
                ${s.map(e=>`
                  <div class="inspector-shared-book">
                    <i class="fa-regular fa-book"></i>
                    <span>${e.title}</span>
                  </div>
                `).join(``)}
              </div>
            `}m.innerHTML=`
            <div>
              <h4 style="font-family:var(--font-display); font-size:1.25rem; font-weight:700; margin-bottom:0.25rem;">${i.name}</h4>
              <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:1rem;"><i class="fa-regular fa-envelope"></i> ${i.email}</p>
              
              ${a}
              ${o}
              
              <h4 style="font-size:0.85rem; font-weight:700; margin-bottom:0.5rem;"><i class="fa-solid fa-list-check"></i> Historial de Préstamos (${i.checkouts.length})</h4>
              <div class="inspector-scroll-list">
                ${i.checkouts.map(e=>`
                  <a href="#/book/${e.book_id}" class="inspector-book-item">
                    <i class="fa-regular fa-book"></i>
                    <span class="inspector-book-title">${e.title}</span>
                  </a>
                `).join(``)}
              </div>
              
              <a href="#/user/${e}" class="btn btn-primary" style="width:100%; justify-content:center; margin-top:1.25rem; font-size:0.8rem;">
                Ver Recomendaciones del Lector
              </a>
            </div>
          `}else if(n.type===`target_book`||n.type===`collab_book`){let e=n.id.replace(`book_`,``),i=await r.getBookDetail(e),a=``;a=n.type===`collab_book`?`
              <div style="background:rgba(179, 143, 77, 0.08); border:1px solid rgba(179, 143, 77, 0.2); border-radius:0.25rem; padding:0.75rem; margin-bottom:1rem; font-size:0.8rem;">
                <span style="font-weight:700; color:var(--color-hybrid);"><i class="fa-solid fa-lightbulb"></i> Sugerencia de Red (Colaborativa)</span><br>
                Obra solicitada por otros lectores de gustos afines: <strong>${t.links.filter(e=>e.target.id===n.id&&e.type===`checkout`).map(e=>e.source.name).join(`, `)}</strong>.
              </div>
            `:`
              <div style="background:rgba(86, 105, 122, 0.08); border:1px solid rgba(86, 105, 122, 0.2); border-radius:0.25rem; padding:0.75rem; margin-bottom:1rem; font-size:0.8rem;">
                <span style="font-weight:700; color:var(--color-content);"><i class="fa-solid fa-book-open"></i> En Historial Activo</span><br>
                Esta obra forma parte de sus préstamos registrados.
              </div>
            `,m.innerHTML=`
            <div>
              <span class="source-badge ${n.type===`target_book`?`content`:`both`}" style="font-size:0.65rem; margin-bottom:0.4rem;">
                Obra N°: ${e}
              </span>
              <h4 style="font-family:var(--font-display); font-size:1.25rem; font-weight:700; margin-bottom:0.75rem; line-height:1.2;">${i.title}</h4>
              
              ${a}
              
              <h5 style="font-size:0.8rem; font-weight:700; margin-bottom:0.25rem;">Sinopsis:</h5>
              <div class="inspector-synopsis">
                ${i.description||`No hay descripción disponible para esta obra.`}
              </div>
              
              <a href="#/book/${e}" class="btn btn-primary" style="width:100%; justify-content:center; font-size:0.8rem;">
                Explorar Títulos Similares
              </a>
            </div>
          `}}catch(e){m.innerHTML=`<div style="text-align:center; padding:2rem; color:var(--color-accent);">Error al cargar detalle: ${e.message}</div>`}}),c.on(`tick`,()=>{u.attr(`x1`,e=>e.source.x).attr(`y1`,e=>e.source.y).attr(`x2`,e=>e.target.x).attr(`y2`,e=>e.target.y),d.attr(`cx`,e=>e.x).attr(`cy`,e=>e.y),f.attr(`x`,e=>e.x).attr(`y`,e=>e.y)});function h(e,t){e.active||c.alphaTarget(.3).restart(),t.fx=t.x,t.fy=t.y}function g(e,t){t.fx=e.x,t.fy=e.y}function _(e,t){e.active||c.alphaTarget(0),t.fx=null,t.fy=null}}}];document.addEventListener(`DOMContentLoaded`,()=>{new e(Aa,`app`).init()});