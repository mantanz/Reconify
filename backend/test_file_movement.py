#!/usr/bin/env python3
"""
Test file movement between stages
"""

import paramiko
import logging

# Server configuration
SERVER_HOST = "10.150.192.73"
SERVER_USERNAME = "one97"
SERVER_PASSWORD = "Dep@123"
SERVER_UPLOAD_PATH = "/home/one97/Yash_Code/Data Uploads"

def test_file_movement():
    """Test file movement between stages"""
    print("🧪 Testing file movement between stages...")
    
    try:
        # Create SSH client
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        # Connect to server
        print(f"Connecting to {SERVER_HOST}...")
        ssh.connect(SERVER_HOST, username=SERVER_USERNAME, password=SERVER_PASSWORD, timeout=30)
        sftp = ssh.open_sftp()
        print("✅ SSH connection established")
        
        # Test 1: List files in uploaded stage
        print("\n1. Checking files in uploaded stage...")
        uploaded_path = f"{SERVER_UPLOAD_PATH}/internal_users/uploaded"
        try:
            files = sftp.listdir(uploaded_path)
            print(f"✅ Files in uploaded: {files}")
        except Exception as e:
            print(f"❌ Error listing uploaded files: {e}")
        
        # Test 2: List files in processing stage
        print("\n2. Checking files in processing stage...")
        processing_path = f"{SERVER_UPLOAD_PATH}/internal_users/processing"
        try:
            files = sftp.listdir(processing_path)
            print(f"✅ Files in processing: {files}")
        except Exception as e:
            print(f"❌ Error listing processing files: {e}")
        
        # Test 3: Try to move a file
        print("\n3. Testing file movement...")
        if files:
            test_file = files[0]  # Use first file
            from_path = f"{uploaded_path}/{test_file}"
            to_path = f"{processing_path}/{test_file}"
            
            print(f"Moving {test_file} from uploaded to processing...")
            try:
                sftp.rename(from_path, to_path)
                print("✅ File movement successful!")
                
                # Move it back
                sftp.rename(to_path, from_path)
                print("✅ File moved back successfully!")
            except Exception as e:
                print(f"❌ File movement failed: {e}")
                import traceback
                traceback.print_exc()
        
        sftp.close()
        ssh.close()
        print("\n🎉 File movement test completed!")
        
    except Exception as e:
        print(f"❌ Connection error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_file_movement() 