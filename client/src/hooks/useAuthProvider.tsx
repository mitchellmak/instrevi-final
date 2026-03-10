import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AuthResponse, User } from '../types';
import { AUTH_EXPIRED_EVENT, apiFetch } from '../utils/apiFetch';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, recaptchaToken?: string) => Promise<void>;
  register: (username: string, email: string, password: string, firstName: string, middleName: string, lastName: string, termsAccepted: boolean) => Promise<any>;
  updateProfile: (formData: FormData) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const parseResponseData = async (response: Response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

export const AuthProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const clearStoredAuth = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleAuthExpired = () => {
      clearStoredAuth();
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);

    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, [clearStoredAuth]);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (!savedToken) {
        if (savedUser) {
          localStorage.removeItem('user');
        }

        if (isMounted) {
          setUser(null);
          setToken(null);
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setToken(savedToken);
      }

      if (savedUser) {
        try {
          if (isMounted) {
            setUser(JSON.parse(savedUser));
          }
        } catch {
          localStorage.removeItem('user');
        }
      }

      try {
        const response = await apiFetch('/api/auth/session', {
          headers: {
            Authorization: `Bearer ${savedToken}`
          }
        });

        const data = await parseResponseData(response);

        if (!response.ok || !data?.user) {
          throw new Error(data?.message || 'Session expired');
        }

        if (!isMounted) {
          return;
        }

        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      } catch {
        if (isMounted) {
          clearStoredAuth();
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [clearStoredAuth]);

  const login = async (email: string, password: string, recaptchaToken?: string) => {
    const body: any = { email, password };
    if (recaptchaToken) body.recaptchaToken = recaptchaToken;

    const response = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await parseResponseData(response);

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    const payload: AuthResponse = data;
    setUser(payload.user);
    setToken(payload.token);
    localStorage.setItem('token', payload.token);
    localStorage.setItem('user', JSON.stringify(payload.user));
  };

  const register = async (username: string, email: string, password: string, firstName: string, middleName: string, lastName: string, termsAccepted: boolean) => {
    const response = await apiFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, firstName, middleName, lastName, termsAccepted }),
    });

    const data = await parseResponseData(response);

    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    // server may return verification token/url in non-production; pages handle next step
    return data;
  };

  const updateProfile = async (formData: FormData) => {
    if (!token) throw new Error('Not authenticated');

    const response = await apiFetch('/api/users/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await parseResponseData(response);

    if (response.status === 401) {
      clearStoredAuth();
      throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
      throw new Error(data.message || 'Profile update failed');
    }

    const updatedUser: User = {
      ...(user as User),
      ...data,
    };

    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const logout = () => {
    clearStoredAuth();
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, updateProfile, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};