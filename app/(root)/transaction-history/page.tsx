// import HeaderBox from '@/components/HeaderBox'
// import { Pagination } from '@/components/Pagination';
// import TransactionsTable from '@/components/TransactionsTable';
// import { getAccount, getAccounts } from '@/lib/actions/bank.actions';
// import { getLoggedInUser } from '@/lib/actions/user.actions';
// import { formatAmount } from '@/lib/utils';
// import React from 'react'

// const TransactionHistory = async ({ searchParams: {id, page}}: SearchParamProps) => {
//   const currentPage = Number(page as string) || 1;
//     const loggedIn = await getLoggedInUser()
//     const accounts = await getAccounts({ userId: loggedIn?.$id! })
    
  
//     if(!accounts) return;
  
//     const accountsData = accounts?.data;
//     const appwriteItemId = (id as string) || accountsData[0]?.appwriteItemId
//     const account = await getAccount({ appwriteItemId })

//     const rowsPerPage = 10;
//     const totalPages = Math.ceil(account?.transactions.length / rowsPerPage);

//     const indexOfLastTransaction = currentPage * rowsPerPage;
//     const indexOfFirstTransaction = indexOfLastTransaction - rowsPerPage;

//     const currentTransactions = account?.transactions.slice(
//         indexOfFirstTransaction, indexOfLastTransaction
//     )
//   return (
//     <div className="transactions">
//       <div className="transactions-header">
//       <HeaderBox 
//       title ="Transaction History"
//       subtext="See your bank details and transactions."
//       />
//       </div>

//       <div className="space-y-6">
//       <div className="transactions-account">
//         <div className="flex flex-col gap-2">
//           <h2 className="text-18 font-bold text-white">{account?.data.name}</h2>
//           <p className="text-14 text-blue-25">
//             {account?.data.officialName}
//           </p>
//           <p className="text-14 font-semibold tracking-[1.1px] text-white">
//               ●●●● ●●●● ●●●● {account?.data.mask}
//             </p>
//         </div>
//           <div className="transactions-account-balance">
//             <p className="text-14">
//               Current balance
//             </p>
//             <p className="text-24 text-center font-bold">
//               {formatAmount(account?.data.currentBalance)}
//             </p>
//           </div>
//       </div>
//       <section className="flex w-full flex-col gap-6">
//         <TransactionsTable 
//         transactions = {currentTransactions}
//         />

//         {totalPages > 1 && (
//             <div className='my-4 w-full'>
//                 <Pagination
//                 totalPages={totalPages}
//                 page = {currentPage}
//                 />
//             </div>
//         )}
//       </section>
//       </div>
//     </div>
//   )
// }

// export default TransactionHistory

import HeaderBox from '@/components/HeaderBox'
import { Pagination } from '@/components/Pagination';
import TransactionsTable from '@/components/TransactionsTable';
import { getAccount, getAccounts } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { formatAmount } from '@/lib/utils';
import { redirect } from 'next/navigation';
import React from 'react'

// 1. Tạo một UI báo lỗi tái sử dụng 
const ErrorScreen = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="flex flex-col items-center justify-center w-full py-20 px-4 text-center">
    <h1 className="text-2xl font-bold text-red-500">{title}</h1>
    <p className="text-gray-500 mt-2">{subtitle}</p>
  </div>
);

const TransactionHistory = async ({ searchParams: {id, page}}: SearchParamProps) => {
  const currentPage = Number(page as string) || 1;

  // ------------------------------------------------------
  // BƯỚC 1: LẤY USER (User -> if Fail -> STOP)
  // ------------------------------------------------------
  const userResponse = await getLoggedInUser();

  // Case: Lỗi mạng/Retry thất bại
  if (userResponse.status === "network_error") {
    return (
      <ErrorScreen 
        title="Lỗi kết nối" 
        subtitle="Không thể tải thông tin người dùng. Vui lòng tải lại trang." 
      />
    );
  }

  // Case: Chưa đăng nhập hoặc token hết hạn
  if (userResponse.status === "unauthorized" || !userResponse.user) {
    redirect('/sign-in');
  }

  const loggedIn = userResponse.user;

  // ------------------------------------------------------
  // BƯỚC 2: LẤY DANH SÁCH TÀI KHOẢN (Accounts -> if Fail -> STOP)
  // Chỉ chạy khi Bước 1 thành công
  // ------------------------------------------------------
  const accountsResponse = await getAccounts({ userId: loggedIn.$id });

  if (accountsResponse?.status === "network_error" || !accountsResponse?.data) {
    return (
      <ErrorScreen 
        title="Không thể tải danh sách tài khoản" 
        subtitle="Hệ thống đang gặp sự cố khi lấy dữ liệu ngân hàng. Vui lòng thử lại sau." 
      />
    );
  }

  const accountsData = accountsResponse.data;
  
  if (accountsData.length === 0) {
    return (
      <ErrorScreen 
        title="Chưa có tài khoản" 
        subtitle="Bạn chưa liên kết tài khoản ngân hàng nào." 
      />
    );
  }

  // ------------------------------------------------------
  // BƯỚC 3: LẤY CHI TIẾT GIAO DỊCH (Account Detail -> if Fail -> STOP)
  // Chỉ chạy khi Bước 2 thành công
  // ------------------------------------------------------
  const appwriteItemId = (id as string) || accountsData[0]?.appwriteItemId;
  
  // Hàm getAccount của bạn trả về null nếu lỗi, nên ta kiểm tra null
  const account = await getAccount({ appwriteItemId });

  if (!account) {
    return (
      <ErrorScreen 
        title="Lỗi tải giao dịch" 
        subtitle="Không thể tìm thấy thông tin chi tiết của tài khoản này." 
      />
    );
  }

  // ------------------------------------------------------
  // BƯỚC 4: XỬ LÝ LOGIC HIỂN THỊ
  // Đến đây đảm bảo 100% dữ liệu đã có đủ
  // ------------------------------------------------------
  const rowsPerPage = 10;
  const totalPages = Math.ceil(account.transactions.length / rowsPerPage);

  const indexOfLastTransaction = currentPage * rowsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - rowsPerPage;

  const currentTransactions = account.transactions.slice(
    indexOfFirstTransaction, indexOfLastTransaction
  );

  // ------------------------------------------------------
  // BƯỚC 5: RENDER UI
  // ------------------------------------------------------
  return (
    <div className="transactions">
      <div className="transactions-header">
        <HeaderBox 
          title="Transaction History"
          subtext="See your bank details and transactions."
        />
      </div>

      <div className="space-y-6">
        <div className="transactions-account">
          <div className="flex flex-col gap-2">
            <h2 className="text-18 font-bold text-white">{account.data.name}</h2>
            <p className="text-14 text-blue-25">
              {account.data.officialName}
            </p>
            <p className="text-14 font-semibold tracking-[1.1px] text-white">
              ●●●● ●●●● ●●●● {account.data.mask}
            </p>
          </div>
          <div className="transactions-account-balance">
            <p className="text-14">Current balance</p>
            <p className="text-24 text-center font-bold">
              {formatAmount(account.data.currentBalance)}
            </p>
          </div>
        </div>

        <section className="flex w-full flex-col gap-6">
          <TransactionsTable 
            transactions={currentTransactions}
          />

          {totalPages > 1 && (
            <div className='my-4 w-full'>
              <Pagination
                totalPages={totalPages}
                page={currentPage}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default TransactionHistory