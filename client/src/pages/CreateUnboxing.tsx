import React, { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://instrevi-final.onrender.com');

const CreateUnboxing: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Product');
  const [caption, setCaption] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    'Product', 'Electronics', 'Fashion', 'Beauty', 'Sports', 'Books',
    'Gaming', 'Toys', 'Home & Garden', 'Other'
  ];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = [...imageFiles, ...files];
    const newImages = imageFiles.length === 0 ? [...images] : images;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newImages.push(e.target?.result as string);
        setImages([...newImages]);
      };
      reader.readAsDataURL(file);
    });

    setImageFiles(newFiles);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newFiles = imageFiles.filter((_, i) => i !== index);
    setImages(newImages);
    setImageFiles(newFiles);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      setCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0);
        const imageData = canvasRef.current.toDataURL('image/jpeg');
        setImages([...images, imageData]);

        // Convert canvas to blob for file upload
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `photo-${Date.now()}.jpg`, {
              type: 'image/jpeg'
            });
            setImageFiles([...imageFiles, file]);
          }
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !caption.trim() || images.length === 0) {
      setError('Please fill in all fields and upload at least one image');
      return;
    }

    stopCamera();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('postType', 'unboxing');
      formData.append('title', title);
      formData.append('category', category);
      formData.append('caption', caption);

      imageFiles.forEach((file, idx) => {
        formData.append(`images`, file);
      });

      // Use first image as main image
      if (imageFiles.length > 0) {
        formData.append('image', imageFiles[0]);
      }

      const response = await fetch(`${API_BASE}/api/posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to create unboxing post');
      }

      // Reset form
      setTitle('');
      setCaption('');
      setImages([]);
      setImageFiles([]);

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

        {/* Photo Upload Section */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>
            Upload Photos ({images.length} selected) *
          </label>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
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
              onClick={cameraActive ? stopCamera : startCamera}
              style={{
                flex: 1,
                padding: '12px',
                border: '2px solid #dbdbdb',
                borderRadius: '6px',
                backgroundColor: cameraActive ? '#262626' : 'white',
                color: cameraActive ? 'white' : '#262626',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: "'Poppins', sans-serif"
              }}
            >
              📷 {cameraActive ? 'Stop Camera' : 'Open Camera'}
            </button>

            {cameraActive && (
              <button
                type="button"
                onClick={capturePhoto}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#0095f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontFamily: "'Poppins', sans-serif"
                }}
              >
                Snap
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            style={{ display: 'none' }}
          />

          {/* Camera Preview */}
          {cameraActive && (
            <div style={{
              marginBottom: '12px',
              borderRadius: '6px',
              overflow: 'hidden',
              backgroundColor: '#000'
            }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  height: '300px',
                  objectFit: 'cover'
                }}
              />
            </div>
          )}

          <canvas
            ref={canvasRef}
            style={{ display: 'none' }}
            width={300}
            height={300}
          />

          {/* Image Gallery */}
          {images.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: '8px'
            }}>
              {images.map((img, idx) => (
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
                  <img
                    src={img}
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
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
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
          disabled={loading}
          className="btn-dark btn-large"
        >
          {loading ? 'Publishing...' : 'Publish Unboxing'}
        </button>
      </form>
    </div>
  );
};

export default CreateUnboxing;
