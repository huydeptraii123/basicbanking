/**
 * Rate Limiting Middleware - Anti-Spam Protection
 * 
 * Features:
 * - Sliding window algorithm to track requests per user/IP
 * - Automatic blocking when threshold exceeded
 * - Configurable block duration and limits
 * - Per-user tracking (JWT-based) with IP fallback
 * - Returns 429 with Retry-After header when blocked
 * 
 * Difference from Throttling:
 * - Throttling: Queue system to handle high load (server protection)
 * - Rate Limiting: Block abusive users immediately (spam protection)
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export interface RateLimitConfig {
  enabled: boolean;
  windowMs: number;              // Thời gian cửa sổ theo dõi (ms) - VD: 60000 = 1 phút
  maxRequests: number;           // Số request tối đa trong windowMs
  blockDurationMs: number;       // Thời gian block user khi vi phạm (ms)
  trackByUser: boolean;          // true: track theo userId, false: track theo IP
}

interface RequestLog {
  timestamps: number[];          // Danh sách thời điểm request
  blockedUntil: number | null;   // Thời điểm hết block (null = không bị block)
  violationCount: number;        // Số lần vi phạm
}

class RateLimiter {
  private config: RateLimitConfig;
  private requestLogs: Map<string, RequestLog>; // Key: userId hoặc IP
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.requestLogs = new Map();
    
    if (this.config.enabled) {
      this.startCleanup();
    }
  }

  /**
   * Update configuration dynamically
   */
  updateConfig(newConfig: Partial<RateLimitConfig>) {
    const wasEnabled = this.config.enabled;
    this.config = { ...this.config, ...newConfig };
    
    // Start/stop cleanup based on enabled state
    if (this.config.enabled && !wasEnabled) {
      this.startCleanup();
    } else if (!this.config.enabled && wasEnabled) {
      this.stopCleanup();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  /**
   * Start periodic cleanup of old request logs
   */
  private startCleanup() {
    if (this.cleanupInterval) return;
    
    // Cleanup every 2 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldLogs();
    }, 120000);
  }

  /**
   * Stop cleanup interval
   */
  private stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Remove expired logs to prevent memory leak
   */
  private cleanupOldLogs() {
    const now = Date.now();
    const expireTime = now - this.config.windowMs * 2; // Keep 2x window duration
    
    for (const [key, log] of this.requestLogs.entries()) {
      // Remove if no recent activity and not blocked
      const lastTimestamp = log.timestamps[log.timestamps.length - 1] || 0;
      const isExpired = lastTimestamp < expireTime;
      const isNotBlocked = !log.blockedUntil || log.blockedUntil < now;
      
      if (isExpired && isNotBlocked) {
        this.requestLogs.delete(key);
      }
    }
  }

  /**
   * Get identifier for tracking (userId or IP)
   */
  private getIdentifier(req: Request): string {
    if (this.config.trackByUser) {
      // Extract userId from JWT token
      const authCookie = req.cookies?.auth_token || req.cookies?.token;
      if (authCookie) {
        try {
          const decoded = jwt.verify(authCookie, JWT_SECRET) as { userId: string };
          return `user:${decoded.userId}`;
        } catch (err) {
          // JWT invalid, fallback to IP
        }
      }
    }
    
    // Fallback to IP address
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `ip:${ip}`;
  }

  /**
   * Get or create request log for identifier
   */
  private getLog(identifier: string): RequestLog {
    if (!this.requestLogs.has(identifier)) {
      this.requestLogs.set(identifier, {
        timestamps: [],
        blockedUntil: null,
        violationCount: 0,
      });
    }
    return this.requestLogs.get(identifier)!;
  }

  /**
   * Check if request should be allowed
   */
  private isAllowed(identifier: string): {
    allowed: boolean;
    retryAfter?: number;
    reason?: string;
  } {
    const now = Date.now();
    const log = this.getLog(identifier);

    // Check if currently blocked
    if (log.blockedUntil && log.blockedUntil > now) {
      const retryAfter = Math.ceil((log.blockedUntil - now) / 1000);
      return {
        allowed: false,
        retryAfter,
        reason: `Blocked due to spam detection. Try again in ${retryAfter}s`,
      };
    }

    // Clear block status if expired
    if (log.blockedUntil && log.blockedUntil <= now) {
      log.blockedUntil = null;
    }

    // Clean up old timestamps outside sliding window
    const windowStart = now - this.config.windowMs;
    log.timestamps = log.timestamps.filter(ts => ts > windowStart);

    // Check if within rate limit
    if (log.timestamps.length >= this.config.maxRequests) {
      // Exceeded rate limit - block user
      log.blockedUntil = now + this.config.blockDurationMs;
      log.violationCount += 1;
      
      const retryAfter = Math.ceil(this.config.blockDurationMs / 1000);
      return {
        allowed: false,
        retryAfter,
        reason: `Rate limit exceeded: ${this.config.maxRequests} requests per ${this.config.windowMs / 1000}s. Blocked for ${retryAfter}s`,
      };
    }

    // Add current timestamp
    log.timestamps.push(now);
    return { allowed: true };
  }

  /**
   * Middleware function
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip if disabled
      if (!this.config.enabled) {
        return next();
      }

      const identifier = this.getIdentifier(req);
      const result = this.isAllowed(identifier);

      if (!result.allowed) {
        // Set Retry-After header
        if (result.retryAfter) {
          res.set('Retry-After', result.retryAfter.toString());
        }

        return res.status(429).json({
          ok: false,
          error: 'Rate limit exceeded',
          message: result.reason,
          retryAfter: result.retryAfter,
        });
      }

      // Request allowed
      next();
    };
  }

  /**
   * Get statistics
   */
  getStats() {
    const now = Date.now();
    const blockedUsers: Array<{
      identifier: string;
      blockedUntil: number;
      violationCount: number;
      retryAfter: number;
    }> = [];

    let totalTracked = 0;
    let totalBlocked = 0;

    for (const [identifier, log] of this.requestLogs.entries()) {
      totalTracked++;
      
      if (log.blockedUntil && log.blockedUntil > now) {
        totalBlocked++;
        blockedUsers.push({
          identifier,
          blockedUntil: log.blockedUntil,
          violationCount: log.violationCount,
          retryAfter: Math.ceil((log.blockedUntil - now) / 1000),
        });
      }
    }

    return {
      enabled: this.config.enabled,
      totalTracked,
      totalBlocked,
      blockedUsers,
      config: this.getConfig(),
    };
  }

  /**
   * Reset all logs and blocks
   */
  reset() {
    this.requestLogs.clear();
  }

  /**
   * Manually unblock a user/IP
   */
  unblock(identifier: string): boolean {
    const log = this.requestLogs.get(identifier);
    if (log) {
      log.blockedUntil = null;
      log.timestamps = [];
      return true;
    }
    return false;
  }

  /**
   * Get list of all blocked users
   */
  getBlockedUsers() {
    const now = Date.now();
    const blocked: Array<{
      identifier: string;
      blockedUntil: number;
      retryAfter: number;
      violationCount: number;
    }> = [];

    for (const [identifier, log] of this.requestLogs.entries()) {
      if (log.blockedUntil && log.blockedUntil > now) {
        blocked.push({
          identifier,
          blockedUntil: log.blockedUntil,
          retryAfter: Math.ceil((log.blockedUntil - now) / 1000),
          violationCount: log.violationCount,
        });
      }
    }

    return blocked;
  }
}

// Singleton instance with default config
export const rateLimiter = new RateLimiter({
  enabled: true,
  windowMs: 60000,           // 1 minute window
  maxRequests: 30,           // 30 requests per minute
  blockDurationMs: 300000,   // Block for 5 minutes
  trackByUser: true,         // Track by userId (with IP fallback)
});

export default rateLimiter;
