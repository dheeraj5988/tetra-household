# 🚀 Deployment Guide

## GitHub Repository Setup

### Step 1: Create Repository on GitHub

1. Go to https://github.com/new
2. Repository name: `household-updater`
3. Owner: `dheeraj_5988`
4. Description: "Netflix Household Updater - Frontend (Next.js) + Backend (Express + Gmail IMAP)"
5. Choose **Private** or **Public**
6. **DO NOT** initialize with README, .gitignore, or license (we already have these)
7. Click **Create repository**

### Step 2: Push Code to GitHub

After creating the repository, run these commands:

```bash
cd Web_projects/household
git remote add origin https://github.com/dheeraj_5988/household-updater.git
git branch -M main
git push -u origin main
```

If you get authentication errors, you may need to:
- Use a Personal Access Token instead of password
- Or use SSH: `git@github.com:dheeraj_5988/household-updater.git`

## Environment Variables Setup

### For Local Development

**Backend** (`backend/.env`):
```env
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-digit-app-password
PORT=5000
FRONTEND_URL=http://localhost:3000
```

**Frontend** - No .env needed for local development (uses default `http://localhost:5000`)

### For Production Deployment (Vercel/Netlify)

Add these environment variables in your hosting platform:

**Backend Environment Variables:**
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `PORT` (usually auto-set by platform)
- `FRONTEND_URL` (your frontend URL)

**Frontend Environment Variables:**
- `NEXT_PUBLIC_API_URL` (your backend API URL)

## Deployment Options

### Option 1: Vercel (Recommended for Next.js)

**Frontend:**
1. Go to https://vercel.com
2. Import your GitHub repository
3. Framework: Next.js (auto-detected)
4. Add environment variable: `NEXT_PUBLIC_API_URL` = your backend URL
5. Deploy

**Backend:**
1. Vercel supports Node.js serverless functions
2. Or deploy backend separately to:
   - Railway
   - Render
   - Heroku
   - DigitalOcean App Platform

### Option 2: Separate Hosting

**Frontend (Next.js):**
- Vercel (recommended)
- Netlify
- AWS Amplify

**Backend (Express):**
- Railway
- Render
- Heroku
- DigitalOcean
- AWS EC2/Lambda

## Important Notes

⚠️ **Never commit `.env` files to GitHub!**
- They are already in `.gitignore`
- Always set environment variables in your hosting platform

🔒 **Security:**
- Keep Gmail app password secure
- Use environment variables in production
- Enable 2FA on your Gmail account

## Repository Structure

```
household-updater/
├── app/                 # Next.js frontend
├── backend/            # Express backend
├── components/         # UI components
├── lib/                # Utilities & API helpers
├── .gitignore         # Excludes .env, node_modules, etc.
└── README.md          # Project documentation
```

## Quick Start After Clone

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Create backend .env file (see DEPLOYMENT.md)
# Copy backend/.env.example to backend/.env and fill in values

# Run frontend
npm run dev

# Run backend (in separate terminal)
cd backend
npm run dev
```


