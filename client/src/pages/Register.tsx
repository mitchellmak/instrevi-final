import React, { useState, useEffect } from 'react';
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
  const [showAboutSignup, setShowAboutSignup] = useState(false);
  const { register, user } = useAuth();
  const navigate = useNavigate();

  // Redirect to feed if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data = await register(username, email, password, firstName, middleName, lastName);
      // redirect to verification page and pass verificationToken in state for dev convenience
      navigate('/verify-email', { state: { verificationToken: (data && data.verificationToken) || null, email } });
    } catch (err) {
      console.error(err);
      setError((err instanceof Error ? err.message : 'Registration failed'));
    }
  };

  return (
    <div className="login-container">
      <style>{`
        @media (max-width: 768px) {
          .register-container {
            padding: 0 !important;
          }
          .register-container > div {
            border-radius: 0 !important;
            box-shadow: none !important;
            max-width: 100% !important;
          }
          .register-container .desktop-about-panel {
            display: none !important;
          }
          .register-container .login-form-panel {
            padding: 30px 20px !important;
          }
          .register-container .welcome-header {
            margin-bottom: 20px !important;
          }
          .register-container .welcome-title {
            font-size: 28px !important;
          }
          .register-container .mobile-about-toggle {
            display: block !important;
          }
          .register-container .mobile-about-content {
            display: block !important;
          }
        }
      `}</style>
      <div className="register-container" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 'calc(100vh - 54px)',
        padding: '20px'
      }}>
        <div style={{ 
          display: 'flex',
          flexWrap: 'wrap',
          flexDirection: 'row-reverse',
          width: '100%',
          maxWidth: '1000px',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          backgroundColor: '#fff'
        }}>
          
          {/* About Sign Up Panel - Desktop Only */}
          <div className="desktop-about-panel" style={{ 
            flex: '0 0 380px',
            backgroundColor: '#262626',
            color: '#fff',
            padding: '50px 40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <h2 style={{ 
              fontSize: '28px',
              marginBottom: '20px',
              fontWeight: '600'
            }}>Join Instrevi</h2>
            <p style={{ 
              fontSize: '15px',
              lineHeight: '1.7',
              marginBottom: '16px',
              color: '#e0e0e0'
            }}>
              Create an account to share your product reviews and unboxing experiences with the community.
            </p>
            <p style={{ 
              fontSize: '15px',
              lineHeight: '1.7',
              marginBottom: '16px',
              color: '#e0e0e0'
            }}>
              Connect with fellow enthusiasts, discover new products, and help others make informed purchase decisions.
            </p>
            <p style={{ 
              fontSize: '15px',
              lineHeight: '1.7',
              color: '#e0e0e0'
            }}>
              Your voice matters - start sharing today!
            </p>
          </div>

          {/* Registration Form Panel */}
          <div className="login-form-panel" style={{ 
            flex: '1',
            padding: '50px 40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minWidth: '320px'
          }}>
            <div className="welcome-header" style={{ 
              marginBottom: '30px',
              textAlign: 'center'
            }}>
              <h1 className="welcome-title" style={{ 
                fontSize: '32px',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#262626'
              }}>Create Account</h1>
              <p style={{ 
                fontSize: '15px',
                color: '#737373'
              }}>Start posting today</p>
            </div>

            {/* Mobile About Sign Up - Collapsible */}
            <div style={{ marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => setShowAboutSignup(!showAboutSignup)}
                className="mobile-about-toggle"
                style={{
                  display: 'none',
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #dbdbdb',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                  color: '#262626',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: showAboutSignup ? '15px' : '0'
                }}
              >
                {showAboutSignup ? '− Hide Info' : '+ Your Opinion Matters!'}
              </button>
              
              {showAboutSignup && (
                <div className="mobile-about-content" style={{
                  display: 'none',
                  padding: '20px',
                  backgroundColor: '#f8f8f8',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}>
                  <p style={{ 
                    fontSize: '14px',
                    lineHeight: '1.6',
                    marginBottom: '12px',
                    color: '#262626'
                  }}>
                    Create an account to share your product reviews and unboxing experiences with the community.
                  </p>
                  <p style={{ 
                    fontSize: '14px',
                    lineHeight: '1.6',
                    marginBottom: '12px',
                    color: '#262626'
                  }}>
                    Connect with fellow enthusiasts, discover new products, and help others make informed decisions.
                  </p>
                  <p style={{ 
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: '#262626'
                  }}>
                    Your voice matters - start sharing today!
                  </p>
                </div>
              )}
            </div>
            
            <form onSubmit={handleSubmit}>
              {error && <div style={{ 
                color: '#ed4956',
                marginBottom: '12px',
                fontSize: '14px',
                textAlign: 'center',
                padding: '10px',
                backgroundColor: '#ffebee',
                borderRadius: '8px'
              }}>{error}</div>}
              
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
              
              <button 
                type="submit" 
                className="btn-dark btn-large"
                style={{ 
                  marginBottom: '16px',
                  fontSize: '15px',
                  fontWeight: '600',
                  letterSpacing: '0.3px'
                }}
              >
                Sign Up
              </button>
            </form>
            
            <div style={{ textAlign: 'center' }}>
              <span style={{ color: '#737373', fontSize: '14px' }}>Have an account? </span>
              <Link 
                to="/login" 
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
                Log in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
