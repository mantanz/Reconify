#!/usr/bin/env python3
"""
Test directory creation on the server
"""
import paramiko

# Server configuration
SERVER_HOST = "10.150.192.73"
SERVER_USERNAME = "one97"
SERVER_PASSWORD = "Dep@123"
SERVER_UPLOAD_PATH = "/home/one97/Yash_Code/Data Uploads"

def test_directory_creation():
    """Test creating the upload directory structure"""
    print("=== Directory Creation Test ===\n")
    
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        print(f"Connecting to {SERVER_HOST}...")
        ssh.connect(
            SERVER_HOST, 
            username=SERVER_USERNAME, 
            password=SERVER_PASSWORD, 
            timeout=30
        )
        print("✓ SSH connection successful")
        
        sftp = ssh.open_sftp()
        print("✓ SFTP connection successful")
        
        # Test creating the upload path
        test_path = f"{SERVER_UPLOAD_PATH}/test_upload"
        print(f"\nTesting creation of: {test_path}")
        
        try:
            # First, check if parent directories exist
            print("1. Checking parent directories...")
            parent_dirs = SERVER_UPLOAD_PATH.split('/')
            current_path = ""
            for dir_part in parent_dirs:
                if dir_part:  # Skip empty parts
                    current_path += f"/{dir_part}"
                    try:
                        sftp.listdir(current_path)
                        print(f"   ✓ {current_path} exists")
                    except Exception as e:
                        print(f"   ✗ {current_path} does not exist: {e}")
                        try:
                            sftp.mkdir(current_path)
                            print(f"   ✓ Created {current_path}")
                        except Exception as mkdir_error:
                            print(f"   ✗ Failed to create {current_path}: {mkdir_error}")
            
            # Now create the test directory
            print(f"\n2. Creating test directory: {test_path}")
            sftp.mkdir(test_path)
            print(f"   ✓ Successfully created: {test_path}")
            
            # Test writing a file
            print(f"\n3. Testing file upload to: {test_path}")
            test_file_path = f"{test_path}/test.txt"
            test_content = "This is a test file for directory creation verification."
            
            with sftp.file(test_file_path, 'w') as f:
                f.write(test_content)
            print(f"   ✓ Successfully wrote test file: {test_file_path}")
            
            # Verify file exists
            sftp.stat(test_file_path)
            print(f"   ✓ File verification successful")
            
            # Clean up
            print(f"\n4. Cleaning up test files...")
            sftp.remove(test_file_path)
            print(f"   ✓ Removed test file")
            sftp.rmdir(test_path)
            print(f"   ✓ Removed test directory")
            
            print(f"\n✅ SUCCESS! Directory creation and file upload works.")
            print(f"   The correct path is: {SERVER_UPLOAD_PATH}")
            
        except Exception as e:
            print(f"✗ Error during directory creation test: {e}")
        
        sftp.close()
        ssh.close()
        
    except Exception as e:
        print(f"✗ Connection error: {e}")

if __name__ == "__main__":
    test_directory_creation() 