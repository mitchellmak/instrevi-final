import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import UserChip from './UserChip';

const Navbar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <nav style={{
      backgroundColor: 'white',
      borderBottom: '1px solid #dbdbdb',
      padding: '0 8px',
      height: '54px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '975px', margin: '0 auto' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'black' }}>
          <span style={{ fontSize: '28px', fontWeight: 'bold', letterSpacing: '-1px', color: '#262626' }}>Instrevi</span>
        </Link>

        {user && (
          <div 
            onClick={() => navigate('/settings/profile')}
            style={{ cursor: 'pointer' }}
            key={user.profilePicture || 'no-avatar'}
          >
            <UserChip user={user} avatarSize={32} />
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
