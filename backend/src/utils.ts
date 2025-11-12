export const parseStringify = (v: unknown) => JSON.parse(JSON.stringify(v));

export function extractCustomerIdFromUrl(url: string) {
  const parts = url.split('/');
  return parts[parts.length - 1];
}

export function encryptId(id: string) {
  return Buffer.from(id).toString('base64');
}
