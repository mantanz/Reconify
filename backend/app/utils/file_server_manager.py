import os
import logging
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List
import paramiko
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class FileServerManager:
    """
    Manages 3-stage file upload process using only doc_id for file naming.
    Supports Local, SSH/SFTP and AWS S3 servers.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.server_type = os.getenv("FILE_SERVER_TYPE", "ssh").lower()
        self._initialized = False
        self._ssh_client = None
        self._sftp_client = None
        self._s3_client = None
        self._bucket_name = None
        self._base_path = None
        
        # Don't initialize connection immediately - use lazy initialization
        self.logger.info(f"📁 FileServerManager initialized for {self.server_type} server type")
    
    def test_connection(self) -> bool:
        """Test if the connection is working"""
        try:
            self._ensure_initialized()
            if not self._initialized:
                self.logger.error("❌ Connection not initialized")
                return False
            
            if self.server_type == "local":
                # Test by checking if the base directory exists and is writable
                try:
                    if not os.path.exists(self._base_path):
                        os.makedirs(self._base_path, exist_ok=True)
                    # Test write access by creating a temporary file
                    test_file = os.path.join(self._base_path, ".test_write_access")
                    with open(test_file, 'w') as f:
                        f.write("test")
                    os.remove(test_file)
                    self.logger.info(f"✅ Connection test successful - can access {self._base_path}")
                    return True
                except Exception as e:
                    self.logger.error(f"❌ Connection test failed: {str(e)}")
                    return False
            elif self.server_type == "ssh":
                # Test by trying to list the base directory
                try:
                    self._sftp_client.listdir(self._base_path)
                    self.logger.info(f"✅ Connection test successful - can access {self._base_path}")
                    return True
                except Exception as e:
                    self.logger.error(f"❌ Connection test failed: {str(e)}")
                    return False
            elif self.server_type == "s3":
                # Test by trying to list objects in the bucket
                try:
                    self.s3_client.list_objects_v2(Bucket=self._bucket_name, MaxKeys=1)
                    self.logger.info(f"✅ Connection test successful - can access S3 bucket {self._bucket_name}")
                    return True
                except Exception as e:
                    self.logger.error(f"❌ Connection test failed: {str(e)}")
                    return False
            
            return False
        except Exception as e:
            self.logger.error(f"❌ Connection test failed: {str(e)}")
            return False
    
    def _ensure_initialized(self):
        """Ensure the connection is initialized before use"""
        if not self._initialized:
            self._initialize_connection()
            # If still not initialized after ensure_initialized, try force reconnect
            if not self._initialized:
                self.logger.warning("⚠️ First initialization failed, trying force reconnect...")
                self.force_reconnect()
    
    def force_reconnect(self):
        """Force reconnection by resetting the connection state"""
        self.logger.info("🔄 Forcing reconnection...")
        self._initialized = False
        if hasattr(self, '_ssh_client') and self._ssh_client:
            try:
                self._ssh_client.close()
            except:
                pass
            self._ssh_client = None
        
        if hasattr(self, '_sftp_client') and self._sftp_client:
            try:
                self._sftp_client.close()
            except:
                pass
            self._sftp_client = None
        
        if hasattr(self, '_s3_client'):
            self._s3_client = None
        
        # Try to initialize again
        self._initialize_connection()
    
    def _initialize_connection(self):
        """Initialize the connection based on server type"""
        try:
            if self.server_type == "local":
                self._init_local_connection()
            elif self.server_type == "ssh":
                self._init_ssh_connection()
            elif self.server_type == "s3":
                self._init_s3_client()
            else:
                self.logger.error(f"❌ Unsupported server type: {self.server_type}")
                self._initialized = False
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize connection: {str(e)}")
            self._initialized = False
    
    def _init_local_connection(self):
        """Initialize local file system connection"""
        try:
            # Get base path from environment or use default
            self._base_path = os.getenv("FILE_SERVER_BASE_PATH", "/tmp/reconify_uploads")
            
            # Create base directory if it doesn't exist
            if not os.path.exists(self._base_path):
                os.makedirs(self._base_path, exist_ok=True)
                self.logger.info(f"📁 Created local base directory: {self._base_path}")
            
            # Test write access
            test_file = os.path.join(self._base_path, ".test_write_access")
            with open(test_file, 'w') as f:
                f.write("test")
            os.remove(test_file)
            
            self._initialized = True
            self.logger.info(f"✅ Local connection established successfully - base path: {self._base_path}")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize local connection: {str(e)}")
            self._initialized = False
            raise
    
    def _init_ssh_connection(self):
        """Initialize SSH/SFTP connection"""
        try:
            self.logger.info(f"🔧 Initializing SSH connection...")
            self._ssh_client = paramiko.SSHClient()
            self._ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # SSH connection parameters
            host = os.getenv("FILE_SERVER_HOST")
            port = int(os.getenv("FILE_SERVER_PORT", "22"))
            username = os.getenv("FILE_SERVER_USERNAME")
            password = os.getenv("FILE_SERVER_PASSWORD")
            ssh_key_path = os.getenv("FILE_SERVER_SSH_KEY")
            timeout = int(os.getenv("FILE_SERVER_TIMEOUT", "30"))
            
            self.logger.info(f"🔧 SSH Config: {host}:{port}, user: {username}")
            
            if not all([host, username]):
                raise ValueError("Missing required SSH configuration: FILE_SERVER_HOST and FILE_SERVER_USERNAME")
            
            # Connect using SSH key if provided, otherwise password
            if ssh_key_path and os.path.exists(ssh_key_path):
                self.logger.info(f"🔧 Connecting with SSH key: {ssh_key_path}")
                self._ssh_client.connect(
                    hostname=host,
                    port=port,
                    username=username,
                    key_filename=ssh_key_path,
                    timeout=timeout
                )
                self.logger.info(f"✅ SSH connection established using key: {host}:{port}")
            elif password:
                self.logger.info(f"🔧 Connecting with password")
                self._ssh_client.connect(
                    hostname=host,
                    port=port,
                    username=username,
                    password=password,
                    timeout=timeout
                )
                self.logger.info(f"✅ SSH connection established using password: {host}:{port}")
            else:
                raise ValueError("Either FILE_SERVER_SSH_KEY or FILE_SERVER_PASSWORD must be provided")
            
            # Initialize SFTP client
            self.logger.info(f"🔧 Initializing SFTP client...")
            self._sftp_client = self._ssh_client.open_sftp()
            self._base_path = os.getenv("FILE_SERVER_BASE_PATH", "/data/uploads")
            
            # Debug: Check SFTP working directory
            try:
                current_dir = self._sftp_client.getcwd()
                self.logger.info(f"🔧 SFTP working directory: {current_dir}")
            except Exception as e:
                self.logger.warning(f"⚠️ Could not get SFTP working directory: {str(e)}")
            
            # Test the connection by trying to list the base directory
            try:
                self._sftp_client.listdir(self._base_path)
                self.logger.info(f"✅ Successfully accessed base path: {self._base_path}")
            except Exception as e:
                self.logger.warning(f"⚠️ Could not access base path {self._base_path}: {str(e)}")
                # Don't fail here, just warn
            
            self._initialized = True
            self.logger.info(f"✅ SSH connection initialized successfully")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize SSH connection: {str(e)}")
            self._initialized = False
            raise
    
    def _init_s3_client(self):
        """Initialize AWS S3 client"""
        try:
            # S3 configuration
            aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
            aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
            aws_region = os.getenv("AWS_REGION", "us-east-1")
            self._bucket_name = os.getenv("S3_BUCKET_NAME")
            
            if not all([aws_access_key, aws_secret_key, self._bucket_name]):
                raise ValueError("Missing required S3 configuration: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME")
            
            # Initialize S3 client
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
                region_name=aws_region
            )
            
            # Test connection
            self.s3_client.head_bucket(Bucket=self._bucket_name)
            self.logger.info(f"✅ S3 connection established: {self._bucket_name} in {aws_region}")
            
            self._initialized = True
            self.logger.info(f"✅ S3 connection initialized successfully")
            
        except NoCredentialsError:
            self.logger.error("❌ AWS credentials not found")
            self._initialized = False
            raise
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                self.logger.error(f"❌ S3 bucket not found: {self._bucket_name}")
            else:
                self.logger.error(f"❌ S3 connection failed: {str(e)}")
            self._initialized = False
            raise
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize S3 client: {str(e)}")
            self._initialized = False
            raise
    
    def _ensure_directories(self, upload_type: str, entity_name: str) -> bool:
        """Create necessary directories for upload, processing, and processed stages"""
        try:
            self.logger.info(f"🔧 Ensuring directories for {upload_type}/{entity_name}")
            self._ensure_initialized()
            
            # If still not initialized after ensure_initialized, try force reconnect
            if not self._initialized:
                self.logger.warning("⚠️ Connection not initialized, trying force reconnect")
                self.force_reconnect()
                if not self._initialized:
                    self.logger.error("❌ Failed to initialize connection after force reconnect")
                    return False
            
            self.logger.info(f"✅ Connection initialized: {self._initialized}")
            stages = ["upload", "processing", "processed"]
            
            if self.server_type == "local":
                self.logger.info(f"🔧 Using local server type")
                for stage in stages:
                    dir_path = os.path.join(self._base_path, upload_type, entity_name, stage)
                    self.logger.info(f"🔧 Checking directory: {dir_path}")
                    if not os.path.exists(dir_path):
                        self.logger.info(f"📁 Directory not found, creating: {dir_path}")
                        os.makedirs(dir_path, exist_ok=True)
                        self.logger.info(f"✅ Created local directory: {dir_path}")
                    else:
                        self.logger.info(f"✅ Directory exists: {dir_path}")
                        
            elif self.server_type == "ssh":
                self.logger.info(f"🔧 Using SSH server type")
                for stage in stages:
                    dir_path = f"{self._base_path}/{upload_type}/{entity_name}/{stage}"
                    self.logger.info(f"🔧 Checking directory: {dir_path}")
                    try:
                        self._sftp_client.stat(dir_path)
                        self.logger.info(f"✅ Directory exists: {dir_path}")
                    except FileNotFoundError:
                        self.logger.info(f"📁 Directory not found, creating: {dir_path}")
                        # Create directory recursively
                        self._create_ssh_directory_recursive(dir_path)
                        self.logger.info(f"✅ Created SSH directory: {dir_path}")
                        
            elif self.server_type == "s3":
                self.logger.info(f"🔧 Using S3 server type")
                # S3 doesn't need explicit directory creation, but we can create empty objects as markers
                for stage in stages:
                    marker_key = f"{upload_type}/{entity_name}/{stage}/.keep"
                    try:
                        self.s3_client.put_object(
                            Bucket=self._bucket_name,
                            Key=marker_key,
                            Body=""
                        )
                    except Exception as e:
                        self.logger.warning(f"⚠️ Could not create S3 directory marker: {str(e)}")
            
            self.logger.info(f"✅ All directories ensured successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to ensure directories: {str(e)}")
            return False
    
    def _create_ssh_directory_recursive(self, dir_path: str):
        """Create SSH directory recursively"""
        try:
            self.logger.info(f"🔧 Creating directory recursively: {dir_path}")
            
            # Check if SFTP client is available
            if not self._sftp_client:
                self.logger.error("❌ SFTP client is not initialized")
                raise Exception("SFTP client not initialized")
            
            # Ensure we're using absolute path
            if not dir_path.startswith('/'):
                dir_path = '/' + dir_path
            self.logger.info(f"🔧 Using absolute path: {dir_path}")
            
            # Split path and create each level
            path_parts = dir_path.strip('/').split('/')
            current_path = ""
            
            for part in path_parts:
                current_path += f"/{part}" if current_path else f"/{part}"
                self.logger.info(f"🔧 Checking path: {current_path}")
                try:
                    self._sftp_client.stat(current_path)
                    self.logger.info(f"✅ Path exists: {current_path}")
                except FileNotFoundError:
                    self.logger.info(f"📁 Creating directory: {current_path}")
                    try:
                        self._sftp_client.mkdir(current_path)
                        self.logger.info(f"✅ Created directory: {current_path}")
                    except Exception as mkdir_error:
                        self.logger.error(f"❌ Failed to create directory {current_path}: {str(mkdir_error)}")
                        raise
                    
        except Exception as e:
            self.logger.error(f"❌ Failed to create SSH directory recursively: {str(e)}")
            raise
    
    def get_file_path(self, upload_type: str, entity_name: str, stage: str, doc_id: str, original_filename: str) -> str:
        """Construct the full path for a file at a given stage using doc_id + original extension"""
        file_extension = Path(original_filename).suffix
        filename = f"{doc_id}{file_extension}"
        
        if self.server_type == "local":
            return os.path.join(self._base_path, upload_type, entity_name, stage, filename)
        else:
            return f"{self._base_path}/{upload_type}/{entity_name}/{stage}/{filename}"
    
    def save_uploaded_file(self, file_content: bytes, original_filename: str, upload_type: str, entity_name: str, doc_id: str) -> Dict[str, Any]:
        """Stage 1: Save uploaded file using doc_id as filename"""
        try:
            self.logger.info(f"🔧 Starting save_uploaded_file for {upload_type}/{entity_name}")
            self._ensure_initialized()
            self.logger.info(f"✅ Initialization complete")
            
            # Ensure directories exist
            self.logger.info(f"🔧 Ensuring directories...")
            if not self._ensure_directories(upload_type, entity_name):
                self.logger.error(f"❌ Failed to ensure directories")
                raise Exception("Failed to create necessary directories")
            self.logger.info(f"✅ Directories ensured")
            
            # Generate filename using doc_id + original extension
            file_extension = Path(original_filename).suffix
            filename = f"{doc_id}{file_extension}"
            self.logger.info(f"🔧 Generated filename: {filename}")
            
            if self.server_type == "local":
                file_path = self.get_file_path(upload_type, entity_name, "upload", doc_id, original_filename)
                self.logger.info(f"🔧 Local file path: {file_path}")
                with open(file_path, 'wb') as f:
                    f.write(file_content)
                    
            elif self.server_type == "ssh":
                file_path = self.get_file_path(upload_type, entity_name, "upload", doc_id, original_filename)
                self.logger.info(f"🔧 SSH file path: {file_path}")
                with self._sftp_client.file(file_path, 'wb') as f:
                    f.write(file_content)
                    
            elif self.server_type == "s3":
                file_path = f"{upload_type}/{entity_name}/upload/{filename}"
                self.s3_client.put_object(
                    Bucket=self._bucket_name,
                    Key=file_path,
                    Body=file_content
                )
            
            self.logger.info(f"✅ Stage 1: File saved to {upload_type}/{entity_name}/upload: {filename} (doc_id: {doc_id})")
            
            return {
                "doc_id": doc_id,
                "original_filename": original_filename,
                "file_path": file_path,
                "upload_type": upload_type,
                "entity_name": entity_name,
                "stage": "upload",
                "timestamp": datetime.now().isoformat(),
                "size": len(file_content),
                "server_type": self.server_type
            }
            
        except Exception as e:
            self.logger.error(f"❌ Error in save_uploaded_file: {str(e)}")
            self.logger.error(f"❌ Stage 1: Error saving uploaded file: {str(e)}")
            raise
    
    def start_processing(self, doc_id: str, original_filename: str, upload_type: str, entity_name: str) -> bool:
        """Stage 2: Move file to processing stage"""
        try:
            self._ensure_initialized()
            
            file_extension = Path(original_filename).suffix
            filename = f"{doc_id}{file_extension}"
            
            if self.server_type == "local":
                source_path = self.get_file_path(upload_type, entity_name, "upload", doc_id, original_filename)
                dest_path = self.get_file_path(upload_type, entity_name, "processing", doc_id, original_filename)
                shutil.move(source_path, dest_path)
                
            elif self.server_type == "ssh":
                source_path = self.get_file_path(upload_type, entity_name, "upload", doc_id, original_filename)
                dest_path = self.get_file_path(upload_type, entity_name, "processing", doc_id, original_filename)
                self._sftp_client.rename(source_path, dest_path)
                
            elif self.server_type == "s3":
                source_key = f"{upload_type}/{entity_name}/upload/{filename}"
                dest_key = f"{upload_type}/{entity_name}/processing/{filename}"
                self.s3_client.copy_object(
                    Bucket=self._bucket_name,
                    CopySource={'Bucket': self._bucket_name, 'Key': source_key},
                    Key=dest_key
                )
                self.s3_client.delete_object(Bucket=self._bucket_name, Key=source_key)
            
            self.logger.info(f"✅ Stage 2: File moved to {upload_type}/{entity_name}/processing: {filename} (doc_id: {doc_id})")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Stage 2: Error moving file to processing: {str(e)}")
            return False
    
    def complete_processing(self, doc_id: str, original_filename: str, upload_type: str, entity_name: str) -> bool:
        """Stage 3: Move file to processed stage"""
        try:
            self._ensure_initialized()
            
            file_extension = Path(original_filename).suffix
            filename = f"{doc_id}{file_extension}"
            
            if self.server_type == "local":
                source_path = self.get_file_path(upload_type, entity_name, "processing", doc_id, original_filename)
                dest_path = self.get_file_path(upload_type, entity_name, "processed", doc_id, original_filename)
                shutil.move(source_path, dest_path)
                
            elif self.server_type == "ssh":
                source_path = self.get_file_path(upload_type, entity_name, "processing", doc_id, original_filename)
                dest_path = self.get_file_path(upload_type, entity_name, "processed", doc_id, original_filename)
                self._sftp_client.rename(source_path, dest_path)
                
            elif self.server_type == "s3":
                source_key = f"{upload_type}/{entity_name}/processing/{filename}"
                dest_key = f"{upload_type}/{entity_name}/processed/{filename}"
                self.s3_client.copy_object(
                    Bucket=self._bucket_name,
                    CopySource={'Bucket': self._bucket_name, 'Key': source_key},
                    Key=dest_key
                )
                self.s3_client.delete_object(Bucket=self._bucket_name, Key=source_key)
            
            self.logger.info(f"✅ Stage 3: File moved to {upload_type}/{entity_name}/processed: {filename} (doc_id: {doc_id})")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Stage 3: Error moving file to processed: {str(e)}")
            return False
    
    def get_file_content(self, doc_id: str, original_filename: str, upload_type: str, entity_name: str, stage: str) -> Optional[bytes]:
        """Read file content from a specified stage"""
        try:
            self._ensure_initialized()
            
            file_extension = Path(original_filename).suffix
            filename = f"{doc_id}{file_extension}"
            
            if self.server_type == "local":
                file_path = self.get_file_path(upload_type, entity_name, stage, doc_id, original_filename)
                with open(file_path, 'rb') as f:
                    return f.read()
                    
            elif self.server_type == "ssh":
                file_path = self.get_file_path(upload_type, entity_name, stage, doc_id, original_filename)
                with self._sftp_client.file(file_path, 'rb') as f:
                    return f.read()
                    
            elif self.server_type == "s3":
                file_key = f"{upload_type}/{entity_name}/{stage}/{filename}"
                response = self.s3_client.get_object(Bucket=self._bucket_name, Key=file_key)
                return response['Body'].read()
            
        except Exception as e:
            self.logger.error(f"❌ Error reading file content: {str(e)}")
            return None
    
    def cleanup_failed_upload(self, doc_id: str, original_filename: str, upload_type: str, entity_name: str, stage: str) -> bool:
        """Delete a file from a specified stage in case of failure"""
        try:
            self._ensure_initialized()
            
            file_extension = Path(original_filename).suffix
            filename = f"{doc_id}{file_extension}"
            
            if self.server_type == "local":
                file_path = self.get_file_path(upload_type, entity_name, stage, doc_id, original_filename)
                if os.path.exists(file_path):
                    os.remove(file_path)
                
            elif self.server_type == "ssh":
                file_path = self.get_file_path(upload_type, entity_name, stage, doc_id, original_filename)
                self._sftp_client.remove(file_path)
                
            elif self.server_type == "s3":
                file_key = f"{upload_type}/{entity_name}/{stage}/{filename}"
                self.s3_client.delete_object(Bucket=self._bucket_name, Key=file_key)
            
            self.logger.info(f"🧹 Cleaned up failed upload: {filename} from {stage} stage (doc_id: {doc_id})")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error cleaning up failed upload: {str(e)}")
            return False
    
    def list_files_by_entity(self, upload_type: str, entity_name: str, stage: str) -> List[Dict[str, Any]]:
        """List files for a given entity and stage"""
        try:
            self._ensure_initialized()
            
            files = []
            
            if self.server_type == "local":
                dir_path = os.path.join(self._base_path, upload_type, entity_name, stage)
                try:
                    if os.path.exists(dir_path):
                        for filename in os.listdir(dir_path):
                            if not filename.startswith('.'):  # Skip hidden files
                                file_path = os.path.join(dir_path, filename)
                                if os.path.isfile(file_path):
                                    stat = os.stat(file_path)
                                    files.append({
                                        "filename": filename,
                                        "size": stat.st_size,
                                        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
                                    })
                    else:
                        self.logger.warning(f"⚠️ Directory not found: {dir_path}")
                except Exception as e:
                    self.logger.warning(f"⚠️ Error accessing local directory {dir_path}: {str(e)}")
                        
            elif self.server_type == "ssh":
                dir_path = f"{self._base_path}/{upload_type}/{entity_name}/{stage}"
                try:
                    file_list = self._sftp_client.listdir_attr(dir_path)
                    for file_attr in file_list:
                        if not file_attr.filename.startswith('.'):  # Skip hidden files
                            files.append({
                                "filename": file_attr.filename,
                                "size": file_attr.st_size,
                                "modified": datetime.fromtimestamp(file_attr.st_mtime).isoformat()
                            })
                except FileNotFoundError:
                    self.logger.warning(f"⚠️ Directory not found: {dir_path}")
                    
            elif self.server_type == "s3":
                prefix = f"{upload_type}/{entity_name}/{stage}/"
                response = self.s3_client.list_objects_v2(
                    Bucket=self._bucket_name,
                    Prefix=prefix,
                    Delimiter='/'
                )
                
                if 'Contents' in response:
                    for obj in response['Contents']:
                        filename = obj['Key'].replace(prefix, '')
                        if filename and not filename.startswith('.'):  # Skip directory markers
                            files.append({
                                "filename": filename,
                                "size": obj['Size'],
                                "modified": obj['LastModified'].isoformat()
                            })
            
            return files
            
        except Exception as e:
            self.logger.error(f"❌ Error listing files: {str(e)}")
            return []
    
    def __del__(self):
        """Cleanup SSH/SFTP connections"""
        if hasattr(self, '_sftp_client') and self._sftp_client:
            try:
                self._sftp_client.close()
            except:
                pass
        
        if hasattr(self, '_ssh_client') and self._ssh_client:
            try:
                self._ssh_client.close()
            except:
                pass

# Global instance for easy import
file_server_manager = FileServerManager() 