import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../hooks/useAuth';
import { NotificationItem } from '../types';
import { apiFetch } from '../utils/apiFetch';

type NotificationsResponse = {
  notifications?: NotificationItem[];
  unreadCount?: number;
  unreadCountsByFilter?: {
    all?: number;
    requests?: number;
    mentions?: number;
    activity?: number;
  };
  filteredUnreadCount?: number;
  filter?: NotificationFilter;
  pagination?: {
    page?: number;
    totalPages?: number;
  };
};

type NotificationFilter = 'all' | 'requests' | 'mentions' | 'activity';

const NOTIFICATIONS_FILTER_STORAGE_KEY_PREFIX = 'instrevi-notifications-filter';
const LEGACY_NOTIFICATIONS_FILTER_STORAGE_KEY = NOTIFICATIONS_FILTER_STORAGE_KEY_PREFIX;
const VALID_NOTIFICATION_FILTERS: NotificationFilter[] = ['all', 'requests', 'mentions', 'activity'];

const getNotificationFilterStorageKey = (authUserId?: string): string | null => {
  if (!authUserId) return null;
  return `${NOTIFICATIONS_FILTER_STORAGE_KEY_PREFIX}:${authUserId}`;
};

const parseStoredNotificationFilter = (value: string | null): NotificationFilter | null => {
  if (value && VALID_NOTIFICATION_FILTERS.includes(value as NotificationFilter)) {
    return value as NotificationFilter;
  }

  return null;
};

const getStoredNotificationFilter = (authUserId?: string): NotificationFilter => {
  if (typeof window === 'undefined') {
    return 'all';
  }

  const storageKey = getNotificationFilterStorageKey(authUserId);
  if (!storageKey) {
    return 'all';
  }

  try {
    const scopedFilter = parseStoredNotificationFilter(window.localStorage.getItem(storageKey));
    if (scopedFilter) {
      window.localStorage.removeItem(LEGACY_NOTIFICATIONS_FILTER_STORAGE_KEY);
      return scopedFilter;
    }

    const legacyStoredValue = window.localStorage.getItem(LEGACY_NOTIFICATIONS_FILTER_STORAGE_KEY);
    const legacyFilter = parseStoredNotificationFilter(
      legacyStoredValue
    );

    if (legacyFilter) {
      window.localStorage.setItem(storageKey, legacyFilter);
      window.localStorage.removeItem(LEGACY_NOTIFICATIONS_FILTER_STORAGE_KEY);
      return legacyFilter;
    }

    if (legacyStoredValue !== null) {
      window.localStorage.removeItem(LEGACY_NOTIFICATIONS_FILTER_STORAGE_KEY);
    }
  } catch {
  }

  return 'all';
};

const FILTER_LABELS: Record<NotificationFilter, string> = {
  all: 'All',
  requests: 'Requests',
  mentions: 'Mentions',
  activity: 'Activity'
};

const EMPTY_UNREAD_COUNTS: Record<NotificationFilter, number> = {
  all: 0,
  requests: 0,
  mentions: 0,
  activity: 0
};

const getEntityId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const record = value as { _id?: string; id?: string };
    return record._id || record.id || '';
  }
  return '';
};

const getMetadataValue = (notification: NotificationItem, key: string): string => {
  if (!notification.metadata || typeof notification.metadata !== 'object') {
    return '';
  }

  const value = notification.metadata[key];
  return typeof value === 'string' ? value : '';
};

