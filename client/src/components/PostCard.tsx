import React from 'react';
import { Post } from '../types';
import UserChip from './UserChip';
import UserAvatar from './UserAvatar';

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string, text: string) => void;
}

type PostMediaItem = {
  url: string;
  kind: 'image' | 'video';
};

const OPEN_OVERLAY_EVENT = 'instrevi-open-overlay-for-post';

const PostCard: React.FC<PostCardProps> = ({ post, onLike, onComment }) => {
  const [commentText, setCommentText] = React.useState('');
  const [liked, setLiked] = React.useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = React.useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = React.useState(0);
  const [mediaOrientationByIndex, setMediaOrientationByIndex] = React.useState<Record<number, 'portrait' | 'landscape' | 'square'>>({});
  const [isMediaOverlayOpen, setIsMediaOverlayOpen] = React.useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = React.useState(false);
  const [isFullReviewModalOpen, setIsFullReviewModalOpen] = React.useState(false);
  const mediaCarouselRef = React.useRef<HTMLDivElement>(null);
  const overlayCarouselRef = React.useRef<HTMLDivElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const overlayTouchStartXRef = React.useRef<number | null>(null);
  const overlayTouchStartYRef = React.useRef<number | null>(null);
  const likes = Array.isArray(post.likes) ? post.likes : [];
  const comments = Array.isArray(post.comments) ? post.comments : [];
  const postUser = post.user || ({ username: 'Deleted user' } as any);

  const mediaItems = React.useMemo<PostMediaItem[]>(() => {
    const items: PostMediaItem[] = [];
    const seen = new Set<string>();
    const imageList = Array.isArray(post.images) ? post.images : [];
    const videoList = Array.isArray(post.videos) ? post.videos : [];

    const declaredVideoUrls = new Set<string>();
    if (post.video) declaredVideoUrls.add(post.video);
    videoList.forEach((url) => {
      if (url) declaredVideoUrls.add(url);
    });

    const addMedia = (url?: string, preferredKind?: 'image' | 'video') => {
      if (!url || seen.has(url)) return;

      const kind = preferredKind || (declaredVideoUrls.has(url) ? 'video' : 'image');
      seen.add(url);
      items.push({ url, kind });
    };

    addMedia(post.image);
    imageList.forEach((url) => addMedia(url, 'image'));
    addMedia(post.video, 'video');
    videoList.forEach((url) => addMedia(url, 'video'));

    return items;
  }, [post.image, post.images, post.video, post.videos]);

  React.useEffect(() => {
    setActiveMediaIndex(0);
    setMediaOrientationByIndex({});
    setIsMediaOverlayOpen(false);
    setIsCommentsModalOpen(false);
    setIsFullReviewModalOpen(false);
    setIsCaptionExpanded(false);
    setCommentText('');
  }, [post._id]);

  React.useEffect(() => {
    if (activeMediaIndex >= mediaItems.length) {
      setActiveMediaIndex(0);
    }
  }, [activeMediaIndex, mediaItems.length]);

  React.useEffect(() => {
    if (!isMediaOverlayOpen || !overlayCarouselRef.current) return;

    const target = overlayCarouselRef.current;
    const left = activeMediaIndex * target.clientWidth;

    const frame = requestAnimationFrame(() => {
      target.scrollTo({ left, behavior: 'auto' });
    });

    return () => cancelAnimationFrame(frame);
  }, [isMediaOverlayOpen, activeMediaIndex]);

  const actionIconButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    color: 'var(--brand-accent)'
  };

  const renderHeartIcon = () => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={liked ? '#ed4956' : 'none'}
      stroke={liked ? '#ed4956' : 'var(--brand-accent)'}
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
      stroke="var(--brand-accent)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );

  const renderShareIcon = () => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--brand-accent)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );

  const handleLike = () => {
    setLiked(!liked);
    onLike(post._id);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      onComment(post._id, commentText);
      setCommentText('');
    }
  };

  const handleSharePost = async () => {
    const shareUrl = `${window.location.origin}/feed#${post._id}`;
    const shareTitle = post.title || 'Instrevi';
    const shareText = post.caption || 'Check out this post on Instrevi';

    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Share failed:', error);
      }
    }
  };

  const openCommentsModal = () => {
    setIsMediaOverlayOpen(false);
    setIsFullReviewModalOpen(false);
    setIsCommentsModalOpen(true);
  };

  const closeMediaOverlay = () => {
    setIsMediaOverlayOpen(false);
    setIsFullReviewModalOpen(false);
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

  const updateMediaOrientationForIndex = (index: number, width: number, height: number) => {
    if (!width || !height) return;

    const orientation: 'portrait' | 'landscape' | 'square' =
      width === height ? 'square' : width > height ? 'landscape' : 'portrait';

    setMediaOrientationByIndex((prev) => {
      if (prev[index] === orientation) return prev;
      return { ...prev, [index]: orientation };
    });
  };

  const handleMediaCarouselScroll = () => {
    if (!mediaCarouselRef.current) return;

    const { scrollLeft, clientWidth } = mediaCarouselRef.current;
    if (!clientWidth) return;

    const nextIndex = Math.round(scrollLeft / clientWidth);
    if (nextIndex !== activeMediaIndex) {
      setActiveMediaIndex(nextIndex);
    }
  };

  const scrollToMediaIndex = (index: number) => {
    if (!mediaCarouselRef.current) return;

    mediaCarouselRef.current.scrollTo({
      left: index * mediaCarouselRef.current.clientWidth,
      behavior: 'smooth'
    });

    setActiveMediaIndex(index);
  };

  const activeMedia = mediaItems[activeMediaIndex] || null;

  const openMediaOverlay = (index = activeMediaIndex) => {
    if (mediaItems.length === 0) return;

    const boundedIndex = Math.min(mediaItems.length - 1, Math.max(0, index));
    setActiveMediaIndex(boundedIndex);
    setIsCommentsModalOpen(false);
    setIsFullReviewModalOpen(false);
    setIsMediaOverlayOpen(true);
  };

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOpenOverlayForPost = (event: Event) => {
      const customEvent = event as CustomEvent<{ postId?: string; mediaIndex?: number }>;
      if (customEvent.detail?.postId !== post._id) return;
      if (mediaItems.length === 0) return;

      const boundedIndex = Math.min(
        mediaItems.length - 1,
        Math.max(0, customEvent.detail?.mediaIndex ?? 0)
      );

      setActiveMediaIndex(boundedIndex);
      setIsCommentsModalOpen(false);
      setIsFullReviewModalOpen(false);
      setIsMediaOverlayOpen(true);
    };

    window.addEventListener(OPEN_OVERLAY_EVENT, handleOpenOverlayForPost as EventListener);

    return () => {
      window.removeEventListener(OPEN_OVERLAY_EVENT, handleOpenOverlayForPost as EventListener);
    };
  }, [post._id, mediaItems.length]);

  const getOrientationClassName = () => {
    const mediaOrientation = mediaOrientationByIndex[activeMediaIndex] || 'portrait';

    return mediaOrientation === 'landscape'
      ? 'post-media-frame--landscape-media'
      : mediaOrientation === 'square'
        ? 'post-media-frame--square-media'
        : 'post-media-frame--portrait-media';
  };

  const handleMediaFrameClick = () => {
    openMediaOverlay();
  };

  const handleMediaFrameKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openMediaOverlay();
    }
  };

  const scrollAdjacentPost = (direction: 'next' | 'prev') => {
    if (!cardRef.current) return;

    let sibling = direction === 'next'
      ? cardRef.current.nextElementSibling
      : cardRef.current.previousElementSibling;

    while (sibling) {
      if (
        sibling instanceof HTMLElement
        && sibling.classList.contains('card')
        && sibling.getAttribute('data-has-media') === 'true'
      ) {
        break;
      }

      sibling = direction === 'next' ? sibling.nextElementSibling : sibling.previousElementSibling;
    }

    if (sibling instanceof HTMLElement) {
      const siblingPostId = sibling.getAttribute('data-post-id');

      if (typeof window !== 'undefined' && siblingPostId) {
        window.dispatchEvent(
          new CustomEvent(OPEN_OVERLAY_EVENT, {
            detail: {
              postId: siblingPostId,
              mediaIndex: 0
            }
          })
        );
      }

      setIsMediaOverlayOpen(false);
      setIsFullReviewModalOpen(false);
      sibling.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleOverlayTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    overlayTouchStartXRef.current = event.touches[0]?.clientX ?? null;
    overlayTouchStartYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleOverlayTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (overlayTouchStartXRef.current === null || overlayTouchStartYRef.current === null) return;

    const endX = event.changedTouches[0]?.clientX ?? overlayTouchStartXRef.current;
    const deltaX = overlayTouchStartXRef.current - endX;

    const endY = event.changedTouches[0]?.clientY ?? overlayTouchStartYRef.current;
    const deltaY = overlayTouchStartYRef.current - endY;
    overlayTouchStartXRef.current = null;
    overlayTouchStartYRef.current = null;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return;
    }

    if (Math.abs(deltaY) < 60) return;

    if (deltaY > 0) {
      scrollAdjacentPost('next');
    } else {
      scrollAdjacentPost('prev');
    }
  };

  const handleOverlayWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaY) < 24) return;

    if (event.deltaY > 0) {
      scrollAdjacentPost('next');
    } else {
      scrollAdjacentPost('prev');
    }
  };

  const handleOverlayCarouselScroll = () => {
    if (!overlayCarouselRef.current) return;

    const { scrollLeft, clientWidth } = overlayCarouselRef.current;
    if (!clientWidth) return;

    const nextIndex = Math.round(scrollLeft / clientWidth);
    if (nextIndex !== activeMediaIndex) {
      setActiveMediaIndex(nextIndex);
    }
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

  const renderPostMedia = (size: 'standard' | 'compact') => {
    if (mediaItems.length === 0) {
      return null;
    }

    const orientationClassName = getOrientationClassName();

    const frameClassName = `post-media-frame ${size === 'compact' ? 'post-media-frame--compact' : 'post-media-frame--standard'} ${orientationClassName} ${mediaItems.length > 1 ? 'post-media-frame--carousel' : ''} post-media-frame--tapable`;

    const frameInteractionProps: React.HTMLAttributes<HTMLDivElement> = {
      onClick: handleMediaFrameClick,
      onKeyDown: handleMediaFrameKeyDown,
      role: 'button',
      tabIndex: 0,
      'aria-label': 'Open media fullscreen'
    };

    return (
      <div className="post-media-section">
        <div className={frameClassName} {...frameInteractionProps}>
          <div
            ref={mediaCarouselRef}
            className="post-media-carousel"
            onScroll={handleMediaCarouselScroll}
          >
            {mediaItems.map((item, index) => (
              <div key={`${item.url}-${index}`} className="post-media-slide">
                {item.kind === 'video' ? (
                  <video
                    src={item.url}
                    playsInline
                    preload="metadata"
                    className="post-media-asset"
                    onLoadedMetadata={(event) => {
                      updateMediaOrientationForIndex(index, event.currentTarget.videoWidth, event.currentTarget.videoHeight);
                    }}
                  />
                ) : (
                  <img
                    src={item.url}
                    alt={post.title || post.caption || 'Post media'}
                    className="post-media-asset"
                    onLoad={(event) => {
                      updateMediaOrientationForIndex(index, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight);
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {mediaItems.length > 1 && (
          <div className="post-media-dots" aria-label={`Media ${activeMediaIndex + 1} of ${mediaItems.length}`}>
            {mediaItems.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => scrollToMediaIndex(index)}
                className={`post-media-dot ${index === activeMediaIndex ? 'active' : ''}`}
                aria-label={`Go to media ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderMediaOverlay = () => {
    if (!isMediaOverlayOpen || !activeMedia) return null;

    const overlayTitle =
      (typeof post.title === 'string' && post.title.trim())
        ? post.title.trim()
        : post.postType
          ? `${post.postType.charAt(0).toUpperCase()}${post.postType.slice(1)} post`
          : 'Post';

    return (
      <div
        className="post-media-overlay"
        onClick={closeMediaOverlay}
        onTouchStart={handleOverlayTouchStart}
        onTouchEnd={handleOverlayTouchEnd}
        onWheel={handleOverlayWheel}
      >
        <button
          type="button"
          className="post-media-overlay-close"
          aria-label="Close fullscreen media"
          onClick={closeMediaOverlay}
        >
          ×
        </button>
        <div className="post-media-overlay-content" onClick={(event) => event.stopPropagation()}>
          <div className="post-media-overlay-meta">
            <UserAvatar user={postUser as any} size={34} />
            <div className="post-media-overlay-meta-text">
              <span className="post-media-overlay-meta-user">{postUser.username || 'Deleted user'}</span>
              <span className="post-media-overlay-meta-title">{overlayTitle}</span>
            </div>
          </div>

          <div
            ref={overlayCarouselRef}
            className="post-media-overlay-carousel"
            onScroll={handleOverlayCarouselScroll}
          >
            {mediaItems.map((item, index) => (
              <div key={`${item.url}-overlay-${index}`} className="post-media-overlay-slide">
                {item.kind === 'video' ? (
                  <video
                    src={item.url}
                    controls
                    autoPlay={index === activeMediaIndex}
                    playsInline
                    preload="metadata"
                    className="post-media-overlay-asset"
                  />
                ) : (
                  <img
                    src={item.url}
                    alt={post.title || post.caption || 'Post media'}
                    className="post-media-overlay-asset"
                  />
                )}
              </div>
            ))}
          </div>

          {mediaItems.length > 1 && (
            <div className="post-media-overlay-dots" aria-label={`Fullscreen media ${activeMediaIndex + 1} of ${mediaItems.length}`}>
              {mediaItems.map((_, index) => (
                <button
                  key={`overlay-dot-${index}`}
                  type="button"
                  className={`post-media-dot ${index === activeMediaIndex ? 'active' : ''}`}
                  onClick={() => {
                    if (!overlayCarouselRef.current) return;
                    overlayCarouselRef.current.scrollTo({
                      left: index * overlayCarouselRef.current.clientWidth,
                      behavior: 'smooth'
                    });
                    setActiveMediaIndex(index);
                  }}
                  aria-label={`Go to fullscreen media ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className="post-media-overlay-review-btn"
          onClick={(event) => {
            event.stopPropagation();
            setIsFullReviewModalOpen(true);
          }}
        >
          View full review
        </button>
      </div>
    );
  };

  const renderFullReviewModal = () => {
    if (!isFullReviewModalOpen) return null;

    return (
      <div className="post-review-modal" onClick={() => setIsFullReviewModalOpen(false)}>
        <div className="post-review-modal-panel" onClick={(event) => event.stopPropagation()}>
          <div className="post-review-modal-header">
            <h3>Full Review Details</h3>
            <button
              type="button"
              className="post-review-modal-close"
              onClick={() => setIsFullReviewModalOpen(false)}
              aria-label="Close full review"
            >
              ×
            </button>
          </div>

          <div className="post-review-modal-content">
            <div className="post-review-modal-row">
              <span className="post-review-modal-label">Type</span>
              <span className="post-review-modal-value">{post.postType}</span>
            </div>

            {post.category && (
              <div className="post-review-modal-row">
                <span className="post-review-modal-label">Category</span>
                <span className="post-review-modal-value">{post.category}</span>
              </div>
            )}

            {post.title && (
              <div className="post-review-modal-row">
                <span className="post-review-modal-label">Title</span>
                <span className="post-review-modal-value">{post.title}</span>
              </div>
            )}

            <div className="post-review-modal-row">
              <span className="post-review-modal-label">Posted by</span>
              <span className="post-review-modal-value">{postUser.username || 'Deleted user'}</span>
            </div>

            {typeof post.rating === 'number' && (
              <div className="post-review-modal-row">
                <span className="post-review-modal-label">Rating</span>
                <span
                  className="post-review-modal-value"
                  style={{
                    color: getRatingColor(post.rating),
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{formatSignedRating(post.rating)}</span>
                  <span style={{ lineHeight: 1 }}>★</span>
                </span>
              </div>
            )}

            {post.stats && post.stats.length > 0 && (
              <div className="post-review-modal-block">
                <div className="post-review-modal-label">Stats</div>
                <div className="post-review-modal-stats">
                  {post.stats.map((stat, idx) => (
                    <div key={`${stat.label}-${idx}`} className="post-review-modal-stat-item">
                      <span>{stat.label}</span>
                      {typeof stat.value === 'number' ? (
                        <strong
                          style={{
                            color: getRatingColor(stat.value),
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span>{formatSignedRating(stat.value)}</span>
                          <span style={{ lineHeight: 1 }}>★</span>
                        </strong>
                      ) : (
                        <strong>{String(stat.value)}</strong>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="post-review-modal-block">
              <div className="post-review-modal-label">Review</div>
              <p className="post-review-modal-text">{post.caption || 'No review text provided.'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCommentPreview = () => {
    if (comments.length === 0) {
      return (
        <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--brand-primary)' }}>
          No comments yet
        </div>
      );
    }

    const firstComment = comments[0];

    return (
      <div style={{ marginBottom: '12px' }}>
        <div style={{ marginBottom: '6px', fontSize: '13px' }}>
          <span style={{ fontWeight: '600' }}>{firstComment.user?.username || 'Deleted user'}</span>
          {' '}{firstComment.text}
        </div>
        {comments.length > 1 && (
          <button
            type="button"
            onClick={openCommentsModal}
            style={{
              border: 'none',
              background: 'none',
              padding: 0,
              color: 'var(--brand-primary)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            View all {comments.length} comments
          </button>
        )}
      </div>
    );
  };

  const renderCommentsModal = () => {
    if (!isCommentsModalOpen) return null;

    return (
      <div className="post-comments-modal" onClick={() => setIsCommentsModalOpen(false)}>
        <div className="post-comments-modal-panel" onClick={(event) => event.stopPropagation()}>
          <div className="post-comments-modal-header">
            <h3>Comments</h3>
            <button
              type="button"
              className="post-comments-modal-close"
              onClick={() => setIsCommentsModalOpen(false)}
              aria-label="Close comments"
            >
              ×
            </button>
          </div>

          <div className="post-comments-modal-list">
            {comments.length === 0 ? (
              <div className="post-comments-empty">No comments yet</div>
            ) : (
              comments.map((comment) => (
                <div key={comment._id} className="post-comments-item">
                  <span className="post-comments-user">{comment.user?.username || 'Deleted user'}</span>
                  <span className="post-comments-text">{comment.text}</span>
                </div>
              ))
            )}
          </div>

          <form className="post-comments-modal-form" onSubmit={handleCommentSubmit}>
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="post-comments-modal-input"
            />
            <button
              type="submit"
              className="post-comments-modal-submit"
              disabled={!commentText.trim()}
            >
              Post
            </button>
          </form>
        </div>
      </div>
    );
  };

  if (isReview) {
    return (
      <div ref={cardRef} className="card" data-post-id={post._id} data-has-media={mediaItems.length > 0 ? 'true' : 'false'} style={{ fontFamily: "'Poppins', sans-serif" }}>
        {/* Review Header */}
        <div style={{ padding: '10px 16px 6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '12px', color: 'var(--brand-primary)', fontWeight: '500' }}>
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
          <div style={{ marginBottom: '8px' }}>
            {renderStars(post.rating)}
          </div>
        </div>

        {/* Review Media */}
        {renderPostMedia('compact')}

        {/* Review Content */}
        <div style={{ padding: '16px' }}>
          {/* Review Text */}
          {post.caption && (
            <div
              className={`post-review-caption ${isCaptionExpanded ? 'expanded' : 'collapsed'}`}
              onClick={() => setIsCaptionExpanded((prev) => !prev)}
              title={isCaptionExpanded ? 'Tap to collapse' : 'Tap to expand'}
            >
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
                  <div style={{ fontSize: '12px', color: 'var(--brand-primary)', marginBottom: '4px' }}>
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
                    <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--brand-accent)' }}>
                      {stat.value}
                    </div>
                  )}
                </div>
              ))}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--brand-primary)', marginBottom: '4px' }}>
                  Global rating
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
          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--brand-border)' }}>
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
              onClick={openCommentsModal}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {renderCommentIcon()}
            </button>
            <button
              style={actionIconButtonStyle}
              onClick={handleSharePost}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {renderShareIcon()}
            </button>
          </div>

          <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>
            {likes.length} {likes.length === 1 ? 'like' : 'likes'}
          </div>

          {renderCommentPreview()}
        </div>
        {renderMediaOverlay()}
        {renderFullReviewModal()}
        {renderCommentsModal()}
      </div>
    );
  }

  if (isUnboxing) {
    return (
      <div ref={cardRef} className="card" data-post-id={post._id} data-has-media={mediaItems.length > 0 ? 'true' : 'false'} style={{ fontFamily: "'Poppins', sans-serif" }}>
        {/* Unboxing Header */}
        <div style={{ padding: '10px 16px 6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '12px', color: 'var(--brand-primary)', fontWeight: '500' }}>
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

        {/* Unboxing Media */}
        {renderPostMedia('compact')}

        {/* Unboxing Content */}
        <div style={{ padding: '16px' }}>
          {/* Unboxing Text */}
          {post.caption && (
            <div
              className={`post-review-caption ${isCaptionExpanded ? 'expanded' : 'collapsed'}`}
              onClick={() => setIsCaptionExpanded((prev) => !prev)}
              title={isCaptionExpanded ? 'Tap to collapse' : 'Tap to expand'}
            >
              {post.caption}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--brand-border)' }}>
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
              onClick={openCommentsModal}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {renderCommentIcon()}
            </button>
            <button
              style={actionIconButtonStyle}
              onClick={handleSharePost}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {renderShareIcon()}
            </button>
          </div>

          <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>
            {post.likes.length} {post.likes.length === 1 ? 'like' : 'likes'}
          </div>

          {renderCommentPreview()}
        </div>
        {renderMediaOverlay()}
        {renderFullReviewModal()}
        {renderCommentsModal()}
      </div>
    );
  }

  // Default/General post layout
  return (
    <div ref={cardRef} className="card" data-post-id={post._id} data-has-media={mediaItems.length > 0 ? 'true' : 'false'} style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Post Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px 8px' }}>
        <UserChip user={post.user as any} avatarSize={32} />
      </div>

      {/* Post Media */}
      {renderPostMedia('standard')}

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
            onClick={openCommentsModal}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {renderCommentIcon()}
          </button>
          <button
            style={actionIconButtonStyle}
            onClick={handleSharePost}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {renderShareIcon()}
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

        {renderCommentPreview()}
      </div>
      {renderMediaOverlay()}
      {renderFullReviewModal()}
      {renderCommentsModal()}
    </div>
  );
};

export default PostCard;
