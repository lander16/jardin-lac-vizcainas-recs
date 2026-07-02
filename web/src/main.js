import './style.css';
import { Router } from './router.js';
import { DashboardPage } from './pages/dashboard.js';
import { UserRecommendationsPage } from './pages/user-recommendations.js';
import { BookExplorerPage } from './pages/book-explorer.js';
import { UserGraphPage } from './pages/user-graph.js';

// Setup routes
const routes = [
  DashboardPage,
  UserRecommendationsPage,
  BookExplorerPage,
  UserGraphPage
];

// Initialize and start client-side router
document.addEventListener('DOMContentLoaded', () => {
  const router = new Router(routes, 'app');
  router.init();
});
