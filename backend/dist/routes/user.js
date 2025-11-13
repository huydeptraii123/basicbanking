"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/user/me
router.get('/me', auth_1.authMiddleware, async (req, res) => {
    try {
        // authMiddleware sets req.user
        return res.json({ user: req.user });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ user: null });
    }
});
exports.default = router;
