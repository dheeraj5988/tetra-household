import { NextRequest, NextResponse } from 'next/server';
import { getStoreData, saveStoreData, NetflixAccount } from '@/lib/store';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { parseCookieJson } from '@/lib/netflix-cookies';

export async function POST(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, profileName, accountLabel, accountEmail, cookiesRaw, cookies } = body;

    let parsedCookies = cookies;
    let cookieStatus: 'active' | 'expired' | 'unknown' = 'unknown';

    if (typeof cookiesRaw === 'string' && cookiesRaw.trim()) {
      const parsed = parseCookieJson(cookiesRaw);
      if (!parsed.ok) {
        return NextResponse.json({ ok: false, message: parsed.error || 'Invalid cookie JSON' }, { status: 400 });
      }
      parsedCookies = parsed.cookies;
      cookieStatus = parsed.status;
    }

    if (!Array.isArray(parsedCookies) || parsedCookies.length === 0) {
      return NextResponse.json(
        { ok: false, message: 'Please provide valid cookie data' },
        { status: 400 }
      );
    }

    const data = getStoreData();
    const nowIso = new Date().toISOString();
    const name = (profileName || accountLabel || 'Netflix Account').trim();
    const label = (accountLabel || profileName || 'Netflix Account').trim();

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
        cookies: parsedCookies,
        status: cookieStatus !== 'unknown' ? cookieStatus : data.netflixCookies[index].status,
        updatedAt: nowIso,
      };
      data.netflixCookies[index] = account;
    } else {
      account = {
        id: 'nflx-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        profileName: name,
        accountLabel: label,
        accountEmail: accountEmail || '',
        cookies: parsedCookies,
        status: cookieStatus,
        lastCheckedAt: null,
        lastResult: null,
        lastDetail: 'Imported, ready to test',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      data.netflixCookies.unshift(account);
    }

    saveStoreData(data);
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

    const data = getStoreData();
    data.netflixCookies = data.netflixCookies.filter((a) => a.id !== id);

    // Unassign from customers who were pinned to this account
    for (const c of data.customers) {
      if (c.assignedAccountId === id) {
        c.assignedAccountId = null;
      }
    }

    saveStoreData(data);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
