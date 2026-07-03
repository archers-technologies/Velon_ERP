import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, X } from "lucide-react";
import {
  buildOnboardingSteps,
  dismissOnboarding,
  isOnboardingDismissed,
  onboardingProgress,
  type OnboardingStep,
} from "@/lib/workspace/onboarding-progress";
import { useState } from "react";
import { cn } from "@/lib/utils";

type DashboardData = Parameters<typeof buildOnboardingSteps>[0];

export function OnboardingChecklist({ data }: { data: DashboardData }) {
  const steps = buildOnboardingSteps(data);
  const progress = onboardingProgress(steps);
  const [dismissed, setDismissed] = useState(isOnboardingDismissed);

  if (dismissed || progress.done === progress.total) return null;

  function handleDismiss() {
    dismissOnboarding();
    setDismissed(true);
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-primary">
            Getting started
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">
            Set up Velon in a few easy steps
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete these to start billing, selling, and tracking your business.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground"
          onClick={handleDismiss}
          aria-label="Dismiss checklist"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Progress value={progress.percent} className="h-2 flex-1" />
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {progress.done}/{progress.total}
        </span>
      </div>

      <ul className="mt-4 space-y-2">
        {steps.map((step) => (
          <OnboardingStepRow key={step.id} step={step} />
        ))}
      </ul>
    </Card>
  );
}

function OnboardingStepRow({ step }: { step: OnboardingStep }) {
  const Icon = step.icon;

  if (step.done) {
    return (
      <li className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2.5 text-sm">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
        <span className="text-muted-foreground line-through">{step.label}</span>
      </li>
    );
  }

  return (
    <li>
      <Link
        to={step.to}
        search={step.search}
        className={cn(
          "flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm transition",
          "hover:border-primary/30 hover:bg-muted/30",
        )}
      >
        <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{step.label}</p>
          <p className="text-xs text-muted-foreground">{step.description}</p>
        </div>
      </Link>
    </li>
  );
}
