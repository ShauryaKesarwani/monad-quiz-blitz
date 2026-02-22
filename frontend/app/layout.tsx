import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Category Bomb Arena — Dev Dashboard",
  description: "Dev test dashboard: backend, WebSocket, wallet, Monad Testnet",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen font-mono antialiased">
        {children}
      </body>
    </html>
  );
}
