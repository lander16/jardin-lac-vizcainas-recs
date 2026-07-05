export class Router {
  constructor(routes, containerId = 'app') {
    this.routes = routes;
    this.container = document.getElementById(containerId);
    
    // Bind hash change listener
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  init() {
    this.handleRoute();
  }

  navigate(hash) {
    window.location.hash = hash;
  }

  handleRoute() {
    const hash = window.location.hash || '#/';
    
    // Render standard layout wrapper (header, main container, footer)
    this.renderLayout();
    
    const mainContainer = document.getElementById('router-view');
    if (!mainContainer) return;
    
    // Find matching route
    let matchedRoute = null;
    let params = {};
    
    for (const route of this.routes) {
      const routePath = route.path;
      
      // Convert path like '/user/:id' to regex
      const regexPath = routePath.replace(/:[a-zA-Z0-9]+/g, '([^/]+)');
      const match = hash.match(new RegExp(`^#${regexPath}$`));
      
      if (match) {
        matchedRoute = route;
        
        // Extract parameter keys (e.g., 'id')
        const paramNames = (routePath.match(/:[a-zA-Z0-9]+/g) || []).map(p => p.slice(1));
        params = paramNames.reduce((acc, name, idx) => {
          acc[name] = match[idx + 1];
          return acc;
        }, {});
        
        break;
      }
    }
    
    if (matchedRoute) {
      // Highlight active nav item
      this.updateActiveNav(matchedRoute.navKey);
      
      // Run matching page component
      mainContainer.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:200px;"><i class="fa fa-spinner fa-spin fa-2x" style="color:var(--color-accent)"></i></div>';
      
      matchedRoute.render(mainContainer, params)
        .catch(err => {
          mainContainer.innerHTML = `
            <div class="glass-card" style="text-align:center;padding:3rem;margin-top:2rem;">
              <i class="fa-solid fa-triangle-exclamation" style="font-size:3rem;color:var(--color-accent);margin-bottom:1rem;"></i>
              <h2 style="font-family:var(--font-display);font-weight:700;margin-bottom:0.5rem;">Error de Conexión</h2>
              <p style="color:var(--text-secondary);margin-bottom:1.5rem;">No se pudo conectar con el servidor de recomendaciones. Por favor, asegúrese de que la API esté ejecutándose en el puerto 8000.</p>
              <button class="btn btn-primary" onclick="window.location.reload()">Reintentar <i class="fa-solid fa-rotate-right"></i></button>
            </div>
          `;
          console.error(err);
        });
    } else {
      mainContainer.innerHTML = `
        <div class="glass-card" style="text-align:center;padding:3rem;margin-top:2rem;">
          <i class="fa-solid fa-compass" style="font-size:3rem;color:var(--color-accent);margin-bottom:1rem;"></i>
          <h2 style="font-family:var(--font-display);font-weight:700;margin-bottom:0.5rem;">Página no encontrada</h2>
          <p style="color:var(--text-secondary);margin-bottom:1.5rem;">La ruta que está intentando acceder no existe.</p>
          <a href="#/" class="btn btn-primary">Ir al Inicio</a>
        </div>
      `;
    }
  }

  renderLayout() {
    // If layout is already rendered, don't overwrite it
    if (document.getElementById('router-view')) return;
    
    this.container.innerHTML = `
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
    `;
  }

  updateActiveNav(activeKey) {
    // Reset all nav links
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    
    // Set active
    const activeLink = document.getElementById(`nav-${activeKey}`);
    if (activeLink) {
      activeLink.classList.add('active');
    }
  }
}
