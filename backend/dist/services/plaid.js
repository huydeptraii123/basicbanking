"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plaidClient = void 0;
const plaid_1 = require("plaid");
const basePath = (process.env.PLAID_ENV === 'production') ? plaid_1.PlaidEnvironments.production : plaid_1.PlaidEnvironments.sandbox;
const configuration = new plaid_1.Configuration({
    basePath,
    baseOptions: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET': process.env.PLAID_SECRET,
    },
});
exports.plaidClient = new plaid_1.PlaidApi(configuration);
