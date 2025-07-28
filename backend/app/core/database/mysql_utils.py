from sqlalchemy import create_engine, MetaData, Table, Column, String, Text, inspect, select, text, Integer
from sqlalchemy.exc import SQLAlchemyError, NoSuchTableError
import traceback
import logging
import json
from datetime import datetime

# Update with your actual MySQL credentials and database name
MYSQL_URL = "mysql+pymysql://reconify:Paytmkaro%4012@localhost/reconify"
engine = create_engine(MYSQL_URL)
metadata = MetaData()

def create_panel_table(panel_name, headers):
    """
    Create a new table for the panel with the given headers as columns.
    Table name is sanitized to be lowercase and underscores.
    """
    table_name = panel_name.replace(" ", "_").lower()
    columns = [Column(header, Text) for header in headers]
    # Use local metadata to avoid conflicts with existing table definitions
    local_metadata = MetaData()
    table = Table(table_name, local_metadata, *columns)
    try:
        table.create(engine)
        return True, None
    except SQLAlchemyError as e:
        print(f"Error creating table {table_name}: {e}")
        return False, str(e)

def get_panel_headers_from_db(panel_name):
    """
    Fetch column names for the given panel's table from the database.
    """
    table_name = panel_name.replace(" ", "_").lower()
    insp = inspect(engine)
    try:
        columns = insp.get_columns(table_name)
        return [col['name'] for col in columns]
    except SQLAlchemyError as e:
        return []

# def create_hr_data_table(headers):
#     """
#     Create the hr_data table with columns from headers if it does not exist.
#     """
#     from sqlalchemy import Table, Column, String, MetaData
#     metadata = MetaData()
#     columns = [Column(h, String(2000)) for h in headers]
#     hr_table = Table("hr_data", metadata, *columns)
#     metadata.create_all(engine, tables=[hr_table])

# def insert_hr_data_rows(rows):
#     """
#     Insert a list of dicts (rows) into the hr_data table. Returns (success, error_message).
#     """
#     from sqlalchemy import Table, MetaData
#     if not rows:
#         return False, "No data to insert"
#     metadata = MetaData()
#     try:
#         hr_table = Table("hr_data", metadata, autoload_with=engine)
#         with engine.begin() as conn:
#             conn.execute(hr_table.insert(), rows)
#         return True, None
#     except NoSuchTableError:
#         # Table does not exist, create it and retry
#         headers = list(rows[0].keys())
#         create_hr_data_table(headers)
#         try:
#             hr_table = Table("hr_data", metadata, autoload_with=engine)
#             with engine.begin() as conn:
#                 conn.execute(hr_table.insert(), rows)
#             return True, None
#         except Exception as e:
#             print("Error inserting into hr_data after creating table:")
#             import traceback; traceback.print_exc()
#             return False, str(e)
#     except Exception as e:
#         print("Error inserting into hr_data:")
#         import traceback; traceback.print_exc()
#         return False, str(e)

def insert_panel_data_rows(panel_name, rows):
    """
    Insert a list of dicts (rows) into the given panel's table. Returns (success, error_message).
    If the table does not exist, return an error.
    """
    from sqlalchemy import Table, MetaData
    if not rows:
        return False, "No data to insert"
    metadata = MetaData()
    table_name = panel_name.replace(" ", "_").lower()
    try:
        panel_table = Table(table_name, metadata, autoload_with=engine)
        with engine.begin() as conn:
            conn.execute(panel_table.insert(), rows)
        return True, None
    except NoSuchTableError:
        return False, f"Table for panel '{panel_name}' does not exist. Please add the panel first."
    except Exception as e:
        print(f"Error inserting into {table_name}:")
        import traceback; traceback.print_exc()
        return False, str(e)

