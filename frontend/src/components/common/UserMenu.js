import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const dropdownRef = useRef(null);
  
  // Debug: Log user data to see what's available
  useEffect(() => {
    if (user) {
      console.log("User data in UserMenu:", user);
      console.log("User picture URL:", user.picture);
    }
  }, [user]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Only show user menu when authenticated (login page handles unauthenticated state)
  if (!user) {
    return null;
  }

  const handleProfileClick = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
  };

  const handleImageError = () => {
    console.log("Profile image failed to load, using fallback");
    setImageError(true);
  };
  
  // Show user menu when authenticated
  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      {/* Profile Photo Button */}
      <button
        onClick={handleProfileClick}
        style={{
          background: "rgba(255,255,255,0.1)",
          border: "2px solid rgba(255,255,255,0.3)",
          borderRadius: "50%",
          cursor: "pointer",
          padding: 0,
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.3s ease",
          backdropFilter: "blur(10px)"
        }}
        onMouseEnter={(e) => {
          e.target.style.background = "rgba(255,255,255,0.2)";
          e.target.style.border = "2px solid rgba(255,255,255,0.5)";
        }}
        onMouseLeave={(e) => {
          e.target.style.background = "rgba(255,255,255,0.1)";
          e.target.style.border = "2px solid rgba(255,255,255,0.3)";
        }}
      >
        {user.picture && !imageError ? (
          <img 
            src={user.picture} 
            alt="Profile" 
            style={{ 
              width: "100%", 
              height: "100%", 
              borderRadius: "50%",
              objectFit: "cover"
            }}
            onError={handleImageError}
          />
        ) : (
          <div style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 16,
            fontWeight: "bold"
          }}>
            {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div style={{
          position: "absolute",
          top: "100%",
          right: 0,
          marginTop: 8,
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0, 46, 110, 0.15)",
          border: "1px solid rgba(0, 46, 110, 0.1)",
          minWidth: 200,
          zIndex: 1000,
          overflow: "hidden",
          animation: "dropdownSlide 0.2s ease-out"
        }}>
          {/* User Info Section */}
          <div style={{
            padding: "16px",
            borderBottom: "1px solid rgba(0, 46, 110, 0.1)",
            background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 8
            }}>
              {user.picture && !imageError ? (
                <img 
                  src={user.picture} 
                  alt="Profile" 
                  style={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: "50%",
                    border: "2px solid rgba(0, 46, 110, 0.2)"
                  }}
                  onError={handleImageError}
                />
              ) : (
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: "bold"
                }}>
                  {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div style={{
                  fontWeight: 600,
                  color: "#002e6e",
                  fontSize: 14,
                  marginBottom: 2
                }}>
                  {user.name || "User"}
                </div>
                <div style={{
                  color: "#6c757d",
                  fontSize: 12
                }}>
                  {user.email}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div style={{ padding: "8px 0" }}>
            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: "#dc3545",
                fontSize: 14,
                fontWeight: 500,
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "rgba(220, 53, 69, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "transparent";
              }}
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16,17 21,12 16,7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Logout
            </button>
          </div>
        </div>
      )}

      {/* CSS for dropdown animation */}
      <style>
        {`
          @keyframes dropdownSlide {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
} 