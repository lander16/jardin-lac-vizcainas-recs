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
          <a href="#/catalog" class="nav-link" id="nav-catalog">
            <i class="fa-solid fa-building-columns"></i> Catálogo
          </a>
        </nav>
      </header>
      <main class="container" id="router-view"></main>
      <footer style="text-align:center;padding:1.5rem;color:var(--text-muted);font-size:0.8rem;border-top:1px solid var(--border-light);margin-top:2rem;">
        &copy; 2026 Jardín LAC Vizcaínas &bull; POC de Sistema de Recomendaciones
      </footer>
    `)}updateActiveNav(e){document.querySelectorAll(`.nav-link`).forEach(e=>e.classList.remove(`active`));let t=document.getElementById(`nav-${e}`);t&&t.classList.add(`active`)}},t=window.location.origin.includes(`:5173`)?`http://127.0.0.1:8000/api`:`/api`;async function n(e,n={}){try{let r=`${t}${e}`,i=await fetch(r,{...n,headers:{"Content-Type":`application/json`,...n.headers||{}}});if(!i.ok){let e=await i.json().catch(()=>({}));throw Error(e.detail||`HTTP error! status: ${i.status}`)}return await i.json()}catch(t){throw console.error(`API Error on ${e}:`,t),t}}var r={getUsers:()=>n(`/users`),getUserDetail:e=>n(`/users/${e}`),getRecommendations:(e,t=.33,r,i)=>n(r===void 0&&i===void 0?`/users/${e}/recommendations?alpha=${t}`:`/users/${e}/recommendations?w_content=${t}&w_collab=${r}&w_auth=${i}`),checkoutBook:(e,t,r=``,i=``)=>n(`/users/${e}/checkout`,{method:`POST`,body:JSON.stringify({book_id:t,title:r,description:i})}),getBookDetail:e=>n(`/books/${e}`),searchBooks:e=>n(`/books?q=${encodeURIComponent(e)}`),getGraphData:(e,t=15)=>n(`/graph/${e}?limit=${t}`),getStats:()=>n(`/stats`),resetCheckouts:()=>n(`/reset`,{method:`POST`}),getCatalogStats:()=>n(`/catalog/stats`),getCatalogBooks:(e=``,t=100)=>{let r=new URLSearchParams;return e&&r.set(`q`,e),t&&r.set(`limit`,t),n(`/catalog/books?${r.toString()}`)},getCatalogBook:e=>n(`/catalog/books/${e}`),getCatalogGraph:(e,t=15)=>n(`/catalog/graph/${e}?limit=${t}`),getCatalogAuthorities:(e=null,t=100)=>{let r=new URLSearchParams;return e&&r.set(`type`,e),t&&r.set(`limit`,t),n(`/catalog/authorities?${r.toString()}`)},getCatalogAuthority:e=>n(`/catalog/authorities/${e}`)},i={path:`/`,navKey:`dashboard`,async render(e){let[t,n]=await Promise.all([r.getStats(),r.getUsers()]);e.innerHTML=`
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
            <h2>Lectores</h2>
            <p>${t.total_users}</p>
          </div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-icon books">
            <i class="fa-solid fa-book"></i>
          </div>
          <div class="stat-info">
            <h2>Títulos Únicos</h2>
            <p>${t.total_books}</p>
          </div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-icon checkouts">
            <i class="fa-solid fa-book-open-reader"></i>
          </div>
          <div class="stat-info">
            <h2>Préstamos Totales</h2>
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

          <div class="directory-scroll-container">
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
        </div>

        <div style="display:flex; flex-direction:column; gap:1.5rem;">
          <div class="glass-card" style="margin-bottom:1.5rem;">
            <div class="section-title">
              <i class="fa-solid fa-fire" style="color:var(--color-collab)"></i>
              <h2>Libros Más Solicitados</h2>
            </div>
            <div style="display:flex; flex-direction:column; gap:0.75rem;">
              ${t.popular_books.map((e,t)=>`
                <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-primary); padding:0.6rem 0.8rem; border-radius:0.25rem; border:1px solid var(--border-light); gap:0.5rem; min-width:0;">
                  <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:0.88rem; font-weight:500; min-width:0; flex:1;">
                    <span style="color:var(--text-muted); margin-right:0.4rem; font-family:var(--font-display); font-weight:700;">#${t+1}</span>
                    <a href="#/book/${e.book_id}" style="color:var(--text-primary); text-decoration:none; font-family:var(--font-sans);" onmouseover="this.style.color='var(--color-accent)'" onmouseout="this.style.color='var(--text-primary)'">${e.title}</a>
                  </div>
                  <span class="source-badge collaborative" style="font-size:0.68rem; padding:0.15rem 0.4rem; flex-shrink:0;">
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
    `,this.bindEvents(n)},renderUsersRows(e){return e.length===0?`<tr><td class="no-label" colspan="5" style="text-align:center;color:var(--text-secondary);padding:2rem;width:100%;">No se encontraron lectores.</td></tr>`:e.map(e=>`
      <tr>
        <td>
          <a href="#/user/${e.user_id}" style="color:var(--text-primary); font-weight:600; text-decoration:none;">${e.name}</a>
        </td>
        <td style="font-family:monospace; color:var(--text-secondary);">${e.cardnumber}</td>
        <td style="color:var(--text-secondary);">${e.email}</td>
        <td class="text-center" style="font-weight:600; font-family:var(--font-display); font-size:1.1rem;">${e.checkout_count}</td>
        <td class="text-right">
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
    `).join(``)},bindEvents(e){let t=document.getElementById(`user-search`),n=document.getElementById(`users-table-body`),i=document.getElementById(`btn-reset-checkouts`);t&&n&&t.addEventListener(`input`,t=>{let r=t.target.value.toLowerCase().trim(),i=e.filter(e=>e.name.toLowerCase().includes(r)||e.email.toLowerCase().includes(r)||e.cardnumber.includes(r));n.innerHTML=this.renderUsersRows(i)}),i&&i.addEventListener(`click`,async()=>{if(confirm(`¿Está seguro de que desea restablecer todos los préstamos agregados de vuelta a los datos base del CSV? Se perderán las simulaciones registradas.`))try{i.disabled=!0,i.innerHTML=`<i class="fa fa-spinner fa-spin"></i> Restableciendo...`,await r.resetCheckouts(),alert(`¡Préstamos restablecidos con éxito!`),window.location.reload()}catch(e){alert(`Error al restablecer: ${e.message}`),i.disabled=!1,i.innerHTML=`<i class="fa-solid fa-rotate-left"></i> Restablecer Préstamos`}})}},a={path:`/user/:id`,navKey:`dashboard`,async render(e,t){let n=t.id,[i,a]=await Promise.all([r.getUserDetail(n),r.getRecommendations(n,.33,.33,.34)]);if(!i){e.innerHTML=`
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
      `:e.map(e=>{let t=``,n=``,r=``,i=``;e.source===`all`?(t=`both`,n=`Alta Recomendación`,r=`<i class="fa-solid fa-star" style="color:var(--color-gold);"></i>`,i=`all`):e.source===`multiple`?(t=`both`,n=`Multi-fuente`,r=`<i class="fa-solid fa-layer-group"></i>`,i=`multiple`):e.source===`content`?(t=`content`,n=`Contenido`,r=`<i class="fa-solid fa-tag"></i>`,i=`content`):e.source===`collaborative`?(t=`collaborative`,n=`Red de Lectores`,r=`<i class="fa-solid fa-user-group"></i>`,i=`collaborative`):e.source===`authority`?(t=`authority`,n=`Autoridades`,r=`<i class="fa-solid fa-bookmark"></i>`,i=`authority`):(t=`both`,n=`Recomendado`,r=`<i class="fa-solid fa-star"></i>`,i=`both`);let a=Math.round(e.hybrid_score*100);return`
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
      `}).join(``)},renderExplanationDetails(e){let t=``,n=``,r=``;return e.content_details&&e.content_details.length>0&&(t=`
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
      `),e.auth_details&&e.auth_details.length>0&&(r=`
        <div class="explanation-section">
          <div class="explanation-title auth">
            <i class="fa-solid fa-bookmark"></i> Conexión por autoridades Koha
          </div>
          ${e.auth_details.map(e=>{let t=e.shared_authorities.map(e=>{let t=e.type,n=``;return n=e.type===`Autor`?`#7c1933`:e.type===`Tema`?`#52755e`:e.type===`Lugar`?`#56697a`:e.type===`Institución / Organización`||e.type===`Corporativo`?`#b38f4d`:`#7d4f9b`,`<span class="tag" style="background:${n}15; color:${n}; border:1px solid ${n}30; padding:0.1rem 0.35rem; border-radius:3px; font-size:0.75rem; font-weight:600; margin-right:0.25rem; white-space:nowrap; display:inline-block; margin-top:0.25rem;">${e.name} (${t})</span>`}).join(` `);return`
              <div class="explanation-row" style="flex-direction:column; align-items:flex-start; gap:0.25rem; margin-bottom:0.75rem;">
                <div style="font-size:0.8rem;">
                  Conectado con: <strong>${e.related_title}</strong>
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:0.15rem; margin-top:0.15rem; width:100%;">
                  ${t}
                </div>
              </div>
            `}).join(``)}
        </div>
      `),[t,n,r].filter(e=>e!==``).join(`<div style="margin: 0.75rem 0; border-top:1px solid rgba(0,0,0,0.05);"></div>`)},bindEvents(e,t){let n=document.getElementById(`weight-content-slider`),i=document.getElementById(`weight-collab-slider`),a=document.getElementById(`weight-auth-slider`),o=document.getElementById(`weight-content-pct`),s=document.getElementById(`weight-collab-pct`),c=document.getElementById(`weight-auth-pct`),l=document.getElementById(`weights-value-display`),u=document.getElementById(`recs-container`),d=document.getElementById(`btn-add-checkout`),f=document.getElementById(`checkout-modal`),p=document.getElementById(`modal-close-btn`),m=document.getElementById(`modal-book-search`),h=document.getElementById(`modal-search-results`),g=new Set(t.map(e=>e.book_id)),_={content:33,collab:33,auth:34},v=async(t,d)=>{d=parseInt(d);let f=[`content`,`collab`,`auth`].filter(e=>e!==t),p=_[f[0]]+_[f[1]],m=100-d,h,g;p>0?(h=Math.round(_[f[0]]/p*m),g=m-h):(h=Math.round(m/2),g=m-h),_[t]=d,_[f[0]]=h,_[f[1]]=g,n.value=_.content,i.value=_.collab,a.value=_.auth,o.innerText=`${_.content}%`,s.innerText=`${_.collab}%`,c.innerText=`${_.auth}%`,l.innerHTML=`Configuración: ${_.content}% Contenido / ${_.collab}% Lectores / ${_.auth}% Autoridades`;try{let t=await r.getRecommendations(e,_.content/100,_.collab/100,_.auth/100);u.innerHTML=this.renderRecommendationsList(t.recommendations),this.bindAccordions()}catch(e){console.error(`Failed to fetch dynamic recommendations:`,e)}};if(n&&i&&a&&u&&(n.addEventListener(`input`,e=>v(`content`,e.target.value)),i.addEventListener(`input`,e=>v(`collab`,e.target.value)),a.addEventListener(`input`,e=>v(`auth`,e.target.value))),d&&f&&p){d.addEventListener(`click`,()=>{f.classList.add(`active`),m.value=``,m.focus(),h.innerHTML=`<div style="text-align:center; padding:2rem; color:var(--text-secondary);">Comience a escribir para buscar libros...</div>`}),p.addEventListener(`click`,()=>{f.classList.remove(`active`)}),f.addEventListener(`click`,e=>{e.target===f&&f.classList.remove(`active`)});let t=null;m.addEventListener(`input`,n=>{clearTimeout(t);let i=n.target.value.trim();if(i.length<2){h.innerHTML=`<div style="text-align:center; padding:2rem; color:var(--text-secondary);">Escriba al menos 2 caracteres para buscar...</div>`;return}h.innerHTML=`<div style="text-align:center; padding:2rem; color:var(--text-secondary);"><i class="fa fa-spinner fa-spin"></i> Buscando...</div>`,t=setTimeout(async()=>{try{let t=await r.searchBooks(i);if(t.length===0){h.innerHTML=`<div style="text-align:center; padding:2rem; color:var(--text-secondary);">No se encontraron obras que coincidan.</div>`;return}h.innerHTML=t.map(e=>{let t=g.has(e.book_id);return`
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
              `}).join(``),document.querySelectorAll(`.checkout-action-btn`).forEach(t=>{t.addEventListener(`click`,async t=>{let n=t.target.dataset.bookId,i=t.target.dataset.bookTitle;try{t.target.disabled=!0,t.target.innerHTML=`<i class="fa fa-spinner fa-spin"></i>`,await r.checkoutBook(e,n,i),alert(`¡Préstamo de "${i}" registrado con éxito! Actualizando recomendaciones...`),f.classList.remove(`active`),window.location.reload()}catch(e){alert(`Error al registrar el préstamo: ${e.message}`),t.target.disabled=!1,t.target.innerHTML=`Prestar`}})})}catch(e){h.innerHTML=`<div style="text-align:center; padding:2rem; color:var(--color-accent);">Error en la búsqueda: ${e.message}</div>`}},300)})}this.bindAccordions()},bindAccordions(){document.querySelectorAll(`.explanation-btn`).forEach(e=>{e.addEventListener(`click`,e=>{let t=e.target.closest(`.explanation-btn`),n=t.dataset.bookId,r=document.getElementById(`exp-panel-${n}`),i=t.querySelector(`i`);r&&(r.classList.contains(`active`)?(r.classList.remove(`active`),i.className=`fa-solid fa-chevron-down`):(r.classList.add(`active`),i.className=`fa-solid fa-chevron-up`))})})}},o={path:`/book/:id`,navKey:`dashboard`,async render(e,t){let n=t.id,i=await r.getBookDetail(n);if(!i){e.innerHTML=`
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
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem; gap:0.5rem; min-width:0;">
                    <a href="#/book/${e.book_id}" style="color:var(--text-primary); font-weight:600; font-size:0.88rem; text-decoration:none; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;" title="${e.title}">
                      ${e.title}
                    </a>
                    <span class="similarity-badge" style="flex-shrink:0;">${n}% afinidad</span>
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
    `}},s={value:()=>{}};function c(){for(var e=0,t=arguments.length,n={},r;e<t;++e){if(!(r=arguments[e]+``)||r in n||/[\s.]/.test(r))throw Error(`illegal type: `+r);n[r]=[]}return new l(n)}function l(e){this._=e}function u(e,t){return e.trim().split(/^|\s+/).map(function(e){var n=``,r=e.indexOf(`.`);if(r>=0&&(n=e.slice(r+1),e=e.slice(0,r)),e&&!t.hasOwnProperty(e))throw Error(`unknown type: `+e);return{type:e,name:n}})}l.prototype=c.prototype={constructor:l,on:function(e,t){var n=this._,r=u(e+``,n),i,a=-1,o=r.length;if(arguments.length<2){for(;++a<o;)if((i=(e=r[a]).type)&&(i=d(n[i],e.name)))return i;return}if(t!=null&&typeof t!=`function`)throw Error(`invalid callback: `+t);for(;++a<o;)if(i=(e=r[a]).type)n[i]=f(n[i],e.name,t);else if(t==null)for(i in n)n[i]=f(n[i],e.name,null);return this},copy:function(){var e={},t=this._;for(var n in t)e[n]=t[n].slice();return new l(e)},call:function(e,t){if((i=arguments.length-2)>0)for(var n=Array(i),r=0,i,a;r<i;++r)n[r]=arguments[r+2];if(!this._.hasOwnProperty(e))throw Error(`unknown type: `+e);for(a=this._[e],r=0,i=a.length;r<i;++r)a[r].value.apply(t,n)},apply:function(e,t,n){if(!this._.hasOwnProperty(e))throw Error(`unknown type: `+e);for(var r=this._[e],i=0,a=r.length;i<a;++i)r[i].value.apply(t,n)}};function d(e,t){for(var n=0,r=e.length,i;n<r;++n)if((i=e[n]).name===t)return i.value}function f(e,t,n){for(var r=0,i=e.length;r<i;++r)if(e[r].name===t){e[r]=s,e=e.slice(0,r).concat(e.slice(r+1));break}return n!=null&&e.push({name:t,value:n}),e}var p={svg:`http://www.w3.org/2000/svg`,xhtml:`http://www.w3.org/1999/xhtml`,xlink:`http://www.w3.org/1999/xlink`,xml:`http://www.w3.org/XML/1998/namespace`,xmlns:`http://www.w3.org/2000/xmlns/`};function m(e){var t=e+=``,n=t.indexOf(`:`);return n>=0&&(t=e.slice(0,n))!==`xmlns`&&(e=e.slice(n+1)),p.hasOwnProperty(t)?{space:p[t],local:e}:e}function h(e){return function(){var t=this.ownerDocument,n=this.namespaceURI;return n===`http://www.w3.org/1999/xhtml`&&t.documentElement.namespaceURI===`http://www.w3.org/1999/xhtml`?t.createElement(e):t.createElementNS(n,e)}}function g(e){return function(){return this.ownerDocument.createElementNS(e.space,e.local)}}function _(e){var t=m(e);return(t.local?g:h)(t)}function v(){}function y(e){return e==null?v:function(){return this.querySelector(e)}}function b(e){typeof e!=`function`&&(e=y(e));for(var t=this._groups,n=t.length,r=Array(n),i=0;i<n;++i)for(var a=t[i],o=a.length,s=r[i]=Array(o),c,l,u=0;u<o;++u)(c=a[u])&&(l=e.call(c,c.__data__,u,a))&&(`__data__`in c&&(l.__data__=c.__data__),s[u]=l);return new w(r,this._parents)}function x(e){return e==null?[]:Array.isArray(e)?e:Array.from(e)}function ee(){return[]}function S(e){return e==null?ee:function(){return this.querySelectorAll(e)}}function te(e){return function(){return x(e.apply(this,arguments))}}function ne(e){e=typeof e==`function`?te(e):S(e);for(var t=this._groups,n=t.length,r=[],i=[],a=0;a<n;++a)for(var o=t[a],s=o.length,c,l=0;l<s;++l)(c=o[l])&&(r.push(e.call(c,c.__data__,l,o)),i.push(c));return new w(r,i)}function re(e){return function(){return this.matches(e)}}function ie(e){return function(t){return t.matches(e)}}var ae=Array.prototype.find;function oe(e){return function(){return ae.call(this.children,e)}}function se(){return this.firstElementChild}function ce(e){return this.select(e==null?se:oe(typeof e==`function`?e:ie(e)))}var le=Array.prototype.filter;function ue(){return Array.from(this.children)}function de(e){return function(){return le.call(this.children,e)}}function fe(e){return this.selectAll(e==null?ue:de(typeof e==`function`?e:ie(e)))}function pe(e){typeof e!=`function`&&(e=re(e));for(var t=this._groups,n=t.length,r=Array(n),i=0;i<n;++i)for(var a=t[i],o=a.length,s=r[i]=[],c,l=0;l<o;++l)(c=a[l])&&e.call(c,c.__data__,l,a)&&s.push(c);return new w(r,this._parents)}function me(e){return Array(e.length)}function he(){return new w(this._enter||this._groups.map(me),this._parents)}function ge(e,t){this.ownerDocument=e.ownerDocument,this.namespaceURI=e.namespaceURI,this._next=null,this._parent=e,this.__data__=t}ge.prototype={constructor:ge,appendChild:function(e){return this._parent.insertBefore(e,this._next)},insertBefore:function(e,t){return this._parent.insertBefore(e,t)},querySelector:function(e){return this._parent.querySelector(e)},querySelectorAll:function(e){return this._parent.querySelectorAll(e)}};function _e(e){return function(){return e}}function ve(e,t,n,r,i,a){for(var o=0,s,c=t.length,l=a.length;o<l;++o)(s=t[o])?(s.__data__=a[o],r[o]=s):n[o]=new ge(e,a[o]);for(;o<c;++o)(s=t[o])&&(i[o]=s)}function ye(e,t,n,r,i,a,o){var s,c,l=new Map,u=t.length,d=a.length,f=Array(u),p;for(s=0;s<u;++s)(c=t[s])&&(f[s]=p=o.call(c,c.__data__,s,t)+``,l.has(p)?i[s]=c:l.set(p,c));for(s=0;s<d;++s)p=o.call(e,a[s],s,a)+``,(c=l.get(p))?(r[s]=c,c.__data__=a[s],l.delete(p)):n[s]=new ge(e,a[s]);for(s=0;s<u;++s)(c=t[s])&&l.get(f[s])===c&&(i[s]=c)}function be(e){return e.__data__}function xe(e,t){if(!arguments.length)return Array.from(this,be);var n=t?ye:ve,r=this._parents,i=this._groups;typeof e!=`function`&&(e=_e(e));for(var a=i.length,o=Array(a),s=Array(a),c=Array(a),l=0;l<a;++l){var u=r[l],d=i[l],f=d.length,p=Se(e.call(u,u&&u.__data__,l,r)),m=p.length,h=s[l]=Array(m),g=o[l]=Array(m);n(u,d,h,g,c[l]=Array(f),p,t);for(var _=0,v=0,y,b;_<m;++_)if(y=h[_]){for(_>=v&&(v=_+1);!(b=g[v])&&++v<m;);y._next=b||null}}return o=new w(o,r),o._enter=s,o._exit=c,o}function Se(e){return typeof e==`object`&&`length`in e?e:Array.from(e)}function Ce(){return new w(this._exit||this._groups.map(me),this._parents)}function we(e,t,n){var r=this.enter(),i=this,a=this.exit();return typeof e==`function`?(r=e(r),r&&=r.selection()):r=r.append(e+``),t!=null&&(i=t(i),i&&=i.selection()),n==null?a.remove():n(a),r&&i?r.merge(i).order():i}function Te(e){for(var t=e.selection?e.selection():e,n=this._groups,r=t._groups,i=n.length,a=r.length,o=Math.min(i,a),s=Array(i),c=0;c<o;++c)for(var l=n[c],u=r[c],d=l.length,f=s[c]=Array(d),p,m=0;m<d;++m)(p=l[m]||u[m])&&(f[m]=p);for(;c<i;++c)s[c]=n[c];return new w(s,this._parents)}function Ee(){for(var e=this._groups,t=-1,n=e.length;++t<n;)for(var r=e[t],i=r.length-1,a=r[i],o;--i>=0;)(o=r[i])&&(a&&o.compareDocumentPosition(a)^4&&a.parentNode.insertBefore(o,a),a=o);return this}function De(e){e||=Oe;function t(t,n){return t&&n?e(t.__data__,n.__data__):!t-!n}for(var n=this._groups,r=n.length,i=Array(r),a=0;a<r;++a){for(var o=n[a],s=o.length,c=i[a]=Array(s),l,u=0;u<s;++u)(l=o[u])&&(c[u]=l);c.sort(t)}return new w(i,this._parents).order()}function Oe(e,t){return e<t?-1:e>t?1:e>=t?0:NaN}function ke(){var e=arguments[0];return arguments[0]=this,e.apply(null,arguments),this}function Ae(){return Array.from(this)}function je(){for(var e=this._groups,t=0,n=e.length;t<n;++t)for(var r=e[t],i=0,a=r.length;i<a;++i){var o=r[i];if(o)return o}return null}function Me(){let e=0;for(let t of this)++e;return e}function Ne(){return!this.node()}function Pe(e){for(var t=this._groups,n=0,r=t.length;n<r;++n)for(var i=t[n],a=0,o=i.length,s;a<o;++a)(s=i[a])&&e.call(s,s.__data__,a,i);return this}function Fe(e){return function(){this.removeAttribute(e)}}function Ie(e){return function(){this.removeAttributeNS(e.space,e.local)}}function Le(e,t){return function(){this.setAttribute(e,t)}}function Re(e,t){return function(){this.setAttributeNS(e.space,e.local,t)}}function ze(e,t){return function(){var n=t.apply(this,arguments);n==null?this.removeAttribute(e):this.setAttribute(e,n)}}function Be(e,t){return function(){var n=t.apply(this,arguments);n==null?this.removeAttributeNS(e.space,e.local):this.setAttributeNS(e.space,e.local,n)}}function Ve(e,t){var n=m(e);if(arguments.length<2){var r=this.node();return n.local?r.getAttributeNS(n.space,n.local):r.getAttribute(n)}return this.each((t==null?n.local?Ie:Fe:typeof t==`function`?n.local?Be:ze:n.local?Re:Le)(n,t))}function He(e){return e.ownerDocument&&e.ownerDocument.defaultView||e.document&&e||e.defaultView}function Ue(e){return function(){this.style.removeProperty(e)}}function We(e,t,n){return function(){this.style.setProperty(e,t,n)}}function Ge(e,t,n){return function(){var r=t.apply(this,arguments);r==null?this.style.removeProperty(e):this.style.setProperty(e,r,n)}}function Ke(e,t,n){return arguments.length>1?this.each((t==null?Ue:typeof t==`function`?Ge:We)(e,t,n??``)):C(this.node(),e)}function C(e,t){return e.style.getPropertyValue(t)||He(e).getComputedStyle(e,null).getPropertyValue(t)}function qe(e){return function(){delete this[e]}}function Je(e,t){return function(){this[e]=t}}function Ye(e,t){return function(){var n=t.apply(this,arguments);n==null?delete this[e]:this[e]=n}}function Xe(e,t){return arguments.length>1?this.each((t==null?qe:typeof t==`function`?Ye:Je)(e,t)):this.node()[e]}function Ze(e){return e.trim().split(/^|\s+/)}function Qe(e){return e.classList||new $e(e)}function $e(e){this._node=e,this._names=Ze(e.getAttribute(`class`)||``)}$e.prototype={add:function(e){this._names.indexOf(e)<0&&(this._names.push(e),this._node.setAttribute(`class`,this._names.join(` `)))},remove:function(e){var t=this._names.indexOf(e);t>=0&&(this._names.splice(t,1),this._node.setAttribute(`class`,this._names.join(` `)))},contains:function(e){return this._names.indexOf(e)>=0}};function et(e,t){for(var n=Qe(e),r=-1,i=t.length;++r<i;)n.add(t[r])}function tt(e,t){for(var n=Qe(e),r=-1,i=t.length;++r<i;)n.remove(t[r])}function nt(e){return function(){et(this,e)}}function rt(e){return function(){tt(this,e)}}function it(e,t){return function(){(t.apply(this,arguments)?et:tt)(this,e)}}function at(e,t){var n=Ze(e+``);if(arguments.length<2){for(var r=Qe(this.node()),i=-1,a=n.length;++i<a;)if(!r.contains(n[i]))return!1;return!0}return this.each((typeof t==`function`?it:t?nt:rt)(n,t))}function ot(){this.textContent=``}function st(e){return function(){this.textContent=e}}function ct(e){return function(){var t=e.apply(this,arguments);this.textContent=t??``}}function lt(e){return arguments.length?this.each(e==null?ot:(typeof e==`function`?ct:st)(e)):this.node().textContent}function ut(){this.innerHTML=``}function dt(e){return function(){this.innerHTML=e}}function ft(e){return function(){var t=e.apply(this,arguments);this.innerHTML=t??``}}function pt(e){return arguments.length?this.each(e==null?ut:(typeof e==`function`?ft:dt)(e)):this.node().innerHTML}function mt(){this.nextSibling&&this.parentNode.appendChild(this)}function ht(){return this.each(mt)}function gt(){this.previousSibling&&this.parentNode.insertBefore(this,this.parentNode.firstChild)}function _t(){return this.each(gt)}function vt(e){var t=typeof e==`function`?e:_(e);return this.select(function(){return this.appendChild(t.apply(this,arguments))})}function yt(){return null}function bt(e,t){var n=typeof e==`function`?e:_(e),r=t==null?yt:typeof t==`function`?t:y(t);return this.select(function(){return this.insertBefore(n.apply(this,arguments),r.apply(this,arguments)||null)})}function xt(){var e=this.parentNode;e&&e.removeChild(this)}function St(){return this.each(xt)}function Ct(){var e=this.cloneNode(!1),t=this.parentNode;return t?t.insertBefore(e,this.nextSibling):e}function wt(){var e=this.cloneNode(!0),t=this.parentNode;return t?t.insertBefore(e,this.nextSibling):e}function Tt(e){return this.select(e?wt:Ct)}function Et(e){return arguments.length?this.property(`__data__`,e):this.node().__data__}function Dt(e){return function(t){e.call(this,t,this.__data__)}}function Ot(e){return e.trim().split(/^|\s+/).map(function(e){var t=``,n=e.indexOf(`.`);return n>=0&&(t=e.slice(n+1),e=e.slice(0,n)),{type:e,name:t}})}function kt(e){return function(){var t=this.__on;if(t){for(var n=0,r=-1,i=t.length,a;n<i;++n)a=t[n],(!e.type||a.type===e.type)&&a.name===e.name?this.removeEventListener(a.type,a.listener,a.options):t[++r]=a;++r?t.length=r:delete this.__on}}}function At(e,t,n){return function(){var r=this.__on,i,a=Dt(t);if(r){for(var o=0,s=r.length;o<s;++o)if((i=r[o]).type===e.type&&i.name===e.name){this.removeEventListener(i.type,i.listener,i.options),this.addEventListener(i.type,i.listener=a,i.options=n),i.value=t;return}}this.addEventListener(e.type,a,n),i={type:e.type,name:e.name,value:t,listener:a,options:n},r?r.push(i):this.__on=[i]}}function jt(e,t,n){var r=Ot(e+``),i,a=r.length,o;if(arguments.length<2){var s=this.node().__on;if(s){for(var c=0,l=s.length,u;c<l;++c)for(i=0,u=s[c];i<a;++i)if((o=r[i]).type===u.type&&o.name===u.name)return u.value}return}for(s=t?At:kt,i=0;i<a;++i)this.each(s(r[i],t,n));return this}function Mt(e,t,n){var r=He(e),i=r.CustomEvent;typeof i==`function`?i=new i(t,n):(i=r.document.createEvent(`Event`),n?(i.initEvent(t,n.bubbles,n.cancelable),i.detail=n.detail):i.initEvent(t,!1,!1)),e.dispatchEvent(i)}function Nt(e,t){return function(){return Mt(this,e,t)}}function Pt(e,t){return function(){return Mt(this,e,t.apply(this,arguments))}}function Ft(e,t){return this.each((typeof t==`function`?Pt:Nt)(e,t))}function*It(){for(var e=this._groups,t=0,n=e.length;t<n;++t)for(var r=e[t],i=0,a=r.length,o;i<a;++i)(o=r[i])&&(yield o)}var Lt=[null];function w(e,t){this._groups=e,this._parents=t}function T(){return new w([[document.documentElement]],Lt)}function Rt(){return this}w.prototype=T.prototype={constructor:w,select:b,selectAll:ne,selectChild:ce,selectChildren:fe,filter:pe,data:xe,enter:he,exit:Ce,join:we,merge:Te,selection:Rt,order:Ee,sort:De,call:ke,nodes:Ae,node:je,size:Me,empty:Ne,each:Pe,attr:Ve,style:Ke,property:Xe,classed:at,text:lt,html:pt,raise:ht,lower:_t,append:vt,insert:bt,remove:St,clone:Tt,datum:Et,on:jt,dispatch:Ft,[Symbol.iterator]:It};function E(e){return typeof e==`string`?new w([[document.querySelector(e)]],[document.documentElement]):new w([[e]],Lt)}function zt(e){let t;for(;t=e.sourceEvent;)e=t;return e}function D(e,t){if(e=zt(e),t===void 0&&(t=e.currentTarget),t){var n=t.ownerSVGElement||t;if(n.createSVGPoint){var r=n.createSVGPoint();return r.x=e.clientX,r.y=e.clientY,r=r.matrixTransform(t.getScreenCTM().inverse()),[r.x,r.y]}if(t.getBoundingClientRect){var i=t.getBoundingClientRect();return[e.clientX-i.left-t.clientLeft,e.clientY-i.top-t.clientTop]}}return[e.pageX,e.pageY]}var Bt={passive:!1},O={capture:!0,passive:!1};function Vt(e){e.stopImmediatePropagation()}function k(e){e.preventDefault(),e.stopImmediatePropagation()}function Ht(e){var t=e.document.documentElement,n=E(e).on(`dragstart.drag`,k,O);`onselectstart`in t?n.on(`selectstart.drag`,k,O):(t.__noselect=t.style.MozUserSelect,t.style.MozUserSelect=`none`)}function Ut(e,t){var n=e.document.documentElement,r=E(e).on(`dragstart.drag`,null);t&&(r.on(`click.drag`,k,O),setTimeout(function(){r.on(`click.drag`,null)},0)),`onselectstart`in n?r.on(`selectstart.drag`,null):(n.style.MozUserSelect=n.__noselect,delete n.__noselect)}var Wt=e=>()=>e;function Gt(e,{sourceEvent:t,subject:n,target:r,identifier:i,active:a,x:o,y:s,dx:c,dy:l,dispatch:u}){Object.defineProperties(this,{type:{value:e,enumerable:!0,configurable:!0},sourceEvent:{value:t,enumerable:!0,configurable:!0},subject:{value:n,enumerable:!0,configurable:!0},target:{value:r,enumerable:!0,configurable:!0},identifier:{value:i,enumerable:!0,configurable:!0},active:{value:a,enumerable:!0,configurable:!0},x:{value:o,enumerable:!0,configurable:!0},y:{value:s,enumerable:!0,configurable:!0},dx:{value:c,enumerable:!0,configurable:!0},dy:{value:l,enumerable:!0,configurable:!0},_:{value:u}})}Gt.prototype.on=function(){var e=this._.on.apply(this._,arguments);return e===this._?this:e};function Kt(e){return!e.ctrlKey&&!e.button}function qt(){return this.parentNode}function Jt(e,t){return t??{x:e.x,y:e.y}}function Yt(){return navigator.maxTouchPoints||`ontouchstart`in this}function Xt(){var e=Kt,t=qt,n=Jt,r=Yt,i={},a=c(`start`,`drag`,`end`),o=0,s,l,u,d,f=0;function p(e){e.on(`mousedown.drag`,m).filter(r).on(`touchstart.drag`,_).on(`touchmove.drag`,v,Bt).on(`touchend.drag touchcancel.drag`,y).style(`touch-action`,`none`).style(`-webkit-tap-highlight-color`,`rgba(0,0,0,0)`)}function m(n,r){if(!(d||!e.call(this,n,r))){var i=b(this,t.call(this,n,r),n,r,`mouse`);i&&(E(n.view).on(`mousemove.drag`,h,O).on(`mouseup.drag`,g,O),Ht(n.view),Vt(n),u=!1,s=n.clientX,l=n.clientY,i(`start`,n))}}function h(e){if(k(e),!u){var t=e.clientX-s,n=e.clientY-l;u=t*t+n*n>f}i.mouse(`drag`,e)}function g(e){E(e.view).on(`mousemove.drag mouseup.drag`,null),Ut(e.view,u),k(e),i.mouse(`end`,e)}function _(n,r){if(e.call(this,n,r)){var i=n.changedTouches,a=t.call(this,n,r),o=i.length,s,c;for(s=0;s<o;++s)(c=b(this,a,n,r,i[s].identifier,i[s]))&&(Vt(n),c(`start`,n,i[s]))}}function v(e){var t=e.changedTouches,n=t.length,r,a;for(r=0;r<n;++r)(a=i[t[r].identifier])&&(k(e),a(`drag`,e,t[r]))}function y(e){var t=e.changedTouches,n=t.length,r,a;for(d&&clearTimeout(d),d=setTimeout(function(){d=null},500),r=0;r<n;++r)(a=i[t[r].identifier])&&(Vt(e),a(`end`,e,t[r]))}function b(e,t,r,s,c,l){var u=a.copy(),d=D(l||r,t),f,m,h;if((h=n.call(e,new Gt(`beforestart`,{sourceEvent:r,target:p,identifier:c,active:o,x:d[0],y:d[1],dx:0,dy:0,dispatch:u}),s))!=null)return f=h.x-d[0]||0,m=h.y-d[1]||0,function n(r,a,l){var g=d,_;switch(r){case`start`:i[c]=n,_=o++;break;case`end`:delete i[c],--o;case`drag`:d=D(l||a,t),_=o;break}u.call(r,e,new Gt(r,{sourceEvent:a,subject:h,target:p,identifier:c,active:_,x:d[0]+f,y:d[1]+m,dx:d[0]-g[0],dy:d[1]-g[1],dispatch:u}),s)}}return p.filter=function(t){return arguments.length?(e=typeof t==`function`?t:Wt(!!t),p):e},p.container=function(e){return arguments.length?(t=typeof e==`function`?e:Wt(e),p):t},p.subject=function(e){return arguments.length?(n=typeof e==`function`?e:Wt(e),p):n},p.touchable=function(e){return arguments.length?(r=typeof e==`function`?e:Wt(!!e),p):r},p.on=function(){var e=a.on.apply(a,arguments);return e===a?p:e},p.clickDistance=function(e){return arguments.length?(f=(e=+e)*e,p):Math.sqrt(f)},p}function Zt(e,t,n){e.prototype=t.prototype=n,n.constructor=e}function Qt(e,t){var n=Object.create(e.prototype);for(var r in t)n[r]=t[r];return n}function A(){}var j=.7,$t=1/j,M=`\\s*([+-]?\\d+)\\s*`,N=`\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*`,P=`\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*`,en=/^#([0-9a-f]{3,8})$/,tn=RegExp(`^rgb\\(${M},${M},${M}\\)$`),nn=RegExp(`^rgb\\(${P},${P},${P}\\)$`),rn=RegExp(`^rgba\\(${M},${M},${M},${N}\\)$`),an=RegExp(`^rgba\\(${P},${P},${P},${N}\\)$`),on=RegExp(`^hsl\\(${N},${P},${P}\\)$`),sn=RegExp(`^hsla\\(${N},${P},${P},${N}\\)$`),cn={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074};Zt(A,F,{copy(e){return Object.assign(new this.constructor,this,e)},displayable(){return this.rgb().displayable()},hex:ln,formatHex:ln,formatHex8:un,formatHsl:dn,formatRgb:fn,toString:fn});function ln(){return this.rgb().formatHex()}function un(){return this.rgb().formatHex8()}function dn(){return Sn(this).formatHsl()}function fn(){return this.rgb().formatRgb()}function F(e){var t,n;return e=(e+``).trim().toLowerCase(),(t=en.exec(e))?(n=t[1].length,t=parseInt(t[1],16),n===6?pn(t):n===3?new I(t>>8&15|t>>4&240,t>>4&15|t&240,(t&15)<<4|t&15,1):n===8?mn(t>>24&255,t>>16&255,t>>8&255,(t&255)/255):n===4?mn(t>>12&15|t>>8&240,t>>8&15|t>>4&240,t>>4&15|t&240,((t&15)<<4|t&15)/255):null):(t=tn.exec(e))?new I(t[1],t[2],t[3],1):(t=nn.exec(e))?new I(t[1]*255/100,t[2]*255/100,t[3]*255/100,1):(t=rn.exec(e))?mn(t[1],t[2],t[3],t[4]):(t=an.exec(e))?mn(t[1]*255/100,t[2]*255/100,t[3]*255/100,t[4]):(t=on.exec(e))?xn(t[1],t[2]/100,t[3]/100,1):(t=sn.exec(e))?xn(t[1],t[2]/100,t[3]/100,t[4]):cn.hasOwnProperty(e)?pn(cn[e]):e===`transparent`?new I(NaN,NaN,NaN,0):null}function pn(e){return new I(e>>16&255,e>>8&255,e&255,1)}function mn(e,t,n,r){return r<=0&&(e=t=n=NaN),new I(e,t,n,r)}function hn(e){return e instanceof A||(e=F(e)),e?(e=e.rgb(),new I(e.r,e.g,e.b,e.opacity)):new I}function gn(e,t,n,r){return arguments.length===1?hn(e):new I(e,t,n,r??1)}function I(e,t,n,r){this.r=+e,this.g=+t,this.b=+n,this.opacity=+r}Zt(I,gn,Qt(A,{brighter(e){return e=e==null?$t:$t**+e,new I(this.r*e,this.g*e,this.b*e,this.opacity)},darker(e){return e=e==null?j:j**+e,new I(this.r*e,this.g*e,this.b*e,this.opacity)},rgb(){return this},clamp(){return new I(L(this.r),L(this.g),L(this.b),bn(this.opacity))},displayable(){return-.5<=this.r&&this.r<255.5&&-.5<=this.g&&this.g<255.5&&-.5<=this.b&&this.b<255.5&&0<=this.opacity&&this.opacity<=1},hex:_n,formatHex:_n,formatHex8:vn,formatRgb:yn,toString:yn}));function _n(){return`#${R(this.r)}${R(this.g)}${R(this.b)}`}function vn(){return`#${R(this.r)}${R(this.g)}${R(this.b)}${R((isNaN(this.opacity)?1:this.opacity)*255)}`}function yn(){let e=bn(this.opacity);return`${e===1?`rgb(`:`rgba(`}${L(this.r)}, ${L(this.g)}, ${L(this.b)}${e===1?`)`:`, ${e})`}`}function bn(e){return isNaN(e)?1:Math.max(0,Math.min(1,e))}function L(e){return Math.max(0,Math.min(255,Math.round(e)||0))}function R(e){return e=L(e),(e<16?`0`:``)+e.toString(16)}function xn(e,t,n,r){return r<=0?e=t=n=NaN:n<=0||n>=1?e=t=NaN:t<=0&&(e=NaN),new z(e,t,n,r)}function Sn(e){if(e instanceof z)return new z(e.h,e.s,e.l,e.opacity);if(e instanceof A||(e=F(e)),!e)return new z;if(e instanceof z)return e;e=e.rgb();var t=e.r/255,n=e.g/255,r=e.b/255,i=Math.min(t,n,r),a=Math.max(t,n,r),o=NaN,s=a-i,c=(a+i)/2;return s?(o=t===a?(n-r)/s+(n<r)*6:n===a?(r-t)/s+2:(t-n)/s+4,s/=c<.5?a+i:2-a-i,o*=60):s=c>0&&c<1?0:o,new z(o,s,c,e.opacity)}function Cn(e,t,n,r){return arguments.length===1?Sn(e):new z(e,t,n,r??1)}function z(e,t,n,r){this.h=+e,this.s=+t,this.l=+n,this.opacity=+r}Zt(z,Cn,Qt(A,{brighter(e){return e=e==null?$t:$t**+e,new z(this.h,this.s,this.l*e,this.opacity)},darker(e){return e=e==null?j:j**+e,new z(this.h,this.s,this.l*e,this.opacity)},rgb(){var e=this.h%360+(this.h<0)*360,t=isNaN(e)||isNaN(this.s)?0:this.s,n=this.l,r=n+(n<.5?n:1-n)*t,i=2*n-r;return new I(En(e>=240?e-240:e+120,i,r),En(e,i,r),En(e<120?e+240:e-120,i,r),this.opacity)},clamp(){return new z(wn(this.h),Tn(this.s),Tn(this.l),bn(this.opacity))},displayable(){return(0<=this.s&&this.s<=1||isNaN(this.s))&&0<=this.l&&this.l<=1&&0<=this.opacity&&this.opacity<=1},formatHsl(){let e=bn(this.opacity);return`${e===1?`hsl(`:`hsla(`}${wn(this.h)}, ${Tn(this.s)*100}%, ${Tn(this.l)*100}%${e===1?`)`:`, ${e})`}`}}));function wn(e){return e=(e||0)%360,e<0?e+360:e}function Tn(e){return Math.max(0,Math.min(1,e||0))}function En(e,t,n){return(e<60?t+(n-t)*e/60:e<180?n:e<240?t+(n-t)*(240-e)/60:t)*255}var Dn=e=>()=>e;function On(e,t){return function(n){return e+n*t}}function kn(e,t,n){return e**=+n,t=t**+n-e,n=1/n,function(r){return(e+r*t)**+n}}function An(e){return(e=+e)==1?jn:function(t,n){return n-t?kn(t,n,e):Dn(isNaN(t)?n:t)}}function jn(e,t){var n=t-e;return n?On(e,n):Dn(isNaN(e)?t:e)}var Mn=(function e(t){var n=An(t);function r(e,t){var r=n((e=gn(e)).r,(t=gn(t)).r),i=n(e.g,t.g),a=n(e.b,t.b),o=jn(e.opacity,t.opacity);return function(t){return e.r=r(t),e.g=i(t),e.b=a(t),e.opacity=o(t),e+``}}return r.gamma=e,r})(1);function B(e,t){return e=+e,t=+t,function(n){return e*(1-n)+t*n}}var Nn=/[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,Pn=new RegExp(Nn.source,`g`);function Fn(e){return function(){return e}}function In(e){return function(t){return e(t)+``}}function Ln(e,t){var n=Nn.lastIndex=Pn.lastIndex=0,r,i,a,o=-1,s=[],c=[];for(e+=``,t+=``;(r=Nn.exec(e))&&(i=Pn.exec(t));)(a=i.index)>n&&(a=t.slice(n,a),s[o]?s[o]+=a:s[++o]=a),(r=r[0])===(i=i[0])?s[o]?s[o]+=i:s[++o]=i:(s[++o]=null,c.push({i:o,x:B(r,i)})),n=Pn.lastIndex;return n<t.length&&(a=t.slice(n),s[o]?s[o]+=a:s[++o]=a),s.length<2?c[0]?In(c[0].x):Fn(t):(t=c.length,function(e){for(var n=0,r;n<t;++n)s[(r=c[n]).i]=r.x(e);return s.join(``)})}var Rn=180/Math.PI,zn={translateX:0,translateY:0,rotate:0,skewX:0,scaleX:1,scaleY:1};function Bn(e,t,n,r,i,a){var o,s,c;return(o=Math.sqrt(e*e+t*t))&&(e/=o,t/=o),(c=e*n+t*r)&&(n-=e*c,r-=t*c),(s=Math.sqrt(n*n+r*r))&&(n/=s,r/=s,c/=s),e*r<t*n&&(e=-e,t=-t,c=-c,o=-o),{translateX:i,translateY:a,rotate:Math.atan2(t,e)*Rn,skewX:Math.atan(c)*Rn,scaleX:o,scaleY:s}}var Vn;function Hn(e){let t=new(typeof DOMMatrix==`function`?DOMMatrix:WebKitCSSMatrix)(e+``);return t.isIdentity?zn:Bn(t.a,t.b,t.c,t.d,t.e,t.f)}function Un(e){return e==null||(Vn||=document.createElementNS(`http://www.w3.org/2000/svg`,`g`),Vn.setAttribute(`transform`,e),!(e=Vn.transform.baseVal.consolidate()))?zn:(e=e.matrix,Bn(e.a,e.b,e.c,e.d,e.e,e.f))}function Wn(e,t,n,r){function i(e){return e.length?e.pop()+` `:``}function a(e,r,i,a,o,s){if(e!==i||r!==a){var c=o.push(`translate(`,null,t,null,n);s.push({i:c-4,x:B(e,i)},{i:c-2,x:B(r,a)})}else(i||a)&&o.push(`translate(`+i+t+a+n)}function o(e,t,n,a){e===t?t&&n.push(i(n)+`rotate(`+t+r):(e-t>180?t+=360:t-e>180&&(e+=360),a.push({i:n.push(i(n)+`rotate(`,null,r)-2,x:B(e,t)}))}function s(e,t,n,a){e===t?t&&n.push(i(n)+`skewX(`+t+r):a.push({i:n.push(i(n)+`skewX(`,null,r)-2,x:B(e,t)})}function c(e,t,n,r,a,o){if(e!==n||t!==r){var s=a.push(i(a)+`scale(`,null,`,`,null,`)`);o.push({i:s-4,x:B(e,n)},{i:s-2,x:B(t,r)})}else(n!==1||r!==1)&&a.push(i(a)+`scale(`+n+`,`+r+`)`)}return function(t,n){var r=[],i=[];return t=e(t),n=e(n),a(t.translateX,t.translateY,n.translateX,n.translateY,r,i),o(t.rotate,n.rotate,r,i),s(t.skewX,n.skewX,r,i),c(t.scaleX,t.scaleY,n.scaleX,n.scaleY,r,i),t=n=null,function(e){for(var t=-1,n=i.length,a;++t<n;)r[(a=i[t]).i]=a.x(e);return r.join(``)}}}var Gn=Wn(Hn,`px, `,`px)`,`deg)`),Kn=Wn(Un,`, `,`)`,`)`),qn=1e-12;function Jn(e){return((e=Math.exp(e))+1/e)/2}function Yn(e){return((e=Math.exp(e))-1/e)/2}function Xn(e){return((e=Math.exp(2*e))-1)/(e+1)}var Zn=(function e(t,n,r){function i(e,i){var a=e[0],o=e[1],s=e[2],c=i[0],l=i[1],u=i[2],d=c-a,f=l-o,p=d*d+f*f,m,h;if(p<qn)h=Math.log(u/s)/t,m=function(e){return[a+e*d,o+e*f,s*Math.exp(t*e*h)]};else{var g=Math.sqrt(p),_=(u*u-s*s+r*p)/(2*s*n*g),v=(u*u-s*s-r*p)/(2*u*n*g),y=Math.log(Math.sqrt(_*_+1)-_);h=(Math.log(Math.sqrt(v*v+1)-v)-y)/t,m=function(e){var r=e*h,i=Jn(y),c=s/(n*g)*(i*Xn(t*r+y)-Yn(y));return[a+c*d,o+c*f,s*i/Jn(t*r+y)]}}return m.duration=h*1e3*t/Math.SQRT2,m}return i.rho=function(t){var n=Math.max(.001,+t),r=n*n;return e(n,r,r*r)},i})(Math.SQRT2,2,4),V=0,Qn=0,$n=0,er=1e3,tr,H,nr=0,U=0,rr=0,W=typeof performance==`object`&&performance.now?performance:Date,ir=typeof window==`object`&&window.requestAnimationFrame?window.requestAnimationFrame.bind(window):function(e){setTimeout(e,17)};function ar(){return U||=(ir(or),W.now()+rr)}function or(){U=0}function sr(){this._call=this._time=this._next=null}sr.prototype=cr.prototype={constructor:sr,restart:function(e,t,n){if(typeof e!=`function`)throw TypeError(`callback is not a function`);n=(n==null?ar():+n)+(t==null?0:+t),!this._next&&H!==this&&(H?H._next=this:tr=this,H=this),this._call=e,this._time=n,pr()},stop:function(){this._call&&(this._call=null,this._time=1/0,pr())}};function cr(e,t,n){var r=new sr;return r.restart(e,t,n),r}function lr(){ar(),++V;for(var e=tr,t;e;)(t=U-e._time)>=0&&e._call.call(void 0,t),e=e._next;--V}function ur(){U=(nr=W.now())+rr,V=Qn=0;try{lr()}finally{V=0,fr(),U=0}}function dr(){var e=W.now(),t=e-nr;t>er&&(rr-=t,nr=e)}function fr(){for(var e,t=tr,n,r=1/0;t;)t._call?(r>t._time&&(r=t._time),e=t,t=t._next):(n=t._next,t._next=null,t=e?e._next=n:tr=n);H=e,pr(r)}function pr(e){V||(Qn&&=clearTimeout(Qn),e-U>24?(e<1/0&&(Qn=setTimeout(ur,e-W.now()-rr)),$n&&=clearInterval($n)):($n||=(nr=W.now(),setInterval(dr,er)),V=1,ir(ur)))}function mr(e,t,n){var r=new sr;return t=t==null?0:+t,r.restart(n=>{r.stop(),e(n+t)},t,n),r}var hr=c(`start`,`end`,`cancel`,`interrupt`),gr=[];function _r(e,t,n,r,i,a){var o=e.__transition;if(!o)e.__transition={};else if(n in o)return;yr(e,n,{name:t,index:r,group:i,on:hr,tween:gr,time:a.time,delay:a.delay,duration:a.duration,ease:a.ease,timer:null,state:0})}function vr(e,t){var n=K(e,t);if(n.state>0)throw Error(`too late; already scheduled`);return n}function G(e,t){var n=K(e,t);if(n.state>3)throw Error(`too late; already running`);return n}function K(e,t){var n=e.__transition;if(!n||!(n=n[t]))throw Error(`transition not found`);return n}function yr(e,t,n){var r=e.__transition,i;r[t]=n,n.timer=cr(a,0,n.time);function a(e){n.state=1,n.timer.restart(o,n.delay,n.time),n.delay<=e&&o(e-n.delay)}function o(a){var l,u,d,f;if(n.state!==1)return c();for(l in r)if(f=r[l],f.name===n.name){if(f.state===3)return mr(o);f.state===4?(f.state=6,f.timer.stop(),f.on.call(`interrupt`,e,e.__data__,f.index,f.group),delete r[l]):+l<t&&(f.state=6,f.timer.stop(),f.on.call(`cancel`,e,e.__data__,f.index,f.group),delete r[l])}if(mr(function(){n.state===3&&(n.state=4,n.timer.restart(s,n.delay,n.time),s(a))}),n.state=2,n.on.call(`start`,e,e.__data__,n.index,n.group),n.state===2){for(n.state=3,i=Array(d=n.tween.length),l=0,u=-1;l<d;++l)(f=n.tween[l].value.call(e,e.__data__,n.index,n.group))&&(i[++u]=f);i.length=u+1}}function s(t){for(var r=t<n.duration?n.ease.call(null,t/n.duration):(n.timer.restart(c),n.state=5,1),a=-1,o=i.length;++a<o;)i[a].call(e,r);n.state===5&&(n.on.call(`end`,e,e.__data__,n.index,n.group),c())}function c(){for(var i in n.state=6,n.timer.stop(),delete r[t],r)return;delete e.__transition}}function br(e,t){var n=e.__transition,r,i,a=!0,o;if(n){for(o in t=t==null?null:t+``,n){if((r=n[o]).name!==t){a=!1;continue}i=r.state>2&&r.state<5,r.state=6,r.timer.stop(),r.on.call(i?`interrupt`:`cancel`,e,e.__data__,r.index,r.group),delete n[o]}a&&delete e.__transition}}function xr(e){return this.each(function(){br(this,e)})}function Sr(e,t){var n,r;return function(){var i=G(this,e),a=i.tween;if(a!==n){r=n=a;for(var o=0,s=r.length;o<s;++o)if(r[o].name===t){r=r.slice(),r.splice(o,1);break}}i.tween=r}}function Cr(e,t,n){var r,i;if(typeof n!=`function`)throw Error();return function(){var a=G(this,e),o=a.tween;if(o!==r){i=(r=o).slice();for(var s={name:t,value:n},c=0,l=i.length;c<l;++c)if(i[c].name===t){i[c]=s;break}c===l&&i.push(s)}a.tween=i}}function wr(e,t){var n=this._id;if(e+=``,arguments.length<2){for(var r=K(this.node(),n).tween,i=0,a=r.length,o;i<a;++i)if((o=r[i]).name===e)return o.value;return null}return this.each((t==null?Sr:Cr)(n,e,t))}function Tr(e,t,n){var r=e._id;return e.each(function(){var e=G(this,r);(e.value||={})[t]=n.apply(this,arguments)}),function(e){return K(e,r).value[t]}}function Er(e,t){var n;return(typeof t==`number`?B:t instanceof F?Mn:(n=F(t))?(t=n,Mn):Ln)(e,t)}function Dr(e){return function(){this.removeAttribute(e)}}function Or(e){return function(){this.removeAttributeNS(e.space,e.local)}}function kr(e,t,n){var r,i=n+``,a;return function(){var o=this.getAttribute(e);return o===i?null:o===r?a:a=t(r=o,n)}}function Ar(e,t,n){var r,i=n+``,a;return function(){var o=this.getAttributeNS(e.space,e.local);return o===i?null:o===r?a:a=t(r=o,n)}}function jr(e,t,n){var r,i,a;return function(){var o,s=n(this),c;return s==null?void this.removeAttribute(e):(o=this.getAttribute(e),c=s+``,o===c?null:o===r&&c===i?a:(i=c,a=t(r=o,s)))}}function Mr(e,t,n){var r,i,a;return function(){var o,s=n(this),c;return s==null?void this.removeAttributeNS(e.space,e.local):(o=this.getAttributeNS(e.space,e.local),c=s+``,o===c?null:o===r&&c===i?a:(i=c,a=t(r=o,s)))}}function Nr(e,t){var n=m(e),r=n===`transform`?Kn:Er;return this.attrTween(e,typeof t==`function`?(n.local?Mr:jr)(n,r,Tr(this,`attr.`+e,t)):t==null?(n.local?Or:Dr)(n):(n.local?Ar:kr)(n,r,t))}function Pr(e,t){return function(n){this.setAttribute(e,t.call(this,n))}}function Fr(e,t){return function(n){this.setAttributeNS(e.space,e.local,t.call(this,n))}}function Ir(e,t){var n,r;function i(){var i=t.apply(this,arguments);return i!==r&&(n=(r=i)&&Fr(e,i)),n}return i._value=t,i}function Lr(e,t){var n,r;function i(){var i=t.apply(this,arguments);return i!==r&&(n=(r=i)&&Pr(e,i)),n}return i._value=t,i}function Rr(e,t){var n=`attr.`+e;if(arguments.length<2)return(n=this.tween(n))&&n._value;if(t==null)return this.tween(n,null);if(typeof t!=`function`)throw Error();var r=m(e);return this.tween(n,(r.local?Ir:Lr)(r,t))}function zr(e,t){return function(){vr(this,e).delay=+t.apply(this,arguments)}}function Br(e,t){return t=+t,function(){vr(this,e).delay=t}}function Vr(e){var t=this._id;return arguments.length?this.each((typeof e==`function`?zr:Br)(t,e)):K(this.node(),t).delay}function Hr(e,t){return function(){G(this,e).duration=+t.apply(this,arguments)}}function Ur(e,t){return t=+t,function(){G(this,e).duration=t}}function Wr(e){var t=this._id;return arguments.length?this.each((typeof e==`function`?Hr:Ur)(t,e)):K(this.node(),t).duration}function Gr(e,t){if(typeof t!=`function`)throw Error();return function(){G(this,e).ease=t}}function Kr(e){var t=this._id;return arguments.length?this.each(Gr(t,e)):K(this.node(),t).ease}function qr(e,t){return function(){var n=t.apply(this,arguments);if(typeof n!=`function`)throw Error();G(this,e).ease=n}}function Jr(e){if(typeof e!=`function`)throw Error();return this.each(qr(this._id,e))}function Yr(e){typeof e!=`function`&&(e=re(e));for(var t=this._groups,n=t.length,r=Array(n),i=0;i<n;++i)for(var a=t[i],o=a.length,s=r[i]=[],c,l=0;l<o;++l)(c=a[l])&&e.call(c,c.__data__,l,a)&&s.push(c);return new q(r,this._parents,this._name,this._id)}function Xr(e){if(e._id!==this._id)throw Error();for(var t=this._groups,n=e._groups,r=t.length,i=n.length,a=Math.min(r,i),o=Array(r),s=0;s<a;++s)for(var c=t[s],l=n[s],u=c.length,d=o[s]=Array(u),f,p=0;p<u;++p)(f=c[p]||l[p])&&(d[p]=f);for(;s<r;++s)o[s]=t[s];return new q(o,this._parents,this._name,this._id)}function Zr(e){return(e+``).trim().split(/^|\s+/).every(function(e){var t=e.indexOf(`.`);return t>=0&&(e=e.slice(0,t)),!e||e===`start`})}function Qr(e,t,n){var r,i,a=Zr(t)?vr:G;return function(){var o=a(this,e),s=o.on;s!==r&&(i=(r=s).copy()).on(t,n),o.on=i}}function $r(e,t){var n=this._id;return arguments.length<2?K(this.node(),n).on.on(e):this.each(Qr(n,e,t))}function ei(e){return function(){var t=this.parentNode;for(var n in this.__transition)if(+n!==e)return;t&&t.removeChild(this)}}function ti(){return this.on(`end.remove`,ei(this._id))}function ni(e){var t=this._name,n=this._id;typeof e!=`function`&&(e=y(e));for(var r=this._groups,i=r.length,a=Array(i),o=0;o<i;++o)for(var s=r[o],c=s.length,l=a[o]=Array(c),u,d,f=0;f<c;++f)(u=s[f])&&(d=e.call(u,u.__data__,f,s))&&(`__data__`in u&&(d.__data__=u.__data__),l[f]=d,_r(l[f],t,n,f,l,K(u,n)));return new q(a,this._parents,t,n)}function ri(e){var t=this._name,n=this._id;typeof e!=`function`&&(e=S(e));for(var r=this._groups,i=r.length,a=[],o=[],s=0;s<i;++s)for(var c=r[s],l=c.length,u,d=0;d<l;++d)if(u=c[d]){for(var f=e.call(u,u.__data__,d,c),p,m=K(u,n),h=0,g=f.length;h<g;++h)(p=f[h])&&_r(p,t,n,h,f,m);a.push(f),o.push(u)}return new q(a,o,t,n)}var ii=T.prototype.constructor;function ai(){return new ii(this._groups,this._parents)}function oi(e,t){var n,r,i;return function(){var a=C(this,e),o=(this.style.removeProperty(e),C(this,e));return a===o?null:a===n&&o===r?i:i=t(n=a,r=o)}}function si(e){return function(){this.style.removeProperty(e)}}function ci(e,t,n){var r,i=n+``,a;return function(){var o=C(this,e);return o===i?null:o===r?a:a=t(r=o,n)}}function li(e,t,n){var r,i,a;return function(){var o=C(this,e),s=n(this),c=s+``;return s??(c=s=(this.style.removeProperty(e),C(this,e))),o===c?null:o===r&&c===i?a:(i=c,a=t(r=o,s))}}function ui(e,t){var n,r,i,a=`style.`+t,o=`end.`+a,s;return function(){var c=G(this,e),l=c.on,u=c.value[a]==null?s||=si(t):void 0;(l!==n||i!==u)&&(r=(n=l).copy()).on(o,i=u),c.on=r}}function di(e,t,n){var r=(e+=``)==`transform`?Gn:Er;return t==null?this.styleTween(e,oi(e,r)).on(`end.style.`+e,si(e)):typeof t==`function`?this.styleTween(e,li(e,r,Tr(this,`style.`+e,t))).each(ui(this._id,e)):this.styleTween(e,ci(e,r,t),n).on(`end.style.`+e,null)}function fi(e,t,n){return function(r){this.style.setProperty(e,t.call(this,r),n)}}function pi(e,t,n){var r,i;function a(){var a=t.apply(this,arguments);return a!==i&&(r=(i=a)&&fi(e,a,n)),r}return a._value=t,a}function mi(e,t,n){var r=`style.`+(e+=``);if(arguments.length<2)return(r=this.tween(r))&&r._value;if(t==null)return this.tween(r,null);if(typeof t!=`function`)throw Error();return this.tween(r,pi(e,t,n??``))}function hi(e){return function(){this.textContent=e}}function gi(e){return function(){var t=e(this);this.textContent=t??``}}function _i(e){return this.tween(`text`,typeof e==`function`?gi(Tr(this,`text`,e)):hi(e==null?``:e+``))}function vi(e){return function(t){this.textContent=e.call(this,t)}}function yi(e){var t,n;function r(){var r=e.apply(this,arguments);return r!==n&&(t=(n=r)&&vi(r)),t}return r._value=e,r}function bi(e){var t=`text`;if(arguments.length<1)return(t=this.tween(t))&&t._value;if(e==null)return this.tween(t,null);if(typeof e!=`function`)throw Error();return this.tween(t,yi(e))}function xi(){for(var e=this._name,t=this._id,n=Ti(),r=this._groups,i=r.length,a=0;a<i;++a)for(var o=r[a],s=o.length,c,l=0;l<s;++l)if(c=o[l]){var u=K(c,t);_r(c,e,n,l,o,{time:u.time+u.delay+u.duration,delay:0,duration:u.duration,ease:u.ease})}return new q(r,this._parents,e,n)}function Si(){var e,t,n=this,r=n._id,i=n.size();return new Promise(function(a,o){var s={value:o},c={value:function(){--i===0&&a()}};n.each(function(){var n=G(this,r),i=n.on;i!==e&&(t=(e=i).copy(),t._.cancel.push(s),t._.interrupt.push(s),t._.end.push(c)),n.on=t}),i===0&&a()})}var Ci=0;function q(e,t,n,r){this._groups=e,this._parents=t,this._name=n,this._id=r}function wi(e){return T().transition(e)}function Ti(){return++Ci}var J=T.prototype;q.prototype=wi.prototype={constructor:q,select:ni,selectAll:ri,selectChild:J.selectChild,selectChildren:J.selectChildren,filter:Yr,merge:Xr,selection:ai,transition:xi,call:J.call,nodes:J.nodes,node:J.node,size:J.size,empty:J.empty,each:J.each,on:$r,attr:Nr,attrTween:Rr,style:di,styleTween:mi,text:_i,textTween:bi,remove:ti,tween:wr,delay:Vr,duration:Wr,ease:Kr,easeVarying:Jr,end:Si,[Symbol.iterator]:J[Symbol.iterator]};function Ei(e){return((e*=2)<=1?e*e*e:(e-=2)*e*e+2)/2}var Di={time:null,delay:0,duration:250,ease:Ei};function Oi(e,t){for(var n;!(n=e.__transition)||!(n=n[t]);)if(!(e=e.parentNode))throw Error(`transition ${t} not found`);return n}function ki(e){var t,n;e instanceof q?(t=e._id,e=e._name):(t=Ti(),(n=Di).time=ar(),e=e==null?null:e+``);for(var r=this._groups,i=r.length,a=0;a<i;++a)for(var o=r[a],s=o.length,c,l=0;l<s;++l)(c=o[l])&&_r(c,e,t,l,o,n||Oi(c,t));return new q(r,this._parents,e,t)}T.prototype.interrupt=xr,T.prototype.transition=ki;var{abs:Ai,max:ji,min:Mi}=Math;[`w`,`e`].map(Ni),[`n`,`s`].map(Ni),[`n`,`w`,`e`,`s`,`nw`,`ne`,`sw`,`se`].map(Ni);function Ni(e){return{type:e}}function Pi(e,t){var n,r=1;e??=0,t??=0;function i(){var i,a=n.length,o,s=0,c=0;for(i=0;i<a;++i)o=n[i],s+=o.x,c+=o.y;for(s=(s/a-e)*r,c=(c/a-t)*r,i=0;i<a;++i)o=n[i],o.x-=s,o.y-=c}return i.initialize=function(e){n=e},i.x=function(t){return arguments.length?(e=+t,i):e},i.y=function(e){return arguments.length?(t=+e,i):t},i.strength=function(e){return arguments.length?(r=+e,i):r},i}function Fi(e){let t=+this._x.call(null,e),n=+this._y.call(null,e);return Ii(this.cover(t,n),t,n,e)}function Ii(e,t,n,r){if(isNaN(t)||isNaN(n))return e;var i,a=e._root,o={data:r},s=e._x0,c=e._y0,l=e._x1,u=e._y1,d,f,p,m,h,g,_,v;if(!a)return e._root=o,e;for(;a.length;)if((h=t>=(d=(s+l)/2))?s=d:l=d,(g=n>=(f=(c+u)/2))?c=f:u=f,i=a,!(a=a[_=g<<1|h]))return i[_]=o,e;if(p=+e._x.call(null,a.data),m=+e._y.call(null,a.data),t===p&&n===m)return o.next=a,i?i[_]=o:e._root=o,e;do i=i?i[_]=[,,,,]:e._root=[,,,,],(h=t>=(d=(s+l)/2))?s=d:l=d,(g=n>=(f=(c+u)/2))?c=f:u=f;while((_=g<<1|h)==(v=(m>=f)<<1|p>=d));return i[v]=a,i[_]=o,e}function Li(e){var t,n,r=e.length,i,a,o=Array(r),s=Array(r),c=1/0,l=1/0,u=-1/0,d=-1/0;for(n=0;n<r;++n)isNaN(i=+this._x.call(null,t=e[n]))||isNaN(a=+this._y.call(null,t))||(o[n]=i,s[n]=a,i<c&&(c=i),i>u&&(u=i),a<l&&(l=a),a>d&&(d=a));if(c>u||l>d)return this;for(this.cover(c,l).cover(u,d),n=0;n<r;++n)Ii(this,o[n],s[n],e[n]);return this}function Ri(e,t){if(isNaN(e=+e)||isNaN(t=+t))return this;var n=this._x0,r=this._y0,i=this._x1,a=this._y1;if(isNaN(n))i=(n=Math.floor(e))+1,a=(r=Math.floor(t))+1;else{for(var o=i-n||1,s=this._root,c,l;n>e||e>=i||r>t||t>=a;)switch(l=(t<r)<<1|e<n,c=[,,,,],c[l]=s,s=c,o*=2,l){case 0:i=n+o,a=r+o;break;case 1:n=i-o,a=r+o;break;case 2:i=n+o,r=a-o;break;case 3:n=i-o,r=a-o;break}this._root&&this._root.length&&(this._root=s)}return this._x0=n,this._y0=r,this._x1=i,this._y1=a,this}function zi(){var e=[];return this.visit(function(t){if(!t.length)do e.push(t.data);while(t=t.next)}),e}function Bi(e){return arguments.length?this.cover(+e[0][0],+e[0][1]).cover(+e[1][0],+e[1][1]):isNaN(this._x0)?void 0:[[this._x0,this._y0],[this._x1,this._y1]]}function Y(e,t,n,r,i){this.node=e,this.x0=t,this.y0=n,this.x1=r,this.y1=i}function Vi(e,t,n){var r,i=this._x0,a=this._y0,o,s,c,l,u=this._x1,d=this._y1,f=[],p=this._root,m,h;for(p&&f.push(new Y(p,i,a,u,d)),n==null?n=1/0:(i=e-n,a=t-n,u=e+n,d=t+n,n*=n);m=f.pop();)if(!(!(p=m.node)||(o=m.x0)>u||(s=m.y0)>d||(c=m.x1)<i||(l=m.y1)<a))if(p.length){var g=(o+c)/2,_=(s+l)/2;f.push(new Y(p[3],g,_,c,l),new Y(p[2],o,_,g,l),new Y(p[1],g,s,c,_),new Y(p[0],o,s,g,_)),(h=(t>=_)<<1|e>=g)&&(m=f[f.length-1],f[f.length-1]=f[f.length-1-h],f[f.length-1-h]=m)}else{var v=e-+this._x.call(null,p.data),y=t-+this._y.call(null,p.data),b=v*v+y*y;if(b<n){var x=Math.sqrt(n=b);i=e-x,a=t-x,u=e+x,d=t+x,r=p.data}}return r}function Hi(e){if(isNaN(u=+this._x.call(null,e))||isNaN(d=+this._y.call(null,e)))return this;var t,n=this._root,r,i,a,o=this._x0,s=this._y0,c=this._x1,l=this._y1,u,d,f,p,m,h,g,_;if(!n)return this;if(n.length)for(;;){if((m=u>=(f=(o+c)/2))?o=f:c=f,(h=d>=(p=(s+l)/2))?s=p:l=p,t=n,!(n=n[g=h<<1|m]))return this;if(!n.length)break;(t[g+1&3]||t[g+2&3]||t[g+3&3])&&(r=t,_=g)}for(;n.data!==e;)if(i=n,!(n=n.next))return this;return(a=n.next)&&delete n.next,i?(a?i.next=a:delete i.next,this):t?(a?t[g]=a:delete t[g],(n=t[0]||t[1]||t[2]||t[3])&&n===(t[3]||t[2]||t[1]||t[0])&&!n.length&&(r?r[_]=n:this._root=n),this):(this._root=a,this)}function Ui(e){for(var t=0,n=e.length;t<n;++t)this.remove(e[t]);return this}function Wi(){return this._root}function Gi(){var e=0;return this.visit(function(t){if(!t.length)do++e;while(t=t.next)}),e}function Ki(e){var t=[],n,r=this._root,i,a,o,s,c;for(r&&t.push(new Y(r,this._x0,this._y0,this._x1,this._y1));n=t.pop();)if(!e(r=n.node,a=n.x0,o=n.y0,s=n.x1,c=n.y1)&&r.length){var l=(a+s)/2,u=(o+c)/2;(i=r[3])&&t.push(new Y(i,l,u,s,c)),(i=r[2])&&t.push(new Y(i,a,u,l,c)),(i=r[1])&&t.push(new Y(i,l,o,s,u)),(i=r[0])&&t.push(new Y(i,a,o,l,u))}return this}function qi(e){var t=[],n=[],r;for(this._root&&t.push(new Y(this._root,this._x0,this._y0,this._x1,this._y1));r=t.pop();){var i=r.node;if(i.length){var a,o=r.x0,s=r.y0,c=r.x1,l=r.y1,u=(o+c)/2,d=(s+l)/2;(a=i[0])&&t.push(new Y(a,o,s,u,d)),(a=i[1])&&t.push(new Y(a,u,s,c,d)),(a=i[2])&&t.push(new Y(a,o,d,u,l)),(a=i[3])&&t.push(new Y(a,u,d,c,l))}n.push(r)}for(;r=n.pop();)e(r.node,r.x0,r.y0,r.x1,r.y1);return this}function Ji(e){return e[0]}function Yi(e){return arguments.length?(this._x=e,this):this._x}function Xi(e){return e[1]}function Zi(e){return arguments.length?(this._y=e,this):this._y}function Qi(e,t,n){var r=new $i(t??Ji,n??Xi,NaN,NaN,NaN,NaN);return e==null?r:r.addAll(e)}function $i(e,t,n,r,i,a){this._x=e,this._y=t,this._x0=n,this._y0=r,this._x1=i,this._y1=a,this._root=void 0}function ea(e){for(var t={data:e.data},n=t;e=e.next;)n=n.next={data:e.data};return t}var X=Qi.prototype=$i.prototype;X.copy=function(){var e=new $i(this._x,this._y,this._x0,this._y0,this._x1,this._y1),t=this._root,n,r;if(!t)return e;if(!t.length)return e._root=ea(t),e;for(n=[{source:t,target:e._root=[,,,,]}];t=n.pop();)for(var i=0;i<4;++i)(r=t.source[i])&&(r.length?n.push({source:r,target:t.target[i]=[,,,,]}):t.target[i]=ea(r));return e},X.add=Fi,X.addAll=Li,X.cover=Ri,X.data=zi,X.extent=Bi,X.find=Vi,X.remove=Hi,X.removeAll=Ui,X.root=Wi,X.size=Gi,X.visit=Ki,X.visitAfter=qi,X.x=Yi,X.y=Zi;function Z(e){return function(){return e}}function Q(e){return(e()-.5)*1e-6}function ta(e){return e.x+e.vx}function na(e){return e.y+e.vy}function ra(e){var t,n,r,i=1,a=1;typeof e!=`function`&&(e=Z(e==null?1:+e));function o(){for(var e,o=t.length,c,l,u,d,f,p,m=0;m<a;++m)for(c=Qi(t,ta,na).visitAfter(s),e=0;e<o;++e)l=t[e],f=n[l.index],p=f*f,u=l.x+l.vx,d=l.y+l.vy,c.visit(h);function h(e,t,n,a,o){var s=e.data,c=e.r,m=f+c;if(s){if(s.index>l.index){var h=u-s.x-s.vx,g=d-s.y-s.vy,_=h*h+g*g;_<m*m&&(h===0&&(h=Q(r),_+=h*h),g===0&&(g=Q(r),_+=g*g),_=(m-(_=Math.sqrt(_)))/_*i,l.vx+=(h*=_)*(m=(c*=c)/(p+c)),l.vy+=(g*=_)*m,s.vx-=h*(m=1-m),s.vy-=g*m)}return}return t>u+m||a<u-m||n>d+m||o<d-m}}function s(e){if(e.data)return e.r=n[e.data.index];for(var t=e.r=0;t<4;++t)e[t]&&e[t].r>e.r&&(e.r=e[t].r)}function c(){if(t){var r,i=t.length,a;for(n=Array(i),r=0;r<i;++r)a=t[r],n[a.index]=+e(a,r,t)}}return o.initialize=function(e,n){t=e,r=n,c()},o.iterations=function(e){return arguments.length?(a=+e,o):a},o.strength=function(e){return arguments.length?(i=+e,o):i},o.radius=function(t){return arguments.length?(e=typeof t==`function`?t:Z(+t),c(),o):e},o}function ia(e){return e.index}function aa(e,t){var n=e.get(t);if(!n)throw Error(`node not found: `+t);return n}function oa(e){var t=ia,n=d,r,i=Z(30),a,o,s,c,l,u=1;e??=[];function d(e){return 1/Math.min(s[e.source.index],s[e.target.index])}function f(t){for(var n=0,i=e.length;n<u;++n)for(var o=0,s,d,f,p,m,h,g;o<i;++o)s=e[o],d=s.source,f=s.target,p=f.x+f.vx-d.x-d.vx||Q(l),m=f.y+f.vy-d.y-d.vy||Q(l),h=Math.sqrt(p*p+m*m),h=(h-a[o])/h*t*r[o],p*=h,m*=h,f.vx-=p*(g=c[o]),f.vy-=m*g,d.vx+=p*(g=1-g),d.vy+=m*g}function p(){if(o){var n,i=o.length,l=e.length,u=new Map(o.map((e,n)=>[t(e,n,o),e])),d;for(n=0,s=Array(i);n<l;++n)d=e[n],d.index=n,typeof d.source!=`object`&&(d.source=aa(u,d.source)),typeof d.target!=`object`&&(d.target=aa(u,d.target)),s[d.source.index]=(s[d.source.index]||0)+1,s[d.target.index]=(s[d.target.index]||0)+1;for(n=0,c=Array(l);n<l;++n)d=e[n],c[n]=s[d.source.index]/(s[d.source.index]+s[d.target.index]);r=Array(l),m(),a=Array(l),h()}}function m(){if(o)for(var t=0,i=e.length;t<i;++t)r[t]=+n(e[t],t,e)}function h(){if(o)for(var t=0,n=e.length;t<n;++t)a[t]=+i(e[t],t,e)}return f.initialize=function(e,t){o=e,l=t,p()},f.links=function(t){return arguments.length?(e=t,p(),f):e},f.id=function(e){return arguments.length?(t=e,f):t},f.iterations=function(e){return arguments.length?(u=+e,f):u},f.strength=function(e){return arguments.length?(n=typeof e==`function`?e:Z(+e),m(),f):n},f.distance=function(e){return arguments.length?(i=typeof e==`function`?e:Z(+e),h(),f):i},f}var sa=1664525,ca=1013904223,la=4294967296;function ua(){let e=1;return()=>(e=(sa*e+ca)%la)/la}function da(e){return e.x}function fa(e){return e.y}var pa=10,ma=Math.PI*(3-Math.sqrt(5));function ha(e){var t,n=1,r=.001,i=1-r**(1/300),a=0,o=.6,s=new Map,l=cr(f),u=c(`tick`,`end`),d=ua();e??=[];function f(){p(),u.call(`tick`,t),n<r&&(l.stop(),u.call(`end`,t))}function p(r){var c,l=e.length,u;r===void 0&&(r=1);for(var d=0;d<r;++d)for(n+=(a-n)*i,s.forEach(function(e){e(n)}),c=0;c<l;++c)u=e[c],u.fx==null?u.x+=u.vx*=o:(u.x=u.fx,u.vx=0),u.fy==null?u.y+=u.vy*=o:(u.y=u.fy,u.vy=0);return t}function m(){for(var t=0,n=e.length,r;t<n;++t){if(r=e[t],r.index=t,r.fx!=null&&(r.x=r.fx),r.fy!=null&&(r.y=r.fy),isNaN(r.x)||isNaN(r.y)){var i=pa*Math.sqrt(.5+t),a=t*ma;r.x=i*Math.cos(a),r.y=i*Math.sin(a)}(isNaN(r.vx)||isNaN(r.vy))&&(r.vx=r.vy=0)}}function h(t){return t.initialize&&t.initialize(e,d),t}return m(),t={tick:p,restart:function(){return l.restart(f),t},stop:function(){return l.stop(),t},nodes:function(n){return arguments.length?(e=n,m(),s.forEach(h),t):e},alpha:function(e){return arguments.length?(n=+e,t):n},alphaMin:function(e){return arguments.length?(r=+e,t):r},alphaDecay:function(e){return arguments.length?(i=+e,t):+i},alphaTarget:function(e){return arguments.length?(a=+e,t):a},velocityDecay:function(e){return arguments.length?(o=1-e,t):1-o},randomSource:function(e){return arguments.length?(d=e,s.forEach(h),t):d},force:function(e,n){return arguments.length>1?(n==null?s.delete(e):s.set(e,h(n)),t):s.get(e)},find:function(t,n,r){var i=0,a=e.length,o,s,c,l,u;for(r==null?r=1/0:r*=r,i=0;i<a;++i)l=e[i],o=t-l.x,s=n-l.y,c=o*o+s*s,c<r&&(u=l,r=c);return u},on:function(e,n){return arguments.length>1?(u.on(e,n),t):u.on(e)}}}function ga(){var e,t,n,r,i=Z(-30),a,o=1,s=1/0,c=.81;function l(n){var i,a=e.length,o=Qi(e,da,fa).visitAfter(d);for(r=n,i=0;i<a;++i)t=e[i],o.visit(f)}function u(){if(e){var t,n=e.length,r;for(a=Array(n),t=0;t<n;++t)r=e[t],a[r.index]=+i(r,t,e)}}function d(e){var t=0,n,r,i=0,o,s,c;if(e.length){for(o=s=c=0;c<4;++c)(n=e[c])&&(r=Math.abs(n.value))&&(t+=n.value,i+=r,o+=r*n.x,s+=r*n.y);e.x=o/i,e.y=s/i}else{n=e,n.x=n.data.x,n.y=n.data.y;do t+=a[n.data.index];while(n=n.next)}e.value=t}function f(e,i,l,u){if(!e.value)return!0;var d=e.x-t.x,f=e.y-t.y,p=u-i,m=d*d+f*f;if(p*p/c<m)return m<s&&(d===0&&(d=Q(n),m+=d*d),f===0&&(f=Q(n),m+=f*f),m<o&&(m=Math.sqrt(o*m)),t.vx+=d*e.value*r/m,t.vy+=f*e.value*r/m),!0;if(!(e.length||m>=s)){(e.data!==t||e.next)&&(d===0&&(d=Q(n),m+=d*d),f===0&&(f=Q(n),m+=f*f),m<o&&(m=Math.sqrt(o*m)));do e.data!==t&&(p=a[e.data.index]*r/m,t.vx+=d*p,t.vy+=f*p);while(e=e.next)}}return l.initialize=function(t,r){e=t,n=r,u()},l.strength=function(e){return arguments.length?(i=typeof e==`function`?e:Z(+e),u(),l):i},l.distanceMin=function(e){return arguments.length?(o=e*e,l):Math.sqrt(o)},l.distanceMax=function(e){return arguments.length?(s=e*e,l):Math.sqrt(s)},l.theta=function(e){return arguments.length?(c=e*e,l):Math.sqrt(c)},l}var _a=e=>()=>e;function va(e,{sourceEvent:t,target:n,transform:r,dispatch:i}){Object.defineProperties(this,{type:{value:e,enumerable:!0,configurable:!0},sourceEvent:{value:t,enumerable:!0,configurable:!0},target:{value:n,enumerable:!0,configurable:!0},transform:{value:r,enumerable:!0,configurable:!0},_:{value:i}})}function $(e,t,n){this.k=e,this.x=t,this.y=n}$.prototype={constructor:$,scale:function(e){return e===1?this:new $(this.k*e,this.x,this.y)},translate:function(e,t){return e===0&t===0?this:new $(this.k,this.x+this.k*e,this.y+this.k*t)},apply:function(e){return[e[0]*this.k+this.x,e[1]*this.k+this.y]},applyX:function(e){return e*this.k+this.x},applyY:function(e){return e*this.k+this.y},invert:function(e){return[(e[0]-this.x)/this.k,(e[1]-this.y)/this.k]},invertX:function(e){return(e-this.x)/this.k},invertY:function(e){return(e-this.y)/this.k},rescaleX:function(e){return e.copy().domain(e.range().map(this.invertX,this).map(e.invert,e))},rescaleY:function(e){return e.copy().domain(e.range().map(this.invertY,this).map(e.invert,e))},toString:function(){return`translate(`+this.x+`,`+this.y+`) scale(`+this.k+`)`}};var ya=new $(1,0,0);ba.prototype=$.prototype;function ba(e){for(;!e.__zoom;)if(!(e=e.parentNode))return ya;return e.__zoom}function xa(e){e.stopImmediatePropagation()}function Sa(e){e.preventDefault(),e.stopImmediatePropagation()}function Ca(e){return(!e.ctrlKey||e.type===`wheel`)&&!e.button}function wa(){var e=this;return e instanceof SVGElement?(e=e.ownerSVGElement||e,e.hasAttribute(`viewBox`)?(e=e.viewBox.baseVal,[[e.x,e.y],[e.x+e.width,e.y+e.height]]):[[0,0],[e.width.baseVal.value,e.height.baseVal.value]]):[[0,0],[e.clientWidth,e.clientHeight]]}function Ta(){return this.__zoom||ya}function Ea(e){return-e.deltaY*(e.deltaMode===1?.05:e.deltaMode?1:.002)*(e.ctrlKey?10:1)}function Da(){return navigator.maxTouchPoints||`ontouchstart`in this}function Oa(e,t,n){var r=e.invertX(t[0][0])-n[0][0],i=e.invertX(t[1][0])-n[1][0],a=e.invertY(t[0][1])-n[0][1],o=e.invertY(t[1][1])-n[1][1];return e.translate(i>r?(r+i)/2:Math.min(0,r)||Math.max(0,i),o>a?(a+o)/2:Math.min(0,a)||Math.max(0,o))}function ka(){var e=Ca,t=wa,n=Oa,r=Ea,i=Da,a=[0,1/0],o=[[-1/0,-1/0],[1/0,1/0]],s=250,l=Zn,u=c(`start`,`zoom`,`end`),d,f,p,m=500,h=150,g=0,_=10;function v(e){e.property(`__zoom`,Ta).on(`wheel.zoom`,ne,{passive:!1}).on(`mousedown.zoom`,re).on(`dblclick.zoom`,ie).filter(i).on(`touchstart.zoom`,ae).on(`touchmove.zoom`,oe).on(`touchend.zoom touchcancel.zoom`,se).style(`-webkit-tap-highlight-color`,`rgba(0,0,0,0)`)}v.transform=function(e,t,n,r){var i=e.selection?e.selection():e;i.property(`__zoom`,Ta),e===i?i.interrupt().each(function(){S(this,arguments).event(r).start().zoom(null,typeof t==`function`?t.apply(this,arguments):t).end()}):ee(e,t,n,r)},v.scaleBy=function(e,t,n,r){v.scaleTo(e,function(){return this.__zoom.k*(typeof t==`function`?t.apply(this,arguments):t)},n,r)},v.scaleTo=function(e,r,i,a){v.transform(e,function(){var e=t.apply(this,arguments),a=this.__zoom,s=i==null?x(e):typeof i==`function`?i.apply(this,arguments):i,c=a.invert(s),l=typeof r==`function`?r.apply(this,arguments):r;return n(b(y(a,l),s,c),e,o)},i,a)},v.translateBy=function(e,r,i,a){v.transform(e,function(){return n(this.__zoom.translate(typeof r==`function`?r.apply(this,arguments):r,typeof i==`function`?i.apply(this,arguments):i),t.apply(this,arguments),o)},null,a)},v.translateTo=function(e,r,i,a,s){v.transform(e,function(){var e=t.apply(this,arguments),s=this.__zoom,c=a==null?x(e):typeof a==`function`?a.apply(this,arguments):a;return n(ya.translate(c[0],c[1]).scale(s.k).translate(typeof r==`function`?-r.apply(this,arguments):-r,typeof i==`function`?-i.apply(this,arguments):-i),e,o)},a,s)};function y(e,t){return t=Math.max(a[0],Math.min(a[1],t)),t===e.k?e:new $(t,e.x,e.y)}function b(e,t,n){var r=t[0]-n[0]*e.k,i=t[1]-n[1]*e.k;return r===e.x&&i===e.y?e:new $(e.k,r,i)}function x(e){return[(+e[0][0]+ +e[1][0])/2,(+e[0][1]+ +e[1][1])/2]}function ee(e,n,r,i){e.on(`start.zoom`,function(){S(this,arguments).event(i).start()}).on(`interrupt.zoom end.zoom`,function(){S(this,arguments).event(i).end()}).tween(`zoom`,function(){var e=this,a=arguments,o=S(e,a).event(i),s=t.apply(e,a),c=r==null?x(s):typeof r==`function`?r.apply(e,a):r,u=Math.max(s[1][0]-s[0][0],s[1][1]-s[0][1]),d=e.__zoom,f=typeof n==`function`?n.apply(e,a):n,p=l(d.invert(c).concat(u/d.k),f.invert(c).concat(u/f.k));return function(e){if(e===1)e=f;else{var t=p(e),n=u/t[2];e=new $(n,c[0]-t[0]*n,c[1]-t[1]*n)}o.zoom(null,e)}})}function S(e,t,n){return!n&&e.__zooming||new te(e,t)}function te(e,n){this.that=e,this.args=n,this.active=0,this.sourceEvent=null,this.extent=t.apply(e,n),this.taps=0}te.prototype={event:function(e){return e&&(this.sourceEvent=e),this},start:function(){return++this.active===1&&(this.that.__zooming=this,this.emit(`start`)),this},zoom:function(e,t){return this.mouse&&e!==`mouse`&&(this.mouse[1]=t.invert(this.mouse[0])),this.touch0&&e!==`touch`&&(this.touch0[1]=t.invert(this.touch0[0])),this.touch1&&e!==`touch`&&(this.touch1[1]=t.invert(this.touch1[0])),this.that.__zoom=t,this.emit(`zoom`),this},end:function(){return--this.active===0&&(delete this.that.__zooming,this.emit(`end`)),this},emit:function(e){var t=E(this.that).datum();u.call(e,this.that,new va(e,{sourceEvent:this.sourceEvent,target:v,type:e,transform:this.that.__zoom,dispatch:u}),t)}};function ne(t,...i){if(!e.apply(this,arguments))return;var s=S(this,i).event(t),c=this.__zoom,l=Math.max(a[0],Math.min(a[1],c.k*2**r.apply(this,arguments))),u=D(t);if(s.wheel)(s.mouse[0][0]!==u[0]||s.mouse[0][1]!==u[1])&&(s.mouse[1]=c.invert(s.mouse[0]=u)),clearTimeout(s.wheel);else if(c.k===l)return;else s.mouse=[u,c.invert(u)],br(this),s.start();Sa(t),s.wheel=setTimeout(d,h),s.zoom(`mouse`,n(b(y(c,l),s.mouse[0],s.mouse[1]),s.extent,o));function d(){s.wheel=null,s.end()}}function re(t,...r){if(p||!e.apply(this,arguments))return;var i=t.currentTarget,a=S(this,r,!0).event(t),s=E(t.view).on(`mousemove.zoom`,d,!0).on(`mouseup.zoom`,f,!0),c=D(t,i),l=t.clientX,u=t.clientY;Ht(t.view),xa(t),a.mouse=[c,this.__zoom.invert(c)],br(this),a.start();function d(e){if(Sa(e),!a.moved){var t=e.clientX-l,r=e.clientY-u;a.moved=t*t+r*r>g}a.event(e).zoom(`mouse`,n(b(a.that.__zoom,a.mouse[0]=D(e,i),a.mouse[1]),a.extent,o))}function f(e){s.on(`mousemove.zoom mouseup.zoom`,null),Ut(e.view,a.moved),Sa(e),a.event(e).end()}}function ie(r,...i){if(e.apply(this,arguments)){var a=this.__zoom,c=D(r.changedTouches?r.changedTouches[0]:r,this),l=a.invert(c),u=a.k*(r.shiftKey?.5:2),d=n(b(y(a,u),c,l),t.apply(this,i),o);Sa(r),s>0?E(this).transition().duration(s).call(ee,d,c,r):E(this).call(v.transform,d,c,r)}}function ae(t,...n){if(e.apply(this,arguments)){var r=t.touches,i=r.length,a=S(this,n,t.changedTouches.length===i).event(t),o,s,c,l;for(xa(t),s=0;s<i;++s)c=r[s],l=D(c,this),l=[l,this.__zoom.invert(l),c.identifier],a.touch0?!a.touch1&&a.touch0[2]!==l[2]&&(a.touch1=l,a.taps=0):(a.touch0=l,o=!0,a.taps=1+!!d);d&&=clearTimeout(d),o&&(a.taps<2&&(f=l[0],d=setTimeout(function(){d=null},m)),br(this),a.start())}}function oe(e,...t){if(this.__zooming){var r=S(this,t).event(e),i=e.changedTouches,a=i.length,s,c,l,u;for(Sa(e),s=0;s<a;++s)c=i[s],l=D(c,this),r.touch0&&r.touch0[2]===c.identifier?r.touch0[0]=l:r.touch1&&r.touch1[2]===c.identifier&&(r.touch1[0]=l);if(c=r.that.__zoom,r.touch1){var d=r.touch0[0],f=r.touch0[1],p=r.touch1[0],m=r.touch1[1],h=(h=p[0]-d[0])*h+(h=p[1]-d[1])*h,g=(g=m[0]-f[0])*g+(g=m[1]-f[1])*g;c=y(c,Math.sqrt(h/g)),l=[(d[0]+p[0])/2,(d[1]+p[1])/2],u=[(f[0]+m[0])/2,(f[1]+m[1])/2]}else if(r.touch0)l=r.touch0[0],u=r.touch0[1];else return;r.zoom(`touch`,n(b(c,l,u),r.extent,o))}}function se(e,...t){if(this.__zooming){var n=S(this,t).event(e),r=e.changedTouches,i=r.length,a,o;for(xa(e),p&&clearTimeout(p),p=setTimeout(function(){p=null},m),a=0;a<i;++a)o=r[a],n.touch0&&n.touch0[2]===o.identifier?delete n.touch0:n.touch1&&n.touch1[2]===o.identifier&&delete n.touch1;if(n.touch1&&!n.touch0&&(n.touch0=n.touch1,delete n.touch1),n.touch0)n.touch0[1]=this.__zoom.invert(n.touch0[0]);else if(n.end(),n.taps===2&&(o=D(o,this),Math.hypot(f[0]-o[0],f[1]-o[1])<_)){var s=E(this).on(`dblclick.zoom`);s&&s.apply(this,arguments)}}}return v.wheelDelta=function(e){return arguments.length?(r=typeof e==`function`?e:_a(+e),v):r},v.filter=function(t){return arguments.length?(e=typeof t==`function`?t:_a(!!t),v):e},v.touchable=function(e){return arguments.length?(i=typeof e==`function`?e:_a(!!e),v):i},v.extent=function(e){return arguments.length?(t=typeof e==`function`?e:_a([[+e[0][0],+e[0][1]],[+e[1][0],+e[1][1]]]),v):t},v.scaleExtent=function(e){return arguments.length?(a[0]=+e[0],a[1]=+e[1],v):[a[0],a[1]]},v.translateExtent=function(e){return arguments.length?(o[0][0]=+e[0][0],o[1][0]=+e[1][0],o[0][1]=+e[0][1],o[1][1]=+e[1][1],v):[[o[0][0],o[0][1]],[o[1][0],o[1][1]]]},v.constrain=function(e){return arguments.length?(n=e,v):n},v.duration=function(e){return arguments.length?(s=+e,v):s},v.interpolate=function(e){return arguments.length?(l=e,v):l},v.on=function(){var e=u.on.apply(u,arguments);return e===u?v:e},v.clickDistance=function(e){return arguments.length?(g=(e=+e)*e,v):Math.sqrt(g)},v.tapDistance=function(e){return arguments.length?(_=+e,v):_},v}var Aa={path:`/graph/:id`,navKey:`dashboard`,async render(e,t){let n=t.id,[i,a]=await Promise.all([r.getUserDetail(n),r.getGraphData(n,10)]);if(!i){e.innerHTML=`
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
    `,this.renderD3Graph(n,a)},renderD3Graph(e,t){let n=document.getElementById(`graph-container`),i=n.clientWidth||800,a=n.clientHeight||600;E(`#graph-container svg`).remove();let o=E(`#graph-container`).append(`svg`).attr(`width`,i).attr(`height`,a),s=o.append(`g`);o.call(ka().scaleExtent([.1,4]).on(`zoom`,e=>{s.attr(`transform`,e.transform)}));let c=ha(t.nodes).force(`link`,oa(t.links).id(e=>e.id).distance(e=>e.type===`similarity`?120:e.type===`checkout`||e.type===`shared_checkout`?65:90)).force(`charge`,ga().strength(-150)).force(`center`,Pi(i/2,a/2)).force(`collide`,ra().radius(22)),l=e=>e.type===`target_user`?`#f43f5e`:e.type===`target_book`?`var(--color-content)`:e.type===`similar_user`?`var(--color-collab)`:e.type===`collab_book`?`var(--color-hybrid)`:`#9e8f80`,u=s.append(`g`).attr(`class`,`links`).selectAll(`line`).data(t.links).enter().append(`line`).attr(`class`,`link`).attr(`stroke`,e=>e.type===`similarity`?`var(--color-collab)`:e.type===`checkout`?`var(--color-content)`:e.type===`shared_checkout`?`var(--color-gold)`:`rgba(112, 99, 86, 0.2)`).attr(`stroke-width`,e=>e.type===`similarity`?e.value*8:e.type===`checkout`||e.type===`shared_checkout`?1.5:1).attr(`stroke-opacity`,.5).attr(`stroke-dasharray`,e=>e.type===`shared_checkout`?`3,3`:null),d=s.append(`g`).attr(`class`,`nodes`).selectAll(`circle`).data(t.nodes).enter().append(`circle`).attr(`class`,`node`).attr(`r`,e=>e.type===`target_user`?18:e.type===`similar_user`?12:e.type===`target_book`||e.type===`collab_book`?8:6).attr(`fill`,l).call(Xt().on(`start`,h).on(`drag`,g).on(`end`,_)),f=s.append(`g`).attr(`class`,`labels`).selectAll(`text`).data(t.nodes.filter(e=>e.type===`target_user`||e.type===`similar_user`)).enter().append(`text`).attr(`dy`,-20).attr(`text-anchor`,`middle`).text(e=>e.name.split(` `)[0]),p=document.getElementById(`graph-tooltip`),m=document.getElementById(`graph-side-panel`);d.on(`mouseover`,function(e,t){u.style(`stroke-opacity`,e=>e.source.id===t.id||e.target.id===t.id?.9:.1),u.style(`stroke-width`,e=>e.source.id===t.id||e.target.id===t.id?3:1),p.style.display=`block`;let r=``;t.type===`target_user`?r=`<strong>Lector Principal:</strong><br>${t.name}`:t.type===`similar_user`?r=`<strong>Lector Afín:</strong><br>${t.name}<br>Afinidad: ${Math.round(t.similarity*100)}%`:t.type===`target_book`?r=`<strong>Libro en Historial:</strong><br>${t.name}`:t.type===`collab_book`&&(r=`<strong>Sugerencia de Red:</strong><br>${t.name}`),p.innerHTML=r;let i=n.getBoundingClientRect();p.style.left=`${e.clientX-i.left+15}px`,p.style.top=`${e.clientY-i.top+15}px`}),d.on(`mousemove`,function(e){let t=n.getBoundingClientRect();p.style.left=`${e.clientX-t.left+15}px`,p.style.top=`${e.clientY-t.top+15}px`}),d.on(`mouseout`,function(){u.style(`stroke-opacity`,.5),u.style(`stroke-width`,e=>e.type===`similarity`?e.value*8:e.type===`checkout`||e.type===`shared_checkout`?1.5:1),p.style.display=`none`}),d.on(`click`,async(e,n)=>{m.innerHTML=`<div style="text-align:center; padding:3rem;"><i class="fa fa-spinner fa-spin fa-2x" style="color:var(--color-accent)"></i></div>`;try{if(n.type===`similar_user`||n.type===`target_user`){let e=n.id,i=await r.getUserDetail(e),a=``,o=``;if(n.type===`similar_user`){a=`
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
          `}}catch(e){m.innerHTML=`<div style="text-align:center; padding:2rem; color:var(--color-accent);">Error al cargar detalle: ${e.message}</div>`}}),c.on(`tick`,()=>{u.attr(`x1`,e=>e.source.x).attr(`y1`,e=>e.source.y).attr(`x2`,e=>e.target.x).attr(`y2`,e=>e.target.y),d.attr(`cx`,e=>e.x).attr(`cy`,e=>e.y),f.attr(`x`,e=>e.x).attr(`y`,e=>e.y)});function h(e,t){e.active||c.alphaTarget(.3).restart(),t.fx=t.x,t.fy=t.y}function g(e,t){t.fx=e.x,t.fy=e.y}function _(e,t){e.active||c.alphaTarget(0),t.fx=null,t.fy=null}}},ja={Autor:{bg:`rgba(124, 25, 51, 0.08)`,border:`rgba(124, 25, 51, 0.25)`,text:`#7c1933`},Tema:{bg:`rgba(82, 117, 94, 0.08)`,border:`rgba(82, 117, 94, 0.25)`,text:`#52755e`},"Tema (Persona)":{bg:`rgba(82, 117, 94, 0.08)`,border:`rgba(82, 117, 94, 0.25)`,text:`#52755e`},"Tema (Institución)":{bg:`rgba(82, 117, 94, 0.08)`,border:`rgba(82, 117, 94, 0.25)`,text:`#52755e`},Lugar:{bg:`rgba(86, 105, 122, 0.08)`,border:`rgba(86, 105, 122, 0.25)`,text:`#56697a`},"Institución / Organización":{bg:`rgba(179, 143, 77, 0.08)`,border:`rgba(179, 143, 77, 0.25)`,text:`#b38f4d`},"Título Uniforme":{bg:`rgba(128, 90, 150, 0.08)`,border:`rgba(128, 90, 150, 0.25)`,text:`#805a96`}},Ma={Autor:`fa-solid fa-feather`,Tema:`fa-solid fa-tags`,"Tema (Persona)":`fa-solid fa-user-tag`,"Tema (Institución)":`fa-solid fa-building-flag`,Lugar:`fa-solid fa-map-pin`,"Institución / Organización":`fa-solid fa-building`,"Título Uniforme":`fa-solid fa-bookmark`};function Na(e){return ja[e]||ja.Tema}function Pa(e){return Ma[e]||`fa-solid fa-tag`}function Fa(e){let t=Na(e.type),n=Pa(e.type);return`
    <span class="catalog-auth-badge" style="background:${t.bg}; border-color:${t.border}; color:${t.text};" title="${e.type}: ${e.name}">
      <i class="${n}"></i> ${e.name}
    </span>
  `}var Ia={path:`/catalog`,navKey:`catalog`,async render(e){let[t,n]=await Promise.all([r.getCatalogStats().catch(()=>({})),r.getCatalogBooks(``,100).catch(()=>[])]),i=t.total_books||0,a=t.total_authorities||0,o=t.total_connections||0,s=t.type_counts||{};e.innerHTML=`
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
            ${this.renderBooksList(n)}
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
                <div class="stat-number" style="font-size:1.25rem; font-weight:700;">${i.toLocaleString()}</div>
                <div class="stat-label" style="font-size:0.75rem; color:var(--text-secondary);">Obras Catalogadas</div>
              </div>
            </div>
            <div class="glass-card stat-card" style="padding:1rem; display:flex; align-items:center; gap:0.75rem;">
              <div class="stat-icon books" style="background:rgba(82,117,94,0.08); width:2.5rem; height:2.5rem; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i class="fa-solid fa-tags" style="color:var(--color-collab); font-size:1.1rem;"></i>
              </div>
              <div>
                <div class="stat-number" style="font-size:1.25rem; font-weight:700;">${a.toLocaleString()}</div>
                <div class="stat-label" style="font-size:0.75rem; color:var(--text-secondary);">Autoridades</div>
              </div>
            </div>
            <div class="glass-card stat-card" style="padding:1rem; display:flex; align-items:center; gap:0.75rem;">
              <div class="stat-icon checkouts" style="background:rgba(179,143,77,0.08); width:2.5rem; height:2.5rem; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i class="fa-solid fa-diagram-project" style="color:var(--color-gold); font-size:1.1rem;"></i>
              </div>
              <div>
                <div class="stat-number" style="font-size:1.25rem; font-weight:700;">${o.toLocaleString()}</div>
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
              ${Object.entries(s).sort((e,t)=>t[1]-e[1]).map(([e,t])=>{let n=Na(e),r=Pa(e);return`
                  <div class="catalog-type-chip" style="background:${n.bg}; border:1px solid ${n.border}; display:flex; align-items:center; justify-content:space-between; padding:0.4rem 0.6rem; border-radius:4px;">
                    <span style="display:flex; align-items:center; gap:0.4rem; font-size:0.8rem; font-weight:600; color:${n.text};">
                      <i class="${r}" style="color:${n.text};"></i>
                      ${e}
                    </span>
                    <span class="catalog-type-count" style="font-size:0.75rem; font-weight:700; color:${n.text}; background:rgba(255,255,255,0.4); padding:0.1rem 0.4rem; border-radius:10px;">${t}</span>
                  </div>
                `}).join(``)}
            </div>
          </div>

          <!-- Advanced analysis -->
          <div class="glass-card" style="padding:1.25rem;">
            <h3 style="font-family:var(--font-display); font-size:1.1rem; font-weight:700; margin:0 0 1rem 0;">
              <i class="fa-solid fa-crown" style="color:var(--color-gold);"></i> Obras Clave (Más Conectadas)
            </h3>
            <div class="inspector-scroll-list" style="display:flex; flex-direction:column; gap:0.35rem; max-height: 350px; overflow-y:auto; padding-right:0.25rem;">
              ${t.most_connected_books&&t.most_connected_books.length>0?t.most_connected_books.slice(0,15).map(e=>`
                <a href="#/catalog/graph/${e.biblio_id}" class="inspector-book-item" style="padding:0.4rem; display:flex; align-items:center; justify-content:space-between; text-decoration:none; color:var(--text-primary); background:var(--bg-secondary); border-radius:4px; border:1px solid var(--border-light); min-width:0;">
                  <div style="display:flex; align-items:center; gap:0.45rem; min-width:0; flex:1;">
                    <i class="fa-solid fa-book" style="color:var(--color-accent); font-size:0.75rem; flex-shrink:0;"></i>
                    <span class="inspector-book-title" style="font-size:0.75rem; font-weight:600; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${e.title}</span>
                  </div>
                  <span class="similarity-badge" style="background:rgba(124, 25, 51, 0.08); color:var(--color-accent); font-weight:700; padding:0.05rem 0.35rem; border-radius:3px; font-size:0.68rem; flex-shrink:0; margin-left:0.5rem;">${e.connection_count}</span>
                </a>
              `).join(``):`<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding:1rem;">Cargando...</div>`}
            </div>
          </div>

        </div>

      </div>
    `,this.bindEvents()},renderBooksList(e){return e.length?e.map(e=>{let t=e.match_score!==void 0,n=``;if(t){let t=`#52755e`;e.match_score<80&&(t=`#b38f4d`),e.match_score<65&&(t=`#56697a`),n=`
          <div class="search-match-badge" style="background:${t}12; color:${t}; border:1px solid ${t}25; font-size:0.75rem; font-weight:700; padding:0.2rem 0.5rem; border-radius:4px; display:inline-flex; align-items:center; gap:0.25rem;" title="Similitud de búsqueda">
            <i class="fa-solid fa-chart-simple"></i> Relevancia: ${e.match_score}%
          </div>
        `}return`
        <div class="catalog-book-card" style="position:relative; overflow:hidden; padding: 1rem; border-bottom: 1px solid var(--border-light); margin-bottom: 0.75rem; background: var(--bg-primary); border-radius: 6px;">
          ${t?`<div style="position:absolute; top:0; left:0; width:3px; height:100%; background:var(--color-accent);"></div>`:``}
          <div class="catalog-book-header">
            <div class="catalog-book-info" style="min-width:0; flex:1;">
              <a href="#/catalog/graph/${e.biblio_id}" class="catalog-book-title" style="font-family:var(--font-display); font-size:1.05rem; font-weight:700; color:var(--text-primary); text-decoration:none; display:block; margin-bottom:0.25rem;">${e.title}</a>
              ${e.author?`<div class="catalog-book-author" style="font-size:0.8rem; color:var(--text-secondary);"><i class="fa-solid fa-feather"></i> ${e.author}</div>`:``}
            </div>
            <div class="catalog-book-meta-right">
              ${n}
              <div class="catalog-book-stats">
                ${e.connection_count>0?`
                  <a href="#/catalog/graph/${e.biblio_id}" class="btn btn-outline" style="font-size:0.72rem; padding:0.25rem 0.55rem; white-space:nowrap;">
                    <i class="fa-solid fa-diagram-project"></i> ${e.connection_count} conexiones
                  </a>
                `:`
                  <span style="font-size:0.72rem; color:var(--text-muted);">Sin conexiones</span>
                `}
              </div>
            </div>
          </div>
          
          ${e.match_explanation?`
            <div class="search-match-explanation">
              <i class="fa-solid fa-magnifying-glass-chart" style="color:var(--color-accent); font-size:0.85rem;"></i>
              <span><strong>Motivo del ranking:</strong> ${e.match_explanation}</span>
            </div>
          `:``}

          <div class="catalog-auth-list" style="margin-top:0.75rem; display:flex; flex-wrap:wrap; gap:0.35rem;">
            ${e.authorities.map(e=>Fa(e)).join(``)}
          </div>
        </div>
      `}).join(``):`
        <div style="text-align:center; padding:3rem 2rem; color:var(--text-secondary);">
          <i class="fa-solid fa-book-open" style="font-size:2.5rem; color:var(--text-muted); margin-bottom:1rem;"></i>
          <p style="font-size:1.05rem; font-weight:500;">No se encontraron obras con los términos especificados.</p>
          <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.25rem;">Intenta buscar por palabras clave o revisa la ortografía.</p>
        </div>
      `},bindEvents(){let e=document.getElementById(`catalog-search`),t=document.getElementById(`catalog-books-list`),n;e&&(e.addEventListener(`focus`,()=>{e.style.borderColor=`var(--color-accent)`,e.style.boxShadow=`0 4px 20px rgba(124, 25, 51, 0.08)`}),e.addEventListener(`blur`,()=>{e.style.borderColor=`var(--border-light)`,e.style.boxShadow=`0 4px 20px rgba(0, 0, 0, 0.02)`}),e.addEventListener(`input`,()=>{clearTimeout(n),n=setTimeout(async()=>{let n=e.value.trim();t.innerHTML=`<div style="text-align:center; padding:2rem;"><i class="fa fa-spinner fa-spin fa-2x" style="color:var(--color-accent)"></i></div>`;try{let e=await r.getCatalogBooks(n,100);t.innerHTML=this.renderBooksList(e)}catch(e){t.innerHTML=`<div style="text-align:center; padding:2rem; color:var(--color-accent);">Error al buscar: ${e.message}</div>`}},350)}))}},La={Autor:`#7c1933`,Tema:`#52755e`,"Tema (Persona)":`#52755e`,"Tema (Institución)":`#52755e`,Lugar:`#56697a`,"Institución / Organización":`#b38f4d`,"Título Uniforme":`#805a96`},Ra={Autor:`fa-solid fa-feather`,Tema:`fa-solid fa-tags`,"Tema (Persona)":`fa-solid fa-user-tag`,"Tema (Institución)":`fa-solid fa-building-flag`,Lugar:`fa-solid fa-map-pin`,"Institución / Organización":`fa-solid fa-building`,"Título Uniforme":`fa-solid fa-bookmark`};function za(e){return e.type===`target_book`?`#7c1933`:e.type===`connected_book`?`#56697a`:e.type===`authority`&&La[e.authority_type]||`#888`}function Ba(e){return e.type===`target_book`?18:e.type===`authority`?Math.min(8+(e.book_count||1)*1.5,16):e.type===`connected_book`?10:8}var Va=[i,a,o,Aa,Ia,{path:`/catalog/graph/:id`,navKey:`catalog`,async render(e,t){let n=t.id,[i,a]=await Promise.all([r.getCatalogBook(n),r.getCatalogGraph(n,15)]);e.innerHTML=`
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
          ${i.title}
        </h2>
        ${i.author?`<p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:0.75rem;"><i class="fa-solid fa-feather"></i> ${i.author}</p>`:``}
        <p style="color:var(--text-muted); font-size:0.82rem;">
          <i class="fa-solid fa-diagram-project"></i> ${i.total_connections} conexiones con otros libros
          &bull; ${i.authorities.length} autoridades vinculadas
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
    `,this.renderGraph(a,i)},renderGraph(e,t){let n=document.getElementById(`catalog-graph`),i=document.getElementById(`catalog-tooltip`),a=document.getElementById(`catalog-side-panel`);if(!n||!e.nodes.length)return;let o=n.clientWidth,s=E(n).append(`svg`).attr(`width`,o).attr(`height`,680).attr(`viewBox`,[0,0,o,680]),c=ha(e.nodes).force(`link`,oa(e.links).id(e=>e.id).distance(80)).force(`charge`,ga().strength(-200)).force(`center`,Pi(o/2,680/2)).force(`collision`,ra().radius(e=>Ba(e)+5)),l=s.append(`g`).selectAll(`line`).data(e.links).join(`line`).attr(`stroke`,e=>La[e.authority_type]||`#ccc`).attr(`stroke-opacity`,.35).attr(`stroke-width`,1.5),u=s.append(`g`).selectAll(`circle`).data(e.nodes).join(`circle`).attr(`r`,e=>Ba(e)).attr(`fill`,e=>za(e)).attr(`class`,`node`).attr(`stroke`,`#fff`).attr(`stroke-width`,e=>e.type===`target_book`?3:1.5).call(Xt().on(`start`,f).on(`drag`,p).on(`end`,m)),d=s.append(`g`).selectAll(`text`).data(e.nodes).join(`text`).text(e=>{let t=e.type===`authority`?18:22;return e.name.length>t?e.name.substring(0,t)+`…`:e.name}).attr(`text-anchor`,`middle`).attr(`dy`,e=>Ba(e)+14).style(`font-size`,e=>e.type===`target_book`?`12px`:`10px`).style(`font-weight`,e=>e.type===`target_book`?`700`:`500`).style(`fill`,`var(--text-primary)`).style(`pointer-events`,`none`);u.on(`mouseover`,function(e,t){i.style.display=`block`,l.style(`stroke-opacity`,e=>e.source.id===t.id||e.target.id===t.id?.9:.1),l.style(`stroke-width`,e=>e.source.id===t.id||e.target.id===t.id?3:1);let r=``;t.type===`target_book`?r=`<strong>Libro Consultado:</strong><br>${t.name}`:t.type===`connected_book`?r=`<strong>Libro Conectado:</strong><br>${t.name}<br>Peso: ${t.weight} autoridades compartidas`:t.type===`authority`&&(r=`<strong>${t.authority_type}:</strong><br>${t.name}<br>Vinculado a ${t.book_count} libros`),i.innerHTML=r;let a=n.getBoundingClientRect();i.style.left=`${e.clientX-a.left+15}px`,i.style.top=`${e.clientY-a.top+15}px`}),u.on(`mousemove`,function(e){let t=n.getBoundingClientRect();i.style.left=`${e.clientX-t.left+15}px`,i.style.top=`${e.clientY-t.top+15}px`}),u.on(`mouseout`,function(){l.style(`stroke-opacity`,.35),l.style(`stroke-width`,1.5),i.style.display=`none`}),u.on(`click`,async(e,t)=>{a.innerHTML=`<div class="glass-card" style="text-align:center; padding:3rem;"><i class="fa fa-spinner fa-spin fa-2x" style="color:var(--color-accent)"></i></div>`;try{if(t.type===`target_book`||t.type===`connected_book`){let e=t.id.replace(`book_`,``),n=await r.getCatalogBook(e);a.innerHTML=`
            <div class="glass-card">
              <h4 style="font-family:var(--font-display); font-size:1.15rem; font-weight:700; margin-bottom:0.35rem; line-height:1.2;">${n.title}</h4>
              ${n.author?`<p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:1rem;"><i class="fa-solid fa-feather"></i> ${n.author}</p>`:``}

              <h5 style="font-size:0.82rem; font-weight:700; margin-bottom:0.5rem;">
                <i class="fa-solid fa-tags" style="color:var(--color-collab);"></i> Autoridades (${n.authorities.length})
              </h5>
              <div style="display:flex; flex-wrap:wrap; gap:0.35rem; margin-bottom:1.25rem;">
                ${n.authorities.map(e=>{let t=La[e.type]||`#888`;return`<span class="catalog-auth-badge" style="background:${t}15; border-color:${t}40; color:${t};"><i class="${Ra[e.type]||`fa-solid fa-tag`}"></i> ${e.name}</span>`}).join(``)}
              </div>

              ${n.connected_books.length>0?`
                <h5 style="font-size:0.82rem; font-weight:700; margin-bottom:0.5rem;">
                  <i class="fa-solid fa-diagram-project" style="color:var(--color-gold);"></i> Libros Conectados (${n.total_connections})
                </h5>
                <div class="inspector-scroll-list">
                  ${n.connected_books.slice(0,10).map(e=>`
                    <a href="#/catalog/graph/${e.biblio_id}" class="inspector-book-item">
                      <i class="fa-regular fa-book"></i>
                      <span class="inspector-book-title">${e.title}</span>
                      <span class="similarity-badge">${e.weight}</span>
                    </a>
                  `).join(``)}
                </div>
              `:``}

              ${t.type===`connected_book`?`
                <a href="#/catalog/graph/${e}" class="btn btn-primary" style="width:100%; justify-content:center; margin-top:1rem; font-size:0.8rem;">
                  Ver Grafo de Este Libro
                </a>
              `:``}
            </div>
          `}else if(t.type===`authority`){let e=t.id.replace(`auth_`,``),n=await r.getCatalogAuthority(e),i=La[t.authority_type]||`#888`,o=Ra[t.authority_type]||`fa-solid fa-tag`;a.innerHTML=`
            <div class="glass-card">
              <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.75rem;">
                <span style="width:2rem; height:2rem; border-radius:50%; background:${i}; display:flex; align-items:center; justify-content:center;">
                  <i class="${o}" style="color:#fff; font-size:0.85rem;"></i>
                </span>
                <div>
                  <h4 style="font-family:var(--font-display); font-size:1.1rem; font-weight:700; margin:0; line-height:1.2;">${n.name}</h4>
                  <span style="font-size:0.75rem; color:${i}; font-weight:600;">${n.type}</span>
                </div>
              </div>

              <h5 style="font-size:0.82rem; font-weight:700; margin-bottom:0.5rem;">
                <i class="fa-solid fa-book" style="color:var(--color-accent);"></i> Libros Vinculados (${n.book_count})
              </h5>
              <div class="inspector-scroll-list">
                ${n.books.map(e=>`
                  <a href="#/catalog/graph/${e.biblio_id}" class="inspector-book-item">
                    <i class="fa-regular fa-book"></i>
                    <span class="inspector-book-title">${e.title}</span>
                  </a>
                `).join(``)}
              </div>
            </div>
          `}}catch(e){a.innerHTML=`<div class="glass-card" style="text-align:center; padding:2rem; color:var(--color-accent);">Error: ${e.message}</div>`}}),c.on(`tick`,()=>{l.attr(`x1`,e=>e.source.x).attr(`y1`,e=>e.source.y).attr(`x2`,e=>e.target.x).attr(`y2`,e=>e.target.y),u.attr(`cx`,e=>e.x).attr(`cy`,e=>e.y),d.attr(`x`,e=>e.x).attr(`y`,e=>e.y)});function f(e,t){e.active||c.alphaTarget(.3).restart(),t.fx=t.x,t.fy=t.y}function p(e,t){t.fx=e.x,t.fy=e.y}function m(e,t){e.active||c.alphaTarget(0),t.fx=null,t.fy=null}}}];document.addEventListener(`DOMContentLoaded`,()=>{new e(Va,`app`).init()});