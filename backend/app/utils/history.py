import json
import os
import logging
from app.config.paths import RECON_HISTORY_PATH


def update_upload_history_status(panel_name: str, new_status: str):
    """
    Update the status of the most recent upload for a panel in the upload history.
    """
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
            logging.info(f"Updated upload history status for panel '{panel_name}' to '{new_status}'")
            return True
        
        return False
    except Exception as e:
        logging.error(f"Failed to update upload history status: {e}")
        return False 