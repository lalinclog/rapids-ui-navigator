
import axios from 'axios';
import { KeycloakTokenResponse, KeycloakUserInfo } from '@/lib/types';

class AuthService {
  async login(username: string, password: string): Promise<KeycloakTokenResponse> {
    // Create proper form data object for Keycloak
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    formData.append('grant_type', 'password');
    
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
    }
    
    return response.data;
  }

  async getUserInfo(token: string): Promise<KeycloakUserInfo> {
    const response = await axios.get<KeycloakUserInfo>('/api/auth/user', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<KeycloakTokenResponse> {
    const formData = new URLSearchParams();
    formData.append('refresh_token', refreshToken);
    formData.append('grant_type', 'refresh_token');
    
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
    }
    
    return response.data;
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
