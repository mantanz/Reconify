#!/usr/bin/env python3
"""
Test script to diagnose server connectivity issues
"""
import paramiko
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Server configuration (same as in sot.py)
SERVER_HOST = "10.150.192.73"
SERVER_USERNAME = "one97"
SERVER_PASSWORD = "Deep@123"  # Updated password
SERVER_UPLOAD_PATH = "/one97/Yash_Code/Data Uploads"

# Common password variations to try
PASSWORD_VARIATIONS = [
    "Deep@123",
    "deep@123", 
    "Deep123",
    "deep123",
    "Paytmkaro@12",
    "paytmkaro@12",
    "Paytm@123",
    "paytm@123"
]

def test_ssh_connection():
    """Test basic SSH connection"""
    try:
        print(f"Testing SSH connection to {SERVER_HOST}...")
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        ssh.connect(SERVER_HOST, username=SERVER_USERNAME, password=SERVER_PASSWORD, timeout=30)
        print("✓ SSH connection successful")
        
        # Test basic command execution
        stdin, stdout, stderr = ssh.exec_command('pwd')
        pwd = stdout.read().decode().strip()
        print(f"✓ Current directory on server: {pwd}")
        
        ssh.close()
        return True
        
    except Exception as e:
        print(f"✗ SSH connection failed: {e}")
        return False

def test_sftp_connection():
    """Test SFTP connection and directory access"""
    try:
        print(f"Testing SFTP connection to {SERVER_HOST}...")
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        ssh.connect(SERVER_HOST, username=SERVER_USERNAME, password=SERVER_PASSWORD, timeout=30)
        sftp = ssh.open_sftp()
        print("✓ SFTP connection successful")
        
        # Test directory listing
        try:
            files = sftp.listdir(SERVER_UPLOAD_PATH)
            print(f"✓ Directory {SERVER_UPLOAD_PATH} accessible")
            print(f"  Contents: {files[:5]}...")  # Show first 5 items
        except Exception as dir_error:
            print(f"✗ Directory {SERVER_UPLOAD_PATH} not accessible: {dir_error}")
            
            # Try to create the directory
            try:
                sftp.mkdir(SERVER_UPLOAD_PATH)
                print(f"✓ Created directory {SERVER_UPLOAD_PATH}")
            except Exception as mkdir_error:
                print(f"✗ Failed to create directory: {mkdir_error}")
        
        sftp.close()
        ssh.close()
        return True
        
    except Exception as e:
        print(f"✗ SFTP connection failed: {e}")
        return False

def test_file_upload():
    """Test file upload functionality"""
    try:
        print("Testing file upload...")
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        ssh.connect(SERVER_HOST, username=SERVER_USERNAME, password=SERVER_PASSWORD, timeout=30)
        sftp = ssh.open_sftp()
        
        # Create test directory
        test_dir = f"{SERVER_UPLOAD_PATH}/test_upload"
        try:
            sftp.mkdir(test_dir)
        except:
            pass  # Directory might already exist
        
        # Create test file content
        test_content = b"This is a test file for connectivity testing.\nUploaded from Reconify backend."
        test_filename = "test_connection.txt"
        remote_path = f"{test_dir}/{test_filename}"
        
        # Upload test file
        with sftp.file(remote_path, 'wb') as remote_file:
            remote_file.write(test_content)
        
        print(f"✓ Test file uploaded successfully to {remote_path}")
        
        # Verify file exists
        try:
            sftp.stat(remote_path)
            print("✓ File verification successful")
        except Exception as verify_error:
            print(f"✗ File verification failed: {verify_error}")
        
        # Clean up test file
        try:
            sftp.remove(remote_path)
            print("✓ Test file cleaned up")
        except:
            print("⚠ Could not clean up test file")
        
        sftp.close()
        ssh.close()
        return True
        
    except Exception as e:
        print(f"✗ File upload test failed: {e}")
        return False

def main():
    print("=== Server Connectivity Diagnostic Tool ===\n")
    
    # Test 1: SSH Connection
    ssh_success = test_ssh_connection()
    print()
    
    # Test 2: SFTP Connection
    sftp_success = test_sftp_connection()
    print()
    
    # Test 3: File Upload
    if ssh_success and sftp_success:
        upload_success = test_file_upload()
    else:
        print("Skipping file upload test due to connection failures")
        upload_success = False
    print()
    
    # Summary
    print("=== Summary ===")
    print(f"SSH Connection: {'✓ PASS' if ssh_success else '✗ FAIL'}")
    print(f"SFTP Connection: {'✓ PASS' if sftp_success else '✗ FAIL'}")
    print(f"File Upload: {'✓ PASS' if upload_success else '✗ FAIL'}")
    
    if not ssh_success:
        print("\nPossible issues:")
        print("- Server IP address is incorrect")
        print("- Server is not reachable from this network")
        print("- SSH service is not running on the server")
        print("- Firewall is blocking the connection")
    
    if ssh_success and not sftp_success:
        print("\nPossible issues:")
        print("- SFTP service is not enabled")
        print("- User permissions are insufficient")
        print("- Directory path is incorrect")
    
    if ssh_success and sftp_success and not upload_success:
        print("\nPossible issues:")
        print("- Insufficient write permissions")
        print("- Disk space issues")
        print("- File system restrictions")

if __name__ == "__main__":
    main() 