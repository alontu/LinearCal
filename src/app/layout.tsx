import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PHProvider } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "לוח שנה ליניארי · עין פרת",
  description: "לוח שנה שנתי ליניארי מבוסס Google Calendar · עין פרת",
};

export const viewport: Viewport = {
  themeColor: "#223a6b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <PHProvider>
          {children}
        </PHProvider>
      </body>
    </html>
  );
}
