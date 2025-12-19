# 📊 Google Sheets Integration Setup Guide

## ✅ What's Already Done

- ✅ Google Sheets API enabled in Google Cloud Console
- ✅ Service account created and credentials downloaded
- ✅ `google-credentials.json` placed in `backend/` folder
- ✅ Code integration completed

## 🔧 Manual Setup Steps

### Step 1: Get Your Spreadsheet ID

1. Open your Google Sheet
2. Look at the URL: `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit`
3. Copy the `YOUR_SHEET_ID_HERE` part (long string of letters, numbers, and dashes)

### Step 2: Share Sheet with Service Account

**CRITICAL**: Your service account email needs access to the sheet!

1. Open your Google Sheet
2. Click **Share** button (top right)
3. Add your service account email (found in `google-credentials.json` as `client_email`)
4. Give it **Viewer** access (read-only is enough)
5. Click **Send**

### Step 3: Set Environment Variables

#### For Local Development:

Create or update `backend/.env`:

```env
# Gmail IMAP Configuration (existing)
GMAIL_USER=dsharma259889@gmail.com
GMAIL_APP_PASSWORD=your-16-digit-password

# Server Configuration
PORT=5000
FRONTEND_URL=http://localhost:3000

# Google Sheets Configuration (NEW)
GOOGLE_SHEET_ID=your-actual-spreadsheet-id-here
GOOGLE_CREDENTIALS_PATH=./google-credentials.json
```

#### For Vercel Deployment:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these new variables:
   - **Key**: `GOOGLE_SHEET_ID`
   - **Value**: Your spreadsheet ID
   - **Environment**: Production, Preview, Development
   
   - **Key**: `GOOGLE_CREDENTIALS_PATH`
   - **Value**: `./backend/google-credentials.json` (or path relative to project root)
   - **Environment**: Production, Preview, Development

**Note**: For Vercel, you may need to:
- Upload `google-credentials.json` as a secret, OR
- Convert credentials to environment variables (base64 encoded)

### Step 4: Install Dependencies

```bash
cd Web_projects/household
npm install googleapis
```

### Step 5: Verify Sheet Structure

Your Google Sheet should have this structure:

| Mobile (Column A) | ValidTill (Column B) |
|-------------------|----------------------|
| 9667618484        | 2029-12-12           |
| 1234567890        | 2025-01-19           |

**Important**:
- First row is header (will be skipped)
- Column A: Mobile number (10 digits, no spaces/dashes)
- Column B: ValidTill date (format: YYYY-MM-DD or YYYY/MM/DD)
- Sheet name should be "Sheet1" (or update range in code)

### Step 6: Test the Integration

#### Test Validation Endpoint:

```bash
curl -X POST http://localhost:3000/api/validate-user \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9667618484"}'
```

**Expected Response (Valid User)**:
```json
{
  "success": true,
  "valid": true,
  "validTill": "2029-12-12",
  "message": "Access verified successfully"
}
```

**Expected Response (Expired User)**:
```json
{
  "success": true,
  "valid": false,
  "validTill": "2024-01-01",
  "message": "Your access expired on January 1, 2024. Please contact admin for renewal."
}
```

**Expected Response (Not Found)**:
```json
{
  "success": true,
  "valid": false,
  "message": "Mobile number not found. Please contact admin."
}
```

## 🐛 Troubleshooting

### Error: "GOOGLE_SHEET_ID not configured"
- Check that `GOOGLE_SHEET_ID` is set in `.env` file
- For Vercel: Check environment variables in dashboard

### Error: "Google credentials file not found"
- Verify `google-credentials.json` exists in `backend/` folder
- Check `GOOGLE_CREDENTIALS_PATH` in `.env` matches file location
- For Vercel: May need to upload credentials differently

### Error: "The caller does not have permission"
- **Most common issue**: Service account doesn't have access to sheet
- Share the Google Sheet with service account email
- Give at least **Viewer** permission

### Error: "Requested entity was not found"
- Check that `GOOGLE_SHEET_ID` is correct
- Verify sheet exists and is accessible
- Check sheet name matches (default: "Sheet1")

### No data found / Empty database
- Check sheet has data (beyond header row)
- Verify range is correct: `Sheet1!A:B`
- Check column order: Mobile in A, ValidTill in B

## 📝 Testing Checklist

- [ ] `google-credentials.json` exists in `backend/` folder
- [ ] Sheet is shared with service account email
- [ ] `GOOGLE_SHEET_ID` is set in `.env`
- [ ] `GOOGLE_CREDENTIALS_PATH` is set correctly
- [ ] `npm install googleapis` completed
- [ ] Sheet has data in correct format
- [ ] Test endpoint returns expected response
- [ ] Frontend validation works correctly

## 🚀 Next Steps

After setup is complete:

1. Test with a valid mobile number from your sheet
2. Test with an expired date
3. Test with a non-existent mobile number
4. Verify frontend shows correct messages
5. Deploy to Vercel with environment variables set

## 📚 Additional Resources

- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Service Account Setup](https://cloud.google.com/iam/docs/service-accounts)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

