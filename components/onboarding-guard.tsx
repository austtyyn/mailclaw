"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

interface OnboardingGuardProps {
  isOnboardingComplete: boolean;
  children: React.ReactNode;
}

export function OnboardingGuard({
  isOnboardingComplete,
  children,
}: OnboardingGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isOnboardingComplete) return;
    if (pathname === "/onboarding") return;
    router.replace("/onboarding");
  }, [isOnboardingComplete, pathname, router]);

  return <>{children}</>;
}
