import { api } from '../utils/api.js';

export const DashboardPage = {
  path: '/',
  navKey: 'dashboard',
  async render(container) {
    // Fetch stats and users list in parallel
    const [stats, users] = await Promise.all([
      api.getStats(),
      api.getUsers()
    ]);
    
    container.innerHTML = `
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
            <p>${stats.total_users}</p>
          </div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-icon books">
            <i class="fa-solid fa-book"></i>
          </div>
          <div class="stat-info">
            <h3>Títulos Únicos</h3>
            <p>${stats.total_books}</p>
          </div>
        </div>
        <div class="glass-card stat-card">
          <div class="stat-icon checkouts">
            <i class="fa-solid fa-book-open-reader"></i>
          </div>
          <div class="stat-info">
            <h3>Préstamos Totales</h3>
            <p>${stats.total_checkouts}</p>
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
                ${this.renderUsersRows(users)}
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
              ${stats.popular_books.map((book, idx) => `
                <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-primary); padding:0.6rem 0.8rem; border-radius:0.25rem; border:1px solid var(--border-light)">
                  <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:200px; font-size:0.88rem; font-weight:500;">
                    <span style="color:var(--text-muted); margin-right:0.4rem; font-family:var(--font-display); font-weight:700;">#${idx+1}</span>
                    <a href="#/book/${book.book_id}" style="color:var(--text-primary); text-decoration:none; font-family:var(--font-sans);" onmouseover="this.style.color='var(--color-accent)'" onmouseout="this.style.color='var(--text-primary)'">${book.title}</a>
                  </div>
                  <span class="source-badge collaborative" style="font-size:0.68rem; padding:0.15rem 0.4rem;">
                    <i class="fa-solid fa-check"></i> ${book.checkout_count} lecturas
                  </span>
                </div>
              `).join('')}
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
    `;

    // Bind event listeners
    this.bindEvents(users);
  },

  renderUsersRows(users) {
    if (users.length === 0) {
      return `<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:2rem;">No se encontraron lectores.</td></tr>`;
    }
    
    return users.map(user => `
      <tr>
        <td>
          <a href="#/user/${user.user_id}" style="color:var(--text-primary); font-weight:600; text-decoration:none;">${user.name}</a>
        </td>
        <td style="font-family:monospace; color:var(--text-secondary);">${user.cardnumber}</td>
        <td style="color:var(--text-secondary);">${user.email}</td>
        <td style="text-align:center; font-weight:600; font-family:var(--font-display); font-size:1.1rem;">${user.checkout_count}</td>
        <td style="text-align:right;">
          <div style="display:inline-flex; gap:0.5rem;">
            <a href="#/user/${user.user_id}" class="btn btn-primary" style="padding:0.35rem 0.75rem; font-size:0.8rem;">
              Recomendar
            </a>
            <a href="#/graph/${user.user_id}" class="btn btn-secondary" style="padding:0.35rem 0.75rem; font-size:0.8rem;">
              Grafo
            </a>
          </div>
        </td>
      </tr>
    `).join('');
  },

  bindEvents(users) {
    const searchInput = document.getElementById('user-search');
    const tableBody = document.getElementById('users-table-body');
    const resetBtn = document.getElementById('btn-reset-checkouts');

    if (searchInput && tableBody) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        const filtered = users.filter(user => 
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.cardnumber.includes(query)
        );
        
        tableBody.innerHTML = this.renderUsersRows(filtered);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        if (confirm("¿Está seguro de que desea restablecer todos los préstamos agregados de vuelta a los datos base del CSV? Se perderán las simulaciones registradas.")) {
          try {
            resetBtn.disabled = true;
            resetBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Restableciendo...';
            await api.resetCheckouts();
            alert("¡Préstamos restablecidos con éxito!");
            window.location.reload();
          } catch (err) {
            alert(`Error al restablecer: ${err.message}`);
            resetBtn.disabled = false;
            resetBtn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Restablecer Préstamos';
          }
        }
      });
    }
  }
};
