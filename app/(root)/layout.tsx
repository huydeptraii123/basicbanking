// app/(root)/layout.tsx
import MobileNavWrapper from "./MobileNavWrapper";
import SidebarWrapper from "./SidebarWrapper";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import Image from "next/image";
import { redirect } from "next/navigation";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // 1. Lấy response từ hàm
  const response = await getLoggedInUser();

  // 2. CHECK ĐÚNG: Phải check vào properties bên trong (response.user)
  // Vì response luôn là object { status: ... }, nên check !response là vô nghĩa
  if (!response || !response.user) {
      redirect("/sign-in");
  }

  // 3. BÓC TÁCH DỮ LIỆU (UNWRAP)
  // Lấy cái ruột "user" ra khỏi cái vỏ "response"
  const user = response.user; 
  
  // Log kiểm tra lần cuối (Optional)
  console.log("RootLayout User Data:", user);

  return (
    <main className="flex h-screen w-full font-inter">
      {/* Lúc này biến user truyền vào mới đúng là object user thật ($id, email...) */}
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