def create_sot_table(sot_name, headers):
    """
    Create a new table for the SOT with the given headers as columns.
    Table name is sanitized to be lowercase and underscores.
    """
    table_name = sot_name.replace(" ", "_").lower()
    columns = [Column(header, Text) for header in headers]
    # Use local metadata to avoid conflicts with existing table definitions
    local_metadata = MetaData()
    table = Table(table_name, local_metadata, *columns)
    try:
        table.create(engine)
        return True, None
    except SQLAlchemyError as e:
        print(f"Error creating table {table_name}: {e}")
        return False, str(e)

def insert_sot_data_rows(sot_name, rows):
    """
    Insert a list of dicts (rows) into the given SOT's table. Returns (success, error_message).
    If the table does not exist, create it and retry.
    """
    from sqlalchemy import Table, MetaData
    if not rows:
        return False, "No data to insert"
    metadata = MetaData()
    table_name = sot_name.replace(" ", "_").lower()
    try:
        sot_table = Table(table_name, metadata, autoload_with=engine)
        with engine.begin() as conn:
            conn.execute(sot_table.insert(), rows)
        return True, None
    except NoSuchTableError:
        # Table does not exist, create it and retry
        headers = list(rows[0].keys())
        create_sot_table(sot_name, headers)
        try:
            sot_table = Table(table_name, metadata, autoload_with=engine)
            with engine.begin() as conn:
                conn.execute(sot_table.insert(), rows)
            return True, None
        except Exception as e:
            print(f"Error inserting into {table_name} after creating table:")
            import traceback; traceback.print_exc()
            return False, str(e)
    except Exception as e:
        print(f"Error inserting into {table_name}:")
        import traceback; traceback.print_exc()
        return False, str(e)

def insert_sot_data_rows_with_backup(sot_name, rows, doc_id, upload_timestamp):
    """
    Insert a list of dicts (rows) into the given SOT's table with backup support.
    This function will backup existing data before inserting new data.
    
    Args:
        sot_name (str): Name of the SOT table
        rows (list): List of dicts to insert
        doc_id (str): Document ID of the upload
        upload_timestamp (str): Timestamp of the upload
        
    Returns:
        tuple: (success: bool, error_message: str or None, backup_count: int)
    """
    from sqlalchemy import Table, MetaData
    if not rows:
        return False, "No data to insert", 0
    
    metadata = MetaData()
    table_name = sot_name.replace(" ", "_").lower()
    
    try:
        # Check if table exists
        insp = inspect(engine)
        try:
            insp.get_columns(table_name)
            table_exists = True
        except SQLAlchemyError:
            table_exists = False
        
        if table_exists:
            # Step 1: Backup existing data
            backup_success, backup_error, backup_count = backup_existing_data(table_name, doc_id, upload_timestamp)
            if not backup_success:
                logging.warning(f"Backup failed for {table_name}: {backup_error}")
                # Continue with upload even if backup fails
            
            # Step 2: Clear existing data
            clear_success, clear_error = clear_table_data(table_name)
            if not clear_success:
                return False, f"Failed to clear existing data: {clear_error}", backup_count
        else:
            # First-time upload - no data to backup or clear
            backup_count = 0
            logging.info(f"First-time upload for table '{table_name}'. No existing data to backup.")
        
        # Step 3: Insert new data
        try:
            sot_table = Table(table_name, metadata, autoload_with=engine)
            with engine.begin() as conn:
                conn.execute(sot_table.insert(), rows)
            return True, None, backup_count
        except NoSuchTableError:
            # Table does not exist, create it and retry
            headers = list(rows[0].keys())
            create_sot_table(sot_name, headers)
            try:
                sot_table = Table(table_name, metadata, autoload_with=engine)
                with engine.begin() as conn:
                    conn.execute(sot_table.insert(), rows)
                return True, None, backup_count
            except Exception as e:
                error_msg = f"Error inserting into {table_name} after creating table: {str(e)}"
                logging.error(error_msg)
                return False, error_msg, backup_count
                
    except Exception as e:
        error_msg = f"Error in insert_sot_data_rows_with_backup for {table_name}: {str(e)}"
        logging.error(error_msg)
        return False, error_msg, backup_count

