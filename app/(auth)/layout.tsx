import Image from "next/image";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main 
      className="flex min-h-screen w-full justify-center items-center font-inter bg-cover bg-center"
      style={{ backgroundImage: "url('/icons/auth-image.jpg')" }}
    >
        {children}
      
    </main>
  );
}
