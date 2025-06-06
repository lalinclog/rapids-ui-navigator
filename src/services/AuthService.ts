
import axios from 'axios';
import { KeycloakTokenResponse, KeycloakUserInfo } from '@/lib/types';

class AuthService {
    private refreshPromise: Promise<KeycloakTokenResponse> | null = null;
    private tokenExpiryTime: number | null = null;
    private refreshErrorCount = 0;
    private readonly MAX_REFRESH_ERRORS = 3;
    private isRefreshing = false;
    
    constructor() {
      this.setupInterceptors();
    }

    private setupInterceptors() {
      // Add request interceptor to handle token refreshes
      axios.interceptors.request.use(async (config) => {
        // Skip auth for login/refresh endpoints
        if (config.url && (config.url.includes('/auth/login') || config.url.includes('/auth/refresh'))) {
          return config;
        }
        
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
          if (error.response?.status === 401 && !originalRequest._retry && !this.isRefreshing) {
            originalRequest._retry = true;
            
            try {
              // Force token refresh
              const token = await this.getValidToken(true);
              if (token) {
                originalRequest.headers['Authorization'] = `Bearer ${token}`;
                return axios(originalRequest);
              }
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
              this.clearTokens();
              // Only redirect if we're not already on login page
              if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
              }
            }
          }
          
          return Promise.reject(error);
        }
      );
    }

    private clearTokens() {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      this.tokenExpiryTime = null;
      this.refreshPromise = null;
      this.refreshErrorCount = 0;
    }
  
    async login(username: string, password: string): Promise<KeycloakTokenResponse> {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      formData.append('grant_type', 'password');

      try {
        console.log('Attempting login for user:', username);
        const response = await axios.post<KeycloakTokenResponse>('/api/auth/login', formData.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        });

        console.log('Login response received:', response.status);
    
        // Store tokens in local storage
        if (response.data.access_token) {
          localStorage.setItem('token', response.data.access_token);
          console.log('Access token stored');
          
          if (response.data.refresh_token) {
            localStorage.setItem('refreshToken', response.data.refresh_token);
            console.log('Refresh token stored');
          }

          // Set token expiry time (subtract 30 seconds for safety margin)
          this.tokenExpiryTime = Date.now() + (response.data.expires_in - 30) * 1000;
          console.log('Token expiry set for:', new Date(this.tokenExpiryTime));
        }
        
        return response.data;
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    }

    async getUserInfo(token: string): Promise<KeycloakUserInfo> {
      try {
        console.log('Fetching user info');
        const response = await axios.get<KeycloakUserInfo>('/api/auth/user', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('User info retrieved successfully');
        return response.data;
      } catch (error) {
        console.error('Error getting user info:', error);
        throw error;
      }
    }

    async getValidToken(forceRefresh = false): Promise<string | null> {
      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');
      
      console.log('Getting valid token - tokens present:', { token: !!token, refreshToken: !!refreshToken });
      
      // If no tokens exist, can't proceed
      if (!token || !refreshToken) {
        console.warn('No tokens available');
        return null;
      }
      
      // Check if token is expired or about to expire
      const shouldRefresh = forceRefresh || 
        !this.tokenExpiryTime || 
        Date.now() >= this.tokenExpiryTime;
        
      console.log('Should refresh token:', shouldRefresh);
        
      if (shouldRefresh && !this.isRefreshing) {
        try {
          this.isRefreshing = true;
          
          // If there's already a refresh in progress, wait for it
          if (this.refreshPromise) {
            const result = await this.refreshPromise;
            return result.access_token;
          }
          
          // Start a new refresh
          console.log('Starting token refresh');
          this.refreshPromise = this.refreshToken(refreshToken);
          const result = await this.refreshPromise;
          
          if (result.error) {
            console.error('Token refresh error:', result.error);
            this.refreshErrorCount++;
            if (this.refreshErrorCount >= this.MAX_REFRESH_ERRORS) {
              console.error('Too many refresh errors, clearing tokens');
              this.clearTokens();
              window.location.href = '/login';
            }
            return token; // Return old token as fallback
          } else {
            console.log('Token refresh successful');
            this.refreshErrorCount = 0;
            return result.access_token;
          }
        } finally {
          this.isRefreshing = false;
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
        console.log('Sending refresh token request');
        const response = await axios.post<KeycloakTokenResponse>('/api/auth/refresh', formData.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        });
        
        console.log('Refresh token response received');
        
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
        console.log('Sending logout request');
        await axios.post('/api/auth/logout', formData.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        });
      } catch (error) {
        console.error('Error during logout:', error);
      } finally {
        this.clearTokens();
      }
    }

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