def insert_panel_data_rows_with_backup(panel_name, rows, doc_id, upload_timestamp):
    """
    Insert a list of dicts (rows) into the given panel's table with backup support.
    This function will backup existing data before inserting new data.
    
    Args:
        panel_name (str): Name of the panel table
        rows (list): List of dicts to insert
        doc_id (str): Document ID of the upload
        upload_timestamp (str): Timestamp of the upload
        
    Returns:
        tuple: (success: bool, error_message: str or None, backup_count: int)
    """
    from sqlalchemy import Table, MetaData
    if not rows:
        return False, "No data to insert", 0
    
    metadata = MetaData()
    table_name = panel_name.replace(" ", "_").lower()
    
    try:
        # Check if table exists
        insp = inspect(engine)
        try:
            insp.get_columns(table_name)
            table_exists = True
        except SQLAlchemyError:
            table_exists = False
        
        if table_exists:
            # Step 1: Backup existing data
            backup_success, backup_error, backup_count = backup_existing_data(table_name, doc_id, upload_timestamp)
            if not backup_success:
                logging.warning(f"Backup failed for {table_name}: {backup_error}")
                # Continue with upload even if backup fails
            
            # Step 2: Clear existing data
            clear_success, clear_error = clear_table_data(table_name)
            if not clear_success:
                return False, f"Failed to clear existing data: {clear_error}", backup_count
        else:
            # First-time upload - no data to backup or clear
            backup_count = 0
            logging.info(f"First-time upload for table '{table_name}'. No existing data to backup.")
        
        # Step 3: Insert new data
        try:
            panel_table = Table(table_name, metadata, autoload_with=engine)
            with engine.begin() as conn:
                conn.execute(panel_table.insert(), rows)
            return True, None, backup_count
        except NoSuchTableError:
            return False, f"Table for panel '{panel_name}' does not exist. Please add the panel first.", backup_count
                
    except Exception as e:
        error_msg = f"Error in insert_panel_data_rows_with_backup for {table_name}: {str(e)}"
        logging.error(error_msg)
        return False, error_msg, backup_count

def fetch_all_rows(table_name):
    """
    Fetch all rows from the given table as a list of dicts.
    """
    metadata = MetaData()
    table_name = table_name.replace(" ", "_").lower()
    try:
        table = Table(table_name, metadata, autoload_with=engine)
        with engine.connect() as conn:
            result = conn.execute(select(table)).fetchall()
            columns = table.columns.keys()
            return [dict(zip(columns, row)) for row in result]
    except Exception as e:
        print(f"Error fetching rows from {table_name}: {e}")
        import traceback; traceback.print_exc()
        return []

def add_column_if_not_exists(table_name, column_name, column_type="VARCHAR(255)"):
    """
    Adds a column to the table if it does not already exist.
    """
    table_name = table_name.replace(" ", "_").lower()
    insp = inspect(engine)
    columns = [col['name'] for col in insp.get_columns(table_name)]
    if column_name not in columns:
        with engine.connect() as conn:
            alter_stmt = f'ALTER TABLE `{table_name}` ADD COLUMN `{column_name}` {column_type}'
            conn.execute(text(alter_stmt))

