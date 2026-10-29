class APIClient {
  constructor() {
    this.baseURL = '/api';
    this.token = localStorage.getItem('adminToken');
  }

  /**
   * Set token and update localStorage
   */
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('adminToken', token);
    } else {
      localStorage.removeItem('adminToken');
    }
  }

  /**
   * Get authorization header
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Handle API errors and redirects
   */
  async handleResponse(response) {
    const data = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
      // Unauthorized or forbidden - redirect to login
      localStorage.removeItem('adminToken');
      this.token = null;
      window.location.href = '/index.html';
      return null;
    }

    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}`);
    }

    return data;
  }

  /**
   * Login with email and password
   */
  async login(email, password) {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ email, password }),
      });

      const data = await this.handleResponse(response);
      if (!data) return null;

      if (data.success && data.data.token) {
        this.setToken(data.data.token);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get pending riders
   */
  async getPendingRiders() {
    try {
      const response = await fetch(`${this.baseURL}/admin/riders/pending`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get specific rider details
   */
  async getRiderDetails(riderId) {
    try {
      const response = await fetch(`${this.baseURL}/admin/riders/${riderId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Approve a rider
   */
  async approveRider(riderId) {
    try {
      const response = await fetch(`${this.baseURL}/admin/riders/${riderId}/approve`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({}),
      });

      return await this.handleResponse(response);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reject a rider with reason
   */
  async rejectRider(riderId, reason) {
    try {
      const response = await fetch(`${this.baseURL}/admin/riders/${riderId}/reject`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ reason }),
      });

      return await this.handleResponse(response);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get dashboard statistics
   */
  async getStats() {
    try {
      const response = await fetch(`${this.baseURL}/admin/stats`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(limit = 50, offset = 0) {
    try {
      const response = await fetch(`${this.baseURL}/admin/audit?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      throw error;
    }
  }
}

const apiClient = new APIClient();
