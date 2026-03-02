import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthResponse, User } from '../types';

const API_BASE = process.env.REACT_APP_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, recaptchaToken?: string) => Promise<void>;
  register: (username: string, email: string, password: string, firstName?: string, middleName?: string, lastName?: string) => Promise<void>;
  updateProfile: (formData: FormData) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken) {
      setToken(savedToken);
    }
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string, recaptchaToken?: string) => {
    const body: any = { email, password };
    if (recaptchaToken) body.recaptchaToken = recaptchaToken;

    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { message: text }; }

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    const payload: AuthResponse = data;
    setUser(payload.user);
    setToken(payload.token);
    localStorage.setItem('token', payload.token);
    localStorage.setItem('user', JSON.stringify(payload.user));
  };

  const register = async (username: string, email: string, password: string, firstName?: string, middleName?: string, lastName?: string) => {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, firstName, middleName, lastName }),
    });

    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { message: text }; }

    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    // server returns token + verificationToken (dev) + user
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    // optionally surface verificationToken in UI (pages will handle it)
    return data;
  };

  const updateProfile = async (formData: FormData) => {
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE}/api/users/profile`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { message: text }; }

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
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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