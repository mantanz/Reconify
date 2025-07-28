#!/usr/bin/env python3
"""
Test server upload functionality directly
"""

import requests
import tempfile
import pandas as pd

# API base URL
BASE_URL = "http://localhost:8000"

def test_server_upload():
    """Test server upload directly"""
    print("🧪 Testing server upload functionality...")
    
    # Create test file
    data = {
        'domain': ['example.com', 'test.com', 'demo.com'],
        'usertype': ['internal', 'internal', 'internal']
    }
    df = pd.DataFrame(data)
    
    # Create temporary file
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False)
    df.to_csv(temp_file.name, index=False)
    temp_file.close()
    
    print(f"✅ Test file created: {temp_file.name}")
    
    # Upload file
    try:
        with open(temp_file.name, 'rb') as f:
            files = {'file': ('test_internal_users.csv', f, 'text/csv')}
            data = {'sot_type': 'internal_users'}
            response = requests.post(f"{BASE_URL}/sot/upload", files=files, data=data)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Upload response:")
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
        os.unlink(temp_file.name)
        print(f"🧹 Cleaned up test file")
    except:
        pass

if __name__ == "__main__":
    test_server_upload() 