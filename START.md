# 🚀 Complete Project Setup & Run Guide

## Step 1: Configure Gmail Credentials

**IMPORTANT**: You need to add your Gmail credentials to the `.env` file.

1. Open `backend/.env` file
2. Replace the placeholder values:
   ```env
   GMAIL_USER=your-actual-email@gmail.com
   GMAIL_APP_PASSWORD=your-16-digit-app-password
   PORT=5000
   FRONTEND_URL=http://localhost:3000
   ```

3. **Get your Gmail App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-digit password (no spaces)
   - Paste it in `GMAIL_APP_PASSWORD`

## Step 2: Install Dependencies

### Install Frontend Dependencies
```bash
npm install
```

### Install Backend Dependencies
```bash
npm run backend:install
```

Or manually:
```bash
cd backend
npm install
cd ..
```

## Step 3: Run the Project

### Option A: Run Both Servers Together (Recommended)
```bash
npm run dev:all
```

This will start:
- Frontend on: http://localhost:3000
- Backend on: http://localhost:5000

### Option B: Run Separately

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Backend:**
```bash
npm run backend:dev
```

## Step 4: Test the Application

1. Open http://localhost:3000 in your browser
2. Enter mobile number: `9667618484`
3. Click "Check Permission"
4. The app will:
   - Verify your mobile number
   - Connect to Gmail via backend
   - Fetch latest Netflix verification email
   - Extract and display the verification link
   - Open the link when you click "Update My Device"

## Troubleshooting

### Backend not connecting?
- Check that `.env` file exists in `backend/` folder
- Verify Gmail credentials are correct
- Ensure port 5000 is not in use

### Frontend can't reach backend?
- Verify backend is running on port 5000
- Check browser console for CORS errors
- Ensure `FRONTEND_URL` in `.env` matches frontend URL

### No emails found?
- Make sure you have a recent Netflix verification email (within last 30 minutes)
- Check that the email is in your inbox (not spam)
- Try increasing the time window in the API call

### Gmail authentication fails?
- Regenerate your app password
- Ensure 2-Step Verification is enabled
- Check that `GMAIL_USER` is your full email address

## Project Structure

```
household/
├── app/                    # Next.js frontend
│   └── page.tsx            # Main page (connected to backend)
├── lib/
│   └── api.ts              # API helper functions
├── backend/                # Express backend
│   ├── src/
│   │   ├── server.js      # Express server
│   │   ├── routes/        # API routes
│   │   ├── services/      # Gmail IMAP service
│   │   └── utils/         # Email parsing utilities
│   └── .env               # Gmail credentials (YOU NEED TO FILL THIS)
└── package.json           # Frontend dependencies + scripts
```

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/latest-netflix-link` - Fetch Netflix verification link

## Next Steps

Once everything is running:
1. Test with a real Netflix verification email
2. Verify the link extraction works correctly
3. Check that the frontend displays the link properly
4. Test the "Update My Device" button opens the correct URL


