import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Post } from '../types';
import PostCard from '../components/PostCard';
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../utils/apiFetch';

type UserRef = {
  id?: string;
  _id?: string;
  username?: string;
  profilePicture?: string;
  followers?: Array<UserRef | string>;
  following?: Array<UserRef | string>;
};

type UserProfileResponse = {
  user?: {
    followers?: Array<UserRef | string>;
    following?: Array<UserRef | string>;
    followersCount?: number;
  };
};

type PosterAggregate = {
  userId: string;
  user: Post['user'];
  latestPost: Post;
  latestPostTime: number;
  totalLikes: number;
  postCount: number;
};

type PosterGroup = 'friend' | 'following' | 'public';

type OrderedPoster = PosterAggregate & {
  group: PosterGroup;
  fameScore: number;
};

const getEntityId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const record = value as { id?: string; _id?: string };
    return record.id || record._id || '';
  }
  return '';
};

const extractUniqueIds = (items: unknown): string[] => {
  if (!Array.isArray(items)) return [];
  const ids = new Set<string>();

  items.forEach((item) => {
    const id = getEntityId(item);
    if (id) ids.add(id);
  });

  return Array.from(ids);
};

const Feed: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [relationshipIds, setRelationshipIds] = useState<{ friendIds: string[]; followingIds: string[] }>({
    friendIds: [],
    followingIds: [],
  });
  const [publicFollowerCounts, setPublicFollowerCounts] = useState<Record<string, number>>({});
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const authUserId = getEntityId(user);
  const searchQuery = searchParams.get('q') || '';
  const showFavsOnly = searchParams.get('favs') === '1';

  const updateFeedFilters = (next: { query?: string; favs?: boolean }) => {
    const params = new URLSearchParams(searchParams);

    if (typeof next.query === 'string') {
      if (next.query) {
        params.set('q', next.query);
      } else {
        params.delete('q');
      }
    }

    if (typeof next.favs === 'boolean') {
      if (next.favs) {
        params.set('favs', '1');
      } else {
        params.delete('favs');
      }
    }

    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (!showMobileSearch) return;
    mobileSearchInputRef.current?.focus();
  }, [showMobileSearch]);

  useEffect(() => {
    if (!authUserId) {
      setRelationshipIds({ friendIds: [], followingIds: [] });
      return;
    }

    let isActive = true;

    const applyRelationships = (followingIds: string[], followerIds: string[]) => {
      const followerSet = new Set(followerIds);
      const friendIds = followingIds.filter((id) => followerSet.has(id));

      if (isActive) {
        setRelationshipIds({
          friendIds,
          followingIds,
        });
      }
    };

    const applyFallbackFromAuthUser = () => {
      const authUserRecord = user as unknown as UserRef;
      const followingIds = extractUniqueIds(authUserRecord?.following);
      const followerIds = extractUniqueIds(authUserRecord?.followers);
      applyRelationships(followingIds, followerIds);
    };

    const fetchRelationships = async () => {
      try {
        const response = await apiFetch(`/api/users/${authUserId}`);
        if (!response.ok) {
          applyFallbackFromAuthUser();
          return;
        }

        const data = (await response.json()) as UserProfileResponse;
        const profileUser = data?.user;
        const followingIds = extractUniqueIds(profileUser?.following);
        const followerIds = extractUniqueIds(profileUser?.followers);
        applyRelationships(followingIds, followerIds);
      } catch (error) {
        console.error('Error fetching relationship data:', error);
        applyFallbackFromAuthUser();
      }
    };

    fetchRelationships();

    return () => {
      isActive = false;
    };
  }, [authUserId, user]);

  const friendIdSet = useMemo(() => new Set(relationshipIds.friendIds), [relationshipIds.friendIds]);
  const followingIdSet = useMemo(() => new Set(relationshipIds.followingIds), [relationshipIds.followingIds]);

  const recentPostCandidates = useMemo(
    () => posts.filter((post) => post.postType === 'review' || post.postType === 'unboxing'),
    [posts]
  );

  const posterAggregates = useMemo<PosterAggregate[]>(() => {
    const byUserId = new Map<string, PosterAggregate>();

    recentPostCandidates.forEach((post) => {
      const postUserId = getEntityId(post.user);
      if (!postUserId) return;

      const createdAtMs = Date.parse(post.createdAt || '') || 0;
      const likesCount = Array.isArray(post.likes) ? post.likes.length : 0;
      const existing = byUserId.get(postUserId);

      if (!existing) {
        byUserId.set(postUserId, {
          userId: postUserId,
          user: post.user,
          latestPost: post,
          latestPostTime: createdAtMs,
          totalLikes: likesCount,
          postCount: 1,
        });
        return;
      }

      existing.totalLikes += likesCount;
      existing.postCount += 1;

      if (createdAtMs > existing.latestPostTime) {
        existing.latestPost = post;
        existing.latestPostTime = createdAtMs;
        existing.user = post.user;
      }
    });

    return Array.from(byUserId.values());
  }, [recentPostCandidates]);

  useEffect(() => {
    const publicPosterIds = posterAggregates
      .map((entry) => entry.userId)
      .filter((posterId) => !friendIdSet.has(posterId) && !followingIdSet.has(posterId));

    if (publicPosterIds.length === 0) {
      setPublicFollowerCounts({});
      return;
    }

    let isActive = true;

    const fetchPublicFollowerCounts = async () => {
      const uniquePosterIds = Array.from(new Set(publicPosterIds));
      const entries = await Promise.all(
        uniquePosterIds.map(async (posterId) => {
          try {
            const response = await apiFetch(`/api/users/${posterId}`);
            if (!response.ok) return [posterId, 0] as const;

            const data = (await response.json()) as UserProfileResponse;
            const followersCount = typeof data?.user?.followersCount === 'number'
              ? data.user.followersCount
              : 0;

            return [posterId, followersCount] as const;
          } catch (error) {
            console.error(`Error fetching popularity for user ${posterId}:`, error);
            return [posterId, 0] as const;
          }
        })
      );

      if (isActive) {
        setPublicFollowerCounts(Object.fromEntries(entries));
      }
    };

    fetchPublicFollowerCounts();

    return () => {
      isActive = false;
    };
  }, [friendIdSet, followingIdSet, posterAggregates]);

  const orderedRecentPosters = useMemo<OrderedPoster[]>(() => {
    const groupedPosters: OrderedPoster[] = posterAggregates.map((entry) => {
      const isFriend = friendIdSet.has(entry.userId);
      const isFollowing = followingIdSet.has(entry.userId);

      return {
        ...entry,
        group: isFriend ? 'friend' : (isFollowing ? 'following' : 'public'),
        fameScore: publicFollowerCounts[entry.userId] || 0,
      };
    });

    const friendEntries = groupedPosters
      .filter((entry) => entry.group === 'friend')
      .sort((a, b) => b.latestPostTime - a.latestPostTime);

    const followingEntries = groupedPosters
      .filter((entry) => entry.group === 'following')
      .sort((a, b) => b.latestPostTime - a.latestPostTime);

    const publicEntries = groupedPosters
      .filter((entry) => entry.group === 'public')
      .sort((a, b) => (
        (b.fameScore - a.fameScore) ||
        (b.totalLikes - a.totalLikes) ||
        (b.latestPostTime - a.latestPostTime)
      ));

    return [...friendEntries, ...followingEntries, ...publicEntries];
  }, [friendIdSet, followingIdSet, posterAggregates, publicFollowerCounts]);

  const fetchPosts = async () => {
    try {
      const response = await apiFetch('/api/posts');
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
      const response = await apiFetch(`/api/posts/${postId}/like`, {
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
      const response = await apiFetch(`/api/posts/${postId}/comment`, {
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

  const isFavoritedByCurrentUser = (post: Post) => {
    const currentUserId = authUserId;
    if (!currentUserId) return false;

    const likes = Array.isArray(post.likes) ? post.likes : [];

    return likes.some((likeEntry: any) => {
      if (!likeEntry) return false;
      if (typeof likeEntry === 'string') return likeEntry === currentUserId;
      if (typeof likeEntry === 'object') {
        return likeEntry._id === currentUserId || likeEntry.id === currentUserId;
      }
      return false;
    });
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>;
  }

  const searchedPosts = searchQuery 
    ? posts.filter(post => 
        (post.caption || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (post.user?.username || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts;

  const filteredPosts = showFavsOnly
    ? searchedPosts.filter(isFavoritedByCurrentUser)
    : searchedPosts;

  return (
    <div className="feed-page feed-page--snap">
      {showMobileSearch && (
        <div className="feed-mobile-search">
          <input
            ref={mobileSearchInputRef}
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => updateFeedFilters({ query: e.target.value })}
            className="feed-mobile-search-input"
          />
          <button
            type="button"
            className="feed-mobile-search-close"
            onClick={() => setShowMobileSearch(false)}
            aria-label="Close search"
          >
            Done
          </button>
        </div>
      )}

      {orderedRecentPosters.length > 0 && (
        <div className="recent-posters-strip" aria-label="People who recently posted">
          <div className="recent-posters-track">
            {orderedRecentPosters.map((entry) => {
              const isUnboxing = entry.latestPost.postType === 'unboxing';

              return (
                <div
                  key={entry.userId}
                  className="recent-poster-item"
                  aria-label={`${entry.user.username || 'User'} recently posted`}
                >
                  <div className={`recent-poster-avatar-wrap recent-poster-avatar-wrap--${entry.group}`}>
                    <UserAvatar
                      user={entry.user as unknown as UserRef}
                      size={52}
                      alt={entry.user.username || 'User'}
                    />
                    <span className={`recent-poster-pill ${isUnboxing ? 'recent-poster-pill--unboxing' : 'recent-poster-pill--review'}`}>
                      {isUnboxing ? 'Unboxing' : 'review'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {filteredPosts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--brand-primary)' }}>
          {searchQuery
            ? 'No posts found matching your search.'
            : showFavsOnly
              ? 'No favorite posts yet.'
              : 'No posts yet. Be the first to share something!'}
        </div>
      ) : (
        <div className="feed-posts">
          {filteredPosts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onLike={handleLike}
              onComment={handleComment}
            />
          ))}
        </div>
      )}

      <div className="feed-mobile-bar" aria-label="Mobile feed actions">
        <button
          type="button"
          className="feed-mobile-action feed-mobile-action--review"
          onClick={() => navigate('/create/review')}
          aria-label="Create review"
        >
          <svg className="feed-mobile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9" y1="13" x2="15" y2="13" />
            <line x1="9" y1="17" x2="13" y2="17" />
          </svg>
          <span className="feed-mobile-label">Review</span>
        </button>

        <button
          type="button"
          className="feed-mobile-action feed-mobile-action--unbox"
          onClick={() => navigate('/create/unboxing')}
          aria-label="Create unboxing"
        >
          <svg className="feed-mobile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          <span className="feed-mobile-label">Unbox</span>
        </button>

        <button
          type="button"
          className="feed-mobile-action"
          onClick={() => navigate('/friends')}
          aria-label="Friends and followers"
        >
          <svg className="feed-mobile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <path d="M20 8v6" />
            <path d="M23 11h-6" />
          </svg>
          <span className="feed-mobile-label">Friends</span>
        </button>

        <button
          type="button"
          className={`feed-mobile-action ${showMobileSearch ? 'active' : ''}`}
          onClick={() => setShowMobileSearch((prev) => !prev)}
          aria-label="Search posts"
        >
          <svg className="feed-mobile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="feed-mobile-label">Search</span>
        </button>

        <button
          type="button"
          className={`feed-mobile-action ${showFavsOnly ? 'active' : ''}`}
          onClick={() => updateFeedFilters({ favs: !showFavsOnly })}
          aria-label="Favorites"
        >
          <svg className="feed-mobile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 1.97-1.63l1.38-7A2 2 0 0 0 19.67 11H14z" />
            <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
          </svg>
          <span className="feed-mobile-label">Favs</span>
        </button>
      </div>
    </div>
  );
};

export default Feed;
