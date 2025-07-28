#!/usr/bin/env python3
"""
Script to explore server directory structure and find correct upload path
"""
import paramiko

# Server configuration
SERVER_HOST = "10.150.192.73"
SERVER_USERNAME = "one97"
SERVER_PASSWORD = "Dep@123"

def explore_directories():
    """Explore server directories to find the correct upload path"""
    print("=== Server Directory Exploration ===\n")
    
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        ssh.connect(
            SERVER_HOST, 
            username=SERVER_USERNAME, 
            password=SERVER_PASSWORD, 
            timeout=30
        )
        
        sftp = ssh.open_sftp()
        
        # Check current directory
        print("1. Current directory:")
        stdin, stdout, stderr = ssh.exec_command('pwd')
        current_dir = stdout.read().decode().strip()
        print(f"   {current_dir}")
        
        # List home directory contents
        print("\n2. Home directory contents:")
        try:
            home_contents = sftp.listdir('/home/one97')
            for item in home_contents:
                print(f"   /home/one97/{item}")
        except Exception as e:
            print(f"   Error listing home directory: {e}")
        
        # Check if /one97 directory exists
        print("\n3. Checking /one97 directory:")
        try:
            one97_contents = sftp.listdir('/one97')
            print("   ✓ /one97 directory exists")
            for item in one97_contents:
                print(f"   /one97/{item}")
        except Exception as e:
            print(f"   ✗ /one97 directory not accessible: {e}")
        
        # Check if Yash_Code directory exists
        print("\n4. Checking for Yash_Code directory:")
        possible_paths = [
            '/home/one97/Yash_Code',
            '/one97/Yash_Code',
            '/home/one97/yash_code',
            '/one97/yash_code',
            '/home/one97/Code',
            '/one97/Code'
        ]
        
        for path in possible_paths:
            try:
                contents = sftp.listdir(path)
                print(f"   ✓ {path} exists")
                for item in contents:
                    print(f"     {path}/{item}")
            except Exception as e:
                print(f"   ✗ {path} not accessible: {e}")
        
        # Try to create the upload directory structure
        print("\n5. Testing directory creation:")
        test_paths = [
            '/home/one97/Yash_Code/Data Uploads',
            '/one97/Yash_Code/Data Uploads',
            '/home/one97/Data Uploads',
            '/one97/Data Uploads'
        ]
        
        for path in test_paths:
            try:
                sftp.mkdir(path)
                print(f"   ✓ Successfully created: {path}")
                # Test writing a file
                test_file_path = f"{path}/test.txt"
                with sftp.file(test_file_path, 'w') as f:
                    f.write("Test file")
                print(f"   ✓ Successfully wrote test file: {test_file_path}")
                # Clean up
                sftp.remove(test_file_path)
                print(f"   ✓ Successfully removed test file")
                sftp.rmdir(path)
                print(f"   ✓ Successfully removed test directory")
                print(f"   → RECOMMENDED PATH: {path}")
                break
            except Exception as e:
                print(f"   ✗ Failed to create/test {path}: {e}")
        
        sftp.close()
        ssh.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    explore_directories() 