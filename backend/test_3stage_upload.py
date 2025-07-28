#!/usr/bin/env python3
"""
Test script for the 3-stage SOT upload process
"""

import requests
import json
import os
import tempfile
import pandas as pd

# API base URL
BASE_URL = "http://localhost:8000"

def create_test_file():
    """Create a test CSV file"""
    data = {
        'name': ['John Doe', 'Jane Smith', 'Bob Johnson'],
        'email': ['john@example.com', 'jane@example.com', 'bob@example.com'],
        'department': ['IT', 'HR', 'Finance']
    }
    df = pd.DataFrame(data)
    
    # Create temporary file
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False)
    df.to_csv(temp_file.name, index=False)
    temp_file.close()
    
    return temp_file.name

def test_3stage_upload():
    """Test the 3-stage upload process"""
    print("🧪 Testing 3-stage SOT upload process...")
    
    # Step 1: Test server connection
    print("\n1. Testing server connection...")
    try:
        response = requests.get(f"{BASE_URL}/sot/test-connection")
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Server connection: {result['status']}")
            if result.get('directory_accessible'):
                print("✅ Directory access: OK")
            else:
                print("⚠️  Directory access: Failed")
        else:
            print(f"❌ Server connection failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Server connection error: {e}")
        return False
    
    # Step 2: Create test file
    print("\n2. Creating test file...")
    test_file_path = create_test_file()
    print(f"✅ Test file created: {test_file_path}")
    
    # Step 3: Upload file
    print("\n3. Uploading file to internal_users SOT...")
    try:
        with open(test_file_path, 'rb') as f:
            files = {'file': ('test_users.csv', f, 'text/csv')}
            data = {'sot_type': 'internal_users'}
            response = requests.post(f"{BASE_URL}/sot/upload", files=files, data=data)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Upload successful!")
            print(f"   Status: {result.get('status')}")
            print(f"   Remote path: {result.get('remote_file_path')}")
            print(f"   Processed path: {result.get('processed_file_path')}")
            
            if result.get('status') == 'processed':
                print("✅ File successfully moved through all 3 stages!")
            else:
                print(f"⚠️  File status: {result.get('status')}")
        else:
            print(f"❌ Upload failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Upload error: {e}")
        return False
    
    # Step 4: Check file stages
    print("\n4. Checking file stages...")
    try:
        response = requests.get(f"{BASE_URL}/sot/stages/internal_users")
        if response.status_code == 200:
            result = response.json()
            print("✅ File stages retrieved:")
            for stage, files in result.get('stages', {}).items():
                print(f"   {stage}: {len(files)} files")
                if files:
                    print(f"     Files: {files}")
        else:
            print(f"❌ Failed to get file stages: {response.status_code}")
    except Exception as e:
        print(f"❌ Error checking file stages: {e}")
    
    # Step 5: Check upload history
    print("\n5. Checking upload history...")
    try:
        response = requests.get(f"{BASE_URL}/sot/uploads")
        if response.status_code == 200:
            uploads = response.json()
            print(f"✅ Found {len(uploads)} uploads in history")
            if uploads:
                latest = uploads[-1]
                print(f"   Latest upload: {latest.get('doc_name')}")
                print(f"   Status: {latest.get('status')}")
        else:
            print(f"❌ Failed to get upload history: {response.status_code}")
    except Exception as e:
        print(f"❌ Error checking upload history: {e}")
    
    # Cleanup
    try:
        os.unlink(test_file_path)
        print(f"\n🧹 Cleaned up test file: {test_file_path}")
    except:
        pass
    
    print("\n🎉 3-stage upload test completed!")
    return True

if __name__ == "__main__":
    test_3stage_upload() 