import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/apiFetch';
import MediaComposerEditor from '../components/MediaComposerEditor';
import {
  ComposerMediaItem,
  ComposerSoundtrack,
  createDefaultMediaEdit,
  createEmptySoundtrack,
} from '../utils/mediaEditing';

const CreateUnboxing: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const isBanned = Boolean(user?.isBanned);
  const chooseFilesInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoCameraInputRef = useRef<HTMLInputElement>(null);
  const selectedMediaRef = useRef<ComposerMediaItem[]>([]);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Product');
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<ComposerMediaItem[]>([]);
  const [soundtrack, setSoundtrack] = useState<ComposerSoundtrack>(createEmptySoundtrack);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const soundtrackRef = useRef<ComposerSoundtrack>(soundtrack);

  const categories = [
    'Product', 'Electronics', 'Fashion', 'Beauty', 'Sports', 'Books',
    'Gaming', 'Toys', 'Home & Garden', 'Other'
  ];

  const appendSelectedFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const additions: ComposerMediaItem[] = Array.from(files).map((file) => {
      const kind = file.type.startsWith('video/') ? 'video' : 'image';

      return {
        file,
        preview: URL.createObjectURL(file),
        kind,
        edit: createDefaultMediaEdit(kind),
      };
    });

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

  const handleVideoCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    soundtrackRef.current = soundtrack;
  }, [soundtrack]);

  useEffect(() => {
    return () => {
      selectedMediaRef.current.forEach((item) => {
        if (item.preview.startsWith('blob:')) {
          URL.revokeObjectURL(item.preview);
        }
      });

      if (soundtrackRef.current.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(soundtrackRef.current.previewUrl);
      }
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
      formData.append('tags', tags);

      const imageFiles = selectedMedia.filter((item) => item.kind === 'image').map((item) => item.file);
      const videoFiles = selectedMedia.filter((item) => item.kind === 'video').map((item) => item.file);
      const mediaEditSettings = [
        ...selectedMedia.filter((item) => item.kind === 'image').map((item) => item.edit),
        ...selectedMedia.filter((item) => item.kind === 'video').map((item) => item.edit),
      ];

      imageFiles.forEach((file) => {
        formData.append('images', file);
      });

      videoFiles.forEach((file) => {
        formData.append('videos', file);
      });

      if (mediaEditSettings.length > 0) {
        formData.append('mediaEditSettings', JSON.stringify(mediaEditSettings));
      }

      if (soundtrack.file) {
        formData.append('soundtrack', soundtrack.file);
        formData.append('soundtrackVolume', soundtrack.volume.toString());
      }

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
      setTags('');
      setSelectedMedia((prev) => {
        prev.forEach((item) => {
          if (item.preview.startsWith('blob:')) {
            URL.revokeObjectURL(item.preview);
          }
        });
        return [];
      });
      setSoundtrack((current) => {
        if (current.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(current.previewUrl);
        }

        return createEmptySoundtrack();
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

        {/* Tags */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
            Tags
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., camera, gear, sony"
            maxLength={400}
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
          <div style={{ fontSize: '12px', color: '#8e8e8e', marginTop: '4px' }}>
            Separate tags with commas
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
                fontFamily: "'Poppins', sans-serif",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
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
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Files
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
                fontFamily: "'Poppins', sans-serif",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
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
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Camera
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
                fontFamily: "'Poppins', sans-serif",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
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
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
              Video
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
            onChange={handleVideoCameraCapture}
            style={{ display: 'none' }}
          />

          <div style={{ fontSize: '12px', color: '#8e8e8e', marginBottom: '12px' }}>
            Use Camera for photos and Video for recording. You can add multiple videos and photos.
          </div>

          {/* Media Gallery */}
          {selectedMedia.length > 0 && (
            <>
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

              <MediaComposerEditor
                items={selectedMedia}
                onItemsChange={setSelectedMedia}
                soundtrack={soundtrack}
                onSoundtrackChange={setSoundtrack}
              />
            </>
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
