from sqlalchemy import create_engine, MetaData, Table, Column, String, Text, inspect, select, text
from sqlalchemy.exc import SQLAlchemyError, NoSuchTableError
import traceback
import logging

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