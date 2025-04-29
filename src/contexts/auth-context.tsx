'use client';

import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { loginUser, registerUser, getUserProfile, logoutUser, User } from '@/lib/auth-client';

// Safe localStorage access
function removeAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authToken');
  }
}

interface AuthResponse {
  user: User;
  token: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (email: string, password: string, name: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  updateUser: (user: User) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token and fetch user data
    const checkAuth = async () => {
      try {
        const userData = await getUserProfile();
        if (userData) {
          setUser(userData);
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        removeAuthToken();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await loginUser(email, password);
      
      // Validate the response contains user data
      if (!response || !response.user) {
        console.error('Invalid login response:', response);
        throw new Error('Login failed: Invalid server response');
      }
      
      setUser(response.user);
      return response;
    } catch (error) {
      console.error('Login failed:', error);
      // Ensure we propagate the original error
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      // Attempt registration
      const response = await registerUser(email, password, name);
      
      // Validate required data in response
      if (!response || !response.user || !response.token) {
        console.error('Invalid registration response:', response);
        throw new Error('Registration failed: Invalid server response');
      }
      
      // Set the user in auth context
      setUser(response.user);
      
      // Success, return data
      return response;
    } catch (error: any) {
      console.error('Registration failed:', error);
      
      // Ensure we're throwing the original error or a wrapped one
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(typeof error === 'string' ? error : 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (updatedUser: User) => {
    setLoading(true);
    try {
      // Import the updateUserProfile function from auth-client
      const { updateUserProfile } = await import('@/lib/auth-client');
      
      // Call the API to update the user profile
      const result = await updateUserProfile(updatedUser);
      
      // Update the local state with the result from the server
      setUser(result);
      
      return result;
    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 