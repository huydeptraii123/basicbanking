"use client"

import { formatAmount } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import React, { useState } from 'react'
import Copy from './Copy'
import { useRouter } from 'next/navigation'

const BankCard = ({ account, userName, showBalance = true}: CreditCardProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDisconnect = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm('Bạn có chắc muốn ngắt kết nối tài khoản này?')) return;
    try {
      setLoading(true);
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${base}/api/banks/${account.appwriteItemId}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => 'error');
        alert('Xóa thất bại: ' + txt);
        return;
      }

      // refresh page to reflect removal
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Lỗi khi xóa tài khoản. Xem console.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      <Link href={`/transaction-history/?id=${account.appwriteItemId}`} className="bank-card">
        <div className="bank-card_content">
          <div>
            <h1 className="text-16 font-semibold text-white">
                {account.name}
            </h1>
            <p className="font-ibm-plex-serif font-black text-white">
                {formatAmount(account.currentBalance)}
            </p>
        </div>
        <article className="flex flex-col gap-2">
            <div className="flex justify-between">
                <h1 className="text-12 font-semibold text-white">
                    {userName}
                </h1>
                <h2 className="text-12 font-semibold text-white">
                    ●● / ●●
                </h2>
            </div>
            <p className="text-14 font-semibold tracking-[1.1px] text-white">
              ●●●● ●●●● ●●●● <span className="text-16">{account?.mask}</span>
            </p>
        </article>
        </div>
        <div className="bank-card_icon">
          <Image 
          src="/icons/Paypass.svg"
          width={20}
          height={20}
          alt= "pay"
          />
          <Image
          src="/icons/mastercard.svg"
          width={45}
          height={32}
          alt= "mastercard"
          className="ml-5"
          />
        </div>

        <Image
        src="/icons/lines.png"
        width={316}
        height={190}
        alt = "lines"
        className="absolute top-0 left-0"
        />
      </Link>

      <div className="mt-2 flex items-center gap-2">
        {showBalance && <Copy title={account?.sharableId}/>}
        <button onClick={handleDisconnect} disabled={loading} className="text-sm text-red-600 hover:underline">
          {loading ? 'Disconnecting...' : 'Disconnect'}
        </button>
      </div>
    </div>
  )
}

export default BankCard
