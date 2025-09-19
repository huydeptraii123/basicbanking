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
  return (
    <main className="flex h-screen w-full font-inter">
        <Sidebar user={loggedIn} />
        <div className="flex size-full flex-col">
          <div className="root-layout">
            <Image src="/icons/logo.svg" width ={30} height={30} alt="logo" />
            <div>
              <MobileNav user= {loggedIn}/>
            </div>
          </div>
          {children}
        </div>

        
    </main>
  );
}
