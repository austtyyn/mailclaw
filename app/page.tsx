import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
          MailForge
        </h1>
        <p className="text-slate-400 mb-8">
          Deliverability and warmup infrastructure for AI agents and automated
          outbound systems
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/sign-in"
            className="px-6 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
