import React from 'react';
import { Link } from 'react-router-dom';

const Navbar: React.FC = () => {
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
        <Link to="/" style={{ textDecoration: 'none', color: 'black', fontWeight: 'bold', fontSize: '24px' }}>
          Instrevi
        </Link>
        
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'black' }}>Home</Link>
          <Link to="/login" style={{ textDecoration: 'none', color: 'black' }}>Login</Link>
          <Link to="/register" style={{ textDecoration: 'none', color: 'black' }}>Register</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
