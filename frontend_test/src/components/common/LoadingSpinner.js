import React from "react";

const LoadingSpinner = ({ 
  size = 40, 
  color = "#00baf2", 
  backgroundColor = "#e8ecff",
  fullScreen = true,
  message = "Loading..."
}) => {
  const spinnerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    border: `4px solid ${backgroundColor}`,
    borderTop: `4px solid ${color}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  };

  const containerStyle = fullScreen ? {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f8f9ff 0%, #e8ecff 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px'
  } : {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '20px'
  };

  return (
    <div style={containerStyle}>
      <div style={spinnerStyle}></div>
      {message && (
        <div style={{
          color: '#6b7280',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          {message}
        </div>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner; 