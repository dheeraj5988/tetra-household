import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Columns the app writes to each table. Used only to report what is missing.
const EXPECTED_COLUMNS: Record<string, string[]> = {
  cookie_pool: [
    'id', 'platform', 'profile_name', 'account_label', 'account_email', 'user_agent',
    'device_metadata', 'cookies', 'status', 'earliest_expiry', 'earliest_expiry_iso',
    'last_checked_at', 'last_refreshed_at', 'last_result', 'last_detail',
    'consecutive_failures', 'created_at', 'updated_at',
  ],
  subscribers: [
    'id', 'mobile', 'service', 'subscription_date', 'validity', 'expiry_date',
    'assigned_account_id', 'is_blocked', 'total_updates', 'last_update_at', 'history',
    'created_at', 'updated_at',
  ],
  activations: ['id', 'mobile', 'action', 'code', 'ip', 'status', 'account_used', 'created_at'],
  app_settings: ['id', 'company_name', 'support_whatsapp', 'max_updates_per_month', 'updated_at'],
};

type TableReport = {
  exists: boolean;
  rows?: number | null;
  missingColumns?: string[];
  idAcceptsText?: boolean;
  anonCanRead?: boolean;
  error?: string;
};

/**
 * Public health check. Reports storage configuration and table shape only,
 * never row contents.
 */
export async function GET() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const publishableKey = (process.env.SUPABASE_PUBLISHABLE_KEY || '').trim();

  const env = {
    SUPABASE_URL: Boolean(url),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(serviceKey),
    SUPABASE_PUBLISHABLE_KEY: Boolean(publishableKey),
    ADMIN_PASSWORD: Boolean(process.env.ADMIN_PASSWORD),
    ADMIN_SESSION_SECRET: Boolean(process.env.ADMIN_SESSION_SECRET),
    CRON_SECRET: Boolean(process.env.CRON_SECRET),
  };

  if (!url || !serviceKey) {
    return NextResponse.json(
      {
        status: 'error',
        storage: 'error',
        message: !url
          ? 'SUPABASE_URL is not set'
          : 'SUPABASE_SERVICE_ROLE_KEY is not set',
        env,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  const opts = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(url, serviceKey, opts);
  const anon = publishableKey ? createClient(url, publishableKey, opts) : null;

  const tables: Record<string, TableReport> = {};
  await Promise.all(
    Object.entries(EXPECTED_COLUMNS).map(async ([table, columns]) => {
      const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        tables[table] = { exists: false, error: error.message || error.code || 'unknown error' };
        return;
      }

      const missing: string[] = [];
      await Promise.all(
        columns.map(async (col) => {
          const { error: colErr } = await admin.from(table).select(col).limit(0);
          if (colErr) missing.push(col);
        })
      );

      const { error: idErr } = await admin.from(table).select('id').eq('id', 'text-id-probe').limit(1);

      let anonCanRead: boolean | undefined;
      if (anon) {
        const { data, error: anonErr } = await anon.from(table).select('id').limit(1);
        anonCanRead = !anonErr && Array.isArray(data) && data.length > 0;
      }

      tables[table] = {
        exists: true,
        rows: count,
        missingColumns: missing.sort(),
        idAcceptsText: !idErr,
        anonCanRead,
      };
    })
  );

  const ok = Object.values(tables).every((t) => t.exists);
  return NextResponse.json(
    {
      status: ok ? 'ok' : 'error',
      storage: ok ? 'Supabase (permanent)' : 'error',
      env,
      tables,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 }
  );
}
