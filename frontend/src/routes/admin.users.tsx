import { useMemo, useState } from 'react';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  KeyRound,
  Lock,
  MoreHorizontal,
  Plus,
  ScrollText,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { PasswordRequirementsChecklist } from '@/components/auth/password-requirements-checklist';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { isPasswordStrong } from '@/lib/auth/password-policy';
import { type AdminPlatformUser, type AdminUserStatus } from '@/lib/platform/admin-demo';
import {
  createPlatformUser,
  deletePlatformUser,
  loadPlatformStaff,
  setPlatformUserStatus,
} from '@/lib/platform/admin-loaders';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/admin/users')({
  loader: () => loadPlatformStaff(),
  component: AdminUsersPage,
});

type UserSortColumn = 'username' | 'name' | 'email' | 'role' | 'status' | 'lastActive';

function statusRank(s: AdminUserStatus): number {
  switch (s) {
    case 'Active':
      return 0;
    case 'Invited':
      return 1;
    case 'Suspended':
      return 2;
    default:
      return 3;
  }
}

function compareUsers(
  a: AdminPlatformUser,
  b: AdminPlatformUser,
  col: UserSortColumn,
  desc: boolean,
): number {
  const dir = desc ? -1 : 1;
  let cmp = 0;
  switch (col) {
    case 'username':
      cmp = a.username.localeCompare(b.username);
      break;
    case 'name':
      cmp = a.name.localeCompare(b.name);
      break;
    case 'email':
      cmp = a.email.localeCompare(b.email);
      break;
    case 'role':
      cmp = a.role.localeCompare(b.role);
      break;
    case 'status':
      cmp = statusRank(a.status) - statusRank(b.status);
      break;
    case 'lastActive':
      cmp = a.lastActive.localeCompare(b.lastActive);
      break;
    default:
      cmp = 0;
  }
  if (cmp !== 0) return cmp * dir;
  return a.email.localeCompare(b.email) * dir;
}

function SortTh({
  label,
  column,
  sortColumn,
  sortDesc,
  onSort,
}: {
  label: string;
  column: UserSortColumn;
  sortColumn: UserSortColumn;
  sortDesc: boolean;
  onSort: (c: UserSortColumn) => void;
}) {
  const active = sortColumn === column;
  return (
    <th
      scope="col"
      aria-sort={active ? (sortDesc ? 'descending' : 'ascending') : 'none'}
      className="px-4 py-2 sm:px-5 sm:py-3"
    >
      <button
        type="button"
        aria-label={active ? `${label} sorted` : `Sort by ${label}`}
        onClick={() => onSort(column)}
        className={cn(
          'group text-muted-foreground hover:bg-muted/80 hover:text-foreground inline-flex items-center gap-1 rounded-md py-1 pr-1 text-left text-[10px] font-medium tracking-[0.12em] uppercase',
          active && 'text-foreground',
        )}
      >
        {label}
        {active ? (
          sortDesc ? (
            <ArrowDown
              className="h-3.5 w-3.5 shrink-0"
              aria-hidden
            />
          ) : (
            <ArrowUp
              className="h-3.5 w-3.5 shrink-0"
              aria-hidden
            />
          )
        ) : (
          <ArrowUpDown
            className="h-3.5 w-3.5 shrink-0 opacity-35 group-hover:opacity-60"
            aria-hidden
          />
        )}
      </button>
    </th>
  );
}

function statusBadgeClass(s: AdminUserStatus) {
  switch (s) {
    case 'Active':
      return 'border-success/25 bg-success/10 text-success';
    case 'Invited':
      return 'border-info/25 bg-info/10 text-info';
    case 'Suspended':
      return 'border-muted-foreground/30 bg-muted text-muted-foreground';
    default:
      return 'border-border';
  }
}

