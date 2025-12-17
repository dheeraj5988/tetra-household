import { NextRequest, NextResponse } from 'next/server';
import GmailService from '@/lib/services/gmailService';
import { extractNetflixLink, isNetflixVerificationEmail } from '@/lib/utils/emailParser';

export const maxDuration = 60; // 60 seconds for Vercel serverless functions

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const minutesAgo = parseInt(searchParams.get('minutes') || '30', 10);

    console.log(`🔍 Searching for Netflix emails from last ${minutesAgo} minutes...`);

    const gmailService = new GmailService();
    const email = await gmailService.getLatestNetflixEmail(minutesAgo);

    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'No recent verification email found',
        message: `No emails found from Netflix in the last ${minutesAgo} minutes`,
      });
    }

    if (!isNetflixVerificationEmail(email)) {
      console.log('⚠️ Email found but does not appear to be a verification email');
      return NextResponse.json({
        success: false,
        error: 'Email found but not a verification email',
        message: 'The email does not match Netflix verification email patterns',
      });
    }

    const link = extractNetflixLink(email);

    if (!link) {
      console.log('⚠️ Email found but no verification link could be extracted');
      return NextResponse.json({
        success: false,
        error: 'No verification link found in email',
        message: 'Could not extract a verification URL from the email content',
        emailDate: email.date?.toISOString() || null,
      });
    }

    console.log('✅ Successfully extracted Netflix verification link');

    return NextResponse.json({
      success: true,
      link: link,
      emailDate: email.date?.toISOString() || null,
      subject: email.subject || null,
      from: email.from?.value?.[0]?.address || null,
    });
  } catch (error: any) {
    console.error('❌ Error fetching Netflix link:', error);

    if (error.message?.includes('GMAIL_USER') || error.message?.includes('GMAIL_APP_PASSWORD')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gmail configuration error',
          message: error.message,
        },
        { status: 500 }
      );
    }

    if (error.message?.includes('authentication') || error.message?.includes('Invalid credentials')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gmail authentication failed',
          message: 'Please check your Gmail credentials in environment variables',
        },
        { status: 401 }
      );
    }

    if (error.message?.includes('timeout') || error.message?.includes('ECONNREFUSED')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Connection timeout',
          message: 'Could not connect to Gmail. Please check your internet connection.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch Netflix link',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

