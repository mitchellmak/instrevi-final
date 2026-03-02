import React, { useState, useEffect } from 'react';
import { Post } from '../types';
import PostCard from '../components/PostCard';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

const Feed: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/posts`);
      if (response.ok) {
        const data = await response.json();
        setPosts(Array.isArray(data) ? data : []);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      // token from useAuth()
      const response = await fetch(`${API_BASE}/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchPosts();
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleComment = async (postId: string, text: string) => {
    try {
      // token from useAuth()
      const response = await fetch(`${API_BASE}/api/posts/${postId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text })
      });

      if (response.ok) {
        fetchPosts();
      }
    } catch (error) {
      console.error('Error commenting:', error);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>;
  }

  const filteredPosts = searchQuery 
    ? posts.filter(post => 
        (post.caption || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (post.user?.username || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts;

  return (
    <div style={{ maxWidth: '975px', margin: '0 auto', padding: '20px 0' }}>
      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => navigate('/create/review')}
            style={{
              width: '70px',
              height: '70px',
              backgroundColor: 'white',
              color: '#262626',
              border: '1px solid #dbdbdb',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#262626';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#dbdbdb';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
            }}
          >
            <svg 
              width="60" 
              height="60" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#262626" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <span style={{ 
            fontSize: '11px', 
            color: '#262626',
            fontWeight: '400',
            fontFamily: "'Poppins', sans-serif"
          }}>
            Review
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => navigate('/create/unboxing')}
            style={{
              width: '70px',
              height: '70px',
              backgroundColor: 'white',
              color: '#262626',
              border: '1px solid #dbdbdb',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#262626';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#dbdbdb';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
            }}
          >
            <svg 
              width="60" 
              height="60" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#262626" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </button>
          <span style={{ 
            fontSize: '11px', 
            color: '#262626',
            fontWeight: '400',
            fontFamily: "'Poppins', sans-serif"
          }}>
            Unboxing
          </span>
        </div>

        <div style={{ position: 'relative', marginLeft: 'auto', width: '280px' }}>
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              height: '70px',
              padding: '0 16px 0 40px',
              border: '1px solid #dbdbdb',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              outline: 'none',
              transition: 'all 0.2s',
              boxSizing: 'border-box',
              fontFamily: "'Poppins', sans-serif"
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#262626';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#dbdbdb';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
            }}
          />
          <span style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '16px',
            color: '#8e8e8e'
          }}>
            🔍
          </span>
        </div>
      </div>

      {filteredPosts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#8e8e8e' }}>
          {searchQuery ? 'No posts found matching your search.' : 'No posts yet. Be the first to share something!'}
        </div>
      ) : (
        filteredPosts.map((post) => (
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
