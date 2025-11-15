import React, { useState } from 'react'
import { Button } from './ui/button'
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type PlaidLinkProps = {
  user: User | null;
  variant?: 'primary' | 'ghost' | 'default';
}

// Simple manual bank link component that posts to backend to create a bank record
const PlaidLink = ({ user, variant }: PlaidLinkProps) => {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [bankName, setBankName] = useState('');
    const [accountId, setAccountId] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);

    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    const submit = async () => {
        if (!user) {
            alert('Bạn cần đăng nhập để thêm tài khoản ngân hàng');
            return;
        }
        if (!bankName || !accountId) {
            alert('Vui lòng nhập tên ngân hàng và mã tài khoản');
            return;
        }
        setLoading(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const headers: any = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${base}/api/banks/create`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ userId: (user as any).$id || (user as any).id || (user as any).userId, bankName, accountId, balance: amount ? parseFloat(amount) : 0 }),
            });
            const data = await res.json();
            if (res.ok) {
                router.push('/');
            } else {
                console.error('Create bank failed', data);
                alert('Tạo tài khoản thất bại: ' + (data?.error || JSON.stringify(data)));
            }
        } catch (err) {
            console.error(err);
            alert('Lỗi khi kết nối tới server. Xem console để biết chi tiết.');
        } finally {
            setLoading(false);
            setOpen(false);
        }
    }

    if (open) {
        return (
            <div className="p-6 rounded-xl border border-gray-200 bg-white shadow-md max-w-sm mx-auto">
                <h3 className="text-lg font-semibold mb-4 text-center">Add a bank (manual)</h3>
                <div className="flex flex-col gap-3">
                    <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank name" className="px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    <input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="Account ID (public)" className="px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Initial balance (e.g. 123.45)" className="px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    <div className="flex gap-3 justify-center mt-2 bg-gradient-to-r from-blue-100 via-blue-200 to-blue-100 rounded-lg p-4">
                        <button onClick={submit} disabled={loading} className="px-4 py-2 rounded bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition">{loading ? 'Adding...' : 'Add Bank'}</button>
                        <button onClick={() => setOpen(false)} className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold shadow hover:bg-gray-300 transition">Cancel</button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
        {variant === 'primary' ? (
            <Button onClick={() => setOpen(true)} className="plaidlink-primary">Connect your bank account</Button>
        ) : variant === 'ghost' ? (
            <Button variant='ghost' onClick={() => setOpen(true)} className="plaidlink-ghost">
                <Image src="/icons/connect-bank.svg" alt="connect bank" width={24} height={24} />
                <p className='hidden text-[16px] font-semibold text-black-2 xl:block'>Connect bank</p>
            </Button>
        ) : (
            <Button onClick={() => setOpen(true)} className="plaidlink-default">
                <Image src="/icons/connect-bank.svg" alt="connect bank" width={24} height={24} />
                <p className='text-[16px] font-semibold text-black-2'>Connect bank</p>
            </Button>
        )}
        </>
    )
}

export default PlaidLink
