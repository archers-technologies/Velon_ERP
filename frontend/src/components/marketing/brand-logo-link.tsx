import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { LogoNav } from "@/lib/shared/logo-navigation";

type BrandLogoLinkProps = {
  nav?: LogoNav;
  className?: string;
  children: ReactNode;
};

export function BrandLogoLink({ nav = { type: "home" }, className, children }: BrandLogoLinkProps) {
  if (nav.type === "external") {
    return (
      <a
        href={nav.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        aria-label="Open website in new tab"
      >
        {children}
      </a>
    );
  }

  if (nav.type === "workspace") {
    return (
      <Link to="/app" className={className} aria-label="Go to workspace dashboard">
        {children}
      </Link>
    );
  }

  if (nav.type === "inactive") {
    return (
      <div className={cn(className, "cursor-default")} aria-hidden={false}>
        {children}
      </div>
    );
  }

  return (
    <Link to="/" className={className} aria-label="Go to Velon-ERP homepage">
      {children}
    </Link>
  );
}
