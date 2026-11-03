let _redis = null;
let RedisClass = null;
let _redisAvailable = false;

export function isRedisAvailable() {
  return _redisAvailable;
}

async function getRedisClass() {
  if (RedisClass) return RedisClass;
  try {
    const mod = await import('ioredis');
    RedisClass = mod.default || mod.Redis || mod;
    return RedisClass;
  } catch {
    return null;
  }
}

export function getRedisUrl() {
  return process.env.SESSION_STORE_URL || process.env.REDIS_URL || '';
}

export function isRedisConfigured() {
  return Boolean(getRedisUrl());
}

/**
 * Returns the shared Redis client instance.
 * Returns null if no Redis URL is configured or ioredis is not loaded.
 */
export async function getRedis() {
  const url = getRedisUrl();
  if (!url) return null;

  if (_redis) return _redis;

  const Client = await getRedisClass();
  if (!Client) return null;

  _redis = new Client(url, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
    keepAlive: 15000,
    connectTimeout: 10000,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 3000);
      return delay;
    },
  });

  _redis.on('error', (err) => {
    if (err?.message?.includes('max requests limit exceeded') || err?.message?.includes('quota')) {
      _redisAvailable = false;
    }
    // Avoid spamming logs for transient socket dropouts on serverless Upstash
    if (_redis && !err?.message?.includes('read ETIMEDOUT') && !err?.message?.includes('ECONNRESET')) {
      console.error('[REDIS ERROR]:', err.message);
    }
  });

  _redis.on('connect', () => {
    console.log('✅ [REDIS] Connected successfully to session store');
  });

  return _redis;
}

/**
 * Connect to Redis if configured and verify ping/auth.
 */
export async function initRedis() {
  const url = getRedisUrl();
  if (!url) {
    _redisAvailable = false;
    return null;
  }

  const redis = await getRedis();
  if (!redis) {
    _redisAvailable = false;
    return null;
  }

  try {
    if (redis.status === 'wait') {
      await redis.connect();
    }
    // Test PING to verify credentials and that quota is not exceeded
    await redis.ping();
    _redisAvailable = true;
    return redis;
  } catch (err) {
    _redisAvailable = false;
    console.error('⚠️ [REDIS] Redis unavailable or quota exceeded (' + err.message + '). Falling back to in-memory store.');
    try {
      redis.disconnect();
    } catch {}
    _redis = null;
    return null;
  }
}

/**
 * Gracefully close Redis connection.
 */
export async function closeRedis() {
  _redisAvailable = false;
  if (_redis) {
    const client = _redis;
    _redis = null;
    try {
      await client.quit();
      console.log('🛑 [REDIS] Connection closed cleanly');
    } catch (err) {
      console.warn('⚠️ [REDIS] Error during disconnect:', err.message);
    }
  }
}
