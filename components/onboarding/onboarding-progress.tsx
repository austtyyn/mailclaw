"use client";

import type { OnboardingStep } from "@/lib/onboarding";

interface OnboardingProgressProps {
  steps: OnboardingStep[];
  currentStepId: string;
}

export function OnboardingProgress({
  steps,
  currentStepId,
}: OnboardingProgressProps) {
  return (
    <nav className="flex flex-wrap gap-2 mb-8" aria-label="Onboarding progress">
      {steps.map((step, i) => {
        const isComplete = step.status === "complete";
        const isCurrent = step.status === "current";
        const isBlocked = step.status === "blocked";

        return (
          <div
            key={step.id}
            className={`flex items-center gap-2 ${
              isBlocked ? "opacity-50" : ""
            }`}
          >
            <span
              className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                isComplete
                  ? "bg-green-500/20 text-green-400"
                  : isCurrent
                    ? "bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/50"
                    : "bg-slate-700 text-slate-400"
              }`}
            >
              {isComplete ? "✓" : i + 1}
            </span>
            <span
              className={`text-sm ${
                isCurrent ? "font-medium text-white" : "text-slate-400"
              }`}
            >
              {step.title}
            </span>
            {i < steps.length - 1 && (
              <span className="text-slate-600 mx-1">→</span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
