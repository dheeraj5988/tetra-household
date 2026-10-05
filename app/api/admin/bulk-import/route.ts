import { NextRequest, NextResponse } from 'next/server';
import { getStoreData, saveStoreData, Customer } from '@/lib/store';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { calculateExpiryDate } from '@/lib/validity';

export async function POST(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { rows } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ ok: false, message: 'No rows provided' }, { status: 400 });
    }

    const data = getStoreData();
    const nowIso = new Date().toISOString();
    let importedCount = 0;
    let updatedCount = 0;

    for (const r of rows) {
      const cleanMobile = (r.mobile || '').replace(/\D/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanMobile)) continue;

      const subDate = r.subscriptionDate || new Date().toISOString().slice(0, 10);
      const validity = r.validity || '1 Month';
      const expDate = r.expiryDate || calculateExpiryDate(subDate, validity);
      const service = r.service || 'Netflix';

      const existingIndex = data.customers.findIndex(
        (c) => c.mobile.replace(/\D/g, '') === cleanMobile
      );

      if (existingIndex !== -1) {
        // Update existing
        data.customers[existingIndex].subscriptionDate = subDate;
        data.customers[existingIndex].validity = validity;
        data.customers[existingIndex].expiryDate = expDate;
        data.customers[existingIndex].service = service;
        data.customers[existingIndex].updatedAt = nowIso;
        updatedCount++;
      } else {
        // Add new
        const newCust: Customer = {
          id: 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          mobile: cleanMobile,
          service,
          subscriptionDate: subDate,
          validity,
          expiryDate: expDate,
          assignedAccountId: null,
          isBlocked: false,
          totalUpdates: 0,
          lastUpdateAt: null,
          history: [],
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        data.customers.unshift(newCust);
        importedCount++;
      }
    }

    saveStoreData(data);

    return NextResponse.json({
      ok: true,
      message: `Successfully processed: ${importedCount} added, ${updatedCount} updated.`,
      importedCount,
      updatedCount,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
