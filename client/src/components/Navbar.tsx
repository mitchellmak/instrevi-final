import React from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import UserAvatar from './UserAvatar';
import { API_BASE, API_FALLBACK_BASE } from '../utils/apiBase';

const Navbar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isLoginPage = location.pathname === '/login';
  const isLoginPath = location.pathname === '/login';
  const isRegisterPath = location.pathname === '/register';
  const isFeedPath = location.pathname === '/' || location.pathname === '/feed' || location.pathname === '/home';
  const isAdmin = Boolean((user as any)?.isAdmin);
  const backendBase = API_FALLBACK_BASE || API_BASE || window.location.origin;
  const adminUrl = `${backendBase.replace(/\/$/, '')}/admin`;
  const feedSearchQuery = searchParams.get('q') || '';
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
      <div className="navbar-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: isLoginPage ? 'center' : 'space-between', width: '100%', maxWidth: '975px', margin: '0 auto' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'black' }}>
          <span style={{ fontSize: '28px', fontWeight: 'bold', letterSpacing: '-1px', color: 'var(--brand-accent)' }}>Instrevi</span>
        </Link>

        {user && isFeedPath && !isLoginPage && (
          <div className="navbar-feed-tools" aria-label="Feed actions">
            <Link to="/create/review" className="navbar-feed-icon-btn" aria-label="Create review">
              <svg className="navbar-feed-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="13" x2="15" y2="13" />
                <line x1="9" y1="17" x2="13" y2="17" />
              </svg>
            </Link>

            <Link to="/create/unboxing" className="navbar-feed-icon-btn" aria-label="Create unboxing">
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

        {!isLoginPage && (
          <div className="navbar-right-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
            {!user && (
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

            {user && isAdmin && (
              <a
                href={adminUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  textDecoration: 'none',
                  color: 'var(--brand-accent)',
                  border: '1px solid var(--brand-border)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '13px',
                  fontWeight: 600
                }}
                aria-label="Open admin panel"
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span>Admin Panel</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ opacity: 0.62 }}
                    aria-hidden="true"
                  >
                    <path d="M7 17L17 7" />
                    <path d="M9 7h8v8" />
                  </svg>
                </span>
              </a>
            )}

            {user && (
              <div
                onClick={() => navigate('/settings/profile')}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                key={user.profilePicture || 'no-avatar'}
              >
                <UserAvatar user={user} size={36} />
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
