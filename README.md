# 🎬 Netflix Household Updater

A full-stack web application for managing Netflix household device verification. The app validates user access and automatically fetches the latest Netflix verification links from Gmail.

## ✨ Features

- 🔐 **User Authentication** - Mobile number-based access control
- 📧 **Gmail Integration** - Automatic email fetching via IMAP
- 🔗 **Link Extraction** - Parses Netflix verification URLs from emails
- 🎨 **Modern UI** - Netflix-inspired dark theme
- ⚡ **Real-time Updates** - Fetches latest verification links automatically

## 🏗️ Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful UI components
- **Lucide React** - Icon library

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **IMAP** - Gmail email fetching
- **Mailparser** - Email content parsing

## 📋 Prerequisites

- Node.js 18+ installed
- Gmail account with 2-Step Verification enabled
- Gmail App Password (16-digit)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/dheeraj_5988/household-updater.git
cd household-updater
```

### 2. Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd backend
npm install
cd ..
```

### 3. Configure Environment Variables

Create `backend/.env` file:

```env
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-digit-app-password
PORT=5000
FRONTEND_URL=http://localhost:3000
```

**Get Gmail App Password:**
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and your device
3. Copy the 16-digit password

### 4. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### 5. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/api/health

## 📖 Usage

1. Open http://localhost:3000
2. Enter authorized mobile number (default: `9667618484`)
3. Click "Check Permission"
4. Wait for Gmail email fetch (may take 10-30 seconds)
5. Click "Update My Device" to open Netflix verification link

## 🔧 API Endpoints

### `GET /api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Backend is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### `GET /api/latest-netflix-link?minutes=30`
Fetches the most recent Netflix verification email and extracts the link.

**Query Parameters:**
- `minutes` (optional): Search within last N minutes (default: 30)

**Success Response:**
```json
{
  "success": true,
  "link": "https://www.netflix.com/account/travel/...",
  "emailDate": "2024-01-01T00:00:00.000Z",
  "subject": "Verify your Netflix device",
  "from": "info@account.netflix.com"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "No recent verification email found",
  "message": "No emails found from Netflix in the last 30 minutes"
}
```

## 📁 Project Structure

```
household-updater/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main application page
│   ├── layout.tsx         # Root layout
│   ├── error.tsx          # Error boundary
│   └── globals.css       # Global styles
├── backend/               # Express backend
│   ├── src/
│   │   ├── server.js     # Express server
│   │   ├── routes/       # API routes
│   │   ├── services/     # Gmail IMAP service
│   │   └── utils/        # Email parsing utilities
│   ├── .env              # Environment variables (not in git)
│   └── package.json
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── lib/                  # Utilities
│   ├── api.ts           # API helper functions
│   └── utils.ts         # General utilities
└── package.json         # Frontend dependencies
```

## 🔒 Security Notes

- ⚠️ Never commit `.env` files to version control
- 🔐 Keep Gmail app passwords secure
- 🛡️ Use environment variables in production
- 🔄 Enable 2FA on your Gmail account

## 🐛 Troubleshooting

### Backend Connection Issues
- Verify backend is running on port 5000
- Check CORS configuration in `backend/src/server.js`
- Ensure `.env` file exists with correct credentials

### Gmail Authentication Errors
- Regenerate app password if expired
- Verify 2-Step Verification is enabled
- Check that `GMAIL_USER` is your full email address

### No Emails Found
- Ensure Netflix sent a verification email recently
- Increase time window: `?minutes=60`
- Check email is in inbox (not spam/archived)

## 📝 License

Private project - All rights reserved

## 👤 Author

**dheeraj_5988**

## 🙏 Acknowledgments

- Netflix for the inspiration
- Next.js team for the amazing framework
- shadcn for beautiful UI components

---

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)
# initiatornetflix
