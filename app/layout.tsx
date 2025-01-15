import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/contexts/WalletContext";
import { WalletAuthProvider } from "@/contexts/WalletAuthContext";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "Clash Royale 1 ON 1",
  description: "An app where you challenge your friends to 1 on 1 Clash Royale Battles with a twist!",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <WalletAuthProvider>
        <html lang="en">
          <body className="min-h-screen bg-gray-100">
            <header className="p-4 bg-white shadow-md flex justify-between items-center">
              <h1 className="text-lg font-bold text-black">Clash Royale 1 On 1</h1>
            </header>
            <main>{children}</main>
          </body>
        </html>
      </WalletAuthProvider>
    </WalletProvider>
  );
}
