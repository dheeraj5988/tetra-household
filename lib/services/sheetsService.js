import { google } from 'googleapis';

/**
 * Google Sheets Service
 * Validates users by checking mobile numbers in Google Sheets
 */
class SheetsService {
  constructor() {
    this.sheets = null;
    this.initialized = false;
  }

  /**
   * Initialize Google Sheets API client
   */
  async initialize() {
    if (this.initialized && this.sheets) {
      return this.sheets;
    }

    try {
      const sheetId = process.env.GOOGLE_SHEET_ID;

      if (!sheetId) {
        throw new Error('GOOGLE_SHEET_ID environment variable is not set');
      }

      console.log('🔐 Initializing Google Sheets API...');
      console.log('📊 Sheet ID:', sheetId);

      let auth;

      // Check if credentials are provided as JSON string (Vercel) or file path (local)
      if (process.env.GOOGLE_CREDENTIALS_JSON) {
        // Vercel: credentials as JSON string in environment variable
        console.log('📄 Using credentials from environment variable');
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        auth = new google.auth.GoogleAuth({
          credentials: credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
      } else {
        // Local: credentials from file
        const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || './backend/google-credentials.json';
        console.log('📄 Credentials path:', credentialsPath);
        auth = new google.auth.GoogleAuth({
          keyFile: credentialsPath,
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
      }

      this.sheets = google.sheets({ version: 'v4', auth });
      this.initialized = true;

      console.log('✅ Google Sheets API initialized successfully');
      return this.sheets;
    } catch (error) {
      console.error('❌ Error initializing Google Sheets API:', error.message);
      throw error;
    }
  }

  /**
   * Validate user by checking mobile number in Google Sheets
   * @param {string} mobileNumber - 10-digit mobile number
   * @returns {Object} - { valid: boolean, validTill: string, message: string }
   */
  async validateUser(mobileNumber) {
    try {
      console.log('🔍 Validating mobile number:', mobileNumber);

      // Validate input
      if (!mobileNumber || mobileNumber.length !== 10) {
        return {
          valid: false,
          message: 'Invalid mobile number format. Must be 10 digits.',
        };
      }

      // Initialize Sheets API if not already done
      await this.initialize();

      const sheetId = process.env.GOOGLE_SHEET_ID;
      const range = 'Sheet1!A:B'; // Column A: Mobile, Column B: ValidTill

      console.log('📊 Fetching data from Google Sheets...');
      console.log('📋 Range:', range);

      // Fetch data from Google Sheets
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
      });

      const rows = response.data.values;

      if (!rows || rows.length === 0) {
        console.log('❌ No data found in spreadsheet');
        return {
          valid: false,
          message: 'Database is empty. Please contact admin.',
        };
      }

      console.log(`📊 Found ${rows.length} rows in spreadsheet`);

      // Skip header row (index 0) and search for mobile number
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const mobile = row[0]?.toString().trim();
        const validTill = row[1]?.toString().trim();

        if (mobile === mobileNumber) {
          console.log('✅ Mobile number found:', mobile);
          console.log('📅 Valid till:', validTill);

          // Check if date is valid
          if (!validTill) {
            return {
              valid: false,
              message: 'Invalid data in database. Please contact admin.',
            };
          }

          // Compare dates
          const validTillDate = new Date(validTill);
          const currentDate = new Date();

          // Validate date format
          if (isNaN(validTillDate.getTime())) {
            console.log('❌ Invalid date format:', validTill);
            return {
              valid: false,
              message: 'Invalid date format in database. Please contact admin.',
            };
          }

          // Set time to start of day for accurate comparison
          validTillDate.setHours(0, 0, 0, 0);
          currentDate.setHours(0, 0, 0, 0);

          if (validTillDate >= currentDate) {
            console.log('✅ User is valid');
            return {
              valid: true,
              validTill: validTill,
              message: 'Access verified successfully',
            };
          } else {
            console.log('⚠️ User access expired');
            const formattedDate = validTillDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
            return {
              valid: false,
              validTill: validTill,
              message: `Your access expired on ${formattedDate}. Please contact admin for renewal.`,
            };
          }
        }
      }

      // Mobile number not found
      console.log('❌ Mobile number not found in database');
      return {
        valid: false,
        message: 'Mobile number not found. Please contact admin.',
      };
    } catch (error) {
      console.error('❌ Error validating user:', error.message);
      console.error('Error details:', error);

      // Provide helpful error messages
      if (error.message.includes('GOOGLE_SHEET_ID')) {
        return {
          valid: false,
          message: 'Server configuration error. Please contact admin.',
          error: 'GOOGLE_SHEET_ID not configured',
        };
      }

      if (error.message.includes('ENOENT') || error.message.includes('credentials')) {
        return {
          valid: false,
          message: 'Server configuration error. Please contact admin.',
          error: 'Google credentials file not found',
        };
      }

      return {
        valid: false,
        message: 'Failed to validate user. Please try again later.',
        error: error.message,
      };
    }
  }
}

// Export singleton instance
const sheetsService = new SheetsService();

export async function validateUser(mobileNumber) {
  return await sheetsService.validateUser(mobileNumber);
}

export default sheetsService;

