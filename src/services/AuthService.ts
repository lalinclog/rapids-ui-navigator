
import axios from 'axios';
import { KeycloakTokenResponse, KeycloakUserInfo } from '@/lib/types';

class AuthService {
  async login(username: string, password: string): Promise<KeycloakTokenResponse> {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await axios.post<KeycloakTokenResponse>('/api/auth/login', formData);
    return response.data;
  }

  async getUserInfo(token: string): Promise<KeycloakUserInfo> {
    const response = await axios.get<KeycloakUserInfo>('/api/auth/user', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }

  async logout(): Promise<void> {
    await axios.post('/api/auth/logout');
  }
}

export default new AuthService();
