import { NextRequest, NextResponse } from 'next/server';
import { normalizeMobile, recordTvLogin, nextMonthLabel, TvLoginResult } from '@/lib/store';
import { clientIp, describeError, whatsappLink } from '@/lib/api-response';

function failureMessage(r: TvLoginResult): string {
  switch (r.reason) {
    case 'not_found':
      return 'No active Netflix subscription found for this mobile number. Please check your number or contact support on WhatsApp.';
    case 'blocked':
      return 'Your access has been blocked. Please contact support on WhatsApp.';
    case 'expired':
      return `Your Netflix subscription expired${r.expiryDate ? ` on ${r.expiryDate}` : ''}. Please renew to continue.`;
    case 'monthly_limit':
      return `Monthly TV login limit reached: you have used ${r.used}/${r.max} TV logins this month. Your limit resets on ${nextMonthLabel()}.`;
    case 'account_unavailable':
      return 'Your linked Netflix account is being refreshed. Please contact support on WhatsApp.';
    case 'no_account':
      return 'No Netflix account is available right now. Please contact support on WhatsApp.';
    default:
      return 'TV login failed. Please contact support on WhatsApp.';
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const raw = String(body?.mobile || '').replace(/\D/g, '');
  const mobile = normalizeMobile(raw);
  const code = String(body?.code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  const fail = (message: string, status: number, extra: Record<string, unknown> = {}) =>
    NextResponse.json({ success: false, message, whatsappUrl: whatsappLink(mobile || raw, message), ...extra }, { status });

  if (!mobile) return fail('Please enter a valid 10-digit mobile number', 400);
  if (code.length < 4) return fail('Please enter a valid TV code (at least 4 characters)', 400);

  try {
    const r = await recordTvLogin(mobile, code, clientIp(request));
    if (!r.ok) {
      return fail(failureMessage(r), r.reason === 'not_found' ? 404 : 403, {
        reason: r.reason,
        currentCount: r.used,
        maxCount: r.max,
        nextAllowedDate: r.reason === 'monthly_limit' ? nextMonthLabel() : undefined,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'TV login recorded',
      accountName: r.accountLabel || 'Netflix Account',
      accountEmail: r.accountEmail || null,
      code,
      currentCount: r.used,
      maxCount: r.max,
    });
  } catch (err) {
    const { status, message } = describeError(err);
    return fail(status === 503 ? 'Service temporarily unavailable. Please contact support on WhatsApp.' : message, status);
  }
}
