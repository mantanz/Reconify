import React from "react";

// Panel website links with logos
const panelLinks = [
  { name: "Dashboard", icon: "📊", url: "#", color: "#007bff" },
  { name: "Analytics", icon: "📈", url: "#", color: "#28a745" },
  { name: "Reports", icon: "📋", url: "#", color: "#ffc107" },
  { name: "Settings", icon: "⚙️", url: "#", color: "#6c757d" },
  { name: "Users", icon: "👥", url: "#", color: "#17a2b8" },
  { name: "Data", icon: "💾", url: "#", color: "#6f42c1" },
  { name: "Tools", icon: "🔧", url: "#", color: "#fd7e14" },
  { name: "Help", icon: "❓", url: "#", color: "#e83e8c" },
  { name: "Profile", icon: "👤", url: "#", color: "#20c997" },
  { name: "Logout", icon: "🚪", url: "#", color: "#dc3545" },
  { name: "Support", icon: "🆘", url: "#", color: "#ff6b6b" },
  { name: "About", icon: "ℹ️", url: "#", color: "#495057" }
];

export default function AppLauncher({ isOpen, onClose, onLinkClick }) {
  if (!isOpen) return null;

  const handleLinkClick = (link) => {
    if (onLinkClick) {
      onLinkClick(link);
    } else {
      console.log(`Navigating to: ${link.name}`);
    }
    onClose();
  };

  return (
    <div className="popup-menu" style={{
      position: "absolute",
      top: "80px",
      right: "24px",
      background: "#2d3748",
      borderRadius: "12px",
      boxShadow: "0 10px 25px rgba(0,0,0,0.3), 0 4px 10px rgba(0,0,0,0.2)",
      border: "1px solid rgba(255,255,255,0.1)",
      padding: "20px",
      zIndex: 1001,
      minWidth: "320px",
      maxWidth: "400px"
    }}>
      {/* Header Section */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "20px",
        paddingBottom: "16px",
        borderBottom: "1px solid rgba(255,255,255,0.1)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ color: "#fff", fontSize: "14px", fontWeight: "500" }}>Reconify</span>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px" }}>Apps</span>
        </div>
        <div style={{
          width: "32px",
          height: "32px",
          background: "#28a745",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontWeight: "bold",
          fontSize: "14px"
        }}>
          R
        </div>
      </div>

      {/* Grid of Panel Links */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "16px"
      }}>
        {panelLinks.map((link, index) => (
          <button
            key={index}
            onClick={() => handleLinkClick(link)}
            style={{
              background: "transparent",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              padding: "12px 8px",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s ease",
              minHeight: "80px"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(255,255,255,0.1)";
              e.target.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "transparent";
              e.target.style.transform = "scale(1)";
            }}
          >
            <div style={{
              width: "40px",
              height: "40px",
              background: link.color,
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
            }}>
              {link.icon}
            </div>
            <span style={{
              fontSize: "12px",
              fontWeight: "500",
              textAlign: "center",
              lineHeight: "1.2"
            }}>
              {link.name}
            </span>
          </button>
        ))}
      </div>

      {/* Scroll Indicator */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        marginTop: "16px",
        paddingTop: "12px",
        borderTop: "1px solid rgba(255,255,255,0.1)"
      }}>
        <div style={{
          width: "6px",
          height: "6px",
          background: "#007bff",
          borderRadius: "50%",
          opacity: "0.7"
        }}></div>
      </div>
    </div>
  );
} 