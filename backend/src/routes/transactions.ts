import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// POST /api/transactions/create
router.post('/create', async (req, res) => {
  try {
  const transaction = req.body;
  const created = await prisma.transaction.create({ data: { name: transaction.name || null, amount: transaction.amount || 0, senderBankId: transaction.senderBankId || null, receiverBankId: transaction.receiverBankId || null, channel: transaction.channel || 'online', category: transaction.category || 'Transfer' } });

  return res.json({ transaction: created });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'create transaction error' });
  }
});

// GET /api/transactions/by-bank/:bankId
router.get('/by-bank/:bankId', async (req, res) => {
  try {
  const bankId = req.params.bankId;
  const docs = await prisma.transaction.findMany({ where: { OR: [{ senderBankId: bankId }, { receiverBankId: bankId }] } });

  return res.json({ total: docs.length, documents: docs });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'get transactions error' });
  }
});

export default router;
