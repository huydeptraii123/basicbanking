/**
 * Transfer Throttle Control API
 * 
 * Endpoints to manage transfer throttling:
 * - GET /api/transfer-throttle/status - Get current config and stats
 * - POST /api/transfer-throttle/config - Update configuration
 * - POST /api/transfer-throttle/toggle - Enable/disable throttling
 */

import { Router } from 'express';
import transferThrottleManager from '../middleware/transferThrottle';

const router = Router();

/**
 * GET /api/transfer-throttle/status
 * Get current throttle configuration and statistics
 */
router.get('/status', (req, res) => {
  try {
    const config = transferThrottleManager.getConfig();
    const stats = transferThrottleManager.getStats();

    res.json({
      success: true,
      config,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/transfer-throttle/config
 * Update throttle configuration
 * 
 * Body (all optional):
 * {
 *   "maxRequestsPerSecond": 10,
 *   "maxQueueSize": 100,
 *   "queueTimeoutMs": 5000
 * }
 */
router.post('/config', (req, res) => {
  try {
    const { maxRequestsPerSecond, maxQueueSize, queueTimeoutMs } = req.body;

    const updates: any = {};

    if (maxRequestsPerSecond !== undefined) {
      const val = parseInt(maxRequestsPerSecond, 10);
      if (isNaN(val) || val < 1) {
        return res.status(400).json({
          success: false,
          error: 'maxRequestsPerSecond must be a positive integer',
        });
      }
      updates.maxRequestsPerSecond = val;
    }

    if (maxQueueSize !== undefined) {
      const val = parseInt(maxQueueSize, 10);
      if (isNaN(val) || val < 0) {
        return res.status(400).json({
          success: false,
          error: 'maxQueueSize must be a non-negative integer',
        });
      }
      updates.maxQueueSize = val;
    }

    if (queueTimeoutMs !== undefined) {
      const val = parseInt(queueTimeoutMs, 10);
      if (isNaN(val) || val < 100) {
        return res.status(400).json({
          success: false,
          error: 'queueTimeoutMs must be at least 100ms',
        });
      }
      updates.queueTimeoutMs = val;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid configuration parameters provided',
      });
    }

    transferThrottleManager.updateConfig(updates);

    const newConfig = transferThrottleManager.getConfig();
    const stats = transferThrottleManager.getStats();

    res.json({
      success: true,
      message: 'Configuration updated',
      config: newConfig,
      stats,
      updates,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/transfer-throttle/toggle
 * Enable or disable throttling
 * 
 * Body:
 * {
 *   "enabled": true/false
 * }
 */
router.post('/toggle', (req, res) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'enabled must be a boolean (true or false)',
      });
    }

    transferThrottleManager.updateConfig({ enabled });

    const newConfig = transferThrottleManager.getConfig();
    const stats = transferThrottleManager.getStats();

    res.json({
      success: true,
      message: `Transfer throttling ${enabled ? 'enabled' : 'disabled'}`,
      config: newConfig,
      stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/transfer-throttle/reset
 * Reset throttle state (clear queue, reset counters)
 */
router.post('/reset', (req, res) => {
  try {
    // Toggle off and on to reset
    const currentConfig = transferThrottleManager.getConfig();
    const wasEnabled = currentConfig.enabled;

    transferThrottleManager.updateConfig({ enabled: false });
    
    if (wasEnabled) {
      setTimeout(() => {
        transferThrottleManager.updateConfig({ enabled: true });
      }, 100);
    }

    res.json({
      success: true,
      message: 'Throttle state reset',
      wasEnabled,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
