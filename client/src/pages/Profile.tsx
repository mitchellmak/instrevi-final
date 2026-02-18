import React from 'react';
import { useParams } from 'react-router-dom';

const Profile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();

  return (
    <div className="container" style={{ padding: '20px 0' }}>
      <h2>Profile Page</h2>
      <p>Viewing profile for user: {userId}</p>
      {/* TODO: Implement profile display with user info, posts, etc. */}
    </div>
  );
};

export default Profile;
