#!/usr/bin/env python3
"""
Detailed server connectivity diagnostic tool
"""
import paramiko
import socket
import logging
import time

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Server configuration
SERVER_HOST = "10.150.192.73"
SERVER_USERNAME = "one97"
SERVER_PASSWORD = "Dep@123"
SERVER_UPLOAD_PATH = "/one97/Yash_Code/Data Uploads"

def test_network_connectivity():
    """Test basic network connectivity to the server"""
    print("=== Network Connectivity Test ===")
    try:
        # Test if we can reach the server
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        result = sock.connect_ex((SERVER_HOST, 22))
        sock.close()
        
        if result == 0:
            print("✓ Network connectivity: SUCCESS")
            print(f"  Port 22 (SSH) is reachable on {SERVER_HOST}")
            return True
        else:
            print("✗ Network connectivity: FAILED")
            print(f"  Cannot reach {SERVER_HOST}:22")
            return False
    except Exception as e:
        print(f"✗ Network test error: {e}")
        return False

def test_ssh_connection_detailed():
    """Test SSH connection with detailed error reporting"""
    print("\n=== SSH Connection Test ===")
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        print(f"Attempting to connect to {SERVER_HOST}...")
        print(f"Username: {SERVER_USERNAME}")
        print(f"Password: {'*' * len(SERVER_PASSWORD)}")
        
        # Try connection with detailed logging
        ssh.connect(
            SERVER_HOST, 
            username=SERVER_USERNAME, 
            password=SERVER_PASSWORD, 
            timeout=30,
            allow_agent=False,
            look_for_keys=False
        )
        
        print("✓ SSH connection: SUCCESS")
        
        # Test basic command execution
        stdin, stdout, stderr = ssh.exec_command('whoami')
        user = stdout.read().decode().strip()
        print(f"  Current user on server: {user}")
        
        stdin, stdout, stderr = ssh.exec_command('pwd')
        pwd = stdout.read().decode().strip()
        print(f"  Current directory: {pwd}")
        
        ssh.close()
        return True
        
    except paramiko.AuthenticationException as e:
        print("✗ SSH connection: AUTHENTICATION FAILED")
        print(f"  Error: {e}")
        print("\nPossible causes:")
        print("  - Username is incorrect")
        print("  - Password is incorrect")
        print("  - User account is locked/disabled")
        print("  - Server requires SSH key authentication")
        return False
        
    except paramiko.SSHException as e:
        print("✗ SSH connection: SSH ERROR")
        print(f"  Error: {e}")
        return False
        
    except socket.timeout as e:
        print("✗ SSH connection: TIMEOUT")
        print(f"  Error: {e}")
        return False
        
    except Exception as e:
        print("✗ SSH connection: UNEXPECTED ERROR")
        print(f"  Error: {e}")
        return False

def test_sftp_detailed():
    """Test SFTP with detailed error reporting"""
    print("\n=== SFTP Connection Test ===")
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        ssh.connect(
            SERVER_HOST, 
            username=SERVER_USERNAME, 
            password=SERVER_PASSWORD, 
            timeout=30,
            allow_agent=False,
            look_for_keys=False
        )
        
        sftp = ssh.open_sftp()
        print("✓ SFTP connection: SUCCESS")
        
        # Test directory listing
        try:
            files = sftp.listdir('/')
            print(f"  Root directory accessible, contains {len(files)} items")
        except Exception as e:
            print(f"  ⚠ Root directory access failed: {e}")
        
        # Test specific upload path
        try:
            sftp.listdir(SERVER_UPLOAD_PATH)
            print(f"  ✓ Upload directory accessible: {SERVER_UPLOAD_PATH}")
        except Exception as e:
            print(f"  ✗ Upload directory not accessible: {e}")
            print(f"    Path: {SERVER_UPLOAD_PATH}")
            
            # Try to create the directory
            try:
                sftp.mkdir(SERVER_UPLOAD_PATH)
                print(f"  ✓ Created upload directory: {SERVER_UPLOAD_PATH}")
            except Exception as mkdir_error:
                print(f"  ✗ Failed to create directory: {mkdir_error}")
        
        sftp.close()
        ssh.close()
        return True
        
    except Exception as e:
        print(f"✗ SFTP connection failed: {e}")
        return False

def test_alternative_credentials():
    """Test with common password variations"""
    print("\n=== Testing Alternative Credentials ===")
    
    # Common variations to try
    variations = [
        ("one97", "Dep@123"),
        ("one97", "dep@123"),
        ("one97", "Dep123"),
        ("one97", "dep123"),
        ("one97", "Paytmkaro@12"),
        ("one97", "paytmkaro@12"),
        ("one97", "Paytm@123"),
        ("one97", "paytm@123"),
        ("root", "Dep@123"),
        ("admin", "Dep@123"),
    ]
    
    for username, password in variations:
        print(f"Testing: {username} / {'*' * len(password)}")
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            ssh.connect(
                SERVER_HOST, 
                username=username, 
                password=password, 
                timeout=10,
                allow_agent=False,
                look_for_keys=False
            )
            
            print(f"  ✓ SUCCESS with {username} / {'*' * len(password)}")
            ssh.close()
            return username, password
            
        except paramiko.AuthenticationException:
            print(f"  ✗ Failed")
            continue
        except Exception as e:
            print(f"  ⚠ Error: {e}")
            continue
    
    print("  No working credentials found")
    return None, None

def main():
    print("=== Detailed Server Connectivity Diagnostic ===\n")
    
    # Test 1: Network connectivity
    network_ok = test_network_connectivity()
    
    if not network_ok:
        print("\n❌ Cannot reach the server. Check:")
        print("  - Server IP address is correct")
        print("  - Server is running")
        print("  - Network connectivity")
        print("  - Firewall settings")
        return
    
    # Test 2: SSH connection
    ssh_ok = test_ssh_connection_detailed()
    
    # Test 3: SFTP connection
    if ssh_ok:
        sftp_ok = test_sftp_detailed()
    else:
        sftp_ok = False
    
    # Test 4: Alternative credentials
    working_user, working_pass = test_alternative_credentials()
    
    # Summary
    print("\n=== Summary ===")
    print(f"Network Connectivity: {'✓ PASS' if network_ok else '✗ FAIL'}")
    print(f"SSH Connection: {'✓ PASS' if ssh_ok else '✗ FAIL'}")
    print(f"SFTP Connection: {'✓ PASS' if sftp_ok else '✗ FAIL'}")
    
    if working_user and working_pass:
        print(f"Working Credentials: {working_user} / {'*' * len(working_pass)}")
        print("\n✅ SOLUTION FOUND!")
        print(f"Update your configuration to use:")
        print(f"  SERVER_USERNAME = '{working_user}'")
        print(f"  SERVER_PASSWORD = '{working_pass}'")
    else:
        print("\n❌ No working credentials found")
        print("\nNext steps:")
        print("1. Contact your server administrator")
        print("2. Verify the correct username and password")
        print("3. Check if SSH key authentication is required")
        print("4. Verify the server IP address")

if __name__ == "__main__":
    main() 