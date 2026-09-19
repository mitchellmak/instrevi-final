import React, { useEffect, useMemo, useState } from 'react';
import { Post } from '../types';
import PostCard from '../components/PostCard';
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../hooks/useAuth';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../utils/apiFetch';
import { getCloudinaryDeliveryUrl } from '../utils/cloudinary';

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

const extractUniqueIds = (items: unknown): string[] => {
  if (!Array.isArray(items)) return [];
  const ids = new Set<string>();

  items.forEach((item) => {
    const id = getEntityId(item);
    if (id) ids.add(id);
  });

  return Array.from(ids);
};

const getTopRailPostTitle = (post: Post): string => {
  const explicitTitle = typeof post.title === 'string' ? post.title.trim() : '';
  if (explicitTitle) return explicitTitle;

  const fallbackSubject = [post.subjectName, post.shopName, post.category]
    .find((value) => typeof value === 'string' && value.trim());
  if (fallbackSubject) return fallbackSubject.trim();

  const caption = typeof post.caption === 'string' ? post.caption.trim() : '';
  if (caption) {
    return caption.length > 34 ? `${caption.slice(0, 34).trim()}...` : caption;
  }

  return post.postType === 'unboxing' ? 'Unboxing post' : 'Review post';
};

const RecentPostPreview: React.FC<{ entry: PosterAggregate; onOpen: (id: string) => void }> = ({ entry, onOpen }) => {
  const [failedImage, setFailedImage] = useState('');
  const post = entry.latestPost;
  const username = entry.user.username || 'User';
  const title = getTopRailPostTitle(post);
  const source = post.image || (Array.isArray(post.images) ? post.images[0] : '') || '';
  const image = source ? getCloudinaryDeliveryUrl(source, 'image') : '';
  const isUnboxing = post.postType === 'unboxing';

  return (
    <button type="button" className="feed-top-post-card" onClick={() => onOpen(post._id)} aria-label={`Open ${title} by ${username}`}>
      <div className="feed-top-post-media-wrap">
        {image && image !== failedImage ? (
          <img src={image} alt="" className="feed-top-post-media" loading="lazy" onError={() => setFailedImage(image)} />
        ) : (
          <div className="feed-top-post-media feed-top-post-media--fallback">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 6-6 4 4 3-3 5 5" />
            </svg>
            <span>Preview unavailable</span>
          </div>
        )}
        <span className={`feed-top-post-pill feed-top-post-pill--${isUnboxing ? 'unboxing' : 'review'}`}>
          {isUnboxing ? 'Unboxing' : 'Review'}
        </span>
      </div>
      <span className="feed-top-post-title" title={title}>{title}</span>
      <div className="feed-top-post-meta">
        <UserAvatar user={entry.user as unknown as UserRef} size={22} alt="" />
        <span className="feed-top-post-name">{username}</span>
      </div>
    </button>
  );
};

const Feed: React.FC = () => {
  useEffect(() => {
    document.body.classList.add('feed-surface');
    return () => document.body.classList.remove('feed-surface');
  }, []);

  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState('');
  const [viewedStripPostIds, setViewedStripPostIds] = useState<string[]>([]);
  const [relationshipIds, setRelationshipIds] = useState<{ friendIds: string[]; followingIds: string[] }>({
    friendIds: [],
    followingIds: [],
  });
  const [publicFollowerCounts, setPublicFollowerCounts] = useState<Record<string, number>>({});
  const authUserId = getEntityId(user);
  const openPostId = searchParams.get('post') || '';
  const searchQuery = searchParams.get('q') || '';
  const showFavsOnly = searchParams.get('favs') === '1';

  const openRecentPosterPost = (postId: string) => {
    if (!postId) return;

    setViewedStripPostIds((prev) => (prev.includes(postId) ? prev : [...prev, postId]));

    const params = new URLSearchParams(searchParams);
    params.set('post', postId);
    setSearchParams(params);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (!openPostId || loading) return;

    const targetPostExists = posts.some((post) => post._id === openPostId);
    if (!targetPostExists) return;

    const frameId = window.requestAnimationFrame(() => {
      const targetCard = document.querySelector(`[data-post-id="${openPostId}"]`) as HTMLElement | null;
      targetCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });

      window.dispatchEvent(
        new CustomEvent(OPEN_OVERLAY_EVENT, {
          detail: {
            postId: openPostId,
            mediaIndex: 0
          }
        })
      );

      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('post');
      setSearchParams(nextParams, { replace: true });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [openPostId, loading, posts, searchParams, setSearchParams]);

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

  const visibleRecentPosters = useMemo(
    () => orderedRecentPosters.filter((entry) => !viewedStripPostIds.includes(entry.latestPost._id)),
    [orderedRecentPosters, viewedStripPostIds]
  );

  const friendRecentPosters = useMemo(
    () => visibleRecentPosters.filter((entry) => entry.group === 'friend'),
    [visibleRecentPosters]
  );

  const latestOtherRecentPosters = useMemo(
    () => (
      visibleRecentPosters
        .filter((entry) => entry.group !== 'friend')
        .sort((a, b) => b.latestPostTime - a.latestPostTime)
    ),
    [visibleRecentPosters]
  );

  const fetchPosts = async () => {
    setFeedError('');

    try {
      const response = await apiFetch('/api/posts');

      if (response.ok) {
        const data = await response.json();
        setPosts(Array.isArray(data) ? data : []);
      } else {
        const errorText = await response.text();
        setFeedError(errorText || 'Unable to load posts right now.');
        setPosts([]);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setFeedError(error instanceof Error ? error.message : 'Unable to load posts right now.');
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
      {feedError && (
        <div
          style={{
            margin: '16px',
            padding: '12px 14px',
            borderRadius: '10px',
            border: '1px solid #f1b4b4',
            background: '#fff4f4',
            color: '#9f1d1d',
            fontSize: '13px',
            lineHeight: 1.5
          }}
        >
          {feedError}
        </div>
      )}

      {(friendRecentPosters.length > 0 || latestOtherRecentPosters.length > 0) && (
        <section className={`feed-top-rail-combined ${friendRecentPosters.length === 0 ? 'feed-top-rail--discover' : ''}`} aria-label="Recent posts">
          {friendRecentPosters.length > 0 && (
            <div className="feed-top-pane" aria-label="Friends latest posts">
              <div className="feed-top-rail-header"><h3>From friends</h3><Link to="/friends">View friends</Link></div>
              <div className="feed-top-rail-track">
                {friendRecentPosters.map(entry => <RecentPostPreview key={entry.userId} entry={entry} onOpen={openRecentPosterPost} />)}
              </div>
            </div>
          )}
          {latestOtherRecentPosters.length > 0 && (
            <div className="feed-top-pane" aria-label="Latest posts by other users">
              <div className="feed-top-rail-header"><h3>Latest discoveries</h3><span>Fresh from the community</span></div>
              <div className="feed-top-rail-track">
                {latestOtherRecentPosters.map(entry => <RecentPostPreview key={entry.userId} entry={entry} onOpen={openRecentPosterPost} />)}
              </div>
            </div>
          )}
        </section>
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


    </div>
  );
};

export default Feed;
