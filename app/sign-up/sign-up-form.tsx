"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // If session exists (email confirmation disabled), user is logged in - go to onboarding
    if (data.session) {
      router.push("/onboarding");
      router.refresh();
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  if (success) {
    return (
      <div className="p-4 rounded-lg bg-green-500/10 text-green-400 text-center space-y-2">
        <p>Check your email to confirm your account.</p>
        <p className="text-sm">
          After confirming, you&apos;ll be redirected to setup. Or{" "}
          <Link href="/sign-in" className="underline hover:text-green-300">
            sign in now
          </Link>{" "}
          if you&apos;ve already confirmed.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="fullName" className="block text-sm text-slate-400 mb-1">
          Full Name
        </label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Your name"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm text-slate-400 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm text-slate-400 mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Min 6 characters"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50 transition"
      >
        {loading ? "Creating account..." : "Sign Up"}
      </button>
    </form>
  );
}
