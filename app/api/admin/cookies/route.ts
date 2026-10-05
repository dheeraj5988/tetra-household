import { NextRequest, NextResponse } from 'next/server';
import { getStoreData, saveStoreData, NetflixAccount } from '@/lib/store';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { parseCookieJson } from '@/lib/netflix-cookies';
import { deleteRedisAccountSession } from '@/lib/redis';
import { deleteSupabaseAccount } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      id,
      profileName,
      accountLabel,
      accountEmail,
      cookiesRaw,
      cookies,
      userAgent: inputUserAgent,
      deviceMetadata,
    } = body;

    let parsedCookies = cookies;
    let cookieStatus: 'active' | 'expired' | 'unknown' = 'unknown';
    let earliestExpiry: number | null = null;
    let earliestExpiryIso: string | null = null;

    if (typeof cookiesRaw === 'string' && cookiesRaw.trim()) {
      const parsed = parseCookieJson(cookiesRaw);
      if (!parsed.ok) {
        return NextResponse.json(
          { ok: false, message: parsed.error || 'Invalid cookie JSON' },
          { status: 400 }
        );
      }
      parsedCookies = parsed.cookies;
      cookieStatus = parsed.status;
      earliestExpiry = parsed.earliestExpiry;
      earliestExpiryIso = parsed.earliestExpiryIso;
    } else if (Array.isArray(parsedCookies)) {
      const expiries = parsedCookies
        .map((c: any) => c.expirationDate)
        .filter((e): e is number => typeof e === 'number' && e > 0);
      earliestExpiry = expiries.length ? Math.min(...expiries) : null;
      earliestExpiryIso = earliestExpiry
        ? new Date(earliestExpiry * 1000).toISOString()
        : null;
    }

    if (!Array.isArray(parsedCookies) || parsedCookies.length === 0) {
      return NextResponse.json(
        { ok: false, message: 'Please provide valid cookie data' },
        { status: 400 }
      );
    }

    // Capture User-Agent: use input or request's User-Agent, with fallback to desktop Chrome
    const clientUserAgent =
      (inputUserAgent && inputUserAgent.trim()) ||
      request.headers.get('user-agent') ||
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

    const data = await getStoreData();
    const nowIso = new Date().toISOString();
    const name = (profileName || accountLabel || 'Netflix Account').trim();
    const label = (accountLabel || profileName || 'Netflix Account').trim();

    // Determine initial status based on expiry
    const nowMs = Date.now();
    const isLocallyExpired =
      earliestExpiry !== null && earliestExpiry * 1000 < nowMs;
    const isExpiringSoon =
      earliestExpiry !== null &&
      earliestExpiry * 1000 - nowMs < 7 * 24 * 60 * 60 * 1000;

    const initialStatus = isLocallyExpired
      ? 'expired'
      : isExpiringSoon
        ? 'expiring_soon'
        : 'live';

    let account: NetflixAccount;
    if (id) {
      const index = data.netflixCookies.findIndex((a) => a.id === id);
      if (index === -1) {
        return NextResponse.json({ ok: false, message: 'Account not found' }, { status: 404 });
      }
      account = {
        ...data.netflixCookies[index],
        profileName: name,
        accountLabel: label,
        accountEmail: accountEmail || '',
        userAgent: clientUserAgent,
        deviceMetadata: deviceMetadata || data.netflixCookies[index].deviceMetadata,
        cookies: parsedCookies,
        status: initialStatus,
        earliestExpiry,
        earliestExpiryIso,
        updatedAt: nowIso,
      };
      data.netflixCookies[index] = account;
    } else {
      account = {
        id: 'nflx-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        profileName: name,
        accountLabel: label,
        accountEmail: accountEmail || '',
        userAgent: clientUserAgent,
        deviceMetadata: deviceMetadata || {
          platform: 'web',
          importedAt: nowIso,
        },
        cookies: parsedCookies,
        status: initialStatus,
        earliestExpiry,
        earliestExpiryIso,
        lastCheckedAt: null,
        lastRefreshedAt: null,
        lastResult: null,
        lastDetail: 'Imported, ready to test and keep alive',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      data.netflixCookies.unshift(account);
    }

    await saveStoreData(data);
    return NextResponse.json({ ok: true, account });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: false, message: 'Missing account ID' }, { status: 400 });
    }

    const data = await getStoreData();
    data.netflixCookies = data.netflixCookies.filter((a) => a.id !== id);

    // Unassign from customers who were pinned to this account
    for (const c of data.customers) {
      if (c.assignedAccountId === id) {
        c.assignedAccountId = null;
      }
    }

    await saveStoreData(data);
    await deleteRedisAccountSession(id);
    await deleteSupabaseAccount(id);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
