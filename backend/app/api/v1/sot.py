from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request
import uuid
import json
import os
import pandas as pd
import csv
import io
import logging

from app.api.deps import get_current_user
from app.utils.timestamp import get_ist_timestamp
from app.utils.validators import validate_file_structure, generate_file_hash, check_duplicate_file
from app.utils.file_utils import load_db, load_sot_config, add_sot_to_config, update_sot_headers, get_sot_config, get_all_sot_configs, delete_sot_config
from app.config.settings import SOT_UPLOADS_PATH
from app.core.database.mysql_utils import insert_sot_data_rows, get_panel_headers_from_db, fetch_all_rows
from app.core.audit.audit_utils import log_audit_event
from app.models.sot import SOTCreate, SOTUpdate

router = APIRouter()

@router.post("/sot/upload")
def upload_sot(request: Request, file: UploadFile = File(...), sot_type: str = Form("hr_data")):
    # Generate doc_id and metadata
    doc_id = str(uuid.uuid4())
    doc_name = file.filename
    uploaded_by = get_current_user(request)
    timestamp = get_ist_timestamp()
    status = "uploaded"
    filename = file.filename.lower()
    contents = file.file.read()
    
    # Generate file hash for duplicate detection
    file_hash = generate_file_hash(contents)
    
    # Check for duplicate file
    is_duplicate, duplicate_info = check_duplicate_file(file_hash, doc_name, "sot")
    if is_duplicate:
        # Log audit event for duplicate file upload attempt
        try:
            log_audit_event(
                action="DUPLICATE_FILE_UPLOAD",
                user=uploaded_by,
                details={
                    "sot_type": sot_type,
                    "file_name": doc_name,
                    "doc_id": doc_id,
                    "duplicate_info": duplicate_info,
                    "upload_timestamp": timestamp
                },
                status="failed"
            )
        except Exception as audit_error:
            logging.error(f"Failed to log audit event: {audit_error}")
        
        return {
            "error": f"Duplicate file detected. This file was already uploaded as '{duplicate_info['file_name']}' by {duplicate_info['uploaded_by']} on {duplicate_info['timestamp']}.",
            "doc_id": doc_id,
            "doc_name": doc_name,
            "uploaded_by": uploaded_by,
            "timestamp": timestamp,
            "status": "failed",
            "sot_type": sot_type
        }
    
    try:
        # Read and parse file
        if filename.endswith(".xlsx") or filename.endswith(".xls") or filename.endswith(".xlsb"):
            try:
                df = pd.read_excel(io.BytesIO(contents))
            except ImportError as e:
                if "pyxlsb" in str(e) and filename.endswith(".xlsb"):
                    raise HTTPException(
                        status_code=400, 
                        detail="Missing optional dependency 'pyxlsb' for .xlsb files. Please install it using: pip install pyxlsb"
                    )
                else:
                    raise e
            # Convert headers to lowercase
            df.columns = [col.strip().lower() for col in df.columns]
            # Clean NaN values - replace with None for database compatibility
            df = df.replace({pd.NA: None, pd.NaT: None})
            df = df.where(pd.notnull(df), None)
            rows = df.to_dict(orient="records")
        else:
            # Try different encodings for CSV files
            encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
            lines = None
            for encoding in encodings:
                try:
                    lines = contents.decode(encoding).splitlines()
                    break
                except UnicodeDecodeError:
                    continue
            if lines is None:
                raise HTTPException(status_code=400, detail="Unable to decode file. Please ensure it's a valid CSV or Excel file.")
            reader = csv.DictReader(lines)
            # Convert headers to lowercase and clean data
            reader.fieldnames = [h.strip().lower() for h in reader.fieldnames]
            rows = [dict((k.strip().lower(), v.strip() if v is not None else "") for k, v in row.items()) for row in reader]
    except Exception as e:
        # Log audit event for file processing failure
        try:
            log_audit_event(
                action="FILE_PROCESSING_ERROR",
                user=uploaded_by,
                details={
                    "sot_type": sot_type,
                    "file_name": doc_name,
                    "doc_id": doc_id,
                    "error": f"Error processing file: {str(e)}",
                    "upload_timestamp": timestamp
                },
                status="failed"
            )
        except Exception as audit_error:
            logging.error(f"Failed to log audit event: {audit_error}")
        
        return {"error": f"Error processing file: {str(e)}", "doc_id": doc_id, "doc_name": doc_name, "uploaded_by": uploaded_by, "timestamp": timestamp, "status": "failed", "sot_type": sot_type}
    
    # Validate file structure against existing table (if table exists)
    if rows:
        file_headers = list(rows[0].keys())
        is_valid, validation_error = validate_file_structure(sot_type, file_headers)
        if not is_valid:
            # Log audit event for file structure validation failure
            try:
                log_audit_event(
                    action="FILE_STRUCTURE_VALIDATION",
                    user=uploaded_by,
                    details={
                        "sot_type": sot_type,
                        "file_name": doc_name,
                        "doc_id": doc_id,
                        "uploaded_headers": file_headers,
                        "validation_error": validation_error,
                        "upload_timestamp": timestamp
                    },
                    status="failed"
                )
            except Exception as audit_error:
                logging.error(f"Failed to log audit event: {audit_error}")
            
            return {"error": validation_error, "doc_id": doc_id, "doc_name": doc_name, "uploaded_by": uploaded_by, "timestamp": timestamp, "status": "failed", "sot_type": sot_type}
        else:
            # Log audit event for successful file structure validation
            try:
                log_audit_event(
                    action="FILE_STRUCTURE_VALIDATION",
                    user=uploaded_by,
                    details={
                        "sot_type": sot_type,
                        "file_name": doc_name,
                        "doc_id": doc_id,
                        "uploaded_headers": file_headers,
                        "validation_status": "passed",
                        "upload_timestamp": timestamp
                    },
                    status="success"
                )
            except Exception as audit_error:
                logging.error(f"Failed to log audit event: {audit_error}")
    
    # Insert into the correct SOT table (auto-create if needed)
    try:
        # Use the new backup-enabled insert function
        from app.core.database.mysql_utils import insert_sot_data_rows_with_backup
        success, error_message, backup_count = insert_sot_data_rows_with_backup(sot_type, rows, doc_id, timestamp)
        
        if success:
            status = "success"
            # Log backup operation if data was backed up
            if backup_count > 0:
                try:
                    log_audit_event(
                        action="DATA_BACKUP",
                        user=uploaded_by,
                        details={
                            "sot_type": sot_type,
                            "backup_count": backup_count,
                            "doc_id": doc_id,
                            "backup_timestamp": timestamp
                        },
                        status="success"
                    )
                except Exception as audit_error:
                    logging.error(f"Failed to log backup audit event: {audit_error}")
        else:
            status = "failed"
            logging.error(f"Error inserting SOT data: {error_message}")
            return {"error": f"Error inserting data: {error_message}", "doc_id": doc_id, "doc_name": doc_name, "uploaded_by": uploaded_by, "timestamp": timestamp, "status": "failed", "sot_type": sot_type}
    except Exception as e:
        status = "failed"
        logging.error(f"Error inserting SOT data: {e}")
        return {"error": f"Error inserting data: {str(e)}", "doc_id": doc_id, "doc_name": doc_name, "uploaded_by": uploaded_by, "timestamp": timestamp, "status": "failed", "sot_type": sot_type}
    
    # Save upload metadata with file hash
    upload_metadata = {
        "doc_id": doc_id,
        "doc_name": doc_name,
        "uploaded_by": uploaded_by,
        "timestamp": timestamp,
        "status": status,
        "sot_type": sot_type,
        "file_hash": file_hash  # Add file hash for duplicate detection
    }
    
    try:
        # Load existing SOT uploads from the file
        if os.path.exists(SOT_UPLOADS_PATH):
            with open(SOT_UPLOADS_PATH, "r") as f:
                sot_uploads = json.load(f)
        else:
            sot_uploads = []
        
        # Add new upload metadata
        sot_uploads.append(upload_metadata)
        
        # Save back to the file
        os.makedirs(os.path.dirname(SOT_UPLOADS_PATH), exist_ok=True)
        with open(SOT_UPLOADS_PATH, "w") as f:
            json.dump(sot_uploads, f, indent=2)
    except Exception as e:
        logging.error(f"Error saving SOT upload metadata: {e}")
    
    # Log audit event for successful upload
    try:
        log_audit_event(
            action="SOT_UPLOAD",
            user=uploaded_by,
            details={
                "sot_type": sot_type,
                "file_name": doc_name,
                "doc_id": doc_id,
                "total_records": len(rows) if rows else 0,
                "upload_timestamp": timestamp
            },
            status="success"
        )
    except Exception as audit_error:
        logging.error(f"Failed to log audit event: {audit_error}")
    
    return upload_metadata

