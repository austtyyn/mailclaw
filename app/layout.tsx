import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MailForge - Deliverability Infrastructure",
  description: "Deliverability and warmup infrastructure for AI agents and automated outbound systems",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