function AdminUsersPage() {
  const router = useRouter();
  const users = Route.useLoaderData() as AdminPlatformUser[];
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AdminUserStatus>('all');
  const [sortColumn, setSortColumn] = useState<UserSortColumn>('name');
  const [sortDesc, setSortDesc] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<AdminPlatformUser | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState<'PLATFORM_SUPPORT' | 'SUPER_ADMIN'>(
    'PLATFORM_SUPPORT',
  );
  const [inviteBusy, setInviteBusy] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (!s) return true;
      return (
        u.name.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        u.role.toLowerCase().includes(s) ||
        u.username.toLowerCase().includes(s)
      );
    });
  }, [users, q, statusFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => compareUsers(a, b, sortColumn, sortDesc));
    return arr;
  }, [filtered, sortColumn, sortDesc]);

  const kpis = useMemo(() => {
    const active = users.filter((u) => u.status === 'Active').length;
    const suspended = users.filter((u) => u.status === 'Suspended').length;
    const invited = users.filter((u) => u.status === 'Invited').length;
    const mfa = users.filter((u) => u.mfaEnabled).length;
    return {
      total: users.length,
      active,
      suspended,
      invited,
      mfaPct: users.length ? Math.round((mfa / users.length) * 100) : 0,
    };
  }, [users]);

  function handleSort(col: UserSortColumn) {
    if (sortColumn === col) setSortDesc((d) => !d);
    else {
      setSortColumn(col);
      setSortDesc(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function bulkSuspend() {
    if (selected.size === 0) return;
    toast.error('Bulk suspend is not yet available.');
    setSelected(new Set());
  }

  function bulkResetMfa() {
    if (selected.size === 0) return;
    toast.error('MFA reset is not yet available.');
    setSelected(new Set());
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border bg-card p-4">
          <div className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
            Platform admins
          </div>
          <div className="mt-1 text-2xl font-semibold">{kpis.total}</div>
        </Card>
        <Card className="border-border bg-card p-4">
          <div className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
            Active
          </div>
          <div className="text-success mt-1 text-2xl font-semibold">{kpis.active}</div>
        </Card>
        <Card className="border-border bg-card p-4">
          <div className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
            Suspended
          </div>
          <div className="mt-1 text-2xl font-semibold">{kpis.suspended}</div>
        </Card>
        <Card className="border-border bg-card p-4">
          <div className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
            Invited
          </div>
          <div className="text-info mt-1 text-2xl font-semibold">{kpis.invited}</div>
        </Card>
        <Card className="border-border bg-card p-4">
          <div className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
            MFA enrolled
          </div>
          <div className="mt-1 text-2xl font-semibold">{kpis.mfaPct}%</div>
          <p className="text-muted-foreground mt-1 text-[11px]">Super Admin path enforced</p>
        </Card>
      </div>

      <Card className="border-border bg-card flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search name, username, email, role…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="border-border bg-muted/40 h-9 rounded-lg pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="h-9 w-[150px] rounded-lg">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Invited">Invited</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          className="bg-foreground text-background hover:bg-foreground/90 shrink-0 rounded-lg"
          type="button"
          onClick={() => {
            setInviteEmail('');
            setInviteName('');
            setInvitePassword('');
            setInviteRole('PLATFORM_SUPPORT');
            setInviteOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Create user
        </Button>
      </Card>

      {selected.size > 0 ? (
        <Card className="border-border bg-muted/40 flex flex-wrap items-center gap-2 p-3 text-sm">
          <span className="text-muted-foreground">{selected.size} selected</span>
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={bulkSuspend}
          >
            <Ban className="mr-1 h-3.5 w-3.5" /> Suspend
          </Button>
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={bulkResetMfa}
          >
            <KeyRound className="mr-1 h-3.5 w-3.5" /> Reset MFA
          </Button>
          <Button
            size="sm"
            variant="ghost"
            type="button"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </Card>
      ) : null}

      <Dialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create platform user</DialogTitle>
            <DialogDescription>
              Creates an active platform account with the selected role. All actions are audited.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="inv-name">Full name</Label>
              <Input
                id="inv-name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Platform Operator"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-email">Work email</Label>
              <Input
                id="inv-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="info@velonerp.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-password">Temporary password</Label>
              <Input
                id="inv-password"
                type="password"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />
              <PasswordRequirementsChecklist password={invitePassword} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as typeof inviteRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLATFORM_SUPPORT">Platform Support</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setInviteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-foreground text-background hover:bg-foreground/90"
              disabled={
                inviteBusy ||
                !inviteEmail.includes('@') ||
                inviteName.trim().length < 1 ||
                !isPasswordStrong(invitePassword)
              }
              onClick={() => {
                void (async () => {
                  setInviteBusy(true);
                  try {
                    await createPlatformUser({
                      email: inviteEmail.trim(),
                      name: inviteName.trim(),
                      password: invitePassword,
                      role: inviteRole,
                    });
                    toast.success('Platform user created');
                    setInviteOpen(false);
                    await router.invalidate();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Could not create user');
                  } finally {
                    setInviteBusy(false);
                  }
                })();
              }}
            >
              Create user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet
        open={detail !== null}
        onOpenChange={(o) => !o && setDetail(null)}
      >
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {detail ? (
            <>
              <SheetHeader>
                <SheetTitle>{detail.name}</SheetTitle>
                <SheetDescription className="font-mono text-xs">
                  @{detail.username} · {detail.email}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-5 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={cn('rounded-md font-normal', statusBadgeClass(detail.status))}
                  >
                    {detail.status}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="gap-1 rounded-md font-normal"
                  >
                    {detail.mfaEnabled ? (
                      <>
                        <Shield className="h-3 w-3" /> MFA on
                      </>
                    ) : (
                      <>
                        <ShieldOff className="h-3 w-3" /> MFA off
                      </>
                    )}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-md font-normal"
                  >
                    {detail.role}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Effective permissions
                  </h4>
                  <p className="text-muted-foreground mt-2 text-xs">
                    Derived from role template{' '}
                    <strong className="text-foreground">{detail.role}</strong> — matrix editing and
                    custom roles ship with IAM integration.
                  </p>
                  <ul className="text-muted-foreground mt-2 list-inside list-disc text-xs">
                    <li>
                      Tenants: read{detail.role === 'Super Admin' ? ' / write / suspend' : ''}
                    </li>
                    <li>
                      Billing:{' '}
                      {detail.role === 'Billing' || detail.role === 'Super Admin' ? 'full' : 'none'}
                    </li>
                    <li>
                      Infrastructure: {detail.role === 'Super Admin' ? 'scoped' : 'no access'}
                    </li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                    <ScrollText className="h-3.5 w-3.5" /> Audit trail
                  </h4>
                  <p className="text-muted-foreground mt-2 text-xs">
                    Per-user audit events are recorded in the platform audit log.
                  </p>
                </div>
              </div>
              <SheetFooter className="mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDetail(null)}
                >
                  Close
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Card className="border-border bg-card">
        <div className="border-border border-b p-5">
          <div className="text-sm font-semibold">Platform team</div>
          <div className="text-muted-foreground text-xs">
            Internal staff — least privilege, MFA for privileged paths, bulk actions for ops
            efficiency
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="w-10 px-4 py-2 sm:px-5 sm:py-3">
                  <Checkbox
                    checked={sorted.length > 0 && sorted.every((u) => selected.has(u.id))}
                    onCheckedChange={(v) => {
                      if (v === true) setSelected(new Set(sorted.map((u) => u.id)));
                      else setSelected(new Set());
                    }}
                    aria-label="Select all"
                  />
                </th>
                <SortTh
                  label="Username"
                  column="username"
                  sortColumn={sortColumn}
                  sortDesc={sortDesc}
                  onSort={handleSort}
                />
                <SortTh
                  label="Name"
                  column="name"
                  sortColumn={sortColumn}
                  sortDesc={sortDesc}
                  onSort={handleSort}
                />
                <SortTh
                  label="Email"
                  column="email"
                  sortColumn={sortColumn}
                  sortDesc={sortDesc}
                  onSort={handleSort}
                />
                <SortTh
                  label="Role"
                  column="role"
                  sortColumn={sortColumn}
                  sortDesc={sortDesc}
                  onSort={handleSort}
                />
                <SortTh
                  label="Status"
                  column="status"
                  sortColumn={sortColumn}
                  sortDesc={sortDesc}
                  onSort={handleSort}
                />
                <SortTh
                  label="Last active"
                  column="lastActive"
                  sortColumn={sortColumn}
                  sortDesc={sortDesc}
                  onSort={handleSort}
                />
                <th className="px-4 py-3 sm:px-5" />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-muted-foreground px-4 py-10 text-center text-sm"
                  >
                    {users.length === 0
                      ? 'No users yet. Real platform and tenant users will appear here.'
                      : 'No users match your filters.'}
                  </td>
                </tr>
              ) : (
                sorted.map((u) => (
                  <tr
                    key={u.id}
                    className="border-border hover:bg-muted/30 border-t"
                  >
                    <td className="px-4 py-3 sm:px-5">
                      <Checkbox
                        checked={selected.has(u.id)}
                        onCheckedChange={() => toggleSelect(u.id)}
                        aria-label={`Select ${u.name}`}
                      />
                    </td>
                    <td className="text-muted-foreground px-4 py-3 font-mono text-xs whitespace-nowrap sm:px-5">
                      {u.username}
                    </td>
                    <td className="px-4 py-3 font-medium sm:px-5">{u.name}</td>
                    <td className="text-muted-foreground px-4 py-3 sm:px-5">{u.email}</td>
                    <td className="px-4 py-3 sm:px-5">
                      <Badge
                        variant="outline"
                        className="border-border rounded-md font-normal"
                      >
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <Badge
                        variant="outline"
                        className={cn('rounded-md font-normal', statusBadgeClass(u.status))}
                      >
                        {u.status}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-xs sm:px-5">
                      {u.lastActive}
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            aria-label="Row actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-52"
                        >
                          <DropdownMenuItem onSelect={() => setDetail(u)}>
                            <UserCheck className="mr-2 h-4 w-4" /> View profile
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => toast.error('Password reset is not yet available.')}
                          >
                            <KeyRound className="mr-2 h-4 w-4" /> Reset password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => toast.error('Session management is not yet available.')}
                          >
                            Active sessions
                          </DropdownMenuItem>
                          {u.status === 'Active' ? (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => {
                                void (async () => {
                                  try {
                                    await setPlatformUserStatus(u.id, false);
                                    toast.success('User disabled');
                                    await router.invalidate();
                                  } catch (err) {
                                    toast.error(
                                      err instanceof Error ? err.message : 'Update failed',
                                    );
                                  }
                                })();
                              }}
                            >
                              <Ban className="mr-2 h-4 w-4" /> Disable
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onSelect={() => {
                                void (async () => {
                                  try {
                                    await setPlatformUserStatus(u.id, true);
                                    toast.success('User enabled');
                                    await router.invalidate();
                                  } catch (err) {
                                    toast.error(
                                      err instanceof Error ? err.message : 'Update failed',
                                    );
                                  }
                                })();
                              }}
                            >
                              <UserCheck className="mr-2 h-4 w-4" /> Enable
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => {
                              void (async () => {
                                try {
                                  await deletePlatformUser(u.id);
                                  toast.success('Platform user deleted');
                                  await router.invalidate();
                                } catch (err) {
                                  toast.error(err instanceof Error ? err.message : 'Delete failed');
                                }
                              })();
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete user
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
