import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppData, NetflixAccount, Customer, ActivationLogItem, AppSettings, loadInitialSeed } from './store';

let supabaseClient: SupabaseClient | null = null;
let supabaseInitialized = false;

export function getSupabaseCredentials(): { url: string; key: string; keyType: 'service_role' | 'publishable' | 'none' } {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

  const key = serviceRoleKey || publishableKey;
  const keyType = serviceRoleKey ? 'service_role' : publishableKey ? 'publishable' : 'none';

  return {
    url: url.trim(),
    key: key.trim(),
    keyType,
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseCredentials();
  return Boolean(url && key);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInitialized) return supabaseClient;

  const { url, key } = getSupabaseCredentials();
  if (url && key) {
    try {
      supabaseClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      console.log('Connected to Supabase client');
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      supabaseClient = null;
    }
  } else {
    supabaseClient = null;
  }

  supabaseInitialized = true;
  return supabaseClient;
}

/**
 * Tests whether Supabase tables exist and can be queried.
 */
export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string; tablesExist: boolean }> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: 'SUPABASE_URL or API key not configured in environment', tablesExist: false };
  }

  try {
    const { error } = await client.from('cookie_pool').select('id').limit(1);
    if (error) {
      if (error.code === '42P01' || error.message.includes('relation "public.cookie_pool" does not exist')) {
        return { ok: false, message: 'Supabase connected, but tables do not exist yet. Please run the SQL schema.', tablesExist: false };
      }
      return { ok: false, message: `Supabase error: ${error.message}`, tablesExist: false };
    }
    return { ok: true, message: 'Supabase tables exist and connected', tablesExist: true };
  } catch (err: any) {
    return { ok: false, message: err.message || 'Connection test failed', tablesExist: false };
  }
}

/**
 * Loads AppData from Supabase tables:
 * - cookie_pool
 * - subscribers
 * - activations
 * - app_settings
 */
export async function getSupabaseStoreData(): Promise<AppData | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    // 1. Fetch cookie_pool
    const { data: cookieRows, error: cookieErr } = await client
      .from('cookie_pool')
      .select('*')
      .order('created_at', { ascending: false });

    if (cookieErr) {
      // If table doesn't exist yet, fall back gracefully
      console.warn('Supabase cookie_pool read failed:', cookieErr.message);
      return null;
    }

    // 2. Fetch subscribers
    const { data: subscriberRows, error: subErr } = await client
      .from('subscribers')
      .select('*')
      .order('created_at', { ascending: false });

    if (subErr) {
      console.warn('Supabase subscribers read failed:', subErr.message);
      return null;
    }

    // 3. Fetch app_settings
    const { data: settingsRow } = await client
      .from('app_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    // 4. Fetch activations
    const { data: activationRows } = await client
      .from('activations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);

    // Map cookies
    const netflixCookies: NetflixAccount[] = (cookieRows || []).map((r: any) => ({
      id: r.id,
      profileName: r.profile_name || 'Netflix Account',
      accountLabel: r.account_label || r.profile_name || 'Netflix Account',
      accountEmail: r.account_email || '',
      userAgent: r.user_agent || '',
      deviceMetadata: r.device_metadata || undefined,
      cookies: Array.isArray(r.cookies) ? r.cookies : [],
      status: r.status || 'live',
      earliestExpiry: r.earliest_expiry ? Number(r.earliest_expiry) : null,
      earliestExpiryIso: r.earliest_expiry_iso || null,
      lastCheckedAt: r.last_checked_at || null,
      lastRefreshedAt: r.last_refreshed_at || null,
      lastResult: r.last_result || null,
      lastDetail: r.last_detail || '',
      consecutiveFailures: r.consecutive_failures || 0,
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || new Date().toISOString(),
    }));

    // Map subscribers to Customer model
    const customers: Customer[] = (subscriberRows || []).map((r: any) => ({
      id: r.id,
      mobile: String(r.mobile),
      service: r.service || 'Netflix 4K',
      subscriptionDate: r.subscription_date || r.start_date || new Date().toISOString().slice(0, 10),
      validity: r.validity || '1 Month',
      expiryDate: r.expiry_date || '',
      assignedAccountId: r.assigned_account_id || null,
      isBlocked: Boolean(r.is_blocked),
      totalUpdates: Number(r.total_updates) || 0,
      lastUpdateAt: r.last_update_at || null,
      history: Array.isArray(r.history) ? r.history : [],
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || new Date().toISOString(),
    }));

    // Map settings
    const settings: AppSettings = {
      adminPassword: settingsRow?.admin_password || '6Ce0hegpwr8.',
      companyName: settingsRow?.company_name || 'Tetra Digital Services',
      supportWhatsapp: settingsRow?.support_whatsapp || '919772880079',
      maxUpdatesPerMonth: Number(settingsRow?.max_updates_per_month) || 2,
      cooldownDays: Number(settingsRow?.cooldown_days) || 15,
      logRetentionDays: Number(settingsRow?.log_retention_days) || 90,
    };

    // Map activations
    const activationsLog: ActivationLogItem[] = (activationRows || []).map((r: any) => ({
      id: r.id,
      mobile: String(r.mobile),
      action: (r.action as any) || 'tv_login',
      code: r.code || undefined,
      ip: r.ip || 'unknown',
      status: (r.status as any) || 'success',
      accountUsed: r.account_used || r.cookie_id || undefined,
      timestamp: r.created_at || new Date().toISOString(),
    }));

    // If database tables are empty on first run, auto-seed with initial seed data
    if (customers.length === 0 && netflixCookies.length === 0) {
      const seed = loadInitialSeed();
      await saveSupabaseStoreData(seed);
      return seed;
    }

    return {
      customers,
      netflixCookies,
      settings,
      activationsLog,
    };
  } catch (err: any) {
    console.error('Error in getSupabaseStoreData:', err);
    return null;
  }
}

