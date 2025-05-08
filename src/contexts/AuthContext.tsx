
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthState, KeycloakUserInfo } from '@/lib/types';
import axios from 'axios';

interface AuthContextType {
  authState: AuthState;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  authState: { isAuthenticated: false },
  login: async () => false,
  logout: async () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if the user is already authenticated
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get('/api/auth/user', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setAuthState({
            isAuthenticated: true,
            token,
            refreshToken: localStorage.getItem('refreshToken'),
            user: response.data as KeycloakUserInfo,
          });
        } catch (error) {
          // Token is invalid, clear localStorage
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await axios.post('/api/auth/login', { username, password });
      const { access_token, refresh_token } = response.data;
      
      // Store tokens
      localStorage.setItem('token', access_token);
      localStorage.setItem('refreshToken', refresh_token);
      
      // Get user info
      const userResponse = await axios.get('/api/auth/user', {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      
      setAuthState({
        isAuthenticated: true,
        token: access_token,
        refreshToken: refresh_token,
        user: userResponse.data,
      });
      
      setIsLoading(false);
      return true;
    } catch (error) {
      setAuthState({
        isAuthenticated: false,
        error: 'Login failed. Please check your credentials and try again.'
      });
      setIsLoading(false);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear local storage and state regardless of API response
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setAuthState({ isAuthenticated: false });
    }
  };

  return (
    <AuthContext.Provider value={{ authState, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
