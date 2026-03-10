import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PostUploader from '../components/PostUploader';
import { AuthProvider } from '../hooks/useAuth';

const createMockResponse = (data: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: {
    get: () => 'application/json'
  },
  json: async () => data,
  text: async () => JSON.stringify(data)
});

describe('PostUploader', () => {
  beforeEach(() => {
    localStorage.clear();
    (global as any).fetch = jest.fn();
  });

  afterEach(() => jest.resetAllMocks());

  test('uploads file and calls onUploadSuccess', async () => {
    localStorage.setItem('token', 'test-token');
    const mockOnUpload = jest.fn();

    (global as any).fetch.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/api/auth/session')) {
        return Promise.resolve(createMockResponse({
          user: {
            id: 'u1',
            username: 'tester',
            email: 'tester@example.com',
            profilePicture: '',
            followers: [],
            following: [],
            followersCount: 0,
            followingCount: 0
          }
        }));
      }

      if (url.includes('/api/posts')) {
        return Promise.resolve(createMockResponse({ _id: '1', caption: 'ok', image: 'url' }));
      }

      return Promise.resolve(createMockResponse({ message: 'Not found' }, 404));
    });

    render(
      <AuthProvider>
        <PostUploader onUploadSuccess={mockOnUpload} />
      </AuthProvider>
    );

    const file = new File(['hi'], 'photo.png', { type: 'image/png' });
    screen.getByLabelText(/choose file/i);
    const fileInput = document.querySelector('input[type=file]') as HTMLInputElement;
    await userEvent.upload(fileInput, file);

    await userEvent.type(screen.getByPlaceholderText(/write a caption/i), 'caption');
    await userEvent.click(screen.getByRole('button', { name: /post/i }));

    await waitFor(() => expect(mockOnUpload).toHaveBeenCalled());
    expect(screen.getByText(/upload successful/i)).toBeTruthy();
  });
});
