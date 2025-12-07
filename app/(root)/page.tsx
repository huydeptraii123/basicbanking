import React from 'react'
import HeaderBox from '@/components/HeaderBox'
import TotalBalanceBox from '@/components/TotalBalanceBox'
import RightSidebar from '@/components/RightSidebar'
import { getLoggedInUser } from '@/lib/actions/user.actions'
import { getAccount, getAccounts } from '@/lib/actions/bank.actions'
import RecentTransactions from '@/components/RecentTransactions'
import { redirect } from 'next/navigation'

// const Home = async ({ searchParams: { id, page}}:SearchParamProps) => {
//   const currentPage = Number(page as string) || 1;
//   const loggedIn = await getLoggedInUser()

//   console.log("loggedIn home page: ", loggedIn);
//   if (!loggedIn) {
//     console.log("co goi ham if");
//     redirect('/sign-in')
//   }

//   // Ensure all required User fields exist
//   const user: User = {
//     $id: loggedIn.$id ?? '',
//     email: loggedIn.email ?? '',
//     userId: loggedIn.id ?? '',
//     firstName: loggedIn.firstName ?? '',
//     lastName: loggedIn.lastName ?? '',
//     name: (loggedIn as any)['name'] ?? '',
//     address1: (loggedIn as any)['address1'] ?? '',
//     city: (loggedIn as any)['city'] ?? '',
//     state: (loggedIn as any)['state'] ?? '',
//     postalCode: (loggedIn as any)['postalCode'] ?? '',
//     dateOfBirth: (loggedIn as any)['dateOfBirth'] ?? '',
//     ssn: (loggedIn as any)['ssn'] ?? '',
//   };

//   const accounts = await getAccounts({ userId: loggedIn?.$id! })

//   if(!accounts) return;

//   const accountsData = accounts?.data;
//   const appwriteItemId = (id as string) || accountsData[0]?.appwriteItemId
//   const account = await getAccount({ appwriteItemId })
//   // console.log("accountsData: ", accountsData)
//   // console.log("totalBanks: ", accounts?.totalBanks)
//   // console.log("totalCurrentBalance: ", accounts?.totalCurrentBalance)
  
  

//   return (
//     <section className="home">
//       <div className="home-content">
//         <header className="home-header">
//           <HeaderBox 
//             type="greeting"
//             title="Welcome"
//             user={loggedIn?.firstName || 'Guest'}
//             subtext = "Access and manage your account and transactions efficiently"
//           />
        
//           <TotalBalanceBox 
//             accounts = {accountsData}
//             totalBanks={accounts?.totalBanks}
//             totalCurrentBalance={accounts?.totalCurrentBalance}
//           />
//         </header>

//         <RecentTransactions 
//           accounts={accountsData}
//           transactions={account?.transactions}
//           appwriteItemId={appwriteItemId}
//           page={currentPage}
//         />
//       </div>

//       <RightSidebar 
//         user={user}
//         transactions={account?.transactions}
//         banks={accountsData?.slice(0, 2)}
//       />
//     </section>
//   )
// }


// Simple UI for error states
const ErrorScreen = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="flex flex-col items-center justify-center w-full py-20">
    <h1 className="text-2xl font-bold">{title}</h1>
    <p className="text-gray-500 mt-2">{subtitle}</p>
  </div>
);

const Home = async ({ searchParams: { id, page } }: SearchParamProps) => {
  const currentPage = Number(page) || 1;

  // ------------------------------------------------------
  // 1. GET LOGGED IN USER
  // ------------------------------------------------------
  const r1 = await getLoggedInUser();

  if (r1.status === "network_error") {
    return (
      <ErrorScreen
        title="Lỗi kết nối tới máy chủ"
        subtitle="Vui lòng kiểm tra mạng hoặc thử tải lại trang."
      />
    );
  }

  if (r1.status === "unauthorized") {
    redirect("/sign-in");
  }

  const loggedIn = r1.user;
  if (!loggedIn) {
    return (
      <ErrorScreen
        title="Không thể tải thông tin người dùng"
        subtitle="Vui lòng thử lại."
      />
    );
  }

  // Convert to full User type (RightSidebar expects full type)
  const user: User = {
    $id: loggedIn.$id,
    userId: loggedIn.id,
    email: loggedIn.email || "",
    firstName: loggedIn.firstName || "",
    lastName: loggedIn.lastName || "",
    name: "",
    address1: "",
    city: "",
    state: "",
    postalCode: "",
    dateOfBirth: "",
    ssn: "",
  };

  // ------------------------------------------------------
  // 2. GET ACCOUNTS
  // ------------------------------------------------------
  const r2 = await getAccounts({ userId: user.$id });

  if (r2?.status === "network_error" || !r2?.data) {
    return (
      <ErrorScreen
        title="Không thể tải danh sách tài khoản"
        subtitle="Vui lòng thử lại sau."
      />
    );
  }

  const accountsData = r2.data;

  if (accountsData.length === 0) {
    return (
      <ErrorScreen
        title="Không có tài khoản nào"
        subtitle="Hãy liên kết tài khoản ngân hàng trước."
      />
    );
  }

  const appwriteItemId = id || accountsData[0].appwriteItemId;

  // ------------------------------------------------------
  // 3. GET SINGLE ACCOUNT (transactions)
  // ------------------------------------------------------
  let account: any = null;

  try {
    account = await getAccount({ appwriteItemId });
  } catch (err) {
    account = null;
  }

  // ------------------------------------------------------
  // 4. RENDER PAGE
  // ------------------------------------------------------
  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
          <HeaderBox
            type="greeting"
            title="Welcome"
            user={user.firstName || "Guest"}
            subtext="Access and manage your account and transactions efficiently"
          />

          <TotalBalanceBox
            accounts={accountsData}
            totalBanks={r2.totalBanks}
            totalCurrentBalance={r2.totalCurrentBalance}
          />
        </header>

        <RecentTransactions
        accounts={accountsData}
        transactions={account?.transactions ?? []}
        appwriteItemId={appwriteItemId}
        page={currentPage}
      />

      </div>

      <RightSidebar
        user={user}
        transactions={account?.transactions ?? []}
        banks={accountsData.slice(0, 2)}
      />
    </section>
  );
};

export default Home;


