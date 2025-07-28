import logging
import hashlib
from app.core.database.mysql_utils import get_panel_headers_from_db

def validate_file_structure(sot_name, file_headers):
    """Validate uploaded file structure against existing table structure"""
    try:
        existing_headers = get_panel_headers_from_db(sot_name)
        if existing_headers:
            missing_columns = set(existing_headers) - set(file_headers)
            extra_columns = set(file_headers) - set(existing_headers)
            
            if missing_columns or extra_columns:
                error_msg = f"File structure mismatch for '{sot_name}'. "
                if missing_columns:
                    error_msg += f"Missing required columns: {', '.join(sorted(missing_columns))}. "
                if extra_columns:
                    error_msg += f"Extra columns (will be ignored): {', '.join(sorted(extra_columns))}. "
                error_msg += f"Expected columns: {', '.join(sorted(existing_headers))}"
                return False, error_msg
        return True, None
    except Exception as e:
        logging.error(f"Error validating file structure for {sot_name}: {e}")
        return True, None  # Allow upload if validation fails

def generate_file_hash(file_contents):
    """Generate SHA-256 hash of file contents for duplicate detection"""
    try:
        return hashlib.sha256(file_contents).hexdigest()
    except Exception as e:
        logging.error(f"Error generating file hash: {e}")
        return None

def check_duplicate_file(file_hash, file_name, upload_type="sot"):
    """
    Check if a file with the same hash has been uploaded before.
    
    Args:
        file_hash (str): SHA-256 hash of file contents
        file_name (str): Original filename
        upload_type (str): Type of upload ("sot", "panel", "recategorization")
    
    Returns:
        tuple: (is_duplicate, duplicate_info)
    """
    try:
        if not file_hash:
            return False, None
            
        if upload_type == "sot":
            # Check SOT uploads from the correct file
            from app.config.settings import SOT_UPLOADS_PATH
            import json
            import os
            
            if os.path.exists(SOT_UPLOADS_PATH):
                with open(SOT_UPLOADS_PATH, "r") as f:
                    sot_uploads = json.load(f)
                
                for upload in sot_uploads:
                    if upload.get("file_hash") == file_hash:
                        return True, {
                            "upload_type": "SOT",
                            "file_name": upload.get("doc_name"),
                            "uploaded_by": upload.get("uploaded_by"),
                            "timestamp": upload.get("timestamp"),
                            "sot_type": upload.get("sot_type")
                        }
        
        elif upload_type == "panel":
            # Check panel uploads
            from app.config.settings import RECON_HISTORY_PATH
            import json
            import os
            
            if os.path.exists(RECON_HISTORY_PATH):
                with open(RECON_HISTORY_PATH, "r") as f:
                    panel_history = json.load(f)
                
                for upload in panel_history:
                    if upload.get("file_hash") == file_hash:
                        return True, {
                            "upload_type": "Panel",
                            "file_name": upload.get("docname"),
                            "uploaded_by": upload.get("uploadedby"),
                            "timestamp": upload.get("timestamp"),
                            "panel_name": upload.get("panelname")
                        }
        
        return False, None
        
    except Exception as e:
        logging.error(f"Error checking duplicate file: {e}")
        return False, None 