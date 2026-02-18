import React from 'react';

const Home: React.FC = () => {
  return (
    <div className="container" style={{ padding: '20px 0' }}>
      <h1>Welcome to Instrevi</h1>
      <p>Your Instagram-like social media app!</p>
      <div style={{ marginTop: '20px' }}>
        <h2>Features:</h2>
        <ul>
          <li>User authentication</li>
          <li>Photo upload and sharing</li>
          <li>Likes and comments</li>
          <li>Follow/unfollow users</li>
          <li>User profiles</li>
        </ul>
      </div>
    </div>
  );
};

export default Home;
