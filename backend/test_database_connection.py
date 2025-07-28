#!/usr/bin/env python3
"""
Test database connection and SOT data insertion
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.mysql_utils import insert_sot_data_rows, get_sot_headers_from_db
import pandas as pd

def test_database_connection():
    """Test database connection and SOT operations"""
    print("🔍 Testing database connection and SOT operations...")
    
    # Test 1: Check if we can get SOT headers
    print("\n1. Testing SOT headers retrieval...")
    try:
        headers = get_sot_headers_from_db("internal_users")
        print(f"✅ SOT headers retrieved: {len(headers)} fields")
        print(f"   Headers: {headers}")
    except Exception as e:
        print(f"❌ Failed to get SOT headers: {e}")
        return False
    
    # Test 2: Create test data
    print("\n2. Creating test data...")
    test_data = [
        {"name": "John Doe", "email": "john@example.com", "department": "IT"},
        {"name": "Jane Smith", "email": "jane@example.com", "department": "HR"},
        {"name": "Bob Johnson", "email": "bob@example.com", "department": "Finance"}
    ]
    print(f"✅ Test data created: {len(test_data)} records")
    
    # Test 3: Try to insert test data
    print("\n3. Testing data insertion...")
    try:
        success, error = insert_sot_data_rows("internal_users", test_data)
        if success:
            print("✅ Data insertion successful!")
        else:
            print(f"❌ Data insertion failed: {error}")
            return False
    except Exception as e:
        print(f"❌ Exception during data insertion: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print("\n🎉 Database connection and SOT operations are working!")
    return True

def test_sot_table_structure():
    """Test the SOT table structure"""
    print("\n🔍 Testing SOT table structure...")
    
    try:
        from sqlalchemy import create_engine, MetaData, Table, inspect
        from db.mysql_utils import get_engine
        
        engine = get_engine()
        inspector = inspect(engine)
        
        # Check if internal_users table exists
        tables = inspector.get_table_names()
        print(f"Available tables: {tables}")
        
        if "internal_users" in tables:
            print("✅ internal_users table exists")
            
            # Get column information
            columns = inspector.get_columns("internal_users")
            print(f"Table columns: {[col['name'] for col in columns]}")
            
            # Check for any constraints
            constraints = inspector.get_unique_constraints("internal_users")
            print(f"Unique constraints: {constraints}")
            
        else:
            print("❌ internal_users table does not exist")
            return False
            
    except Exception as e:
        print(f"❌ Error checking table structure: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    print("🧪 Database Connection Test")
    print("=" * 50)
    
    # Test database connection
    db_test = test_database_connection()
    
    # Test table structure
    table_test = test_sot_table_structure()
    
    if db_test and table_test:
        print("\n✅ All database tests passed!")
    else:
        print("\n❌ Some database tests failed!") 