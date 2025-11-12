import { Client, Account, Databases, Users } from 'node-appwrite';
import { Request } from 'express';

// Admin client — uses server-side API key
export function createAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJECT!)
    .setKey(process.env.APPWRITE_API_KEY!);

  return {
    account: new Account(client),
    database: new Databases(client),
    users: new Users(client),
  };
}

// Session client — reads session secret from request cookies
export function createSessionClient(req: Request) {
  const session = req.cookies?.['appwrite-session'];

  if (!session) {
    throw new Error('No session cookie');
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJECT!)
    .setSession(session);

  return {
    account: new Account(client),
  };
}
