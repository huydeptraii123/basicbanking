'use server';

import { ID, Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import { CountryCode, ProcessorTokenCreateRequest, ProcessorTokenCreateRequestProcessorEnum, Products } from "plaid";
import { count } from "console";
import { plaidClient } from "../plaid";
import { create } from "domain";
import { revalidatePath } from "next/cache";
import { addFundingSource, createDwollaCustomer } from "./dwolla.actions";

const {
    APPWRITE_DATABASE_ID: DATABASE_ID, 
    APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID, 
    APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID
} = process.env;

export const getUserInfo = async ({ userId }:getUserInfoProps) => {
     try {
        // Use the new backend API to fetch user info by id if available.
        // Backend exposes /api/user/me for the currently-authenticated user.
        // If caller provided a userId and the server has a way to fetch any user,
        // we'd call /api/user/:id — but to keep compatibility, attempt /me when
        // called from Server Components and return null otherwise.
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const cookieStore = cookies();
        const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join('; ');

        // If userId is provided, try to fetch /api/user/me (most server flows use cookies)
        const res = await fetch(`${base}/api/user/me`, {
            headers: {
                cookie: cookieHeader,
            },
            cache: 'no-store',
        });

        if (!res.ok) return null;
        const body = await res.json();
        // backend returns { user }
        return parseStringify(body.user || null);
    }  catch (error) {
        console.log('error', error);
        return null;
    }
}

export const signIn = async ({ email, password }: signInProps) => {
    try {
        const { account } = await createAdminClient();

        const session = await account.createEmailPasswordSession(
            email,
            password
        );



        cookies().set("appwrite-session", session.secret, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: true,
        });

        const user = await getUserInfo({userId: session.userId})
        return parseStringify(user);
    } catch (error) {
        console.log('error', error);
    }
}

export const signUp = async ( {password, ...userData}: SignUpParams) => {
    const {email, firstName, lastName} = userData;
    
    let newUserAccount;

    try {
        const { account,database } = await createAdminClient();

        newUserAccount = await account.create(
            ID.unique(),
            email,
            password,
            `${firstName} ${lastName}`
        );

        if(!newUserAccount) throw new Error("Error creating user" );

        const dwollaCustomerUrl = await createDwollaCustomer({
            ...userData,
            type: "personal",
        });

        if(!dwollaCustomerUrl) throw new Error("Error creating dwolla customer" );

        const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

        const newUser = await database.createDocument(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            ID.unique(),
            {
                ...userData,
                userId: newUserAccount.$id,
                dwollaCustomerId,
                dwollaCustomerUrl
            }
        )

        const session = await account.createEmailPasswordSession(
            email,
            password
        );



        cookies().set("appwrite-session", session.secret, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: true,
        });

        return parseStringify(newUser);
        } catch (error) {
                console.log('error', error);
            }
    }

// ... your initilization functions

export async function getLoggedInUser() {
    try {
        // Call the new backend API and forward cookies from the incoming request
        const cookieStore = cookies();
        const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join('; ');
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

        const res = await fetch(`${base}/api/user/me`, {
            headers: {
                cookie: cookieHeader,
            },
            cache: 'no-store',
        });

        if (!res.ok) return null;
        const body = await res.json();
        const u = body.user || null;
        if (!u) return null;

        // Map backend user shape to the shape frontend expects (compat with Appwrite fields)
        const mapped = {
            $id: u.id,
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            dwollaCustomerId: u.dwollaCustomerId,
            dwollaCustomerUrl: u.dwollaCustomerUrl,
        };

        return mapped;
    } catch (error) {
        return null;
    }
}

export const logoutAccount = async () => {
    try {
        const { account } = await createSessionClient();
        cookies().delete("appwrite-session");

        await account.deleteSession("current");
        return true;
    } catch (error) {
        console.log('error', error);
        return false;
    }
}


