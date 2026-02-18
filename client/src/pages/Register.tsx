import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data = await register(username, email, password, firstName, middleName, lastName);
      // redirect to verification page and pass verificationToken in state for dev convenience
      navigate('/verify-email', { state: { verificationToken: (data && data.verificationToken) || null, email } });
    } catch (err) {
      console.error(err);
      setError('Registration failed');
    }
  };

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 54px)' }}>
      <div className="card" style={{ padding: '40px', width: '100%', maxWidth: '350px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Sign Up</h2>
        
        <form onSubmit={handleSubmit}>
          {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="form-input"
            required
          />

          <input
            type="text"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="form-input"
          />

          <input
            type="text"
            placeholder="Middle name (optional)"
            value={middleName}
            onChange={(e) => setMiddleName(e.target.value)}
            className="form-input"
          />

          <input
            type="text"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="form-input"
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
