import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SolShadow — Shadow the smartest wallets on Solana",
  description: "Real-time whale wallet tracker and copy-trading signal agent powered by GoldRush",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}