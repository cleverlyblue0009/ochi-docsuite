# Firebase Authentication Setup Guide

This guide will help you set up Firebase Authentication with Google Sign-In for the KMRL Document Management System.

## Prerequisites

- A Google/Firebase account
- Node.js 20+ installed
- PostgreSQL database running

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `kmrl-document-management`
4. Enable Google Analytics (optional)
5. Create the project

## Step 2: Enable Authentication

1. In your Firebase project, go to **Authentication**
2. Click **Get started**
3. Go to **Sign-in method** tab
4. Enable **Google** as a sign-in provider
5. Add your domain to authorized domains (e.g., `localhost`, your production domain)

## Step 3: Get Firebase Configuration

### For Backend (Service Account)

1. Go to **Project Settings** (gear icon)
2. Go to **Service accounts** tab
3. Click **Generate new private key**
4. Download the JSON file
5. Extract the following values for your `.env` file:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=key-id-from-json
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=client-id-from-json
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com
```

### For Frontend (Web App)

1. In **Project Settings**, go to **General** tab
2. Scroll down to **Your apps**
3. Click **Web app** icon (`</>`)
4. Register your app with a nickname
5. Copy the configuration values:

```env
FIREBASE_WEB_API_KEY=your-web-api-key
```

### Google OAuth Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to **APIs & Services** > **Credentials**
4. Find your OAuth 2.0 client ID
5. Copy the Client ID:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env`
2. Fill in all the Firebase and Google configuration values
3. Make sure your database is configured correctly

## Step 5: Run Database Migration

```bash
npm run migrate
```

## Step 6: Start the Server

```bash
npm run dev
```

## Frontend Integration

### Install Firebase SDK in Frontend

```bash
npm install firebase
```

### Initialize Firebase in Frontend

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "your-web-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
```

### Implement Google Sign-In

```javascript
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from './firebase-config';

const handleGoogleSignIn = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    
    // Send token to backend
    const response = await fetch('/api/auth/google-signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      // User signed in successfully
      console.log('User:', data.data.user);
    }
  } catch (error) {
    console.error('Sign-in error:', error);
  }
};
```

### Making Authenticated Requests

```javascript
import { auth } from './firebase-config';

const makeAuthenticatedRequest = async (url, options = {}) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  
  const idToken = await user.getIdToken();
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${idToken}`,
    },
  });
};
```

## API Endpoints

### Authentication Endpoints

- `GET /api/auth/config` - Get Firebase configuration for frontend
- `POST /api/auth/google-signin` - Google Sign-In
- `POST /api/auth/email-signup` - Email/Password Sign-Up (if enabled)
- `GET /api/auth/verify` - Verify authentication status
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/logout` - Logout current session
- `POST /api/auth/logout-all` - Logout from all devices

### Request/Response Examples

#### Google Sign-In

**Request:**
```json
POST /api/auth/google-signin
{
  "idToken": "firebase-id-token-here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "avatar_url": "https://...",
      "role": "user",
      "provider": "google",
      "created_at": "2023-..."
    },
    "session": {
      "expires_at": "2023-..."
    }
  },
  "message": "Google sign-in successful",
  "timestamp": "2023-..."
}
```

## Security Features

1. **Firebase ID Token Verification**: All tokens are verified server-side
2. **Session Cookies**: Secure HTTP-only cookies for web sessions
3. **Role-Based Access Control**: Admin, manager, and user roles
4. **Rate Limiting**: Protection against brute force attacks
5. **CORS Protection**: Restricted to allowed origins
6. **Session Management**: Track and revoke user sessions

## Testing

### Test Google Sign-In

1. Start the backend server: `npm run dev`
2. Use a tool like Postman or create a simple frontend
3. Get a Firebase ID token from your frontend
4. Send POST request to `/api/auth/google-signin`

### Test Protected Routes

1. Sign in to get a session cookie or ID token
2. Make requests to protected routes with `Authorization: Bearer <token>` header
3. Or rely on session cookies for web requests

## Troubleshooting

### Common Issues

1. **"Invalid token" errors**: Check that your Firebase service account key is correct
2. **CORS errors**: Make sure your frontend domain is in ALLOWED_ORIGINS
3. **Google sign-in fails**: Verify Google OAuth client ID and enable Google sign-in in Firebase
4. **Database errors**: Ensure PostgreSQL is running and migrations are applied

### Debug Mode

Set `LOG_LEVEL=debug` in your `.env` file for detailed logging.

## Production Deployment

1. Set `NODE_ENV=production`
2. Use secure session cookies (`secure: true`)
3. Set proper CORS origins
4. Use environment variables for all secrets
5. Enable Firebase App Check for additional security
6. Set up proper error monitoring

## Security Best Practices

1. Never expose service account keys in client-side code
2. Use HTTPS in production
3. Regularly rotate service account keys
4. Monitor authentication logs
5. Implement proper session timeout
6. Use Firebase Security Rules for additional protection