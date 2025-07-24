// Utility function to parse IST timestamps from backend and format as dd-mm-yyyy hh:mm AM/PM
export const parseISTTimestamp = (timestamp) => {
  if (!timestamp || timestamp === "-") return "-";
  
  try {
    // Handle backend format: "dd-mm-yyyy hh:mm:ss" or "dd-mm-yyyy hh:mm" or "dd-mm-yyyy hh:mm AM/PM"
    if (typeof timestamp === 'string' && timestamp.includes('-')) {
      const [datePart, timePart] = timestamp.split(' ');
      const [day, month, year] = datePart.split('-');
      
      // Check if time part already has AM/PM format
      if (timePart.includes('AM') || timePart.includes('PM')) {
        // Already in the correct format, return as is
        return timestamp;
      }
      
      // Handle old format: "hh:mm:ss" or "hh:mm"
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