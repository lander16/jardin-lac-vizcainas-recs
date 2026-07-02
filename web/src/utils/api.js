const API_BASE_URL = window.location.origin.includes(':5173') 
  ? 'http://127.0.0.1:8000/api' 
  : '/api';

async function fetchAPI(endpoint, options = {}) {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  getUsers: () => fetchAPI('/users'),
  
  getUserDetail: (userId) => fetchAPI(`/users/${userId}`),
  
  getRecommendations: (userId, alpha = 0.5) => 
    fetchAPI(`/users/${userId}/recommendations?alpha=${alpha}`),
    
  checkoutBook: (userId, bookId, title = '', description = '') => 
    fetchAPI(`/users/${userId}/checkout`, {
      method: 'POST',
      body: JSON.stringify({ book_id: bookId, title, description }),
    }),
    
  getBookDetail: (bookId) => fetchAPI(`/books/${bookId}`),
  
  searchBooks: (query) => fetchAPI(`/books?q=${encodeURIComponent(query)}`),
  
  getGraphData: (userId, limit = 15) => fetchAPI(`/graph/${userId}?limit=${limit}`),
  
  getStats: () => fetchAPI('/stats'),
  
  resetCheckouts: () => fetchAPI('/reset', { method: 'POST' }),
};
