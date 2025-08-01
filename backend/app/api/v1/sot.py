from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request
import uuid
import json
import os
import pandas as pd
import csv
import io
import logging
import time

from app.api.deps import get_current_user
from app.utils.timestamp import get_ist_timestamp
from app.utils.validators import validate_file_structure, generate_file_hash, check_duplicate_file
from app.utils.file_utils import load_db, load_sot_config, add_sot_to_config, update_sot_headers, get_sot_config, get_all_sot_configs, delete_sot_config
from app.config.settings import SOT_UPLOADS_PATH
from app.core.database.mysql_utils import insert_sot_data_rows, get_panel_headers_from_db, fetch_all_rows
from app.core.audit.audit_utils import log_audit_event
from app.models.sot import SOTCreate, SOTUpdate
from app.utils.file_server_manager import file_server_manager

router = APIRouter()

@router.post("/sot/upload")
def upload_sot(request: Request, file: UploadFile = File(...), sot_type: str = Form("hr_data")):
    """
    3-Stage SOT File Upload Process using only doc_id:
    - doc_id: Single identifier for entire process and file naming
    """
    # Generate single doc_id for entire process
    doc_id = str(uuid.uuid4())  # ✅ This is used for everything
    doc_name = file.filename
    uploaded_by = get_current_user(request)
    timestamp = get_ist_timestamp()
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
    
    # Initialize upload metadata
    upload_metadata = {
        "doc_id": doc_id,  # ✅ Single doc_id for entire process
        "doc_name": doc_name,
        "uploaded_by": uploaded_by,
        "timestamp": timestamp,
        "status": "uploading",  # Initial status
        "sot_type": sot_type,
        "file_hash": file_hash,
        "total_records": 0
    }
    
    # Helper function to update history
    def update_history(status, error_message=None, total_records=0):
        upload_metadata["status"] = status
        upload_metadata["total_records"] = total_records
        if error_message:
            upload_metadata["error"] = error_message
        
        try:
            if not os.path.exists(SOT_UPLOADS_PATH):
                with open(SOT_UPLOADS_PATH, "w") as f:
                    json.dump([], f)
            
            with open(SOT_UPLOADS_PATH, "r+") as f:
                history = json.load(f)
                # Remove existing entry with same doc_id if exists
                history = [item for item in history if item.get("doc_id") != doc_id]
                history.append(upload_metadata)
                f.seek(0)
                json.dump(history, f, indent=2)
        except Exception as e:
            logging.error(f"Failed to write upload history: {e}")
    
    # Stage 1: Save file to upload directory on file server
    try:
        # Test connection before attempting file operations
        if not file_server_manager.test_connection():
            logging.error(f"❌ File server connection test failed for doc_id: {doc_id}")
            update_history("failed", "File server connection failed. Please try again later.")
            return {
                "error": "File server connection failed. Please try again later.", 
                "doc_id": doc_id,
                "doc_name": doc_name,
                "uploaded_by": uploaded_by,
                "timestamp": timestamp,
                "status": "failed",
                "sot_type": sot_type
            }
        
        file_info = file_server_manager.save_uploaded_file(
            contents, 
            doc_name, 
            upload_type="sot", 
            entity_name=sot_type,
            doc_id=doc_id
        )
        logging.info(f"📁 Stage 1: SOT file '{doc_name}' saved to sot/{sot_type}/upload with doc_id: {doc_id}")
        
        # Update status to reflect Stage 1 completion
        update_history("uploaded")
        
        # 🕐 DELAY: Wait 3 seconds to show "uploaded" status
        logging.info(f"⏳ Stage 1 completed - waiting 3 seconds to show 'uploaded' status for doc_id: {doc_id}")
        time.sleep(3)
        
    except Exception as e:
        logging.error(f"❌ Stage 1: Failed to save uploaded file: {str(e)}")
        update_history("failed", f"Failed to save uploaded file: {str(e)}")
        return {
            "error": f"Failed to save uploaded file: {str(e)}", 
            "doc_id": doc_id,
            "doc_name": doc_name,
            "uploaded_by": uploaded_by,
            "timestamp": timestamp,
            "status": "failed",
            "sot_type": sot_type
        }
    
    # Stage 2: Move to processing
    if not file_server_manager.start_processing(doc_id, doc_name, "sot", sot_type):
        file_server_manager.cleanup_failed_upload(doc_id, doc_name, "sot", sot_type, "upload")
        logging.error(f"❌ Stage 2: Failed to start processing for doc_id: {doc_id}")
        update_history("failed", "Failed to start processing")
        return {
            "error": "Failed to start processing", 
            "doc_id": doc_id,
            "doc_name": doc_name,
            "uploaded_by": uploaded_by,
            "timestamp": timestamp,
            "status": "failed",
            "sot_type": sot_type
        }
    
    # Update status to reflect Stage 2 completion
    update_history("processing")
    logging.info(f"🔄 Stage 2: SOT file '{doc_name}' moved to processing stage (doc_id: {doc_id})")
    
    # 🕐 DELAY: Wait 4 seconds to show "processing" status
    logging.info(f"⏳ Stage 2 completed - waiting 4 seconds to show 'processing' status for doc_id: {doc_id}")
    time.sleep(4)
    
    # Initialize variables
    error_message = None
    total_records = 0
    
    try:
        # Get file content from processing stage
        file_content = file_server_manager.get_file_content(doc_id, doc_name, "sot", sot_type, "processing")
        if not file_content:
            raise Exception("Failed to read file from processing stage")
        
        # Read and parse file (existing logic)
        if filename.endswith(".xlsx") or filename.endswith(".xls") or filename.endswith(".xlsb"):
            try:
                df = pd.read_excel(io.BytesIO(file_content))
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
            total_records = len(df)
        else:
            # Try different encodings for CSV files
            encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
            lines = None
            
            for encoding in encodings:
                try:
                    lines = file_content.decode(encoding).splitlines()
                    break
                except UnicodeDecodeError:
                    continue
            
            if lines is None:
                raise HTTPException(status_code=400, detail="Unable to decode file. Please ensure it's a valid CSV or Excel file.")
            
            reader = csv.DictReader(lines)
            # Convert headers to lowercase and clean data
            reader.fieldnames = [h.strip().lower() for h in reader.fieldnames]
            rows = [dict((k.strip().lower(), v.strip() if v is not None else "") for k, v in row.items()) for row in reader]
            total_records = max(len(lines) - 1, 0)  # Exclude header
        
        # Check if we have data to process
        if not rows or len(rows) == 0:
            raise Exception("No data found in uploaded file")
        
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
                
                raise Exception(validation_error)
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
        
        # Insert data (existing logic)
        from app.core.database.mysql_utils import insert_sot_data_rows_with_backup
        success, error_message, backup_count = insert_sot_data_rows_with_backup(sot_type, rows, doc_id, timestamp)
        
        if success:
            # Stage 3: Move to processed
            if file_server_manager.complete_processing(doc_id, doc_name, "sot", sot_type):
                update_history("processed", total_records=total_records)
                logging.info(f"✅ Stage 3: SOT file '{doc_name}' successfully processed and moved to sot/{sot_type}/processed (doc_id: {doc_id})")
            else:
                update_history("processed_with_warning", total_records=total_records)
                logging.warning(f"⚠️ Stage 3: Data inserted but failed to move file to processed stage: {doc_id}")
            
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
            update_history("failed", f"Error inserting data: {error_message}")
            
    except Exception as e:
        error_message = str(e)
        logging.error(f"❌ File processing error: {str(e)} (doc_id: {doc_id})")
        update_history("failed", error_message)
        
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
    
    # Clean up if processing failed
    if upload_metadata["status"] == "failed":
        file_server_manager.cleanup_failed_upload(doc_id, doc_name, "sot", sot_type, "processing")
        logging.info(f"🧹 Cleaned up failed SOT upload: {doc_id}")
    
    # Log successful upload
    if upload_metadata["status"] == "processed":
        try:
            log_audit_event(
                action="SOT_UPLOAD",
                user=uploaded_by,
                details={
                    "sot_type": sot_type,
                    "file_name": doc_name,
                    "doc_id": doc_id,
                    "total_records": total_records,
                    "upload_timestamp": timestamp,
                    "server_type": file_info["server_type"]
                },
                status="success"
            )
        except Exception as audit_error:
            logging.error(f"Failed to log audit event: {audit_error}")
    
    return {
        "doc_id": doc_id,  # ✅ Single doc_id
        "doc_name": doc_name,
        "uploaded_by": uploaded_by,
        "timestamp": timestamp,
        "status": upload_metadata["status"],
        "sot_type": sot_type,
        "total_records": total_records,
        "error": error_message if error_message else None
    }

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
    # Commented out to prevent showing default SOTs
    # if not all_sots:
    #     default_sots = [
    #         "hr_data",
    #         "service_users", 
    #         "internal_users",
    #         "thirdparty_users"
    #     ]
    #     all_sots.update(default_sots)
    
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

@router.get("/sot/{sot_name}/details")
def get_sot_details(sot_name: str):
    """
    Fetch SOT data rows for a specific SOT.
    Returns the SOT rows data in the same format as panel details.
    """
    try:
        # Fetch all SOT data
        try:
            sot_rows = fetch_all_rows(sot_name)
            if not sot_rows:
                sot_rows = []
        except Exception as e:
            logging.error(f"Error fetching SOT data: {e}")
            raise HTTPException(status_code=500, detail=f"Error fetching SOT data: {str(e)}")
        
        logging.info(f"Fetched {len(sot_rows)} rows for SOT '{sot_name}'")
        
        return {
            "sot_name": sot_name,
            "rows": sot_rows
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching SOT details for '{sot_name}': {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}") 