import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement login logic
    console.log('Login attempt:', { email, password });
  };

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 54px)' }}>
      <div className="card" style={{ padding: '40px', width: '100%', maxWidth: '350px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Login</h2>
        
        <form onSubmit={handleSubmit}>
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
            Log In
          </button>
        </form>
        
        <div style={{ textAlign: 'center' }}>
          <span>Don't have an account? </span>
          <Link to="/register" style={{ color: '#0095f6', textDecoration: 'none' }}>
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
