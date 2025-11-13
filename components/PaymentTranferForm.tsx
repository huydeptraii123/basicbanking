"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

// We'll call backend endpoints directly (no external Dwolla/Plaid)
import { decryptId } from "@/lib/utils";

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

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  // note is optional in the UI — make it optional here
  name: z.string().optional(),
  // accept any non-empty amount string (we parse to float later)
  amount: z.string().min(1, "Amount is required"),
  senderBank: z.string().min(1, "Please select a valid bank account"),
  // receiver id/public account may be plain text or base64 — keep validation loose
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

  const submit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      console.log('Transfer submit payload', data);
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      // sanitize receiver sharable id from the form before decoding/sending
      const rawShar = (data.sharableId || '').toString();
      console.log('raw sharableId from form:', JSON.stringify(rawShar));
      let cleanedShar = rawShar.trim();
      // if contains non-printable/control characters, try digits-only fallback
      if (!/^[\x20-\x7E]+$/.test(cleanedShar)) {
        const digits = rawShar.replace(/\D+/g, '');
        if (digits && digits.length >= 3) {
          cleanedShar = digits;
          console.log('cleaned sharableId (digits fallback):', cleanedShar);
        } else {
          // remove non-ascii then trim
          const asciiOnly = rawShar.replace(/[^\x20-\x7E]/g, '').trim();
          cleanedShar = asciiOnly;
          console.log('cleaned sharableId (ascii strip):', cleanedShar);
        }
      }
      const receiverAccountId = cleanedShar;
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  console.log('Calling backend banks lookup', { receiverAccountId, senderBankId: data.senderBank, base });
  const receiverRes = await fetch(`${base}/api/banks/by-account/${encodeURIComponent(receiverAccountId)}`, { headers, credentials: 'include' });
  if (!receiverRes.ok) {
    const body = await receiverRes.json().catch(() => ({}));
    const msg = body?.error || `receiver lookup failed (${receiverRes.status})`;
    console.error('receiver lookup failed', receiverRes.status, body);
    setErrorMessage(msg);
    setIsLoading(false);
    return;
  }
  const senderRes = await fetch(`${base}/api/banks/${encodeURIComponent((data.senderBank || '').trim())}`, { headers, credentials: 'include' });
  if (!senderRes.ok) {
    const body = await senderRes.json().catch(() => ({}));
    const msg = body?.error || `sender lookup failed (${senderRes.status})`;
    console.error('sender lookup failed', senderRes.status, body);
    setErrorMessage(msg);
    setIsLoading(false);
    return;
  }
  const receiverBank = await receiverRes.json();
  const senderBank = await senderRes.json();

      // validate numeric amount
      const parsedAmount = parseFloat(data.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Invalid amount');
      }

      // create transaction record locally (we are not calling Dwolla)
      const transaction = {
        name: data.name || undefined,
        amount: parsedAmount,
        senderId: (senderBank as any).userId,
        senderBankId: (senderBank as any).id,
        receiverId: (receiverBank as any).userId,
        receiverBankId: (receiverBank as any).id,
        email: data.email,
        channel: 'online',
        category: 'Transfer'
      };

      console.log('Creating transaction', transaction);
      const txRes = await fetch(`${base}/api/transactions/create`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(transaction),
      });

      if (txRes.ok) {
        form.reset();
        router.push('/');
      } else {
        const body = await txRes.json().catch(() => ({}));
        console.error('create transaction failed', body);
        setErrorMessage(body?.error || 'Transaction failed');
      }
    } catch (error) {
      console.error("Submitting create transfer request failed: ", error);
      setErrorMessage((error as any)?.message || 'Transfer failed');
    }

    setIsLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="flex flex-col">
        {errorMessage && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
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
          <Button type="submit" className="payment-transfer_btn">
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