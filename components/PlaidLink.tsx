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
            <div className="p-4 border rounded-md bg-white">
                <h3 className="text-lg font-semibold mb-2">Add a bank (manual)</h3>
                <div className="flex flex-col gap-2">
                    <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank name" className="input-class" />
                    <input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="Account ID (public)" className="input-class" />
                    <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Initial balance (e.g. 123.45)" className="input-class" />
                    <div className="flex gap-2">
                        <Button onClick={submit} disabled={loading}>{loading ? 'Adding...' : 'Add Bank'}</Button>
                        <Button variant='ghost' onClick={() => setOpen(false)}>Cancel</Button>
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
