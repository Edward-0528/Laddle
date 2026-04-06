# 🍜 Ladle — Comprehensive Improvement Plan

> **Prepared by:** Senior Software Engineer Review
> **Date:** April 5, 2026
> **Design Reference:** LearnFun-style Trivia Quiz Landing Page (Purple/Yellow, playful monsters, clean & modern UI)

---

## 📋 Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Critical Security Issues (Fix Immediately)](#2-critical-security-issues)
3. [Architecture Restructure](#3-architecture-restructure)
4. [Phase 1 — Security & Foundation](#4-phase-1--security--foundation)
5. [Phase 2 — Authentication & User System](#5-phase-2--authentication--user-system)
6. [Phase 3 — Landing Page & Brand Identity](#6-phase-3--landing-page--brand-identity)
7. [Phase 4 — Quiz Builder & Storage](#7-phase-4--quiz-builder--storage)
8. [Phase 5 — QR Code Join & Game Experience](#8-phase-5--qr-code-join--game-experience)
9. [Phase 6 — Monetization & Usage Tracking](#9-phase-6--monetization--usage-tracking)
10. [Phase 7 — Polish & Production Readiness](#10-phase-7--polish--production-readiness)
11. [Recommended Tech Stack Changes](#11-recommended-tech-stack-changes)
12. [File-by-File Action Items](#12-file-by-file-action-items)

---

## 1. Current State Assessment

### What Exists Today
- **Frontend:** React 19 + TypeScript + Vite, React Router, Socket.IO client
- **Backend:** Express + Socket.IO server, in-memory game store
- **Database:** Firebase (optional, barely integrated — only config exists)
- **Deployment:** Firebase Hosting (client) + Render free tier (server)
- **Pages:** Home (bare), Host (quiz creator), Player (join), Game (play), TestPage (debug)

### What Works
✅ Real-time Socket.IO game creation and joining
✅ Basic quiz creation flow (add questions, choices, set timer)
✅ Player join with game codes
✅ Live scoring with time-based bonuses
✅ Leaderboard display
✅ Firebase config uses environment variables (good)

### What's Broken / Missing
❌ No authentication — anyone can host/play, no identity
❌ No quiz persistence — quizzes vanish on server restart or socket disconnect
❌ No landing page — Home is just two buttons
❌ No QR code system for easy joining
❌ No user dashboard or saved quizzes
❌ No rate limiting or abuse prevention
❌ Debug `/games` endpoint exposes all active games publicly
❌ Debug `/test` page is in production
❌ `client/.env` is committed to git with production URLs
❌ Duplicate project structure (`src/` and `client/src/` are nearly identical)
❌ CORS is wildcard-permissive with hardcoded URLs
❌ No input validation/sanitization on server
❌ Host verification is only via URL query param `?host=true` (trivially spoofable)
❌ No mobile-first responsive design
❌ No proper error boundaries or loading states
❌ No test suite whatsoever

---

## 2. Critical Security Issues

### 🔴 IMMEDIATE — Fix Before Next Commit

#### 2.1 `.env` File Committed to Git
**File:** `client/.env`
**Issue:** Contains `VITE_SOCKET_URL=https://laddle-server.onrender.com` and is tracked by git.
**Fix:**
```bash
# Add to .gitignore
.env
.env.local
client/.env
server/.env

# Remove from git tracking (but keep the file locally)
git rm --cached client/.env
git commit -m "Remove .env from tracking"
```

#### 2.2 `/games` Debug Endpoint Exposes All Active Games
**File:** `server/src/index.ts` (line 291)
**Issue:** `GET /games` returns every active game code, player count, and state. An attacker can enumerate all games and join uninvited.
**Fix:** Remove entirely, or put behind admin auth middleware.

#### 2.3 `/test` Page in Production
**File:** `src/pages/TestPage.tsx`
**Issue:** Debug page is accessible at `/test` in production.
**Fix:** Remove route in production, or gate behind `import.meta.env.DEV`.

#### 2.4 Host Identity is Spoofable
**File:** `src/pages/Game.tsx` (line ~88)
**Issue:** `isHost` is determined by `?host=true` URL parameter. Anyone can add this param to get host controls.
**Fix:** Server should emit a `role` field, and the host socket ID should be verified server-side for all host actions (it already checks `game.hostSocketId` for `host:start`, but the UI shouldn't rely on URL params).

#### 2.5 No Input Validation on Server
**File:** `server/src/index.ts`
**Issue:** `host:create` accepts any payload — no validation on question text length, number of choices, empty strings, XSS payloads in question text/choices.
**Fix:** Add Zod schema validation for all socket events.

#### 2.6 No Rate Limiting
**Issue:** No rate limiting on game creation, joining, or answering. An attacker could create thousands of games, filling server memory.
**Fix:** Add per-socket rate limiting and max-games-per-IP limits.

#### 2.7 `client/src/firebase.ts` Initializes Without Guard
**File:** `client/src/firebase.ts`
**Issue:** Unlike `src/services/firebase.ts`, the `client/` version always calls `initializeApp()` even if no config is provided, which will throw.
**Fix:** Add the same conditional guard.

---

## 3. Architecture Restructure

### Current Problem: Duplicate Project Structure
You have **three** overlapping codebases:
```
/src/          ← Root-level React app (this is what Vite builds)
/client/src/   ← Duplicate React app (older version, not actively used)
/server/src/   ← Express + Socket.IO server
```

### Recommended Structure
```
/
├── .env.example
├── .gitignore
├── package.json              ← Root: scripts to run both client & server
├── firebase.json
├── render.yaml
│
├── client/                   ← Frontend (React + Vite)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   ├── public/
│   │   ├── favicon.svg
│   │   ├── og-image.png
│   │   └── monsters/         ← Fun mascot illustrations
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── router.tsx          ← Centralized routing
│       ├── config/
│       │   └── firebase.ts     ← Single firebase config
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── useSocket.ts
│       │   └── useQuiz.ts
│       ├── context/
│       │   ├── AuthContext.tsx
│       │   └── SocketContext.tsx
│       ├── services/
│       │   ├── auth.ts
│       │   ├── quizzes.ts      ← Firestore CRUD for quizzes
│       │   └── socket.ts
│       ├── components/
│       │   ├── ui/             ← Reusable design system
│       │   │   ├── Button.tsx
│       │   │   ├── Input.tsx
│       │   │   ├── Card.tsx
│       │   │   ├── Modal.tsx
│       │   │   └── QRCode.tsx
│       │   ├── layout/
│       │   │   ├── Navbar.tsx
│       │   │   ├── Footer.tsx
│       │   │   └── Layout.tsx
│       │   ├── quiz/
│       │   │   ├── QuestionEditor.tsx
│       │   │   ├── QuestionCard.tsx
│       │   │   ├── ChoiceGrid.tsx
│       │   │   └── Timer.tsx
│       │   └── game/
│       │       ├── Lobby.tsx
│       │       ├── QuestionView.tsx
│       │       ├── Results.tsx
│       │       └── Leaderboard.tsx
│       ├── pages/
│       │   ├── Landing.tsx       ← New! Full landing page
│       │   ├── Login.tsx         ← New! Auth page
│       │   ├── Register.tsx      ← New! Auth page
│       │   ├── Dashboard.tsx     ← New! User's saved quizzes
│       │   ├── QuizBuilder.tsx   ← New! Proper quiz creation
│       │   ├── JoinGame.tsx      ← Replaces Player.tsx
│       │   ├── GameLobby.tsx     ← Host/Player lobby
│       │   ├── GamePlay.tsx      ← Active quiz gameplay
│       │   └── GameResults.tsx   ← Final results
│       ├── styles/
│       │   ├── globals.css
│       │   ├── variables.css     ← Design tokens
│       │   └── components/       ← Component-specific styles
│       └── types/
│           ├── quiz.ts
│           ├── game.ts
│           └── user.ts
│
├── server/                    ← Backend (Express + Socket.IO)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── config/
│       │   └── firebase-admin.ts  ← Firebase Admin SDK (server-side)
│       ├── middleware/
│       │   ├── auth.ts            ← Verify Firebase ID tokens
│       │   ├── rateLimit.ts
│       │   └── validation.ts
│       ├── socket/
│       │   ├── handlers.ts        ← All socket event handlers
│       │   ├── auth.ts            ← Socket auth middleware
│       │   └── types.ts
│       ├── routes/
│       │   ├── health.ts
│       │   └── quizzes.ts         ← REST API for quiz CRUD
│       ├── services/
│       │   ├── gameManager.ts     ← Game state management
│       │   └── quizService.ts     ← Quiz persistence
│       └── validators/
│           └── schemas.ts         ← Zod schemas for validation
│
└── shared/                     ← Shared types (optional)
    └── types/
        ├── quiz.ts
        └── game.ts
```

### Action: Delete the duplicate `src/` directory at root
The root `/src/` and `/client/src/` are near-duplicates. Keep one (move to proper `client/` structure), delete the other. The root `package.json` should only orchestrate dev scripts, not contain its own React app.

---

## 4. Phase 1 — Security & Foundation
**Priority:** 🔴 Critical | **Effort:** 1-2 days

### Tasks
- [ ] **Remove `client/.env` from git** and add to `.gitignore`
- [ ] **Remove `/games` debug endpoint** from server
- [ ] **Remove `/test` route** from production (keep in dev only)
- [ ] **Add Zod validation** for all socket event payloads
- [ ] **Add rate limiting** — max 5 game creates per minute per socket, max 1 answer per question
- [ ] **Fix host identity** — server emits role on join, don't use URL params
- [ ] **Add CORS allowlist from env** — don't hardcode origins
- [ ] **Add helmet** to Express for security headers
- [ ] **Consolidate project structure** — remove duplicate `/src/`
- [ ] **Add `.env` files** to `.gitignore` properly
- [ ] **Add input sanitization** — strip HTML/script tags from question text and player names
- [ ] **Add max game limits** — max 50 active games, max 100 players per game

### New Dependencies
```bash
# Server
npm install zod helmet express-rate-limit
npm install -D @types/helmet
```

---

## 5. Phase 2 — Authentication & User System
**Priority:** 🟠 High | **Effort:** 3-4 days

### Architecture
- **Firebase Authentication** (free tier: unlimited email/password + Google sign-in)
- **Firebase Firestore** (free tier: 1 GiB storage, 50K reads/day, 20K writes/day)
- Server verifies Firebase ID tokens via **Firebase Admin SDK**

### Tasks
- [ ] **Set up Firebase Auth** in Firebase console (enable Email/Password + Google)
- [ ] **Create Auth Context** (`AuthContext.tsx`) with login, register, logout, user state
- [ ] **Create Login/Register pages** matching design style
- [ ] **Add Firebase Admin SDK** to server for token verification
- [ ] **Socket authentication middleware** — client sends Firebase ID token on connect, server verifies
- [ ] **Protected routes** — Dashboard, Quiz Builder require auth
- [ ] **Guest mode** — Players joining a quiz don't need accounts (just enter name)
- [ ] **User profile** in Firestore:
  ```typescript
  interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    createdAt: Timestamp;
    plan: 'free' | 'pro';
    quizzesCreated: number;
    quizzesLimit: number; // 5 for free, unlimited for pro
  }
  ```

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Quizzes: owner can CRUD, others can read if quiz is published
    match /quizzes/{quizId} {
      allow read: if resource.data.isPublic == true || 
                     (request.auth != null && request.auth.uid == resource.data.ownerId);
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.ownerId;
    }
    // Game results: participants and owner can read
    match /gameResults/{resultId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
  }
}
```

---

## 6. Phase 3 — Landing Page & Brand Identity
**Priority:** 🟠 High | **Effort:** 3-5 days

### Design System (Based on Attached Reference)
The LearnFun design uses:
- **Primary Purple:** `#6C3FC5` (header, hero background)
- **Secondary Yellow/Gold:** `#F5A623` / `#FFD93D` (CTAs, accents)
- **Background White:** `#FFFFFF` with light gray sections `#F8F7FC`
- **Card Backgrounds:** White with subtle shadows
- **Typography:** Bold, rounded, playful (use **Poppins** or **Nunito** — both free on Google Fonts)
- **Illustrations:** Playful monster characters (consider commissioning or using a consistent illustration pack)
- **Border Radius:** Large (16px-24px) for cards, fully rounded for buttons

### Design Tokens (`variables.css`)
```css
:root {
  /* Colors */
  --color-primary: #6C3FC5;
  --color-primary-dark: #5A2FA0;
  --color-primary-light: #8B6BD4;
  --color-secondary: #F5A623;
  --color-secondary-light: #FFD93D;
  --color-accent-green: #4ECDC4;
  --color-accent-red: #FF6B6B;
  --color-bg-white: #FFFFFF;
  --color-bg-light: #F8F7FC;
  --color-bg-dark: #1A0A3E;
  --color-text-primary: #1A1A2E;
  --color-text-secondary: #6B7280;
  --color-text-white: #FFFFFF;

  /* Typography */
  --font-family: 'Poppins', sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 2rem;
  --font-size-4xl: 2.5rem;
  --font-size-hero: 3.5rem;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-24: 6rem;

  /* Border Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.12);
  --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.15);
}
```

### Landing Page Sections (Matching Reference Design)

#### 1. **Navigation Bar**
- Logo: "Ladle" with a small ladle/spoon icon 🍜
- Links: Discover Quizzes | About | Features | Leaderboard
- Right: Sign In | Get Started (yellow CTA button)
- Sticky on scroll with glass morphism effect

#### 2. **Hero Section** (Purple background with illustrations)
- Headline: "Get Ready for a Fun Quiz!"
- Subtext: "Train your brain with smart, community-created quizzes. Start improving your knowledge with us today."
- CTA Inputs: [Enter quiz code] [Join Now — yellow button]
- Illustration: Playful monster characters on the right
- Mobile: Stack vertically

#### 3. **"Start Your Quiz Adventure"** Section
- Subheading with description of the platform
- [Try Premium Now] button
- Category filter bar: Popular Quiz | All Category
- Grid of quiz category cards:
  - Movie Mania Madness
  - Sport Knowledge Test
  - Music Knowledge Test
  - Pop Culture Quiz
  - etc.
- Each card: Thumbnail image, title, question count, play count

#### 4. **How It Works** Section
- Step 1: Create an account
- Step 2: Build your quiz
- Step 3: Share the code or QR
- Step 4: Play in real-time!

#### 5. **Features Section**
- Real-time multiplayer
- Custom timers
- Live leaderboards
- QR code joining
- Save & reuse quizzes
- Mobile-friendly

#### 6. **Testimonials / Stats**
- "10,000+ quizzes created"
- "50,000+ players"
- (placeholder numbers for now)

#### 7. **Footer**
- Logo, navigation links, social links
- © 2026 Ladle. All rights reserved.

---

## 7. Phase 4 — Quiz Builder & Storage
**Priority:** 🟡 Medium-High | **Effort:** 4-5 days

### Firestore Quiz Schema
```typescript
interface Quiz {
  id: string;                  // Firestore doc ID
  ownerId: string;             // Firebase Auth UID
  title: string;
  description: string;
  category: string;            // 'science' | 'history' | 'movies' | etc.
  coverImage?: string;         // URL to cover image
  isPublic: boolean;           // Whether it shows in discovery
  questions: QuizQuestion[];
  settings: QuizSettings;
  stats: QuizStats;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface QuizQuestion {
  id: string;
  text: string;
  choices: string[];           // 2-6 options
  correctIndex: number;
  durationSec: number;
  points: number;              // default 1000
  imageUrl?: string;           // optional question image
}

interface QuizSettings {
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  showCorrectAnswer: boolean;
  maxPlayers: number;
  isPrivate: boolean;          // Require password to join
  password?: string;           // Hashed
}

interface QuizStats {
  timesPlayed: number;
  totalPlayers: number;
  averageScore: number;
}
```

### Quiz Builder UI
- **Step-by-step wizard** (not a single long form):
  1. Quiz Info: Title, description, category, cover image
  2. Questions: Add/edit/reorder/delete questions with drag-and-drop
  3. Settings: Timer, shuffle, visibility, max players
  4. Review & Save: Preview the quiz, save to Firestore
- **Question editor**: Rich input with image upload support
- **Auto-save** drafts to localStorage and Firestore
- **Import/Export**: JSON export for backup, CSV import for bulk questions
- **Templates**: Pre-built quiz templates for quick start

### Dashboard
- Grid of user's saved quizzes (card view)
- Each card shows: title, question count, times played, last edited
- Actions: Edit, Duplicate, Delete, Launch Game
- Filter/search quizzes
- Usage meter: "3 of 5 quizzes used (Free plan)"

---

## 8. Phase 5 — QR Code Join & Game Experience
**Priority:** 🟡 Medium | **Effort:** 2-3 days

### QR Code System
- Use `qrcode.react` library (lightweight, no server needed)
- When host creates a game → generate QR code encoding the join URL:
  ```
  https://ladle.app/join?code=ABC123
  ```
- Display QR prominently in the game lobby (large, centered)
- Players scan with phone camera → opens join page with code pre-filled
- Also show the 6-char code as fallback

### Game Experience Improvements
- **Lobby**: Show QR code + game code + player list with avatars
- **Question view**: Full-screen, colorful choice buttons (Kahoot-style colored blocks)
- **Answer feedback**: Confetti animation for correct, shake for wrong
- **Between questions**: Show quick leaderboard update
- **Final results**: Podium animation (1st, 2nd, 3rd), share results button
- **Sound effects**: Optional join sound, countdown beep, correct/wrong chime

### New Dependencies
```bash
npm install qrcode.react
# Optional: for animations
npm install framer-motion
# Optional: for confetti
npm install canvas-confetti
```

---

## 9. Phase 6 — Monetization & Usage Tracking
**Priority:** 🟢 Medium | **Effort:** 3-4 days

### Free vs Pro Tier
| Feature | Free | Pro ($X/mo) |
|---|---|---|
| Quizzes saved | 5 | Unlimited |
| Questions per quiz | 20 | Unlimited |
| Players per game | 20 | 100 |
| Custom branding | ❌ | ✅ |
| Analytics/Reports | Basic | Detailed |
| Priority support | ❌ | ✅ |
| Ad-free experience | ❌ | ✅ |
| Export results CSV | ❌ | ✅ |

### Implementation Approach
1. **Track quiz creation count** in Firestore user profile
2. **Server-side enforcement** — check user's plan before allowing:
   - Quiz creation beyond limit
   - Player join beyond limit
   - Access to premium features
3. **Stripe integration** (future) for payments
   - Stripe Checkout for subscription
   - Webhook to update Firestore plan field
4. **Usage metering** for future per-quiz charging:
   ```typescript
   interface UsageRecord {
     userId: string;
     quizId: string;
     action: 'create' | 'launch' | 'play';
     timestamp: Timestamp;
     playerCount: number;
   }
   ```

### For Now (Pre-Stripe)
- Implement the limits in code
- Show upgrade prompts when limits are hit
- Use a simple "plan" field on the user document
- Manual plan upgrades (you update Firestore directly)
- Add the Stripe integration later when ready to charge

---

## 10. Phase 7 — Polish & Production Readiness
**Priority:** 🟢 Medium | **Effort:** 3-5 days

### Performance
- [ ] Add React lazy loading for routes (`React.lazy` + `Suspense`)
- [ ] Add service worker for offline support
- [ ] Optimize bundle size (tree-shake Firebase imports)
- [ ] Add proper loading skeletons
- [ ] Implement virtual scrolling for large player lists

### Error Handling
- [ ] Add React Error Boundaries
- [ ] Add proper toast notification system (not `alert()`)
- [ ] Handle socket disconnection/reconnection gracefully
- [ ] Add retry logic for failed operations

### SEO & Metadata
- [ ] Add proper `<meta>` tags (Open Graph, Twitter Cards)
- [ ] Add `robots.txt` and `sitemap.xml`
- [ ] Add proper page titles per route
- [ ] Add structured data for search engines

### Testing
- [ ] Add Vitest for unit tests
- [ ] Add React Testing Library for component tests
- [ ] Add Playwright for E2E tests
- [ ] Add Socket.IO test harness for server events

### DevOps
- [ ] Set up GitHub Actions CI/CD
- [ ] Add ESLint + Prettier configuration
- [ ] Add Husky pre-commit hooks
- [ ] Set up staging environment
- [ ] Add error monitoring (Sentry free tier)
- [ ] Add analytics (PostHog free tier or Firebase Analytics)

### Accessibility
- [ ] Add proper ARIA labels
- [ ] Ensure keyboard navigation works
- [ ] Test with screen readers
- [ ] Ensure color contrast meets WCAG 2.1 AA

---

## 11. Recommended Tech Stack Changes

### Keep ✅
- **React 19** — Modern, great ecosystem
- **TypeScript** — Type safety is essential
- **Vite** — Fast builds, great DX
- **Socket.IO** — Perfect for real-time quiz gameplay
- **Firebase Auth** — Free tier is generous, easy to implement
- **Firebase Firestore** — Free tier handles moderate traffic
- **Firebase Hosting** — Free, fast, auto SSL

### Add 🆕
| Tool | Purpose | Why |
|---|---|---|
| **Zod** | Schema validation | Validate all inputs on server & client |
| **Firebase Admin SDK** | Server auth | Verify tokens server-side |
| **qrcode.react** | QR code generation | Lightweight client-side QR |
| **Framer Motion** | Animations | Smooth, declarative animations |
| **Poppins font** | Typography | Matches playful design style |
| **Tailwind CSS** | Utility-first CSS | Faster UI development, consistency |
| **React Hook Form** | Form handling | Better quiz builder forms |
| **Zustand** | State management | Lighter than Redux, great for quiz state |
| **Helmet** | Security headers | Server security |
| **Vitest** | Testing | Fast, Vite-native testing |

### Consider Replacing 🔄
| Current | Recommended | Why |
|---|---|---|
| In-memory game store | Redis (Upstash free tier) | Survives server restarts, scales |
| `alert()` dialogs | React Hot Toast / Sonner | Modern UX |
| Plain CSS | Tailwind CSS | Faster development, design consistency |
| Manual CORS config | Environment-driven allowlist | Easier multi-env support |

### Remove 🗑️
- `/src/` root directory (duplicate)
- `/client/` old directory (consolidate into one)
- `@vitejs/plugin-vue` (you're using React, not Vue)
- `vue-tsc` (not needed)
- `HelloWorld.vue` (leftover from Vue scaffold)
- `App.vue` (leftover from Vue scaffold)
- `TestPage.tsx` (debug page)

---

## 12. File-by-File Action Items

### Files to DELETE
| File | Reason |
|---|---|
| `src/App.vue` | Vue leftover — you're using React |
| `src/main.ts` | Vue leftover entry point |
| `src/style.css` | Vue leftover styles |
| `src/components/HelloWorld.vue` | Vue scaffold component |
| `src/assets/vue.svg` | Vue logo |
| `client/src/components/HelloWorld.vue` | Vue scaffold in client dir |
| `client/src/assets/vue.svg` | Vue logo in client dir |
| `src/pages/TestPage.tsx` | Debug page — don't ship to production |
| `public/vite.svg` | Default Vite logo |

### Files to MODIFY
| File | Changes |
|---|---|
| `.gitignore` | Add `.env`, `client/.env`, `server/.env` |
| `server/src/index.ts` | Remove `/games` endpoint, add validation, rate limiting, auth middleware, modularize into separate files |
| `src/services/socket.ts` | Add auth token on connection, add reconnection handling |
| `src/services/firebase.ts` | Add Auth imports, consolidate with client version |
| `src/App.tsx` | Remove `/test` route, add protected routes, add layout |
| `src/App.css` | Replace with design system (purple/yellow theme) |
| `src/index.css` | Replace with design tokens and global styles |
| `src/pages/Home.tsx` | Replace with full landing page |
| `src/pages/Host.tsx` | Evolve into proper Quiz Builder with save functionality |
| `src/pages/Player.tsx` | Add QR code scanning support, rename to JoinGame |
| `src/pages/Game.tsx` | Split into Lobby, QuestionView, Results components |
| `package.json` | Remove Vue dependencies, add new dependencies |
| `render.yaml` | Add environment variables for secrets |
| `firebase.json` | Add Firestore rules and indexes |

### Files to CREATE
| File | Purpose |
|---|---|
| `src/pages/Landing.tsx` | Full marketing landing page |
| `src/pages/Login.tsx` | Authentication page |
| `src/pages/Register.tsx` | Registration page |
| `src/pages/Dashboard.tsx` | User's saved quizzes |
| `src/pages/QuizBuilder.tsx` | Full quiz creation interface |
| `src/context/AuthContext.tsx` | Firebase auth state management |
| `src/context/SocketContext.tsx` | Socket connection management |
| `src/hooks/useAuth.ts` | Auth hook |
| `src/hooks/useSocket.ts` | Socket hook |
| `src/hooks/useQuiz.ts` | Quiz CRUD hook |
| `src/components/ui/Button.tsx` | Design system button |
| `src/components/ui/Input.tsx` | Design system input |
| `src/components/ui/Card.tsx` | Design system card |
| `src/components/ui/QRCode.tsx` | QR code component |
| `src/components/layout/Navbar.tsx` | Navigation bar |
| `src/components/layout/Footer.tsx` | Footer |
| `src/types/quiz.ts` | Shared quiz types |
| `src/types/game.ts` | Shared game types |
| `src/types/user.ts` | User types |
| `server/src/middleware/auth.ts` | Firebase token verification |
| `server/src/middleware/rateLimit.ts` | Rate limiting |
| `server/src/validators/schemas.ts` | Zod schemas |
| `firestore.rules` | Firestore security rules |
| `firestore.indexes.json` | Firestore indexes |

---

## 📅 Suggested Timeline

| Phase | Duration | When |
|---|---|---|
| **Phase 1:** Security & Foundation | 1-2 days | Week 1 |
| **Phase 2:** Auth & User System | 3-4 days | Week 1-2 |
| **Phase 3:** Landing Page & Brand | 3-5 days | Week 2-3 |
| **Phase 4:** Quiz Builder & Storage | 4-5 days | Week 3-4 |
| **Phase 5:** QR Code & Game UX | 2-3 days | Week 4 |
| **Phase 6:** Monetization Prep | 3-4 days | Week 5 |
| **Phase 7:** Polish & Production | 3-5 days | Week 5-6 |

**Total estimated effort: 4-6 weeks** (working part-time / evenings)

---

## 🎯 Top 5 Recommendations (If You Can Only Do 5 Things)

1. **🔴 Fix security issues** — Remove committed `.env`, remove debug endpoints, add input validation
2. **🟠 Add Firebase Auth** — Users need accounts to save quizzes (Google sign-in is easiest)
3. **🟠 Build the landing page** — First impressions matter; match the LearnFun design style
4. **🟡 Add quiz persistence** — Save quizzes to Firestore so they survive server restarts
5. **🟡 Add QR code joining** — The single best UX improvement for in-person quiz hosting

---

*This plan is designed to be tackled incrementally. Each phase builds on the previous one. Start with security, then auth, then work your way through the features. Don't try to do everything at once.*
