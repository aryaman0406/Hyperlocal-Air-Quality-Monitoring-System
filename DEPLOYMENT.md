# Hyperlocal Air Quality - Render Deployment Guide

## ✅ Pre-Deployment Checklist

Your application has been prepared for deployment with:
- ✅ Fixed deprecated `@app.on_event` to use modern `lifespan` context manager
- ✅ Created `render.yaml` configuration
- ✅ Created `.python-version` file
- ✅ Added startup script for backend
- ✅ Optimized frontend build configuration

---

## 🚀 Deploy to Render (Step-by-Step)

### Step 1: Push Code to GitHub

```bash
# Initialize git if not already done
cd c:\Users\acer\Desktop\aqi\hyperlocal-air-quality
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Hyperlocal AQI app ready for deployment"

# Create a new repository on GitHub (https://github.com/new)
# Then push your code:
git remote add origin https://github.com/YOUR_USERNAME/hyperlocal-aqi.git
git branch -M main
git push -u origin main
```

### Step 2: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with your GitHub account
3. Authorize Render to access your repositories

### Step 3: Deploy Backend (API)

1. **Click "New +"** → **"Web Service"**

2. **Connect your repository** - Select `hyperlocal-aqi`

3. **Configure Backend Service:**
   ```
   Name: hyperlocal-aqi-backend
   Region: Choose closest to your target users
   Branch: main
   Root Directory: backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT --workers 2
   ```

4. **Select Plan:** Free

5. **Environment Variables** (Click "Add Environment Variable"):
   ```
   PORT = 10000 (auto-filled by Render)
   HOST = 0.0.0.0
   DEBUG = false
   PYTHON_VERSION = 3.13.0
   OPENAQ_API_KEY = (your API key - optional)
   WEATHER_API_KEY = (your API key - optional)
   ```

6. **Click "Create Web Service"**

7. **Wait for deployment** (5-10 minutes)

8. **Copy your backend URL** (e.g., `https://hyperlocal-aqi-backend.onrender.com`)

### Step 4: Deploy Frontend

1. **Click "New +"** → **"Static Site"**

2. **Connect same repository** - Select `hyperlocal-aqi`

3. **Configure Frontend Service:**
   ```
   Name: hyperlocal-aqi-frontend
   Branch: main
   Root Directory: frontend
   Build Command: npm install && npm run build
   Publish Directory: dist
   ```

4. **Environment Variables:**
   ```
   VITE_API_BASE_URL = https://hyperlocal-aqi-backend.onrender.com
   ```
   (Use the URL from Step 3.8)

5. **Click "Create Static Site"**

6. **Wait for deployment** (3-5 minutes)

7. **Your app is live!** 🎉

---

## 🔧 Post-Deployment Configuration

### Update CORS in Backend (if needed)

If you get CORS errors, update the allowed origins in your backend `.env`:

```
ALLOWED_ORIGINS=https://hyperlocal-aqi-frontend.onrender.com
```

Then redeploy from the Render dashboard.

---

## 📊 Monitoring Your App

1. **Check Logs:**
   - Go to your service in Render dashboard
   - Click "Logs" tab
   - Monitor for errors

2. **Check Health:**
   - Backend: `https://your-backend-url.onrender.com/`
   - Frontend: `https://your-frontend-url.onrender.com/`

3. **API Documentation:**
   - Visit: `https://your-backend-url.onrender.com/docs`

---

## ⚠️ Important Notes

### Free Tier Limitations:
- **Backend spins down after 15 min of inactivity**
- **First request after spin-down takes 30-60 seconds**
- **750 hours/month free** (enough for one service)
- **For production, upgrade to paid plan ($7/month)**

### Keeping Service Awake:
You can use services like [UptimeRobot](https://uptimerobot.com) or [Cron-job.org](https://cron-job.org) to ping your backend every 10 minutes.

---

## 🔄 Updating Your App

After making changes:

```bash
git add .
git commit -m "Your update message"
git push origin main
```

Render will automatically rebuild and redeploy! ✨

---

## 🆘 Troubleshooting

### Build Fails:
- Check build logs in Render dashboard
- Verify `requirements.txt` and `package.json` are correct
- Ensure Python version matches (3.13.0)

### Backend Won't Start:
- Check environment variables are set correctly
- Verify PORT variable is present
- Check logs for Python errors

### Frontend Can't Connect to Backend:
- Verify `VITE_API_BASE_URL` is set correctly
- Check CORS configuration in backend
- Ensure backend is running (visit backend URL directly)

### WebSocket Issues:
- Render Free tier supports WebSockets
- Check browser console for connection errors
- Verify WS endpoint: `wss://your-backend-url.onrender.com/ws`

---

## 🎯 Next Steps

1. Get API keys for:
   - OpenAQ API (optional)
   - Weather API (optional)

2. Set up a custom domain (optional)

3. Monitor usage and upgrade if needed

4. Add analytics (Google Analytics, etc.)

---

## 📞 Support

- Render Docs: https://render.com/docs
- Community: https://community.render.com

**Your app is ready to deploy! 🚀**
