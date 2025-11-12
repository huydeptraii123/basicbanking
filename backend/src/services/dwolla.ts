import { Client } from 'dwolla-v2';

const getEnvironment = (): 'production' | 'sandbox' => {
  const env = (process.env.DWOLLA_ENV || 'sandbox');

  if (env === 'production') return 'production';
  return 'sandbox';
};

function makeClient() {
  const key = process.env.DWOLLA_KEY;
  const secret = process.env.DWOLLA_SECRET;

  if (!key || !secret) {
    // Do not throw here — treat Dwolla as an optional integration in local mode.
    return null as unknown as Client;
  }

  return new Client({
    environment: getEnvironment(),
    key,
    secret,
  });
}

export const createDwollaCustomer = async (newCustomer: any) => {
  try {
    const client = makeClient();
    if (!client) {
      console.warn('Dwolla not configured - skipping createDwollaCustomer');
      return undefined;
    }

    return await client.post('customers', newCustomer).then((res: any) => res.headers.get('location'));
  } catch (err) {
    console.error('Creating a Dwolla Customer Failed:', err);
    // swallow errors to keep signup flow working in local mode
    return undefined;
  }
};

export const addFundingSource = async ({ customerId, processorToken, bankName }: any) => {
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

    return await client.post(`customers/${customerId}/funding-sources`, fundingSourceOptions).then((res: any) => res.headers.get('location'));
  } catch (err) {
    console.error('Adding funding source failed:', err);
    // swallow to avoid failing caller flows in local mode
    return undefined;
  }
};
