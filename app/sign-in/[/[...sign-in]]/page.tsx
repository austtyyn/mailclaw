import { SignIn } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function SignInPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center text-2xl font-bold mb-6">
          MailForge
        </Link>
        <SignIn
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: "#3b82f6",
                  brandAccent: "#2563eb",
                  brandButtonText: "white",
                  defaultButtonBackground: "#1e293b",
                  defaultButtonBackgroundHover: "#334155",
                  defaultButtonText: "#e2e8f0",
                  inputBackground: "#1e293b",
                  inputBorder: "#334155",
                },
              },
            },
          }}
          redirectTo={`${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/dashboard`}
        />
      </div>
    </div>
  );
}
