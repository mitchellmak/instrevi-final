import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Post } from '../types';
import { apiFetch } from '../utils/apiFetch';
import UserAvatar from '../components/UserAvatar';

type UserRef = {
  id?: string;
  _id?: string;
  username?: string;
  profilePicture?: string;
  bio?: string;
  followers?: Array<UserRef | string>;
  following?: Array<UserRef | string>;
  followersCount?: number;
  followingCount?: number;
};

type UserProfileResponse = {
  user?: UserRef;
  posts?: Post[];
};

type PostMediaItem = {
  url: string;
  kind: 'image' | 'video';
};

const PROFILE_POST_FILTER_STORAGE_KEY_PREFIX = 'instrevi-profile-post-filter';
const PROFILE_POSTS_PER_ROW_STORAGE_KEY_PREFIX = 'instrevi-profile-posts-per-row';

const getProfilePreferenceStorageKey = (prefix: string, profileUserId?: string) => {
  if (!profileUserId) return null;
  return `${prefix}:${profileUserId}`;
};

const getStoredProfilePostFilter = (profileUserId?: string): 'all' | 'review' | 'unboxing' => {
  if (typeof window === 'undefined') return 'all';

  const storageKey = getProfilePreferenceStorageKey(PROFILE_POST_FILTER_STORAGE_KEY_PREFIX, profileUserId);
  if (!storageKey) return 'all';

  try {
    const storedValue = window.localStorage.getItem(storageKey);
    if (storedValue === 'review' || storedValue === 'unboxing' || storedValue === 'all') {
      return storedValue;
    }
  } catch {
  }

  return 'all';
};

const getStoredProfilePostsPerRow = (profileUserId?: string): 2 | 3 | 4 => {
  if (typeof window === 'undefined') return 4;

  const storageKey = getProfilePreferenceStorageKey(PROFILE_POSTS_PER_ROW_STORAGE_KEY_PREFIX, profileUserId);
  if (!storageKey) return 4;

  try {
    const storedValue = Number(window.localStorage.getItem(storageKey));
    if (storedValue === 2 || storedValue === 3 || storedValue === 4) {
      return storedValue;
    }
  } catch {
  }

  return 4;
};

