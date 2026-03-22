"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/onboarding", label: "Setup" },
  { href: "/domains", label: "Domains" },
  { href: "/mailboxes", label: "Mailboxes" },
  { href: "/warmup", label: "Warmup" },
  { href: "/settings/api-keys", label: "API Keys" },
];

export function DashboardNav() {
  const pathname = usePathname();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <nav className="border-b border-slate-800 bg-slate-900/50">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="font-semibold text-white">
            MailClaw
          </Link>
          <div className="flex gap-6">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium ${
                    isActive
                      ? "text-blue-400"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}