@router.get("/sot/uploads")
def list_sot_uploads():
    if not os.path.exists(SOT_UPLOADS_PATH):
        return []
    try:
        with open(SOT_UPLOADS_PATH, "r") as f:
            return json.load(f)
    except Exception as e:
        logging.error(f"Error reading SOT uploads: {e}")
        return []

@router.get("/sot/list")
def list_sots_from_config():
    # Get SOTs from configuration first
    sot_config = get_all_sot_configs()
    configured_sots = [sot["name"] for sot in sot_config["sots"]]
    
    # Also get SOTs from panel configurations for backward compatibility
    db = load_db()
    panel_sots = set()
    for panel in db.get("panels", []):
        key_mapping = panel.get("key_mapping", {})
        panel_sots.update(key_mapping.keys())
    
    # Combine both sources
    all_sots = set(configured_sots + list(panel_sots))
    
    # If no SOTs found, provide default SOT types
    if not all_sots:
        default_sots = [
            "hr_data",
            "service_users", 
            "internal_users",
            "thirdparty_users"
        ]
        all_sots.update(default_sots)
    
    return {"sots": sorted(list(all_sots))}

@router.get("/sot/config")
def get_sot_configurations():
    """Get all SOT configurations"""
    return get_all_sot_configs()

@router.post("/sot/config")
def create_sot_configuration(sot_data: SOTCreate, request: Request):
    """Create a new SOT configuration"""
    user = get_current_user(request)
    
    success, message = add_sot_to_config(sot_data.name, sot_data.headers, user)
    
    if success:
        # Log audit event
        try:
            log_audit_event(
                action="SOT_CONFIG_CREATED",
                user=user,
                details={
                    "sot_name": sot_data.name,
                    "headers": sot_data.headers
                },
                status="success"
            )
        except Exception as audit_error:
            logging.error(f"Failed to log audit event: {audit_error}")
        
        return {"message": message, "sot_name": sot_data.name}
    else:
        raise HTTPException(status_code=400, detail=message)

