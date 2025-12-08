// app/(root)/layout.tsx
import MobileNavWrapper from "./MobileNavWrapper";
import SidebarWrapper from "./SidebarWrapper";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import Image from "next/image";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const response = await getLoggedInUser();

  // Biến user mặc định là null (cho trường hợp lỗi/chưa login)
  let user = null;

  if (response?.user) {
 
    const loggedInUser = response.user as any;

    user = {
      ...loggedInUser,

      firstName: loggedInUser.firstName || loggedInUser.name?.split(' ')[0] || 'Member',
      lastName: loggedInUser.lastName || loggedInUser.name?.split(' ').slice(1).join(' ') || '',
      

      userId: loggedInUser.$id || loggedInUser.id || loggedInUser.userId,
      $id: loggedInUser.$id || loggedInUser.id
    };
  }



  return (
    <main className="flex h-screen w-full font-inter">
      <SidebarWrapper user={user} />
      
      <div className="flex size-full flex-col">
        <div className="root-layout">
          <Image src="/icons/logo.svg" width={30} height={30} alt="logo" />
          <MobileNavWrapper user={user} />
        </div>
        {children}
      </div>
    </main>
  );
}