def update_initial_status_bulk(table_name, updates, match_field="email"):
    """
    Bulk update the initial_status column for multiple rows.
    Production-ready with comprehensive error handling and logging.
    
    Args:
        table_name (str): Name of the table to update
        updates (list): List of dicts with match_field and 'initial_status'
        match_field (str): Field name to match on (cannot be None)
    
    Returns:
        tuple: (success: bool, error_message: str or None)
    """
    from sqlalchemy import Table, MetaData
    import logging
    
    try:
        # Validate inputs
        if not match_field:
            error_msg = "match_field cannot be None in update_initial_status_bulk"
            logging.error(error_msg)
            raise ValueError(error_msg)
        
        if not updates:
            logging.warning("No updates provided to update_initial_status_bulk")
            return True, None
        
        if not table_name:
            error_msg = "table_name cannot be empty"
            logging.error(error_msg)
            raise ValueError(error_msg)
        
        # Sanitize table name
        table_name = table_name.replace(" ", "_").lower()
        logging.info(f"Updating table '{table_name}' with {len(updates)} records using match_field '{match_field}'")
        
        # Load table metadata
        metadata = MetaData()
        try:
            panel_table = Table(table_name, metadata, autoload_with=engine)
        except Exception as e:
            error_msg = f"Failed to load table '{table_name}': {str(e)}"
            logging.error(error_msg)
            return False, error_msg
        
        # Validate that match_field exists in table
        if match_field not in panel_table.columns:
            error_msg = f"Match field '{match_field}' not found in table '{table_name}'. Available columns: {list(panel_table.columns.keys())}"
            logging.error(error_msg)
            return False, error_msg
        
        # Perform bulk update with transaction
        updated_count = 0
        error_count = 0
        
        with engine.begin() as conn:
            for i, upd in enumerate(updates):
                try:
                    # Validate update record
                    if match_field not in upd:
                        logging.warning(f"Update {i}: missing match_field '{match_field}'")
                        error_count += 1
                        continue
                    
                    if "initial_status" not in upd:
                        logging.warning(f"Update {i}: missing 'initial_status' field")
                        error_count += 1
                        continue
                    
                    match_value = upd[match_field]
                    initial_status = upd["initial_status"]
                    
                    # Skip if match_value is None or empty
                    if match_value is None or str(match_value).strip() == "":
                        logging.warning(f"Update {i}: match_value is None or empty")
                        error_count += 1
                        continue
                    
                    # Execute update
                    stmt = panel_table.update().where(
                        panel_table.c[match_field] == str(match_value).strip().lower()
                    ).values(initial_status=str(initial_status))
                    
                    result = conn.execute(stmt)
                    updated_count += result.rowcount
                    
                except Exception as e:
                    logging.error(f"Error updating record {i}: {e}")
                    error_count += 1
                    continue
        
        logging.info(f"Bulk update completed: {updated_count} records updated, {error_count} errors")
        
        if error_count > 0:
            return True, f"Update completed with {error_count} errors out of {len(updates)} records"
        
        return True, None
        
    except Exception as e:
        error_msg = f"Unexpected error in update_initial_status_bulk: {str(e)}"
        logging.error(error_msg)
        return False, error_msg 

