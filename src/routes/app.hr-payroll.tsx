import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { workspaceAdminSearch } from "@velon/shared";
import { Building2, Users, UserPlus, Briefcase } from "lucide-react";

export const Route = createFileRoute("/app/hr-payroll")({
  component: HrPayrollPage,
});

const HR_LINKS = [
  {
    label: "Team members",
    description: "Add, edit, and manage who can access your business",
    to: "/app/settings/admin" as const,
    search: workspaceAdminSearch("users"),
    icon: Users,
  },
  {
    label: "Departments",
    description: "Group your team by function or branch",
    to: "/app/settings/admin" as const,
    search: workspaceAdminSearch("departments"),
    icon: Briefcase,
  },
  {
    label: "Invite people",
    description: "Send invites to staff and partners",
    to: "/app/settings/admin" as const,
    search: workspaceAdminSearch("invitations"),
    icon: UserPlus,
  },
  {
    label: "Branches",
    description: "Manage stores, offices, and locations",
    to: "/app/branches" as const,
    icon: Building2,
  },
];

function HrPayrollPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          People
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">HR & Payroll</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Manage your team, departments, and branches — all in one simple place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {HR_LINKS.map((item) => (
          <Card key={item.label} className="border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">{item.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link
                    to={item.to}
                    search={"search" in item ? item.search : undefined}
                  >
                    Open
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
