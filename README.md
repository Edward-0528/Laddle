# Laddle Quiz Game

A real-time quiz application similar to Kahoot, built with React, Socket.IO, and designed for $0 monthly cost using free tiers.

## Features

- 🎯 **Real-time Quiz Gameplay**: Host quizzes and have players join with simple game codes
- ⏱️ **Timed Questions**: Customizable question duration with live countdown
- 🏆 **Live Scoring**: Points awarded for correct answers with time-based bonuses
- 📊 **Leaderboards**: Real-time score tracking and final results
- 🎨 **Modern UI**: Clean, responsive design with smooth animations
- 💰 **$0 Cost**: Designed to run on free tiers of hosting services

## Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Clone and setup**:
   ```bash
   cd Laddle
   npm install
   cd server && npm install && cd ..
   ```

2. **Start development servers**:
   ```bash
   npm run dev
   ```
   This starts both the React client (port 5173) and Socket.IO server (port 3001).

3. **Open your browser**:
   - Go to `http://localhost:5173`
   - Choose "Host a Quiz" to create questions and start a game
   - Choose "Join Quiz" to enter a game code as a player

## How to Play

### For Hosts:
1. Click "Host a Quiz"
2. Add questions with multiple choice answers
3. Set question duration (10-120 seconds)
4. Create the game and share the 6-character code
5. Start the quiz when players have joined

### For Players:
1. Click "Join Quiz"
2. Enter the game code provided by the host
3. Enter your name
4. Wait for the host to start
5. Answer questions as quickly as possible for bonus points!

## Scoring System

- **Base Points**: 1000 points for each correct answer
- **Time Bonus**: Up to 1000 additional points based on answer speed
- **Final Score**: Displayed on leaderboard at the end

## Firebase Integration (Optional)

To persist quiz data and use Firebase's free tier:

1. Create a Firebase project at https://console.firebase.google.com
2. Copy your config and create `.env.local` in the client folder:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

## Deployment ($0 Cost)

### Client (Frontend)
- **Vercel**: Deploy the `client` folder to Vercel's free tier
- **Netlify**: Deploy the client build to Netlify's free tier
- **GitHub Pages**: Use GitHub Actions for automatic deployment

### Server (Backend)
- **Railway**: Free tier with 500 hours/month
- **Render**: Free tier with sleep after inactivity
- **Fly.io**: Free tier with generous limits

### Example Deployment Commands:

```bash
# Build client for production
cd client && npm run build

# Build server for production  
cd server && npm run build

# Start production server
cd server && npm start
```

## Project Structure

```
Laddle/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Home, Host, Player, Game components
│   │   ├── services/      # Socket.IO client setup
│   │   └── App.tsx        # Main app with routing
│   └── package.json
├── server/                # Node.js backend
│   ├── src/
│   │   └── index.ts       # Express + Socket.IO server
│   └── package.json
└── package.json           # Root package with dev scripts
```

## Development Scripts

```bash
npm run dev          # Start both client and server
npm run dev:client   # Start only React client
npm run dev:server   # Start only Node.js server
npm run build        # Build both for production
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, React Router
- **Backend**: Node.js, Express, Socket.IO, TypeScript
- **Real-time**: WebSocket connections via Socket.IO
- **Styling**: CSS with modern glassmorphism design
- **Optional**: Firebase Firestore for data persistence

## Free Tier Limits

- **Vercel**: 100GB bandwidth, unlimited sites
- **Railway**: 500 execution hours/month, 1GB RAM
- **Firebase**: 1GB storage, 10GB/month transfer
- **Render**: 750 hours/month, sleeps after 15min inactivity

Perfect for small schools and organizations! 🎓

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).
