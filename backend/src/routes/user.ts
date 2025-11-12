import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/user/me
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // authMiddleware sets req.user
    return res.json({ user: req.user });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ user: null });
  }
});

export default router;
