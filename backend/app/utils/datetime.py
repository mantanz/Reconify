from datetime import datetime, timezone, timedelta


def get_ist_timestamp():
    """Get current timestamp in Indian Standard Time (IST) format: dd-mm-yyyy hh:mm:ss (24-hour format)"""
    # IST is UTC+5:30
    ist_offset = timedelta(hours=5, minutes=30)
    utc_now = datetime.now(timezone.utc)
    ist_time = utc_now.astimezone(timezone(ist_offset))
    return ist_time.strftime("%d-%m-%Y %H:%M:%S")


def format_ist_timestamp(timestamp):
    """Format any datetime object to IST format: dd-mm-yyyy hh:mm:ss (24-hour format)"""
    if isinstance(timestamp, str):
        # Try to parse the timestamp string
        try:
            # Handle various input formats
            if '-' in timestamp and ':' in timestamp:
                # Handle dd-mm-yyyy hh:mm:ss format
                if len(timestamp.split(' ')[1].split(':')) == 3:
                    timestamp = datetime.strptime(timestamp, "%d-%m-%Y %H:%M:%S")
                else:
                    timestamp = datetime.strptime(timestamp, "%d-%m-%Y %H:%M")
            else:
                # Handle ISO format or other formats
                timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        except ValueError:
            return "Invalid Date"
    
    if isinstance(timestamp, datetime):
        # Convert to IST if it's not already
        if timestamp.tzinfo is None:
            # Assume UTC if no timezone info
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        
        ist_offset = timedelta(hours=5, minutes=30)
        ist_time = timestamp.astimezone(timezone(ist_offset))
        return ist_time.strftime("%d-%m-%Y %H:%M:%S")
    
    return "Invalid Date"


def format_ist_date(timestamp):
    """Format any datetime object to IST date only: dd-mm-yyyy"""
    if isinstance(timestamp, str):
        try:
            if '-' in timestamp and ':' in timestamp:
                if len(timestamp.split(' ')[1].split(':')) == 3:
                    timestamp = datetime.strptime(timestamp, "%d-%m-%Y %H:%M:%S")
                else:
                    timestamp = datetime.strptime(timestamp, "%d-%m-%Y %H:%M")
            else:
                timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        except ValueError:
            return "Invalid Date"
    
    if isinstance(timestamp, datetime):
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        
        ist_offset = timedelta(hours=5, minutes=30)
        ist_time = timestamp.astimezone(timezone(ist_offset))
        return ist_time.strftime("%d-%m-%Y")
    
    return "Invalid Date" 