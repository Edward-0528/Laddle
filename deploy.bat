@echo off
REM Laddle Deployment Script for Windows

echo 🚀 Starting Laddle deployment...

REM Step 1: Build the client
echo 📦 Building React client...
cd client
call npm run build
cd ..
echo ✅ Client built successfully!

REM Step 2: Deploy to Firebase Hosting
echo 🔥 Deploying to Firebase Hosting...
call firebase deploy --only hosting
echo ✅ Frontend deployed to Firebase!

REM Step 3: Instructions for backend
echo.
echo 🔧 Next steps for backend deployment:
echo 1. Push your code to GitHub
echo 2. Go to https://render.com
echo 3. Connect your GitHub repo
echo 4. Select 'Web Service'
echo 5. Use these settings:
echo    - Build Command: cd server ^&^& npm install ^&^& npm run build
echo    - Start Command: cd server ^&^& npm start
echo    - Environment Variables:
echo      * PORT: 10000
echo      * CLIENT_ORIGIN: https://your-app.web.app
echo.
echo 🎯 Your app will be live at:
echo    Frontend: https://your-app.web.app
echo    Backend: https://your-app.onrender.com
echo.
echo 🎉 Deployment preparation complete!
pause
