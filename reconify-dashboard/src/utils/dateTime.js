/**
 * Format datetime string to dd/mm/yyyy hh:mm AM/PM format
 * Handles UTC timestamps from backend by adding 'Z' suffix when missing
 * @param {string} dt - ISO datetime string
 * @returns {string} Formatted datetime string or 'Never' if input is empty
 */
export function formatDateTime(dt) {
  if (!dt) return 'Never';
  
  // Handle UTC timestamps from backend - add 'Z' if missing to indicate UTC
  let d;
  if (dt.endsWith('Z') || dt.includes('+')) {
    // Already has timezone info
    d = new Date(dt);
  } else {
    // Backend sends UTC time without 'Z', so add it for proper parsing
    d = new Date(dt + 'Z');
  }
  
  // Format as dd/mm/yyyy hh:mm am/pm in local timezone
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const formattedHours = String(hours).padStart(2, '0');
  
  return `${day}/${month}/${year} ${formattedHours}:${minutes} ${ampm}`;
} 