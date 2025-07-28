#!/usr/bin/env python3
"""
Test upload functionality for all SOTs
"""

import requests
import tempfile
import pandas as pd

# API base URL
BASE_URL = "http://localhost:8000"

# All SOT types
SOT_TYPES = [
    "hr_data",
    "internal_users", 
    "service_users",
    "thirdparty_users"
]

def create_test_file(sot_type):
    """Create a test file with appropriate data for each SOT type"""
    if sot_type == "hr_data":
        data = {
            'employee_id': ['E001', 'E002', 'E003'],
            'name': ['John Doe', 'Jane Smith', 'Bob Johnson'],
            'department': ['IT', 'HR', 'Finance']
        }
    elif sot_type == "internal_users":
        data = {
            'domain': ['example.com', 'test.com', 'demo.com'],
            'usertype': ['internal', 'internal', 'internal']
        }
    elif sot_type == "service_users":
        data = {
            'service_id': ['S001', 'S002', 'S003'],
            'service_name': ['Service A', 'Service B', 'Service C'],
            'status': ['active', 'active', 'inactive']
        }
    elif sot_type == "thirdparty_users":
        data = {
            'partner_id': ['P001', 'P002', 'P003'],
            'partner_name': ['Partner A', 'Partner B', 'Partner C'],
            'access_level': ['basic', 'premium', 'basic']
        }
    else:
        data = {
            'id': ['1', '2', '3'],
            'name': ['Test 1', 'Test 2', 'Test 3']
        }
    
    df = pd.DataFrame(data)
    
    # Create temporary file
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False)
    df.to_csv(temp_file.name, index=False)
    temp_file.close()
    
    return temp_file.name

def test_sot_upload(sot_type):
    """Test upload for a specific SOT type"""
    print(f"\n🧪 Testing upload for {sot_type}...")
    
    # Create test file
    test_file_path = create_test_file(sot_type)
    print(f"✅ Test file created: {test_file_path}")
    
    # Upload file
    try:
        with open(test_file_path, 'rb') as f:
            files = {'file': (f'test_{sot_type}.csv', f, 'text/csv')}
            data = {'sot_type': sot_type}
            response = requests.post(f"{BASE_URL}/sot/upload", files=files, data=data)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Upload successful!")
            print(f"   Status: {result.get('status')}")
            print(f"   Remote path: {result.get('remote_file_path')}")
            print(f"   Processed path: {result.get('processed_file_path')}")
            
            if result.get('status') == 'processed':
                print("🎉 File successfully processed through all 3 stages!")
            elif result.get('status') == 'uploaded':
                print("⚠️  File uploaded but not fully processed")
            else:
                print(f"❌ Upload failed: {result.get('error', 'Unknown error')}")
        else:
            print(f"❌ Upload failed: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Upload error: {e}")
    
    # Cleanup
    import os
    try:
        os.unlink(test_file_path)
        print(f"🧹 Cleaned up test file")
    except:
        pass

def test_all_sots():
    """Test upload for all SOT types"""
    print("🧪 Testing upload functionality for all SOTs...")
    
    # Test server connection first
    print("\n1. Testing server connection...")
    try:
        response = requests.get(f"{BASE_URL}/sot/test-connection")
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Server connection: {result['status']}")
        else:
            print(f"❌ Server connection failed: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Server connection error: {e}")
        return
    
    # Test each SOT
    for sot_type in SOT_TYPES:
        test_sot_upload(sot_type)
    
    print("\n🎉 All SOT upload tests completed!")

if __name__ == "__main__":
    test_all_sots() 