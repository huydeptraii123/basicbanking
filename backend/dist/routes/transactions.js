"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// POST /api/transactions/create
// This endpoint now performs the transfer server-side:
// - requires auth
// - validates sender ownership and sufficient funds
// - atomically debits sender, credits receiver, and creates a transaction record
router.post('/create', auth_1.authMiddleware, async (req, res) => {
    var _a, _b;
    try {
        const payload = req.body;
        const amount = Number(payload.amount);
        const senderBankId = payload.senderBankId;
        const receiverBankId = payload.receiverBankId;
        if (!senderBankId || !receiverBankId)
            return res.status(400).json({ error: 'Missing bank ids' });
        if (!amount || isNaN(amount) || amount <= 0)
            return res.status(400).json({ error: 'Invalid amount' });
        // fetch banks
        const [senderBank, receiverBank] = await Promise.all([
            prisma_1.default.bank.findUnique({ where: { id: senderBankId } }),
            prisma_1.default.bank.findUnique({ where: { id: receiverBankId } }),
        ]);
        if (!senderBank)
            return res.status(404).json({ error: 'Sender bank not found' });
        if (!receiverBank)
            return res.status(404).json({ error: 'Receiver bank not found' });
        // ensure the authenticated user owns the sender bank
        if (!req.user || senderBank.userId !== req.user.id) {
            return res.status(403).json({ error: 'You do not own the source bank account' });
        }
        const senderBalance = (_a = senderBank.balance) !== null && _a !== void 0 ? _a : 0;
        const receiverBalance = (_b = receiverBank.balance) !== null && _b !== void 0 ? _b : 0;
        if (senderBalance < amount)
            return res.status(400).json({ error: 'Insufficient funds' });
        // perform atomic updates and create transaction
        const result = await prisma_1.default.$transaction(async (tx) => {
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
                } });
            return { createdTx, updatedSender, updatedReceiver };
        });
        return res.json({ transaction: result.createdTx, sender: result.updatedSender, receiver: result.updatedReceiver });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message || 'create transaction error' });
    }
});
// GET /api/transactions/by-bank/:bankId
router.get('/by-bank/:bankId', async (req, res) => {
    try {
        const bankId = req.params.bankId;
        const docs = await prisma_1.default.transaction.findMany({ where: { OR: [{ senderBankId: bankId }, { receiverBankId: bankId }] } });
        return res.json({ total: docs.length, documents: docs });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message || 'get transactions error' });
    }
});
exports.default = router;
