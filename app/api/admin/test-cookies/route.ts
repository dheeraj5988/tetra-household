import { NextRequest, NextResponse } from 'next/server';
import { getStoreData, saveStoreData } from '@/lib/store';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { runAccountKeepalive } from '@/lib/netflix-keepalive';

export async function POST(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json({ ok: false, message: 'Missing account ID' }, { status: 400 });
    }

    const data = await getStoreData();
    const account = data.netflixCookies.find((a) => a.id === accountId);

    if (!account) {
      return NextResponse.json({ ok: false, message: 'Account not found' }, { status: 404 });
    }

    // Run keepalive with stored userAgent and cookie renewal
    const report = await runAccountKeepalive(account);

    // Update account with refreshed cookies and test report
    account.cookies = report.updatedCookies;
    account.lastCheckedAt = report.checkedAt;
    if (report.refreshedAt) {
      account.lastRefreshedAt = report.refreshedAt;
    }
    account.lastResult = report.status === 'live' || report.status === 'expiring_soon' ? 'working' : (report.status as any);
    account.lastDetail = report.detail || report.message;
    account.status = report.status;
    if (report.earliestExpiryIso) {
      account.earliestExpiryIso = report.earliestExpiryIso;
    }
    account.updatedAt = new Date().toISOString();

    await saveStoreData(data);

    return NextResponse.json({
      ok: true,
      report,
      account,
    });
  } catch (err: any) {
    console.error('Error running cookie test/keepalive:', err);
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
