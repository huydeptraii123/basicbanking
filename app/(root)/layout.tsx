"use client";

import MobileNav from "@/components/MobileNav";
import Sidebar from "@/components/Sidebar";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { log } from "console";
import Image from "next/image";
import { redirect, useRouter } from "next/navigation";
import * as Sentry from '@sentry/nextjs';
import type { Metadata } from 'next';

// Add or edit your "generateMetadata" to include the Sentry trace data:
// export function generateMetadata(): Metadata {
//   return {
//     // ... your existing metadata
//     other: {
//       ...Sentry.getTraceData()
//     }
//   };
// }

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const loggedIn = await getLoggedInUser();

  if(!loggedIn) router.push('/sign-in');

  // Ensure all required User fields exist
  const user: User | null = loggedIn
    ? {
        $id: loggedIn.$id ?? '',
        email: loggedIn.email ?? '',
        userId: loggedIn.userId ?? loggedIn.id ?? '',
        dwollaCustomerUrl: loggedIn.dwollaCustomerUrl ?? '',
        dwollaCustomerId: loggedIn.dwollaCustomerId ?? '',
        firstName: loggedIn.firstName ?? '',
        lastName: loggedIn.lastName ?? '',
        name: loggedIn.name ?? '',
        address1: loggedIn.address1 ?? '',
        city: loggedIn.city ?? '',
        state: loggedIn.state ?? '',
        postalCode: loggedIn.postalCode ?? '',
        dateOfBirth: loggedIn.dateOfBirth ?? '',
        ssn: loggedIn.ssn ?? '',
      }
    : null;

  return (
    <main className="flex h-screen w-full font-inter">
        <Sidebar user={user} />
        <div className="flex size-full flex-col">
          <div className="root-layout">
            <Image src="/icons/logo.svg" width ={30} height={30} alt="logo" />
            <div>
              <MobileNav user={user}/>
            </div>
          </div>
          {children}
        </div>
    </main>
  );
}
