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

  // Enhanced logout function that can be called from anywhere
  const logout = () => {
    localStorage.removeItem('access_token');
    document.cookie = "access_token=; Max-Age=0; path=/;";
    setUser(null);
    // Redirect to login page instead of reloading
    window.location.href = '/';
  };

  // Function to handle token expiration
  const handleTokenExpiration = () => {
    console.log('Token expired, logging out...');
    logout();
  };

  // Function to validate token with backend
  const validateToken = async () => {
    const token = getToken();
    if (!token) return false;

    try {
      const res = await fetch(`${API_BASE}/auth/me`, { 
        credentials: "include",
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        return true;
      } else if (res.status === 401 || res.status === 403) {
        // Token is expired or invalid
        console.log('Token validation failed, logging out...');
        logout();
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
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
        } else if (res.status === 401 || res.status === 403) {
          // Token is expired or invalid
          console.log('Token is expired or invalid, logging out...');
          logout();
        } else {
          // Other error, remove token and set user to null
          localStorage.removeItem('access_token');
          setUser(null);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        localStorage.removeItem('access_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  // Set up periodic token validation (every 5 minutes)
  useEffect(() => {
    if (!user) return; // Only validate if user is logged in

    const interval = setInterval(async () => {
      await validateToken();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user]);

  const login = () => {
    window.location.href = `${API_BASE}/auth/login/google`;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      handleTokenExpiration,
      getToken,
      validateToken
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 