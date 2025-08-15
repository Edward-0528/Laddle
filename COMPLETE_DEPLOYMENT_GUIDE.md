# 🎯 Complete Free Deployment Guide

Deploy your Laddle quiz app for **$0/month** using Firebase + Render.

## 📋 Prerequisites

1. **GitHub account** (for code hosting)
2. **Firebase account** (Google account)
3. **Render account** (free signup)

## 🚀 Step-by-Step Deployment

### Phase 1: Prepare Your Code

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial Laddle quiz app"
   git branch -M main
   git remote add origin https://github.com/yourusername/laddle.git
   git push -u origin main
   ```

### Phase 2: Deploy Backend (Render)

1. **Go to https://render.com** and sign up
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repo**
4. **Configure the service**:
   - **Name**: `laddle-server`
   - **Build Command**: `cd server && npm install && npm run build`
   - **Start Command**: `cd server && npm start`
   - **Environment Variables**:
     - `PORT`: `10000`
     - `NODE_ENV`: `production`
     - `CLIENT_ORIGIN`: (leave empty for now)

5. **Deploy** - This will give you a URL like: `https://laddle-server-xyz.onrender.com`

### Phase 3: Deploy Frontend (Firebase)

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Initialize Firebase**:
   ```bash
   firebase init hosting
   ```
   - Select: "Use an existing project" or "Create a new project"
   - Public directory: `client/dist`
   - Single-page app: `Yes`
   - Overwrite index.html: `No`

3. **Set production environment**:
   ```bash
   # Create client/.env.production
   echo "VITE_SOCKET_URL=https://laddle-server-xyz.onrender.com" > client/.env.production
   ```

4. **Build and deploy**:
   ```bash
   cd client
   npm run build
   cd ..
   firebase deploy --only hosting
   ```

5. **Get your URL**: Firebase will give you URLs like:
   - `https://your-project.web.app`
   - `https://your-project.firebaseapp.com`

### Phase 4: Connect Frontend and Backend

1. **Update Render environment variables**:
   - Go back to your Render dashboard
   - Add `CLIENT_ORIGIN`: `https://your-project.web.app`
   - Redeploy the service

2. **Test the connection**:
   - Visit your Firebase URL
   - Create a quiz and test the complete flow

## 🎉 You're Live!

Your quiz app is now running on:
- **Frontend**: https://your-project.web.app (Firebase)
- **Backend**: https://laddle-server-xyz.onrender.com (Render)

## 📊 Free Tier Usage

- **Firebase Hosting**: 10GB storage, 360MB/day transfer
- **Render**: 750 hours/month, sleeps after 15min idle
- **Total Cost**: $0/month

## 🔧 Monitoring & Maintenance

1. **Keep server awake** (optional):
   - Use UptimeRobot (free) to ping your server every 5 minutes
   - URL to ping: `https://laddle-server-xyz.onrender.com/ping`

2. **Monitor usage**:
   - Firebase Console: Check hosting usage
   - Render Dashboard: Monitor server uptime

3. **Updates**:
   - Push to GitHub → Render auto-deploys backend
   - Run `firebase deploy` → Updates frontend

Perfect for schools and small organizations! 🎓
