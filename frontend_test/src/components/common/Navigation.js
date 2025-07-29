import React, { useState, useRef, useEffect } from "react";

const Navigation = ({ 
  selected, 
  onNavClick, 
  showDropdown, 
  onToggleDropdown, 
  onLinkClick, 
  user, 
  onLogout,
  navItems 
}) => {
  const [dashboardDropdownOpen, setDashboardDropdownOpen] = useState(false);
  const dropdownTimeoutRef = useRef(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownOpen && !event.target.closest('[data-user-dropdown]')) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userDropdownOpen]);

  const handleDashboardMouseEnter = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setDashboardDropdownOpen(true);
  };

  const handleDashboardMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setDashboardDropdownOpen(false);
    }, 300); // 300ms delay before closing
  };

  const handleDropdownMouseEnter = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
  };

  const handleDropdownMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setDashboardDropdownOpen(false);
    }, 200); // 300ms delay before closing
  };

  const handleDashboardItemClick = (item) => {
    onNavClick(item);
    setDashboardDropdownOpen(false);
  };

  return (
    <nav style={{ 
      background: "linear-gradient(135deg, #002e6e 0%, #0056b6 100%)", 
      padding: "11px 15px", 
      boxShadow: "0 8px 32px rgba(0, 46, 110, 0.15)",
      position: "sticky",
      top: 0,
      zIndex: 1000
    }}>
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        maxWidth: 1400, 
        margin: "0 auto",
        width: "100%"
      }}>
        {/* Left Section - Brand/Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ 
            width: 36, 
            height: 36, 
            background: "linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)", 
            borderRadius: "8px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            boxShadow: "0 4px 16px rgba(0, 180, 216, 0.3)",
            padding: "4px"
          }}>
            <img 
              src="/reconfiy_logo.png" 
              alt="Reconify Logo" 
              style={{ 
                width: "45px", 
                height: "50px", 
                objectFit: "contain",
                filter: "brightness(0) invert(1)" // Makes the logo white to match the design
              }} 
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
            <h1 style={{ margin: 0, color: "#fff", fontSize: 28, fontWeight: 800 }}>Reconify</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: 500 }}>by</span>
              <svg 
                width="30" 
                height="8" 
                viewBox="0 0 122.88 38.52" 
                style={{ filter: "brightness(0) invert(1)" }}
              >
                <g>
                  <path fill="#00BAF2" d="M122.47,11.36c-1.12-3.19-4.16-5.48-7.72-5.48h-0.08c-2.32,0-4.41,0.97-5.9,2.52 c-1.49-1.55-3.58-2.52-5.9-2.52h-0.07c-2.04,0-3.91,0.75-5.34,1.98V7.24c-0.05-0.63-0.56-1.12-1.2-1.12h-5.48 c-0.67,0-1.21,0.54-1.21,1.21v29.74c0,0.67,0.54,1.21,1.21,1.21h5.48c0.61,0,1.12-0.46,1.19-1.04l0-21.35c0-0.08,0-0.14,0.01-0.21 c0.09-0.95,0.79-1.74,1.89-1.83h1.01c0.46,0.04,0.85,0.2,1.15,0.45c0.48,0.38,0.74,0.96,0.74,1.6l0.02,21.24 c0,0.67,0.54,1.22,1.21,1.22h5.48c0.65,0,1.17-0.51,1.2-1.15l0-21.33c0-0.7,0.32-1.34,0.89-1.71c0.28-0.18,0.62-0.3,1.01-0.34h1.01 c1.19,0.1,1.9,1,1.9,2.05l0.02,21.22c0,0.67,0.54,1.21,1.21,1.21h5.48c0.64,0,1.17-0.5,1.21-1.13V13.91 C122.86,12.6,122.69,11.99,122.47,11.36L122.47,11.36z M85.39,6.2h-3.13V1.12c0-0.01,0-0.01,0-0.02C82.26,0.5,81.77,0,81.15,0 c-0.07,0-0.14,0.01-0.21,0.02c-3.47,0.95-2.78,5.76-9.12,6.17h-0.61c-0.09,0-0.18,0.01-0.27,0.03h-0.01l0.01,0 C70.41,6.35,70,6.83,70,7.41v5.48c0,0.67,0.54,1.21,1.21,1.21h3.3l-0.01,23.22c0,0.66,0.54,1.2,1.2,1.2h5.42 c0.66,0,1.2-0.54,1.2-1.2l0-23.22h3.07c0.66,0,1.21-0.55,1.21-1.21V7.41C86.6,6.74,86.06,6.2,85.39,6.2L85.39,6.2z"/>
                  <path fill="#20336B" d="M65.69,6.2h-5.48C59.55,6.2,59,6.74,59,7.41v11.33c-0.01,0.7-0.58,1.26-1.28,1.26h-2.29 c-0.71,0-1.29-0.57-1.29-1.28L54.12,7.41c0-0.67-0.54-1.21-1.21-1.21h-5.48c-0.67,0-1.21,0.54-1.21,1.21v12.41 c0,4.71,3.36,8.08,8.08,8.08c0,0,3.54,0,3.65,0.02c0.64,0.07,1.13,0.61,1.13,1.27c0,0.65-0.48,1.19-1.12,1.27 c-0.03,0-0.06,0.01-0.09,0.02l-8.01,0.03c-0.67,0-1.21,0.54-1.21,1.21v5.47c0,0.67,0.54,1.21,1.21,1.21h8.95 c4.72,0,8.08-3.36,8.08-8.07V7.41C66.9,6.74,66.36,6.2,65.69,6.2L65.69,6.2z M34.53,6.23h-7.6c-0.67,0-1.22,0.51-1.22,1.13v2.13 c0,0.01,0,0.03,0,0.04c0,0.02,0,0.03,0,0.05v2.92c0,0.66,0.58,1.21,1.29,1.21h7.24c0.57,0.09,1.02,0.51,1.09,1.16v0.71 c-0.06,0.62-0.51,1.07-1.06,1.12h-3.58c-4.77,0-8.16,3.17-8.16,7.61v6.37c0,4.42,2.92,7.56,7.65,7.56h9.93 c1.78,0,3.23-1.35,3.23-3.01V14.45C43.34,9.41,40.74,6.23,34.53,6.23L34.53,6.23z M35.4,29.09v0.86c0,0.07-0.01,0.14-0.02,0.2 c-0.01,0.06-0.03,0.12-0.05,0.18c-0.17,0.48-0.65,0.83-1.22,0.83h-2.28c-0.71,0-1.29-0.54-1.29-1.21v-1.03c0-0.01,0-0.03,0-0.04 l0-2.75v-0.86l0-0.01c0-0.66,0.58-1.2,1.29-1.2h2.28c0.71,0,1.29,0.54,1.29,1.21V29.09L35.4,29.09z M13.16,6.19H1.19 C0.53,6.19,0,6.73,0,7.38v5.37c0,0.01,0,0.02,0,0.03c0,0.03,0,0.05,0,0.07v24.29c0,0.66,0.49,1.2,1.11,1.21h5.58 c0.67,0,1.21-0.54,1.21-1.21l0.02-8.32h5.24c4.38,0,7.44-3.04,7.44-7.45v-7.72C20.6,9.25,17.54,6.19,13.16,6.19L13.16,6.19z M12.68,16.23v3.38c0,0.71-0.57,1.29-1.28,1.29l-3.47,0v-6.77h3.47c0.71,0,1.28,0.57,1.28,1.28V16.23L12.68,16.23z"/>
                </g>
              </svg>
            </div>
          </div>
        </div>

        {/* Center Section - Navigation Items */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {navItems.map(item => {
            // Special handling for Dashboard dropdown
            if (item.key === "reports") {
              return (
                <div
                  key={item.key}
                  style={{ position: "relative" }}
                  onMouseEnter={handleDashboardMouseEnter}
                  onMouseLeave={handleDashboardMouseLeave}
                >
                  <button
                    style={{
                      background: selected === item.key ? "rgba(255,255,255,0.2)" : "transparent",
                      color: selected === item.key ? "#fff" : "rgba(255,255,255,0.9)",
                      border: "none",
                      padding: "12px 20px",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 16,
                      fontWeight: selected === item.key ? 700 : 600,
                      textDecoration: "none",
                      transition: "all 0.3s ease",
                      backdropFilter: selected === item.key ? "blur(10px)" : "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 8
                    }}
                    onMouseEnter={(e) => {
                      if (selected !== item.key) {
                        e.target.style.background = "rgba(255,255,255,0.1)";
                        e.target.style.color = "#fff";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selected !== item.key) {
                        e.target.style.background = selected === item.key ? "rgba(255,255,255,0.2)" : "transparent";
                        e.target.style.color = selected === item.key ? "#fff" : "rgba(255,255,255,0.9)";
                      }
                    }}
                  >
                    {item.label}
                    <span style={{ fontSize: 12 }}>▼</span>
                  </button>
                  
                  {/* Dashboard Dropdown */}
                  {dashboardDropdownOpen && (
                    <div 
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        background: "linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)",
                        borderRadius: "16px",
                        boxShadow: "0 20px 60px rgba(0, 46, 110, 0.15), 0 8px 32px rgba(0, 46, 110, 0.1)",
                        border: "1px solid rgba(0, 46, 110, 0.1)",
                        padding: "20px",
                        zIndex: 1001,
                        minWidth: "320px",
                        marginTop: "8px",
                        backdropFilter: "blur(20px)"
                      }}
                      onMouseEnter={handleDropdownMouseEnter}
                      onMouseLeave={handleDropdownMouseLeave}
                    >
                      <div style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px"
                      }}>
                        <button
                          onClick={() => handleDashboardItemClick("recon_summary")}
                          style={{
                            background: "linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%)",
                            border: "1px solid rgba(0, 46, 110, 0.1)",
                            color: "#002e6e",
                            cursor: "pointer",
                            padding: "16px 20px",
                            borderRadius: "12px",
                            textAlign: "left",
                            transition: "all 0.3s ease",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            boxShadow: "0 4px 16px rgba(0, 46, 110, 0.06)"
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.transform = "translateY(-2px)";
                            e.target.style.boxShadow = "0 8px 24px rgba(0, 46, 110, 0.12)";
                            e.target.style.background = "linear-gradient(135deg, #ffffff 0%, #e8ecff 100%)";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "0 4px 16px rgba(0, 46, 110, 0.06)";
                            e.target.style.background = "linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%)";
                          }}
                        >
                          <div style={{ 
                            fontSize: 18, 
                            fontWeight: 700,
                            color: "#002e6e",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                          }}>
                            📊 Recon Summary
                          </div>
                          <div style={{ 
                            fontSize: 14, 
                            color: "#4a5568",
                            lineHeight: 1.4
                          }}>
                            View reconciliation summaries and details
                          </div>
                        </button>
                        
                        <button
                          onClick={() => handleDashboardItemClick("summary")}
                          style={{
                            background: "linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%)",
                            border: "1px solid rgba(0, 46, 110, 0.1)",
                            color: "#002e6e",
                            cursor: "pointer",
                            padding: "16px 20px",
                            borderRadius: "12px",
                            textAlign: "left",
                            transition: "all 0.3s ease",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            boxShadow: "0 4px 16px rgba(0, 46, 110, 0.06)"
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.transform = "translateY(-2px)";
                            e.target.style.boxShadow = "0 8px 24px rgba(0, 46, 110, 0.12)";
                            e.target.style.background = "linear-gradient(135deg, #ffffff 0%, #e8ecff 100%)";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "0 4px 16px rgba(0, 46, 110, 0.06)";
                            e.target.style.background = "linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%)";
                          }}
                        >
                          <div style={{ 
                            fontSize: 18, 
                            fontWeight: 700,
                            color: "#002e6e",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                          }}>
                            👥 Summary
                          </div>
                          <div style={{ 
                            fontSize: 14, 
                            color: "#4a5568",
                            lineHeight: 1.4
                          }}>
                            View user summary and analytics
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            }
            
            // Regular navigation items
            return (
            <button
              key={item.key}
              onClick={() => onNavClick(item.key)}
              style={{
                  background: selected === item.key ? "rgba(255,255,255,0.2)" : "transparent",
                color: selected === item.key ? "#fff" : "rgba(255,255,255,0.9)",
                border: "none",
                padding: "12px 20px",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 16,
                fontWeight: selected === item.key ? 700 : 600,
                textDecoration: "none",
                transition: "all 0.3s ease",
                backdropFilter: selected === item.key ? "blur(10px)" : "none"
              }}
              onMouseEnter={(e) => {
                if (selected !== item.key) {
                  e.target.style.background = "rgba(255,255,255,0.1)";
                  e.target.style.color = "#fff";
                }
              }}
              onMouseLeave={(e) => {
                if (selected !== item.key) {
                  e.target.style.background = "transparent";
                  e.target.style.color = "rgba(255,255,255,0.9)";
                }
              }}
            >
              {item.label}
            </button>
            );
          })}
        </div>

        {/* Right Section - Utility Icons */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <button
            className="grid-button"
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff",
              cursor: "pointer",
              padding: "12px",
              borderRadius: "12px",
              fontSize: 16,
              fontWeight: "bold",
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
              transition: "all 0.3s ease",
              position: "relative",
              width: "44px",
              height: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(10px)"
            }}
            onClick={onToggleDropdown}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.05)";
              e.target.style.background = "rgba(255,255,255,0.25)";
              e.target.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.background = "rgba(255,255,255,0.15)";
              e.target.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
            }}
          >
            {/* 3x3 Grid Icon */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gridTemplateRows: "repeat(3, 1fr)",
              gap: "2px",
              width: "18px",
              height: "18px"
            }}>
              <div style={{
                width: "4px",
                height: "4px",
                background: "#fff",
                borderRadius: "50%"
              }}></div>
              <div style={{
                width: "4px",
                height: "4px",
                background: "#fff",
                borderRadius: "50%"
              }}></div>
              <div style={{
                width: "4px",
                height: "4px",
                background: "#fff",
                borderRadius: "50%"
              }}></div>
              <div style={{
                width: "4px",
                height: "4px",
                background: "#fff",
                borderRadius: "50%"
              }}></div>
              <div style={{
                width: "4px",
                height: "4px",
                background: "#fff",
                borderRadius: "50%"
              }}></div>
              <div style={{
                width: "4px",
                height: "4px",
                background: "#fff",
                borderRadius: "50%"
              }}></div>
              <div style={{
                width: "4px",
                height: "4px",
                background: "#fff",
                borderRadius: "50%"
              }}></div>
              <div style={{
                width: "4px",
                height: "4px",
                background: "#fff",
                borderRadius: "50%"
              }}></div>
              <div style={{
                width: "4px",
                height: "4px",
                background: "#fff",
                borderRadius: "50%"
              }}></div>
            </div>
          </button>
          {/* User Profile Section */}
          <div style={{
            position: "relative",
            display: "flex",
            alignItems: "center"
          }} data-user-dropdown>
            {/* User Avatar with Dropdown */}
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              style={{
                width: 40,
                height: 40,
              background: "linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: "bold",
                fontSize: 16,
                boxShadow: "0 2px 8px rgba(0, 180, 216, 0.3)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "scale(1.05)";
                e.target.style.boxShadow = "0 4px 12px rgba(0, 180, 216, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "scale(1)";
                e.target.style.boxShadow = "0 2px 8px rgba(0, 180, 216, 0.3)";
              }}
            >
              {user?.picture ? (
                <img 
                  src={user.picture} 
                  alt="Profile" 
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    objectFit: "cover"
                  }}
                />
              ) : (
                user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"
              )}
            </button>
            
            {/* User Dropdown Menu */}
            {userDropdownOpen && (
            <div style={{
                position: "absolute",
                top: "100%",
                right: 0,
                background: "linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)",
                borderRadius: "12px",
                boxShadow: "0 20px 60px rgba(0, 46, 110, 0.15), 0 8px 32px rgba(0, 46, 110, 0.1)",
                border: "1px solid rgba(0, 46, 110, 0.1)",
                padding: "12px",
                zIndex: 1001,
                minWidth: "200px",
                marginTop: "8px",
                backdropFilter: "blur(20px)"
              }}>
                {/* User Info in Dropdown */}
                <div style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid rgba(0, 46, 110, 0.1)",
                  marginBottom: "8px"
            }}>
                  <div style={{
                    color: "#002e6e",
                    fontSize: 14,
                fontWeight: "600",
                    marginBottom: "2px"
              }}>
                {user?.name || "User"}
                  </div>
                  <div style={{
                    color: "#6c757d",
                    fontSize: 12
              }}>
                {user?.email}
                  </div>
            </div>
            
            {/* Logout Button */}
            <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    onLogout();
                  }}
              style={{
                    width: "100%",
                    background: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
                border: "none",
                    borderRadius: "8px",
                color: "#fff",
                cursor: "pointer",
                    padding: "10px 16px",
                    fontSize: 14,
                fontWeight: "600",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
              }}
              onMouseEnter={(e) => {
                    e.target.style.background = "linear-gradient(135deg, #c82333 0%, #bd2130 100%)";
                    e.target.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                    e.target.style.background = "linear-gradient(135deg, #dc3545 0%, #c82333 100%)";
                    e.target.style.transform = "translateY(0)";
              }}
            >
                  🚪 Logout
            </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 