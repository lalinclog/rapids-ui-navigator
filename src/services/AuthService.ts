
import axios from 'axios';
import { KeycloakTokenResponse, KeycloakUserInfo } from '@/lib/types';

class AuthService {
    // Add refresh token request tracking for debouncing multiple refresh attempts
    private refreshPromise: Promise<KeycloakTokenResponse> | null = null;
    private tokenExpiryTime: number | null = null;
    private refreshErrorCount = 0;
    private readonly MAX_REFRESH_ERRORS = 3;
    
    // Configure axios interceptors
    constructor() {
      // Add request interceptor to handle token refreshes
      axios.interceptors.request.use(async (config) => {
        // Only add token to API requests, not auth endpoints
        if (config.url && !config.url.includes('/auth/')) {
          const token = await this.getValidToken();
          if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
          }
        }
        return config;
      }, (error) => {
        return Promise.reject(error);
      });
      
      // Add response interceptor to handle 401 errors
      axios.interceptors.response.use(
        (response) => response,
        async (error) => {
          const originalRequest = error.config;
          
          // Handle token expiration
          if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
              // Force token refresh
              const token = await this.getValidToken(true);
              if (token) {
                originalRequest.headers['Authorization'] = `Bearer ${token}`;
                return axios(originalRequest);
              }
            } catch (refreshError) {
              // If refresh fails, redirect to login
              localStorage.removeItem('token');
              localStorage.removeItem('refreshToken');
              window.location.href = '/login';
            }
          }
          
          return Promise.reject(error);
        }
      );
    }
  
  async login(username: string, password: string): Promise<KeycloakTokenResponse> {
    // Create proper form data object for Keycloak
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    formData.append('grant_type', 'password');

    try {
      const response = await axios.post<KeycloakTokenResponse>('/api/auth/login', formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      });
    
    // Store tokens in local storage
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      
      if (response.data.refresh_token) {
        localStorage.setItem('refreshToken', response.data.refresh_token);
      }

      // Set token expiry time (subtract 30 seconds for safety margin)
      this.tokenExpiryTime = Date.now() + (response.data.expires_in - 30) * 1000;
    }
    
    return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async getUserInfo(token: string): Promise<KeycloakUserInfo> {
    try {
      const response = await axios.get<KeycloakUserInfo>('/api/auth/user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting user info:', error);
      throw error;
    }
  }

  async getValidToken(forceRefresh = false): Promise<string | null> {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    
    // If no tokens exist, can't proceed
    if (!token || !refreshToken) {
      return null;
    }
    
    // Check if token is expired or about to expire
    const shouldRefresh = forceRefresh || 
      !this.tokenExpiryTime || 
      Date.now() >= this.tokenExpiryTime;
      
    if (shouldRefresh) {
      try {
        // If there's already a refresh in progress, wait for it
        if (this.refreshPromise) {
          const result = await this.refreshPromise;
          return result.access_token;
        }
        
        // Start a new refresh
        this.refreshPromise = this.refreshToken(refreshToken);
        const result = await this.refreshPromise;
        
        if (result.error) {
          // Handle refresh error
          this.refreshErrorCount++;
          if (this.refreshErrorCount >= this.MAX_REFRESH_ERRORS) {
            // Too many errors, clear tokens and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
          }
          return token; // Return old token as fallback
        } else {
          // Reset error count on successful refresh
          this.refreshErrorCount = 0;
          return result.access_token;
        }
      } finally {
        this.refreshPromise = null;
      }
    }
    
    return token;
  }

  async refreshToken(refreshToken: string): Promise<KeycloakTokenResponse> {
    const formData = new URLSearchParams();
    formData.append('refresh_token', refreshToken);
    formData.append('grant_type', 'refresh_token');
    
    try {
      const response = await axios.post<KeycloakTokenResponse>('/api/auth/refresh', formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      });
      
      // Update tokens in local storage
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        
        if (response.data.refresh_token) {
          localStorage.setItem('refreshToken', response.data.refresh_token);
        }
        
        // Update expiry time (subtract 30 seconds for safety margin)
        this.tokenExpiryTime = Date.now() + (response.data.expires_in - 30) * 1000;
      }
      
      return response.data;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return { error: 'refresh_failed', error_description: 'Failed to refresh token' } as KeycloakTokenResponse;
    }
  }

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');
    
    const formData = new URLSearchParams();
    if (refreshToken) {
      formData.append('refresh_token', refreshToken);
    }
    
    try {
      await axios.post('/api/auth/logout', formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      });
    } finally {
      // Always clear local storage, even if the API call fails
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      this.tokenExpiryTime = null;
    }
  }

  // Method to create a new user through Keycloak admin API
  async createUser(userData: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<boolean> {
    try {
      const response = await axios.post('/api/auth/users', userData);
      return response.data.success === true;
    } catch (error) {
      console.error('Error creating user:', error);
      return false;
    }
  }
}

export default new AuthService();