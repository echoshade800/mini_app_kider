const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080';

class ApiClient {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Health check
  async checkHealth() {
    return this.request('/api/health');
  }

  // User sync
  async syncUser(userData) {
    return this.request('/api/user/sync', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Get level info
  async getLevel(level) {
    return this.request(`/api/levels/${level}`);
  }

  // Get board for level
  async getLevelBoard(level) {
    return this.request(`/api/board/level/${level}`);
  }

  // Get challenge board
  async getChallengeBoard() {
    return this.request('/api/board/challenge');
  }

  // Settle progress
  async settleProgress(uid, level, changeItemsDelta) {
    return this.request('/api/progress/settle', {
      method: 'POST',
      body: JSON.stringify({ uid, level, changeItemsDelta }),
    });
  }

  // Settle challenge
  async settleChallenge(uid, iq) {
    return this.request('/api/challenge/settle', {
      method: 'POST',
      body: JSON.stringify({ uid, iq }),
    });
  }

  // Use item
  async useItem(uid, type) {
    return this.request('/api/items/use', {
      method: 'POST',
      body: JSON.stringify({ uid, type }),
    });
  }
}

export const apiClient = new ApiClient();