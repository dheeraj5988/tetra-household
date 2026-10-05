import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { getStoreData } from './store';

const AUTH_SECRET = 'tetra-digital-services-secret-auth-key-2026';

/**
 * Issues a stateless HMAC-signed token that can be verified across any
 * serverless lambda or container instance without shared memory.
 */
export function issueAdminToken(): string {
  const timestamp = Date.now().toString();
  const hmac = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(`admin_${timestamp}`)
    .digest('hex');
  return `tetra_adm.${timestamp}.${hmac}`;
}

/**
 * Validates admin token:
 * 1. Accepts HMAC-signed token (valid for 30 days)
 * 2. Accepts direct admin password
 */
export function isValidAdminToken(token: string | null | undefined): boolean {
  if (!token) return false;

  const cleanToken = token.trim();

  // 1. Direct password match
  if (cleanToken === '6Ce0hegpwr8.') return true;

  try {
    const data = getStoreData();
    const configuredPassword = data.settings?.adminPassword || '6Ce0hegpwr8.';
    if (cleanToken === configuredPassword) return true;
  } catch {
    // ignore
  }

  // 2. Stateless HMAC verification
  if (cleanToken.startsWith('tetra_adm.')) {
    const parts = cleanToken.split('.');
    if (parts.length === 3) {
      const [, timestamp, hmac] = parts;
      const tokenTime = parseInt(timestamp, 10);
      // Valid for 30 days
      if (isNaN(tokenTime) || Date.now() - tokenTime > 30 * 24 * 60 * 60 * 1000) {
        return false;
      }
      const expectedHmac = crypto
        .createHmac('sha256', AUTH_SECRET)
        .update(`admin_${timestamp}`)
        .digest('hex');
      return hmac === expectedHmac;
    }
  }

  return false;
}

export function verifyAdminRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization') || '';
  const tokenHeader = request.headers.get('x-admin-token') || '';

  const token = authHeader.replace(/^Bearer\s+/i, '').trim() || tokenHeader.trim();
  return isValidAdminToken(token);
}
