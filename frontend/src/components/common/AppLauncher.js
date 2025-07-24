import React from "react";

export default function AppLauncher({ isOpen, onClose, onLinkClick }) {
  if (!isOpen) return null;

  const quickLinks = [
    {
      name: "Account",
      url: "https://myaccount.google.com",
      icon: "👤",
      color: "#8e63ce",
      description: "Manage your account"
    },
    {
      name: "Gmail",
      url: "https://mail.google.com",
      icon: "📧",
      color: "#ea4335",
      description: "Check your email"
    },
    {
      name: "Drive",
      url: "https://drive.google.com",
      icon: "📁",
      color: "#4285f4",
      description: "Access your files"
    },
    {
      name: "Gemini",
      url: "https://gemini.google.com",
      icon: "✨",
      color: "#34a853",
      description: "AI assistant"
    },
    {
      name: "Docs",
      url: "https://docs.google.com",
      icon: "📄",
      color: "#4285f4",
      description: "Create documents"
    },
    {
      name: "Sheets",
      url: "https://sheets.google.com",
      icon: "📊",
      color: "#0f9d58",
      description: "Spreadsheets"
    },
    {
      name: "Slides",
      url: "https://slides.google.com",
      icon: "📽️",
      color: "#f4b400",
      description: "Presentations"
    },
    {
      name: "Calendar",
      url: "https://calendar.google.com",
      icon: "📅",
      color: "#4285f4",
      description: "Manage your schedule"
    },
    {
      name: "Chat",
      url: "https://chat.google.com",
      icon: "💬",
      color: "#34a853",
      description: "Team chat"
    },
    {
      name: "Meet",
      url: "https://meet.google.com",
      icon: "🎥",
      color: "#ea4335",
      description: "Video meetings"
    },
    {
      name: "Vids",
      url: "https://vids.google.com",
      icon: "🎬",
      color: "#8e63ce",
      description: "Video creation"
    },
    {
      name: "Forms",
      url: "https://forms.google.com",
      icon: "📝",
      color: "#8e63ce",
      description: "Create surveys"
    }
  ];

  return (
    <div 
      className="popup-menu"
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        background: "#2d2d2d",
        borderRadius: "16px",
        padding: "20px",
        width: "320px",
        maxHeight: "480px",
        overflow: "auto",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3), 0 8px 32px rgba(0, 0, 0, 0.2)",
        border: "1px solid #404040",
        zIndex: 1000,
        animation: "fadeIn 0.2s ease-out"
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          background: "rgba(255, 255, 255, 0.1)",
          border: "none",
          fontSize: 16,
          cursor: "pointer",
          color: "#ffffff",
          width: 24,
          height: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          transition: "background-color 0.2s"
        }}
        onMouseEnter={(e) => {
          e.target.style.background = "rgba(255, 255, 255, 0.2)";
        }}
        onMouseLeave={(e) => {
          e.target.style.background = "rgba(255, 255, 255, 0.1)";
        }}
      >
        ×
      </button>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <h3 style={{
          color: "#ffffff",
          margin: "0 0 4px 0",
          fontSize: "16px",
          fontWeight: "500"
        }}>
          Quick Access
        </h3>
        <p style={{
          color: "#b0b0b0",
          margin: 0,
          fontSize: "12px"
        }}>
          Access your Google apps
        </p>
      </div>

      {/* Grid of Quick Links */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 12
      }}>
        {quickLinks.map((link, index) => (
          <button
            key={index}
            onClick={() => onLinkClick(link)}
            style={{
              background: "transparent",
              border: "none",
              borderRadius: "12px",
              padding: "12px 8px",
              cursor: "pointer",
              textAlign: "center",
              transition: "all 0.2s ease",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              minHeight: "80px",
              justifyContent: "center"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.1)";
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
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)"
            }}>
              {link.icon}
            </div>
            <div style={{
              fontWeight: "500",
              color: "#ffffff",
              fontSize: "11px",
              lineHeight: "1.2"
            }}>
              {link.name}
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: "16px",
        paddingTop: "12px",
        borderTop: "1px solid #404040",
        textAlign: "center"
      }}>
        <p style={{
          color: "#b0b0b0",
          fontSize: "11px",
          margin: 0
        }}>
          Click any app to open
        </p>
      </div>

      {/* CSS for fadeIn animation */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
} 