const Profile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();

  const [profileUser, setProfileUser] = useState<UserRef | null>(null);
  const [profilePosts, setProfilePosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePostIndex, setActivePostIndex] = useState<number | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [postFilter, setPostFilter] = useState<'all' | 'review' | 'unboxing'>(() => getStoredProfilePostFilter(userId));
  const [postsPerRow, setPostsPerRow] = useState<2 | 3 | 4>(() => getStoredProfilePostsPerRow(userId));
  const [overlayPostTransitionPhase, setOverlayPostTransitionPhase] = useState<'none' | 'out-next' | 'out-prev' | 'in-next' | 'in-prev'>('none');
  const overlayCarouselRef = useRef<HTMLDivElement>(null);
  const overlayTouchStartXRef = useRef<number | null>(null);
  const overlayTouchStartYRef = useRef<number | null>(null);
  const overlayTouchStartMediaIndexRef = useRef<number | null>(null);
  const overlayGestureLockUntilRef = useRef(0);
  const overlayHorizontalClampRangeRef = useRef<{ minIndex: number; maxIndex: number } | null>(null);
  const overlayHorizontalSettleTimerRef = useRef<number | null>(null);
  const overlayPostTransitionTimerRef = useRef<number | null>(null);
  const overlayPostTransitionInProgressRef = useRef(false);

  const visiblePosts = useMemo(
    () => {
      if (postFilter === 'review') {
        return profilePosts.filter((post) => post.postType === 'review');
      }

      if (postFilter === 'unboxing') {
        return profilePosts.filter((post) => post.postType === 'unboxing');
      }

      return profilePosts;
    },
    [profilePosts, postFilter]
  );

  const activePost = activePostIndex !== null ? visiblePosts[activePostIndex] || null : null;

  const activePostMediaItems = useMemo<PostMediaItem[]>(() => {
    if (!activePost) return [];

    const items: PostMediaItem[] = [];
    const seen = new Set<string>();

    const imageList = Array.isArray(activePost.images) ? activePost.images : [];
    const videoList = Array.isArray(activePost.videos) ? activePost.videos : [];

    const declaredVideoUrls = new Set<string>();
    if (activePost.video) declaredVideoUrls.add(activePost.video);
    videoList.forEach((url) => {
      if (url) declaredVideoUrls.add(url);
    });

    const addMedia = (url?: string, preferredKind?: 'image' | 'video') => {
      if (!url || seen.has(url)) return;
      const kind = preferredKind || (declaredVideoUrls.has(url) ? 'video' : 'image');
      seen.add(url);
      items.push({ url, kind });
    };

    addMedia(activePost.image);
    imageList.forEach((url) => addMedia(url, 'image'));
    addMedia(activePost.video, 'video');
    videoList.forEach((url) => addMedia(url, 'video'));

    return items;
  }, [activePost]);

  useEffect(() => {
    if (activePostIndex === null) return;
    if (activePostIndex >= visiblePosts.length) {
      setActivePostIndex(null);
      setActiveMediaIndex(0);
    }
  }, [activePostIndex, visiblePosts.length]);

  useEffect(() => {
    setActiveMediaIndex(0);
  }, [activePostIndex]);

  useEffect(() => {
    if (activePostIndex === null || !overlayCarouselRef.current) return;

    const target = overlayCarouselRef.current;
    const frame = requestAnimationFrame(() => {
      target.scrollTo({ left: 0, behavior: 'auto' });
    });

    return () => cancelAnimationFrame(frame);
  }, [activePostIndex]);

  useEffect(() => {
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

  useEffect(() => {
    if (!userId) {
      setError('User not found');
      setLoading(false);
      return;
    }

    let isActive = true;

    const loadProfile = async () => {
      setLoading(true);
      setError('');

      try {
        const profileResponse = await apiFetch(`/api/users/${userId}`);

        if (!profileResponse.ok) {
          throw new Error('User not found');
        }

        const profileData = (await profileResponse.json()) as UserProfileResponse;
        const profilePostsRaw = Array.isArray(profileData.posts) ? profileData.posts : [];
        const normalizedProfilePosts = profilePostsRaw.filter((post: any) => post && post.isDeleted !== true);

        if (!isActive) return;

        setProfileUser(profileData.user || null);
        setProfilePosts(normalizedProfilePosts);
      } catch (requestError: any) {
        if (!isActive) return;
        setError(requestError?.message || 'Unable to load profile');
        setProfileUser(null);
        setProfilePosts([]);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      isActive = false;
    };
  }, [userId]);

  useEffect(() => {
    setPostFilter(getStoredProfilePostFilter(userId));
    setPostsPerRow(getStoredProfilePostsPerRow(userId));
  }, [userId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storageKey = getProfilePreferenceStorageKey(PROFILE_POST_FILTER_STORAGE_KEY_PREFIX, userId);
    if (!storageKey) return;

    try {
      window.localStorage.setItem(storageKey, postFilter);
    } catch {
    }
  }, [postFilter, userId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storageKey = getProfilePreferenceStorageKey(PROFILE_POSTS_PER_ROW_STORAGE_KEY_PREFIX, userId);
    if (!storageKey) return;

    try {
      window.localStorage.setItem(storageKey, String(postsPerRow));
    } catch {
    }
  }, [postsPerRow, userId]);

  useEffect(() => {
    overlayHorizontalClampRangeRef.current = null;
    if (overlayHorizontalSettleTimerRef.current !== null) {
      window.clearTimeout(overlayHorizontalSettleTimerRef.current);
      overlayHorizontalSettleTimerRef.current = null;
    }

    overlayPostTransitionInProgressRef.current = false;
    setOverlayPostTransitionPhase('none');
    if (overlayPostTransitionTimerRef.current !== null) {
      window.clearTimeout(overlayPostTransitionTimerRef.current);
      overlayPostTransitionTimerRef.current = null;
    }

    setActivePostIndex(null);
    setActiveMediaIndex(0);
  }, [postFilter]);

  const reviewCount = useMemo(
    () => profilePosts.filter((post) => post.postType === 'review').length,
    [profilePosts]
  );

  const unboxingCount = useMemo(
    () => profilePosts.filter((post) => post.postType === 'unboxing').length,
    [profilePosts]
  );

  const getPostPreview = (post: Post): { kind: 'image' | 'video'; url: string } | null => {
    const imageCandidates = [post.image, ...(Array.isArray(post.images) ? post.images : [])].filter(Boolean) as string[];
    if (imageCandidates.length > 0) return { kind: 'image', url: imageCandidates[0] };

    const videoCandidates = [post.video, ...(Array.isArray(post.videos) ? post.videos : [])].filter(Boolean) as string[];
    if (videoCandidates.length > 0) return { kind: 'video', url: videoCandidates[0] };

    return null;
  };

  const resetProfileOverlayHorizontalSnapState = () => {
    overlayHorizontalClampRangeRef.current = null;
    if (overlayHorizontalSettleTimerRef.current !== null) {
      window.clearTimeout(overlayHorizontalSettleTimerRef.current);
      overlayHorizontalSettleTimerRef.current = null;
    }
  };

  const resetProfileOverlayPostTransitionState = () => {
    overlayPostTransitionInProgressRef.current = false;
    setOverlayPostTransitionPhase('none');
    if (overlayPostTransitionTimerRef.current !== null) {
      window.clearTimeout(overlayPostTransitionTimerRef.current);
      overlayPostTransitionTimerRef.current = null;
    }
  };

  const openProfilePost = (index: number) => {
    if (index < 0 || index >= visiblePosts.length) return;
    resetProfileOverlayPostTransitionState();
    resetProfileOverlayHorizontalSnapState();
    setActivePostIndex(index);
    setActiveMediaIndex(0);
  };

  const closeProfilePost = () => {
    resetProfileOverlayPostTransitionState();
    resetProfileOverlayHorizontalSnapState();
    setActivePostIndex(null);
    setActiveMediaIndex(0);
  };

  const openAdjacentProfilePost = (direction: 'next' | 'prev') => {
    if (activePostIndex === null) return;

    const nextIndex = direction === 'next'
      ? Math.min(visiblePosts.length - 1, activePostIndex + 1)
      : Math.max(0, activePostIndex - 1);

    if (nextIndex !== activePostIndex) {
      if (overlayPostTransitionInProgressRef.current) return;

      overlayPostTransitionInProgressRef.current = true;
      setOverlayPostTransitionPhase(direction === 'next' ? 'out-next' : 'out-prev');
      resetProfileOverlayHorizontalSnapState();

      if (overlayPostTransitionTimerRef.current !== null) {
        window.clearTimeout(overlayPostTransitionTimerRef.current);
      }

      overlayPostTransitionTimerRef.current = window.setTimeout(() => {
        setActivePostIndex(nextIndex);
        setActiveMediaIndex(0);
        setOverlayPostTransitionPhase(direction === 'next' ? 'in-next' : 'in-prev');

        overlayPostTransitionTimerRef.current = window.setTimeout(() => {
          overlayPostTransitionTimerRef.current = null;
          overlayPostTransitionInProgressRef.current = false;
          setOverlayPostTransitionPhase('none');
        }, 120);
      }, 120);
    }
  };

  const handleReviewStatClick = () => {
    setPostFilter((currentFilter) => (currentFilter === 'review' ? 'all' : 'review'));
  };

  const handleUnboxingStatClick = () => {
    setPostFilter((currentFilter) => (currentFilter === 'unboxing' ? 'all' : 'unboxing'));
  };

  const cyclePostsPerRow = () => {
    setPostsPerRow((currentCount) => {
      if (currentCount === 2) return 3;
      if (currentCount === 3) return 4;
      return 2;
    });
  };

  const tryAcquireOverlayGestureLock = () => {
    const now = Date.now();
    if (now < overlayGestureLockUntilRef.current) return false;
    overlayGestureLockUntilRef.current = now + 60;
    return true;
  };

  const openAdjacentProfileMedia = (direction: 'next' | 'prev') => {
    if (activePostMediaItems.length <= 1) return false;

    const nextIndex = direction === 'next'
      ? Math.min(activePostMediaItems.length - 1, activeMediaIndex + 1)
      : Math.max(0, activeMediaIndex - 1);

    if (nextIndex === activeMediaIndex) return false;

    scrollProfileOverlayToMediaIndex(nextIndex, 'smooth');
    return true;
  };

  const scrollProfileOverlayToMediaIndex = (index: number, behavior: ScrollBehavior = 'smooth') => {
    if (!overlayCarouselRef.current) return;

    overlayCarouselRef.current.scrollTo({
      left: index * overlayCarouselRef.current.clientWidth,
      behavior
    });

    setActiveMediaIndex(index);
  };

  const snapProfileOverlayMediaWithinRange = (minAllowedIndex: number, maxAllowedIndex: number) => {
    if (!overlayCarouselRef.current || activePostMediaItems.length <= 1) return;

    const { scrollLeft, clientWidth } = overlayCarouselRef.current;
    if (!clientWidth) return;

    const rawIndex = Math.round(scrollLeft / clientWidth);
    const boundedRawIndex = Math.max(0, Math.min(activePostMediaItems.length - 1, rawIndex));
    const clampedIndex = Math.max(minAllowedIndex, Math.min(maxAllowedIndex, boundedRawIndex));

    scrollProfileOverlayToMediaIndex(clampedIndex, 'smooth');
  };

  const scheduleProfileOverlayHorizontalSnap = () => {
    if (!overlayHorizontalClampRangeRef.current) return;

    if (overlayHorizontalSettleTimerRef.current !== null) {
      window.clearTimeout(overlayHorizontalSettleTimerRef.current);
    }

    overlayHorizontalSettleTimerRef.current = window.setTimeout(() => {
      overlayHorizontalSettleTimerRef.current = null;

      const activeRange = overlayHorizontalClampRangeRef.current;
      if (!activeRange) return;

      overlayHorizontalClampRangeRef.current = null;
      snapProfileOverlayMediaWithinRange(activeRange.minIndex, activeRange.maxIndex);
    }, 90);
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
      scheduleProfileOverlayHorizontalSnap();
    }
  };

  const handleOverlayWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const isHorizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);

    if (isHorizontal) {
      if (Math.abs(event.deltaX) < 24) return;
      if (!tryAcquireOverlayGestureLock()) return;
      event.preventDefault();

      if (event.deltaX > 0) {
        openAdjacentProfileMedia('next');
      } else {
        openAdjacentProfileMedia('prev');
      }
      return;
    }

    if (Math.abs(event.deltaY) < 24) return;
    if (!tryAcquireOverlayGestureLock()) return;
    event.preventDefault();

    if (event.deltaY > 0) {
      openAdjacentProfilePost('next');
    } else {
      openAdjacentProfilePost('prev');
    }
  };

  const handleOverlayTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    resetProfileOverlayHorizontalSnapState();
    overlayTouchStartXRef.current = event.touches[0]?.clientX ?? null;
    overlayTouchStartYRef.current = event.touches[0]?.clientY ?? null;
    overlayTouchStartMediaIndexRef.current = activeMediaIndex;
  };

  const handleOverlayTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (overlayTouchStartXRef.current === null || overlayTouchStartYRef.current === null) {
      return;
    }

    const endX = event.changedTouches[0]?.clientX ?? overlayTouchStartXRef.current;
    const endY = event.changedTouches[0]?.clientY ?? overlayTouchStartYRef.current;
    const deltaX = overlayTouchStartXRef.current - endX;
    const deltaY = overlayTouchStartYRef.current - endY;
    const startMediaIndex = overlayTouchStartMediaIndexRef.current ?? activeMediaIndex;

    overlayTouchStartXRef.current = null;
    overlayTouchStartYRef.current = null;
    overlayTouchStartMediaIndexRef.current = null;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) < 16) {
        return;
      }

      const minAllowedIndex = Math.max(0, startMediaIndex - 1);
      const maxAllowedIndex = Math.min(activePostMediaItems.length - 1, startMediaIndex + 1);
      overlayHorizontalClampRangeRef.current = {
        minIndex: minAllowedIndex,
        maxIndex: maxAllowedIndex
      };
      scheduleProfileOverlayHorizontalSnap();
      return;
    }

    if (Math.abs(deltaY) < 55) {
      return;
    }

    if (!tryAcquireOverlayGestureLock()) {
      return;
    }

    if (deltaY > 0) {
      openAdjacentProfilePost('next');
    } else {
      openAdjacentProfilePost('prev');
    }
  };

  const getOverlayTitle = (post: Post) => {
    if (post.title?.trim()) return post.title.trim();
    if (post.caption?.trim()) return post.caption.trim();
    return 'Post';
  };

  const renderProfilePostOverlay = () => {
    if (!activePost) return null;

    return (
      <div
        className={`post-media-overlay${overlayPostTransitionPhase !== 'none' ? ` post-media-overlay--post-${overlayPostTransitionPhase}` : ''}`}
        onClick={closeProfilePost}
        onWheel={handleOverlayWheel}
        onTouchStart={handleOverlayTouchStart}
        onTouchEnd={handleOverlayTouchEnd}
      >
        <button
          type="button"
          className="post-media-overlay-close"
          aria-label="Close fullscreen media"
          onClick={closeProfilePost}
        >
          ×
        </button>

        <div className="post-media-overlay-content" onClick={(event) => event.stopPropagation()}>
          <div className="post-media-overlay-meta">
            <UserAvatar user={profileUser || (activePost.user as any)} size={34} />
            <div className="post-media-overlay-meta-text">
              <span className="post-media-overlay-meta-user">{profileUser?.username || activePost.user?.username || 'User'}</span>
              <span className="post-media-overlay-meta-title">{getOverlayTitle(activePost)}</span>
            </div>
          </div>

          {activePostMediaItems.length > 1 && (
            <div className="post-media-overlay-dots" aria-label={`Media ${activeMediaIndex + 1} of ${activePostMediaItems.length}`}>
              {activePostMediaItems.map((_, index) => (
                <button
                  key={`profile-overlay-dot-${index}`}
                  type="button"
                  className={`post-media-dot ${index === activeMediaIndex ? 'active' : ''}`}
                  onClick={() => scrollProfileOverlayToMediaIndex(index, 'smooth')}
                  aria-label={`Go to media ${index + 1}`}
                />
              ))}
            </div>
          )}

          {activePostMediaItems.length > 0 ? (
            <div
              ref={overlayCarouselRef}
              className="post-media-overlay-carousel"
              onScroll={handleOverlayCarouselScroll}
            >
              {activePostMediaItems.map((mediaItem, mediaIndex) => (
                <div key={`${mediaItem.url}-profile-overlay-${mediaIndex}`} className="post-media-overlay-slide">
                  {mediaItem.kind === 'image' ? (
                    <img
                      src={mediaItem.url}
                      alt={getOverlayTitle(activePost)}
                      className="post-media-overlay-asset"
                    />
                  ) : (
                    <video
                      src={mediaItem.url}
                      controls
                      autoPlay={mediaIndex === activeMediaIndex}
                      playsInline
                      preload="metadata"
                      className="post-media-overlay-asset"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="post-media-overlay-asset" style={{ color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              No media available for this post.
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading profile...</div>;
  }

  if (error || !profileUser) {
    return (
      <div className="container" style={{ padding: '20px 0' }}>
        <div className="card" style={{ width: '100%', maxWidth: '680px', padding: '24px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '10px' }}>Profile</h2>
          <p>{error || 'User not found'}</p>
        </div>
      </div>
    );
  }

  const followersCount = typeof profileUser.followersCount === 'number'
    ? profileUser.followersCount
    : Array.isArray(profileUser.followers) ? profileUser.followers.length : 0;

  const followingCount = typeof profileUser.followingCount === 'number'
    ? profileUser.followingCount
    : Array.isArray(profileUser.following) ? profileUser.following.length : 0;

  const postSectionTitle = postFilter === 'review'
    ? 'Reviews'
    : postFilter === 'unboxing'
      ? 'Unboxing'
      : 'Reviews/Unboxing';

  const emptyPostMessage = postFilter === 'review'
    ? 'No reviews yet.'
    : postFilter === 'unboxing'
      ? 'No unboxing posts yet.'
      : 'No posts yet.';

  return (
    <div className="feed-page">
      <div style={{ borderRadius: '12px', padding: '16px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <UserAvatar user={profileUser} size={56} alt={profileUser.username || 'User'} />
          <div>
            <h2 style={{ fontSize: '22px', color: 'var(--brand-accent)', marginBottom: '4px' }}>
              {profileUser.username || 'User'}
            </h2>
            <div className="profile-bio-inline">
              {profileUser.bio?.trim() || 'No bio yet.'}
            </div>
          </div>
        </div>

        <div className="profile-stats-row">
          <div className="profile-stat-item">
            <div className="profile-stat-value">{followersCount}</div>
            <div className="profile-stat-label">Followers</div>
          </div>
          <div className="profile-stat-item">
            <div className="profile-stat-value">{followingCount}</div>
            <div className="profile-stat-label">Following</div>
          </div>
          <button
            type="button"
            className="profile-stat-item"
            onClick={handleReviewStatClick}
            aria-pressed={postFilter === 'review'}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: 0,
              opacity: postFilter === 'review' ? 1 : 0.86
            }}
          >
            <div className="profile-stat-value">{reviewCount}</div>
            <div className="profile-stat-label" style={{ color: postFilter === 'review' ? 'var(--brand-accent)' : undefined }}>Reviews</div>
          </button>
          <button
            type="button"
            className="profile-stat-item"
            onClick={handleUnboxingStatClick}
            aria-pressed={postFilter === 'unboxing'}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: 0,
              opacity: postFilter === 'unboxing' ? 1 : 0.86
            }}
          >
            <div className="profile-stat-value">{unboxingCount}</div>
            <div className="profile-stat-label" style={{ color: postFilter === 'unboxing' ? 'var(--brand-accent)' : undefined }}>Unboxing</div>
          </button>
        </div>
      </div>

      <div style={{ borderRadius: '12px', padding: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '16px', color: 'var(--brand-accent)', margin: 0 }}>{postSectionTitle}</h3>
          <button
            type="button"
            onClick={cyclePostsPerRow}
            aria-label={`Change posts per row. Current: ${postsPerRow}`}
            title={`Posts per row: ${postsPerRow}`}
            style={{
              border: '1px solid var(--brand-border)',
              borderRadius: '999px',
              background: '#fff',
              color: 'var(--brand-accent)',
              minWidth: '44px',
              height: '32px',
              padding: '0 10px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '12px'
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            {postsPerRow}
          </button>
        </div>

        {visiblePosts.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--brand-primary)' }}>{emptyPostMessage}</div>
        ) : (
          <div className="profile-posts-grid" style={{ gridTemplateColumns: `repeat(${postsPerRow}, minmax(0, 1fr))` }}>
            {visiblePosts.map((post, index) => {
              const preview = getPostPreview(post);
              const tileTitle = post.title || post.caption || 'Untitled post';
              const postTypeLabel = post.postType === 'unboxing'
                ? 'Unboxing'
                : post.postType === 'review'
                  ? 'Review'
                  : 'Post';

              return (
                <button
                  type="button"
                  key={post._id}
                  onClick={() => openProfilePost(index)}
                  aria-label={`Open full post: ${tileTitle}`}
                  className="profile-post-tile"
                >
                  {preview ? (
                    preview.kind === 'image' ? (
                      <img
                        src={preview.url}
                        alt={post.title || post.caption || 'Post'}
                        className="profile-post-media"
                      />
                    ) : (
                      <video
                        src={preview.url}
                        className="profile-post-media"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    )
                  ) : (
                    <div className="profile-post-placeholder">
                      No media
                    </div>
                  )}

                  <div className="profile-post-overlay">
                    <div className="profile-post-type">{postTypeLabel}</div>
                    <div className="profile-post-title">{tileTitle}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {renderProfilePostOverlay()}
    </div>
  );
};

export default Profile;
