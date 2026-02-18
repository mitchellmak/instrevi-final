import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || '';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notRobot, setNotRobot] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) return;
    // dynamically load reCAPTCHA script for invisible/executable usage
    const id = 'recaptcha-script';
    if (document.getElementById(id)) return;
    const s = document.createElement('script');
    s.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    s.id = id;
    s.async = true;
    document.body.appendChild(s);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (RECAPTCHA_SITE_KEY) {
        // invisible reCAPTCHA flow
        // @ts-ignore
        const grecaptcha = window.grecaptcha;
        if (!grecaptcha) return setError('reCAPTCHA not loaded');
        const token = await new Promise<string>((resolve, reject) => {
          grecaptcha.ready(() => {
            grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'login' }).then(resolve).catch(reject);
          });
        });

        await login(email, password, token);
      } else {
        // fallback to checkbox when no site key
        if (!notRobot) return setError('Please confirm you are not a robot');
        await login(email, password);
      }

      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Login failed — check credentials');
    }
  }; 

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 54px)' }}>
      <div className="card" style={{ padding: '40px', width: '100%', maxWidth: '350px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Login</h2>
        
        <form onSubmit={handleSubmit}>
          {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
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

          {!RECAPTCHA_SITE_KEY && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0' }}>
              <input id="notRobot" type="checkbox" checked={notRobot} onChange={(e) => setNotRobot(e.target.checked)} />
              <label htmlFor="notRobot" style={{ margin: 0 }}>I'm not a robot</label>
            </div>
          )
          
          <button type="submit" className="btn-primary" style={{ width: '100%', marginBottom: '15px' }}>
            Log In
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <a href="/forgot-password">Forgot password?</a>
            <a href="/register">Sign up</a>
          </div>
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
