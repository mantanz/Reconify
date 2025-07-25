import os
import json
import uuid
import logging
import csv
import pandas as pd
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Request, Path, Depends
from datetime import datetime, timezone, timedelta

from ..utils.database import load_db, save_db
from ..utils.datetime import get_ist_timestamp, format_ist_timestamp
from ..utils.history import update_upload_history_status
from ..config.paths import RECON_HISTORY_PATH, RECON_SUMMARY_PATH
from ..auth.user_upload import get_current_user
from ..utils.audit_logger import log_panel_upload, log_reconciliation, log_user_recategorization
from db.mysql_utils import (
    insert_panel_data_rows, 
    get_panel_headers_from_db, 
    fetch_all_rows,
    add_column_if_not_exists,
    update_initial_status_bulk
)

router = APIRouter(prefix="/recon", tags=["reconciliation"])


@router.post("/upload")
def upload_recon(
    request: Request,
    panel_name: str = File(...), 
    file: UploadFile = File(...)
):
    doc_id = str(uuid.uuid4())
    doc_name = file.filename
    uploaded_by = get_current_user(request)
    timestamp = get_ist_timestamp()
    filename = file.filename.lower()
    contents = file.file.read()
    
    try:
        # Read and parse file
        if filename.endswith(".xlsx") or filename.endswith(".xls") or filename.endswith(".xlsb"):
            import io
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
        return {"error": f"Error processing file: {str(e)}", "panelname": panel_name, "docid": doc_id, "docname": doc_name, "timestamp": timestamp, "total_records": 0, "uploadedby": uploaded_by, "status": "failed"}
    
    # Determine status based on actual success/failure
    status = "uploaded"
    error_message = None
    
    # Check if we have data to process
    if not rows or len(rows) == 0:
        status = "failed"
        error_message = "No data found in uploaded file"
    else:
        # Insert into panel table
        db_status, db_error = insert_panel_data_rows(panel_name, rows)
        if not db_status:
            status = "failed"
            error_message = db_error
        else:
            # Check if all records were inserted successfully
            if len(rows) != total_records:
                status = "failed"
                error_message = f"Only {len(rows)} out of {total_records} records were processed"
    
    # Log audit event with proper status (success/failed)
    audit_status = "success" if status != "failed" else "failed"
    audit_details = {
        "file_size": len(contents),
        "records_processed": len(rows),
        "error": error_message
    }
    log_panel_upload(request, panel_name, doc_name, audit_status, audit_details)
    
    meta = {
        "panelname": panel_name,
        "docid": doc_id,
        "docname": doc_name,
        "timestamp": timestamp,
        "total_records": total_records,
        "uploadedby": uploaded_by,
        "status": status
    }
    
    # Add error message if there was an error
    if error_message:
        meta["error"] = error_message
        return {"error": error_message, **meta}
    
    try:
        if not os.path.exists(RECON_HISTORY_PATH):
            with open(RECON_HISTORY_PATH, "w") as f:
                json.dump([], f)
        with open(RECON_HISTORY_PATH, "r+") as f:
            data = json.load(f)
            data.append(meta)
            f.seek(0)
            json.dump(data, f, indent=2)
    except Exception as e:
        # If we can't save to history, update status
        meta["status"] = "failed"
        meta["error"] = f"Failed to write panel history: {e}"
        return {"error": f"Failed to write panel history: {e}", **meta}
    
    return meta


@router.get("/summary")
def get_recon_summaries():
    if not os.path.exists(RECON_SUMMARY_PATH):
        return []
    with open(RECON_SUMMARY_PATH, "r") as f:
        data = json.load(f)
    return data


@router.get("/summary/{recon_id}")
def get_recon_summary_detail(recon_id: str = Path(...)):
    if not os.path.exists(RECON_SUMMARY_PATH):
        raise HTTPException(status_code=404, detail="No reconciliation summaries found")
    with open(RECON_SUMMARY_PATH, "r") as f:
        data = json.load(f)
    for rec in data:
        if rec.get("recon_id") == recon_id:
            return rec
    raise HTTPException(status_code=404, detail="Reconciliation summary not found")


@router.post("/process")
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
        start_date = now.strftime("%Y-%m-%d")  # Keep ISO format for internal use
        performed_by = "demo"
        
        # Find upload info from panel history
        upload_date = None
        uploaded_by = None
        if os.path.exists(RECON_HISTORY_PATH):
            with open(RECON_HISTORY_PATH, "r") as f:
                panel_history = json.load(f)
            for entry in reversed(panel_history):
                if entry.get("panelname") == panel_name:
                    upload_date = entry.get("timestamp", None)
                    uploaded_by = entry.get("uploadedby", None)
                    break
        
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
            "upload_date": upload_date,
            "uploaded_by": uploaded_by,
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
        
        # Log audit event with proper status (success/failed)
        audit_status = "success" if status == "complete" else "failed"
        audit_details = {
            "total_users": len(panel_rows),
            "users_to_reconcile": len(users_to_reconcile),
            "reconciliation_results": summary,
            "error": error
        }
        log_reconciliation(request, panel_name, audit_status, audit_details)
        
        logging.info(f"HR reconciliation completed for panel '{panel_name}'. Status: {status}, Summary: {summary}")
        
        # Update upload history status to reflect completion
        if status == "complete":
            update_upload_history_status(panel_name, "complete")
        
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
            start_date = now.strftime("%Y-%m-%d")  # Keep ISO format for internal use
            performed_by = "demo"
            
            # Find upload info from panel history
            upload_date = None
            uploaded_by = None
            if os.path.exists(RECON_HISTORY_PATH):
                with open(RECON_HISTORY_PATH, "r") as f:
                    panel_history = json.load(f)
                for entry in reversed(panel_history):
                    if entry.get("panelname") == panel_name:
                        upload_date = entry.get("timestamp", None)
                        uploaded_by = entry.get("uploadedby", None)
                        break
            
            failed_record = {
                "recon_id": recon_id,
                "panelname": panel_name,
                "sot_type": "hr_data",
                "recon_month": recon_month,
                "status": "failed",
                "upload_date": upload_date,
                "uploaded_by": uploaded_by,
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
            start_date = now.strftime("%Y-%m-%d")  # Keep ISO format for internal use
            performed_by = "demo"
            
            # Find upload info from panel history
            upload_date = None
            uploaded_by = None
            if os.path.exists(RECON_HISTORY_PATH):
                with open(RECON_HISTORY_PATH, "r") as f:
                    panel_history = json.load(f)
                for entry in reversed(panel_history):
                    if entry.get("panelname") == panel_name:
                        upload_date = entry.get("timestamp", None)
                        uploaded_by = entry.get("uploadedby", None)
                        break
            
            failed_record = {
                "recon_id": recon_id,
                "panelname": panel_name,
                "sot_type": "hr_data",
                "recon_month": recon_month,
                "status": "failed",
                "upload_date": upload_date,
                "uploaded_by": uploaded_by,
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