def update_final_status_bulk(table_name, updates, match_field="email"):
    """
    Bulk update the final_status column for multiple rows.
    Production-ready with comprehensive error handling and logging.
    
    Args:
        table_name (str): Name of the table to update
        updates (list): List of dicts with match_field and 'final_status'
        match_field (str): Field name to match on (cannot be None)
    
    Returns:
        tuple: (success: bool, error_message: str or None)
    """
    from sqlalchemy import Table, MetaData
    import logging
    
    try:
        # Validate inputs
        if not match_field:
            error_msg = "match_field cannot be None in update_final_status_bulk"
            logging.error(error_msg)
            raise ValueError(error_msg)
        
        if not updates:
            logging.warning("No updates provided to update_final_status_bulk")
            return True, None
        
        if not table_name:
            error_msg = "table_name cannot be empty"
            logging.error(error_msg)
            raise ValueError(error_msg)
        
        # Sanitize table name
        table_name = table_name.replace(" ", "_").lower()
        logging.info(f"Updating final_status for table '{table_name}' with {len(updates)} records using match_field '{match_field}'")
        
        # Load table metadata
        metadata = MetaData()
        try:
            panel_table = Table(table_name, metadata, autoload_with=engine)
        except Exception as e:
            error_msg = f"Failed to load table '{table_name}': {str(e)}"
            logging.error(error_msg)
            return False, error_msg
        
        # Validate that match_field exists in table
        if match_field not in panel_table.columns:
            error_msg = f"Match field '{match_field}' not found in table '{table_name}'. Available columns: {list(panel_table.columns.keys())}"
            logging.error(error_msg)
            return False, error_msg
        
        # Perform bulk update with transaction
        updated_count = 0
        error_count = 0
        
        with engine.begin() as conn:
            for i, upd in enumerate(updates):
                try:
                    # Validate update record
                    if match_field not in upd:
                        logging.warning(f"Update {i}: missing match_field '{match_field}'")
                        error_count += 1
                        continue
                    
                    if "final_status" not in upd:
                        logging.warning(f"Update {i}: missing 'final_status' field")
                        error_count += 1
                        continue
                    
                    match_value = upd[match_field]
                    final_status = upd["final_status"]
                    
                    # Skip if match_value is None or empty
                    if match_value is None or str(match_value).strip() == "":
                        logging.warning(f"Update {i}: match_value is None or empty")
                        error_count += 1
                        continue
                    
                    # Execute update
                    stmt = panel_table.update().where(
                        panel_table.c[match_field] == str(match_value).strip().lower()
                    ).values(final_status=str(final_status))
                    
                    result = conn.execute(stmt)
                    updated_count += result.rowcount
                    
                except Exception as e:
                    logging.error(f"Error updating record {i}: {e}")
                    error_count += 1
                    continue
        
        logging.info(f"Final status bulk update completed: {updated_count} records updated, {error_count} errors")
        
        if error_count > 0:
            return True, f"Update completed with {error_count} errors out of {len(updates)} records"
        
        return True, None
        
    except Exception as e:
        error_msg = f"Unexpected error in update_final_status_bulk: {str(e)}"
        logging.error(error_msg)
        return False, error_msg 

def create_backup_table(table_name):
    """
    Create a backup table for the given table if it doesn't exist.
    Backup table will be named as {table_name}_backup.
    The backup table will have the same columns as the original table plus metadata columns.
    
    Args:
        table_name (str): Name of the original table
        
    Returns:
        tuple: (success: bool, error_message: str or None)
    """
    try:
        backup_table_name = f"{table_name}_backup"
        local_metadata = MetaData()
        
        # First, get the structure of the original table
        insp = inspect(engine)
        try:
            original_columns = insp.get_columns(table_name)
        except SQLAlchemyError:
            # Table doesn't exist yet, create a basic backup table
            backup_table = Table(backup_table_name, local_metadata,
                Column('id', Integer, primary_key=True, autoincrement=True),
                Column('doc_id', String(100), nullable=False),
                Column('upload_timestamp', String(50), nullable=False),
                Column('backup_timestamp', String(50), nullable=False)
            )
            backup_table.create(engine, checkfirst=True)
            logging.info(f"Basic backup table '{backup_table_name}' created successfully")
            return True, None
        
        # Create backup table with same columns as original table plus metadata columns
        columns = [
            Column('id', Integer, primary_key=True, autoincrement=True),
            Column('doc_id', String(100), nullable=False),
            Column('upload_timestamp', String(50), nullable=False),
            Column('backup_timestamp', String(50), nullable=False)
        ]
        
        # Add all columns from the original table
        for col in original_columns:
            col_name = col['name']
            col_type = col['type']
            # Use Text for all data columns to handle any data type
            columns.append(Column(col_name, Text))
        
        backup_table = Table(backup_table_name, local_metadata, *columns)
        
        # Create the backup table
        backup_table.create(engine, checkfirst=True)
        logging.info(f"Backup table '{backup_table_name}' created successfully with {len(columns)} columns")
        return True, None
        
    except Exception as e:
        error_msg = f"Error creating backup table for '{table_name}': {str(e)}"
        logging.error(error_msg)
        return False, error_msg

