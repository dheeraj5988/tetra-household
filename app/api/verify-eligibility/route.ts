import { NextRequest, NextResponse } from 'next/server';
import { checkCustomerEligibility, getCustomerByMobile } from '@/lib/store';

const WHATSAPP_NUMBER = '919772880079';

function createWhatsAppLink(mobile: string, issue: string): string {
  const msg = `Hi Tetra Digital Services, I need help with Netflix verification for mobile number: ${mobile || 'N/A'}.\nIssue: ${issue}`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

export async function POST(request: NextRequest) {
  let cleanMobile = '';
  try {
    const body = await request.json();
    const { mobile, action = 'tv_login' } = body;

    cleanMobile = (mobile || '').replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      const msg = 'Please enter a valid 10-digit mobile number';
      return NextResponse.json(
        {
          eligible: false,
          message: msg,
          whatsappUrl: createWhatsAppLink(cleanMobile, msg),
        },
        { status: 400 }
      );
    }

    const result = await checkCustomerEligibility(cleanMobile, action);

    if (!result.eligible) {
      return NextResponse.json({
        eligible: false,
        reason: result.reason,
        message: result.message,
        daysRemaining: result.daysRemaining,
        nextAllowedDate: result.nextAllowedDate,
        currentCount: result.currentCount,
        maxCount: result.maxCount,
        whatsappUrl: createWhatsAppLink(cleanMobile, result.message),
        customer: result.customer
          ? {
              mobile: result.customer.mobile,
              service: result.customer.service,
              expiryDate: result.customer.expiryDate,
            }
          : undefined,
      });
    }

    return NextResponse.json({
      eligible: true,
      message: 'User is eligible',
      currentCount: result.currentCount,
      maxCount: result.maxCount,
      customer: {
        mobile: result.customer?.mobile,
        service: result.customer?.service,
        expiryDate: result.customer?.expiryDate,
        subscriptionDate: result.customer?.subscriptionDate,
        validity: result.customer?.validity,
      },
    });
  } catch (error: any) {
    console.error('Error verifying customer eligibility:', error);
    const msg = error.message || 'Server error checking customer eligibility';
    return NextResponse.json(
      {
        eligible: false,
        message: msg,
        whatsappUrl: createWhatsAppLink(cleanMobile, msg),
      },
      { status: 500 }
    );
  }
}
