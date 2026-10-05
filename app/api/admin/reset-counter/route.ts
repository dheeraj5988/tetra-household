import { NextRequest, NextResponse } from 'next/server';
import { resetCustomerCooldown } from '@/lib/store';
import { verifyAdminRequest } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { customerId } = body;

    if (!customerId) {
      return NextResponse.json({ ok: false, message: 'Missing customer ID' }, { status: 400 });
    }

    const success = await resetCustomerCooldown(customerId);
    if (!success) {
      return NextResponse.json({ ok: false, message: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      message: 'Cooldown reset. Customer can now make an immediate update / login attempt.',
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
