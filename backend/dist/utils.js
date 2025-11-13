"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseStringify = void 0;
exports.extractCustomerIdFromUrl = extractCustomerIdFromUrl;
exports.encryptId = encryptId;
const parseStringify = (v) => JSON.parse(JSON.stringify(v));
exports.parseStringify = parseStringify;
function extractCustomerIdFromUrl(url) {
    const parts = url.split('/');
    return parts[parts.length - 1];
}
function encryptId(id) {
    return Buffer.from(id).toString('base64');
}
