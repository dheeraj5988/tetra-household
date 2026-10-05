import { NextRequest, NextResponse } from 'next/server';
import { checkCustomerEligibility, getCustomerByMobile } from '@/lib/store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mobile, action = 'tv_login' } = body;

    const cleanMobile = (mobile || '').replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      return NextResponse.json(
        {
          eligible: false,
          message: 'Please enter a valid 10-digit mobile number',
        },
        { status: 400 }
      );
    }

    const result = checkCustomerEligibility(cleanMobile, action);

    if (!result.eligible) {
      return NextResponse.json({
        eligible: false,
        reason: result.reason,
        message: result.message,
        daysRemaining: result.daysRemaining,
        nextAllowedDate: result.nextAllowedDate,
        currentCount: result.currentCount,
        maxCount: result.maxCount,
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
    return NextResponse.json(
      {
        eligible: false,
        message: error.message || 'Server error checking customer eligibility',
      },
      { status: 500 }
    );
  }
}
