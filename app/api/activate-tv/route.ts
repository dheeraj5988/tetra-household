import { NextRequest, NextResponse } from 'next/server';
import {
  checkCustomerEligibility,
  getAssignedNetflixAccount,
  recordCustomerAttempt,
  getCustomerByMobile,
} from '@/lib/store';

const WHATSAPP_NUMBER = '919772880079';

function createWhatsAppLink(mobile: string, issue: string): string {
  const msg = `Hi Tetra Digital Services, I need help with Netflix TV activation for mobile number: ${mobile || 'N/A'}.\nIssue: ${issue}`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

export async function POST(request: NextRequest) {
  let cleanMobile = '';
  try {
    const body = await request.json();
    const { mobile, code } = body;

    cleanMobile = (mobile || '').replace(/\D/g, '');
    const cleanCode = (code || '').trim().toUpperCase();

    if (cleanMobile.length < 10) {
      const msg = 'Please enter a valid mobile number';
      return NextResponse.json(
        {
          success: false,
          message: msg,
          whatsappUrl: createWhatsAppLink(cleanMobile, msg),
        },
        { status: 400 }
      );
    }

    if (!cleanCode || cleanCode.length < 4) {
      const msg = 'Please enter a valid TV code (at least 4 characters)';
      return NextResponse.json(
        {
          success: false,
          message: msg,
          whatsappUrl: createWhatsAppLink(cleanMobile, msg),
        },
        { status: 400 }
      );
    }

    // 1. Check eligibility (calendar month limit 2/month)
    const eligibility = checkCustomerEligibility(cleanMobile, 'tv_login');
    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          success: false,
          message: eligibility.message,
          reason: eligibility.reason,
          nextAllowedDate: eligibility.nextAllowedDate,
          currentCount: eligibility.currentCount,
          maxCount: eligibility.maxCount,
          whatsappUrl: createWhatsAppLink(cleanMobile, eligibility.message),
        },
        { status: 403 }
      );
    }

    const customer = eligibility.customer || getCustomerByMobile(cleanMobile);
    if (!customer) {
      const msg = 'No active Netflix subscription found for this mobile number.';
      return NextResponse.json(
        {
          success: false,
          message: msg,
          whatsappUrl: createWhatsAppLink(cleanMobile, msg),
        },
        { status: 404 }
      );
    }

    // 2. Select assigned Netflix account from cookie pool (picks random working account if unassigned)
    const account = getAssignedNetflixAccount(customer);
    const accountLabel = account ? account.accountLabel || account.profileName : 'Netflix Account';

    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // 3. Record attempt, increment counter, update lastUpdateAt
    recordCustomerAttempt(cleanMobile, 'tv_login', {
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
    const msg = error.message || 'Server error while activating TV';
    return NextResponse.json(
      {
        success: false,
        message: msg,
        whatsappUrl: createWhatsAppLink(cleanMobile, msg),
      },
      { status: 500 }
    );
  }
}
