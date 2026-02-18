import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <nav style={{
      backgroundColor: 'white',
      borderBottom: '1px solid #dbdbdb',
      padding: '0 20px',
      height: '54px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'black' }}>
          <img src="/logo.svg" alt="Instrevi" style={{ height: 32, display: 'block' }} />
        </Link>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'black' }}>Home</Link>
          {!user ? (
            <>
              <Link to="/login" style={{ textDecoration: 'none', color: 'black' }}>Login</Link>
              <Link to="/register" style={{ textDecoration: 'none', color: 'black' }}>Register</Link>
            </>
          ) : (
            <>
              <Link to={`/profile/${user.id}`} style={{ textDecoration: 'none', color: 'black' }}>{user.username}</Link>
              <button onClick={logout} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'black' }}>Logout</button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
