import React from 'react';
import { Post } from '../types';

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string, text: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onLike, onComment }) => {
  const [commentText, setCommentText] = React.useState('');

  const handleLike = () => {
    onLike(post._id);
  };

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      onComment(post._id, commentText);
      setCommentText('');
    }
  };

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      {/* Post Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px' }}>
        <img
          src={post.user.profilePicture || 'https://via.placeholder.com/32'}
          alt={post.user.username}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            marginRight: '12px'
          }}
        />
        <span style={{ fontWeight: '600' }}>{post.user.username}</span>
      </div>

      {/* Post Image */}
      <div style={{ width: '100%', height: '400px', backgroundColor: '#f0f0f0' }}>
        <img
          src={post.image}
          alt={post.caption}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Post Actions */}
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
          <button className="btn" onClick={handleLike} style={{ fontSize: '24px' }}>
            ❤️
          </button>
          <button className="btn" style={{ fontSize: '24px' }}>
            💬
          </button>
        </div>

        <div style={{ fontWeight: '600', marginBottom: '8px' }}>
          {post.likes.length} likes
        </div>

        {post.caption && (
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontWeight: '600' }}>{post.user.username}</span>
            {' '}{post.caption}
          </div>
        )}

        {/* Comments */}
        {post.comments.map((comment) => (
          <div key={comment._id} style={{ marginBottom: '4px', fontSize: '14px' }}>
            <span style={{ fontWeight: '600' }}>{comment.user.username}</span>
            {' '}{comment.text}
          </div>
        ))}

        {/* Add Comment */}
        <form onSubmit={handleComment} style={{ marginTop: '12px', borderTop: '1px solid #dbdbdb', paddingTop: '12px' }}>
          <input
            type="text"
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              flex: 1,
              fontSize: '14px'
            }}
          />
          <button
            type="submit"
            className="btn"
            style={{ color: '#0095f6', fontWeight: '600', fontSize: '14px' }}
            disabled={!commentText.trim()}
          >
            Post
          </button>
        </form>
      </div>
    </div>
  );
};

export default PostCard;
