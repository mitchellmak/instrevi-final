import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import SettingsLayout from '../components/SettingsLayout';
import UserAvatar from '../components/UserAvatar';

const ProfileEdit: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [middleName, setMiddleName] = useState(user?.middleName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('firstName', firstName);
      formData.append('middleName', middleName);
      formData.append('lastName', lastName);
      formData.append('bio', bio);
      formData.append('email', email);

      if (profileImage) {
        formData.append('profilePicture', profileImage);
      }

      await updateProfile(formData);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const currentProfilePic = previewUrl || user?.profilePicture;

  return (
    <SettingsLayout>
      <div>
        <h1 style={{ marginBottom: '30px', fontSize: '28px', fontWeight: 'bold' }}>Edit Profile</h1>
        
        <form onSubmit={handleSubmit}>
          {/* Profile Picture Section */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '30px', 
            marginBottom: '30px',
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #dbdbdb'
          }} className="profile-card-header">
            <div style={{ position: 'relative' }}>
              <UserAvatar
                user={user as any}
                size={100}
                fontSize={40}
                srcOverride={currentProfilePic}
                alt="Profile"
                style={{ border: '2px solid #dbdbdb' }}
              />
            </div>
            
            <div>
              <h3 style={{ marginBottom: '5px', fontSize: '18px' }}>{user?.username}</h3>
              <label 
                htmlFor="profile-upload" 
                style={{ 
                  color: '#0095f6', 
                  cursor: 'pointer', 
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                Change Profile Photo
              </label>
              <input 
                id="profile-upload"
                type="file" 
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* Form Fields */}
          <div style={{ 
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #dbdbdb',
            padding: '30px'
          }}>
            {success && (
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#d4edda', 
                color: '#155724', 
                borderRadius: '4px', 
                marginBottom: '20px' 
              }}>
                {success}
              </div>
            )}
            
            {error && (
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#f8d7da', 
                color: '#721c24', 
                borderRadius: '4px', 
                marginBottom: '20px' 
              }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '25px' }}>
              <label style={{ 
                display: 'block', 
                fontWeight: 'bold', 
                marginBottom: '8px',
                fontSize: '14px',
                color: '#262626'
              }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                style={{ width: '100%' }}
              />
              <small style={{ color: '#8e8e8e', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                Your unique username for Instrevi
              </small>
            </div>

            <div className="profile-name-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '25px' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  fontWeight: 'bold', 
                  marginBottom: '8px',
                  fontSize: '14px',
                  color: '#262626'
                }}>
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  fontWeight: 'bold', 
                  marginBottom: '8px',
                  fontSize: '14px',
                  color: '#262626'
                }}>
                  Middle Name
                </label>
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  className="form-input"
                  style={{ width: '100%' }}
                  placeholder="Optional"
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  fontWeight: 'bold', 
                  marginBottom: '8px',
                  fontSize: '14px',
                  color: '#262626'
                }}>
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ 
                display: 'block', 
                fontWeight: 'bold', 
                marginBottom: '8px',
                fontSize: '14px',
                color: '#262626'
              }}>
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="form-input"
                style={{ 
                  width: '100%', 
                  minHeight: '80px', 
                  resize: 'vertical',
                  fontFamily: 'inherit' 
                }}
                placeholder="Tell us about yourself..."
                maxLength={150}
              />
              <small style={{ color: '#8e8e8e', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                {bio.length}/150 characters
              </small>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ 
                display: 'block', 
                fontWeight: 'bold', 
                marginBottom: '8px',
                fontSize: '14px',
                color: '#262626'
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                style={{ width: '100%' }}
              />
              {user?.emailVerified ? (
                <small style={{ color: '#28a745', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                  ✓ Email verified
                </small>
              ) : (
                <small style={{ color: '#dc3545', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                  ⚠ Email not verified. <a href="/verify-email" style={{ color: '#0095f6' }}>Verify now</a>
                </small>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => {
                  setUsername(user?.username || '');
                  setFirstName(user?.firstName || '');
                  setMiddleName(user?.middleName || '');
                  setLastName(user?.lastName || '');
                  setBio(user?.bio || '');
                  setEmail(user?.email || '');
                  setProfileImage(null);
                  setPreviewUrl(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </SettingsLayout>
  );
};

export default ProfileEdit;
