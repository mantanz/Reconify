import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const Login = () => {
  const { login } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Add entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8f9ff 0%, #e8ecff 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif"
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
        borderRadius: '24px',
        padding: '48px',
        boxShadow: '0 20px 60px rgba(0, 123, 255, 0.1), 0 8px 32px rgba(0, 123, 255, 0.05)',
        maxWidth: '450px',
        width: '100%',
        textAlign: 'center',
        border: '1px solid #e8ecff',
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
        opacity: isVisible ? 1 : 0,
        transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {/* Logo */}
        <div style={{
          width: '100px',
          height: '100px',
          background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)',
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 8px 24px rgba(0, 180, 216, 0.3)',
          animation: isVisible ? 'logoFloat 3s ease-in-out infinite' : 'none',
          position: 'relative'
        }}>
          <img 
            src="/reconfiy_logo.png" 
            alt="Reconify Logo" 
            style={{
              width: '64px',
              height: '64px',
              objectFit: 'contain'
            }}
          />
        </div>

        {/* Title */}
        <h1 style={{
          margin: '0 0 8px 0',
          color: '#002e6e',
          fontSize: '32px',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #002e6e 0%, #0056b3 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Reconify
        </h1>

        <p style={{
          margin: '0 0 32px 0',
          color: '#4a5568',
          fontSize: '16px',
          lineHeight: '1.6'
        }}>
          Data reconciliation and panel management system
        </p>

        {/* Login Button */}
        <button
          onClick={login}
          style={{
            width: '100%',
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #002e6e 0%, #0056b6 100%)',
            border: 'none',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 24px rgba(0, 46, 110, 0.2)',
            marginBottom: '24px'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 12px 32px rgba(0, 46, 110, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 24px rgba(0, 46, 110, 0.2)';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>

        {/* Features */}
        <div style={{
          marginTop: '32px',
          padding: '24px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%)',
          borderRadius: '16px',
          border: '1px solid #e8ecff',
          boxShadow: '0 8px 24px rgba(0, 123, 255, 0.06)'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            color: '#002e6e',
            fontSize: '18px',
            fontWeight: '700'
          }}>
            What you can do:
          </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#4a5568',
              fontSize: '14px',
              padding: '8px 12px',
              background: 'rgba(0, 180, 216, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(0, 180, 216, 0.1)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateX(4px)';
              e.target.style.background = 'rgba(0, 180, 216, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateX(0)';
              e.target.style.background = 'rgba(0, 180, 216, 0.05)';
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                ✓
              </div>
              Data reconciliation and panel management
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#4a5568',
              fontSize: '14px',
              padding: '8px 12px',
              background: 'rgba(0, 180, 216, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(0, 180, 216, 0.1)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateX(4px)';
              e.target.style.background = 'rgba(0, 180, 216, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateX(0)';
              e.target.style.background = 'rgba(0, 180, 216, 0.05)';
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                ✓
              </div>
              User categorization and HR data processing
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#4a5568',
              fontSize: '14px',
              padding: '8px 12px',
              background: 'rgba(0, 180, 216, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(0, 180, 216, 0.1)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateX(4px)';
              e.target.style.background = 'rgba(0, 180, 216, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateX(0)';
              e.target.style.background = 'rgba(0, 180, 216, 0.05)';
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                ✓
              </div>
              Comprehensive reports and analytics
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '32px',
          paddingTop: '24px',
          borderTop: '1px solid #e8ecff',
          color: '#718096',
          fontSize: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <span>Made with</span>
            <span style={{ color: '#ff6b6b', animation: 'heartbeat 1.5s ease-in-out infinite' }}>❤️</span>
            <span>by</span>
            <svg width="60" height="20" viewBox="0 0 122.88 38.52" style={{ marginLeft: '4px' }}>
              <g>
                <path fill="#00BAF2" d="M122.47,11.36c-1.12-3.19-4.16-5.48-7.72-5.48h-0.08c-2.32,0-4.41,0.97-5.9,2.52 c-1.49-1.55-3.58-2.52-5.9-2.52h-0.07c-2.04,0-3.91,0.75-5.34,1.98V7.24c-0.05-0.63-0.56-1.12-1.2-1.12h-5.48 c-0.67,0-1.21,0.54-1.21,1.21v29.74c0,0.67,0.54,1.21,1.21,1.21h5.48c0.61,0,1.12-0.46,1.19-1.04l0-21.35c0-0.08,0-0.14,0.01-0.21 c0.09-0.95,0.79-1.74,1.89-1.83h1.01c0.46,0.04,0.85,0.2,1.15,0.45c0.48,0.38,0.74,0.96,0.74,1.6l0.02,21.24 c0,0.67,0.54,1.22,1.21,1.22h5.48c0.65,0,1.17-0.51,1.2-1.15l0-21.33c0-0.7,0.32-1.34,0.89-1.71c0.28-0.18,0.62-0.3,1.01-0.34h1.01 c1.19,0.1,1.9,1,1.9,2.05l0.02,21.22c0,0.67,0.54,1.21,1.21,1.21h5.48c0.64,0,1.17-0.5,1.21-1.13V13.91 C122.86,12.6,122.69,11.99,122.47,11.36L122.47,11.36z M85.39,6.2h-3.13V1.12c0-0.01,0-0.01,0-0.02C82.26,0.5,81.77,0,81.15,0 c-0.07,0-0.14,0.01-0.21,0.02c-3.47,0.95-2.78,5.76-9.12,6.17h-0.61c-0.09,0-0.18,0.01-0.27,0.03h-0.01l0.01,0 C70.41,6.35,70,6.83,70,7.41v5.48c0,0.67,0.54,1.21,1.21,1.21h3.3l-0.01,23.22c0,0.66,0.54,1.2,1.2,1.2h5.42 c0.66,0,1.2-0.54,1.2-1.2l0-23.22h3.07c0.66,0,1.21-0.55,1.21-1.21V7.41C86.6,6.74,86.06,6.2,85.39,6.2L85.39,6.2z"/>
                <path fill="#20336B" d="M65.69,6.2h-5.48C59.55,6.2,59,6.74,59,7.41v11.33c-0.01,0.7-0.58,1.26-1.28,1.26h-2.29 c-0.71,0-1.29-0.57-1.29-1.28L54.12,7.41c0-0.67-0.54-1.21-1.21-1.21h-5.48c-0.67,0-1.21,0.54-1.21,1.21v12.41 c0,4.71,3.36,8.08,8.08,8.08c0,0,3.54,0,3.65,0.02c0.64,0.07,1.13,0.61,1.13,1.27c0,0.65-0.48,1.19-1.12,1.27 c-0.03,0-0.06,0.01-0.09,0.02l-8.01,0.03c-0.67,0-1.21,0.54-1.21,1.21v5.47c0,0.67,0.54,1.21,1.21,1.21h8.95 c4.72,0,8.08-3.36,8.08-8.07V7.41C66.9,6.74,66.36,6.2,65.69,6.2L65.69,6.2z M34.53,6.23h-7.6c-0.67,0-1.22,0.51-1.22,1.13v2.13 c0,0.01,0,0.03,0,0.04c0,0.02,0,0.03,0,0.05v2.92c0,0.66,0.58,1.21,1.29,1.21h7.24c0.57,0.09,1.02,0.51,1.09,1.16v0.71 c-0.06,0.62-0.51,1.07-1.06,1.12h-3.58c-4.77,0-8.16,3.17-8.16,7.61v6.37c0,4.42,2.92,7.56,7.65,7.56h9.93 c1.78,0,3.23-1.35,3.23-3.01V14.45C43.34,9.41,40.74,6.23,34.53,6.23L34.53,6.23z M35.4,29.09v0.86c0,0.07-0.01,0.14-0.02,0.2 c-0.01,0.06-0.03,0.12-0.05,0.18c-0.17,0.48-0.65,0.83-1.22,0.83h-2.28c-0.71,0-1.29-0.54-1.29-1.21v-1.03c0-0.01,0-0.03,0-0.04 l0-2.75v-0.86l0-0.01c0-0.66,0.58-1.2,1.29-1.2h2.28c0.71,0,1.29,0.54,1.29,1.21V29.09L35.4,29.09z M13.16,6.19H1.19 C0.53,6.19,0,6.73,0,7.38v5.37c0,0.01,0,0.02,0,0.03c0,0.03,0,0.05,0,0.07v24.29c0,0.66,0.49,1.2,1.11,1.21h5.58 c0.67,0,1.21-0.54,1.21-1.21l0.02-8.32h5.24c4.38,0,7.44-3.04,7.44-7.45v-7.72C20.6,9.25,17.54,6.19,13.16,6.19L13.16,6.19z M12.68,16.23v3.38c0,0.71-0.57,1.29-1.28,1.29l-3.47,0v-6.77h3.47c0.71,0,1.28,0.57,1.28,1.28V16.23L12.68,16.23z"/>
              </g>
            </svg>
          </div>
        </div>

        {/* CSS for animations */}
        <style>
          {`
            @keyframes heartbeat {
              0% { transform: scale(1); }
              14% { transform: scale(1.1); }
              28% { transform: scale(1); }
              42% { transform: scale(1.1); }
              70% { transform: scale(1); }
            }
            
            @keyframes logoFloat {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-8px); }
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default Login; 