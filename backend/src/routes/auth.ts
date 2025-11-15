import { Router } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../prisma';
import { signToken } from '../middleware/auth';
import { signinThrottle } from '../middleware/throttle';
import Sentry from '../sentry';

const router = Router();

// POST /api/auth/signin
router.post('/signin', signinThrottle, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password || '');
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user.id);
    res.cookie('token', token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' });

    return res.json({ ok: true, token });
  } catch (err: any) {
    Sentry.captureException(err);
    console.error(err);
    return res.status(500).json({ error: err.message || 'signin error' });
  }
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const hashed = await bcrypt.hash(password, 10);

  // check for duplicate email first to give a friendly error
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const created = await prisma.user.create({ data: { email, password: hashed, firstName: firstName || null, lastName: lastName || null } });

    const token = signToken(created.id);
    res.cookie('token', token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' });
  return res.json({ ok: true, userId: created.id, token });
  } catch (err: any) {
    Sentry.captureException(err);
    console.error(err);
    // Handle unique constraint errors from Prisma as conflict
    if (err?.code === 'P2002') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    return res.status(500).json({ error: err.message || 'signup error' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  res.clearCookie('token', { path: '/' });
  return res.json({ ok: true });
});

export default router;
