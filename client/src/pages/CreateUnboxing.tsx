import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/apiFetch';

interface SelectedMediaItem {
  file: File;
  preview: string;
  kind: 'image' | 'video';
}

const CreateUnboxing: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const isBanned = Boolean(user?.isBanned);
  const chooseFilesInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoCameraInputRef = useRef<HTMLInputElement>(null);
  const selectedMediaRef = useRef<SelectedMediaItem[]>([]);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Product');
  const [caption, setCaption] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<SelectedMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    'Product', 'Electronics', 'Fashion', 'Beauty', 'Sports', 'Books',
    'Gaming', 'Toys', 'Home & Garden', 'Other'
  ];

  const appendSelectedFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const additions: SelectedMediaItem[] = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      kind: file.type.startsWith('video/') ? 'video' : 'image'
    }));

    setSelectedMedia((prev) => [...prev, ...additions]);
  };

  const handleChooseFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    appendSelectedFiles(e.target.files);
    e.target.value = '';
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    appendSelectedFiles(e.target.files);
    e.target.value = '';
  };

  const removeMedia = (index: number) => {
    setSelectedMedia((prev) => {
      const target = prev[index];
      if (target?.preview?.startsWith('blob:')) {
        URL.revokeObjectURL(target.preview);
      }

      return prev.filter((_, i) => i !== index);
    });
  };

  useEffect(() => {
    selectedMediaRef.current = selectedMedia;
  }, [selectedMedia]);

  useEffect(() => {
    return () => {
      selectedMediaRef.current.forEach((item) => {
        if (item.preview.startsWith('blob:')) {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isBanned) {
      setError('Your account is banned from creating posts.');
      return;
    }

    if (!title.trim() || !caption.trim() || selectedMedia.length === 0) {
      setError('Please fill in all fields and upload at least one photo or video');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('postType', 'unboxing');
      formData.append('title', title);
      formData.append('category', category);
      formData.append('caption', caption);

      const imageFiles = selectedMedia.filter((item) => item.kind === 'image').map((item) => item.file);
      const videoFiles = selectedMedia.filter((item) => item.kind === 'video').map((item) => item.file);

      imageFiles.forEach((file) => {
        formData.append('images', file);
      });

      videoFiles.forEach((file) => {
        formData.append('videos', file);
      });

      const response = await apiFetch('/api/posts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to create unboxing post';

        try {
          const parsed = errorText ? JSON.parse(errorText) : null;
          if (parsed?.message) {
            errorMessage = parsed.message;
          } else if (errorText) {
            errorMessage = errorText;
          }
        } catch {
          if (errorText) {
            errorMessage = errorText;
          }
        }

        throw new Error(errorMessage);
      }

      // Reset form
      setTitle('');
      setCaption('');
      setSelectedMedia((prev) => {
        prev.forEach((item) => {
          if (item.preview.startsWith('blob:')) {
            URL.revokeObjectURL(item.preview);
          }
        });
        return [];
      });

      navigate('/feed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create unboxing post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: "'Poppins', sans-serif" }}>
      <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px' }}>Create an Unboxing Post</h1>

      {error && (
        <div style={{
          backgroundColor: '#ffe0e0',
          color: '#c00',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {isBanned && (
        <div
          style={{
            marginBottom: '16px',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid var(--brand-border)',
            background: '#ffffff',
            color: 'var(--brand-primary)',
            fontSize: '13px'
          }}
        >
          Your account is banned from posting. You can still use other profile and settings pages.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Title */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
            Unboxing Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Unboxing Sony a7 Camera"
            maxLength={200}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #dbdbdb',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box',
              fontFamily: "'Poppins', sans-serif"
            }}
          />
        </div>

        {/* Category */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
            Product Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #dbdbdb',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box',
              fontFamily: "'Poppins', sans-serif"
            }}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Unboxing Description */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
            Unboxing Description *
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Describe your unboxing experience, first impressions, packaging quality, etc..."
            maxLength={2200}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '12px',
              border: '1px solid #dbdbdb',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box',
              fontFamily: "'Poppins', sans-serif",
              resize: 'vertical'
            }}
          />
          <div style={{ fontSize: '12px', color: '#8e8e8e', marginTop: '4px' }}>
            {caption.length}/2200
          </div>
        </div>

        {/* Media Upload Section */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>
            Upload Video/Photos ({selectedMedia.length} selected) *
          </label>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              type="button"
              onClick={() => chooseFilesInputRef.current?.click()}
              style={{
                flex: 1,
                padding: '12px',
                border: '2px solid #dbdbdb',
                borderRadius: '6px',
                backgroundColor: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: "'Poppins', sans-serif"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#262626';
                e.currentTarget.style.backgroundColor = '#f9f9f9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#dbdbdb';
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              📁 Choose Files
            </button>

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              style={{
                flex: 1,
                padding: '12px',
                border: '2px solid #dbdbdb',
                borderRadius: '6px',
                backgroundColor: 'white',
                color: '#262626',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: "'Poppins', sans-serif"
              }}
            >
              📷 Open Camera
            </button>

            <button
              type="button"
              onClick={() => videoCameraInputRef.current?.click()}
              style={{
                flex: 1,
                padding: '12px',
                border: '2px solid #dbdbdb',
                borderRadius: '6px',
                backgroundColor: 'white',
                color: '#262626',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: "'Poppins', sans-serif"
              }}
            >
              🎥 Open Video Camera
            </button>
          </div>

          <input
            ref={chooseFilesInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleChooseFiles}
            style={{ display: 'none' }}
          />

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraCapture}
            style={{ display: 'none' }}
          />

          <input
            ref={videoCameraInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            onChange={handleCameraCapture}
            style={{ display: 'none' }}
          />

          <div style={{ fontSize: '12px', color: '#8e8e8e', marginBottom: '12px' }}>
            Use Open Camera for photos and Open Video Camera for recording. If blocked, allow camera permission for this site.
          </div>

          {/* Media Gallery */}
          {selectedMedia.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: '8px'
            }}>
              {selectedMedia.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'relative',
                    paddingBottom: '100%',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '6px',
                    overflow: 'hidden'
                  }}
                >
                  {item.kind === 'video' ? (
                    <video
                      src={item.preview}
                      muted
                      playsInline
                      controls
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        backgroundColor: '#000'
                      }}
                    />
                  ) : (
                    <img
                      src={item.preview}
                      alt={`Unboxing ${idx + 1}`}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(idx)}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || isBanned}
          className="btn-dark btn-large"
          title={isBanned ? 'Banned users cannot create posts' : undefined}
        >
          {loading ? 'Publishing...' : 'Publish Unboxing'}
        </button>
      </form>
    </div>
  );
};

export default CreateUnboxing;
