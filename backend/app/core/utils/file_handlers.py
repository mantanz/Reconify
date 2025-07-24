import json
import os
from ...config.settings import DB_PATH, SOT_UPLOADS_PATH, RECON_HISTORY_PATH, RECON_SUMMARY_PATH

def load_db():
    """Load panel configuration from JSON file"""
    if not os.path.exists(DB_PATH):
        with open(DB_PATH, "w") as f:
            json.dump({"panels": []}, f)
    with open(DB_PATH, "r") as f:
        return json.load(f)

def save_db(data):
    """Save panel configuration to JSON file"""
    with open(DB_PATH, "w") as f:
        json.dump(data, f, indent=2)

def update_upload_history_status(panel_name: str, new_status: str):
    """Update the status of the most recent upload for a panel in the upload history."""
    try:
        if not os.path.exists(RECON_HISTORY_PATH):
            return False
        
        with open(RECON_HISTORY_PATH, "r") as f:
            panel_history = json.load(f)
        
        # Find the most recent upload for this panel and update its status
        updated = False
        for entry in reversed(panel_history):
            if entry.get("panelname") == panel_name:
                entry["status"] = new_status
                updated = True
                break
        
        if updated:
            with open(RECON_HISTORY_PATH, "w") as f:
                json.dump(panel_history, f, indent=2)
        
        return updated
    except Exception as e:
        print(f"Error updating upload history status: {e}")
        return False 