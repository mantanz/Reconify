import React, { useState, useEffect } from "react";
import Config from "../components/panels/Config";
import SOTUpload from "../components/uploads/SOTUpload";
import Reconciliation from "../components/reconciliation/Reconciliation";
import UserSummary from "../components/reports/UserSummary";
import AppLauncher from "../components/common/AppLauncher";
import Reconsummary from "../components/reports/Reconsummary";
import AuditTrail from "../components/common/AuditTrail";
import LoadingSpinner from "../components/common/LoadingSpinner";
import Navigation from "../components/common/Navigation";
import Footer from "../components/common/Footer";
import { AuthProvider, useAuth } from "../auth/AuthContext";
import Login from "../auth/Login";

// Available navigation items based on current functionality
const NAV_ITEMS = [
  { key: "home", label: "Home", component: null },
  { key: "config", label: "Config", component: <Config /> },
  { key: "sot", label: "SOT", component: <SOTUpload /> },
  { key: "reconciliation", label: "Reconciliation", component: <Reconciliation /> },
  { key: "recertification", label: "Recertification", component: null },
  { key: "reports", label: "Dashboard", component: (
    <div>
      <Reconsummary />
      <UserSummary />
    </div>
  ) },
  { key: "audit_trails", label: "Audit", component: <AuditTrail /> },
];

function AppContent() {
  const [selected, setSelected] = useState("home");
  const [showDropdown, setShowDropdown] = useState(false);
  const { user, loading, logout } = useAuth();

  // Global error handler for authentication errors
  useEffect(() => {
    const handleGlobalError = (event) => {
      if (event.error && event.error.message === 'Token expired') {
        logout();
      }
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.message === 'Token expired') {
        logout();
      }
    });

    return () => {
      window.removeEventListener('error', handleGlobalError);
    };
  }, [logout]);

  const handleNavClick = (key) => {
    setSelected(key);
    setShowDropdown(false);
  };

  const handleLinkClick = (link) => {
    console.log(`Navigating to: ${link.name}`);
    // You can add actual navigation logic here
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

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner message="Checking authentication..." />;
  }

  // Show login page if not authenticated
  if (!user) {
    return <Login />;
    }

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

      default:
        return null;
    }
  };

  return (
    <div style={{ 
      fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", 
      background: "linear-gradient(135deg, #f8f9ff 0%, #e8ecff 100%)", 
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column"
    }}>
      {/* Navigation Bar */}
      <Navigation
        selected={selected}
        onNavClick={handleNavClick}
        showDropdown={showDropdown}
        onToggleDropdown={() => setShowDropdown(!showDropdown)}
        onLinkClick={handleLinkClick}
        user={user}
        onLogout={logout}
        navItems={NAV_ITEMS}
      />

      {/* App Launcher Popup */}
      <AppLauncher 
        isOpen={showDropdown}
        onClose={() => setShowDropdown(false)}
        onLinkClick={handleLinkClick}
      />

      {/* Main Content */}
      <main style={{ flex: 1, padding: "0 20px" }}>
        {renderContent()}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App; 