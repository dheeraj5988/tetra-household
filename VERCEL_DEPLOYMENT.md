# 🚀 Vercel Deployment Guide

## Step 1: Push to GitHub

Make sure your code is pushed to GitHub:
```bash
git add .
git commit -m "Configure for Vercel deployment"
git push origin main
```

## Step 2: Deploy to Vercel

1. Go to https://vercel.com
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository: `dheeraj5988/household-updater`
4. Vercel will auto-detect Next.js

## Step 3: Configure Environment Variables

In Vercel project settings, add these environment variables:

### Required Environment Variables:

1. **GMAIL_USER**
   - Value: `your-email@gmail.com`
   - Example: `dsharma259889@gmail.com`

2. **GMAIL_APP_PASSWORD**
   - Value: Your 16-digit Gmail app password
   - Example: `svjkehbdtabgzroo`

### How to Add:

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add each variable:
   - **Name**: `GMAIL_USER`
   - **Value**: Your Gmail address
   - **Environment**: Production, Preview, Development (select all)
4. Repeat for `GMAIL_APP_PASSWORD`

## Step 4: Deploy

1. Click **"Deploy"**
2. Wait for build to complete (usually 2-3 minutes)
3. Your app will be live at: `https://your-project.vercel.app`

## Step 5: Test

1. Visit your deployed URL
2. Enter mobile number: `9667618484`
3. Click "Check Permission"
4. Wait for Gmail email fetch (may take 10-30 seconds)

## Important Notes

### API Routes
- All API routes are now serverless functions in `/app/api/`
- No separate backend server needed
- Works automatically with Vercel

### Environment Variables
- Never commit `.env` files to GitHub
- Always set environment variables in Vercel dashboard
- Variables are encrypted and secure

### Function Timeout
- Vercel serverless functions have a 60-second timeout
- Gmail IMAP connection may take 10-30 seconds
- If timeout occurs, try increasing the time window

### CORS
- No CORS issues since API routes are same-origin
- Frontend and backend are on the same domain

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Verify Node.js version (Vercel uses Node 18+ by default)

### Environment Variables Not Working
- Make sure variables are set in Vercel dashboard
- Redeploy after adding environment variables
- Check variable names match exactly (case-sensitive)

### Gmail Authentication Fails
- Verify app password is correct
- Check that 2-Step Verification is enabled
- Regenerate app password if needed

### Function Timeout
- Gmail IMAP can be slow
- Try reducing the time window: `?minutes=15`
- Check Vercel function logs for errors

## Monitoring

- View logs in Vercel dashboard → **Deployments** → Click deployment → **Functions** tab
- Check for errors in browser console (F12)
- Monitor function execution time in Vercel analytics

## Next Steps

After successful deployment:
1. Set up a custom domain (optional)
2. Enable Vercel Analytics
3. Set up monitoring and alerts
4. Configure automatic deployments from GitHub

---

**Your app is now live on Vercel! 🎉**

