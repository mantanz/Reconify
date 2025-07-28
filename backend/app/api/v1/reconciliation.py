from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request, Path
import uuid
import json
import os
import pandas as pd
import csv
import io
import logging
from datetime import datetime, timezone, timedelta

from app.api.deps import get_current_user
from app.utils.timestamp import get_ist_timestamp
from app.utils.file_utils import load_db, update_upload_history_status
from app.utils.validators import generate_file_hash, check_duplicate_file, validate_file_structure
from app.config.settings import RECON_HISTORY_PATH, RECON_SUMMARY_PATH
from app.core.database.mysql_utils import insert_panel_data_rows, fetch_all_rows, update_initial_status_bulk
from app.core.audit.audit_utils import log_audit_event

router = APIRouter()

@router.post("/recon/upload")
def upload_recon(request: Request, panel_name: str = File(...), file: UploadFile = File(...)):
    doc_id = str(uuid.uuid4())
    doc_name = file.filename
    uploaded_by = get_current_user(request)
    timestamp = get_ist_timestamp()
    filename = file.filename.lower()
    contents = file.file.read()
    
    # Generate file hash for duplicate detection
    file_hash = generate_file_hash(contents)
    
    # Check for duplicate file
    is_duplicate, duplicate_info = check_duplicate_file(file_hash, doc_name, "panel")
    if is_duplicate:
        # Log audit event for duplicate file upload attempt
        try:
            log_audit_event(
                action="DUPLICATE_FILE_UPLOAD",
                user=uploaded_by,
                details={
                    "panel_name": panel_name,
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
            "panelname": panel_name,
            "docid": doc_id,
            "docname": doc_name,
            "timestamp": timestamp,
            "total_records": 0,
            "uploadedby": uploaded_by,
            "status": "failed"
        }
    
    try:
        # Read and parse file
        if filename.endswith(".xlsx") or filename.endswith(".xls") or filename.endswith(".xlsb"):
            df = pd.read_excel(io.BytesIO(contents))
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
                    lines = contents.decode(encoding).splitlines()
                    break
                except UnicodeDecodeError:
                    continue
            
            if lines is None:
                raise HTTPException(status_code=400, detail="Unable to decode file. Please ensure it's a valid CSV or Excel file.")
            
            reader = csv.DictReader(lines)
            rows = [dict((k.strip().lower(), v.strip() if v is not None else "") for k, v in row.items()) for row in reader]
            total_records = max(len(lines) - 1, 0)  # Exclude header
    except Exception as e:
        # Log audit event for file processing failure
        try:
            log_audit_event(
                action="FILE_PROCESSING_ERROR",
                user=uploaded_by,
                details={
                    "panel_name": panel_name,
                    "file_name": doc_name,
                    "doc_id": doc_id,
                    "error": f"Error processing file: {str(e)}",
                    "upload_timestamp": timestamp
                },
                status="failed"
            )
        except Exception as audit_error:
            logging.error(f"Failed to log audit event: {audit_error}")
        return {"error": f"Error processing file: {str(e)}", "panelname": panel_name, "docid": doc_id, "docname": doc_name, "timestamp": timestamp, "total_records": 0, "uploadedby": uploaded_by, "status": "failed"}
    
    # Validate panel file structure against existing table (if table exists)
    if rows:
        file_headers = list(rows[0].keys())
        is_valid, validation_error = validate_file_structure(panel_name, file_headers)
        if not is_valid:
            # Log audit event for file structure validation failure
            try:
                log_audit_event(
                    action="FILE_STRUCTURE_VALIDATION",
                    user=uploaded_by,
                    details={
                        "panel_name": panel_name,
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
            
            return {"error": validation_error, "panelname": panel_name, "docid": doc_id, "docname": doc_name, "timestamp": timestamp, "total_records": 0, "uploadedby": uploaded_by, "status": "failed"}
        else:
            # Log audit event for successful file structure validation
            try:
                log_audit_event(
                    action="FILE_STRUCTURE_VALIDATION",
                    user=uploaded_by,
                    details={
                        "panel_name": panel_name,
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
    
    # Determine status based on actual success/failure
    status = "uploaded"
    error_message = None
    
    # Check if we have data to process
    if not rows or len(rows) == 0:
        status = "failed"
        error_message = "No data found in uploaded file"
        
        # Log audit event for empty file
        try:
            log_audit_event(
                action="EMPTY_FILE_UPLOAD",
                user=uploaded_by,
                details={
                    "panel_name": panel_name,
                    "file_name": doc_name,
                    "doc_id": doc_id,
                    "error": error_message,
                    "upload_timestamp": timestamp
                },
                status="failed"
            )
        except Exception as audit_error:
            logging.error(f"Failed to log audit event: {audit_error}")
    else:
        # Insert into panel table
        try:
            # Use the new backup-enabled insert function
            from app.core.database.mysql_utils import insert_panel_data_rows_with_backup
            success, error_message, backup_count = insert_panel_data_rows_with_backup(panel_name, rows, doc_id, timestamp)
            
            if success:
                status = "uploaded"
                # Log backup operation if data was backed up
                if backup_count > 0:
                    try:
                        log_audit_event(
                            action="DATA_BACKUP",
                            user=uploaded_by,
                            details={
                                "panel_name": panel_name,
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
                error_message = f"Error inserting data: {error_message}"
                logging.error(f"Error inserting panel data: {error_message}")
        except Exception as e:
            status = "failed"
            error_message = f"Error inserting data: {str(e)}"
            logging.error(f"Error inserting panel data: {e}")
            
            # Log audit event for database insertion failure
            try:
                log_audit_event(
                    action="FILE_PROCESSING_ERROR",
                    user=uploaded_by,
                    details={
                        "panel_name": panel_name,
                        "file_name": doc_name,
                        "doc_id": doc_id,
                        "error": error_message,
                        "upload_timestamp": timestamp
                    },
                    status="failed"
                )
            except Exception as audit_error:
                logging.error(f"Failed to log audit event: {audit_error}")
    
    # Save upload history with file hash
    upload_record = {
        "panelname": panel_name,
        "docid": doc_id,
        "docname": doc_name,
        "timestamp": timestamp,
        "total_records": total_records,
        "uploadedby": uploaded_by,
        "status": status,
        "file_hash": file_hash  # Add file hash for duplicate detection
    }
    
    if error_message:
        upload_record["error"] = error_message
    
    try:
        if not os.path.exists(RECON_HISTORY_PATH):
            with open(RECON_HISTORY_PATH, "w") as f:
                json.dump([], f)
        
        with open(RECON_HISTORY_PATH, "r+") as f:
            history = json.load(f)
            history.append(upload_record)
            f.seek(0)
            json.dump(history, f, indent=2)
    except Exception as e:
        logging.error(f"Failed to write upload history: {e}")
        upload_record["status"] = "failed"
        upload_record["error"] = f"Failed to write history: {e}"
    
    # Log audit event for successful upload
    if status == "uploaded":
        try:
            log_audit_event(
                action="PANEL_UPLOAD",
                user=uploaded_by,
                details={
                    "panel_name": panel_name,
                    "file_name": doc_name,
                    "doc_id": doc_id,
                    "total_records": total_records,
                    "upload_timestamp": timestamp
                },
                status="success"
            )
        except Exception as audit_error:
            logging.error(f"Failed to log audit event: {audit_error}")
    
    return upload_record

@router.get("/panels/upload_history")
def get_panel_upload_history():
    if not os.path.exists(RECON_HISTORY_PATH):
        return []
    with open(RECON_HISTORY_PATH, "r") as f:
        return json.load(f)

@router.post("/recon/process")
def reconcile_panel_with_sot(request: Request, panel_name: str = Form(...)):
    """
    Reconcile internal users and not found users from panel with HR data.
    Processes records where initial_status indicates internal users or not found users.
    Updates initial_status column with HR status (active/inactive/not found).
    """
    try:
        # Load config and get key mapping for HR data
        db = load_db()
        panel = next((p for p in db["panels"] if p["name"] == panel_name), None)
        if not panel:
            raise HTTPException(status_code=404, detail="Panel not found")
        
        key_mapping = panel["key_mapping"].get("hr_data", {})
        if not key_mapping:
            raise HTTPException(status_code=400, detail="No HR data key mapping found for this panel")
        
        panel_key, hr_key = list(key_mapping.items())[0]
        
        # Fetch panel data
        panel_rows = fetch_all_rows(panel_name)
        if not panel_rows:
            raise HTTPException(status_code=404, detail="No panel data found")
        
        # Categorize users based on initial_status
        users_to_reconcile = []  # Internal users + not found users
        other_users = []
        service_users_count = 0
        thirdparty_users_count = 0
        not_found_count = 0
        internal_users_count = 0
        
        for row in panel_rows:
            initial_status_raw = row.get("initial_status", "")
            initial_status = initial_status_raw.strip().lower() if initial_status_raw is not None else ""
            
            # Check if this user should be reconciled (internal users or not found users)
            if initial_status in ["employee", "internal", "internal_user", "internal users"]:
                users_to_reconcile.append(row)
                internal_users_count += 1
            elif initial_status in ["not found", "not_found"]:
                users_to_reconcile.append(row)
                not_found_count += 1
            else:
                other_users.append(row)
                # Count by category for summary
                if initial_status in ["service", "service_user", "service users"]:
                    service_users_count += 1
                elif initial_status in ["thirdparty", "thirdparty_user", "thirdparty users"]:
                    thirdparty_users_count += 1
        
        logging.info(f"Found {len(users_to_reconcile)} users to reconcile ({internal_users_count} internal + {not_found_count} not found) and {len(other_users)} other users out of {len(panel_rows)} total panel users")
        
        if not users_to_reconcile:
            return {
                "recon_id": None,
                "summary": {
                    "panel_name": panel_name,
                    "total_panel_users": len(panel_rows),
                    "internal_users": 0,
                    "not_found_users": 0,
                    "users_to_reconcile": 0,
                    "other_users": len(other_users),
                    "service_users": service_users_count,
                    "thirdparty_users": thirdparty_users_count,
                    "matched": 0,
                    "found_active": 0,
                    "found_inactive": 0,
                    "not_found": 0
                },
                "details": [],
                "message": "No internal users or not found users to reconcile"
            }
        
        # Fetch HR data
        hr_rows = fetch_all_rows("hr_data")
        if not hr_rows:
            raise HTTPException(status_code=404, detail="HR data not found")
        
        # Create HR lookup
        hr_lookup = {}
        for row in hr_rows:
            hr_value = row.get(hr_key, "")
            if hr_value is not None:
                hr_lookup[str(hr_value).strip().lower()] = row
        
        details = []
        summary = {
            "panel_name": panel_name,
            "total_panel_users": len(panel_rows),
            "internal_users": internal_users_count,
            "not_found_users": not_found_count,
            "users_to_reconcile": len(users_to_reconcile),
            "other_users": len(other_users),
            "service_users": service_users_count,
            "thirdparty_users": thirdparty_users_count,
            "matched": 0,
            "found_active": 0,
            "found_inactive": 0,
            "not_found": 0
        }
        
        updates = []
        
        # Process each user to reconcile (internal users + not found users)
        for user_row in users_to_reconcile:
            panel_val_raw = user_row.get(panel_key, "")
            panel_val = str(panel_val_raw).strip().lower() if panel_val_raw is not None else ""
            hr_row = hr_lookup.get(panel_val)
            
            user_status = "not found"
            employment_status = None
            
            if hr_row:
                # Found in HR data
                employment_status = hr_row.get("Employment Status") or hr_row.get("employment_status")
                
                if employment_status:
                    if employment_status.lower() in ["active", "resigned"]:
                        user_status = "active"
                        summary["found_active"] += 1
                    elif employment_status.lower() == "inactive":
                        user_status = "inactive"
                        summary["found_inactive"] += 1
                    else:
                        user_status = f"found ({employment_status.lower()})"
                else:
                    user_status = "found (unknown status)"
                
                summary["matched"] += 1
            else:
                summary["not_found"] += 1
            
            # Prepare update record
            updates.append({
                panel_key: panel_val,
                "initial_status": user_status
            })
            
            details.append({
                "panel_user": user_row,
                "hr_user": hr_row,
                "user_status": user_status,
                "employment_status": employment_status
            })
        
        # Update panel table with new statuses
        success, error_msg = update_initial_status_bulk(panel_name, updates, match_field=panel_key)
        
        if not success:
            raise HTTPException(status_code=500, detail=f"Failed to update panel data: {error_msg}")
        
        # Create reconciliation record
        now = datetime.now(timezone(timedelta(hours=5, minutes=30)))  # IST timezone
        recon_id = f"RCN_{uuid.uuid4().hex[:8]}"
        recon_month = now.strftime("%b'%y")
        start_date = now.strftime("%Y-%m-%d")
        performed_by = get_current_user(request)
        
        # Determine status based on actual success/failure
        status = "complete"
        error = None
        
        # Check if there were any errors during the process
        if summary.get("errors", 0) > 0:
            status = "failed"
            error = f"Process completed with {summary.get('errors', 0)} errors"
        
        # Check if no users were processed
        if summary.get("users_to_reconcile", 0) == 0:
            status = "failed"
            error = "No internal users or not found users to reconcile"
        
        recon_record = {
            "recon_id": recon_id,
            "panelname": panel_name,
            "sot_type": "hr_data",
            "recon_month": recon_month,
            "status": status,
            "start_date": start_date,
            "performed_by": performed_by,
            "error": error,
            "summary": summary
        }
        
        # Store in reconciliation_summary.json
        try:
            if not os.path.exists(RECON_SUMMARY_PATH):
                with open(RECON_SUMMARY_PATH, "w") as f:
                    json.dump([], f)
            with open(RECON_SUMMARY_PATH, "r+") as f:
                data = json.load(f)
                data.append(recon_record)
                f.seek(0)
                json.dump(data, f, indent=2)
        except Exception as e:
            logging.error(f"Failed to write reconciliation summary: {e}")
            # Update status if we can't save the record
            status = "failed"
            error = f"Failed to save reconciliation record: {str(e)}"
            recon_record["status"] = status
            recon_record["error"] = error
        
        logging.info(f"HR reconciliation completed for panel '{panel_name}'. Status: {status}, Summary: {summary}")
        
        # Update upload history status to reflect completion
        if status == "complete":
            update_upload_history_status(panel_name, "complete")
        
        # Log audit event
        try:
            log_audit_event(
                action="RECONCILIATION",
                user=performed_by,
                details={
                    "panel_name": panel_name,
                    "recon_id": recon_id,
                    "users_to_reconcile": len(users_to_reconcile),
                    "matched": summary["matched"],
                    "found_active": summary["found_active"],
                    "found_inactive": summary["found_inactive"],
                    "not_found": summary["not_found"],
                    "recon_month": recon_month,
                    "status": status
                },
                status="success" if status == "complete" else "failed"
            )
        except Exception as audit_error:
            logging.error(f"Failed to log audit event: {audit_error}")
        
        return {
            "recon_id": recon_id,
            "summary": summary,
            "details": [],
            "message": f"Reconciled {len(users_to_reconcile)} users ({internal_users_count} internal + {not_found_count} not found) with HR data. Status: {status}"
        }
        
    except HTTPException:
        # Create failed reconciliation record for HTTP exceptions
        try:
            now = datetime.now(timezone(timedelta(hours=5, minutes=30)))  # IST timezone
            recon_id = f"RCN_{uuid.uuid4().hex[:8]}"
            recon_month = now.strftime("%b'%y")
            start_date = now.strftime("%Y-%m-%d")
            performed_by = get_current_user(request)
            
            failed_record = {
                "recon_id": recon_id,
                "panelname": panel_name,
                "sot_type": "hr_data",
                "recon_month": recon_month,
                "status": "failed",
                "start_date": start_date,
                "performed_by": performed_by,
                "error": "Reconciliation process failed",
                "summary": {
                    "panel_name": panel_name,
                    "total_panel_users": 0,
                    "internal_users": 0,
                    "not_found_users": 0,
                    "users_to_reconcile": 0,
                    "other_users": 0,
                    "service_users": 0,
                    "thirdparty_users": 0,
                    "matched": 0,
                    "found_active": 0,
                    "found_inactive": 0,
                    "not_found": 0,
                    "errors": 1
                }
            }
            
            # Store failed record
            if not os.path.exists(RECON_SUMMARY_PATH):
                with open(RECON_SUMMARY_PATH, "w") as f:
                    json.dump([], f)
            with open(RECON_SUMMARY_PATH, "r+") as f:
                data = json.load(f)
                data.append(failed_record)
                f.seek(0)
                json.dump(data, f, indent=2)
        except Exception as e:
            logging.error(f"Failed to write failed reconciliation record: {e}")
        
        # Update upload history status to reflect failure
        update_upload_history_status(panel_name, "failed")
        
        raise
    except Exception as e:
        logging.error(f"Unexpected error in HR reconciliation: {e}")
        
        # Create failed reconciliation record for unexpected exceptions
        try:
            now = datetime.now(timezone(timedelta(hours=5, minutes=30)))  # IST timezone
            recon_id = f"RCN_{uuid.uuid4().hex[:8]}"
            recon_month = now.strftime("%b'%y")
            start_date = now.strftime("%Y-%m-%d")
            performed_by = get_current_user(request)
            
            failed_record = {
                "recon_id": recon_id,
                "panelname": panel_name,
                "sot_type": "hr_data",
                "recon_month": recon_month,
                "status": "failed",
                "start_date": start_date,
                "performed_by": performed_by,
                "error": f"Unexpected error: {str(e)}",
                "summary": {
                    "panel_name": panel_name,
                    "total_panel_users": 0,
                    "internal_users": 0,
                    "not_found_users": 0,
                    "users_to_reconcile": 0,
                    "other_users": 0,
                    "service_users": 0,
                    "thirdparty_users": 0,
                    "matched": 0,
                    "found_active": 0,
                    "found_inactive": 0,
                    "not_found": 0,
                    "errors": 1
                }
            }
            
            # Store failed record
            if not os.path.exists(RECON_SUMMARY_PATH):
                with open(RECON_SUMMARY_PATH, "w") as f:
                    json.dump([], f)
            with open(RECON_SUMMARY_PATH, "r+") as f:
                data = json.load(f)
                data.append(failed_record)
                f.seek(0)
                json.dump(data, f, indent=2)
        except Exception as save_error:
            logging.error(f"Failed to write failed reconciliation record: {save_error}")
        
        # Update upload history status to reflect failure
        update_upload_history_status(panel_name, "failed")
        
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/recon/summary")
def get_recon_summaries():
    if not os.path.exists(RECON_SUMMARY_PATH):
        return []
    with open(RECON_SUMMARY_PATH, "r") as f:
        data = json.load(f)
    return data

@router.get("/recon/summary/{recon_id}")
def get_recon_summary_detail(recon_id: str = Path(...)):
    if not os.path.exists(RECON_SUMMARY_PATH):
        raise HTTPException(status_code=404, detail="No reconciliation summaries found")
    with open(RECON_SUMMARY_PATH, "r") as f:
        data = json.load(f)
    for rec in data:
        if rec.get("recon_id") == recon_id:
            return rec
    raise HTTPException(status_code=404, detail="Reconciliation summary not found")

@router.get("/recon/initialsummary")
def get_initial_summary(status_type: str = "initial"):
    """
    Get status summary for all reconciliations.
    status_type: "initial" for initial_status, "final" for final_status
    """
    try:
        # Load reconciliation summaries
        if not os.path.exists(RECON_SUMMARY_PATH):
            return {"summaries": [], "columns": []}
        
        with open(RECON_SUMMARY_PATH, "r") as f:
            recon_summaries = json.load(f)
        
        initial_summaries = []
        all_status_values = set()  # Collect all unique status values across all panels
        
        for recon in recon_summaries:
            try:
                panel_name = recon.get("panelname")
                if not panel_name:
                    logging.warning(f"Reconciliation {recon.get('recon_id')} missing panel name")
                    continue
                
                # Fetch panel data to get status counts
                panel_rows = fetch_all_rows(panel_name)
                if not panel_rows:
                    logging.warning(f"No data found for panel: {panel_name}")
                    continue
                
                # Determine which status field to use
                status_field = "final_status" if status_type == "final" else "initial_status"
                
                # Count distinct status values
                status_counts = {}
                total_users = len(panel_rows)
                
                for row in panel_rows:
                    status = row.get(status_field, "Unknown")
                    if status is None:
                        status = "Unknown"
                    status_counts[status] = status_counts.get(status, 0) + 1
                    all_status_values.add(status)  # Add to global set
                
                # Create summary entry
                summary_entry = {
                    "panel_name": panel_name,
                    "recon_id": recon.get("recon_id"),
                    "recon_month": recon.get("recon_month"),
                    "total_users": total_users,
                    "status_breakdown": status_counts,
                    "upload_date": recon.get("upload_date"),
                    "performed_by": recon.get("performed_by"),
                    "status": recon.get("status")
                }
                
                initial_summaries.append(summary_entry)
                
            except Exception as e:
                logging.error(f"Error processing reconciliation {recon.get('recon_id')}: {e}")
                continue
        
        # Convert set to sorted list for consistent ordering
        # Prioritize specific status values at the beginning
        priority_statuses = ["active", "inactive", "not found"]
        other_statuses = sorted([status for status in all_status_values if status.lower() not in [ps.lower() for ps in priority_statuses]])
        
        # Build final column order: priority statuses first, then others
        dynamic_columns = []
        for priority_status in priority_statuses:
            # Find matching status (case-insensitive)
            matching_status = next((status for status in all_status_values if status.lower() == priority_status.lower()), None)
            if matching_status:
                dynamic_columns.append(matching_status)
        
        # Add remaining statuses in alphabetical order
        dynamic_columns.extend(other_statuses)
        
        return {
            "summaries": initial_summaries,
            "columns": dynamic_columns,
            "status_type": status_type
        }
        
    except Exception as e:
        logging.error(f"Error in get_initial_summary: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/recon/initialsummary/{recon_id}")
def get_initial_summary_detail(recon_id: str = Path(...), status_type: str = "initial"):
    """
    Get status summary for a specific reconciliation.
    status_type: "initial" for initial_status, "final" for final_status
    """
    try:
        # Load reconciliation summaries
        if not os.path.exists(RECON_SUMMARY_PATH):
            raise HTTPException(status_code=404, detail="No reconciliation summaries found")
        
        with open(RECON_SUMMARY_PATH, "r") as f:
            recon_summaries = json.load(f)
        
        # Find the specific reconciliation
        recon = None
        for r in recon_summaries:
            if r.get("recon_id") == recon_id:
                recon = r
                break
        
        if not recon:
            raise HTTPException(status_code=404, detail="Reconciliation summary not found")
        
        panel_name = recon.get("panelname")
        if not panel_name:
            raise HTTPException(status_code=400, detail="Panel name not found in reconciliation")
        
        # Fetch panel data to get status counts
        panel_rows = fetch_all_rows(panel_name)
        if not panel_rows:
            raise HTTPException(status_code=404, detail=f"No data found for panel: {panel_name}")
        
        # Determine which status field to use
        status_field = "final_status" if status_type == "final" else "initial_status"
        
        # Filter panel data based on status_type
        if status_type == "initial":
            # For initial summary, exclude final_status column
            filtered_panel_rows = []
            for row in panel_rows:
                filtered_row = {k: v for k, v in row.items() if k != "final_status"}
                filtered_panel_rows.append(filtered_row)
        else:
            # For final summary, include all columns
            filtered_panel_rows = panel_rows
        
        # Count distinct status values
        status_counts = {}
        total_users = len(filtered_panel_rows)
        
        for row in filtered_panel_rows:
            status = row.get(status_field, "Unknown")
            if status is None:
                status = "Unknown"
            status_counts[status] = status_counts.get(status, 0) + 1
        
        # Create detailed summary
        summary_detail = {
            "panel_name": panel_name,
            "recon_id": recon.get("recon_id"),
            "recon_month": recon.get("recon_month"),
            "total_users": total_users,
            "status_breakdown": status_counts,
            "upload_date": recon.get("upload_date"),
            "performed_by": recon.get("performed_by"),
            "status": recon.get("status"),
            "panel_data": filtered_panel_rows,
            "status_type": status_type
        }
        
        return summary_detail
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error in get_initial_summary_detail: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}") 