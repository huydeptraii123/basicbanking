import Link from 'next/link'
import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BankTabItem } from './BankTabItem'
import BankInfo from './BankInfo'
import TransactionsTable from './TransactionsTable'
import { Pagination } from './Pagination'

const RecentTransactions = ({
    accounts = [],
    transactions = [],
    appwriteItemId,
    page = 1
}: RecentTransactionsProps) => {

    const rowsPerPage = 10;
    const totalPages = Math.ceil(transactions.length / rowsPerPage);

    const indexOfLastTransaction = page * rowsPerPage;
    const indexOfFirstTransaction = indexOfLastTransaction - rowsPerPage;

    const currentTransactions = transactions.slice(
        indexOfFirstTransaction,
        indexOfLastTransaction
    );

    const hasAccounts = accounts && accounts.length > 0;

    return (
        <section className="recent-transactions">

            <header className="flex items-center justify-between ">
                <h2 className="recent-transactions-label">
                    Recent Transactions
                </h2>

                {/* Disable view-all nếu không có account */}
                {hasAccounts ? (
                    <Link
                        href={`/transaction-history/?id=${appwriteItemId}`}
                        className="view-all-btn"
                    >
                        View all
                    </Link>
                ) : (
                    <span className="text-gray-400 text-sm">No accounts</span>
                )}
            </header>

            {/* Nếu không có account → báo lỗi sớm */}
            {!hasAccounts && (
                <p className="text-red-500 text-sm mt-3">
                    Không thể tải lịch sử giao dịch vì không có tài khoản khả dụng.
                </p>
            )}

            {/* Chỉ render Tabs khi có account */}
            {hasAccounts && (
                <Tabs defaultValue={appwriteItemId} className="w-full">
                    <TabsList className="recent-transactions-tablist">
                        {accounts.map((account: Account) => (
                            <TabsTrigger key={account.id} value={account.appwriteItemId}>
                                <BankTabItem
                                    key={account.id}
                                    account={account}
                                    appwriteItemId={appwriteItemId}
                                />
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {accounts.map((account: Account) => (
                        <TabsContent
                            value={account.appwriteItemId}
                            key={account.id}
                            className="space-y-4"
                        >

                            <BankInfo
                                account={account}
                                appwriteItemId={account.appwriteItemId}
                                type="full"
                            />

                            {/* Nếu transactions rỗng → báo nhẹ */}
                            {currentTransactions.length === 0 ? (
                                <p className="text-gray-500 text-sm mt-2">
                                    Chưa có giao dịch nào.
                                </p>
                            ) : (
                                <TransactionsTable transactions={currentTransactions} />
                            )}

                            {totalPages > 1 && (
                                <div className="my-4 w-full">
                                    <Pagination totalPages={totalPages} page={page} />
                                </div>
                            )}
                        </TabsContent>
                    ))}
                </Tabs>
            )}
        </section>
    );
}

export default RecentTransactions;
