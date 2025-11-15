import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import Sentry from '../sentry';

const router = Router();

// GET /api/user/me
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // authMiddleware sets req.user
    if (!req.user) {
      return res.status(200).json({ user: null });
    }
    return res.json({ user: req.user });
  } catch (err: any) {
    Sentry.captureException(err);
    console.error(err);
    return res.status(500).json({ user: null });
  }
});

export default router;