def backup_existing_data(table_name, doc_id, upload_timestamp):
    """
    Backup existing data from the given table to its backup table.
    The doc_id and upload_timestamp should be from the previous upload (the data being backed up).
    
    Args:
        table_name (str): Name of the table to backup
        doc_id (str): Document ID of the current upload (will be used to find previous upload metadata)
        upload_timestamp (str): Timestamp of the current upload (will be used to find previous upload metadata)
        
    Returns:
        tuple: (success: bool, error_message: str or None, backup_count: int)
    """
    try:
        # Sanitize table name
        table_name = table_name.replace(" ", "_").lower()
        backup_table_name = f"{table_name}_backup"
        
        # Check if the original table exists
        insp = inspect(engine)
        try:
            insp.get_columns(table_name)
            table_exists = True
        except SQLAlchemyError:
            table_exists = False
        
        if not table_exists:
            logging.info(f"Table '{table_name}' does not exist. No data to backup for first-time upload.")
            return True, None, 0
        
        # Create backup table if it doesn't exist
        success, error = create_backup_table(table_name)
        if not success:
            return False, error, 0
        
        # Fetch all existing data
        existing_data = fetch_all_rows(table_name)
        if not existing_data:
            logging.info(f"No existing data to backup for table '{table_name}'")
            return True, None, 0
        
        # Get previous upload metadata from upload history
        previous_doc_id, previous_upload_timestamp = get_previous_upload_metadata(table_name, doc_id, upload_timestamp)
        
        # Get current timestamp for backup
        backup_timestamp = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
        
        # Insert backup data
        local_metadata = MetaData()
        backup_table = Table(backup_table_name, local_metadata, autoload_with=engine)
        
        backup_rows = []
        for row in existing_data:
            # Create backup row with metadata and all original data as separate columns
            backup_row = {
                'doc_id': previous_doc_id,
                'upload_timestamp': previous_upload_timestamp,
                'backup_timestamp': backup_timestamp
            }
            
            # Add all original data as separate columns
            for key, value in row.items():
                backup_row[key] = str(value) if value is not None else None
            
            backup_rows.append(backup_row)
        
        with engine.begin() as conn:
            conn.execute(backup_table.insert(), backup_rows)
        
        backup_count = len(backup_rows)
        logging.info(f"Successfully backed up {backup_count} rows from '{table_name}' to '{backup_table_name}' with previous upload metadata")
        return True, None, backup_count
        
    except Exception as e:
        error_msg = f"Error backing up data from '{table_name}': {str(e)}"
        logging.error(error_msg)
        return False, error_msg, 0

def get_previous_upload_metadata(table_name, current_doc_id, current_upload_timestamp):
    """
    Get the metadata (doc_id and upload_timestamp) from the previous upload.
    This is the metadata of the data that is currently in the table and will be backed up.
    
    Args:
        table_name (str): Name of the table
        current_doc_id (str): Current upload's doc_id
        current_upload_timestamp (str): Current upload's timestamp
        
    Returns:
        tuple: (previous_doc_id, previous_upload_timestamp)
    """
    try:
        # For SOT tables, check SOT upload history
        if table_name in ['hr_data', 'service_users', 'internal_users', 'thirdparty_users']:
            from app.config.settings import SOT_UPLOADS_PATH
            import json
            import os
            
            if os.path.exists(SOT_UPLOADS_PATH):
                with open(SOT_UPLOADS_PATH, "r") as f:
                    sot_uploads = json.load(f)
                
                # Find the most recent upload for this SOT type (excluding current upload)
                sot_type = table_name
                previous_uploads = [upload for upload in sot_uploads 
                                  if upload.get('sot_type') == sot_type 
                                  and upload.get('doc_id') != current_doc_id]
                
                if previous_uploads:
                    # Sort by timestamp and get the most recent
                    previous_uploads.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
                    latest_previous = previous_uploads[0]
                    return latest_previous.get('doc_id', 'unknown'), latest_previous.get('timestamp', 'unknown')
        
        # For panel tables, check panel upload history
        else:
            from app.config.settings import RECON_HISTORY_PATH
            import json
            import os
            
            if os.path.exists(RECON_HISTORY_PATH):
                with open(RECON_HISTORY_PATH, "r") as f:
                    panel_uploads = json.load(f)
                
                # Find the most recent upload for this panel (excluding current upload)
                previous_uploads = [upload for upload in panel_uploads 
                                  if upload.get('panelname') == table_name 
                                  and upload.get('docid') != current_doc_id]
                
                if previous_uploads:
                    # Sort by timestamp and get the most recent
                    previous_uploads.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
                    latest_previous = previous_uploads[0]
                    return latest_previous.get('docid', 'unknown'), latest_previous.get('timestamp', 'unknown')
        
        # If no previous upload found, use default values
        return 'initial_upload', 'unknown'
        
    except Exception as e:
        logging.error(f"Error getting previous upload metadata: {e}")
        return 'unknown', 'unknown'

