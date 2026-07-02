import { api } from '../utils/api.js';

export const BookExplorerPage = {
  path: '/book/:id',
  navKey: 'dashboard',
  async render(container, params) {
    const bookId = params.id;
    
    // Fetch book details
    const book = await api.getBookDetail(bookId);
    
    if (!book) {
      container.innerHTML = `
        <div class="glass-card" style="text-align:center;padding:3rem;margin-top:2rem;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size:3rem;color:var(--color-accent);margin-bottom:1rem;"></i>
          <h2 style="font-family:var(--font-display);font-weight:700;margin-bottom:0.5rem;">Libro No Encontrado</h2>
          <p style="color:var(--text-secondary);margin-bottom:1.5rem;">No pudimos recuperar la información del libro con ID: ${bookId}</p>
          <a href="#/" class="btn btn-primary">Volver al Inicio</a>
        </div>
      `;
      return;
    }

    container.innerHTML = `
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
                <i class="fa-solid fa-book"></i> Código de la Obra: ${book.book_id}
              </span>
              <h1 style="font-family:var(--font-display); font-size:2.25rem; font-weight:700; line-height:1.2; margin-top:0.25rem;">
                ${book.title}
              </h1>
            </div>
          </div>
          
          <div style="margin-bottom:2rem;">
            <h3 style="font-family:var(--font-display); font-weight:700; font-size:1.25rem; margin-bottom:0.75rem; color:var(--text-primary); border-bottom:1px solid var(--border-light); padding-bottom:0.4rem;">
              Sinopsis / Descripción
            </h3>
            <p style="color:var(--text-secondary); font-size:0.95rem; line-height:1.6; white-space:pre-line;">
              ${book.description || 'No hay descripción disponible para esta obra en la base de datos.'}
            </p>
          </div>

          <!-- Checkout History -->
          <div>
            <h3 style="font-family:var(--font-display); font-weight:700; font-size:1.25rem; margin-bottom:0.75rem; color:var(--text-primary); border-bottom:1px solid var(--border-light); padding-bottom:0.4rem;">
              Historial de Lectores (${book.checked_by.length} lectores)
            </h3>
            ${book.checked_by.length === 0 ? `
              <p style="color:var(--text-muted); font-style:italic; font-size:0.9rem;">Esta obra no ha sido solicitada por ningún lector todavía.</p>
            ` : `
              <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
                ${book.checked_by.map(patron => `
                  <a href="#/user/${patron.user_id}" class="btn btn-secondary" style="font-size:0.8rem; padding:0.3rem 0.6rem; text-decoration:none;">
                    <i class="fa-regular fa-user"></i> ${patron.name}
                  </a>
                `).join('')}
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
            ${book.similar_books.length === 0 ? `
              <div style="text-align:center; padding:2rem; color:var(--text-secondary); font-style:italic;">No se encontraron obras similares. Intente ejecutar el pipeline de procesamiento semanal.</div>
            ` : book.similar_books.map((sim, idx) => {
              const pct = Math.round(sim.similarity * 100);
              return `
                <div style="display:flex; flex-direction:column; background:var(--bg-primary); padding:0.75rem; border-radius:0.25rem; border:1px solid var(--border-light)">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem; gap:0.5rem;">
                    <a href="#/book/${sim.book_id}" style="color:var(--text-primary); font-weight:600; font-size:0.88rem; text-decoration:none; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;" title="${sim.title}">
                      ${sim.title}
                    </a>
                    <span class="similarity-badge">${pct}% afinidad</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:0.5rem;">
                    <div class="score-track" style="height:4px; flex:1; background:#e3dbcf;">
                      <div class="score-fill content" style="width: ${pct}%"></div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }
};
