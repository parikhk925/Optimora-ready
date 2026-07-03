import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Optimora — AI Agents for Every Business",
  description: "Deploy autonomous AI agents that research, qualify, follow up, support customers, process invoices, and run workflows across your entire business.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
