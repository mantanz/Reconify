#!/usr/bin/env python3
"""
Create 3-stage directory structure for all SOTs
"""

import paramiko
import logging

# Server configuration
SERVER_HOST = "10.150.192.73"
SERVER_USERNAME = "one97"
SERVER_PASSWORD = "Dep@123"
SERVER_UPLOAD_PATH = "/home/one97/Yash_Code/Data Uploads"

# All SOT types
SOT_TYPES = [
    "hr_data",
    "internal_users", 
    "service_users",
    "thirdparty_users"
]

def create_sot_directories():
    """Create 3-stage directory structure for all SOTs"""
    print("🏗️  Creating 3-stage directory structure for all SOTs...")
    
    try:
        # Create SSH client
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        # Connect to server
        print(f"Connecting to {SERVER_HOST}...")
        ssh.connect(SERVER_HOST, username=SERVER_USERNAME, password=SERVER_PASSWORD, timeout=30)
        sftp = ssh.open_sftp()
        print("✅ SSH connection established")
        
        # Create base directory first
        base_path = SERVER_UPLOAD_PATH
        try:
            sftp.mkdir(base_path)
            print(f"✅ Created base directory: {base_path}")
        except Exception as e:
            print(f"ℹ️  Base directory already exists: {base_path}")
        
        # Create directories for each SOT
        for sot_type in SOT_TYPES:
            print(f"\n📁 Creating directories for {sot_type}...")
            
            # Create SOT-specific directory
            sot_path = f"{base_path}/{sot_type}"
            try:
                sftp.mkdir(sot_path)
                print(f"✅ Created SOT directory: {sot_path}")
            except Exception as e:
                print(f"ℹ️  SOT directory already exists: {sot_path}")
            
            # Create 3-stage directories
            stages = ["uploaded", "processing", "processed"]
            for stage in stages:
                stage_path = f"{sot_path}/{stage}"
                try:
                    sftp.mkdir(stage_path)
                    print(f"✅ Created {stage} directory: {stage_path}")
                except Exception as e:
                    print(f"ℹ️  {stage} directory already exists: {stage_path}")
        
        # Verify the structure
        print(f"\n🔍 Verifying directory structure...")
        for sot_type in SOT_TYPES:
            sot_path = f"{base_path}/{sot_type}"
            try:
                contents = sftp.listdir(sot_path)
                print(f"✅ {sot_type}: {contents}")
            except Exception as e:
                print(f"❌ Error listing {sot_type}: {e}")
        
        sftp.close()
        ssh.close()
        print("\n🎉 Directory structure creation completed!")
        
    except Exception as e:
        print(f"❌ Error creating directories: {e}")
        import traceback
        traceback.print_exc()

def test_directory_access():
    """Test access to all SOT directories"""
    print("\n🧪 Testing directory access...")
    
    try:
        # Create SSH client
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        # Connect to server
        ssh.connect(SERVER_HOST, username=SERVER_USERNAME, password=SERVER_PASSWORD, timeout=30)
        sftp = ssh.open_sftp()
        
        for sot_type in SOT_TYPES:
            sot_path = f"{SERVER_UPLOAD_PATH}/{sot_type}"
            stages = ["uploaded", "processing", "processed"]
            
            print(f"\n📂 Testing {sot_type}:")
            for stage in stages:
                stage_path = f"{sot_path}/{stage}"
                try:
                    contents = sftp.listdir(stage_path)
                    print(f"✅ {stage}: {len(contents)} files")
                except Exception as e:
                    print(f"❌ {stage}: {e}")
        
        sftp.close()
        ssh.close()
        print("\n✅ Directory access test completed!")
        
    except Exception as e:
        print(f"❌ Error testing directory access: {e}")

if __name__ == "__main__":
    create_sot_directories()
    test_directory_access() 