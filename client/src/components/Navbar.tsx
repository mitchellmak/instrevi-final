import React from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import UserAvatar from './UserAvatar';
import { apiFetch } from '../utils/apiFetch';

const Navbar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isLoginPath = location.pathname === '/login';
  const isRegisterPath = location.pathname === '/register';
  const isPublicTermsPath = location.pathname === '/terms';
  const hideGuestAuthButtons = isLoginPath || isRegisterPath || isPublicTermsPath;
  const isFeedPath = location.pathname === '/' || location.pathname === '/feed' || location.pathname === '/home';
  const isBanned = Boolean(user?.isBanned);
  const feedSearchQuery = searchParams.get('q') || '';
  const showFavsOnly = searchParams.get('favs') === '1';
  const [unreadNotifications, setUnreadNotifications] = React.useState(0);

  React.useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      return;
    }

    let isActive = true;
    let pollingTimer: number | null = null;

    const fetchUnreadCount = async () => {
      try {
        const response = await apiFetch('/api/notifications/unread-count');

        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        const nextCount = typeof payload.unreadCount === 'number' ? payload.unreadCount : 0;

        if (isActive) {
          setUnreadNotifications(Math.max(0, nextCount));
        }
      } catch (error) {
        console.error('Notification unread count error:', error);
      }
    };

    const handleRefresh = () => {
      fetchUnreadCount();
    };

    fetchUnreadCount();
    pollingTimer = window.setInterval(fetchUnreadCount, 30000);
    window.addEventListener('instrevi:notifications-refresh', handleRefresh);

    return () => {
      isActive = false;

      if (pollingTimer !== null) {
        window.clearInterval(pollingTimer);
      }

      window.removeEventListener('instrevi:notifications-refresh', handleRefresh);
    };
  }, [user]);

  const blockBannedCreateNavigation = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isBanned) return;
    event.preventDefault();
  };

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

  return (
    <nav style={{
      backgroundColor: 'white',
      borderBottom: '1px solid var(--brand-border)',
      padding: '0 8px',
      height: '58px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <div className="navbar-inner navbar-content-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', margin: '0 auto' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'black' }}>
          <span className="brand-logo-text" style={{ fontSize: '28px', fontWeight: 'bold', letterSpacing: '-1px' }}>Instrevi</span>
        </Link>

        {user && isFeedPath && (
          <div className="navbar-feed-tools" aria-label="Feed actions">
            <Link
              to="/create/review"
              className={`navbar-feed-icon-btn ${isBanned ? 'navbar-feed-icon-btn--disabled' : ''}`}
              aria-label="Create review"
              aria-disabled={isBanned}
              tabIndex={isBanned ? -1 : undefined}
              onClick={blockBannedCreateNavigation}
              title={isBanned ? 'Banned users cannot create posts' : undefined}
            >
              <svg className="navbar-feed-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="13" x2="15" y2="13" />
                <line x1="9" y1="17" x2="13" y2="17" />
              </svg>
            </Link>

            <Link
              to="/create/unboxing"
              className={`navbar-feed-icon-btn ${isBanned ? 'navbar-feed-icon-btn--disabled' : ''}`}
              aria-label="Create unboxing"
              aria-disabled={isBanned}
              tabIndex={isBanned ? -1 : undefined}
              onClick={blockBannedCreateNavigation}
              title={isBanned ? 'Banned users cannot create posts' : undefined}
            >
              <svg className="navbar-feed-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </Link>

            <button
              type="button"
              className={`navbar-feed-icon-btn ${showFavsOnly ? 'active' : ''}`}
              onClick={() => updateFeedFilters({ favs: !showFavsOnly })}
              aria-label="Toggle favorites"
            >
              <svg className="navbar-feed-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 1.97-1.63l1.38-7A2 2 0 0 0 19.67 11H14z" />
                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
            </button>

            <Link to="/friends" className="navbar-feed-icon-btn" aria-label="Friends and followers">
              <svg className="navbar-feed-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <path d="M20 8v6" />
                <path d="M23 11h-6" />
              </svg>
            </Link>

            <div className="navbar-feed-search-wrap">
              <input
                type="text"
                placeholder="Search posts..."
                value={feedSearchQuery}
                onChange={(e) => updateFeedFilters({ query: e.target.value })}
                className="navbar-feed-search-input"
                aria-label="Search posts"
              />
              <span className="navbar-feed-search-icon">🔍</span>
            </div>
          </div>
        )}

        <div className="navbar-right-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
          {!user && !hideGuestAuthButtons && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link
                to="/login"
                style={{
                  textDecoration: 'none',
                  color: isLoginPath ? 'white' : 'var(--brand-accent)',
                  backgroundColor: isLoginPath ? 'var(--brand-accent)' : 'transparent',
                  border: '1px solid',
                  borderColor: isLoginPath ? 'var(--brand-accent)' : 'var(--brand-border)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                Login
              </Link>
              <Link
                to="/register"
                style={{
                  textDecoration: 'none',
                  color: isRegisterPath ? 'white' : 'var(--brand-accent)',
                  backgroundColor: isRegisterPath ? 'var(--brand-accent)' : 'transparent',
                  border: '1px solid',
                  borderColor: isRegisterPath ? 'var(--brand-accent)' : 'var(--brand-border)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                Register
              </Link>
            </div>
          )}

          {user && (
            <>
              <Link to="/notifications" className="navbar-feed-icon-btn navbar-notification-btn" aria-label="Notifications">
                <svg className="navbar-feed-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadNotifications > 0 && (
                  <span className="navbar-notification-badge" aria-label={`${unreadNotifications} unread notifications`}>
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                )}
              </Link>

              <div
                onClick={() => navigate('/settings/profile')}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                key={user.profilePicture || 'no-avatar'}
              >
                <UserAvatar user={user} size={36} />
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
