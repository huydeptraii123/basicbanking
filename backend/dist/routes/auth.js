"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = __importDefault(require("../prisma"));
const dwolla_1 = require("../services/dwolla");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// POST /api/auth/signin
router.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: 'email and password required' });
        const user = await prisma_1.default.user.findUnique({ where: { email } });
        if (!user)
            return res.status(401).json({ error: 'Invalid credentials' });
        const match = await bcrypt_1.default.compare(password, user.password || '');
        if (!match)
            return res.status(401).json({ error: 'Invalid credentials' });
        const token = (0, auth_1.signToken)(user.id);
        res.cookie('token', token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' });
        return res.json({ ok: true, token });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message || 'signin error' });
    }
});
// POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { email, password, firstName, lastName, ...rest } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: 'email and password required' });
        const hashed = await bcrypt_1.default.hash(password, 10);
        // create dwolla customer (best-effort)
        let dwollaUrl = undefined;
        try {
            dwollaUrl = await (0, dwolla_1.createDwollaCustomer)({ firstName, lastName, email, type: 'personal', ...rest });
        }
        catch (e) {
            console.warn('Dwolla create failed:', e);
        }
        const dwollaId = dwollaUrl ? dwollaUrl.split('/').pop() : null;
        // check for duplicate email first to give a friendly error
        const existing = await prisma_1.default.user.findUnique({ where: { email } });
        if (existing)
            return res.status(409).json({ error: 'Email already registered' });
        const created = await prisma_1.default.user.create({ data: { email, password: hashed, firstName: firstName || null, lastName: lastName || null, dwollaCustomerId: dwollaId, dwollaCustomerUrl: dwollaUrl || null } });
        const token = (0, auth_1.signToken)(created.id);
        res.cookie('token', token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' });
        return res.json({ ok: true, userId: created.id, token });
    }
    catch (err) {
        console.error(err);
        // Handle unique constraint errors from Prisma as conflict
        if ((err === null || err === void 0 ? void 0 : err.code) === 'P2002') {
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
exports.default = router;
