import { NextRequest, NextResponse } from 'next/server';
import { getStoreData, saveStoreData } from '@/lib/store';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { runAccountKeepalive } from '@/lib/netflix-keepalive';

async function handleKeepaliveCron(request: NextRequest) {
  // Authorization check:
  // 1. Vercel Cron header with CRON_SECRET
  // 2. Admin token / password
  // 3. Vercel Cron internal header
  const authHeader = request.headers.get('authorization') || '';
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCronHeader = request.headers.get('x-vercel-cron') === '1';

  let isAuthorized = false;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    isAuthorized = true;
  } else if (isVercelCronHeader) {
    isAuthorized = true;
  } else if (verifyAdminRequest(request)) {
    isAuthorized = true;
  } else if (!cronSecret && process.env.NODE_ENV !== 'production') {
    // In local dev without secret, allow for testing
    isAuthorized = true;
  }

  if (!isAuthorized) {
    return NextResponse.json({ ok: false, message: 'Unauthorized cron request' }, { status: 401 });
  }

  try {
    const data = await getStoreData();
    const accounts = data.netflixCookies || [];

    if (accounts.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No accounts in pool to keep alive',
        timestamp: new Date().toISOString(),
        total: 0,
        working: 0,
      });
    }

    const results = [];
    let workingCount = 0;
    let renewedTokensTotal = 0;

    for (const account of accounts) {
      try {
        const report = await runAccountKeepalive(account);

        account.cookies = report.updatedCookies;
        account.lastCheckedAt = report.checkedAt;
        if (report.refreshedAt) {
          account.lastRefreshedAt = report.refreshedAt;
        }
        account.lastResult =
          report.status === 'live' || report.status === 'expiring_soon'
            ? 'working'
            : (report.status as any);
        account.lastDetail = report.detail || report.message;
        account.status = report.status;
        if (report.earliestExpiryIso) {
          account.earliestExpiryIso = report.earliestExpiryIso;
        }
        account.updatedAt = new Date().toISOString();

        if (report.ok) workingCount++;
        renewedTokensTotal += report.renewedCount;

        results.push({
          id: account.id,
          name: account.accountLabel || account.profileName,
          status: report.status,
          renewedCount: report.renewedCount,
          message: report.message,
        });
      } catch (err: any) {
        results.push({
          id: account.id,
          name: account.accountLabel || account.profileName,
          status: 'error',
          renewedCount: 0,
          message: err.message,
        });
      }
    }

    await saveStoreData(data);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      total: accounts.length,
      working: workingCount,
      renewedTokens: renewedTokensTotal,
      results,
    });
  } catch (err: any) {
    console.error('Error in keepalive cron job:', err);
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleKeepaliveCron(request);
}

export async function POST(request: NextRequest) {
  return handleKeepaliveCron(request);
}
