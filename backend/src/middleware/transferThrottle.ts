/**
 * Transfer Throttling Middleware with Queue System
 * 
 * Features:
 * - Rate limiting: max requests per second
 * - Queue system when limit exceeded
 * - Configurable queue size and timeout
 * - Toggle on/off dynamically
 * - Returns 429/503 with Retry-After header
 */

import { Request, Response, NextFunction } from 'express';

export interface TransferThrottleConfig {
  enabled: boolean;
  maxRequestsPerSecond: number;  // Số request tối đa xử lý trong 1 giây
  maxQueueSize: number;          // Độ dài tối đa của queue
  queueTimeoutMs: number;        // Thời gian request chờ trong queue trước khi timeout
}

interface QueuedRequest {
  req: Request;
  res: Response;
  next: NextFunction;
  queuedAt: number;
  timeoutId: NodeJS.Timeout;
}

class TransferThrottleManager {
  private config: TransferThrottleConfig;
  
  // Tracking current second's requests
  private requestsInCurrentSecond: number = 0;
  private currentSecondStart: number = Date.now();
  
  // Queue for overflow requests
  private queue: QueuedRequest[] = [];
  
  // Interval to reset counter and process queue
  private resetInterval: NodeJS.Timeout | null = null;

  constructor(config: TransferThrottleConfig) {
    this.config = config;
    if (this.config.enabled) {
      this.startResetInterval();
    }
  }

