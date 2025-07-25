import React from "react";
import { useAuth } from "./AuthContext";
import Login from "./Login";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner message="Loading authentication..." />;
  }
  
  // Show login page when not authenticated
  if (!user) {
    return <Login />;
  }
  
  // Show main app when authenticated
  return children;
} 