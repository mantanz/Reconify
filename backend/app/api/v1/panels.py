from fastapi import APIRouter, HTTPException, UploadFile, File, Request
from typing import List
import pandas as pd
import logging
import csv
import io

from app.models.panel import PanelConfig, PanelName, PanelUpdate, PanelCreate
from app.utils.file_utils import load_db, save_db
from app.api.deps import get_current_user
from app.core.database.mysql_utils import create_panel_table, get_panel_headers_from_db, fetch_all_rows
from app.core.audit.audit_utils import log_audit_event

router = APIRouter()

@router.get("/panels", response_model=List[PanelConfig])
def get_panels():
    db = load_db()
    return db["panels"]

@router.post("/panels/add")
def add_panel(panel: PanelConfig, request: Request):
    db = load_db()
    user = get_current_user(request)
    if any(p["name"] == panel.name for p in db["panels"]):
        raise HTTPException(status_code=400, detail="Panel already exists")
    db["panels"].append(panel.dict())
    save_db(db)
    # Audit log
    try:
        log_audit_event(
            action="NEW_PANEL_ADDED",
            user=user,
            details={
                "panel_name": panel.name,
                "key_mapping": panel.key_mapping
            },
            status="success"
        )
    except Exception as audit_error:
        logging.error(f"Failed to log audit event: {audit_error}")
    return {"message": "Panel added"}

@router.put("/panels/modify")
def modify_panel(update: PanelUpdate, request: Request):
    db = load_db()
    user = get_current_user(request)
    for panel in db["panels"]:
        if panel["name"] == update.name:
            old_panel = panel.copy()
            if update.key_mapping is not None:
                panel["key_mapping"] = update.key_mapping
            if update.panel_headers is not None:
                panel["panel_headers"] = update.panel_headers
            save_db(db)
            # Audit log
            try:
                log_audit_event(
                    action="PANEL_CONFIG_MODIFY",
                    user=user,
                    details={
                        "panel_name": update.name,
                        "old": old_panel,
                        "new": panel
                    },
                    status="success"
                )
            except Exception as audit_error:
                logging.error(f"Failed to log audit event: {audit_error}")
            return {"message": "Panel updated"}
    raise HTTPException(status_code=404, detail="Panel not found")

@router.delete("/panels/delete")
def delete_panel(panel: PanelName, request: Request):
    db = load_db()
    user = get_current_user(request)
    deleted_panel = next((p for p in db["panels"] if p["name"] == panel.name), None)
    db["panels"] = [p for p in db["panels"] if p["name"] != panel.name]
    save_db(db)
    # Audit log
    try:
        log_audit_event(
            action="PANEL_CONFIG_DELETE",
            user=user,
            details={
                "panel_name": panel.name,
                "deleted_panel": deleted_panel
            },
            status="success"
        )
    except Exception as audit_error:
        logging.error(f"Failed to log audit event: {audit_error}")
    return {"message": "Panel deleted"}

@router.post("/panels/upload_file")
def upload_panel_file(file: UploadFile = File(...)):
    # Read the uploaded file and return headers
    filename = file.filename.lower()
    contents = file.file.read()
    headers = []
    
    try:
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
            headers = list(df.columns)
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
            
            reader = csv.reader(lines)
            # Convert headers to lowercase
            headers = [h.strip().lower() for h in next(reader)]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")
    
    return {"headers": headers}

@router.post("/panels/save")
def save_panel(panel: PanelCreate, request: Request):
    db = load_db()
    user = get_current_user(request)
    if any(p["name"] == panel.name for p in db["panels"]):
        raise HTTPException(status_code=400, detail="Panel already exists")
    db["panels"].append({
        "name": panel.name,
        "key_mapping": panel.key_mapping
    })
    save_db(db)
    # Create table in MySQL
    success, error = create_panel_table(panel.name, panel.panel_headers or [])
    if not success:
        # Log audit event for MySQL table creation failure
        try:
            log_audit_event(
                action="NEW_PANEL_ADDED",
                user=user,
                details={
                    "panel_name": panel.name,
                    "key_mapping": panel.key_mapping,
                    "error": f"MySQL table creation failed: {error}"
                },
                status="failed"
            )
        except Exception as audit_error:
            logging.error(f"Failed to log audit event: {audit_error}")
        raise HTTPException(status_code=500, detail=f"MySQL table creation failed: {error}")
    
    # Log audit event for successful panel save
    try:
        log_audit_event(
            action="NEW_PANEL_ADDED",
            user=user,
            details={
                "panel_name": panel.name,
                "key_mapping": panel.key_mapping,
                "panel_headers": panel.panel_headers
            },
            status="success"
        )
    except Exception as audit_error:
        logging.error(f"Failed to log audit event: {audit_error}")
    
    return {"message": "Panel configuration saved and table created"}

@router.get("/panels/{panel_name}/headers")
def get_panel_headers(panel_name: str):
    headers = get_panel_headers_from_db(panel_name)
    if not headers:
        raise HTTPException(status_code=404, detail="No headers found for this panel in the database")
    return {"headers": headers}

@router.get("/panels/{panel_name}/details")
def get_panel_details(panel_name: str):
    """
    Fetch panel data rows for a specific panel.
    Returns only the panel rows data.
    """
    try:
        # Load panel configuration to verify panel exists
        db = load_db()
        panel = next((p for p in db["panels"] if p["name"] == panel_name), None)
        if not panel:
            raise HTTPException(status_code=404, detail="Panel not found")
        
        # Get panel headers from database
        headers = get_panel_headers_from_db(panel_name)
        if not headers:
            raise HTTPException(status_code=404, detail="Panel table not found in database")
        
        # Fetch all panel data
        try:
            panel_rows = fetch_all_rows(panel_name)
            if not panel_rows:
                panel_rows = []
        except Exception as e:
            logging.error(f"Error fetching panel data: {e}")
            raise HTTPException(status_code=500, detail=f"Error fetching panel data: {str(e)}")
        
        logging.info(f"Fetched {len(panel_rows)} rows for panel '{panel_name}'")
        
        return {
            "panel_name": panel_name,
            "rows": panel_rows
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching panel details for '{panel_name}': {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}") 