@router.put("/sot/config/{sot_name}")
def update_sot_configuration(sot_name: str, sot_data: SOTUpdate, request: Request):
    """Update SOT configuration headers"""
    user = get_current_user(request)
    
    success, message = update_sot_headers(sot_name, sot_data.headers, user)
    
    if success:
        # Log audit event
        try:
            log_audit_event(
                action="SOT_CONFIG_UPDATED",
                user=user,
                details={
                    "sot_name": sot_name,
                    "new_headers": sot_data.headers
                },
                status="success"
            )
        except Exception as audit_error:
            logging.error(f"Failed to log audit event: {audit_error}")
        
        return {"message": message}
    else:
        raise HTTPException(status_code=404, detail=message)

@router.delete("/sot/config/{sot_name}")
def delete_sot_configuration(sot_name: str, request: Request):
    """Delete SOT configuration"""
    user = get_current_user(request)
    
    success, message = delete_sot_config(sot_name)
    
    if success:
        # Log audit event
        try:
            log_audit_event(
                action="SOT_CONFIG_DELETED",
                user=user,
                details={
                    "sot_name": sot_name
                },
                status="success"
            )
        except Exception as audit_error:
            logging.error(f"Failed to log audit event: {audit_error}")
        
        return {"message": message}
    else:
        raise HTTPException(status_code=404, detail=message)

@router.get("/sot/fields/{sot_type}")
def get_sot_fields(sot_type: str):
    # First try to get headers from SOT configuration
    sot_config = get_sot_config(sot_type)
    if sot_config and sot_config.get("headers"):
        return {"fields": sot_config["headers"]}
    
    # Fallback to database headers
    headers = get_panel_headers_from_db(sot_type)
    if not headers:
        # Return empty fields instead of 404 error for SOTs that don't exist yet
        return {"fields": []}
    return {"fields": headers}

@router.get("/debug/sot/{sot_name}")
def debug_sot_table(sot_name: str):
    """
    Debug endpoint to inspect SOT table data and structure.
    """
    try:
        rows = fetch_all_rows(sot_name)
        
        if not rows:
            return {
                "sot_name": sot_name,
                "row_count": 0,
                "columns": [],
                "sample_data": []
            }
        
        # Get column names from first row
        columns = list(rows[0].keys()) if rows else []
        
        # Get sample data (first 5 rows)
        sample_data = rows[:5]
        
        return {
            "sot_name": sot_name,
            "row_count": len(rows),
            "columns": columns,
            "sample_data": sample_data
        }
    except Exception as e:
        logging.error(f"Error debugging SOT table {sot_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Error accessing SOT table: {str(e)}") 