/**
 * Persists AppData to Supabase tables.
 */
export async function saveSupabaseStoreData(data: AppData): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const nowIso = new Date().toISOString();

    // 1. Upsert cookie_pool
    if (Array.isArray(data.netflixCookies) && data.netflixCookies.length > 0) {
      const cookiePayload = data.netflixCookies.map((acc) => ({
        id: acc.id,
        platform: 'netflix',
        profile_name: acc.profileName,
        account_label: acc.accountLabel || acc.profileName,
        account_email: acc.accountEmail || '',
        user_agent: acc.userAgent || '',
        device_metadata: acc.deviceMetadata || {},
        cookies: acc.cookies || [],
        status: acc.status || 'live',
        earliest_expiry: acc.earliestExpiry || null,
        earliest_expiry_iso: acc.earliestExpiryIso || null,
        last_checked_at: acc.lastCheckedAt || null,
        last_refreshed_at: acc.lastRefreshedAt || null,
        last_result: acc.lastResult || null,
        last_detail: acc.lastDetail || '',
        consecutive_failures: acc.consecutiveFailures || 0,
        updated_at: nowIso,
      }));

      const { error: cookieErr } = await client.from('cookie_pool').upsert(cookiePayload, { onConflict: 'id' });
      if (cookieErr) {
        console.error('Error saving cookie_pool to Supabase:', cookieErr.message);
      }
    }

    // 2. Upsert subscribers (customers)
    if (Array.isArray(data.customers) && data.customers.length > 0) {
      const subPayload = data.customers.map((c) => ({
        id: c.id,
        mobile: c.mobile,
        service: c.service || 'Netflix 4K',
        subscription_date: c.subscriptionDate,
        validity: c.validity || '1 Month',
        expiry_date: c.expiryDate,
        assigned_account_id: c.assignedAccountId || null,
        is_blocked: Boolean(c.isBlocked),
        total_updates: c.totalUpdates || 0,
        last_update_at: c.lastUpdateAt || null,
        history: c.history || [],
        updated_at: nowIso,
      }));

      // Upsert in batches of 100 to avoid payload size limits
      for (let i = 0; i < subPayload.length; i += 100) {
        const batch = subPayload.slice(i, i + 100);
        const { error: subErr } = await client.from('subscribers').upsert(batch, { onConflict: 'mobile' });
        if (subErr) {
          console.error('Error saving subscribers to Supabase:', subErr.message);
        }
      }
    }

    // 3. Upsert app_settings
    if (data.settings) {
      await client.from('app_settings').upsert(
        {
          id: 'default',
          admin_password: data.settings.adminPassword,
          company_name: data.settings.companyName,
          support_whatsapp: data.settings.supportWhatsapp,
          max_updates_per_month: data.settings.maxUpdatesPerMonth,
          cooldown_days: data.settings.cooldownDays,
          log_retention_days: data.settings.logRetentionDays,
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      );
    }

    return true;
  } catch (err: any) {
    console.error('Error in saveSupabaseStoreData:', err);
    return false;
  }
}

/**
 * Saves a single Netflix account directly to Supabase.
 */
export async function saveSupabaseAccount(account: NetflixAccount): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('cookie_pool').upsert(
      {
        id: account.id,
        platform: 'netflix',
        profile_name: account.profileName,
        account_label: account.accountLabel || account.profileName,
        account_email: account.accountEmail || '',
        user_agent: account.userAgent || '',
        device_metadata: account.deviceMetadata || {},
        cookies: account.cookies || [],
        status: account.status || 'live',
        earliest_expiry: account.earliestExpiry || null,
        earliest_expiry_iso: account.earliestExpiryIso || null,
        last_checked_at: account.lastCheckedAt || null,
        last_refreshed_at: account.lastRefreshedAt || null,
        last_result: account.lastResult || null,
        last_detail: account.lastDetail || '',
        consecutive_failures: account.consecutiveFailures || 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.error('Error in saveSupabaseAccount:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('Error in saveSupabaseAccount:', err);
    return false;
  }
}

/**
 * Deletes a Netflix account from Supabase.
 */
export async function deleteSupabaseAccount(accountId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('cookie_pool').delete().eq('id', accountId);
    if (error) {
      console.error('Error deleting account from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('Error in deleteSupabaseAccount:', err);
    return false;
  }
}
