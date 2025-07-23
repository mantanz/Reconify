// Utility function to parse IST timestamps from backend and format as dd/mm/yyyy hh:mm AM/PM
export const parseISTTimestamp = (timestamp) => {
  if (!timestamp || timestamp === "-") return "-";
  
  try {
    // Handle backend format: "dd-mm-yyyy hh:mm:ss" or "dd-mm-yyyy hh:mm"
    if (typeof timestamp === 'string' && timestamp.includes('-')) {
      const [datePart, timePart] = timestamp.split(' ');
      const [day, month, year] = datePart.split('-');
      const [hours, minutes, seconds = '00'] = timePart.split(':');
      
      // Create date object (month is 0-indexed in JavaScript)
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 
                           parseInt(hours), parseInt(minutes), parseInt(seconds));
      
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }
      
      // Format as dd/mm/yyyy hh:mm AM/PM
      const formattedDate = date.toLocaleDateString('en-GB'); // dd/mm/yyyy
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
    
    const formattedDate = date.toLocaleDateString('en-GB'); // dd/mm/yyyy
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
      
      return date.toLocaleDateString('en-GB'); // dd/mm/yyyy
    }
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    
    return date.toLocaleDateString('en-GB'); // dd/mm/yyyy
    
  } catch (error) {
    console.error('Error parsing date:', timestamp, error);
    return "Invalid Date";
  }
}; 