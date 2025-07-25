import React, { createContext, useContext, useEffect, useState } from "react";

const API_BASE = "http://localhost:8000";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get token from localStorage or URL
  const getToken = () => {
    // First check URL for token (from OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    
    if (tokenFromUrl) {
      // Store token in localStorage and clean URL
      localStorage.setItem('access_token', tokenFromUrl);
      window.history.replaceState({}, document.title, window.location.pathname);
      return tokenFromUrl;
    }
    
    // Fall back to localStorage
    return localStorage.getItem('access_token');
  };

  // Fetch user info from backend
  useEffect(() => {
    async function fetchUser() {
      setLoading(true);
      try {
        const token = getToken();
        if (!token) {
          setUser(null);
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE}/auth/me`, { 
          credentials: "include",
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          // Token is invalid, remove it
          localStorage.removeItem('access_token');
          setUser(null);
        }
      } catch {
        localStorage.removeItem('access_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  const login = () => {
    window.location.href = `${API_BASE}/auth/login/google`;
  };

  const logout = async () => {
    try {
      const token = getToken();
      if (token) {
        // Call backend logout endpoint for audit logging
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          credentials: "include",
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with logout even if backend call fails
    } finally {
      // Clear local storage and cookies
      localStorage.removeItem('access_token');
      document.cookie = "access_token=; Max-Age=0; path=/;";
      setUser(null);
      window.location.reload();
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 