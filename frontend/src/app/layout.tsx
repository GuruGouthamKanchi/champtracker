import type { Metadata, Viewport } from "next";
import { Inter, Orbitron } from "next/font/google";
import "./globals.css";
import PWARegister from "@/components/PWARegister";
import Providers from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MonoPosto Championship Tracker",
  description: "F1-style Esports Championship Tracker for MonoPosto 1v1 Online Duels.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MonoPosto GP",
  },
};

export const viewport: Viewport = {
  themeColor: "#3F0D12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${orbitron.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#2C0509] text-[#FBE4E3] font-sans flex flex-col items-center justify-start overflow-x-hidden">
        {/* Mobile container wrapper */}
        <div className="w-full max-w-md min-h-screen bg-[#3F0D12] shadow-2xl flex flex-col relative border-x border-[#98111E]/20">
          <Providers>{children}</Providers>
        </div>
        <PWARegister />
      </body>
    </html>
  );
}
