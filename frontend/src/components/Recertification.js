import React from "react";

export default function Recertification() {
  const handleGoBack = () => {
    // Refresh the page to return to home tab
    window.location.reload();
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Background decorative elements */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 20% 30%, rgba(255, 182, 193, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(255, 105, 180, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 40% 80%, rgba(255, 20, 147, 0.05) 0%, transparent 50%)
        `,
        pointerEvents: "none"
      }} />
      
      {/* Subtle lines */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          linear-gradient(90deg, transparent 98%, rgba(255,255,255,0.3) 100%),
          linear-gradient(0deg, transparent 98%, rgba(255,255,255,0.3) 100%)
        `,
        backgroundSize: "50px 50px",
        pointerEvents: "none"
      }} />

      <div style={{
        display: "flex",
        maxWidth: "1200px",
        width: "100%",
        background: "white",
        borderRadius: "20px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
        overflow: "hidden",
        position: "relative",
        zIndex: 1
      }}>
        {/* Left Section - Text Content */}
        <div style={{
          flex: "1",
          padding: "60px 40px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center"
        }}>
          <h1 style={{
            fontSize: "3.5rem",
            fontWeight: "700",
            color: "#343a40",
            margin: "0 0 20px 0",
            lineHeight: "1.1"
          }}>
            Recertification
          </h1>
          
          <h2 style={{
            fontSize: "2.5rem",
            fontWeight: "600",
            color: "#343a40",
            margin: "0 0 30px 0",
            lineHeight: "1.2"
          }}>
            Coming Soon
          </h2>
          
          <p style={{
            fontSize: "1.1rem",
            color: "#6c757d",
            lineHeight: "1.6",
            margin: "0 0 40px 0",
            maxWidth: "400px"
          }}>
            We're working hard to bring you a comprehensive recertification system. 
            This feature will help you manage user access reviews and compliance requirements.
          </p>
          
          <button
            onClick={handleGoBack}
            style={{
              background: "#dc3545",
              color: "white",
              border: "none",
              padding: "15px 30px",
              borderRadius: "10px",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 15px rgba(220, 53, 69, 0.3)"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#c82333";
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 6px 20px rgba(220, 53, 69, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#dc3545";
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 15px rgba(220, 53, 69, 0.3)";
            }}
          >
            Return to Home
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
          </button>
        </div>

        {/* Right Section - Illustration */}
        <div style={{
          flex: "1",
          padding: "60px 40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative"
        }}>
          {/* Large "DEMO" text */}
          <div style={{
            fontSize: "6rem",
            fontWeight: "700",
            color: "#343a40",
            marginBottom: "20px",
            opacity: "0.1"
          }}>
            DEMO
          </div>
          
          {/* Subtitle */}
          <div style={{
            fontSize: "1.5rem",
            color: "#6c757d",
            marginBottom: "40px",
            textAlign: "center"
          }}>
            Feature in Development
          </div>

          {/* Illustration Container */}
          <div style={{
            position: "relative",
            width: "300px",
            height: "300px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            {/* Central Icon */}
            <div style={{
              width: "120px",
              height: "120px",
              background: "linear-gradient(135deg, #dc3545, #fd7e14)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 30px rgba(220, 53, 69, 0.3)",
              position: "relative"
            }}>
              <svg width="50" height="50" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>

            {/* Floating elements around the icon */}
            <div style={{
              position: "absolute",
              top: "20px",
              left: "20px",
              width: "40px",
              height: "40px",
              background: "rgba(220, 53, 69, 0.1)",
              borderRadius: "50%",
              animation: "float 3s ease-in-out infinite"
            }} />
            
            <div style={{
              position: "absolute",
              top: "40px",
              right: "30px",
              width: "30px",
              height: "30px",
              background: "rgba(253, 126, 20, 0.1)",
              borderRadius: "50%",
              animation: "float 3s ease-in-out infinite 1s"
            }} />
            
            <div style={{
              position: "absolute",
              bottom: "30px",
              left: "40px",
              width: "35px",
              height: "35px",
              background: "rgba(220, 53, 69, 0.1)",
              borderRadius: "50%",
              animation: "float 3s ease-in-out infinite 2s"
            }} />
            
            <div style={{
              position: "absolute",
              bottom: "20px",
              right: "20px",
              width: "25px",
              height: "25px",
              background: "rgba(253, 126, 20, 0.1)",
              borderRadius: "50%",
              animation: "float 3s ease-in-out infinite 0.5s"
            }} />
          </div>

          {/* Feature list */}
          <div style={{
            marginTop: "40px",
            textAlign: "center"
          }}>
            <h3 style={{
              fontSize: "1.2rem",
              color: "#343a40",
              marginBottom: "20px"
            }}>
              Planned Features:
            </h3>
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              fontSize: "0.9rem",
              color: "#6c757d"
            }}>
              <div>✓ User Access Reviews</div>
              <div>✓ Compliance Monitoring</div>
              <div>✓ Automated Recertification</div>
              <div>✓ Audit Trail Integration</div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
} 