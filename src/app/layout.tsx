import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Is It Worth It? — AI Furniture Value Comparison",
    template: "%s | Is It Worth It?",
  },
  description:
    "Paste a furniture product URL and instantly see if it's worth the price — with AI-powered alternatives from top retailers.",
  openGraph: {
    siteName: "Is It Worth It?",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-50 dark:bg-zinc-950`}
      >
        {children}
      </body>
    </html>
  );
}
