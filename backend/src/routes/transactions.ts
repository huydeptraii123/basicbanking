import { Router } from 'express';
import { Prisma } from '@prisma/client'; 
import { z } from 'zod';
import prisma from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { cacheService } from '../lib/cache';
import { safeRound } from '../utils/math';
import { runTransactionWithRetry } from '../utils/retry';
import { transferThrottleMiddleware } from '../middleware/transferThrottle';
import rateLimiter from '../middleware/rateLimiter';
import Sentry from '../sentry';

const router = Router();

// --- 1. Schema Validation ---
const TransferSchema = z.object({
  amount: z.number().gt(0, "Amount must be greater than 0"),
  senderBankId: z.string().uuid(),
  receiverBankId: z.string().uuid(),
  name: z.string().optional(),
  idempotencyKey: z.string().min(10).optional(),
});


// Main transfer endpoint with BOTH throttling AND rate limiting
router.post('/create', authMiddleware, rateLimiter.middleware(), transferThrottleMiddleware , async (req: AuthRequest, res) => {
  try {
    // A. Validation Input
    const validation = TransferSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.format() });
    }

    const { amount, senderBankId, receiverBankId, name, idempotencyKey } = validation.data;

    if (senderBankId === receiverBankId) {
      return res.status(400).json({ error: 'Cannot transfer to the same account' });
    }

    // B. Check Idempotency (Layer 1: Cache Protection)
    if (idempotencyKey) {
      const isDuplicate = await cacheService.checkIdempotency(idempotencyKey);
      if (isDuplicate) {
        return res.status(409).json({ error: 'Transaction already processed', ref: idempotencyKey });
      }
    }

    // C. Execute Transaction with Retry & Isolation (Layer 2: Database Protection)
    const result = await runTransactionWithRetry(async () => {
      
      return await prisma.$transaction(async (tx) => {
        // 1. Read Phase
        const senderBank = await tx.bank.findUnique({ where: { id: senderBankId } });
        
        if (!senderBank) throw new Error('Sender bank not found');
        if (senderBank.userId !== req.user.id) throw new Error('Unauthorized ownership');

        const currentBalance = senderBank.balance || 0;
        if (currentBalance < amount) {
          throw new Error('Insufficient funds');
        }

        // 2. Write Phase (Atomic Updates)
        const updatedSender = await tx.bank.update({
          where: { id: senderBankId },
          data: { 
            balance: { decrement: amount },
            version: { increment: 1 } 
          },
        });

        // Double check sau khi trừ (Safety Net cho Float)
        if ((updatedSender.balance || 0) < -0.0001) {
          throw new Error('Insufficient funds (Race condition detected)');
        }

        // Cộng tiền người nhận
        const updatedReceiver = await tx.bank.update({
          where: { id: receiverBankId },
          data: { 
            balance: { increment: amount },
            version: { increment: 1 }
          },
        });

        // Lưu lịch sử giao dịch
        const transaction = await tx.transaction.create({
          data: {
            amount: safeRound(amount),
            senderBankId,
            receiverBankId,
            name: name || 'Transfer',
            status: 'COMPLETED',
            idempotencyKey,
            channel: 'API'
          },
        });

        return { transaction, updatedSender, updatedReceiver };
      }, 
      { 
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable, 
        timeout: 10000 
      });

    });

    // D. Post-Process (Layer 3: Cache Invalidation)
    await Promise.all([
      cacheService.invalidateBalance(senderBankId),
      cacheService.invalidateBalance(receiverBankId)
    ]);

    if (idempotencyKey) {
      await cacheService.setIdempotency(idempotencyKey, { txId: result.transaction.id });
    }

    return res.json({
      success: true,
      transaction: result.transaction,
      senderNewBalance: safeRound(result.updatedSender.balance || 0),
      receiverNewBalance: safeRound(result.updatedReceiver.balance || 0)
    });

  } catch (err: any) {
    if (err.message === 'Insufficient funds' || 
        err.message === 'Unauthorized ownership' || 
        err.message === 'Sender bank not found' ||
        err.message.includes('Race condition detected')) {
      return res.status(400).json({ error: err.message });
    }

    Sentry.captureException(err);
    console.error('Transaction Error:', err);
    return res.status(500).json({ error: 'Transaction processing failed' });
  }
});

// --- 3. API Lấy Lịch Sử Giao Dịch (GET) ---
router.get('/by-bank/:bankId', async (req, res) => {
  try {
    const bankId = req.params.bankId;
    
    const docs = await prisma.transaction.findMany({ 
      where: { 
        OR: [
          { senderBankId: bankId }, 
          { receiverBankId: bankId }
        ] 
      },
      orderBy: { createdAt: 'desc' },
      include: {
        senderBank: { select: { bankId: true, accountId: true } },
        receiverBank: { select: { bankId: true, accountId: true } }
      }
    });

    return res.json({ total: docs.length, documents: docs });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'get transactions error' });
  }
});

export default router;