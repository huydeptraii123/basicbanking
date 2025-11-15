// app/(root)/layout.tsx
import MobileNavWrapper from "./MobileNavWrapper"; // client component
import SidebarWrapper from "./SidebarWrapper"; // client component
import { getLoggedInUser } from "@/lib/actions/user.actions";
import Image from "next/image";
import { redirect } from "next/navigation";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const loggedIn = await getLoggedInUser();
  if (!loggedIn) redirect("/sign-in");

  const user = loggedIn; // hoặc map fields như bạn muốn

  return (
    <main className="flex h-screen w-full font-inter">
      {/* SidebarWrapper là Client Component */}
      <SidebarWrapper user={user} />
      <div className="flex size-full flex-col">
        <div className="root-layout">
          <Image src="/icons/logo.svg" width={30} height={30} alt="logo" />
          {/* MobileNavWrapper là Client Component */}
          <MobileNavWrapper user={user} />
        </div>
        {children}
      </div>
    </main>
  );
}
