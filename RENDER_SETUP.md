# Render Setup for Laddle Server

## Step 1: Prepare Your Server for Deployment

### Update server/package.json:
```json
{
  "name": "laddle-server",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "nodemon --exec ts-node src/index.ts"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Create render.yaml in project root:
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
      - key: NODE_ENV
        value: production
```

## Step 2: Deploy to Render

1. **Connect GitHub repository** at https://render.com
2. **Select "Web Service"**
3. **Configuration:**
   - Build Command: `cd server && npm install && npm run build`
   - Start Command: `cd server && npm start`
   - Environment: Node

4. **Set Environment Variables:**
   - `PORT`: 10000
   - `CLIENT_ORIGIN`: https://your-firebase-app.web.app
   - `NODE_ENV`: production

## Step 3: Update CORS in server/src/index.ts
```typescript
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:5174', 
      'https://your-app.web.app',
      'https://your-app.firebaseapp.com'
    ],
    methods: ['GET', 'POST']
  }
});
```

## Render Free Limits:
- ✅ 750 hours/month
- ✅ 512MB RAM
- ✅ Sleeps after 15min inactivity
- ✅ Custom domains
- ✅ SSL certificates
