export const API_BASE = "http://localhost:8000";

// Helper function to get authentication token
function getAuthToken() {
  return localStorage.getItem('access_token');
}

// Helper function to create headers with authentication
function createAuthHeaders(contentType = null) {
  const headers = {};
  const token = getAuthToken();
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  
  return headers;
}
