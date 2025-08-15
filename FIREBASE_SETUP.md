# Firebase Hosting Setup for Laddle Client

## Step 1: Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

## Step 2: Initialize Firebase in your project
```bash
cd client
firebase init hosting
```

**Configuration options:**
- Public directory: `dist`
- Single-page app: `Yes`
- Overwrite index.html: `No`

## Step 3: Create firebase.json
```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

## Step 4: Build and Deploy
```bash
# Build the React app
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

## Step 5: Set Environment Variables
Create `.env.production` in client folder:
```
VITE_SOCKET_URL=https://your-server-app.onrender.com
```

## Firebase Hosting Free Limits:
- ✅ 10GB storage
- ✅ 360MB/day transfer
- ✅ Custom domain support
- ✅ SSL certificates
- ✅ Global CDN
