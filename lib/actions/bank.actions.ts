"use server";

import { parseStringify } from "../utils";

import { getTransactionsByBankId } from "./transactions.action";
import { getBanks, getBank } from "./user.actions";

// Get multiple bank accounts
export const getAccounts = async ({ userId }: getAccountsProps) => {
  try {
    // get banks from db (backend)
    const banks = await getBanks({ userId });

    const banksList = banks || [];

    // Map each bank record from backend to an account object the frontend expects.
    const accounts = banksList.map((bank: any) => {
      const mask = bank.accountId ? bank.accountId.slice(-4) : '';
      const bal = typeof bank.balance !== 'undefined' && bank.balance !== null ? Number(bank.balance) : 0;
      return {
        id: bank.accountId || bank.id,
        availableBalance: bal,
        currentBalance: bal,
        institutionId: bank.bankId || null,
        name: bank.bankId || `Account ${mask}`,
        officialName: bank.bankId || '',
        mask,
        type: '',
        subtype: '',
        appwriteItemId: bank.id || bank.$id,
        sharableId: bank.sharableId,
      };
    });

    const totalBanks = accounts.length;
  const totalCurrentBalance = accounts.reduce((total: number, account: any) => total + (account.currentBalance || 0), 0);

    return parseStringify({ data: accounts, totalBanks, totalCurrentBalance });
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
  }
};

// Get one bank account
export const getAccount = async ({ appwriteItemId }: getAccountProps) => {
  try {
    

    // get bank from backend
    const bank = await getBank({ documentId: appwriteItemId });

    if (!bank) return null;

    // fetch transfer transactions from backend
    const transferTransactionsData = await getTransactionsByBankId({ bankId: bank.id || bank.$id });

    const transferTransactions = (transferTransactionsData?.documents || []).map((transferData: any) => ({
      id: transferData.id || transferData.$id,
      name: transferData.name || '',
      amount: transferData.amount || 0,
      date: transferData.createdAt || transferData.$createdAt,
      paymentChannel: transferData.channel,
      category: transferData.category,
      type: transferData.senderBankId === (bank.id || bank.$id) ? 'debit' : 'credit',
    }));

    const bal = typeof bank.balance !== 'undefined' && bank.balance !== null ? Number(bank.balance) : 0;
    const account = {
      id: bank.accountId || bank.id,
      availableBalance: bal,
      currentBalance: bal,
      institutionId: bank.bankId || null,
      name: bank.bankId || `Account ${bank.accountId ? bank.accountId.slice(-4) : ''}`,
      officialName: bank.bankId || '',
      mask: bank.accountId ? bank.accountId.slice(-4) : '',
      type: '',
      subtype: '',
      appwriteItemId: bank.id || bank.$id,
    };

  const allTransactions = transferTransactions.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return parseStringify({ data: account, transactions: allTransactions });
  } catch (error) {
    console.error("An error occurred while getting the account:", error);
  }
};

// Get bank info
export const getInstitution = async ({ institutionId }: getInstitutionProps) => {
  // Plaid institution lookups are disabled in local mode. Return a simple object
  // built from the institutionId so UI can still render a name and id.
  try {
    return parseStringify({ institution_id: institutionId, name: institutionId });
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
  }
};

// Get transactions
export const getTransactions = async ({ accessToken }: getTransactionsProps) => {
  // Deprecated: transactions now come from backend DB via getTransactionsByBankId
  return parseStringify([]);
};