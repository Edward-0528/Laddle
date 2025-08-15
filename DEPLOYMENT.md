# Deployment Guide - $0 Monthly Cost

This guide shows how to deploy Laddle using only free tiers of hosting services.

## 🎯 Quick Deployment Overview

**Frontend (Client)**: Deploy to Vercel, Netlify, or GitHub Pages  
**Backend (Server)**: Deploy to Railway, Render, or Fly.io  
**Database**: Use Firebase Firestore (optional) or keep in-memory  

## 🚀 Frontend Deployment

### Option 1: Firebase Hosting (Recommended for Free Tier)

Firebase Hosting offers the best free tier for React apps with global CDN.

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Initialize Firebase in your project**:
   ```bash
   firebase init hosting
   ```
   - Public directory: `client/dist`
   - Single-page app: `Yes`
   - Overwrite index.html: `No`

3. **Build and deploy**:
   ```bash
   cd client && npm run build && cd ..
   firebase deploy --only hosting
   ```

4. **Set production environment**:
   Create `client/.env.production`:
   ```
   VITE_SOCKET_URL=https://your-server-app.onrender.com
   ```

**Firebase Free Limits:**
- ✅ 10GB storage
- ✅ 360MB/day transfer (great for small schools)
- ✅ Custom domain + SSL
- ✅ Global CDN

### Option 2: Vercel

1. **Deploy to Vercel**:
   ```bash
   cd client
   npm run build
   npx vercel --prod
   ```

2. **Add environment variables** in Vercel dashboard:
   ```
   VITE_SOCKET_URL=https://your-server-url.onrender.com
   ```

### Option 3: Netlify

1. **Build and deploy**:
   ```bash
   cd client
   npm run build
   npx netlify deploy --prod --dir=dist
   ```

## ⚡ Backend Deployment

### Option 1: Render (Best for WebSockets)

Render offers the most reliable free tier for Socket.IO servers.

1. **Prepare server for production**:
   ```bash
   cd server
   npm run build  # Test the build locally
   ```

2. **Create render.yaml** (already created):
   ```yaml
   services:
     - type: web
       name: laddle-server
       env: node
       buildCommand: cd server && npm install && npm run build
       startCommand: cd server && npm start
       envVars:
         - key: PORT
           value: 10000
         - key: CLIENT_ORIGIN
           value: https://your-app.web.app
   ```

3. **Deploy to Render**:
   - Go to https://render.com
   - Connect your GitHub repository
   - Select "Web Service"
   - Render will auto-deploy using render.yaml

4. **Configure environment variables**:
   - `PORT`: 10000
   - `CLIENT_ORIGIN`: https://your-firebase-app.web.app
   - `NODE_ENV`: production

**Render Free Limits:**
- ✅ 750 hours/month (enough for 24/7 if optimized)
- ✅ 512MB RAM (sufficient for quiz app)
- ✅ Sleeps after 15min idle (auto-wakes on request)
- ✅ Custom domains + SSL

### Option 2: Railway

1. **Deploy to Railway**:
   ```bash
   npm install -g @railway/cli
   railway login
   railway init
   railway up
   ```

2. **Set environment variables**:
   ```bash
   railway variables set PORT=3001
   railway variables set CLIENT_ORIGIN=https://your-client-url.web.app
   ```

### Option 3: Fly.io

1. **Deploy with Fly**:
   ```bash
   cd server
   fly launch
   fly deploy
   ```

## 🔥 Firebase Setup (Optional)

1. **Create Firebase project**: https://console.firebase.google.com

2. **Enable Firestore** with these rules:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /quizzes/{quizId} {
         allow read, write: if true; // Adjust for your security needs
       }
     }
   }
   ```

3. **Add config to client `.env.local`**:
   ```
   VITE_FIREBASE_API_KEY=your_key
   VITE_FIREBASE_AUTH_DOMAIN=project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123:web:abc123
   ```

## 📊 Free Tier Limits

### Vercel (Frontend)
- ✅ 100GB bandwidth/month
- ✅ Unlimited sites
- ✅ Automatic SSL
- ✅ Custom domains

### Railway (Backend)
- ✅ 500 execution hours/month
- ✅ 1GB RAM, 1 vCPU
- ✅ 1GB disk storage
- ⚠️ Sleeps after 15min idle

### Firebase (Database)
- ✅ 1GB storage
- ✅ 10GB/month bandwidth
- ✅ 20k writes/day
- ✅ 50k reads/day

## 🛠️ Production Optimizations

### 1. Enable CORS properly
In `server/src/index.ts`, update CORS for production:
```typescript
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://your-client-domain.vercel.app'
    ],
    methods: ['GET', 'POST']
  }
});
```

### 2. Add rate limiting
```bash
cd server
npm install express-rate-limit
```

### 3. Enable compression
```bash
cd server  
npm install compression
```

### 4. Add health monitoring
Use UptimeRobot (free) to ping your server every 5 minutes to prevent sleeping.

## 🔒 Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **CORS**: Restrict to your domain only
3. **Rate Limiting**: Prevent spam/abuse
4. **Input Validation**: Sanitize all user inputs
5. **Game Codes**: Consider using UUIDs for production

## 📈 Scaling Beyond Free Tiers

When you outgrow free tiers:
- **Frontend**: Vercel Pro ($20/month)
- **Backend**: Railway Pro ($5/month)
- **Database**: Firebase Blaze (pay-as-you-go)
- **CDN**: Cloudflare (free tier is generous)

## 🧪 Testing Production

1. **Test both servers locally**:
   ```bash
   npm run build
   npm start
   ```

2. **Test mobile responsiveness**
3. **Test with multiple players** (open multiple browser tabs)
4. **Verify WebSocket connections** in browser dev tools

Your quiz app is now ready for production with $0 monthly costs! 🎉
