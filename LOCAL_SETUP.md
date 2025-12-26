# 🚀 Local Development Setup

## ✅ Server Status

Your Next.js development server is **RUNNING** on:
- **Frontend**: http://localhost:3000
- **API Routes**: http://localhost:3000/api/*

## 📋 Environment Variables Setup

### For Next.js API Routes (Root Directory)

Next.js API routes need environment variables in the **root directory**. Create `.env.local` in the project root:

**Create `Web_projects/household/.env.local`:**

```env
# Gmail IMAP Configuration
GMAIL_USER=dsharma259889@gmail.com
GMAIL_APP_PASSWORD=svjkehbdtabgzroo

# Google Sheets Configuration
GOOGLE_SHEET_ID=1NFNi_0on6aZnkBLGDzF57YUmx7V27ihZdeAqFrzXKF4
GOOGLE_CREDENTIALS_PATH=./backend/google-credentials.json
```

**Note**: `.env.local` is automatically ignored by git (already in `.gitignore`)

### Quick Copy Command

You can copy from `backend/.env`:

```bash
# Windows PowerShell:
cd Web_projects/household
Copy-Item backend\.env .env.local
# Then edit .env.local to remove PORT and FRONTEND_URL (not needed for Next.js)
```

Or manually create `.env.local` with the variables above.

## 🧪 Test the Application

### 1. Open Browser
Go to: **http://localhost:3000**

### 2. Test User Validation
1. Enter a mobile number from your Google Sheet
2. Click "Check Permission"
3. Should validate from Google Sheets

### 3. Test API Endpoints

**Health Check:**
```bash
curl http://localhost:3000/api/health
```

**Validate User:**
```bash
curl -X POST http://localhost:3000/api/validate-user \
  -H "Content-Type: application/json" \
  -d "{\"mobile\":\"9667618484\"}"
```

**Get Netflix Link:**
```bash
curl http://localhost:3000/api/latest-netflix-link?minutes=20
```

## 🔧 Troubleshooting

### "GOOGLE_SHEET_ID not configured"
- Create `.env.local` in root directory (not just `backend/.env`)
- Restart dev server after creating `.env.local`
- Check variable names are correct (case-sensitive)

### "Credentials file not found"
- Verify `google-credentials.json` exists in `backend/` folder
- Check `GOOGLE_CREDENTIALS_PATH` in `.env.local` matches file location
- Path should be: `./backend/google-credentials.json`

### "The caller does not have permission"
- Share Google Sheet with service account email
- Service account email is in `google-credentials.json` → `client_email`
- Give at least **Viewer** permission

### API Routes Not Working
- Make sure `.env.local` exists in root directory
- Restart dev server: Stop (Ctrl+C) and run `npm run dev` again
- Check browser console (F12) for errors

## 📝 Current Status

✅ **Server Running**: http://localhost:3000
✅ **Gmail Credentials**: Configured
✅ **Google Sheet ID**: Found in backend/.env
⚠️ **Action Needed**: Create `.env.local` in root directory for Next.js API routes

## 🎯 Next Steps

1. **Create `.env.local`** in root directory with environment variables
2. **Restart server** if it was already running
3. **Test the application** in browser
4. **Verify Google Sheet** is shared with service account

---

**Your project is running! Just create `.env.local` in the root directory and restart if needed.**


