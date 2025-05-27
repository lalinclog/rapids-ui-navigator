
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthState, KeycloakUserInfo } from '@/lib/types';
import AuthService from '@/services/AuthService';
// import jwt_decode from 'jwt-decode';
import { jwtDecode } from 'jwt-decode';

interface AuthContextType {
  authState: AuthState;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  user: KeycloakUserInfo | undefined;
}

const AuthContext = createContext<AuthContextType>({
  authState: { isAuthenticated: false },
  login: async () => false,
  logout: async () => {},
  isLoading: true,
  user: undefined,
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
          // Decode the token to extract roles and other info
          const decodedToken: any = jwtDecode(token);
          
          // Fetch user info from Keycloak
          const user = await AuthService.getUserInfo(token);
          
          // Merge the decoded token data with user info
          const enhancedUser = {
            ...user,
            // Include realm_access with roles from the token
            realm_access: decodedToken.realm_access || { roles: [] },
            // Include resource_access with client-specific roles from the token
            resource_access: decodedToken.resource_access || {},
            // Add any other JWT claims we want to expose
            exp: decodedToken.exp,
            iat: decodedToken.iat,
            auth_time: decodedToken.auth_time,
            jti: decodedToken.jti,
            iss: decodedToken.iss,
            sub: decodedToken.sub,
          };
          
          setAuthState({
            isAuthenticated: true,
            token,
            refreshToken: localStorage.getItem('refreshToken'),
            user: enhancedUser,
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
      
      // Decode the token to extract roles and other info
      const decodedToken: any = jwtDecode(tokenData.access_token);
      
      // Get user info
      const user = await AuthService.getUserInfo(tokenData.access_token);
      
      // Merge the decoded token data with user info
      const enhancedUser = {
        ...user,
        // Include realm_access with roles from the token
        realm_access: decodedToken.realm_access || { roles: [] },
        // Include resource_access with client-specific roles from the token
        resource_access: decodedToken.resource_access || {},
        // Add any other JWT claims we want to expose
        exp: decodedToken.exp,
        iat: decodedToken.iat,
        auth_time: decodedToken.auth_time,
        jti: decodedToken.jti,
        iss: decodedToken.iss,
        sub: decodedToken.sub,
      };
      
      setAuthState({
        isAuthenticated: true,
        token: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        user: enhancedUser,
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
    <AuthContext.Provider value={{ 
      authState, 
      login, 
      logout, 
      isLoading, 
      user: authState.user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
