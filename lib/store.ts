import fs from 'fs';
import path from 'path';
import { BrowserCookie } from './netflix-cookies';

export interface CustomerHistoryItem {
  id: string;
  date: string;
  action: 'tv_login' | 'household_update';
  code?: string;
  ip?: string;
  status: 'success' | 'blocked' | 'rate_limited' | 'failed';
  accountUsed?: string;
  notes?: string;
}

export interface Customer {
  id: string;
  mobile: string;
  service: string;
  subscriptionDate: string;
  validity: string;
  expiryDate: string;
  assignedAccountId: string | null;
  isBlocked: boolean;
  totalUpdates: number;
  lastUpdateAt: string | null;
  history: CustomerHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface NetflixAccount {
  id: string;
  profileName: string;
  accountLabel: string;
  accountEmail?: string;
  cookies: BrowserCookie[];
  status: 'active' | 'expired' | 'unknown';
  lastCheckedAt: string | null;
  lastResult: 'working' | 'expired' | 'missing_keys' | null;
  lastDetail: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  adminPassword: string;
  companyName: string;
  supportWhatsapp: string;
  maxUpdatesPerMonth: number;
  cooldownDays: number;
  logRetentionDays: number;
}

export interface ActivationLogItem {
  id: string;
  mobile: string;
  action: 'tv_login' | 'household_update';
  code?: string;
  ip: string;
  status: 'success' | 'failed' | 'rate_limited';
  accountUsed?: string;
  timestamp: string;
}

export interface AppData {
  customers: Customer[];
  netflixCookies: NetflixAccount[];
  settings: AppSettings;
  activationsLog: ActivationLogItem[];
}

const TMP_FILE_PATH = path.join('/tmp', 'tetra_store.json');
const LOCAL_SEED_PATH = path.join(process.cwd(), 'data', 'initial_data.json');

// In-memory cache for fast serverless responses
let memoryCache: AppData | null = null;

function loadInitialSeed(): AppData {
  try {
    if (fs.existsSync(LOCAL_SEED_PATH)) {
      const content = fs.readFileSync(LOCAL_SEED_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading local seed file:', err);
  }

  // Hardcoded fallback if file reading fails
  return {
    customers: [],
    netflixCookies: [],
    settings: {
      adminPassword: '6Ce0hegpwr8.',
      companyName: 'Tetra Digital Services',
      supportWhatsapp: '919772880079',
      maxUpdatesPerMonth: 2,
      cooldownDays: 15,
      logRetentionDays: 90,
    },
    activationsLog: [],
  };
}

export function getStoreData(): AppData {
  if (memoryCache) {
    return memoryCache;
  }

  // 1. Try reading from /tmp
  try {
    if (fs.existsSync(TMP_FILE_PATH)) {
      const content = fs.readFileSync(TMP_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.customers)) {
        memoryCache = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read from /tmp/tetra_store.json:', err);
  }

  // 2. Fallback to initial seed
  const seed = loadInitialSeed();
  memoryCache = seed;

  // Attempt to write seed to /tmp for future reads
  try {
    fs.writeFileSync(TMP_FILE_PATH, JSON.stringify(seed, null, 2), 'utf-8');
  } catch (err) {
    // Non-fatal
  }

  return seed;
}

export function saveStoreData(data: AppData): void {
  memoryCache = data;

  // 1. Write to /tmp
  try {
    fs.writeFileSync(TMP_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to /tmp/tetra_store.json:', err);
  }

  // 2. Also try writing to local project file (in dev or when possible)
  try {
    const dir = path.dirname(LOCAL_SEED_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_SEED_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // Expected in read-only production environments like Vercel Lambda
  }
}

export function getCustomerByMobile(mobile: string): Customer | undefined {
  const clean = mobile.replace(/\D/g, '');
  const data = getStoreData();
  return data.customers.find((c) => {
    const cClean = c.mobile.replace(/\D/g, '');
    if (cClean === clean) return true;
    if (clean.length === 10 && (cClean === '91' + clean || cClean.endsWith(clean))) return true;
    if (cClean.length === 10 && (clean === '91' + cClean || clean.endsWith(cClean))) return true;
    return false;
  });
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: 'not_found' | 'blocked' | 'expired' | 'cooldown' | 'monthly_limit';
  message: string;
  customer?: Customer;
  currentCount: number;
  maxCount: number;
  daysRemaining?: number;
  nextAllowedDate?: string;
}

/**
 * Checks if user is eligible to update household or login to TV.
 * Rule:
 * - TV Login: Maximum 2 times per calendar month (resets on 1st of each month).
 * - Household Update: NO LIMIT — customers can use it as many times as they want.
 */
export function checkCustomerEligibility(
  mobile: string,
  action: 'tv_login' | 'household_update' = 'tv_login'
): EligibilityResult {
  const customer = getCustomerByMobile(mobile);
  const data = getStoreData();
  const settings = data.settings;
  const maxMonthly = settings.maxUpdatesPerMonth ?? 2;

  if (!customer) {
    return {
      eligible: false,
      reason: 'not_found',
      message: 'No active Netflix subscription found for this mobile number. Please check your number or contact support on WhatsApp.',
      currentCount: 0,
      maxCount: maxMonthly,
    };
  }

  // 1. Check if manually blocked
  if (customer.isBlocked) {
    return {
      eligible: false,
      reason: 'blocked',
      message: 'Your access has been blocked. Please contact support on WhatsApp.',
      customer,
      currentCount: 0,
      maxCount: maxMonthly,
    };
  }

  // 2. Check if subscription is expired
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  if (customer.expiryDate && customer.expiryDate < todayIso) {
    return {
      eligible: false,
      reason: 'expired',
      message: `Your Netflix subscription expired on ${customer.expiryDate}. Please renew to access TV login or household updater.`,
      customer,
      currentCount: 0,
      maxCount: maxMonthly,
    };
  }

  // 3. HOUSEHOLD UPDATE has NO LIMIT - unlimited updates allowed
  if (action === 'household_update') {
    return {
      eligible: true,
      message: 'Eligible for household update',
      customer,
      currentCount: 0,
      maxCount: 999,
    };
  }

  // 4. TV LOGIN: Maximum 2 times per calendar month (resets at the start of each month)
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  const calendarMonthLogins = (customer.history || []).filter((h) => {
    if (h.action !== 'tv_login' || h.status !== 'success') return false;
    const d = new Date(h.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const monthCount = calendarMonthLogins.length;

  if (monthCount >= maxMonthly) {
    const nextMonth = new Date(currentYear, currentMonth + 1, 1);
    const nextMonthName = nextMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    return {
      eligible: false,
      reason: 'monthly_limit',
      currentCount: monthCount,
      maxCount: maxMonthly,
      nextAllowedDate: `1st ${nextMonthName}`,
      customer,
      message: `Monthly TV login limit reached: You have completed ${monthCount}/${maxMonthly} TV logins for this calendar month. Your limit will reset on 1st ${nextMonthName}.`,
    };
  }

  return {
    eligible: true,
    message: 'User is eligible for TV login',
    customer,
    currentCount: monthCount,
    maxCount: maxMonthly,
  };
}

/**
 * Records a successful update or login attempt, updating counter and timestamp.
 */
export function recordCustomerAttempt(
  mobile: string,
  action: 'tv_login' | 'household_update',
  options: {
    code?: string;
    ip?: string;
    accountUsed?: string;
    notes?: string;
  } = {}
): Customer | null {
  const data = getStoreData();
  const cleanMobile = mobile.replace(/\D/g, '');
  const customer = data.customers.find((c) => c.mobile.replace(/\D/g, '') === cleanMobile);

  if (!customer) return null;

  const nowIso = new Date().toISOString();
  const historyItem: CustomerHistoryItem = {
    id: 'h-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    date: nowIso,
    action,
    code: options.code,
    ip: options.ip,
    status: 'success',
    accountUsed: options.accountUsed,
    notes: options.notes,
  };

  customer.totalUpdates = (customer.totalUpdates || 0) + 1;
  customer.lastUpdateAt = nowIso;
  customer.updatedAt = nowIso;
  customer.history = customer.history || [];
  customer.history.unshift(historyItem);

  // Add to activations log
  const logItem: ActivationLogItem = {
    id: 'act-' + Date.now(),
    mobile: cleanMobile,
    action,
    code: options.code,
    ip: options.ip || 'unknown',
    status: 'success',
    accountUsed: options.accountUsed,
    timestamp: nowIso,
  };

  data.activationsLog = data.activationsLog || [];
  data.activationsLog.unshift(logItem);
  if (data.activationsLog.length > 500) {
    data.activationsLog = data.activationsLog.slice(0, 500);
  }

  saveStoreData(data);
  return customer;
}

/**
 * Resets counter / cooldown for a customer (admin action).
 */
export function resetCustomerCooldown(customerId: string): boolean {
  const data = getStoreData();
  const customer = data.customers.find((c) => c.id === customerId);
  if (!customer) return false;

  customer.lastUpdateAt = null;
  customer.updatedAt = new Date().toISOString();
  saveStoreData(data);
  return true;
}

/**
 * Assigns a specific Netflix account to a customer.
 */
export function assignAccountToCustomer(customerId: string, accountId: string | null): boolean {
  const data = getStoreData();
  const customer = data.customers.find((c) => c.id === customerId);
  if (!customer) return false;

  customer.assignedAccountId = accountId;
  customer.updatedAt = new Date().toISOString();
  saveStoreData(data);
  return true;
}

/**
 * Gets or links the assigned Netflix account for a customer.
 * For customers with no account assigned, picks one at random from the
 * available working accounts in the vault and permanently links it to them.
 */
export function getAssignedNetflixAccount(customer: Customer): NetflixAccount | null {
  const data = getStoreData();
  const pool = data.netflixCookies || [];

  if (pool.length === 0) return null;

  // 1. If customer already has a linked account and it's active
  if (customer.assignedAccountId) {
    const assigned = pool.find((a) => a.id === customer.assignedAccountId);
    if (assigned && assigned.status !== 'expired') {
      return assigned;
    }
  }

  // 2. Pick one at random from available working accounts in the vault
  const workingAccounts = pool.filter(
    (a) => a.status !== 'expired' && a.lastResult !== 'expired'
  );
  const candidates = workingAccounts.length > 0 ? workingAccounts : pool;

  const randomIndex = Math.floor(Math.random() * candidates.length);
  const chosen = candidates[randomIndex];

  if (chosen) {
    // Permanently link this account to the customer
    customer.assignedAccountId = chosen.id;
    customer.updatedAt = new Date().toISOString();
    saveStoreData(data);
    return chosen;
  }

  return pool[0] || null;
}
