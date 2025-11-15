// app/(root)/MobileNavWrapper.tsx
"use client";
import MobileNav from "@/components/MobileNav";

export default function MobileNavWrapper({ user }: { user: any }) {
  return <MobileNav user={user} />;
}