export const createLinkToken = async (user: User) => {
    try {
        const tokenParams = {
            user: {
                client_user_id: user.$id
            },
            client_name: `${user.firstName} ${user.lastName}`,
            products: ['auth','transactions'] as Products[],
            language: 'en',
            country_codes: ['US'] as CountryCode[],
            client_id: process.env.PLAID_CLIENT_ID!,
            secret: process.env.PLAID_SECRET!,
        }

        const response = await plaidClient.linkTokenCreate(tokenParams);

        return parseStringify({linkToken: response.data.link_token});
    }
    catch (error) {
        console.log('error', error);
    }
}

export const createBankAccount = async ({
    userId, bankId, accountId, accessToken, fundingSourceUrl, sharableId,
}: createBankAccountProps
) => {
    try {
        // call the new backend to create a bank record
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const cookieStore = cookies();
        const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join('; ');

        const res = await fetch(`${base}/api/banks/create`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                cookie: cookieHeader,
            },
            body: JSON.stringify({ userId, bankName: bankId, accountId, accessToken, sharableId }),
            cache: 'no-store',
        });

        if (!res.ok) {
            console.error('createBankAccount backend error', await res.text());
            return null;
        }

        const body = await res.json();
        return parseStringify(body.bank || body);
    }   catch (error) {
        console.log('error', error);
    }
}

export const exchangePublicToken = async ({publicToken, user}: exchangePublicTokenProps) => {
    try {
        const response = await plaidClient.itemPublicTokenExchange({
            public_token: publicToken,
            client_id: process.env.PLAID_CLIENT_ID!,
            secret: process.env.PLAID_SECRET!,
        });

        const accessToken = response.data.access_token;
        const itemId = response.data.item_id;

        const accountsResponse = await plaidClient.accountsGet({
            access_token: accessToken,
            client_id: process.env.PLAID_CLIENT_ID!,
            secret: process.env.PLAID_SECRET!,
        });

        const accountData = accountsResponse.data.accounts[0];
        const request: ProcessorTokenCreateRequest = {
            access_token: accessToken,
            account_id: accountData.account_id,
            processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
            client_id: process.env.PLAID_CLIENT_ID!,
            secret: process.env.PLAID_SECRET!,
        };

        const processorResponse = await plaidClient.processorTokenCreate(request);

        const processorToken = processorResponse.data.processor_token;

        const fundingSourceUrl = await addFundingSource({
            dwollaCustomerId: user.dwollaCustomerId,
            processorToken,
            bankName: accountData.name,
        });

        if (!fundingSourceUrl) throw Error;

        await createBankAccount({
            userId: user.$id,
            bankId: itemId,
            accountId:accountData.account_id,
            accessToken,
            fundingSourceUrl,
            sharableId: encryptId(accountData.account_id),
        });

        revalidatePath('/');
        return parseStringify({
            publicTokenExchange: "complete",
    });
    } catch (error) {
        console.log('error', error);
    }
}

export const getBanks = async ({ userId }: getBanksProps) => {
    try {
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const cookieStore = cookies();
        const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join('; ');

        const res = await fetch(`${base}/api/banks/user/${userId}`, {
            headers: {
                cookie: cookieHeader,
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            console.error('getBanks backend error', await res.text());
            return null;
        }

        const banks = await res.json();
        return parseStringify(banks);
    }  catch (error) {

        console.log('error', error);
    }
}

export const getBank = async ({ documentId }: getBankProps) => {
    try {
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const cookieStore = cookies();
        const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join('; ');

        const res = await fetch(`${base}/api/banks/${documentId}`, {
            headers: {
                cookie: cookieHeader,
            },
            cache: 'no-store',
        });

        if (!res.ok) return null;
        const bank = await res.json();
        return parseStringify(bank);
    }  catch (error) {
        console.log('error', error);
    }
}

export const getBankByAccountId = async ({ accountId }: getBankByAccountIdProps) => {
    try {
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const cookieStore = cookies();
        const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join('; ');

        const res = await fetch(`${base}/api/banks/by-account/${accountId}`, {
            headers: {
                cookie: cookieHeader,
            },
            cache: 'no-store',
        });

        if (!res.ok) return null;
        const bank = await res.json();
        return parseStringify(bank);
    }  catch (error) {
        console.log('error', error);
    }
}