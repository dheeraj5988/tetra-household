import { NextRequest, NextResponse } from 'next/server';
import { getStoreData, saveStoreData, getActiveStorageStatus, AppData } from '@/lib/store';
import { verifyAdminRequest } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const data = await getStoreData();
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const startOfDayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonthIso = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Compute metrics
  const totalSubscribers = data.customers.length;
  const activeSubscribers = data.customers.filter(
    (c) => (!c.expiryDate || c.expiryDate >= todayIso) && !c.isBlocked
  ).length;
  const expiredSubscribers = data.customers.filter(
    (c) => c.expiryDate && c.expiryDate < todayIso
  ).length;
  const blockedSubscribers = data.customers.filter((c) => c.isBlocked).length;

  const logs = data.activationsLog || [];
  const activationsToday = logs.filter((l) => l.timestamp >= startOfDayIso).length;
  const activationsMonth = logs.filter((l) => l.timestamp >= startOfMonthIso).length;

  const cookieAccounts = data.netflixCookies || [];
  const activeCookies = cookieAccounts.filter(
    (c) => c.status === 'live' || c.status === 'expiring_soon' || c.lastResult === 'working'
  ).length;

  const metrics = {
    totalSubscribers,
    activeSubscribers,
    expiredSubscribers,
    blockedSubscribers,
    activationsToday,
    activationsMonth,
    totalCookieAccounts: cookieAccounts.length,
    activeCookies,
  };

  const storageStatus = await getActiveStorageStatus();

  return NextResponse.json({
    ok: true,
    storage: {
      provider: storageStatus.provider,
      label: storageStatus.label,
      isPersistent: storageStatus.isPersistent,
      details: storageStatus.details,
    },
    data: {
      customers: data.customers,
      netflixCookies: data.netflixCookies,
      settings: data.settings,
      activationsLog: data.activationsLog,
      metrics,
    },
  });
}

export async function POST(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { restoreData } = body;

    if (!restoreData || !Array.isArray(restoreData.customers)) {
      return NextResponse.json({ ok: false, message: 'Invalid backup format' }, { status: 400 });
    }

    const current = await getStoreData();
    const updated: AppData = {
      customers: restoreData.customers || current.customers,
      netflixCookies: restoreData.netflixCookies || current.netflixCookies,
      settings: { ...current.settings, ...(restoreData.settings || {}) },
      activationsLog: restoreData.activationsLog || current.activationsLog,
    };

    await saveStoreData(updated);
    return NextResponse.json({ ok: true, message: 'Database synced successfully' });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
