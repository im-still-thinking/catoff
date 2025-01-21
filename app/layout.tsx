import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/contexts/WalletContext";
import { WalletAuthProvider } from "@/contexts/WalletAuthContext";
import Image from "next/image";
import localFont from 'next/font/local'

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

const supercellMagic = localFont({
  src: '../public/fonts/supercell-magic.ttf',
  variable: '--font-supercell-magic'
})

export const metadata: Metadata = {
  title: "Clash Royale 1 ON 1",
  description: "An app where you challenge your friends to 1 on 1 Clash Royale Battles with a twist!",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <WalletAuthProvider>
        <html lang="en" className={supercellMagic.variable}>
          <body 
            className="mx-auto w-screen min-h-screen bg-cover bg-center bg-no-repeat" 
            style={{ backgroundImage: 'url("/assets/crbg1.png")' }}
          >
            <header className="p-4 bg-white/20 w-fit mx-auto px-10 rounded-b-xl border-l-[1px] border-l-white/50 backdrop-blur-sm shadow-md flex justify-between items-center">
              <div className="flex justify-center w-full">
                <Image 
                  src="/assets/crLogo.png"
                  className="w-40"
                  alt="Clash Royale Logo" 
                  width={500}
                  height={500}
                />
              </div>
            </header>
            <main>{children}</main>
          </body>
        </html>
      </WalletAuthProvider>
    </WalletProvider>
  );
}
