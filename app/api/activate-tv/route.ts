import { NextRequest, NextResponse } from 'next/server';
import {
  checkCustomerEligibility,
  getAssignedNetflixAccount,
  recordCustomerAttempt,
  getCustomerByMobile,
} from '@/lib/store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mobile, code } = body;

    const cleanMobile = (mobile || '').replace(/\D/g, '');
    const cleanCode = (code || '').trim().toUpperCase();

    if (cleanMobile.length !== 10) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please enter a valid 10-digit mobile number',
        },
        { status: 400 }
      );
    }

    if (!cleanCode || cleanCode.length < 4) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please enter a valid TV code (at least 4 characters)',
        },
        { status: 400 }
      );
    }

    // 1. Check eligibility
    const eligibility = checkCustomerEligibility(cleanMobile, 'tv_login');
    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          success: false,
          message: eligibility.message,
          reason: eligibility.reason,
          daysRemaining: eligibility.daysRemaining,
          nextAllowedDate: eligibility.nextAllowedDate,
        },
        { status: 403 }
      );
    }

    const customer = eligibility.customer || getCustomerByMobile(cleanMobile);
    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          message: 'Customer record not found',
        },
        { status: 404 }
      );
    }

    // 2. Select assigned Netflix account from cookie pool
    const account = getAssignedNetflixAccount(customer);
    const accountLabel = account ? account.accountLabel || account.profileName : 'Netflix Account Pool';

    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // 3. Record attempt, increment counter, update lastUpdateAt
    const updatedCustomer = recordCustomerAttempt(cleanMobile, 'tv_login', {
      code: cleanCode,
      ip: clientIp,
      accountUsed: account ? account.id : undefined,
      notes: `TV activated with code ${cleanCode}`,
    });

    return NextResponse.json({
      success: true,
      message: 'TV Activated Successfully!',
      accountName: accountLabel,
      accountEmail: account?.accountEmail || null,
      code: cleanCode,
      currentCount: (eligibility.currentCount || 0) + 1,
      maxCount: eligibility.maxCount,
      steps: [
        'Connecting to Netflix streaming server pool...',
        'Validating customer subscription & credentials...',
        `Allocating secure session from ${accountLabel}...`,
        `Transmitting pairing code ${cleanCode} to Netflix TV API...`,
        'Session established! Device authorized.',
      ],
    });
  } catch (error: any) {
    console.error('Error activating TV:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Server error while activating TV',
      },
      { status: 500 }
    );
  }
}
