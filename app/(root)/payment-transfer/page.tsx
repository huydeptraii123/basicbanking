import HeaderBox from '@/components/HeaderBox'
import PaymentTransferForm from '@/components/PaymentTranferForm'
import { getAccounts } from '@/lib/actions/bank.actions'
import { getLoggedInUser } from '@/lib/actions/user.actions'
import { redirect } from 'next/navigation'
import React from 'react'

// Tái sử dụng ErrorScreen (bạn có thể tách ra file riêng nếu muốn dùng chung)
const ErrorScreen = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="flex flex-col items-center justify-center w-full py-20 px-4 text-center">
    <h1 className="text-2xl font-bold text-red-500">{title}</h1>
    <p className="text-gray-500 mt-2">{subtitle}</p>
  </div>
);

const Transfer = async () => {
  // 1. GET LOGGED IN USER
  const userResponse = await getLoggedInUser();

  if (userResponse.status === "network_error") {
    return (
      <ErrorScreen 
        title="Lỗi kết nối" 
        subtitle="Không thể tải thông tin người dùng. Vui lòng kiểm tra mạng và tải lại trang." 
      />
    );
  }

  if (userResponse.status === "unauthorized" || !userResponse.user) {
    redirect('/sign-in');
  }

  const loggedIn = userResponse.user;

  // 2. GET ACCOUNTS
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
        subtitle="Bạn cần liên kết tài khoản ngân hàng trước khi thực hiện chuyển tiền." 
      />
    );
  }

  // 3. RENDER FORM
  return (
    <section className="payment-transfer">
      <HeaderBox 
        title="Payment Transfer"
        subtext="Please provide any specific details or notes related to the payment transfer"
      />

      <section className="size-full pt-5">
        <PaymentTransferForm accounts={accountsData}/>
      </section>
    </section>
  )
}

export default Transfer