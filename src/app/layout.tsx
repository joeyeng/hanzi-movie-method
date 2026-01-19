import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hanzi Movie Method",
  description: "Chinese character learning database using the Hanzi Movie Method",
  manifest: "/manifest.json",
  icons: {
    icon: '/icon.svg',
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '汉字 HMM',
  },
  themeColor: '#f59e0b',
};

export const viewport = {
  width: 'device-width',
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-white overflow-x-hidden`}
      >
        <div className="flex min-h-screen w-full max-w-full overflow-x-hidden">
          <Sidebar />
          <main className="flex-1 p-4 lg:p-8 pt-20 lg:pt-8 min-w-0 overflow-x-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}
