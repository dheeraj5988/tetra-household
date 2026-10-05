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
    const {
      id,
      mobile,
      service = 'Netflix',
      subscriptionDate,
      validity = '1 Month',
      expiryDate,
      assignedAccountId = null,
      isBlocked = false,
    } = body;

    const cleanMobile = (mobile || '').replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      return NextResponse.json(
        { ok: false, message: 'Please enter a valid 10-digit mobile number' },
        { status: 400 }
      );
    }

    const subDate = subscriptionDate || new Date().toISOString().slice(0, 10);
    const expDate = expiryDate || calculateExpiryDate(subDate, validity);

    const data = getStoreData();
    const nowIso = new Date().toISOString();

    let customer: Customer;
    if (id) {
      // Edit existing
      const index = data.customers.findIndex((c) => c.id === id);
      if (index === -1) {
        return NextResponse.json({ ok: false, message: 'Customer not found' }, { status: 404 });
      }
      customer = {
        ...data.customers[index],
        mobile: cleanMobile,
        service: service || 'Netflix',
        subscriptionDate: subDate,
        validity,
        expiryDate: expDate,
        assignedAccountId: assignedAccountId || null,
        isBlocked: !!isBlocked,
        updatedAt: nowIso,
      };
      data.customers[index] = customer;
    } else {
      // Check for duplicate mobile
      const existing = data.customers.find((c) => c.mobile.replace(/\D/g, '') === cleanMobile);
      if (existing) {
        return NextResponse.json(
          { ok: false, message: 'A customer with this mobile number already exists' },
          { status: 400 }
        );
      }

      customer = {
        id: 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        mobile: cleanMobile,
        service: service || 'Netflix',
        subscriptionDate: subDate,
        validity,
        expiryDate: expDate,
        assignedAccountId: assignedAccountId || null,
        isBlocked: !!isBlocked,
        totalUpdates: 0,
        lastUpdateAt: null,
        history: [],
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      data.customers.unshift(customer);
    }

    saveStoreData(data);
    return NextResponse.json({ ok: true, customer });
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
      return NextResponse.json({ ok: false, message: 'Missing customer ID' }, { status: 400 });
    }

    const data = getStoreData();
    data.customers = data.customers.filter((c) => c.id !== id);
    saveStoreData(data);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}
