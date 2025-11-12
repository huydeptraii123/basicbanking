import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// POST /api/banks/exchange-public-token
// kept for backward compatibility but will return 501 if Plaid is not configured
router.post('/exchange-public-token', async (req, res) => {
  return res.status(501).json({ error: 'Plaid exchange is disabled in local-only mode' });
});

// POST /api/banks/create - create a bank record locally without Plaid/Dwolla
router.post('/create', async (req, res) => {
  try {
    const { userId, bankName, accountId, accessToken, sharableId } = req.body;
    if (!userId || !bankName || !accountId) return res.status(400).json({ error: 'missing fields' });

    const shar = sharableId || Buffer.from(accountId).toString('base64');

    const created = await prisma.bank.create({ data: { userId, bankId: accountId, accountId: accountId, accessToken: accessToken || null, fundingSourceUrl: null, sharableId: shar } });

    return res.json({ ok: true, bank: created });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'create bank error' });
  }
});

// GET /api/banks/user/:userId - list banks for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const banks = await prisma.bank.findMany({ where: { userId } });
    return res.json(banks);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'get banks error' });
  }
});

// GET /api/banks/by-account/:accountId - get bank by accountId
router.get('/by-account/:accountId', async (req, res) => {
  try {
    const accountId = req.params.accountId;
    const bank = await prisma.bank.findFirst({ where: { accountId } });
    if (!bank) return res.status(404).json({ error: 'bank not found' });
    return res.json(bank);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'get bank error' });
  }
});

// GET /api/banks/:id - get bank by id
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const bank = await prisma.bank.findUnique({ where: { id } });
    if (!bank) return res.status(404).json({ error: 'bank not found' });
    return res.json(bank);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'get bank error' });
  }
});

export default router;
