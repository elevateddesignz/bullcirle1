// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { resolveApiPath } from '../lib/backendConfig';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../lib/authStorage';

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string | null;
  roles?: string[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function authFetch(path: string, init?: RequestInit) {
  const response = await fetch(resolveApiPath(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  return response;
}

async function fetchMe(accessToken: string): Promise<AuthUser | null> {
  const response = await fetch(resolveApiPath('/auth/me'), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const hydrate = async () => {
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();
      if (accessToken) {
        const me = await fetchMe(accessToken);
        if (me) {
          setUser(me);
          setIsAuthenticated(true);
          setIsInitialLoad(false);
          return;
        }
      }

      if (refreshToken) {
        const response = await authFetch('/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
        if (response.ok) {
          const data = await response.json();
          setTokens(data.accessToken, data.refreshToken);
          setUser(data.user ?? null);
          setIsAuthenticated(true);
        } else {
          clearTokens();
        }
      }

      setIsInitialLoad(false);
    };

    void hydrate();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Login failed');
      }
      const data = await response.json();
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user ?? null);
      setIsAuthenticated(true);
      toast.success('Successfully signed in!');
      navigate('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      toast.error(message);
      throw new Error(message);
    }
  };

  const register = async (email: string, password: string, username: string) => {
    try {
      const response = await authFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, username, displayName: username }),
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Registration failed');
      }
      const data = await response.json();
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user ?? null);
      setIsAuthenticated(true);
      toast.success('Registration successful!');
      navigate('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      toast.error(message);
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await authFetch('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      }
      clearTokens();
      setIsAuthenticated(false);
      setUser(null);
      toast.success('Successfully signed out!');
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    }
  };

  if (isInitialLoad) {
    return <>{children}</>;
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
