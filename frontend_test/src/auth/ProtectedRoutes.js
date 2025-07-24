import React from "react";
import { useAuth } from "./AuthContext";
import Login from "./Login";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        textAlign: "center", 
        marginTop: 80,
        fontSize: 18,
        color: "#666"
      }}>
        Loading authentication...
      </div>
    );
  }
  
  // Show login page when not authenticated
  if (!user) {
    return <Login />;
  }
  
  // Show main app when authenticated
  return children;
} 