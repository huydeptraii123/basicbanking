"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseStringify = void 0;
exports.encryptId = encryptId;
const parseStringify = (v) => JSON.parse(JSON.stringify(v));
exports.parseStringify = parseStringify;
function encryptId(id) {
    return Buffer.from(id).toString('base64');
}
