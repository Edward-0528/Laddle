# 🔥 Step-by-Step Firebase Setup Guide

This guide walks you through setting up Firebase Hosting for your Laddle quiz app frontend.

## 📋 What You'll Need
- Google account (Gmail)
- Your Laddle project folder open
- Command prompt/terminal access

## 🚀 Step 1: Create Firebase Project

1. **Go to Firebase Console**:
   - Open your web browser
   - Visit: https://console.firebase.google.com
   - Sign in with your Google account

2. **Create a new project**:
   - Click "Add project" (big blue button)
   - Project name: `laddle-quiz-app` (or whatever you prefer)
   - Click "Continue"
   - Google Analytics: Choose "Not right now" (you can add later)
   - Click "Create project"
   - Wait for setup to complete, then click "Continue"

## 💻 Step 2: Install Firebase CLI

**Open Command Prompt/Terminal in your Laddle folder:**

### On Windows:
1. Open File Explorer
2. Navigate to your Laddle folder: `c:\Users\alexa\OneDrive\Desktop\Projects\HTML\Laddle`
3. Click in the address bar and type `cmd`, press Enter
4. This opens Command Prompt in the right folder

### Commands to run:
```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase (this will open your browser)
firebase login
```

**What happens:**
- A browser window will open
- Sign in with the same Google account you used for Firebase Console
- Grant permissions to Firebase CLI
- You'll see "Firebase CLI Login Successful" in your browser
- Close the browser and return to your command prompt

## 🔧 Step 3: Initialize Firebase in Your Project

**In the same command prompt (still in your Laddle folder):**

```bash
firebase init hosting
```

**You'll see interactive prompts - here's what to choose:**

1. **"Which Firebase features do you want to set up?"**
   - Use arrow keys to navigate
   - Use spacebar to select "Hosting"
   - Press Enter

2. **"Please select an option:"**
   - Choose "Use an existing project"
   - Press Enter

3. **"Select a default Firebase project:"**
   - Choose your project (like "laddle-quiz-app")
   - Press Enter

4. **"What do you want to use as your public directory?"**
   - Type: `client/dist`
   - Press Enter

5. **"Configure as a single-page app (rewrite all urls to /index.html)?"**
   - Type: `y` (yes)
   - Press Enter

6. **"Set up automatic builds and deploys with GitHub?"**
   - Type: `n` (no, we'll deploy manually)
   - Press Enter

7. **"File client/dist/index.html already exists. Overwrite?"**
   - Type: `n` (no)
   - Press Enter

**What this creates:**
- `.firebaserc` file (stores your project info)
- `firebase.json` file (hosting configuration)

## 🏗️ Step 4: Build Your React App

**Still in the same command prompt:**

```bash
# Navigate to client folder
cd client

# Build the React app for production
npm run build

# Go back to main folder
cd ..
```

**What this does:**
- Creates a `client/dist` folder with your built React app
- This is what Firebase will host

## 🚀 Step 5: Deploy to Firebase

**In the main Laddle folder (same command prompt):**

```bash
firebase deploy --only hosting
```

**What happens:**
- Firebase uploads your built React app
- You'll see progress messages
- At the end, you'll get two URLs:
  - `Hosting URL: https://your-project.web.app`
  - `Hosting URL: https://your-project.firebaseapp.com`

**Save these URLs! You'll need them for the backend setup.**

## ✅ Step 6: Test Your Deployment

1. Open the URL Firebase gave you in your browser
2. You should see your Laddle quiz app
3. Try clicking "Host a Quiz" - it should load (but won't work fully until backend is deployed)

## 🔗 Step 7: Prepare for Backend Connection

**Create production environment file:**

1. **Still in command prompt, navigate to client folder:**
   ```bash
   cd client
   ```

2. **Create production environment file:**
   ```bash
   # On Windows Command Prompt:
   echo VITE_SOCKET_URL=https://your-render-app.onrender.com > .env.production
   
   # Or manually create the file with Notepad
   ```

3. **Edit the file to add your Render URL** (you'll get this in the next phase):
   - Open `client/.env.production` in Notepad
   - It should contain: `VITE_SOCKET_URL=https://your-render-app.onrender.com`
   - Replace `your-render-app` with your actual Render service name

## 📱 What You Should Have Now

✅ Firebase project created  
✅ Firebase CLI installed and logged in  
✅ Firebase hosting configured  
✅ React app built and deployed  
✅ Live URL for your frontend  
✅ Ready for backend deployment  

## 🔄 Future Updates

**To update your frontend after making changes:**

```bash
# In your Laddle folder
cd client
npm run build
cd ..
firebase deploy --only hosting
```

## 🆘 Troubleshooting

**"firebase command not found":**
- Run: `npm install -g firebase-tools` again
- Restart your command prompt

**"Not logged in":**
- Run: `firebase login` again

**"Project not found":**
- Run: `firebase use --add` and select your project

**Build fails:**
- Make sure you're in the client folder: `cd client`
- Try: `npm install` first, then `npm run build`

## 🎯 Next Steps

Once this is complete, you'll have:
- **Frontend live at**: `https://your-project.web.app`
- **Ready for backend deployment** on Render

Now you can proceed to Phase 2 (Backend deployment) in the main deployment guide!
