/**
 * Rate Limiting Management API
 * 
 * Endpoints:
 * - GET  /api/rate-limit/status          - Get current status and stats
 * - POST /api/rate-limit/config          - Update configuration
 * - POST /api/rate-limit/toggle          - Enable/disable rate limiting
 * - POST /api/rate-limit/reset           - Reset all logs and blocks
 * - GET  /api/rate-limit/blocked-users   - List all blocked users
 * - POST /api/rate-limit/unblock/:id     - Unblock specific user/IP
 */

import { Router, Request, Response } from 'express';
import rateLimiter, { RateLimitConfig } from '../middleware/rateLimiter';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * Get current rate limiting status and statistics
 */
router.get('/status', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const stats = rateLimiter.getStats();
    
    return res.json({
      ok: true,
      ...stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: 'Failed to get rate limit status',
      message: error.message,
    });
  }
});

/**
 * Update rate limiting configuration
 */
router.post('/config', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const {
      windowMs,
      maxRequests,
      blockDurationMs,
      trackByUser,
    } = req.body;

    // Validate inputs
    const updates: Partial<RateLimitConfig> = {};

    if (windowMs !== undefined) {
      if (typeof windowMs !== 'number' || windowMs < 1000) {
        return res.status(400).json({
          ok: false,
          error: 'windowMs must be a number >= 1000 (1 second)',
        });
      }
      updates.windowMs = windowMs;
    }

    if (maxRequests !== undefined) {
      if (typeof maxRequests !== 'number' || maxRequests < 1) {
        return res.status(400).json({
          ok: false,
          error: 'maxRequests must be a positive number',
        });
      }
      updates.maxRequests = maxRequests;
    }

    if (blockDurationMs !== undefined) {
      if (typeof blockDurationMs !== 'number' || blockDurationMs < 1000) {
        return res.status(400).json({
          ok: false,
          error: 'blockDurationMs must be a number >= 1000 (1 second)',
        });
      }
      updates.blockDurationMs = blockDurationMs;
    }

    if (trackByUser !== undefined) {
      if (typeof trackByUser !== 'boolean') {
        return res.status(400).json({
          ok: false,
          error: 'trackByUser must be a boolean',
        });
      }
      updates.trackByUser = trackByUser;
    }

    // Apply updates
    rateLimiter.updateConfig(updates);
    const newConfig = rateLimiter.getConfig();

    return res.json({
      ok: true,
      message: 'Rate limiting configuration updated',
      config: newConfig,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: 'Failed to update configuration',
      message: error.message,
    });
  }
});

/**
 * Enable or disable rate limiting
 */
router.post('/toggle', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        ok: false,
        error: 'enabled must be a boolean',
      });
    }

    rateLimiter.updateConfig({ enabled });
    const config = rateLimiter.getConfig();

    return res.json({
      ok: true,
      message: `Rate limiting ${enabled ? 'enabled' : 'disabled'}`,
      enabled: config.enabled,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: 'Failed to toggle rate limiting',
      message: error.message,
    });
  }
});

/**
 * Reset all rate limiting logs and unblock all users
 */
router.post('/reset', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const statsBefore = rateLimiter.getStats();
    rateLimiter.reset();
    
    return res.json({
      ok: true,
      message: 'Rate limiting logs reset successfully',
      clearedUsers: statsBefore.totalTracked,
      unblockedUsers: statsBefore.totalBlocked,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: 'Failed to reset rate limiting',
      message: error.message,
    });
  }
});

/**
 * Get list of all blocked users/IPs
 */
router.get('/blocked-users', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const blockedUsers = rateLimiter.getBlockedUsers();
    
    return res.json({
      ok: true,
      totalBlocked: blockedUsers.length,
      blockedUsers,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: 'Failed to get blocked users',
      message: error.message,
    });
  }
});

/**
 * Unblock a specific user/IP
 */
router.post('/unblock/:identifier', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { identifier } = req.params;
    
    if (!identifier) {
      return res.status(400).json({
        ok: false,
        error: 'identifier parameter is required',
      });
    }

    const success = rateLimiter.unblock(identifier);
    
    if (success) {
      return res.json({
        ok: true,
        message: `User/IP ${identifier} has been unblocked`,
      });
    } else {
      return res.status(404).json({
        ok: false,
        error: `User/IP ${identifier} not found in rate limit logs`,
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error: 'Failed to unblock user',
      message: error.message,
    });
  }
});

export default router;
