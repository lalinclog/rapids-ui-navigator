
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthState, KeycloakUserInfo } from '@/lib/types';
import AuthService from '@/services/AuthService';

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
          const user = await AuthService.getUserInfo(token);
          setAuthState({
            isAuthenticated: true,
            token,
            refreshToken: localStorage.getItem('refreshToken'),
            user,
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
      const tokenData = await AuthService.login(username, password);
      
      if (!tokenData.access_token) {
        setAuthState({
          isAuthenticated: false,
          error: 'Login failed. No access token received.'
        });
        return false;
      }
      
      // Get user info
      const user = await AuthService.getUserInfo(tokenData.access_token);
      
      setAuthState({
        isAuthenticated: true,
        token: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        user,
      });
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      setAuthState({
        isAuthenticated: false,
        error: 'Login failed. Please check your credentials and try again.'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await AuthService.logout();
    } finally {
      setAuthState({ isAuthenticated: false });
    }
  };

  return (
    <AuthContext.Provider value={{ authState, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
