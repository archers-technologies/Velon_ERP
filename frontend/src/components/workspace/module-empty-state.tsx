import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export function ModuleEmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionTo,
  actionSearch,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  actionSearch?: Record<string, string>;
}) {
  const action: ReactNode =
    actionLabel && actionTo ? (
      <Button asChild variant="default" size="sm">
        <Link to={actionTo} search={actionSearch}>
          {actionLabel}
        </Link>
      </Button>
    ) : undefined;

  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={action}
      className="my-4"
    />
  );
}
