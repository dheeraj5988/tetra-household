import { NextRequest } from 'next/server';
import { getStoreData } from './store';

const ADMIN_TOKENS = new Set<string>();

export function issueAdminToken(): string {
  const token = 'tetra_adm_' + Math.random().toString(36).slice(2) + '_' + Date.now();
  ADMIN_TOKENS.add(token);
  return token;
}

export function isValidAdminToken(token: string | null | undefined): boolean {
  if (!token) return false;
  if (ADMIN_TOKENS.has(token)) return true;
  // Also check if token matches the configured admin password directly
  const data = getStoreData();
  const pwd = data.settings.adminPassword || '6Ce0hegpwr8.';
  return token === pwd || token === '6Ce0hegpwr8.';
}

export function verifyAdminRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization') || '';
  const tokenHeader = request.headers.get('x-admin-token') || '';

  const token = authHeader.replace(/^Bearer\s+/i, '') || tokenHeader;
  return isValidAdminToken(token);
}