const formatRelativeTime = (value: string): string => {
  const createdAt = new Date(value);

  if (Number.isNaN(createdAt.getTime())) {
    return '';
  }

  const diffMs = Date.now() - createdAt.getTime();

  if (diffMs < 60 * 1000) {
    return 'Just now';
  }

  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d`;
  }

  return createdAt.toLocaleDateString();
};

const getNotificationDescription = (notification: NotificationItem): string => {
  if (notification.message && notification.message.trim()) {
    return notification.message.trim();
  }

  const snippet = getMetadataValue(notification, 'snippet');

  switch (notification.type) {
    case 'friend_request':
      return 'sent you a friend request';
    case 'friend_request_accepted':
      return 'accepted your friend request';
    case 'follow':
      return 'started following you';
    case 'like':
      return 'liked your post';
    case 'comment':
      return snippet ? `commented: "${snippet}"` : 'commented on your post';
    case 'mention':
      return 'mentioned you';
    case 'tag':
      return 'tagged you in a post';
    case 'notification':
      return 'sent you a notification';
    default:
      return 'updated you';
  }
};

const getNotificationTarget = (notification: NotificationItem): string => {
  const postId = getEntityId(notification.post);

  if (postId) {
    return `/feed?post=${postId}`;
  }

  if (notification.type === 'friend_request' || notification.type === 'friend_request_accepted') {
    return '/friends';
  }

  const actorId = getEntityId(notification.actor);

  if (actorId) {
    return `/profile/${actorId}`;
  }

  return '/feed';
};

const getNotificationFilterGroup = (notification: NotificationItem): NotificationFilter => {
  if (notification.type === 'friend_request' || notification.type === 'friend_request_accepted') {
    return 'requests';
  }

  if (notification.type === 'mention' || notification.type === 'tag') {
    return 'mentions';
  }

  return 'activity';
};

const normalizeUnreadCounts = (
  counts: NotificationsResponse['unreadCountsByFilter'],
  fallbackUnreadCount: number
): Record<NotificationFilter, number> => {
  const all = typeof counts?.all === 'number' ? counts.all : fallbackUnreadCount;
  const requests = typeof counts?.requests === 'number' ? counts.requests : 0;
  const mentions = typeof counts?.mentions === 'number' ? counts.mentions : 0;
  const activity = typeof counts?.activity === 'number'
    ? counts.activity
    : Math.max(0, all - requests - mentions);

  return {
    all: Math.max(0, all),
    requests: Math.max(0, requests),
    mentions: Math.max(0, mentions),
    activity: Math.max(0, activity)
  };
};

const Notifications: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const authUserId = getEntityId(user);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCountsByFilter, setUnreadCountsByFilter] = useState<Record<NotificationFilter, number>>(EMPTY_UNREAD_COUNTS);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Notifications | Instrevi';

    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    setActiveFilter(getStoredNotificationFilter(authUserId));
  }, [authUserId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storageKey = getNotificationFilterStorageKey(authUserId);
    if (!storageKey) {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, activeFilter);
    } catch {
    }
  }, [activeFilter, authUserId]);

  const dispatchNotificationsRefresh = () => {
    window.dispatchEvent(new Event('instrevi:notifications-refresh'));
  };

  const fetchNotifications = useCallback(async (nextPage: number, append: boolean, filter: NotificationFilter) => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(nextPage));
      queryParams.set('limit', '20');

      if (filter !== 'all') {
        queryParams.set('filter', filter);
      }

      const response = await apiFetch(`/api/notifications?${queryParams.toString()}`);

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || 'Failed to load notifications');
      }

      const payload = (await response.json()) as NotificationsResponse;
      const incoming = Array.isArray(payload.notifications) ? payload.notifications : [];
      const nextTotalPages = typeof payload.pagination?.totalPages === 'number' ? payload.pagination.totalPages : 1;
      const nextUnreadCount = typeof payload.unreadCount === 'number' ? payload.unreadCount : 0;
      const nextUnreadCounts = normalizeUnreadCounts(payload.unreadCountsByFilter, nextUnreadCount);

      setNotifications((prev) => (append ? [...prev, ...incoming] : incoming));
      setTotalPages(Math.max(1, nextTotalPages));
      setPage(nextPage);
      setUnreadCountsByFilter(nextUnreadCounts);
    } catch (requestError) {
      console.error(requestError);
      setError(requestError instanceof Error ? requestError.message : 'Failed to load notifications');
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    const initialize = async () => {
      setLoading(true);
      setError('');
      await fetchNotifications(1, false, activeFilter);
      if (isActive) {
        setLoading(false);
      }
    };

    initialize();

    return () => {
      isActive = false;
    };
  }, [activeFilter, fetchNotifications]);

  const hasMore = page < totalPages;
  const unreadCount = unreadCountsByFilter.all;
  const activeFilterUnreadCount = unreadCountsByFilter[activeFilter];

  const markNotificationRead = async (notification: NotificationItem) => {
    const notificationId = notification._id;
    setNotifications((prev) => prev.map((item) => (
      item._id === notificationId ? { ...item, isRead: true } : item
    )));

    if (!notification.isRead) {
      const group = getNotificationFilterGroup(notification);
      setUnreadCountsByFilter((prev) => ({
        ...prev,
        all: Math.max(0, prev.all - 1),
        [group]: Math.max(0, prev[group] - 1)
      }));
    }

    dispatchNotificationsRefresh();

    try {
      await apiFetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });
    } catch (requestError) {
      console.error(requestError);
    }
  };

  const handleOpenNotification = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      await markNotificationRead(notification);
    }

    navigate(getNotificationTarget(notification));
  };

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore) {
      return;
    }

    setLoadingMore(true);
    await fetchNotifications(page + 1, true, activeFilter);
    setLoadingMore(false);
  };

  const handleMarkAllRead = async () => {
    if (markingAllRead || unreadCount === 0) {
      return;
    }

    setMarkingAllRead(true);

    try {
      const response = await apiFetch('/api/notifications/read-all', {
        method: 'PATCH'
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || 'Failed to mark notifications as read');
      }

      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCountsByFilter(EMPTY_UNREAD_COUNTS);
      dispatchNotificationsRefresh();
    } catch (requestError) {
      console.error(requestError);
      setError(requestError instanceof Error ? requestError.message : 'Failed to mark notifications as read');
    } finally {
      setMarkingAllRead(false);
    }
  };

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <h1 className="notifications-title">Notifications</h1>
        <button
          type="button"
          className="btn-secondary notifications-mark-all-btn"
          onClick={handleMarkAllRead}
          disabled={markingAllRead || unreadCount === 0}
        >
          Mark all as read
        </button>
      </div>

      <p className="notifications-subtitle">
        {activeFilterUnreadCount > 0
          ? `${activeFilterUnreadCount} unread${activeFilter === 'all' ? '' : ` in ${FILTER_LABELS[activeFilter]}`}`
          : `All caught up${activeFilter === 'all' ? '' : ` in ${FILTER_LABELS[activeFilter]}`}`}
      </p>

      <div className="notifications-filter-row" aria-label="Notification filters">
        <button
          type="button"
          className={`notifications-filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All{unreadCountsByFilter.all > 0 ? ` (${unreadCountsByFilter.all})` : ''}
        </button>
        <button
          type="button"
          className={`notifications-filter-btn ${activeFilter === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveFilter('requests')}
        >
          Requests{unreadCountsByFilter.requests > 0 ? ` (${unreadCountsByFilter.requests})` : ''}
        </button>
        <button
          type="button"
          className={`notifications-filter-btn ${activeFilter === 'mentions' ? 'active' : ''}`}
          onClick={() => setActiveFilter('mentions')}
        >
          Mentions{unreadCountsByFilter.mentions > 0 ? ` (${unreadCountsByFilter.mentions})` : ''}
        </button>
        <button
          type="button"
          className={`notifications-filter-btn ${activeFilter === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveFilter('activity')}
        >
          Activity{unreadCountsByFilter.activity > 0 ? ` (${unreadCountsByFilter.activity})` : ''}
        </button>
      </div>

      {error && (
        <div className="notifications-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="notifications-empty-state">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="notifications-empty-state">
          {activeFilter === 'all' ? 'No notifications yet.' : 'No notifications in this filter.'}
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => {
            const actorName = notification.actor?.username || 'Someone';
            const previewImage = typeof notification.post === 'object' && notification.post?.image
              ? notification.post.image
              : '';

            return (
              <button
                key={notification._id}
                type="button"
                className={`notifications-item ${notification.isRead ? '' : 'notifications-item--unread'}`}
                onClick={() => handleOpenNotification(notification)}
              >
                <UserAvatar user={notification.actor || undefined} size={40} />

                <div className="notifications-item-content">
                  <div className="notifications-item-text">
                    <span className="notifications-item-actor">{actorName}</span>
                    <span className="notifications-item-description">{getNotificationDescription(notification)}</span>
                  </div>
                  <span className="notifications-item-time">{formatRelativeTime(notification.createdAt)}</span>
                </div>

                {!notification.isRead && <span className="notifications-item-dot" aria-hidden="true" />}

                {previewImage && (
                  <img
                    src={previewImage}
                    alt="Post preview"
                    className="notifications-item-preview"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {!loading && hasMore && (
        <div className="notifications-load-more-wrap">
          <button
            type="button"
            className="btn-secondary notifications-load-more-btn"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Notifications;
