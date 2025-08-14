import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/**
 * Root Layout Component
 * 
 * Provides the base HTML structure and global styling:
 * - Google Fonts integration (Geist Sans and Geist Mono)
 * - CSS custom properties for font variables
 * - Antialiased text rendering for crisp typography
 * - Responsive viewport configuration
 */

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Chat Assistant - Secure AI Conversations",
  description: "A secure AI chat application with personal API key management, multiple AI models, and personality templates.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