def clear_table_data(table_name):
    """
    Clear all data from the given table.
    
    Args:
        table_name (str): Name of the table to clear
        
    Returns:
        tuple: (success: bool, error_message: str or None)
    """
    try:
        # Sanitize table name
        table_name = table_name.replace(" ", "_").lower()
        
        # Check if the table exists before trying to clear it
        insp = inspect(engine)
        try:
            insp.get_columns(table_name)
            table_exists = True
        except SQLAlchemyError:
            table_exists = False
        
        if not table_exists:
            logging.info(f"Table '{table_name}' does not exist. No data to clear.")
            return True, None
        
        with engine.begin() as conn:
            delete_stmt = text(f"DELETE FROM `{table_name}`")
            result = conn.execute(delete_stmt)
            deleted_count = result.rowcount
        
        logging.info(f"Successfully cleared {deleted_count} rows from table '{table_name}'")
        return True, None
        
    except Exception as e:
        error_msg = f"Error clearing data from '{table_name}': {str(e)}"
        logging.error(error_msg)
        return False, error_msg

def get_backup_history(table_name, limit=50):
    """
    Get backup history for the given table.
    
    Args:
        table_name (str): Name of the table
        limit (int): Maximum number of backup entries to return
        
    Returns:
        list: List of backup entries with metadata and original data as separate columns
    """
    try:
        # Sanitize table name
        table_name = table_name.replace(" ", "_").lower()
        backup_table_name = f"{table_name}_backup"
        
        local_metadata = MetaData()
        backup_table = Table(backup_table_name, local_metadata, autoload_with=engine)
        
        with engine.connect() as conn:
            result = conn.execute(
                select(backup_table).order_by(backup_table.c.backup_timestamp.desc()).limit(limit)
            ).fetchall()
            
            backup_entries = []
            for row in result:
                # Convert row to dictionary
                row_dict = dict(row._mapping)
                
                # Separate metadata from original data
                metadata = {
                    'id': row_dict.get('id'),
                    'doc_id': row_dict.get('doc_id'),
                    'upload_timestamp': row_dict.get('upload_timestamp'),
                    'backup_timestamp': row_dict.get('backup_timestamp')
                }
                
                # Extract original data (all columns except metadata columns)
                original_data = {}
                metadata_columns = {'id', 'doc_id', 'upload_timestamp', 'backup_timestamp'}
                for key, value in row_dict.items():
                    if key not in metadata_columns:
                        original_data[key] = value
                
                # Create backup entry
                entry = {
                    **metadata,
                    'original_data': original_data
                }
                backup_entries.append(entry)
            
            return backup_entries
            
    except Exception as e:
        logging.error(f"Error getting backup history for '{table_name}': {str(e)}")
        return [] 