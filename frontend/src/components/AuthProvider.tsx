import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '@/lib/api';
import { handleError, processError } from '@/lib/errorMessages';

/**
 * User authentication information
 */
interface User {
  username: string;
  role: 'admin' | 'user';
  isAuthenticated: boolean;
}

/**
 * Authentication context methods and state
 */
interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication provider for managing user session state
 * @component
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Authentication context provider
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      validateToken();
    } else {
      setLoading(false);
    }
  }, []);

		/**
		 * Validates admin token using proper API architecture
		 */
		const validateToken = async () => {
		  const token = localStorage.getItem('auth_token');
		  
		  if (!token) {
		    setUser(null);
		    setLoading(false);
		    return;
		  }

		  try {
		    const isValid = await authApi.validateToken();
		    
		    if (isValid) {
		      setUser({
		        username: 'admin',
		        role: 'admin',
		        isAuthenticated: true
		      });
		    } else {
		      // Token invalid - clear it
		      localStorage.removeItem('auth_token');
		      setUser(null);
		      console.warn('Token validation failed: Invalid token');
		    }
		  } catch (error) {
		    // API call failed - treat as invalid token
		    const errorInfo = processError(error);
		    
		    // Auto-logout on auth errors
		    if (errorInfo.category === 'authentication') {
		      localStorage.removeItem('auth_token');
		      setUser(null);
		    }
		    
		    console.warn('Token validation failed:', errorInfo.userMessage);
		  } finally {
		    setLoading(false);
		  }
		};

		/**
		 * Authenticates user with credentials
		 */
		const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
		  try {
		    setLoading(true);
		    const result = await authApi.login(username, password);
		    
		    // Handle both API response formats for backward compatibility
		    if (result.success) {
		      if (result.token) {
		        // New API format with token
		        localStorage.setItem('auth_token', result.token);
		        setUser({
		          username: result.user?.username || username,
		          role: result.user?.role || 'admin', 
		          isAuthenticated: true
		        });
		        return { success: true };
		      } else if (result.data?.token) {
		        // Alternative API format
		        localStorage.setItem('auth_token', result.data.token);
		        setUser({
		          username: result.data.user?.username || username,
		          role: result.data.user?.role || 'admin',
		          isAuthenticated: true
		        });
		        return { success: true };
		      }
		    }
		    
		    // If we get here, login failed
		    const errorMessage = result.message || result.error || 'Login failed';
		    throw new Error(errorMessage);
		    
		  } catch (error) {
		    const errorInfo = processError(error);
		    
		    // Special handling for auth errors
		    if (errorInfo.category === 'authentication') {
		      localStorage.removeItem('auth_token');
		      setUser(null);
		    }
		    
		    const userMessage = handleError(error, 'AuthProvider-Login');
		    console.error('Login failed:', errorInfo.logMessage);
		    return { success: false, error: userMessage };
		  } finally {
		    setLoading(false);
		  }
		};

		/**
		 * Logs out user and clears authentication state
		 */
		const logout = () => {
		  try {
		    // Optional: Call logout API if available
		    // await authApi.logout();
		  } catch (error) {
		    // Silent fail - we still want to clear local state
		    console.warn('Logout API call failed:', error);
		  } finally {
		    // Always clear local state
		    localStorage.removeItem('auth_token');
		    setUser(null);
		    console.log('User logged out successfully');
		  }
		};

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook for accessing authentication context
 * @returns {AuthContextType} Authentication methods and state
 * @throws {Error} When used outside AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
