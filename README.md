# Ladle - Interactive Quiz Platform

A full-stack, real-time quiz application built with React, TypeScript, Socket.IO, and Firebase. Designed for hosting interactive quiz sessions in classrooms, team events, and educational settings.

## Features

- **Real-Time Multiplayer** - Players answer simultaneously with live scoring and leaderboards
- **Quiz Builder** - Step-by-step wizard for creating and editing quizzes with multiple choice questions
- **Persistent Storage** - Quizzes saved to Firestore for reuse across sessions
- **User Authentication** - Email/password and Google sign-in via Firebase Auth
- **Responsive Design** - Works seamlessly on phones, tablets, and desktops
- **QR Code Joining** - Players can join via game code or shareable URL
- **Code Splitting** - Lazy-loaded routes for fast initial page loads

## Tech Stack

| Layer     | Technology                              |
| --------- | --------------------------------------- |
| Frontend  | React 19, TypeScript, Vite              |
| Backend   | Express 5, Socket.IO 4.8, Node.js 18+  |
| Database  | Firebase Firestore                      |
| Auth      | Firebase Authentication                 |
| Styling   | CSS custom properties, Poppins font     |
| Hosting   | Firebase Hosting + Render               |

## Project Structure

```
src/
  components/
    layout/         Navbar, Footer
    ui/             Button, Input, Card
    ErrorBoundary   Global error handler
    ProtectedRoute  Auth-gated route wrapper
  context/
    AuthContext      Firebase auth provider
  pages/
    Landing          Public home page
    Login            Sign-in page
    Register         Sign-up page
    Dashboard        Saved quizzes grid
    QuizBuilder      Create/edit quiz wizard
    JoinGame         Enter game code to join
    Game             Lobby, questions, leaderboard
  services/
    firebase         Firebase initialization
    socket           Socket.IO client
    quizzes          Firestore CRUD for quizzes
  styles/
    variables.css    Design tokens
    globals.css      Base styles and resets
  types/
    quiz.ts          Quiz and question types
    game.ts          Game state types
    user.ts          User profile and plan types
server/
  src/
    index.ts         Express + Socket.IO server
    validators/      Zod schemas for event payloads
    middleware/      Rate limiting
    services/        Game state management
    utils/           Structured logger
```

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm package manager
- Firebase project with Firestore and Authentication enabled

### Installation

```bash
git clone https://github.com/Edward-0528/Laddle.git
cd Laddle
npm install
cd server && npm install && cd ..
```

### Environment Variables

Create a `.env` file in the project root:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_SOCKET_URL=http://localhost:3001
```

Create a `.env` file in the `server/` directory:

```
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173
NODE_ENV=development
```

### Development

```bash
npm run dev
```

This starts both the Vite dev server (port 5173) and the Express/Socket.IO server (port 3001) concurrently.

### Production Build

```bash
npm run build
```

Outputs the client bundle to `dist/` and the server bundle to `server/dist/`.

## Architecture

### Client-Server Communication

All game events use Socket.IO with Zod validation on the server:

| Event              | Direction      | Description                       |
| ------------------ | -------------- | --------------------------------- |
| `host:create`      | Client->Server | Create a new game with questions  |
| `host:start`       | Client->Server | Start the quiz                    |
| `player:join`      | Client->Server | Join a game by code               |
| `player:answer`    | Client->Server | Submit an answer                  |
| `game:role`        | Server->Client | Assign host or player role        |
| `lobby:update`     | Server->Client | Updated player list               |
| `game:question`    | Server->Client | Next question data                |
| `game:question:end`| Server->Client | Correct answer reveal             |
| `game:results`     | Server->Client | Final leaderboard                 |

### Security

- Helmet security headers on all Express responses
- CORS restricted to configured origins
- Zod schema validation on every socket event
- Rate limiting per socket per event type
- HTML sanitization on user-submitted text
- Server-side host verification (no client-side role assignment)
- Environment variables for all sensitive configuration

## Deployment

### Firebase Hosting (Client)

```bash
npm run build
npx firebase deploy --only hosting
```

### Render (Server)

The server deploys automatically from the `server/` directory via `render.yaml`.

## License

MIT
