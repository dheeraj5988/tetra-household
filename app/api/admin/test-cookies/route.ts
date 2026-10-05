import { NextRequest, NextResponse } from 'next/server';
import { getStoreData, saveStoreData } from '@/lib/store';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { testNetflixCookies } from '@/lib/netflix-cookies';

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

    const data = getStoreData();
    const account = data.netflixCookies.find((a) => a.id === accountId);

    if (!account) {
      return NextResponse.json({ ok: false, message: 'Account not found' }, { status: 404 });
    }

    // Run live test
    const report = await testNetflixCookies(account.cookies || []);

    // Update account with test result
    account.lastCheckedAt = report.checkedAt;
    account.lastResult = report.status;
    account.lastDetail = report.detail || report.message;
    account.status = report.ok ? 'active' : 'expired';
    account.updatedAt = new Date().toISOString();

    saveStoreData(data);

    return NextResponse.json({
      ok: true,
      report,
      account,
    });
  } catch (err: any) {
    console.error('Error running cookie test:', err);
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
