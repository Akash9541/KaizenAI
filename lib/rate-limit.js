const getStore = () => {
  if (!globalThis.__authRateLimitStore) {
    globalThis.__authRateLimitStore = new Map();
  }
  return globalThis.__authRateLimitStore;
};

const getClientIp = (request) => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
};

export const checkRateLimit = ({
  request,
  action,
  limit = 8,
  windowMs = 10 * 60 * 1000,
}) => {
  const store = getStore();
  const now = Date.now();
  const key = `${action}:${getClientIp(request)}`;
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: limit - 1,
      retryAfterSeconds: 0,
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  store.set(key, current);

  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    retryAfterSeconds: 0,
  };
};
