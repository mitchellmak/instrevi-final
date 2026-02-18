import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import Register from '../pages/Register';
import { AuthProvider } from '../hooks/useAuth';

describe('Auth flows', () => {
  beforeEach(() => {
    localStorage.clear();
    (global as any).fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Login stores token on success', async () => {
    const fakeResponse = { token: 'tok_123', user: { id: '1', username: 'dev', email: 'dev@test', profilePicture: '', followers: [], following: [], followersCount: 0, followingCount: 0 } };
    (global as any).fetch.mockResolvedValueOnce({ ok: true, json: async () => fakeResponse });

    render(
      <AuthProvider>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </AuthProvider>
    );

    await userEvent.type(screen.getByPlaceholderText(/email/i), 'dev@test');
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'Password123');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => expect(localStorage.getItem('token')).toBe('tok_123'));
  });

  test('Register stores token on success', async () => {
    const fakeResponse = { token: 'tok_reg', user: { id: '2', username: 'new', email: 'new@test', profilePicture: '', followers: [], following: [], followersCount: 0, followingCount: 0 } };
    (global as any).fetch.mockResolvedValueOnce({ ok: true, json: async () => fakeResponse });

    render(
      <AuthProvider>
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      </AuthProvider>
    );

    await userEvent.type(screen.getByPlaceholderText(/username/i), 'new');
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'new@test');
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'Password123');
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => expect(localStorage.getItem('token')).toBe('tok_reg'));
  });
});
