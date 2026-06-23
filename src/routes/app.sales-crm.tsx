import { createFileRoute, redirect } from "@tanstack/react-router";

/** Sales CRM entry — canonical pipeline starts at leads. */
export const Route = createFileRoute("/app/sales-crm")({
  beforeLoad: () => {
    throw redirect({ to: "/app/crm/leads" });
  },
  component: () => null,
});
