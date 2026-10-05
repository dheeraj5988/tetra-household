import { Redis } from '@upstash/redis';
import { AppData, NetflixAccount } from './store';

/**
 * Multi-provider Redis client support:
 * - Vercel KV: KV_REST_API_URL and KV_REST_API_TOKEN
 * - Upstash Redis: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 */
let redisClient: Redis | null = null;
let redisInitialized = false;

export function getRedisClient(): Redis | null {
  if (redisInitialized) return redisClient;

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      redisClient = new Redis({
        url: url.trim(),
        token: token.trim(),
      });
      console.log('Connected to Upstash Redis / Vercel KV store');
    } catch (err) {
      console.error('Failed to initialize Upstash Redis client:', err);
      redisClient = null;
    }
  } else {
    redisClient = null;
  }

  redisInitialized = true;
  return redisClient;
}

export function isRedisConfigured(): boolean {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return Boolean(url && token);
}

// Storage Keys
const STORE_DATA_KEY = 'tetra:store:data';
const ACCOUNT_SESSION_PREFIX = 'tetra:netflix:account:';

/**
 * Loads entire AppData from Redis
 */
export async function getRedisStoreData(): Promise<AppData | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const data = await client.get<AppData>(STORE_DATA_KEY);
    return data || null;
  } catch (err) {
    console.error('Redis error in getRedisStoreData:', err);
    return null;
  }
}

/**
 * Saves entire AppData to Redis
 */
export async function saveRedisStoreData(data: AppData): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.set(STORE_DATA_KEY, data);

    // Also persist each Netflix account session keyed by account ID
    if (Array.isArray(data.netflixCookies)) {
      for (const account of data.netflixCookies) {
        if (account && account.id) {
          await client.set(`${ACCOUNT_SESSION_PREFIX}${account.id}`, account);
        }
      }
    }

    return true;
  } catch (err) {
    console.error('Redis error in saveRedisStoreData:', err);
    return false;
  }
}

/**
 * Gets a specific Netflix account session directly by account ID
 */
export async function getRedisAccountSession(accountId: string): Promise<NetflixAccount | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    return await client.get<NetflixAccount>(`${ACCOUNT_SESSION_PREFIX}${accountId}`);
  } catch (err) {
    console.error(`Redis error in getRedisAccountSession(${accountId}):`, err);
    return null;
  }
}

/**
 * Saves or updates a specific Netflix account session in Redis
 */
export async function saveRedisAccountSession(account: NetflixAccount): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.set(`${ACCOUNT_SESSION_PREFIX}${account.id}`, account);
    return true;
  } catch (err) {
    console.error(`Redis error in saveRedisAccountSession(${account.id}):`, err);
    return false;
  }
}

/**
 * Deletes a specific Netflix account session from Redis
 */
export async function deleteRedisAccountSession(accountId: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.del(`${ACCOUNT_SESSION_PREFIX}${accountId}`);
    return true;
  } catch (err) {
    console.error(`Redis error in deleteRedisAccountSession(${accountId}):`, err);
    return false;
  }
}
