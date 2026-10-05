import { NextRequest, NextResponse } from 'next/server';
import { getStoreData, saveStoreData } from '@/lib/store';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { testNetflixCookies } from '@/lib/netflix-cookies';

export async function POST(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = getStoreData();
    const accounts = data.netflixCookies || [];

    if (accounts.length === 0) {
      return NextResponse.json({ ok: true, message: 'No accounts in pool', results: [] });
    }

    const results = [];
    let workingCount = 0;

    for (const account of accounts) {
      try {
        const report = await testNetflixCookies(account.cookies || []);
        account.lastCheckedAt = report.checkedAt;
        account.lastResult = report.status;
        account.lastDetail = report.detail || report.message;
        account.status = report.ok ? 'active' : 'expired';
        account.updatedAt = new Date().toISOString();

        if (report.ok) workingCount++;

        results.push({
          id: account.id,
          name: account.accountLabel || account.profileName,
          status: report.status,
          message: report.message,
        });
      } catch (err: any) {
        results.push({
          id: account.id,
          name: account.accountLabel || account.profileName,
          status: 'error',
          message: err.message,
        });
      }
    }

    saveStoreData(data);

    return NextResponse.json({
      ok: true,
      total: accounts.length,
      working: workingCount,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
