import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement registration logic
    console.log('Registration attempt:', { username, email, password });
  };

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 54px)' }}>
      <div className="card" style={{ padding: '40px', width: '100%', maxWidth: '350px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Sign Up</h2>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="form-input"
            required
          />
          
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            required
          />
          
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
            required
          />
          
          <button type="submit" className="btn-primary" style={{ width: '100%', marginBottom: '15px' }}>
            Sign Up
          </button>
        </form>
        
        <div style={{ textAlign: 'center' }}>
          <span>Have an account? </span>
          <Link to="/login" style={{ color: '#0095f6', textDecoration: 'none' }}>
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
