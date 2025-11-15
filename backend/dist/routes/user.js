"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const sentry_1 = __importDefault(require("../sentry"));
const router = (0, express_1.Router)();
// GET /api/user/me
router.get('/me', auth_1.authMiddleware, async (req, res) => {
    try {
        // authMiddleware sets req.user
        if (!req.user) {
            return res.status(200).json({ user: null });
        }
        return res.json({ user: req.user });
    }
    catch (err) {
        sentry_1.default.captureException(err);
        console.error(err);
        return res.status(500).json({ user: null });
    }
});
exports.default = router;
