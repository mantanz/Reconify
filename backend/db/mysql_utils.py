from sqlalchemy import create_engine, MetaData, Table, Column, String, inspect
from sqlalchemy.exc import SQLAlchemyError, NoSuchTableError
import traceback

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
    columns = [Column(header, String(2000)) for header in headers]
    table = Table(table_name, metadata, *columns)
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
    columns = [Column(header, String(2000)) for header in headers]
    table = Table(table_name, metadata, *columns)
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