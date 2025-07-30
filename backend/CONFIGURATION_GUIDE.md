# File Server Configuration Guide

## 📁 **Configuration Location**

Your credentials are configured in: `backend/.env`

## 🔧 **Configuration Options**

### **Option 1: SSH/SFTP (Recommended for Development)**

Edit your `.env` file and update these values:

```env
# File Server Type
FILE_SERVER_TYPE=ssh

# SSH/SFTP Configuration
FILE_SERVER_HOST=your-ssh-server.com          # Replace with your server hostname/IP
FILE_SERVER_PORT=22                           # SSH port (usually 22)
FILE_SERVER_USERNAME=your-username            # Replace with your SSH username
FILE_SERVER_PASSWORD=your-password            # Replace with your SSH password
FILE_SERVER_SSH_KEY=/path/to/your/private/key # Optional: Path to SSH private key
FILE_SERVER_BASE_PATH=/data/uploads           # Base path on server for uploads
FILE_SERVER_TIMEOUT=30                        # Connection timeout in seconds
```

**Example SSH Configuration:**
```env
FILE_SERVER_TYPE=ssh
FILE_SERVER_HOST=192.168.1.100
FILE_SERVER_PORT=22
FILE_SERVER_USERNAME=ubuntu
FILE_SERVER_PASSWORD=mypassword123
FILE_SERVER_BASE_PATH=/home/ubuntu/uploads
FILE_SERVER_TIMEOUT=30
```

### **Option 2: AWS S3 (Recommended for Production)**

Edit your `.env` file and update these values:

```env
# File Server Type
FILE_SERVER_TYPE=s3

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key        # Replace with your AWS access key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key    # Replace with your AWS secret key
AWS_REGION=us-east-1                         # AWS region (e.g., us-east-1, eu-west-1)
S3_BUCKET_NAME=your-s3-bucket-name           # Replace with your S3 bucket name
```

**Example S3 Configuration:**
```env
FILE_SERVER_TYPE=s3
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
S3_BUCKET_NAME=my-reconify-uploads
```

## 🚀 **Quick Setup Steps**

### **For SSH/SFTP:**

1. **Set up SSH server** (if you don't have one):
   ```bash
   # On Ubuntu/Debian
   sudo apt update
   sudo apt install openssh-server
   sudo systemctl start ssh
   sudo systemctl enable ssh
   ```

2. **Create upload directory** on your SSH server:
   ```bash
   mkdir -p /data/uploads
   chmod 755 /data/uploads
   ```

3. **Update .env file** with your SSH credentials

### **For AWS S3:**

1. **Create S3 bucket** in AWS Console
2. **Create IAM user** with S3 permissions
3. **Generate access keys** for the IAM user
4. **Update .env file** with your AWS credentials

## 🔒 **Security Best Practices**

### **SSH/SFTP:**
- Use SSH keys instead of passwords when possible
- Restrict SSH access to specific IP addresses
- Use a dedicated user account for file uploads
- Set appropriate file permissions

### **AWS S3:**
- Use IAM roles instead of access keys when possible
- Grant minimal required permissions
- Enable S3 bucket encryption
- Set up bucket policies for access control

## 🧪 **Testing Configuration**

After configuring credentials, test the setup:

```bash
cd backend
python3 test_3stage_upload_mock.py
```

## 📋 **Current Configuration Status**

Your `.env` file now contains template values. You need to replace:

- `your-ssh-server.com` → Your actual SSH server hostname/IP
- `your-username` → Your SSH username
- `your-password` → Your SSH password
- `your-aws-access-key` → Your AWS access key
- `your-aws-secret-key` → Your AWS secret key
- `your-s3-bucket-name` → Your S3 bucket name

## ⚠️ **Important Notes**

1. **Never commit credentials** to version control
2. **Use environment variables** in production
3. **Rotate credentials** regularly
4. **Monitor access logs** for security
5. **Backup configuration** securely

## 🆘 **Troubleshooting**

### **SSH Connection Issues:**
- Check if SSH server is running
- Verify hostname/IP is correct
- Test SSH connection manually
- Check firewall settings

### **S3 Connection Issues:**
- Verify AWS credentials are correct
- Check S3 bucket exists and is accessible
- Ensure IAM permissions are sufficient
- Verify AWS region is correct 