// Utility function to parse IST timestamps from backend and format as dd-mm-yyyy hh:mm AM/PM
export const parseISTTimestamp = (timestamp) => {
  if (!timestamp || timestamp === "-") return "-";
  
  try {
    // Handle backend format: "dd-mm-yyyy hh:mm:ss" (24-hour format)
    if (typeof timestamp === 'string' && timestamp.includes('-')) {
      const parts = timestamp.split(' ');
      const datePart = parts[0];
      const timePart = parts[1] || '';
      const [day, month, year] = datePart.split('-');
      
      // Handle 24-hour format: "hh:mm:ss" or "hh:mm"
      const [hours, minutes, seconds = '00'] = timePart.split(':');
      
      // Create date object (month is 0-indexed in JavaScript)
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 
                           parseInt(hours), parseInt(minutes), parseInt(seconds));
      
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }
      
      // Format as dd-mm-yyyy hh:mm AM/PM
      const formattedDate = `${day}-${month}-${year}`;
      const formattedTime = date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }); // hh:mm AM/PM
      
      return `${formattedDate} ${formattedTime}`;
    }
    
    // Fallback for standard date formats
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    
    // Format as dd-mm-yyyy hh:mm AM/PM
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;
    const formattedTime = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    }); // hh:mm AM/PM
    
    return `${formattedDate} ${formattedTime}`;
    
  } catch (error) {
    console.error('Error parsing timestamp:', timestamp, error);
    return "Invalid Date";
  }
};

// Short format for just date without time
export const parseISTDate = (timestamp) => {
  if (!timestamp || timestamp === "-") return "-";
  
  try {
    if (typeof timestamp === 'string' && timestamp.includes('-')) {
      const [datePart] = timestamp.split(' ');
      const [day, month, year] = datePart.split('-');
      
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }
      
      return `${day}-${month}-${year}`;
    }
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
    
  } catch (error) {
    console.error('Error parsing date:', timestamp, error);
    return "Invalid Date";
  }
};

// Utility function to format current date/time in the new format
export const getCurrentISTTimestamp = () => {
  const now = new Date();
  return parseISTTimestamp(now);
};

// Utility function to format current date only in the new format
export const getCurrentISTDate = () => {
  const now = new Date();
  return parseISTDate(now);
}; 

// Centralized fetchWithAuth function that handles token expiration
export const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem('access_token');
  
  const headers = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  
  try {
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    // Handle token expiration
    if (response.status === 401 || response.status === 403) {
      console.log('Token expired, redirecting to login...');
      localStorage.removeItem('access_token');
      document.cookie = "access_token=; Max-Age=0; path=/;";
      // Redirect to login page
      window.location.href = '/';
      throw new Error('Token expired');
    }
    
    return response;
  } catch (error) {
    if (error.message === 'Token expired') {
      throw error; // Re-throw to prevent further processing
    }
    throw error;
  }
}; 