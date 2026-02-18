import React, { useState, useEffect } from 'react';
import { Post } from '../types';
import PostCard from '../components/PostCard';

const Feed: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('https://instrevi.onrender.com/api/posts');
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://instrevi.onrender.com/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchPosts(); // Refresh posts to update like count
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleComment = async (postId: string, text: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://instrevi.onrender.com/api/posts/${postId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text })
      });

      if (response.ok) {
        fetchPosts(); // Refresh posts to show new comment
      }
    } catch (error) {
      console.error('Error commenting:', error);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>;
  }

  return (
    <div className="container" style={{ maxWidth: '614px', margin: '0 auto', padding: '20px 0' }}>
      {posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#8e8e8e' }}>
          No posts yet. Follow some users to see their posts!
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            onLike={handleLike}
            onComment={handleComment}
          />
        ))
      )}
    </div>
  );
};

export default Feed;
