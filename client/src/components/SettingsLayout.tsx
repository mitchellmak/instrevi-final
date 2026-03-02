import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const shellTouchStartXRef = useRef<number | null>(null);
  const shellTouchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleDrawerTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
  };

  const handleDrawerTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;

    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
    const isLeftSwipe = deltaX < -40;

    if (mobileMenuOpen && isHorizontalSwipe && isLeftSwipe) {
      setMobileMenuOpen(false);
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const handleShellTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    shellTouchStartXRef.current = touch.clientX;
    shellTouchStartYRef.current = touch.clientY;
  };

  const handleShellTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (mobileMenuOpen) {
      return;
    }

    if (window.innerWidth > 900) {
      return;
    }

    if (shellTouchStartXRef.current === null || shellTouchStartYRef.current === null) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - shellTouchStartXRef.current;
    const deltaY = touch.clientY - shellTouchStartYRef.current;

    const startedNearLeftEdge = shellTouchStartXRef.current <= 24;
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
    const isRightSwipe = deltaX > 40;

    if (startedNearLeftEdge && isHorizontalSwipe && isRightSwipe) {
      setMobileMenuOpen(true);
    }

    shellTouchStartXRef.current = null;
    shellTouchStartYRef.current = null;
  };

  const iconCommonProps = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const
  };

  const renderIcon = (key: string) => {
    switch (key) {
      case 'profile':
        return (
          <svg {...iconCommonProps}>
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        );
      case 'account':
        return (
          <svg {...iconCommonProps}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        );
      case 'privacy':
        return (
          <svg {...iconCommonProps}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        );
      case 'friends':
        return (
          <svg {...iconCommonProps}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        );
      case 'help':
        return (
          <svg {...iconCommonProps}>
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'logout':
        return (
          <svg {...iconCommonProps}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        );
      default:
        return null;
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/settings/profile', label: 'Edit Profile', icon: 'profile' },
    { path: '/settings/account', label: 'Account', icon: 'account' },
    { path: '/settings/privacy', label: 'Settings & Privacy', icon: 'privacy' },
    { path: '/settings/friends', label: 'Friends & Followings', icon: 'friends' },
    { path: '/settings/help', label: 'Help & Support', icon: 'help' },
  ];

  return (
    <div
      className="settings-shell"
      onTouchStart={handleShellTouchStart}
      onTouchEnd={handleShellTouchEnd}
    >
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="settings-mobile-trigger"
        style={{
          display: 'none',
          alignItems: 'center',
          gap: '8px',
          background: 'white',
          border: '1px solid #dbdbdb',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '13px',
          fontWeight: 600,
          color: '#262626',
          cursor: 'pointer',
          margin: '12px 12px 0'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
        Menu
      </button>

      <div
        className={`settings-mobile-overlay ${mobileMenuOpen ? 'open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Left Sidebar */}
      <div
        className={`settings-sidebar ${mobileMenuOpen ? 'open' : ''}`}
        onTouchStart={handleDrawerTouchStart}
        onTouchEnd={handleDrawerTouchEnd}
      >
        <h2 style={{ 
          padding: '0 20px', 
          marginBottom: '20px', 
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          Settings
        </h2>
        
        <nav style={{ flex: 1 }}>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="settings-nav-link"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                padding: '12px 20px',
                textDecoration: 'none',
                color: location.pathname === item.path ? '#262626' : '#8e8e8e',
                backgroundColor: location.pathname === item.path ? '#efefef' : 'transparent',
                borderLeft: location.pathname === item.path ? '3px solid #262626' : '3px solid transparent',
                fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {renderIcon(item.icon)}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Logout button at bottom */}
        <div style={{ borderTop: '1px solid #dbdbdb', padding: '10px 0' }}>
          <button
            onClick={handleLogout}
            className="settings-nav-link"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              padding: '12px 20px',
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#ed4956',
              fontWeight: 'bold',
              fontSize: '14px',
              textAlign: 'left'
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              {renderIcon('logout')}
            </span>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="settings-content">
        {children}
      </div>
    </div>
  );
};

export default SettingsLayout;
