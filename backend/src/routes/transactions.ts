import { Router } from 'express';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/transactions/create
// This endpoint now performs the transfer server-side:
// - requires auth
// - validates sender ownership and sufficient funds
// - atomically debits sender, credits receiver, and creates a transaction record
router.post('/create', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const payload = req.body as any;
    const amount = Number(payload.amount);
    const senderBankId = payload.senderBankId;
    const receiverBankId = payload.receiverBankId;

    if (!senderBankId || !receiverBankId) return res.status(400).json({ error: 'Missing bank ids' });
    if (!amount || isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    // fetch banks
    const [senderBank, receiverBank] = await Promise.all([
      prisma.bank.findUnique({ where: { id: senderBankId } }),
      prisma.bank.findUnique({ where: { id: receiverBankId } }),
    ]);

    if (!senderBank) return res.status(404).json({ error: 'Sender bank not found' });
    if (!receiverBank) return res.status(404).json({ error: 'Receiver bank not found' });

    // ensure the authenticated user owns the sender bank
    if (!req.user || senderBank.userId !== req.user.id) {
      return res.status(403).json({ error: 'You do not own the source bank account' });
    }

  const senderBalance = (senderBank as any).balance ?? 0;
  const receiverBalance = (receiverBank as any).balance ?? 0;

    if (senderBalance < amount) return res.status(400).json({ error: 'Insufficient funds' });

    // perform atomic updates and create transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedSender = await tx.bank.update({ where: { id: senderBankId }, data: { balance: senderBalance - amount } });
      const updatedReceiver = await tx.bank.update({ where: { id: receiverBankId }, data: { balance: receiverBalance + amount } });

      const createdTx = await tx.transaction.create({ data: {
        name: payload.name || null,
        amount,
        senderBankId: senderBankId,
        receiverBankId: receiverBankId,
        channel: payload.channel || 'online',
        category: payload.category || 'Transfer',
        status: 'success'
      }});

      return { createdTx, updatedSender, updatedReceiver };
    });

    return res.json({ transaction: result.createdTx, sender: result.updatedSender, receiver: result.updatedReceiver });
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
