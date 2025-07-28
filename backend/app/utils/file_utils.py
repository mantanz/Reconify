import json
import os
import logging
from typing import Dict, Any
from .timestamp import get_ist_timestamp
from app.config.settings import RECON_HISTORY_PATH, CONFIG_DB_PATH, SOT_CONFIG_PATH

def load_db():
    """Load database from JSON file"""
    try:
        if os.path.exists("data/config_db.json"):
            with open("data/config_db.json", "r") as f:
                return json.load(f)
        return {}
    except Exception as e:
        print(f"Error loading database: {e}")
        return {}

def save_db(data: Dict[str, Any]):
    """Save database to JSON file"""
    try:
        os.makedirs("data", exist_ok=True)
        with open("data/config_db.json", "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving database: {e}")

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

def load_sot_config():
    """Load SOT configuration database"""
    if not os.path.exists(SOT_CONFIG_PATH):
        return {"sots": []}
    try:
        with open(SOT_CONFIG_PATH, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading SOT config: {e}")
        return {"sots": []}

def save_sot_config(config):
    """Save SOT configuration database"""
    os.makedirs(os.path.dirname(SOT_CONFIG_PATH), exist_ok=True)
    with open(SOT_CONFIG_PATH, "w") as f:
        json.dump(config, f, indent=2)

def add_sot_to_config(sot_name, headers, created_by):
    """Add a new SOT to the configuration"""
    config = load_sot_config()
    
    # Check if SOT already exists
    for sot in config["sots"]:
        if sot["name"] == sot_name:
            return False, "SOT already exists"
    
    # Add new SOT with simplified structure
    new_sot = {
        "name": sot_name,
        "headers": headers
    }
    
    config["sots"].append(new_sot)
    save_sot_config(config)
    return True, "SOT added successfully"

def update_sot_headers(sot_name, headers, updated_by):
    """Update SOT headers"""
    config = load_sot_config()
    
    for sot in config["sots"]:
        if sot["name"] == sot_name:
            sot["headers"] = headers
            save_sot_config(config)
            return True, "SOT headers updated successfully"
    
    return False, "SOT not found"

def get_sot_config(sot_name):
    """Get SOT configuration by name"""
    config = load_sot_config()
    
    for sot in config["sots"]:
        if sot["name"] == sot_name:
            return sot
    
    return None

def get_all_sot_configs():
    """Get all SOT configurations"""
    return load_sot_config()

def delete_sot_config(sot_name):
    """Delete SOT configuration"""
    config = load_sot_config()
    
    config["sots"] = [sot for sot in config["sots"] if sot["name"] != sot_name]
    save_sot_config(config)
    return True, "SOT deleted successfully"