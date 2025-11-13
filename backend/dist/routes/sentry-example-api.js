"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// replicate behavior of original Next route: throw an error to test monitoring
router.get('/', (req, res) => {
    throw new Error('This error is raised on the backend called by the example page.');
});
exports.default = router;
