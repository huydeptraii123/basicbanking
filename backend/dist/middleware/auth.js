"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.signToken = signToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../prisma"));
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
async function authMiddleware(req, res, next) {
    var _a;
    try {
        const token = ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.token) || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
        if (!token)
            return res.status(401).json({ error: 'Unauthorized' });
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (!payload || !payload.userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const user = await prisma_1.default.user.findUnique({ where: { id: payload.userId }, select: { id: true, email: true, firstName: true, lastName: true, dwollaCustomerId: true, dwollaCustomerUrl: true } });
        if (!user)
            return res.status(401).json({ error: 'Unauthorized' });
        req.user = user;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}
function signToken(userId) {
    const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';
    // cast values to satisfy TypeScript definitions from jsonwebtoken types
    return jsonwebtoken_1.default.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}