  /**
   * Update throttle configuration dynamically
   */
  updateConfig(newConfig: Partial<TransferThrottleConfig>) {
    const wasEnabled = this.config.enabled;
    this.config = { ...this.config, ...newConfig };

    // Start/stop interval based on enabled state
    if (this.config.enabled && !wasEnabled) {
      this.startResetInterval();
      console.log('[TransferThrottle] Enabled');
    } else if (!this.config.enabled && wasEnabled) {
      this.stopResetInterval();
      console.log('[TransferThrottle] Disabled');
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): TransferThrottleConfig {
    return { ...this.config };
  }

  /**
   * Get current statistics
   */
  getStats() {
    const now = Date.now();
    const secondsElapsed = (now - this.currentSecondStart) / 1000;
    
    return {
      enabled: this.config.enabled,
      currentRequestsPerSecond: this.requestsInCurrentSecond,
      maxRequestsPerSecond: this.config.maxRequestsPerSecond,
      queueLength: this.queue.length,
      maxQueueSize: this.config.maxQueueSize,
      queueTimeoutMs: this.config.queueTimeoutMs,
      utilizationPercent: Math.round((this.requestsInCurrentSecond / this.config.maxRequestsPerSecond) * 100),
      queueFillPercent: Math.round((this.queue.length / this.config.maxQueueSize) * 100),
      secondsElapsed: secondsElapsed.toFixed(2),
    };
  }

  /**
   * Start interval to reset counter every second and process queue
   */
  private startResetInterval() {
    if (this.resetInterval) return;

    this.resetInterval = setInterval(() => {
      const now = Date.now();
      this.currentSecondStart = now;
      this.requestsInCurrentSecond = 0;
      
      // Process queued requests
      this.processQueue();
    }, 1000);

    console.log('[TransferThrottle] Reset interval started');
  }

  /**
   * Stop interval and clear queue
   */
  private stopResetInterval() {
    if (this.resetInterval) {
      clearInterval(this.resetInterval);
      this.resetInterval = null;
    }

    // Clear all pending requests in queue
    this.queue.forEach(item => {
      clearTimeout(item.timeoutId);
      if (!item.res.headersSent) {
        item.res.status(503).json({
          error: 'Transfer throttling disabled, queued request cancelled',
          code: 'THROTTLE_DISABLED',
        });
      }
    });
    this.queue = [];

    console.log('[TransferThrottle] Reset interval stopped, queue cleared');
  }

  /**
   * Process queue: dequeue and execute requests up to rate limit
   */
  private processQueue() {
    let processed = 0;
    
    while (
      this.queue.length > 0 && 
      this.requestsInCurrentSecond < this.config.maxRequestsPerSecond
    ) {
      const item = this.queue.shift();
      
      if (item && !item.res.headersSent) {
        clearTimeout(item.timeoutId);
        this.requestsInCurrentSecond++;
        processed++;
        
        const waitTime = Date.now() - item.queuedAt;
        console.log(`[TransferThrottle] Dequeued request (waited ${waitTime}ms)`);
        
        item.next();
      }
    }

    if (processed > 0) {
      console.log(`[TransferThrottle] Processed ${processed} requests from queue. Queue: ${this.queue.length}/${this.config.maxQueueSize}`);
    }
  }

  /**
   * Express middleware function
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // If throttling disabled, pass through immediately
      if (!this.config.enabled) {
        return next();
      }

      const now = Date.now();

      // Check if we need to reset the counter (backup in case interval missed)
      if (now - this.currentSecondStart >= 1000) {
        this.currentSecondStart = now;
        this.requestsInCurrentSecond = 0;
        this.processQueue();
      }

      // ✅ Can process immediately if under rate limit
      if (this.requestsInCurrentSecond < this.config.maxRequestsPerSecond) {
        this.requestsInCurrentSecond++;
        console.log(`[TransferThrottle] Direct pass (${this.requestsInCurrentSecond}/${this.config.maxRequestsPerSecond})`);
        return next();
      }

      // ❌ Queue is full - reject with 503
      if (this.queue.length >= this.config.maxQueueSize) {
        const retryAfter = Math.ceil((this.queue.length / this.config.maxRequestsPerSecond));
        res.setHeader('Retry-After', retryAfter.toString());
        
        console.log(`[TransferThrottle] Queue full! Rejected request (queue: ${this.queue.length}/${this.config.maxQueueSize})`);
        
        return res.status(503).json({
          error: 'Service temporarily unavailable - transfer queue is full',
          code: 'QUEUE_FULL',
          retryAfter,
          queueLength: this.queue.length,
          maxQueueSize: this.config.maxQueueSize,
        });
      }

      // ⏳ Add to queue
      console.log(`[TransferThrottle] Queuing request (queue: ${this.queue.length + 1}/${this.config.maxQueueSize})`);

      const timeoutId = setTimeout(() => {
        // Remove from queue on timeout
        const index = this.queue.findIndex(item => item.req === req);
        if (index !== -1) {
          this.queue.splice(index, 1);
          
          if (!res.headersSent) {
            const waitedMs = Date.now() - now;
            console.log(`[TransferThrottle] Request timeout after ${waitedMs}ms in queue`);
            
            res.setHeader('Retry-After', '1');
            res.status(429).json({
              error: 'Request timeout while waiting in transfer queue',
              code: 'QUEUE_TIMEOUT',
              retryAfter: 1,
              waitedMs,
              queueTimeoutMs: this.config.queueTimeoutMs,
            });
          }
        }
      }, this.config.queueTimeoutMs);

      this.queue.push({
        req,
        res,
        next,
        queuedAt: now,
        timeoutId,
      });
    };
  }
}

// Default configuration from environment variables
const defaultConfig: TransferThrottleConfig = {
  enabled: process.env.TRANSFER_THROTTLE_ENABLED === 'true',
  maxRequestsPerSecond: parseInt(process.env.TRANSFER_THROTTLE_MAX_RPS || '10', 10),
  maxQueueSize: parseInt(process.env.TRANSFER_THROTTLE_QUEUE_SIZE || '100', 10),
  queueTimeoutMs: parseInt(process.env.TRANSFER_THROTTLE_TIMEOUT_MS || '5000', 10),
};

// Singleton instance
export const transferThrottleManager = new TransferThrottleManager(defaultConfig);

// Export middleware for use in routes
export const transferThrottleMiddleware = transferThrottleManager.middleware();

// Export manager for control endpoints
export default transferThrottleManager;
