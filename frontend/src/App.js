import React, { useState } from "react";
import AddPanel from "./components/panels/AddPanel";
import ModifyPanel from "./components/panels/ModifyPanel";
import DeletePanel from "./components/panels/DeletePanel";
import SOTUpload from "./components/uploads/SOTUpload";
import Reconciliation from "./components/reconciliation/Reconciliation";
import UserSummary from "./components/summaries/UserSummary";
import AppLauncher from "./components/common/AppLauncher";
import UserMenu from "./components/common/UserMenu";
import Reconsummary from "./components/reconciliation/Reconsummary";
import InitialSummary from "./components/summaries/InitialSummary";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";

// Available navigation items based on current functionality
const NAV_ITEMS = [
  { key: "home", label: "Home", component: null },
  { key: "config", label: "Config", component: null },
  { key: "sot_upload", label: "SOT Upload", component: <SOTUpload /> },
  { key: "user_summary", label: "Reports", component: (
    <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
      <div>
        <Reconsummary />
      </div>
      <div>
        <InitialSummary />
      </div>
      <div>
        <UserSummary />
      </div>
    </div>
  ) },
  { key: "reconciliation", label: "Reconciliation", component: <Reconciliation /> },
];

function App() {
  const [selected, setSelected] = useState("home");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState("");

  const handleNavClick = (key) => {
    setSelected(key);
    setShowDropdown(false);
  };

  const handleFunctionChange = (e) => {
    setSelectedFunction(e.target.value);
  };

  const handleLinkClick = (link) => {
    console.log(`Navigating to: ${link.name}`);
    window.open(link.url, '_blank', 'noopener,noreferrer');
    setShowDropdown(false);
  };

  const handleOutsideClick = (e) => {
    if (e.target.closest('.popup-menu') || e.target.closest('.grid-button')) {
      return;
    }
    setShowDropdown(false);
  };

  // Add click outside listener
  React.useEffect(() => {
    if (showDropdown) {
      document.addEventListener('click', handleOutsideClick);
      return () => document.removeEventListener('click', handleOutsideClick);
    }
  }, [showDropdown]);

  const renderPanelComponent = () => {
    if (!selectedFunction) return null;

    const componentStyle = {
      background: "linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)",
      padding: 32,
      borderRadius: 16,
      marginTop: 24,
      border: "1px solid #e8ecff",
      boxShadow: "0 8px 32px rgba(0, 123, 255, 0.08), 0 4px 16px rgba(0, 123, 255, 0.04)"
    };

    switch (selectedFunction) {
      case "add":
        return (
          <div style={componentStyle}>
            <h3 style={{ color: "#002e6e", marginBottom: 16, fontSize: 20, fontWeight: 700 }}>Add Panel</h3>
            <AddPanel />
          </div>
        );
      case "modify":
        return (
          <div style={componentStyle}>
            <h3 style={{ color: "#002e6e", marginBottom: 16, fontSize: 20, fontWeight: 700 }}>Modify Panel</h3>
            <ModifyPanel />
          </div>
        );
      case "delete":
        return (
          <div style={componentStyle}>
            <h3 style={{ color: "#002e6e", marginBottom: 16, fontSize: 20, fontWeight: 700 }}>Delete Panel</h3>
            <DeletePanel />
          </div>
        );
      default:
        return null;
    }
  };

  const renderContent = () => {
    const selectedItem = NAV_ITEMS.find(item => item.key === selected);
    
    if (selectedItem?.component) {
      return selectedItem.component;
    }
    
    // Default content for tabs without specific components
    switch (selected) {
      case "home":
        return (
          <div style={{ 
            maxWidth: 1000, 
            margin: "40px auto", 
            background: "linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)", 
            borderRadius: 20, 
            boxShadow: "0 20px 60px rgba(0, 123, 255, 0.1), 0 8px 32px rgba(0, 123, 255, 0.05)", 
            padding: 48, 
            border: "1px solid #e8ecff" 
          }}>
            <h2 style={{ 
              textAlign: "center", 
              color: "#002e6e", 
              marginBottom: 24, 
              fontSize: 32, 
              fontWeight: 800,
              background: "linear-gradient(135deg, #002e6e 0%, #0056b3 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}>Welcome to Reconify</h2>
            <p style={{ 
              textAlign: "center", 
              color: "#4a5568", 
              fontSize: 18, 
              lineHeight: 1.7,
              marginBottom: 40
            }}>
              Data reconciliation and panel management system for efficient user categorization and HR data processing.
            </p>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
              gap: 24, 
              marginTop: 32 
            }}>
              <div style={{ 
                background: "linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%)", 
                padding: 32, 
                borderRadius: 16, 
                textAlign: "center",
                border: "1px solid #e8ecff",
                boxShadow: "0 8px 24px rgba(0, 123, 255, 0.06)",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-4px)";
                e.target.style.boxShadow = "0 12px 32px rgba(0, 123, 255, 0.12)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 8px 24px rgba(0, 123, 255, 0.06)";
              }}>
                <div style={{ 
                  width: 60, 
                  height: 60, 
                  background: "linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)", 
                  borderRadius: "50%", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  fontSize: 24
                }}>
                  📊
                </div>
                <h3 style={{ color: "#002e6e", marginBottom: 12, fontSize: 20, fontWeight: 700 }}>Reconciliation</h3>
                <p style={{ color: "#4a5568", fontSize: 15, lineHeight: 1.6 }}>Process panel data with HR information for user categorization</p>
              </div>
              <div style={{ 
                background: "linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%)", 
                padding: 32, 
                borderRadius: 16, 
                textAlign: "center",
                border: "1px solid #e8ecff",
                boxShadow: "0 8px 24px rgba(0, 123, 255, 0.06)",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-4px)";
                e.target.style.boxShadow = "0 12px 32px rgba(0, 123, 255, 0.12)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 8px 24px rgba(0, 123, 255, 0.06)";
              }}>
                <div style={{ 
                  width: 60, 
                  height: 60, 
                  background: "linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)", 
                  borderRadius: "50%", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  fontSize: 24
                }}>
                  📋
                </div>
                <h3 style={{ color: "#002e6e", marginBottom: 12, fontSize: 20, fontWeight: 700 }}>SOT Management</h3>
                <p style={{ color: "#4a5568", fontSize: 15, lineHeight: 1.6 }}>Upload and manage Source of Truth data files</p>
              </div>
              <div style={{ 
                background: "linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%)", 
                padding: 32, 
                borderRadius: 16, 
                textAlign: "center",
                border: "1px solid #e8ecff",
                boxShadow: "0 8px 24px rgba(0, 123, 255, 0.06)",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-4px)";
                e.target.style.boxShadow = "0 12px 32px rgba(0, 123, 255, 0.12)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 8px 24px rgba(0, 123, 255, 0.06)";
              }}>
                <div style={{ 
                  width: 60, 
                  height: 60, 
                  background: "linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)", 
                  borderRadius: "50%", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  fontSize: 24
                }}>
                  👥
                </div>
                <h3 style={{ color: "#002e6e", marginBottom: 12, fontSize: 20, fontWeight: 700 }}>User Summary</h3>
                <p style={{ color: "#4a5568", fontSize: 15, lineHeight: 1.6 }}>View comprehensive user data across all panels</p>
              </div>
            </div>
          </div>
        );
      case "config":
        return (
          <div style={{ 
            maxWidth: 900, 
            margin: "40px auto", 
            background: "linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)", 
            borderRadius: 20, 
            boxShadow: "0 20px 60px rgba(0, 123, 255, 0.1), 0 8px 32px rgba(0, 123, 255, 0.05)", 
            padding: "10px 20px", 
            border: "1px solid #e8ecff" 
          }}>
            <h2 style={{ 
              textAlign: "center", 
              color: "#002e6e", 
              marginBottom: 40, 
              fontSize: 28, 
              fontWeight: 800,
              // background: "linear-gradient(135deg, #002e6e 0%, #0056b6 100%)",
              // WebkitBackgroundClip: "text",
              // WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}>Configuration Panel</h2>
            
            <div style={{ marginBottom: 40 }}>
              {/* Function Dropdown */}
              <div style={{ maxWidth: 400, margin: "0 auto" }}>
                <label style={{ 
                  display: "block", 
                  marginBottom: 12, 
                  color: "#002e6e", 
                  fontWeight: 600, 
                  fontSize: 16 
                }}>
                  Select Function:
                </label>
                <select 
                  value={selectedFunction}
                  onChange={handleFunctionChange}
                  style={{
                    width: "100%",
                    padding: "16px 20px",
                    border: selectedFunction ? "2px solid #00b4d8" : "2px solid #e8ecff",
                    borderRadius: 12,
                    fontSize: 16,
                    backgroundColor: "#fff",
                    color: selectedFunction ? "#002e6e" : "#4a5568",
                    cursor: "pointer",
                    outline: "none",
                    transition: "all 0.3s ease",
                    boxShadow: "0 4px 12px rgba(0, 123, 255, 0.08)"
                  }}
                >
                  <option value="">-- Select Function --</option>
                  <option value="add">Add Panel</option>
                  <option value="modify">Modify Panel</option>
                  <option value="delete">Delete Panel</option>
                </select>
              </div>
            </div>

            {/* Panel Component */}
            {renderPanelComponent()}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AuthProvider>
      <ProtectedRoute>
        <div style={{ 
          fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", 
          background: "linear-gradient(135deg, #f8f9ff 0%, #e8ecff 100%)", 
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column"
        }}>
          {/* Navigation Bar - Modern Paytm-inspired design */}
          <nav style={{ 
            background: "linear-gradient(135deg, #002e6e 0%, #0056b6 100%)", 
            padding: "12px 15px", 
            boxShadow: "0 8px 32px rgba(0, 46, 110, 0.15)",
            position: "sticky",
            top: 0,
            zIndex: 1000
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 48, maxWidth: 1400, margin: "0 auto" }}>
              {/* Left Section - Brand/Logo */}
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  background: "linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)", 
                  borderRadius: "12px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  boxShadow: "0 4px 16px rgba(0, 180, 216, 0.3)"
                }}>
                  <span style={{ fontSize: 20, fontWeight: "bold", color: "#fff" }}>✓</span>
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

              {/* Center Section - Navigation Links */}
              <div style={{ display: "flex", alignItems: "center", gap: 40, marginLeft: "auto" }}>
                {NAV_ITEMS.map(item => (
                  <button
                    key={item.key}
                    onClick={() => handleNavClick(item.key)}
                    style={{
                      background: selected === item.key ? "rgba(255,255,255,0.15)" : "transparent",
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
                ))}
              </div>

              {/* Right Section - Utility Icons */}
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginLeft: 40 }}>
                {/* App Launcher Container */}
                <div style={{ position: "relative" }}>
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
                    onClick={() => setShowDropdown(!showDropdown)}
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
                  
                  {/* App Launcher Popup */}
                  <AppLauncher 
                    isOpen={showDropdown}
                    onClose={() => setShowDropdown(false)}
                    onLinkClick={handleLinkClick}
                  />
                </div>
                
                {/* User Menu */}
                <UserMenu />
              </div>
            </div>
          </nav>

          {/* App Launcher Popup */}
          {/* AppLauncher 
            isOpen={showDropdown}
            onClose={() => setShowDropdown(false)}
            onLinkClick={handleLinkClick}
          /> */}

          {/* Main Content */}
          <main style={{ flex: 1, padding: "0 20px" }}>
            {renderContent()}
          </main>

          {/* Footer */}
          <footer style={{
            // background: "linear-gradient(135deg, #002e6e 0%, #0056b6 100%)",
             padding: "16px 20px",
            // marginTop: "auto",
            // boxShadow: "0 -8px 32px rgba(0, 46, 110, 0.15)"
          }}>
            <div style={{
              maxWidth: 1200,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8
            }}>
              <span style={{
                color: "#000000",
                fontSize: 14,
                fontWeight: 500
              }}>
                Made with
              </span>
              <span style={{
                color: "#ff6b6b",
                fontSize: 16,
                animation: "heartbeat 1.5s ease-in-out infinite"
              }}>
                ❤️
              </span>
              <span style={{
                color: "#000000",
                fontSize: 14,
                fontWeight: 500
              }}>
                by
              </span>
              <div 
              // style={{
              //   display: "flex",
              //   alignItems: "center",
              //   gap: 2,
              //   background: "rgba(255,255,255,0.1)",
              //   padding: "6px 12px",
              //   borderRadius: "6px",
              //   backdropFilter: "blur(10px)"
              // }}
              >
                <svg 
                  width="60" 
                  height="20" 
                  viewBox="0 0 122.88 38.52" 
                >
                  <g>
                    <path fill="#00BAF2" d="M122.47,11.36c-1.12-3.19-4.16-5.48-7.72-5.48h-0.08c-2.32,0-4.41,0.97-5.9,2.52 c-1.49-1.55-3.58-2.52-5.9-2.52h-0.07c-2.04,0-3.91,0.75-5.34,1.98V7.24c-0.05-0.63-0.56-1.12-1.2-1.12h-5.48 c-0.67,0-1.21,0.54-1.21,1.21v29.74c0,0.67,0.54,1.21,1.21,1.21h5.48c0.61,0,1.12-0.46,1.19-1.04l0-21.35c0-0.08,0-0.14,0.01-0.21 c0.09-0.95,0.79-1.74,1.89-1.83h1.01c0.46,0.04,0.85,0.2,1.15,0.45c0.48,0.38,0.74,0.96,0.74,1.6l0.02,21.24 c0,0.67,0.54,1.22,1.21,1.22h5.48c0.65,0,1.17-0.51,1.2-1.15l0-21.33c0-0.7,0.32-1.34,0.89-1.71c0.28-0.18,0.62-0.3,1.01-0.34h1.01 c1.19,0.1,1.9,1,1.9,2.05l0.02,21.22c0,0.67,0.54,1.21,1.21,1.21h5.48c0.64,0,1.17-0.5,1.21-1.13V13.91 C122.86,12.6,122.69,11.99,122.47,11.36L122.47,11.36z M85.39,6.2h-3.13V1.12c0-0.01,0-0.01,0-0.02C82.26,0.5,81.77,0,81.15,0 c-0.07,0-0.14,0.01-0.21,0.02c-3.47,0.95-2.78,5.76-9.12,6.17h-0.61c-0.09,0-0.18,0.01-0.27,0.03h-0.01l0.01,0 C70.41,6.35,70,6.83,70,7.41v5.48c0,0.67,0.54,1.21,1.21,1.21h3.3l-0.01,23.22c0,0.66,0.54,1.2,1.2,1.2h5.42 c0.66,0,1.2-0.54,1.2-1.2l0-23.22h3.07c0.66,0,1.21-0.55,1.21-1.21V7.41C86.6,6.74,86.06,6.2,85.39,6.2L85.39,6.2z"/>
                      <path fill="#20336B" d="M65.69,6.2h-5.48C59.55,6.2,59,6.74,59,7.41v11.33c-0.01,0.7-0.58,1.26-1.28,1.26h-2.29 c-0.71,0-1.29-0.57-1.29-1.28L54.12,7.41c0-0.67-0.54-1.21-1.21-1.21h-5.48c-0.67,0-1.21,0.54-1.21,1.21v12.41 c0,4.71,3.36,8.08,8.08,8.08c0,0,3.54,0,3.65,0.02c0.64,0.07,1.13,0.61,1.13,1.27c0,0.65-0.48,1.19-1.12,1.27 c-0.03,0-0.06,0.01-0.09,0.02l-8.01,0.03c-0.67,0-1.21,0.54-1.21,1.21v5.47c0,0.67,0.54,1.21,1.21,1.21h8.95 c4.72,0,8.08-3.36,8.08-8.07V7.41C66.9,6.74,66.36,6.2,65.69,6.2L65.69,6.2z M34.53,6.23h-7.6c-0.67,0-1.22,0.51-1.22,1.13v2.13 c0,0.01,0,0.03,0,0.04c0,0.02,0,0.03,0,0.05v2.92c0,0.66,0.58,1.21,1.29,1.21h7.24c0.57,0.09,1.02,0.51,1.09,1.16v0.71 c-0.06,0.62-0.51,1.07-1.06,1.12h-3.58c-4.77,0-8.16,3.17-8.16,7.61v6.37c0,4.42,2.92,7.56,7.65,7.56h9.93 c1.78,0,3.23-1.35,3.23-3.01V14.45C43.34,9.41,40.74,6.23,34.53,6.23L34.53,6.23z M35.4,29.09v0.86c0,0.07-0.01,0.14-0.02,0.2 c-0.01,0.06-0.03,0.12-0.05,0.18c-0.17,0.48-0.65,0.83-1.22,0.83h-2.28c-0.71,0-1.29-0.54-1.29-1.21v-1.03c0-0.01,0-0.03,0-0.04 l0-2.75v-0.86l0-0.01c0-0.66,0.58-1.2,1.29-1.2h2.28c0.71,0,1.29,0.54,1.29,1.21V29.09L35.4,29.09z M13.16,6.19H1.19 C0.53,6.19,0,6.73,0,7.38v5.37c0,0.01,0,0.02,0,0.03c0,0.03,0,0.05,0,0.07v24.29c0,0.66,0.49,1.2,1.11,1.21h5.58 c0.67,0,1.21-0.54,1.21-1.21l0.02-8.32h5.24c4.38,0,7.44-3.04,7.44-7.45v-7.72C20.6,9.25,17.54,6.19,13.16,6.19L13.16,6.19z M12.68,16.23v3.38c0,0.71-0.57,1.29-1.28,1.29l-3.47,0v-6.77h3.47c0.71,0,1.28,0.57,1.28,1.28V16.23L12.68,16.23z"/>
                  </g>
                </svg>
              </div>
            </div>
          </footer>

          {/* CSS for heartbeat animation */}
          <style>
            {`
              @keyframes heartbeat {
                0% { transform: scale(1); }
                14% { transform: scale(1.1); }
                28% { transform: scale(1); }
                42% { transform: scale(1.1); }
                70% { transform: scale(1); }
              }
            `}
          </style>
    </div>
      </ProtectedRoute>
    </AuthProvider>
  );
}

export default App; 