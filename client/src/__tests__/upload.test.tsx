import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PostUploader from '../components/PostUploader';
import { AuthProvider } from '../hooks/useAuth';

describe('PostUploader', () => {
  beforeEach(() => {
    localStorage.clear();
    (global as any).fetch = jest.fn();
  });

  afterEach(() => jest.resetAllMocks());

  test('uploads file and calls onUploadSuccess', async () => {
    localStorage.setItem('token', 'test-token');
    const mockOnUpload = jest.fn();

    (global as any).fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ _id: '1', caption: 'ok', image: 'url' }) });

    render(
      <AuthProvider>
        <PostUploader onUploadSuccess={mockOnUpload} />
      </AuthProvider>
    );

    const file = new File(['hi'], 'photo.png', { type: 'image/png' });
    const input = screen.getByLabelText(/choose file/i) || screen.getByRole('textbox', { hidden: true });

    // fallback: query by input[type=file]
    const fileInput = document.querySelector('input[type=file]') as HTMLInputElement;
    await userEvent.upload(fileInput, file);

    await userEvent.type(screen.getByPlaceholderText(/write a caption/i), 'caption');
    await userEvent.click(screen.getByRole('button', { name: /post/i }));

    await waitFor(() => expect(mockOnUpload).toHaveBeenCalled());
    expect(screen.getByText(/upload successful/i)).toBeInTheDocument();
  });
});
