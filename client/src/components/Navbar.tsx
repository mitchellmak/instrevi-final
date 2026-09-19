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
  const headerRef = React.useRef<HTMLElement>(null);
  const [headerHidden, setHeaderHidden] = React.useState(false);

  React.useEffect(() => {
    setHeaderHidden(false);
    if (!isFeedPath) return;
    let lastY = Math.max(0, window.scrollY);
    let directionDistance = 0;
    let lastDirection = 0;
    let frame = 0;
    const updateHeader = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      const delta = y - lastY;
      const headerHeight = headerRef.current?.offsetHeight || 64;
      const active = document.activeElement;
      const editingHeader = active && headerRef.current?.contains(active) && active.matches('input, textarea, select, :focus-visible');
      if (y < headerHeight || editingHeader) {
        setHeaderHidden(false);
        lastY = y;
        directionDistance = 0;
        return;
      }
      if (delta === 0) return;
      const direction = delta > 0 ? 1 : -1;
      directionDistance = direction === lastDirection ? directionDistance + Math.abs(delta) : Math.abs(delta);
      lastDirection = direction;
      lastY = y;
      if (directionDistance < 8) return;
      setHeaderHidden(direction > 0);
      directionDistance = 0;
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateHeader);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, [isFeedPath, location.pathname]);

  const isBanned = Boolean(user?.isBanned);
  const feedSearchQuery = searchParams.get('q') || '';
  const showFavsOnly = searchParams.get('favs') === '1';
  const [menuOpen, setMenuOpen] = React.useState(() => {
    try {
      return localStorage.getItem('instrevi:menu-open') !== 'false';
    } catch {
      return true;
    }
  });

  const toggleMenu = () => {
    const nextOpen = !menuOpen;
    setMenuOpen(nextOpen);
    try {
      localStorage.setItem('instrevi:menu-open', String(nextOpen));
    } catch {
      // The menu still works when browser storage is unavailable.
    }
  };
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
    const params = new URLSearchParams(isFeedPath ? searchParams : undefined);

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

    if (isFeedPath) {
      setSearchParams(params, { replace: true });
    } else {
      navigate(`/feed?${params.toString()}`);
    }
  };

  return (
    <nav ref={headerRef} className={`site-navbar${headerHidden ? ' site-navbar--hidden' : ''}`} onFocusCapture={() => setHeaderHidden(false)}>
      <div className="navbar-inner navbar-content-wrap">
        <Link to="/" className="navbar-brand-link">
          <span className="brand-logo-text">Instrevi</span>
        </Link>

        <div className="navbar-right-controls">
          {user && (
            <button type="button" className="navbar-menu-toggle" onClick={toggleMenu}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="creation-menu">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d={menuOpen ? 'm6 15 6-6 6 6' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
              Menu
            </button>
          )}
          {!user && !hideGuestAuthButtons && (
            <div className="navbar-auth-links">
              <Link
                to="/login"
                className={`navbar-auth-link ${isLoginPath ? 'active' : ''}`}
              >
                Login
              </Link>
              <Link
                to="/register"
                className={`navbar-auth-link ${isRegisterPath ? 'active' : ''}`}
              >
                Register
              </Link>
            </div>
          )}

          {user && (
            <>
              <Link to="/notifications" className="navbar-feed-icon-btn navbar-notification-btn" aria-label="Notifications">
                <svg className="navbar-feed-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadNotifications > 0 && (
                  <span className="navbar-notification-badge" aria-label={`${unreadNotifications} unread notifications`}>
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                )}
              </Link>

              <Link to="/settings/profile" aria-label="Your profile"
                className="navbar-avatar-trigger"
                key={user.profilePicture || 'no-avatar'}
              >
                <UserAvatar user={user} size={36} />
              </Link>
            </>
          )}
        </div>
      </div>
        {user && (
          <div id="creation-menu" className="navbar-feed-tools navbar-action-menu" aria-label="Creation and feed actions" hidden={!menuOpen}>
            <Link
              to="/create/review"
              className={`navbar-feed-icon-btn navbar-create-review ${isBanned ? 'navbar-feed-icon-btn--disabled' : ''}`}
              aria-label="Create instant review"
              aria-disabled={isBanned}
              tabIndex={isBanned ? -1 : undefined}
              onClick={blockBannedCreateNavigation}
              title={isBanned ? 'Banned users cannot create posts' : undefined}
            >
              <svg className="navbar-feed-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="13" x2="15" y2="13" />
                <line x1="9" y1="17" x2="13" y2="17" />
              </svg>
              <span>Instant review</span>
            </Link>

            <Link
              to="/create/unboxing"
              className={`navbar-feed-icon-btn navbar-create-unboxing ${isBanned ? 'navbar-feed-icon-btn--disabled' : ''}`}
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
              <span>Unboxing</span>
            </Link>

            <Link to="/list" className="navbar-feed-icon-btn" aria-label="Open list page">
              <svg className="navbar-feed-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1" />
              </svg>
              <span>List</span>
            </Link>

            <Link to="/reviews" className="navbar-feed-icon-btn" aria-label="Open review hub">
              <svg className="navbar-feed-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              <span>Review Hub</span>
            </Link>

            <Link to="/top-rated" className="navbar-feed-icon-btn" aria-label="Open top rated">
              <svg className="navbar-feed-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
              <span>Top Rated</span>
            </Link>

            <button
              type="button"
              className={`navbar-feed-icon-btn ${showFavsOnly ? 'active' : ''}`}
              onClick={() => updateFeedFilters({ favs: !showFavsOnly })}
              aria-label="Toggle favorites"
              aria-pressed={showFavsOnly && isFeedPath}
            >
              <svg className="navbar-feed-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 1.97-1.63l1.38-7A2 2 0 0 0 19.67 11H14z" />
                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
              <span>Favorites</span>
            </button>

            <Link to="/friends" className="navbar-feed-icon-btn" aria-label="Friends and followers">
              <svg className="navbar-feed-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <path d="M20 8v6" />
                <path d="M23 11h-6" />
              </svg>
              <span>Friends</span>
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
              <svg className="navbar-feed-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg>
            </div>
          </div>
        )}

    </nav>
  );
};

export default Navbar;
