export const parseStringify = (v: unknown) => JSON.parse(JSON.stringify(v));

export function encryptId(id: string) {
  return Buffer.from(id).toString('base64');
}
