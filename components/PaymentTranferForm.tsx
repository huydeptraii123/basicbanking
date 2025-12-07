"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { BankDropdown } from "./BankDropdown";
import { Button } from "./ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { fetchWithRetry } from "@/lib/core-fetch";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
  amount: z.string().min(1, "Amount is required"),
  senderBank: z.string().min(1, "Please select a valid bank account"),
  sharableId: z.string().min(1, "Please enter a receiver account id"),
});

const PaymentTransferForm = ({ accounts }: PaymentTransferFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      amount: "",
      senderBank: "",
      sharableId: "",
    },
  });

  // --- 1. HÀM TRÍCH XUẤT LỖI TỔNG QUÁT (Universal Error Extractor) ---
  // Hàm này chấp nhận mọi kiểu input và cố gắng tìm ra chuỗi lỗi có nghĩa nhất
  const extractError = (payload: any, fallback: string = "Giao dịch thất bại"): string => {
    if (!payload) return fallback;

    // Trường hợp 1: Payload là string
    if (typeof payload === "string") return payload;

    // Trường hợp 2: Payload là object, tìm các key phổ biến
    // Ưu tiên tìm key 'error', sau đó đến 'message', rồi 'detail'
    const msg = payload.error || payload.message || payload.detail || payload.title;
    
    if (msg && typeof msg === "string") return msg;

    // Trường hợp 3: Nếu là object nhưng không tìm thấy key nào quen thuộc
    // convert sang string (cẩn thận nếu object quá to, nhưng error thường nhỏ)
    if (typeof payload === 'object') {
        try {
            return JSON.stringify(payload);
        } catch {
            return fallback;
        }
    }

    return fallback;
  };

  // --- 2. HÀM XỬ LÝ UI ---
  const handleApiError = (rawError: any) => {
    // Dùng hàm extractError ở trên để lấy nội dung lỗi
    const message = extractError(rawError);

    // Kiểm tra từ khóa Chaos Monkey
    if (message.includes("CHAOS_MONKEY_ERROR")) {
      setErrorMessage("Có lỗi xảy ra! Vui lòng thử lại");
    } else {
      setErrorMessage(message);
    }
  };

  const submit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setErrorMessage(null);

    const idempotencyKey = crypto.randomUUID(); 

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      
      const rawShar = (data.sharableId || '').toString();
      let cleanedShar = rawShar.trim();
      if (!/^[\x20-\x7E]+$/.test(cleanedShar)) {
        const digits = rawShar.replace(/\D+/g, '');
        cleanedShar = (digits && digits.length >= 3) ? digits : rawShar.replace(/[^\x20-\x7E]/g, '').trim();
      }
      const receiverAccountId = cleanedShar;

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // --- Lookup Receiver ---
      const receiverRes = await fetchWithRetry(`${base}/api/banks/by-account/${encodeURIComponent(receiverAccountId)}`, { headers, credentials: 'include' });
      if (!receiverRes.ok) {
        const body = await receiverRes.json().catch(() => null); // Trả về null nếu parse lỗi
        // Gọi hàm handleApiError với body (hoặc status text nếu body null)
        handleApiError(body || `Lỗi tìm người nhận (${receiverRes.status})`);
        setIsLoading(false);
        return;
      }

      // --- Lookup Sender ---
      const senderRes = await fetchWithRetry(`${base}/api/banks/${encodeURIComponent((data.senderBank || '').trim())}`, { headers, credentials: 'include' });
      if (!senderRes.ok) {
        const body = await senderRes.json().catch(() => null);
        handleApiError(body || `Lỗi tìm ngân hàng nguồn (${senderRes.status})`);
        setIsLoading(false);
        return;
      }

      const receiverBank = await receiverRes.json();
      const senderBank = await senderRes.json();

      const parsedAmount = parseFloat(data.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) throw new Error('Số tiền không hợp lệ');

      // --- Transaction Object ---
      const transaction = {
        name: data.name || undefined,
        amount: parsedAmount,
        senderId: (senderBank as any).userId,
        senderBankId: (senderBank as any).id,
        receiverId: (receiverBank as any).userId,
        receiverBankId: (receiverBank as any).id,
        email: data.email,
        channel: 'online',
        category: 'Transfer',
        idempotencyKey: idempotencyKey, 
      };

      // --- Create Transaction (POST) ---
      const txRes = await fetchWithRetry(`${base}/api/transactions/create`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(transaction),
      });

      if (txRes.ok) {
        form.reset();
        router.push('/');
      } else {
        const body = await txRes.json().catch(() => null);
        handleApiError(body || 'Giao dịch thất bại');
      }
    } catch (error) {
      console.error("Lỗi submit form: ", error);
      handleApiError(error);
    }

    setIsLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="flex flex-col">
        
        {/* Chỉ hiển thị text lỗi, giữ nguyên form */}
        {errorMessage && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 font-medium border border-red-200">
            {errorMessage}
          </div>
        )}

        <FormField
          control={form.control}
          name="senderBank"
          render={() => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item pb-6 pt-5">
                <div className="payment-transfer_form-content">
                  <FormLabel className="text-14 font-medium text-gray-700">
                    Select Source Bank
                  </FormLabel>
                  <FormDescription className="text-12 font-normal text-gray-600">
                    Select the bank account you want to transfer funds from
                  </FormDescription>
                </div>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <BankDropdown
                      accounts={accounts}
                      setValue={form.setValue}
                      otherStyles="!w-full"
                    />
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item pb-6 pt-5">
                <div className="payment-transfer_form-content">
                  <FormLabel className="text-14 font-medium text-gray-700">
                    Transfer Note (Optional)
                  </FormLabel>
                  <FormDescription className="text-12 font-normal text-gray-600">
                    Please provide any additional information or instructions
                    related to the transfer
                  </FormDescription>
                </div>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <Textarea
                      placeholder="Write a short note here"
                      className="input-class"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <div className="payment-transfer_form-details">
          <h2 className="text-18 font-semibold text-gray-900">
            Bank account details
          </h2>
          <p className="text-16 font-normal text-gray-600">
            Enter the bank account details of the recipient
          </p>
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item py-5">
                <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">
                  Recipient&apos;s Email Address
                </FormLabel>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <Input
                      placeholder="ex: johndoe@gmail.com"
                      className="input-class"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sharableId"
          render={({ field }) => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item pb-5 pt-6">
                <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">
                  Receiver&apos;s Plaid Sharable Id
                </FormLabel>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <Input
                      placeholder="Enter the public account number"
                      className="input-class"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem className="border-y border-gray-200">
              <div className="payment-transfer_form-item py-5">
                <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">
                  Amount
                </FormLabel>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <Input
                      placeholder="ex: 5.00"
                      className="input-class"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <div className="payment-transfer_btn-box">
          <Button type="submit" className="payment-transfer_btn" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" /> &nbsp; Sending...
              </>
            ) : (
              "Transfer Funds"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PaymentTransferForm;