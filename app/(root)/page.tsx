import React from 'react'
import HeaderBox from '@/components/HeaderBox'
import TotalBalanceBox from '@/components/TotalBalanceBox'
import RightSidebar from '@/components/RightSidebar'
import { getLoggedInUser } from '@/lib/actions/user.actions'
import { getAccount, getAccounts } from '@/lib/actions/bank.actions'
import RecentTransactions from '@/components/RecentTransactions'
import { redirect } from 'next/navigation'

const Home = async ({ searchParams: { id, page}}:SearchParamProps) => {
  const currentPage = Number(page as string) || 1;
  const loggedIn = await getLoggedInUser()

  if (!loggedIn) {
    redirect('/sign-in')
  }

  // Ensure all required User fields exist
  const user: User = {
    $id: loggedIn.$id ?? '',
    email: loggedIn.email ?? '',
    userId: loggedIn.id ?? '',
    dwollaCustomerUrl: loggedIn.dwollaCustomerUrl ?? '',
    dwollaCustomerId: loggedIn.dwollaCustomerId ?? '',
    firstName: loggedIn.firstName ?? '',
    lastName: loggedIn.lastName ?? '',
    name: (loggedIn as any)['name'] ?? '',
    address1: (loggedIn as any)['address1'] ?? '',
    city: (loggedIn as any)['city'] ?? '',
    state: (loggedIn as any)['state'] ?? '',
    postalCode: (loggedIn as any)['postalCode'] ?? '',
    dateOfBirth: (loggedIn as any)['dateOfBirth'] ?? '',
    ssn: (loggedIn as any)['ssn'] ?? '',
  };

  const accounts = await getAccounts({ userId: loggedIn?.$id! })

  if(!accounts) return;

  const accountsData = accounts?.data;
  const appwriteItemId = (id as string) || accountsData[0]?.appwriteItemId
  const account = await getAccount({ appwriteItemId })
  // console.log("accountsData: ", accountsData)
  // console.log("totalBanks: ", accounts?.totalBanks)
  // console.log("totalCurrentBalance: ", accounts?.totalCurrentBalance)
  
  

  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
          <HeaderBox 
            type="greeting"
            title="Welcome"
            user={loggedIn?.firstName || 'Guest'}
            subtext = "Access and manage your account and transactions efficiently"
          />
        
          <TotalBalanceBox 
            accounts = {accountsData}
            totalBanks={accounts?.totalBanks}
            totalCurrentBalance={accounts?.totalCurrentBalance}
          />
        </header>

        <RecentTransactions 
          accounts={accountsData}
          transactions={account?.transactions}
          appwriteItemId={appwriteItemId}
          page={currentPage}
        />
      </div>

      <RightSidebar 
        user={user}
        transactions={account?.transactions}
        banks={accountsData?.slice(0, 2)}
      />
    </section>
  )
}

export default Home
