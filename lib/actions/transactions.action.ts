"use server";

import { parseStringify } from "../utils";
import { cookies } from "next/headers";

// Create transaction using the new backend API
export const createTransaction = async (transaction: CreateTransactionProps) => {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const cookieStore = cookies();
    const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join('; ');

    const res = await fetch(`${base}/api/transactions/create`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: cookieHeader,
      },
      body: JSON.stringify(transaction),
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('createTransaction backend error', await res.text());
      return null;
    }

    const body = await res.json();
    // backend returns { transaction }
    return parseStringify(body.transaction || body);
  } catch (error) {
    console.log(error);
  }
}

export const getTransactionsByBankId = async ({bankId}: getTransactionsByBankIdProps) => {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const cookieStore = cookies();
    const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join('; ');

    const res = await fetch(`${base}/api/transactions/by-bank/${bankId}`, {
      headers: {
        cookie: cookieHeader,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('getTransactionsByBankId backend error', await res.text());
      return null;
    }

    const body = await res.json();
    // body: { total, documents }
    return parseStringify(body);
  } catch (error) {
    console.log(error);
  }
}