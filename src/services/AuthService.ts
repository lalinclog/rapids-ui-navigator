
import axios from 'axios';
import { KeycloakTokenResponse, KeycloakUserInfo } from '@/lib/types';

class AuthService {
  async login(username: string, password: string): Promise<KeycloakTokenResponse> {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await axios.post<KeycloakTokenResponse>('/api/auth/login', formData);
    
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
    const formData = new FormData();
    formData.append('refresh_token', refreshToken);
    
    const response = await axios.post<KeycloakTokenResponse>('/api/auth/refresh', formData);
    
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
    
    const formData = new FormData();
    if (refreshToken) {
      formData.append('refresh_token', refreshToken);
    }
    
    try {
      await axios.post('/api/auth/logout', formData);
    } finally {
      // Always clear local storage, even if the API call fails
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  }
}

export default new AuthService();
