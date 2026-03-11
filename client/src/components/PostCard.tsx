import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Post } from '../types';
import UserChip from './UserChip';
import UserAvatar from './UserAvatar';
import { formatRichTextToHtml } from '../utils/richText';
import { useAuth } from '../hooks/useAuth';

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

const getEntityId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const record = value as { id?: string; _id?: string };
    return record.id || record._id || '';
  }
  return '';
};

const normalizeTagToken = (value: string) => value.trim().replace(/^#+/, '').toLowerCase();

const extractCaptionTags = (caption: string) => {
  if (!caption || typeof caption !== 'string') return [];

  const tags = new Set<string>();
  const regex = /(^|\s)#([a-z0-9][a-z0-9_-]{0,39})/gi;
  let match = regex.exec(caption);

  while (match) {
    const token = normalizeTagToken(match[2] || '');
    if (token) {
      tags.add(token);
    }
    match = regex.exec(caption);
  }

  return Array.from(tags);
};

const PostCard: React.FC<PostCardProps> = ({ post, onLike, onComment }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isBanned = Boolean(user?.isBanned);
  const [commentText, setCommentText] = React.useState('');
  const [liked, setLiked] = React.useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = React.useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = React.useState(0);
  const [mediaOrientationByIndex, setMediaOrientationByIndex] = React.useState<Record<number, 'portrait' | 'landscape' | 'square'>>({});
  const [isMediaOverlayOpen, setIsMediaOverlayOpen] = React.useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = React.useState(false);
  const [isFullReviewModalOpen, setIsFullReviewModalOpen] = React.useState(false);
  const [overlayPostTransitionDirection, setOverlayPostTransitionDirection] = React.useState<'next' | 'prev' | null>(null);
  const mediaCarouselRef = React.useRef<HTMLDivElement>(null);
  const overlayCarouselRef = React.useRef<HTMLDivElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const overlayTouchStartXRef = React.useRef<number | null>(null);
  const overlayTouchStartYRef = React.useRef<number | null>(null);
  const overlayTouchStartMediaIndexRef = React.useRef<number | null>(null);
  const overlayGestureLockUntilRef = React.useRef(0);
  const overlayHorizontalClampRangeRef = React.useRef<{ minIndex: number; maxIndex: number } | null>(null);
  const overlayHorizontalSettleTimerRef = React.useRef<number | null>(null);
  const overlayPostTransitionTimerRef = React.useRef<number | null>(null);
  const overlayPostTransitionInProgressRef = React.useRef(false);
  const wasMediaOverlayOpenRef = React.useRef(false);
  const likes = Array.isArray(post.likes) ? post.likes : [];
  const comments = Array.isArray(post.comments) ? post.comments : [];
  const postUser = post.user || ({ username: 'Deleted user' } as any);
  const postUserId = getEntityId(post.user);
  const postCategory = post.category === 'Places' ? 'Establishment' : post.category;
  const formattedCaptionHtml = React.useMemo(() => formatRichTextToHtml(post.caption || ''), [post.caption]);
  const businessDisplayName = React.useMemo(() => {
    const businessValue = [post.shopName, post.subjectName]
      .find((value) => typeof value === 'string' && value.trim());

    return businessValue ? businessValue.trim() : '';
  }, [post.shopName, post.subjectName]);
  const postTagTokens = React.useMemo(() => {
    const tags = new Set<string>();

    if (Array.isArray(post.tags)) {
      post.tags.forEach((tag) => {
        const normalized = normalizeTagToken(String(tag || ''));
        if (normalized) {
          tags.add(normalized);
        }
      });
    }

    extractCaptionTags(post.caption || '').forEach((tag) => tags.add(tag));
    return Array.from(tags).slice(0, 10);
  }, [post.tags, post.caption]);

  const openPostUserProfile = () => {
    if (!postUserId) return;
    navigate(`/profile/${postUserId}`);
  };

  const openTagList = (tag: string) => {
    const normalized = normalizeTagToken(tag);
    if (!normalized) return;
    navigate(`/list?mode=tag&value=${encodeURIComponent(normalized)}`);
  };

  const openBusinessList = (businessName: string) => {
    const normalized = businessName.trim();
    if (!normalized) return;
    navigate(`/list?mode=business&value=${encodeURIComponent(normalized)}`);
  };

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
    const justOpened = isMediaOverlayOpen && !wasMediaOverlayOpenRef.current;
    wasMediaOverlayOpenRef.current = isMediaOverlayOpen;

    if (!justOpened || !overlayCarouselRef.current) return;

    const target = overlayCarouselRef.current;
    const left = activeMediaIndex * target.clientWidth;

    const frame = requestAnimationFrame(() => {
      target.scrollTo({ left, behavior: 'auto' });
    });

    return () => cancelAnimationFrame(frame);
  }, [isMediaOverlayOpen, activeMediaIndex]);

  React.useEffect(() => {
    return () => {
      if (overlayHorizontalSettleTimerRef.current !== null) {
        window.clearTimeout(overlayHorizontalSettleTimerRef.current);
        overlayHorizontalSettleTimerRef.current = null;
      }

      if (overlayPostTransitionTimerRef.current !== null) {
        window.clearTimeout(overlayPostTransitionTimerRef.current);
        overlayPostTransitionTimerRef.current = null;
      }
    };
  }, []);

  const resetOverlayHorizontalSnapState = () => {
    overlayHorizontalClampRangeRef.current = null;
    if (overlayHorizontalSettleTimerRef.current !== null) {
      window.clearTimeout(overlayHorizontalSettleTimerRef.current);
      overlayHorizontalSettleTimerRef.current = null;
    }
  };

  const resetOverlayPostTransitionState = () => {
    overlayPostTransitionInProgressRef.current = false;
    setOverlayPostTransitionDirection(null);
    if (overlayPostTransitionTimerRef.current !== null) {
      window.clearTimeout(overlayPostTransitionTimerRef.current);
      overlayPostTransitionTimerRef.current = null;
    }
  };

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
    if (isBanned) return;
    setLiked(!liked);
    onLike(post._id);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBanned) return;
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
    resetOverlayPostTransitionState();
    resetOverlayHorizontalSnapState();
    setIsMediaOverlayOpen(false);
    setIsFullReviewModalOpen(false);
    setIsCommentsModalOpen(true);
  };

  const closeMediaOverlay = () => {
    resetOverlayPostTransitionState();
    resetOverlayHorizontalSnapState();
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
    resetOverlayPostTransitionState();
    resetOverlayHorizontalSnapState();
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

  const tryAcquireOverlayGestureLock = () => {
    const now = Date.now();
    if (now < overlayGestureLockUntilRef.current) return false;
    overlayGestureLockUntilRef.current = now + 60;
    return true;
  };

  const scrollOverlayToMediaIndex = (index: number, behavior: ScrollBehavior = 'smooth') => {
    if (!overlayCarouselRef.current) return;

    overlayCarouselRef.current.scrollTo({
      left: index * overlayCarouselRef.current.clientWidth,
      behavior
    });

    setActiveMediaIndex(index);
  };

  const openAdjacentOverlayMedia = (direction: 'next' | 'prev') => {
    if (mediaItems.length <= 1) return false;

    const nextIndex = direction === 'next'
      ? Math.min(mediaItems.length - 1, activeMediaIndex + 1)
      : Math.max(0, activeMediaIndex - 1);

    if (nextIndex === activeMediaIndex) return false;

    scrollOverlayToMediaIndex(nextIndex, 'smooth');
    return true;
  };

  const snapOverlayMediaWithinRange = (minAllowedIndex: number, maxAllowedIndex: number) => {
    if (!overlayCarouselRef.current || mediaItems.length <= 1) return;

    const { scrollLeft, clientWidth } = overlayCarouselRef.current;
    if (!clientWidth) return;

    const rawIndex = Math.round(scrollLeft / clientWidth);
    const boundedRawIndex = Math.max(0, Math.min(mediaItems.length - 1, rawIndex));
    const clampedIndex = Math.max(minAllowedIndex, Math.min(maxAllowedIndex, boundedRawIndex));

    scrollOverlayToMediaIndex(clampedIndex, 'smooth');
  };

  const scheduleOverlayHorizontalSnap = () => {
    if (!overlayHorizontalClampRangeRef.current) return;

    if (overlayHorizontalSettleTimerRef.current !== null) {
      window.clearTimeout(overlayHorizontalSettleTimerRef.current);
    }

    overlayHorizontalSettleTimerRef.current = window.setTimeout(() => {
      overlayHorizontalSettleTimerRef.current = null;

      const activeRange = overlayHorizontalClampRangeRef.current;
      if (!activeRange) return;

      overlayHorizontalClampRangeRef.current = null;
      snapOverlayMediaWithinRange(activeRange.minIndex, activeRange.maxIndex);
    }, 90);
  };

  const triggerAdjacentPostWithTransition = (direction: 'next' | 'prev') => {
    if (overlayPostTransitionInProgressRef.current) return;

    overlayPostTransitionInProgressRef.current = true;
    setOverlayPostTransitionDirection(direction);

    if (overlayPostTransitionTimerRef.current !== null) {
      window.clearTimeout(overlayPostTransitionTimerRef.current);
    }

    overlayPostTransitionTimerRef.current = window.setTimeout(() => {
      overlayPostTransitionTimerRef.current = null;
      overlayPostTransitionInProgressRef.current = false;
      setOverlayPostTransitionDirection(null);
      scrollAdjacentPost(direction);
    }, 120);
  };

  const handleOverlayTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    resetOverlayHorizontalSnapState();
    overlayTouchStartXRef.current = event.touches[0]?.clientX ?? null;
    overlayTouchStartYRef.current = event.touches[0]?.clientY ?? null;
    overlayTouchStartMediaIndexRef.current = activeMediaIndex;
  };

  const handleOverlayTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (overlayTouchStartXRef.current === null || overlayTouchStartYRef.current === null) return;

    const endX = event.changedTouches[0]?.clientX ?? overlayTouchStartXRef.current;
    const deltaX = overlayTouchStartXRef.current - endX;

    const endY = event.changedTouches[0]?.clientY ?? overlayTouchStartYRef.current;
    const deltaY = overlayTouchStartYRef.current - endY;
    const startMediaIndex = overlayTouchStartMediaIndexRef.current ?? activeMediaIndex;
    overlayTouchStartXRef.current = null;
    overlayTouchStartYRef.current = null;
    overlayTouchStartMediaIndexRef.current = null;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) < 16) return;

      const minAllowedIndex = Math.max(0, startMediaIndex - 1);
      const maxAllowedIndex = Math.min(mediaItems.length - 1, startMediaIndex + 1);
      overlayHorizontalClampRangeRef.current = {
        minIndex: minAllowedIndex,
        maxIndex: maxAllowedIndex
      };
      scheduleOverlayHorizontalSnap();
      return;
    }

    if (Math.abs(deltaY) < 60) return;
    if (!tryAcquireOverlayGestureLock()) return;

    if (deltaY > 0) {
      triggerAdjacentPostWithTransition('next');
    } else {
      triggerAdjacentPostWithTransition('prev');
    }
  };

  const handleOverlayWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const isHorizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);

    if (isHorizontal) {
      if (Math.abs(event.deltaX) < 24) return;
      if (!tryAcquireOverlayGestureLock()) return;

      if (event.deltaX > 0) {
        openAdjacentOverlayMedia('next');
      } else {
        openAdjacentOverlayMedia('prev');
      }
      return;
    }

    if (Math.abs(event.deltaY) < 24) return;
    if (!tryAcquireOverlayGestureLock()) return;

    if (event.deltaY > 0) {
      triggerAdjacentPostWithTransition('next');
    } else {
      triggerAdjacentPostWithTransition('prev');
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

    if (overlayHorizontalClampRangeRef.current) {
      scheduleOverlayHorizontalSnap();
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
        className={`post-media-overlay${overlayPostTransitionDirection ? ` post-media-overlay--post-transition-${overlayPostTransitionDirection}` : ''}`}
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
                  onClick={() => scrollOverlayToMediaIndex(index, 'auto')}
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
              {post.caption ? (
                <div
                  className="post-review-modal-text"
                  dangerouslySetInnerHTML={{ __html: formattedCaptionHtml }}
                />
              ) : (
                <p className="post-review-modal-text">No review text provided.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderInlineCommentInput = () => (
    <form
      onSubmit={handleCommentSubmit}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '8px'
      }}
    >
      <input
        type="text"
        placeholder={isBanned ? 'Comments are disabled for banned users' : 'Add a comment...'}
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        disabled={isBanned}
        style={{
          flex: 1,
          height: '36px',
          border: '1px solid var(--brand-border)',
          borderRadius: '8px',
          padding: '0 10px',
          fontSize: '13px',
          outline: 'none',
          fontFamily: "'Poppins', sans-serif"
        }}
      />
      <button
        type="submit"
        disabled={isBanned || !commentText.trim()}
        title={isBanned ? 'Banned users cannot like or comment' : undefined}
        style={{
          border: 'none',
          background: 'none',
          color: !isBanned && commentText.trim() ? 'var(--brand-pop)' : 'var(--brand-primary)',
          fontWeight: 600,
          fontSize: '13px',
          cursor: !isBanned && commentText.trim() ? 'pointer' : 'not-allowed'
        }}
      >
        Post
      </button>
    </form>
  );

  const renderCommentPreview = () => {
    if (comments.length === 0) {
      return (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', color: 'var(--brand-primary)' }}>
            No comments yet
          </div>
          {renderInlineCommentInput()}
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
            disabled={isBanned}
            title={isBanned ? 'Banned users cannot like or comment' : undefined}
            style={{
              border: 'none',
              background: 'none',
              padding: 0,
              color: 'var(--brand-primary)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: isBanned ? 'not-allowed' : 'pointer',
              opacity: isBanned ? 0.45 : 1
            }}
          >
            View all {comments.length} comments
          </button>
        )}
      </div>
    );
  };

  const renderListFilters = () => {
    if (!businessDisplayName && postTagTokens.length === 0) {
      return null;
    }

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
        {businessDisplayName && (
          <button
            type="button"
            onClick={() => openBusinessList(businessDisplayName)}
            style={{
              border: '1px solid var(--brand-border)',
              borderRadius: '999px',
              background: '#ffffff',
              color: 'var(--brand-accent)',
              fontSize: '11px',
              fontWeight: 600,
              padding: '5px 10px',
              cursor: 'pointer'
            }}
          >
            {businessDisplayName}
          </button>
        )}

        {postTagTokens.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => openTagList(tag)}
            style={{
              border: '1px solid var(--brand-border)',
              borderRadius: '999px',
              background: 'var(--brand-bg)',
              color: 'var(--brand-accent)',
              fontSize: '11px',
              fontWeight: 600,
              padding: '5px 10px',
              cursor: 'pointer'
            }}
          >
            #{tag}
          </button>
        ))}
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
              placeholder={isBanned ? 'Comments are disabled for banned users' : 'Add a comment...'}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="post-comments-modal-input"
              disabled={isBanned}
            />
            <button
              type="submit"
              className="post-comments-modal-submit"
              disabled={isBanned || !commentText.trim()}
              title={isBanned ? 'Banned users cannot like or comment' : undefined}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '12px', color: 'var(--brand-primary)', fontWeight: '500' }}>
                REVIEW • {postCategory || 'Uncategorized'}
              </span>

              {typeof post.rating === 'number' && (
                <div style={{ marginTop: '6px' }}>
                  {renderStars(post.rating)}
                </div>
              )}
            </div>
            <UserChip
              user={postUser as any}
              onClick={postUserId ? openPostUserProfile : undefined}
              ariaLabel={`Open ${postUser.username || 'User'} profile`}
              avatarSize={40}
              containerStyle={{ flexDirection: 'column', gap: '4px' }}
              textContainerStyle={{ alignItems: 'center' }}
              primaryStyle={{ fontSize: '11px', fontWeight: '500' }}
            />
          </div>

          <h3
            title={post.title || ''}
            style={{
              fontSize: '18px',
              fontWeight: '600',
              margin: '0 0 2px 0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {post.title}
          </h3>
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
              dangerouslySetInnerHTML={{ __html: formattedCaptionHtml }}
            />
          )}

          {renderListFilters()}

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
              disabled={isBanned}
              title={isBanned ? 'Banned users cannot like or comment' : undefined}
              style={{ ...actionIconButtonStyle, opacity: isBanned ? 0.45 : (liked ? 1 : 0.8), cursor: isBanned ? 'not-allowed' : 'pointer' }}
              onMouseEnter={(e) => {
                if (isBanned) return;
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {renderHeartIcon()}
            </button>
            <button
              style={{ ...actionIconButtonStyle, opacity: isBanned ? 0.45 : 1, cursor: isBanned ? 'not-allowed' : 'pointer' }}
              onClick={openCommentsModal}
              disabled={isBanned}
              title={isBanned ? 'Banned users cannot like or comment' : undefined}
              onMouseEnter={(e) => {
                if (isBanned) return;
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
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
                UNBOXING • {postCategory || 'Uncategorized'}
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '6px 0 0 0' }}>
                {post.title}
              </h3>
            </div>
            <UserChip
              user={post.user as any}
              onClick={postUserId ? openPostUserProfile : undefined}
              ariaLabel={`Open ${postUser.username || 'User'} profile`}
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
              dangerouslySetInnerHTML={{ __html: formattedCaptionHtml }}
            />
          )}

          {renderListFilters()}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--brand-border)' }}>
            <button 
              onClick={handleLike}
              disabled={isBanned}
              title={isBanned ? 'Banned users cannot like or comment' : undefined}
              style={{ ...actionIconButtonStyle, opacity: isBanned ? 0.45 : (liked ? 1 : 0.8), cursor: isBanned ? 'not-allowed' : 'pointer' }}
              onMouseEnter={(e) => {
                if (isBanned) return;
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {renderHeartIcon()}
            </button>
            <button
              style={{ ...actionIconButtonStyle, opacity: isBanned ? 0.45 : 1, cursor: isBanned ? 'not-allowed' : 'pointer' }}
              onClick={openCommentsModal}
              disabled={isBanned}
              title={isBanned ? 'Banned users cannot like or comment' : undefined}
              onMouseEnter={(e) => {
                if (isBanned) return;
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
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
        <UserChip
          user={post.user as any}
          onClick={postUserId ? openPostUserProfile : undefined}
          ariaLabel={`Open ${postUser.username || 'User'} profile`}
          avatarSize={32}
        />
      </div>

      {/* Post Media */}
      {renderPostMedia('standard')}

      {/* Post Actions */}
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
          <button
            onClick={handleLike}
            disabled={isBanned}
            title={isBanned ? 'Banned users cannot like or comment' : undefined}
            style={{ ...actionIconButtonStyle, opacity: isBanned ? 0.45 : (liked ? 1 : 0.8), cursor: isBanned ? 'not-allowed' : 'pointer' }}
            onMouseEnter={(e) => {
              if (isBanned) return;
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {renderHeartIcon()}
          </button>
          <button
            style={{ ...actionIconButtonStyle, opacity: isBanned ? 0.45 : 1, cursor: isBanned ? 'not-allowed' : 'pointer' }}
            onClick={openCommentsModal}
            disabled={isBanned}
            title={isBanned ? 'Banned users cannot like or comment' : undefined}
            onMouseEnter={(e) => {
              if (isBanned) return;
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
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
            <span style={{ fontWeight: '600' }}>{postUser.username || 'Deleted user'}</span>
            {' '}
            <span dangerouslySetInnerHTML={{ __html: formattedCaptionHtml }} />
          </div>
        )}

        {renderListFilters()}

        {renderCommentPreview()}
      </div>
      {renderMediaOverlay()}
      {renderFullReviewModal()}
      {renderCommentsModal()}
    </div>
  );
};

export default PostCard;
