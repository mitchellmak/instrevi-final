import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import Register from '../pages/Register';
import { AuthProvider } from '../hooks/useAuth';

const createMockResponse = (data: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: {
    get: () => 'application/json'
  },
  text: async () => JSON.stringify(data)
});

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
    (global as any).fetch.mockResolvedValueOnce(createMockResponse(fakeResponse));

    render(
      <AuthProvider>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </AuthProvider>
    );

    await userEvent.type(screen.getByPlaceholderText(/email/i), 'dev@test');
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'Password123');
    await userEvent.click(screen.getByLabelText(/i'm not a robot/i));
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(localStorage.getItem('token')).toBe('tok_123'));
  });

  test('Register submits required fields and does not auto-store token', async () => {
    const fakeResponse = {
      token: 'tok_reg',
      user: { id: '2', username: 'new', email: 'new@test', profilePicture: '', followers: [], following: [], followersCount: 0, followingCount: 0 },
      verificationToken: 'verify_123'
    };
    (global as any).fetch.mockResolvedValueOnce(createMockResponse(fakeResponse, 201));

    render(
      <AuthProvider>
        <BrowserRouter>
          <Register />
        </BrowserRouter>
      </AuthProvider>
    );

    await userEvent.type(screen.getByPlaceholderText(/username/i), 'new');
    await userEvent.type(screen.getByPlaceholderText(/first name/i), 'New');
    await userEvent.type(screen.getByPlaceholderText(/middle name/i), 'M');
    await userEvent.type(screen.getByPlaceholderText(/last name/i), 'User');
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'new@test');
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'Password123');
    await userEvent.click(screen.getByLabelText(/i have read and agree to the/i));
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => expect((global as any).fetch).toHaveBeenCalled());

    const [requestUrl, requestInit] = (global as any).fetch.mock.calls[0];
    const body = JSON.parse(String(requestInit?.body || '{}'));

    expect(String(requestUrl)).toContain('/api/auth/register');
    expect(body).toMatchObject({
      username: 'new',
      email: 'new@test',
      firstName: 'New',
      middleName: 'M',
      lastName: 'User',
      termsAccepted: true
    });

    expect(localStorage.getItem('token')).toBeNull();
  });
});
