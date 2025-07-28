#!/usr/bin/env python3
"""
Simple test script to check if file upload to server works
"""
import requests
import os
import tempfile

def create_test_file():
    """Create a simple test CSV file"""
    test_content = """email,name,department
test1@example.com,John Doe,IT
test2@example.com,Jane Smith,HR
test3@example.com,Bob Johnson,Finance"""
    
    # Create temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
        f.write(test_content)
        temp_file_path = f.name
    
    return temp_file_path

def test_upload():
    """Test file upload to the server"""
    print("=== File Upload Test ===\n")
    
    # Create test file
    print("1. Creating test file...")
    test_file_path = create_test_file()
    print(f"   ✓ Test file created: {test_file_path}")
    
    try:
        # Prepare the upload
        print("\n2. Preparing upload...")
        with open(test_file_path, 'rb') as f:
            files = {'file': ('test_internal_users.csv', f, 'text/csv')}
            data = {'sot_type': 'internal_users'}
            
            print("   ✓ File prepared for upload")
            print("   ✓ SOT type: internal_users")
            
            # Make the upload request
            print("\n3. Uploading file to server...")
            response = requests.post(
                'http://127.0.0.1:8000/sot/upload',
                files=files,
                data=data
            )
            
            print(f"   ✓ Response status: {response.status_code}")
            
            # Check response
            if response.status_code == 200:
                result = response.json()
                print("\n4. Upload Results:")
                print(f"   ✓ Status: {result.get('status', 'unknown')}")
                print(f"   ✓ File: {result.get('doc_name', 'unknown')}")
                print(f"   ✓ SOT Type: {result.get('sot_type', 'unknown')}")
                print(f"   ✓ Uploaded by: {result.get('uploaded_by', 'unknown')}")
                print(f"   ✓ Timestamp: {result.get('timestamp', 'unknown')}")
                
                # Check for errors
                if 'error' in result:
                    print(f"   ⚠ Error: {result['error']}")
                    if 'Remote upload failed' in result['error']:
                        print("   → File was saved locally due to server connection issues")
                    else:
                        print("   → Database processing error")
                else:
                    print("   ✓ No errors reported")
                
                # Check remote file path
                remote_path = result.get('remote_file_path', '')
                if remote_path.startswith('LOCAL_FALLBACK:'):
                    print(f"   → File saved locally: {remote_path.replace('LOCAL_FALLBACK:', '')}")
                else:
                    print(f"   → File uploaded to server: {remote_path}")
                
                print("\n=== Test Summary ===")
                if 'error' in result and 'Remote upload failed' in result['error']:
                    print("❌ Server upload failed - file saved locally")
                    print("   The database insertion worked, but the file couldn't be uploaded to the remote server.")
                    print("   This means your data is processed but not stored on Terminus.")
                elif 'error' in result:
                    print("❌ Upload failed with error")
                    print(f"   Error: {result['error']}")
                else:
                    print("✅ Upload successful!")
                    print("   File uploaded to server and database insertion completed.")
                
            else:
                print(f"\n❌ Upload failed with status code: {response.status_code}")
                print(f"Response: {response.text}")
                
    except requests.exceptions.ConnectionError:
        print("\n❌ Connection Error")
        print("   Could not connect to the server at http://127.0.0.1:8000")
        print("   Make sure the FastAPI server is running.")
        
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        
    finally:
        # Clean up test file
        try:
            os.unlink(test_file_path)
            print(f"\n✓ Test file cleaned up: {test_file_path}")
        except:
            pass

if __name__ == "__main__":
    test_upload() 