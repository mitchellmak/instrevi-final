import React from 'react';
import { Post } from '../types';
import UserChip from './UserChip';

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string, text: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onLike, onComment }) => {
  const [commentText, setCommentText] = React.useState('');
  const [liked, setLiked] = React.useState(false);
  const likes = Array.isArray(post.likes) ? post.likes : [];
  const comments = Array.isArray(post.comments) ? post.comments : [];
  const postUser = post.user || ({ username: 'Deleted user' } as any);

  const actionIconButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    color: '#262626'
  };

  const renderHeartIcon = () => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={liked ? '#ed4956' : 'none'}
      stroke={liked ? '#ed4956' : '#262626'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );

  const renderCommentIcon = () => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#262626"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );

  const handleLike = () => {
    setLiked(!liked);
    onLike(post._id);
  };

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      onComment(post._id, commentText);
      setCommentText('');
    }
  };

  const getRatingColor = (value: number) => {
    if (value > 0) return '#2e7d32';
    if (value < 0) return '#c62828';
    return '#757575';
  };

  const formatSignedRating = (value: number) => {
    if (value > 0) return `+${value}`;
    return `${value}`;
  };

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    const magnitude = Math.min(5, Math.max(0, Math.abs(Math.round(rating))));
    const ratingColor = getRatingColor(rating);

    return (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
        {[...Array(5)].map((_, i) => (
            <span key={i} style={{ fontSize: '20px', color: ratingColor, opacity: i < magnitude ? 1 : 0.3, lineHeight: 1 }}>
            {i < magnitude ? '★' : '☆'}
          </span>
        ))}
        </div>
        <span style={{ color: ratingColor, fontSize: '14px', fontWeight: 600 }}>
          ({formatSignedRating(Math.round(rating))})
        </span>
      </div>
    );
  };

  const isReview = post.postType === 'review';
  const isUnboxing = post.postType === 'unboxing';
  const totalRatingValue = typeof post.totalRating === 'number'
    ? post.totalRating
    : (typeof post.rating === 'number' ? post.rating : 0);

  if (isReview) {
    return (
      <div className="card" style={{ marginBottom: '24px', fontFamily: "'Poppins', sans-serif" }}>
        {/* Review Header */}
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '12px', color: '#8e8e8e', fontWeight: '500' }}>
                REVIEW • {post.category || 'Uncategorized'}
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '6px 0 0 0', maxWidth: '70%' }}>
                {post.title}
              </h3>
            </div>
            <UserChip
              user={postUser as any}
              avatarSize={40}
              containerStyle={{ flexDirection: 'column', gap: '4px' }}
              textContainerStyle={{ alignItems: 'center' }}
              primaryStyle={{ fontSize: '11px', fontWeight: '500' }}
            />
          </div>

          {/* Star Rating */}
          <div style={{ marginBottom: '12px' }}>
            {renderStars(post.rating)}
          </div>
        </div>

        {/* Review Image */}
        {post.image && (
          <div style={{ width: '100%', height: '300px', backgroundColor: '#f0f0f0' }}>
            <img
              src={post.image}
              alt={post.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Review Content */}
        <div style={{ padding: '16px' }}>
          {/* Review Text */}
          {post.caption && (
            <div style={{ marginBottom: '16px', lineHeight: '1.5', fontSize: '14px' }}>
              {post.caption}
            </div>
          )}

          {/* Stats */}
          {post.stats && post.stats.length > 0 && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
              gap: '12px',
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#f9f9f9',
              borderRadius: '6px'
            }}>
              {post.stats.filter((stat) => stat.label !== 'Overall').map((stat, idx) => (
                <div key={idx} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#8e8e8e', marginBottom: '4px' }}>
                    {stat.label}
                  </div>
                  {typeof stat.value === 'number' ? (
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: getRatingColor(stat.value),
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span>{formatSignedRating(stat.value)}</span>
                      <span style={{ lineHeight: 1 }}>★</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#262626' }}>
                      {stat.value}
                    </div>
                  )}
                </div>
              ))}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#8e8e8e', marginBottom: '4px' }}>
                  Total Rating
                </div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: getRatingColor(totalRatingValue),
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span>{formatSignedRating(totalRatingValue)}</span>
                  <span style={{ lineHeight: 1 }}>★</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #dbdbdb' }}>
            <button 
              onClick={handleLike}
              style={{ ...actionIconButtonStyle, opacity: liked ? 1 : 0.8 }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {renderHeartIcon()}
            </button>
            <button
              style={actionIconButtonStyle}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {renderCommentIcon()}
            </button>
          </div>

          <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>
            {likes.length} {likes.length === 1 ? 'like' : 'likes'}
          </div>

          {/* Comments */}
          {comments.length > 0 && (
            <div style={{ marginBottom: '12px', maxHeight: '150px', overflowY: 'auto' }}>
              {comments.map((comment) => (
                <div key={comment._id} style={{ marginBottom: '4px', fontSize: '13px' }}>
                  <span style={{ fontWeight: '600' }}>{comment.user?.username || 'Deleted user'}</span>
                  {' '}{comment.text}
                </div>
              ))}
            </div>
          )}

          {/* Add Comment */}
          <form onSubmit={handleComment} style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                style={{
                  border: '1px solid #dbdbdb',
                  outline: 'none',
                  flex: 1,
                  fontSize: '13px',
                  padding: '8px 12px',
                  borderRadius: '4px'
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0095f6',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
                disabled={!commentText.trim()}
              >
                Post
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (isUnboxing) {
    return (
      <div className="card" style={{ marginBottom: '24px', fontFamily: "'Poppins', sans-serif" }}>
        {/* Unboxing Header */}
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '12px', color: '#8e8e8e', fontWeight: '500' }}>
                UNBOXING • {post.category || 'Uncategorized'}
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '6px 0 0 0' }}>
                {post.title}
              </h3>
            </div>
            <UserChip
              user={post.user as any}
              avatarSize={40}
              containerStyle={{ flexDirection: 'column', gap: '4px' }}
              textContainerStyle={{ alignItems: 'center' }}
              primaryStyle={{ fontSize: '11px', fontWeight: '500' }}
            />
          </div>
        </div>

        {/* Unboxing Image */}
        {post.image && (
          <div style={{ width: '100%', height: '300px', backgroundColor: '#f0f0f0' }}>
            <img
              src={post.image}
              alt={post.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Unboxing Content */}
        <div style={{ padding: '16px' }}>
          {/* Unboxing Text */}
          {post.caption && (
            <div style={{ marginBottom: '16px', lineHeight: '1.5', fontSize: '14px' }}>
              {post.caption}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #dbdbdb' }}>
            <button 
              onClick={handleLike}
              style={{ ...actionIconButtonStyle, opacity: liked ? 1 : 0.8 }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {renderHeartIcon()}
            </button>
            <button
              style={actionIconButtonStyle}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {renderCommentIcon()}
            </button>
          </div>

          <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>
            {post.likes.length} {post.likes.length === 1 ? 'like' : 'likes'}
          </div>

          {/* Comments */}
          {post.comments.length > 0 && (
            <div style={{ marginBottom: '12px', maxHeight: '150px', overflowY: 'auto' }}>
              {post.comments.map((comment) => (
                <div key={comment._id} style={{ marginBottom: '4px', fontSize: '13px' }}>
                  <span style={{ fontWeight: '600' }}>{comment.user.username}</span>
                  {' '}{comment.text}
                </div>
              ))}
            </div>
          )}

          {/* Add Comment */}
          <form onSubmit={handleComment} style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                style={{
                  border: '1px solid #dbdbdb',
                  outline: 'none',
                  flex: 1,
                  fontSize: '13px',
                  padding: '8px 12px',
                  borderRadius: '4px'
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0095f6',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
                disabled={!commentText.trim()}
              >
                Post
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Default/General post layout
  return (
    <div className="card" style={{ marginBottom: '24px', fontFamily: "'Poppins', sans-serif" }}>
      {/* Post Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px' }}>
        <UserChip user={post.user as any} avatarSize={32} />
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
          <button
            onClick={handleLike}
            style={{ ...actionIconButtonStyle, opacity: liked ? 1 : 0.8 }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {renderHeartIcon()}
          </button>
          <button
            style={actionIconButtonStyle}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {renderCommentIcon()}
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
            style={{
              background: 'none',
              border: 'none',
              color: '#0095f6',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer'
            }}
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
