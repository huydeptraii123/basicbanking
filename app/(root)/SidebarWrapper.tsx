// app/(root)/SidebarWrapper.tsx
"use client";
import Sidebar from "@/components/Sidebar";

export default function SidebarWrapper({ user }: { user: any }) {
  return <Sidebar user={user} />;
}
