# Google SSO Authentication Setup Guide

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Google OAuth

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create/Select Project**: Create a new project or select existing one
3. **Enable APIs**: Enable Google+ API and Google OAuth2 API
4. **Create OAuth Credentials**:
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Authorized redirect URIs: `http://localhost:8000/auth/google/callback`
   - Copy the Client ID and Client Secret

### 3. Create Environment File
Create a `.env` file in the `backend` directory:
```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# JWT Configuration
SECRET_KEY=your-super-secret-jwt-key-here-make-it-long-and-random
```

### 4. Start the Application
```bash
# Backend
cd backend
python main.py

# Frontend (in another terminal)
cd frontend_test
npm start
```

## 🔧 How It Works

### Authentication Flow
1. **User clicks "Login with Google"** → Redirects to Google OAuth
2. **Google authenticates user** → Returns authorization code
3. **Backend exchanges code for tokens** → Gets user info from Google
4. **Backend creates JWT token** → Redirects to frontend with token
5. **Frontend stores token** → User is now authenticated
6. **Protected routes check token** → User can access the application

### Protected Routes
- All existing functionality remains unchanged
- Authentication is added as a wrapper
- Users must login before accessing any features
- User profile shows in navbar with logout option

## 🛡️ Security Features

- **JWT Tokens**: Secure, stateless authentication
- **HTTPS Ready**: Configured for production use
- **Session Management**: Secure session handling
- **Token Expiration**: Automatic token refresh
- **CORS Protection**: Cross-origin request security

## 🔄 Integration Points

### Backend Changes
- ✅ Added authentication middleware
- ✅ Added OAuth routes (`/auth/login/google`, `/auth/google/callback`)
- ✅ Added user verification endpoint (`/auth/me`)
- ✅ No changes to existing API endpoints

### Frontend Changes
- ✅ Added authentication context
- ✅ Added login page
- ✅ Added user profile in navbar
- ✅ Added logout functionality
- ✅ Protected all routes with authentication

## 🎯 User Experience

1. **First Visit**: User sees login page
2. **Login**: Click "Login with Google" → Google OAuth flow
3. **Success**: Redirected to main application
4. **Navigation**: User profile visible in navbar
5. **Logout**: Click logout to sign out

## 🚨 Troubleshooting

### Common Issues
1. **"Invalid redirect URI"**: Check Google OAuth settings
2. **"Client ID not found"**: Verify .env file configuration
3. **"CORS errors"**: Check backend CORS settings
4. **"Token expired"**: Automatic refresh should handle this

### Debug Steps
1. Check browser console for errors
2. Check backend logs for authentication issues
3. Verify Google OAuth credentials
4. Ensure .env file is properly configured

## 📝 Notes

- **No existing functionality modified**: All current features work exactly the same
- **Authentication is additive**: Added on top of existing codebase
- **Production ready**: Configure HTTPS and proper domain settings
- **Scalable**: Easy to add more OAuth providers or custom authentication 