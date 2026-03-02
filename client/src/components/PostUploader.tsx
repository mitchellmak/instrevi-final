import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const API_BASE = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://instrevi-final.onrender.com');

interface Props {
  onUploadSuccess?: () => void;
}

const PostUploader: React.FC<Props> = ({ onUploadSuccess }) => {
  const { token } = useAuth();
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (!file) return setMessage('Please select an image');

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('caption', caption);

      const res = await fetch(`${API_BASE}/api/posts`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: fd
      });

      if (!res.ok) throw new Error('Upload failed');

      setCaption('');
      setFile(null);
      onUploadSuccess?.();
      setMessage('Upload successful');
    } catch (err) {
      console.error(err);
      setMessage('Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input aria-label="choose file" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <input type="text" placeholder="Write a caption..." value={caption} onChange={(e) => setCaption(e.target.value)} className="form-input" />
        <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Uploading...' : 'Post'}</button>
      </form>
      {message && <div style={{ marginTop: 8, color: message.includes('successful') ? 'green' : 'red' }}>{message}</div>}
    </div>
  );
};

export default PostUploader;
