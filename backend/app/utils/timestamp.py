from datetime import datetime, timezone, timedelta

def get_ist_timestamp():
    """Get current timestamp in Indian Standard Time (IST) format: dd-mm-yyyy hh:mm:ss"""
    # IST is UTC+5:30
    ist_offset = timedelta(hours=5, minutes=30)
    utc_now = datetime.now(timezone.utc)
    ist_time = utc_now.astimezone(timezone(ist_offset))
    return ist_time.strftime("%d-%m-%Y %H:%M:%S") 