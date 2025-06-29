import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
    blockedUntil?: number;
  };
}

const store: RateLimitStore = {};

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  blockDurationMs?: number; // How long to block after exceeding limit
  message?: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

export function createRateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    blockDurationMs = windowMs,
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    keyGenerator = (req) => req.ip || 'unknown'
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    // Clean up old entries
    if (Math.random() < 0.01) { // 1% chance to clean up
      Object.keys(store).forEach(k => {
        if (store[k].resetTime < now && (!store[k].blockedUntil || store[k].blockedUntil < now)) {
          delete store[k];
        }
      });
    }

    if (!store[key]) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs
      };
      return next();
    }

    const record = store[key];

    // Check if still blocked
    if (record.blockedUntil && record.blockedUntil > now) {
      return res.status(429).json({ 
        error: message,
        retryAfter: Math.ceil((record.blockedUntil - now) / 1000)
      });
    }

    // Reset window if expired
    if (record.resetTime < now) {
      record.count = 1;
      record.resetTime = now + windowMs;
      record.blockedUntil = undefined;
      return next();
    }

    // Increment counter
    record.count++;

    // Check if limit exceeded
    if (record.count > maxRequests) {
      record.blockedUntil = now + blockDurationMs;
      return res.status(429).json({ 
        error: message,
        retryAfter: Math.ceil(blockDurationMs / 1000)
      });
    }

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, maxRequests - record.count).toString(),
      'X-RateLimit-Reset': new Date(record.resetTime).toISOString()
    });

    next();
  };
}

// Predefined rate limiters for common use cases
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  blockDurationMs: 30 * 60 * 1000, // Block for 30 minutes
  message: 'Too many authentication attempts, please try again later.',
  keyGenerator: (req) => {
    // Rate limit by IP and email if provided
    const email = req.body?.email;
    const ip = req.ip || 'unknown';
    return email ? `${ip}:${email}` : ip;
  }
});

export const generalRateLimit = createRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  message: 'Too many requests, please slow down.'
});
