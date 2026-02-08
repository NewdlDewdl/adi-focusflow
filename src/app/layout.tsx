import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import ModeSelector from "@/components/navigation/ModeSelector";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  title: "FocusFlow",
  description: "AI-powered focus coaching with real-time webcam detection",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://api.fontshare.com/v2/css?f[]=zodiak@700&f[]=plus-jakarta-sans@400,500,600,700&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${plusJakartaSans.variable} antialiased`}
      >
        <ModeSelector />
        {children}
      </body>
    </html>
  );
}
