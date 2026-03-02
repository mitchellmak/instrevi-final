import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || '';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notRobot, setNotRobot] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [showAboutUs, setShowAboutUs] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Redirect to feed if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

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

      // Save or clear remembered email
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Login failed — check credentials');
    }
  }; 

  return (
    <div style={{ 
      display: 'flex', 
      minHeight: 'calc(100vh - 54px)',
      backgroundColor: '#fafafa',
      fontFamily: "'Poppins', sans-serif",
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px'
    }}>
      <style>{`
        @media (max-width: 768px) {
          .login-container {
            border-radius: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background-color: transparent !important;
          }
          .login-form-panel {
            padding: 20px 20px !important;
          }
          .desktop-about-panel {
            display: none !important;
            height: 0 !important;
            min-height: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          .welcome-header {
            margin-bottom: 20px !important;
          }
        }
      `}</style>
      {/* Centered Box */}
      <div className="login-container" style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        maxWidth: '900px',
        width: '100%',
        overflow: 'hidden',
        border: '1px solid #e0e0e0'
      }}>
        <div style={{ display: 'flex', flexDirection: 'row-reverse', flexWrap: 'wrap' }}>
          {/* Login Form - Shows first on mobile due to flex-direction: row-reverse */}
          <div className="login-form-panel" style={{
            flex: '1 1 400px',
            minWidth: '280px',
            padding: '50px 45px',
            order: 1
          }}>
            <div className="welcome-header" style={{ marginBottom: '30px' }}>
              <h2 className="welcome-title" style={{ 
                fontSize: '26px', 
                fontWeight: '700', 
                color: '#262626',
                marginBottom: '8px',
                letterSpacing: '-0.5px'
              }}>
                Welcome Back
              </h2>
              <p style={{ 
                fontSize: '14px', 
                color: '#8e8e8e',
                lineHeight: '1.5'
              }}>
                Sign in to continue sharing experiences
              </p>
            </div>
            
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{ 
                  color: '#d32f2f', 
                  backgroundColor: '#ffebee',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  border: '1px solid #ffcdd2'
                }}>
                  {error}
                </div>
              )}
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#262626',
                  marginBottom: '6px'
                }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '14px',
                    border: '1.5px solid #e0e0e0',
                    borderRadius: '8px',
                    transition: 'border-color 0.2s',
                    backgroundColor: '#fafafa'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#262626'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
                  required
                />
              </div>
              
              <div style={{ marginBottom: '18px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#262626',
                  marginBottom: '6px'
                }}>
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '14px',
                    border: '1.5px solid #e0e0e0',
                    borderRadius: '8px',
                    transition: 'border-color 0.2s',
                    backgroundColor: '#fafafa'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#262626'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
                  required
                />
              </div>

              {!RECAPTCHA_SITE_KEY && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  marginBottom: '18px',
                  padding: '10px',
                  backgroundColor: '#fafafa',
                  borderRadius: '6px',
                  border: '1px solid #e0e0e0'
                }}>
                  <input 
                    id="notRobot" 
                    type="checkbox" 
                    checked={notRobot} 
                    onChange={(e) => setNotRobot(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="notRobot" style={{ margin: 0, fontSize: '13px', color: '#262626', cursor: 'pointer' }}>
                    I'm not a robot
                  </label>
                </div>
              )}
              
              <button 
                type="submit" 
                className="btn-dark btn-large"
                style={{ 
                  marginBottom: '16px',
                  fontSize: '15px',
                  fontWeight: '600',
                  padding: '14px',
                  letterSpacing: '0.3px'
                }}
              >
                Sign In
              </button>

              {/* Remember me and Forgot password row */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                gap: '8px', 
                marginBottom: '16px'
              }}>
                <Link 
                  to="/forgot-password" 
                  style={{ 
                    color: '#6e6e6e', 
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#262626'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#6e6e6e'}
                >
                  Forgot password?
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    id="rememberMe" 
                    type="checkbox" 
                    checked={rememberMe} 
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ 
                      width: '16px', 
                      height: '16px', 
                      cursor: 'pointer',
                      accentColor: '#262626'
                    }}
                  />
                  <label htmlFor="rememberMe" style={{ 
                    margin: 0, 
                    fontSize: '13px', 
                    color: '#737373', 
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}>
                    Remember me
                  </label>
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'center',
                alignItems: 'center',
                paddingTop: '16px',
                borderTop: '1px solid #e0e0e0'
              }}>
                <span style={{ color: '#737373', fontSize: '14px', marginRight: '6px' }}>Don't have an account?</span>
                <Link 
                  to="/register" 
                  style={{ 
                    color: '#262626', 
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  Sign up
                </Link>
              </div>
            </form>

            {/* Mobile About Us Toggle */}
            <div style={{ marginTop: '24px' }}>
              <style>{`
                @media (min-width: 769px) {
                  .mobile-about-toggle { display: none !important; }
                }
              `}</style>
              <button
                className="mobile-about-toggle"
                onClick={() => setShowAboutUs(!showAboutUs)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#262626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                About Instrevi {showAboutUs ? '▲' : '▼'}
              </button>
              
              {showAboutUs && (
                <div style={{
                  marginTop: '16px',
                  padding: '20px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0'
                }}>
                  <h2 style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    marginBottom: '12px',
                    color: '#262626',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase'
                  }}>
                    About Us
                  </h2>
                  
                  <p style={{ 
                    fontSize: '13px', 
                    lineHeight: '1.6', 
                    marginBottom: '12px',
                    color: '#4a4a4a'
                  }}>
                    Instrevi is built around one simple idea: the best insights come from real people. Our platform gives users the spotlight—letting them unbox products, explore services, and share their genuine experiences with the world.
                  </p>
                  
                  <p style={{ 
                    fontSize: '13px', 
                    lineHeight: '1.6',
                    color: '#4a4a4a'
                  }}>
                    We celebrate curiosity, honesty, and the thrill of trying something new. Whether it's the latest gadget, a local business, or a service worth talking about, our users bring it to life through their own lens.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Desktop About Us Panel - Hidden on mobile */}
          <div className="desktop-about-panel" style={{
            flex: '0 0 380px',
            minWidth: '280px',
            backgroundColor: '#262626',
            padding: '50px 40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            color: '#f5f5f5',
            order: 2
          }}>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: '700', 
              marginBottom: '20px',
              color: '#ffffff',
              letterSpacing: '-0.5px'
            }}>
              Instrevi
            </h1>
              
              <h2 style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                marginBottom: '16px',
                color: '#e8e8e8',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}>
                About Us
              </h2>
              
              <p style={{ 
                fontSize: '13px', 
                lineHeight: '1.6', 
                marginBottom: '14px',
                color: '#d4d4d4'
              }}>
                Instrevi is built around one simple idea: the best insights come from real people. Our platform gives users the spotlight—letting them unbox products, explore services, and share their genuine experiences with the world.
              </p>
              
              <p style={{ 
                fontSize: '13px', 
                lineHeight: '1.6',
                color: '#d4d4d4'
              }}>
                We celebrate curiosity, honesty, and the thrill of trying something new. Whether it's the latest gadget, a local business, or a service worth talking about, our users bring it to life through their own lens.
              </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
