import { createFileRoute, Link } from '@tanstack/react-router';
import { Briefcase, Building2, UserPlus, Users } from 'lucide-react';
import { workspaceAdminSearch } from '@velon/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const Route = createFileRoute('/app/hr-payroll')({
  component: HrPayrollPage,
});

const HR_LINKS = [
  {
    label: 'Team members',
    description: 'Add, edit, and manage who can access your business',
    to: '/app/settings/admin' as const,
    search: workspaceAdminSearch('users'),
    icon: Users,
  },
  {
    label: 'Departments',
    description: 'Group your team by function or branch',
    to: '/app/settings/admin' as const,
    search: workspaceAdminSearch('departments'),
    icon: Briefcase,
  },
  {
    label: 'Invite people',
    description: 'Send invites to staff and partners',
    to: '/app/settings/admin' as const,
    search: workspaceAdminSearch('invitations'),
    icon: UserPlus,
  },
  {
    label: 'Branches',
    description: 'Manage stores, offices, and locations',
    to: '/app/branches' as const,
    icon: Building2,
  },
];

function HrPayrollPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
          People
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">HR & Payroll</h1>
        <p className="text-muted-foreground mt-1 max-w-xl text-sm">
          Manage your team, departments, and branches — all in one simple place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {HR_LINKS.map((item) => (
          <Card
            key={item.label}
            className="border-border bg-card p-5"
          >
            <div className="flex items-start gap-3">
              <div className="bg-primary/8 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <item.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">{item.label}</h2>
                <p className="text-muted-foreground mt-1 text-sm">{item.description}</p>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="mt-3"
                >
                  <Link
                    to={item.to}
                    search={'search' in item ? item.search : undefined}
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
