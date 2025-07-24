import React from "react";
import { useAuth } from "../../auth/AuthContext";

export default function UserMenu() {
  const { user, logout } = useAuth();
  
  // Only show user menu when authenticated (login page handles unauthenticated state)
  if (!user) {
    return null;
  }
  
  // Show user menu when authenticated
  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      gap: 12,
      background: "rgba(255,255,255,0.1)",
      padding: "8px 12px",
      borderRadius: 8,
      backdropFilter: "blur(10px)"
    }}>
      {user.picture && (
        <img 
          src={user.picture} 
          alt="avatar" 
          style={{ 
            width: 32, 
            height: 32, 
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.3)"
          }} 
        />
      )}
      <span style={{ 
        fontWeight: 600, 
        color: "#fff",
        fontSize: 14
      }}>
        {user.name || user.email}
      </span>
      <button 
        onClick={logout} 
        style={{ 
          padding: "4px 8px", 
          borderRadius: 4, 
          border: "none", 
          background: "rgba(255,255,255,0.2)", 
          color: "#fff", 
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 500
        }}
        onMouseEnter={(e) => {
          e.target.style.background = "rgba(255,255,255,0.3)";
        }}
        onMouseLeave={(e) => {
          e.target.style.background = "rgba(255,255,255,0.2)";
        }}
      >
        Logout
      </button>
    </div>
  );
} 