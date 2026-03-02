import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import SettingsLayout from '../components/SettingsLayout';
import UserChip from '../components/UserChip';

const Friends: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers');

  // Placeholder data - in production, this would come from the API
  const followers = user?.followers || [];
  const following = user?.following || [];

  return (
    <SettingsLayout>
    <div>
      <h1 className="settings-page-title">Friends & Followings</h1>
      
      <div className="card settings-page-card">
        <div className="settings-tabs">
          <button
            onClick={() => setActiveTab('followers')}
            className="settings-tab-button"
            style={{
              background: 'none',
              border: 'none',
              padding: '10px 20px',
              cursor: 'pointer',
              fontWeight: activeTab === 'followers' ? 'bold' : 'normal',
              borderBottom: activeTab === 'followers' ? '2px solid #262626' : 'none',
              color: activeTab === 'followers' ? '#262626' : '#8e8e8e'
            }}
          >
            Followers ({followers.length})
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className="settings-tab-button"
            style={{
              background: 'none',
              border: 'none',
              padding: '10px 20px',
              cursor: 'pointer',
              fontWeight: activeTab === 'following' ? 'bold' : 'normal',
              borderBottom: activeTab === 'following' ? '2px solid #262626' : 'none',
              color: activeTab === 'following' ? '#262626' : '#8e8e8e'
            }}
          >
            Following ({following.length})
          </button>
        </div>

        {activeTab === 'followers' && (
          <div>
            {followers.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#8e8e8e', padding: '40px 0' }}>
                No followers yet. Share your profile to get started!
              </p>
            ) : (
              followers.map((follower) => (
                <div key={follower.id} className="friend-row">
                  <UserChip
                    user={follower as any}
                    avatarSize={50}
                    primaryStyle={{ fontWeight: 'bold', marginBottom: '5px' }}
                    secondaryStyle={{ fontSize: '14px' }}
                    secondaryText={`${follower.firstName || ''} ${follower.lastName || ''}`.trim()}
                  />
                  <button className="btn-primary">Follow Back</button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'following' && (
          <div>
            {following.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#8e8e8e', padding: '40px 0' }}>
                You're not following anyone yet. Discover users to follow!
              </p>
            ) : (
              following.map((followedUser) => (
                <div key={followedUser.id} className="friend-row">
                  <UserChip
                    user={followedUser as any}
                    avatarSize={50}
                    primaryStyle={{ fontWeight: 'bold', marginBottom: '5px' }}
                    secondaryStyle={{ fontSize: '14px' }}
                    secondaryText={`${followedUser.firstName || ''} ${followedUser.lastName || ''}`.trim()}
                  />
                  <button className="btn-secondary">Unfollow</button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
    </SettingsLayout>
  );
};

export default Friends;
