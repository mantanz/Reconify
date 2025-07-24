from fastapi import APIRouter, HTTPException, UploadFile, File, Form
import json
import os
import csv
import logging
import pandas as pd

from app.utils.database import load_db
from app.config.paths import RECON_SUMMARY_PATH
from db.mysql_utils import (
    fetch_all_rows,
    add_column_if_not_exists,
    update_initial_status_bulk,
    update_final_status_bulk
)

router = APIRouter(tags=["users"])


@router.post("/categorize_users")
def categorize_users(panel_name: str = Form(...)):
    """
    Dynamically categorize users in a panel based on configured SOT mappings.
    This function is production-ready and handles any number of SOTs with any field mappings.
    
    NOTE: User categorization is restricted to only three SOTs:
    - service_users (highest priority)
    - internal_users (medium priority) 
    - thirdparty_users (lowest priority)
    
    Other SOTs in the key_mapping will be ignored for categorization purposes.
    """
    try:
        db = load_db()
        panel = next((p for p in db["panels"] if p["name"] == panel_name), None)
        if not panel:
            raise HTTPException(status_code=404, detail="Panel not found")
        
        key_mapping = panel.get("key_mapping", {})
        if not key_mapping:
            raise HTTPException(
                status_code=400, 
                detail=f"No key mappings configured for panel '{panel_name}'. Please configure key mappings first."
            )
        
        # Get all configured SOTs dynamically
        configured_sots = list(key_mapping.keys())
        if not configured_sots:
            raise HTTPException(
                status_code=400, 
                detail=f"No SOTs configured for panel '{panel_name}'. Please configure at least one SOT mapping."
            )
        
        # Restrict to only the three allowed SOTs for user categorization
        allowed_sots = ["service_users", "internal_users", "thirdparty_users"]
        configured_sots = [sot for sot in configured_sots if sot in allowed_sots]
        
        if not configured_sots:
            raise HTTPException(
                status_code=400, 
                detail=f"No valid SOTs configured for user categorization. Only 'service_users', 'internal_users', and 'thirdparty_users' are allowed. Available mappings: {list(key_mapping.keys())}"
            )
        
        # Production logging (replace print with proper logging)
        logging.info(f"Starting user categorization for panel: {panel_name}")
        logging.info(f"Configured SOTs for categorization: {configured_sots}")
        logging.debug(f"Key mapping configuration: {key_mapping}")
        
        # Fetch data for all configured SOTs
        sot_data = {}
        for sot in configured_sots:
            try:
                sot_data[sot] = fetch_all_rows(sot)
                logging.info(f"Fetched {len(sot_data[sot])} rows from SOT: {sot}")
            except Exception as e:
                logging.error(f"Failed to fetch data from SOT '{sot}': {e}")
                sot_data[sot] = []
        
        # Fetch panel data
        try:
            panel_rows = fetch_all_rows(panel_name)
            logging.info(f"Fetched {len(panel_rows)} rows from panel: {panel_name}")
        except Exception as e:
            logging.error(f"Failed to fetch panel data: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch panel data: {str(e)}")
        
        # Initialize summary dynamically
        summary = {sot: 0 for sot in configured_sots}
        summary["not_found"] = 0
        summary["total"] = len(panel_rows)
        summary["errors"] = 0
        updates = []

        # Helper function to extract panel_field and sot_field from mapping
        def extract_mapping_fields(mapping):
            """Extract panel_field and sot_field from mapping, supporting both old and new formats."""
            if not mapping:
                return None, None
            
            # Handle new format: {'panel_field': 'panel_field_value', 'sot_field': 'sot_field_value'}
            if 'panel_field' in mapping and 'sot_field' in mapping:
                return mapping['panel_field'], mapping['sot_field']
            
            # Handle old format: {'panel_field': 'sot_field'}
            if len(mapping) == 1:
                panel_field, sot_field = list(mapping.items())[0]
                return panel_field, sot_field
            
            return None, None

        # Determine the match_field (key field) for the panel
        # Prioritize service_users mapping, then fall back to other SOTs
        match_field = None
        
        # Define the priority order for match_field determination
        priority_sots = ["service_users", "internal_users", "thirdparty_users"]
        
        # Try to get match_field from SOTs in priority order
        for sot in priority_sots:
            if sot in configured_sots:
                mapping = key_mapping.get(sot, {})
                panel_field, _ = extract_mapping_fields(mapping)
                if panel_field:
                    match_field = panel_field
                    logging.info(f"Using '{match_field}' as primary key field (from {sot})")
                    break
        
        if not match_field:
            raise HTTPException(
                status_code=400, 
                detail=f"No valid panel field mapping found in key_mapping for panel '{panel_name}'. Please configure the key mapping first. Available mappings: {key_mapping}"
            )

        # Build lookups for each SOT using the configured SOT field
        lookups = {}
        for sot in configured_sots:
            mapping = key_mapping.get(sot, {})
            panel_field, sot_field = extract_mapping_fields(mapping)
            logging.info(f"SOT {sot}: panel_field='{panel_field}', sot_field='{sot_field}'")
            
            if sot_field:
                # Create lookup with proper error handling
                try:
                    lookups[sot] = {
                        str(row.get(sot_field, "")).strip().lower(): row 
                        for row in sot_data[sot] 
                        if row.get(sot_field) is not None
                    }
                    logging.info(f"Built lookup for {sot} with {len(lookups[sot])} entries using field '{sot_field}'")
                    logging.debug(f"Sample lookup keys for {sot}: {list(lookups[sot].keys())[:5]}")  # Show first 5 keys
                except Exception as e:
                    logging.error(f"Error building lookup for {sot}: {e}")
                    lookups[sot] = {}
            else:
                logging.warning(f"No SOT field configured for {sot}")
                lookups[sot] = {}

        # Process each panel row
        for row_idx, row in enumerate(panel_rows):
            try:
                status = "not found"
                found = False
                
                # Check SOTs in priority order: service_users -> internal_users -> thirdparty_users
                priority_sots = ["service_users", "internal_users", "thirdparty_users"]
                
                for sot in priority_sots:
                    if sot not in configured_sots:
                        continue
                        
                    mapping = key_mapping.get(sot, {})
                    panel_field, sot_field = extract_mapping_fields(mapping)
                    
                    if not panel_field or not sot_field:
                        continue
                    
                    # Get panel value
                    panel_value = row.get(panel_field, "")
                    if not panel_value:
                        continue
                    
                    panel_value = str(panel_value).strip().lower()
                    original_panel_value = panel_value  # Keep original for logging
                    
                    # Apply domain matching for internal_users and thirdparty_users
                    # Check if this SOT uses domain matching (either by flag or by field name)
                    use_domain_matching = mapping.get("use_domain_matching", False)
                    is_domain_sot = sot in ["internal_users", "thirdparty_users"] and sot_field == "domain"
                    
                    if (use_domain_matching or is_domain_sot) and "@" in panel_value:
                        panel_value = panel_value.split("@")[-1].strip().lower()
                        logging.debug(f"Row {row_idx}: Extracted domain '{panel_value}' from '{original_panel_value}' for {sot}")
                    
                    # Look for match in SOT
                    if panel_value in lookups[sot]:
                        sot_row = lookups[sot][panel_value]
                        
                        # Try to get user type from various possible field names
                        user_type_fields = ["user_type", "usertype", "type", "status", "category"]
                        user_type = None
                        for field in user_type_fields:
                            user_type = sot_row.get(field)
                            if user_type:
                                break
                        
                        status = user_type if user_type else "found"
                        summary[sot] += 1
                        found = True
                        logging.debug(f"Row {row_idx}: Found in {sot} with status '{status}' (looked for '{panel_value}')")
                        break  # Stop checking other SOTs once a match is found
                    else:
                        logging.debug(f"Row {row_idx}: Not found in {sot} (looked for '{panel_value}')")
                
                if not found:
                    summary["not_found"] += 1
                    logging.debug(f"Row {row_idx}: Not found in any SOT")
                
                # Add to updates
                match_value = row.get(match_field, "")
                if match_value is not None:
                    updates.append({
                        match_field: str(match_value).strip().lower(), 
                        "initial_status": status
                    })
                else:
                    logging.warning(f"Row {row_idx}: match_field '{match_field}' is None")
                    summary["errors"] += 1
                    
            except Exception as e:
                logging.error(f"Error processing row {row_idx}: {e}")
                summary["errors"] += 1
                continue

        # Update database
        try:
            add_column_if_not_exists(panel_name, "initial_status", "VARCHAR(255)")
            
            success, error_msg = update_initial_status_bulk(panel_name, updates, match_field=match_field)
            if not success:
                raise HTTPException(status_code=500, detail=f"Database update failed: {error_msg}")
            
            if error_msg:
                logging.warning(f"Database update completed with warnings: {error_msg}")
            
            logging.info(f"Successfully updated {len(updates)} rows in panel '{panel_name}'")
        except Exception as e:
            logging.error(f"Failed to update database: {e}")
            raise HTTPException(status_code=500, detail=f"Database update failed: {str(e)}")
        
        logging.info(f"User categorization completed for panel '{panel_name}'. Summary: {summary}")
        return {
            "message": "User categorization complete", 
            "summary": summary,
            "panel_name": panel_name,
            "total_processed": len(panel_rows),
            "successful_updates": len(updates)
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logging.error(f"Unexpected error in categorize_users: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/recategorize_users")
def recategorize_users(panel_name: str = Form(...), file: UploadFile = File(...)):
    """
    Recategorize users in a panel based on an uploaded file.
    Matches panel users with the uploaded file and updates final_status column.
    If no match found, uses initial_status value.
    """
    try:
        # Load panel configuration
        db = load_db()
        panel = next((p for p in db["panels"] if p["name"] == panel_name), None)
        if not panel:
            raise HTTPException(status_code=404, detail="Panel not found")
        
        # Process uploaded file
        filename = file.filename.lower()
        contents = file.file.read()
        
        try:
            # Read and parse file
            if filename.endswith(".xlsx") or filename.endswith(".xls") or filename.endswith(".xlsb"):
                import io
                df = pd.read_excel(io.BytesIO(contents))
                # Convert headers to lowercase
                df.columns = [col.strip().lower() for col in df.columns]
                # Clean NaN values - replace with None for database compatibility
                df = df.replace({pd.NA: None, pd.NaT: None})
                df = df.where(pd.notnull(df), None)
                recategorization_data = df.to_dict(orient="records")
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
                recategorization_data = [dict((k.strip().lower(), v.strip() if v is not None else "") for k, v in row.items()) for row in reader]
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")
        
        if not recategorization_data:
            raise HTTPException(status_code=400, detail="No data found in uploaded file")
        
        # Get panel data
        panel_rows = fetch_all_rows(panel_name)
        if not panel_rows:
            raise HTTPException(status_code=404, detail="No panel data found")
        
        # Determine match field from panel configuration
        # Use the first available mapping field as the match field
        key_mapping = panel.get("key_mapping", {})
        if not key_mapping:
            raise HTTPException(status_code=400, detail="No key mappings configured for this panel")
        
        # Get the first mapping to determine the match field
        first_mapping = next(iter(key_mapping.values()))
        if not first_mapping:
            raise HTTPException(status_code=400, detail="Invalid key mapping configuration")
        
        # Extract panel field from mapping
        panel_field = list(first_mapping.keys())[0]
        
        # Determine type column from uploaded file
        # Look for common type column names
        type_column = None
        type_column_candidates = ["type", "user_type", "status", "category", "final_status", "classification"]
        
        for candidate in type_column_candidates:
            if candidate in recategorization_data[0]:
                type_column = candidate
                break
        
        if not type_column:
            raise HTTPException(status_code=400, detail="No type column found in uploaded file. Expected one of: type, user_type, status, category, final_status, classification")
        
        # Determine match column from uploaded file
        # Look for common match column names
        match_column = None
        match_column_candidates = ["email", "user_email", "domain", "id", "user_id", "employee_id"]
        
        for candidate in match_column_candidates:
            if candidate in recategorization_data[0]:
                match_column = candidate
                break
        
        if not match_column:
            raise HTTPException(status_code=400, detail="No match column found in uploaded file. Expected one of: email, user_email, domain, id, user_id, employee_id")
        
        logging.info(f"Recategorization: panel_field='{panel_field}', match_column='{match_column}', type_column='{type_column}'")
        
        # Create lookup from uploaded file
        recategorization_lookup = {}
        for row in recategorization_data:
            match_value = row.get(match_column, "")
            type_value = row.get(type_column, "")
            if match_value and type_value:
                recategorization_lookup[str(match_value).strip().lower()] = str(type_value).strip()
        
        logging.info(f"Created recategorization lookup with {len(recategorization_lookup)} entries")
        
        # Process each panel user
        updates = []
        summary = {
            "total_panel_users": len(panel_rows),
            "matched": 0,
            "not_found": 0,
            "errors": 0
        }
        
        for row_idx, panel_row in enumerate(panel_rows):
            try:
                panel_value = panel_row.get(panel_field, "")
                if not panel_value:
                    logging.warning(f"Row {row_idx}: Missing panel field '{panel_field}'")
                    summary["errors"] += 1
                    continue
                
                panel_value = str(panel_value).strip().lower()
                initial_status = panel_row.get("initial_status", "")
                
                # Look for match in recategorization data
                if panel_value in recategorization_lookup:
                    final_status = recategorization_lookup[panel_value]
                    summary["matched"] += 1
                    logging.debug(f"Row {row_idx}: Matched '{panel_value}' -> '{final_status}'")
                else:
                    # No match found, use initial_status
                    final_status = initial_status if initial_status else "not_found"
                    summary["not_found"] += 1
                    logging.debug(f"Row {row_idx}: No match for '{panel_value}', using initial_status '{initial_status}'")
                
                # Prepare update
                updates.append({
                    panel_field: str(panel_row.get(panel_field, "")).strip().lower(),
                    "final_status": final_status
                })
                
            except Exception as e:
                logging.error(f"Error processing row {row_idx}: {e}")
                summary["errors"] += 1
                continue
        
        # Add final_status column if it doesn't exist
        add_column_if_not_exists(panel_name, "final_status", "VARCHAR(255)")
        
        # Update database
        success, error_msg = update_final_status_bulk(panel_name, updates, match_field=panel_field)
        if not success:
            raise HTTPException(status_code=500, detail=f"Database update failed: {error_msg}")
        
        logging.info(f"User recategorization completed for panel '{panel_name}'. Summary: {summary}")
        
        return {
            "message": "User recategorization complete",
            "summary": summary,
            "panel_name": panel_name,
            "total_processed": len(panel_rows),
            "successful_updates": len(updates),
            "match_column": match_column,
            "type_column": type_column,
            "panel_field": panel_field
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Unexpected error in recategorize_users: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/users/summary")
def get_user_wise_summary():
    """
    Get a comprehensive user-wise summary across all panels.
    Returns all users from all panels with their reconciliation details.
    """
    try:
        # Load configuration and reconciliation summaries
        db = load_db()
        
        # Load reconciliation summaries
        if os.path.exists(RECON_SUMMARY_PATH):
            with open(RECON_SUMMARY_PATH, 'r') as f:
                recon_summaries = json.load(f)
        else:
            recon_summaries = []
        
        # Create a lookup for reconciliation details by panel name
        recon_lookup = {}
        for recon in recon_summaries:
            panel_name = recon.get('panelname', '')
            if panel_name:
                if panel_name not in recon_lookup:
                    recon_lookup[panel_name] = []
                recon_lookup[panel_name].append(recon)
        
        all_users = []
        
        # Process each panel
        for panel in db.get("panels", []):
            panel_name = panel["name"]
            
            try:
                # Get panel data
                panel_rows = fetch_all_rows(panel_name)
                if not panel_rows:
                    logging.info(f"No data found for panel: {panel_name}")
                    continue
                
                # Get key mapping field (email field)
                key_mapping = panel.get("key_mapping", {})
                if not key_mapping:
                    logging.warning(f"No key mapping found for panel: {panel_name}")
                    continue
                
                # Determine the key field (email field) from the first mapping
                first_mapping = next(iter(key_mapping.values()))
                if not first_mapping:
                    logging.warning(f"Invalid key mapping for panel: {panel_name}")
                    continue
                
                # Extract the panel field (email field) from mapping
                panel_field = list(first_mapping.keys())[0]
                
                # Get reconciliation details for this panel
                panel_recons = recon_lookup.get(panel_name, [])
                
                # Process each user in the panel
                for row in panel_rows:
                    email_id = row.get(panel_field, "")
                    if not email_id:
                        continue  # Skip rows without email
                    
                    # Get reconciliation details for this panel
                    recon_id = None
                    recon_month = None
                    
                    if panel_recons:
                        # Use the most recent reconciliation
                        latest_recon = max(panel_recons, key=lambda x: x.get('start_date', '') or '')
                        recon_id = latest_recon.get('recon_id', '')
                        recon_month = latest_recon.get('recon_month', '')
                    
                    # Get status information
                    initial_status = row.get('initial_status', '')
                    final_status = row.get('final_status', '')
                    
                    # If no final_status, use initial_status
                    if not final_status:
                        final_status = initial_status
                    
                    user_summary = {
                        "email_id": str(email_id).strip(),
                        "recon_id": recon_id,
                        "recon_month": recon_month,
                        "panel_name": panel_name,
                        "initial_status": initial_status,
                        "final_status": final_status
                    }
                    
                    all_users.append(user_summary)
                
                logging.info(f"Processed {len(panel_rows)} users from panel: {panel_name}")
                
            except Exception as e:
                logging.error(f"Error processing panel {panel_name}: {e}")
                continue
        
        # Sort by email_id for consistent ordering
        all_users.sort(key=lambda x: x['email_id'].lower())
        
        logging.info(f"User-wise summary completed. Total users: {len(all_users)}")
        
        return {
            "total_users": len(all_users),
            "users": all_users
        }
        
    except Exception as e:
        logging.error(f"Unexpected error in get_user_wise_summary: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}") 