import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthResponse, User } from '../types';

const API_BASE = process.env.REACT_APP_API_URL || 'https://instrevi-api.onrender.com';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, recaptchaToken?: string) => Promise<void>;
  register: (username: string, email: string, password: string, firstName?: string, middleName?: string, lastName?: string) => Promise<void>;
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
    if (savedToken) {
      setToken(savedToken);
      // optionally fetch user profile here if you have an endpoint
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
  };

  const register = async (username: string, email: string, password: string, firstName?: string, middleName?: string, lastName?: string) => {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, firstName, middleName, lastName }),
    });

    if (!response.ok) throw new Error('Registration failed');

    const data: any = await response.json();
    // server returns token + verificationToken (dev) + user
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('token', data.token);
    // optionally surface verificationToken in UI (pages will handle it)
    return data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};