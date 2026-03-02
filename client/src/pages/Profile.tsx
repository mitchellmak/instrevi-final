import React from 'react';
import { useParams } from 'react-router-dom';

const Profile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();

  return (
    <div className="container" style={{ padding: '20px 0', display: 'flex', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: '680px', padding: '24px', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '10px' }}>Profile Page</h2>
        <p style={{ wordBreak: 'break-word' }}>Viewing profile for user: {userId}</p>
        {/* TODO: Implement profile display with user info, posts, etc. */}
      </div>
    </div>
  );
};

export default Profile;
