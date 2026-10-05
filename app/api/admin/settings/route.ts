import { NextRequest, NextResponse } from 'next/server';
import { getStoreData, saveStoreData } from '@/lib/store';
import { verifyAdminRequest } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { adminPassword, companyName, supportWhatsapp, maxUpdatesPerMonth, cooldownDays } = body;

    const data = getStoreData();

    if (adminPassword && adminPassword.trim()) {
      data.settings.adminPassword = adminPassword.trim();
    }
    if (companyName && companyName.trim()) {
      data.settings.companyName = companyName.trim();
    }
    if (supportWhatsapp !== undefined) {
      data.settings.supportWhatsapp = String(supportWhatsapp).replace(/\D/g, '');
    }
    if (maxUpdatesPerMonth !== undefined) {
      data.settings.maxUpdatesPerMonth = Math.max(1, parseInt(maxUpdatesPerMonth, 10) || 2);
    }
    if (cooldownDays !== undefined) {
      data.settings.cooldownDays = Math.max(1, parseInt(cooldownDays, 10) || 15);
    }

    saveStoreData(data);
    return NextResponse.json({ ok: true, settings: data.settings });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
