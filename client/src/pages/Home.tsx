import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const API_BASE = process.env.REACT_APP_API_URL || 'https://instrevi-api.onrender.com';

const Home: React.FC = () => {
  const [caption, setCaption] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const { token } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (!image) return setMessage('Please select an image');

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', image);
      formData.append('caption', caption);

      const res = await fetch(`${API_BASE}/api/posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');
      setMessage('Upload successful — go to Home (Feed) to see it.');
      setCaption('');
      setImage(null);
    } catch (err) {
      console.error(err);
      setMessage('Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '20px 0' }}>
      <h1>Share a photo</h1>

      {!token ? (
        <div style={{ marginTop: 12 }}>Please <a href="/login">log in</a> to upload photos.</div>
      ) : (
        <form onSubmit={handleSubmit} style={{ maxWidth: 520 }}>
          <div style={{ marginBottom: 8 }}>
            <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} />
          </div>

          <div style={{ marginBottom: 8 }}>
            <input type="text" placeholder="Write a caption..." value={caption} onChange={(e) => setCaption(e.target.value)} className="form-input" />
          </div>

          <div>
            <button type="submit" className="btn-primary" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
          </div>

          {message && <div style={{ marginTop: 12, color: message.includes('successful') ? 'green' : 'red' }}>{message}</div>}
        </form>
      )}

      <hr style={{ margin: '20px 0' }} />

      <p>Other features and pages are accessible from the navbar.</p>
    </div>
  );
};

export default Home;
