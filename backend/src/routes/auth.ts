import { Router } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../prisma';
import { createDwollaCustomer } from '../services/dwolla';
import { signToken } from '../middleware/auth';

const router = Router();

// POST /api/auth/signin
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password || '');
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user.id);
    res.cookie('token', token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' });

    return res.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'signin error' });
  }
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName, ...rest } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const hashed = await bcrypt.hash(password, 10);

    // create dwolla customer (best-effort)
    let dwollaUrl: string | undefined = undefined;
    try {
      dwollaUrl = await createDwollaCustomer({ firstName, lastName, email, type: 'personal', ...rest });
    } catch (e) {
      console.warn('Dwolla create failed:', e);
    }

    const dwollaId = dwollaUrl ? dwollaUrl.split('/').pop() : null;

    const created = await prisma.user.create({ data: { email, password: hashed, firstName: firstName || null, lastName: lastName || null, dwollaCustomerId: dwollaId, dwollaCustomerUrl: dwollaUrl || null } });

    const token = signToken(created.id);
    res.cookie('token', token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' });

  return res.json({ ok: true, userId: created.id });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'signup error' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  res.clearCookie('token', { path: '/' });
  return res.json({ ok: true });
});

export default router;
