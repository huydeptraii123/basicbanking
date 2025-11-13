"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addFundingSource = exports.createDwollaCustomer = void 0;
const dwolla_v2_1 = require("dwolla-v2");
const getEnvironment = () => {
    const env = (process.env.DWOLLA_ENV || 'sandbox');
    if (env === 'production')
        return 'production';
    return 'sandbox';
};
function makeClient() {
    const key = process.env.DWOLLA_KEY;
    const secret = process.env.DWOLLA_SECRET;
    if (!key || !secret) {
        // Do not throw here — treat Dwolla as an optional integration in local mode.
        return null;
    }
    return new dwolla_v2_1.Client({
        environment: getEnvironment(),
        key,
        secret,
    });
}
const createDwollaCustomer = async (newCustomer) => {
    try {
        const client = makeClient();
        if (!client) {
            console.warn('Dwolla not configured - skipping createDwollaCustomer');
            return undefined;
        }
        return await client.post('customers', newCustomer).then((res) => res.headers.get('location'));
    }
    catch (err) {
        console.error('Creating a Dwolla Customer Failed:', err);
        // swallow errors to keep signup flow working in local mode
        return undefined;
    }
};
exports.createDwollaCustomer = createDwollaCustomer;
const addFundingSource = async ({ customerId, processorToken, bankName }) => {
    try {
        const client = makeClient();
        if (!client) {
            console.warn('Dwolla not configured - skipping addFundingSource');
            return undefined;
        }
        // create on-demand-auth
        const onDemand = await client.post('on-demand-authorizations');
        const links = onDemand.body._links;
        const fundingSourceOptions = {
            customerId,
            fundingSourceName: bankName,
            plaidToken: processorToken,
            _links: links,
        };
        return await client.post(`customers/${customerId}/funding-sources`, fundingSourceOptions).then((res) => res.headers.get('location'));
    }
    catch (err) {
        console.error('Adding funding source failed:', err);
        // swallow to avoid failing caller flows in local mode
        return undefined;
    }
};
exports.addFundingSource = addFundingSource;
