import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  loadTenantAdminOverview,
  loadTenantDepartments,
  loadTenantInvitations,
  loadTenantMembers,
  createTenantInvitation,
  createTenantDepartment,
  deleteTenantDepartment,
  updateCompanyProfile,
  updateWorkspaceSettings,
  updateTenantDepartment,
  assignMemberDepartment,
  updateMemberRole,
  disableTenantMember,
  enableTenantMember,
  removeTenantMember,
  revokeTenantInvitation,
  resendTenantInvitation,
  type TenantDepartment,
  type TenantInvitation,
  type TenantMember,
} from "@/lib/api/tenant-admin";
import { getSessionMembershipRole } from "@/lib/auth/session";
import {
  normalizeVelonRole,
  parseSettingsUserTab,
  parseWorkspaceAdminSection,
  workspaceAdminSearch,
  VelonRole,
} from "@velon/shared";
import { SettingsWorkspaceShortcuts } from "@/components/settings/settings-workspace-shortcuts";

const adminTabs = [
  "company",
  "workspace",
  "users",
  "departments",
  "seats",
  "invitations",
  "security",
  "audit",
] as const;
type AdminTab = (typeof adminTabs)[number];

export const Route = createFileRoute("/app/settings/admin")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: parseSettingsUserTab(search.tab),
    section: parseWorkspaceAdminSection(search.section),
  }),
  loader: () => loadTenantAdminOverview(),
  component: TenantAdminSettingsPage,
});

function TenantAdminSettingsPage() {
  const router = useRouter();
  const { section } = Route.useSearch();
  const overview = Route.useLoaderData();
  const role = normalizeVelonRole(getSessionMembershipRole() ?? VelonRole.USER);
  const isOwner = role === VelonRole.TENANT_OWNER || role === VelonRole.TENANT_ADMIN;

  const [members, setMembers] = useState<TenantMember[]>([]);
  const [departments, setDepartments] = useState<TenantDepartment[]>([]);
  const [invitations, setInvitations] = useState<TenantInvitation[]>([]);
  const [search, setSearch] = useState("");
  const [inviteForm, setInviteForm] = useState({
    fullName: "",
    email: "",
    departmentId: "",
    role: "USER",
  });
  const [deptForm, setDeptForm] = useState({ name: "", description: "" });
  const [companyForm, setCompanyForm] = useState({
    legalName: overview.companyProfile?.legalName ?? "",
    email: overview.companyProfile?.email ?? "",
    phone: overview.companyProfile?.phone ?? "",
    country: overview.companyProfile?.country ?? "",
    industry: overview.companyProfile?.industry ?? "SERVICES",
    address: overview.companyProfile?.address ?? "",
    website: overview.companyProfile?.website ?? "",
    taxId: overview.companyProfile?.taxId ?? "",
    logoDataUrl: overview.companyProfile?.logoDataUrl ?? "",
  });
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editDeptForm, setEditDeptForm] = useState({ name: "", description: "" });
  const [workspaceForm, setWorkspaceForm] = useState({
    name: overview.workspace?.name ?? "",
    timezone: overview.workspace?.timezone ?? "Asia/Kolkata",
    currency: overview.workspace?.currency ?? "INR",
    language: overview.workspace?.language ?? "en",
  });
  const [busy, setBusy] = useState(false);

  const refreshLists = useCallback(async () => {
    const [m, d, i] = await Promise.all([
      loadTenantMembers(search),
      loadTenantDepartments(),
      loadTenantInvitations(),
    ]);
    setMembers(m);
    setDepartments(d);
    setInvitations(i);
  }, [search]);

  useEffect(() => {
    if (isOwner) void refreshLists();
  }, [isOwner, refreshLists]);

  if (!isOwner) {
    return (
      <Card className="border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Tenant Owner access is required for workspace administration.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/app/settings" search={{ tab: "general" }}>Back to settings</Link>
        </Button>
      </Card>
    );
  }

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await createTenantInvitation({
        fullName: inviteForm.fullName,
        email: inviteForm.email,
        role: inviteForm.role,
        departmentId: inviteForm.departmentId || undefined,
      });
      toast.success("Invitation sent");
      if (res.devInviteUrl) toast.info(`Dev invite link: ${res.devInviteUrl}`, { duration: 12000 });
      setInviteForm({ fullName: "", email: "", departmentId: "", role: "USER" });
      await refreshLists();
      void router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send invitation");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateDepartment(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createTenantDepartment(deptForm);
      toast.success("Department created");
      setDeptForm({ name: "", description: "" });
      await refreshLists();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create department");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <SettingsWorkspaceShortcuts />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Tenant administration</p>
          <h1 className="text-2xl font-semibold tracking-tight">Workspace admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage users, departments, seats, and invitations.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/app/settings" search={{ tab: "general" }}>← User settings</Link>
        </Button>
      </div>

      <Tabs
        id="workspace-admin-tabs"
        value={section}
        onValueChange={(v) =>
          void router.navigate({
            to: "/app/settings/admin",
            search: workspaceAdminSearch(v as AdminTab),
          })
        }
      >
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          {adminTabs.map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="company" className="mt-4">
          <Card className="border-border bg-card p-6">
            <h2 className="font-semibold">Company profile</h2>
            <form
              className="mt-4 grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                setBusy(true);
                void updateCompanyProfile(companyForm)
                  .then(() => {
                    toast.success("Company updated");
                    window.dispatchEvent(
                      new CustomEvent("velon-workspace-website-changed", {
                        detail: { website: companyForm.website },
                      }),
                    );
                    void router.invalidate();
                  })
                  .catch((err) => toast.error(String(err)))
                  .finally(() => setBusy(false));
              }}
            >
              <div><Label>Legal name</Label><Input value={companyForm.legalName} onChange={(e) => setCompanyForm({ ...companyForm, legalName: e.target.value })} required /></div>
              <div><Label>Email</Label><Input type="email" value={companyForm.email} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} /></div>
              <div><Label>Country</Label><Input value={companyForm.country} onChange={(e) => setCompanyForm({ ...companyForm, country: e.target.value })} /></div>
              <div>
                <Label>Industry</Label>
                <Select
                  value={companyForm.industry}
                  onValueChange={(value) => setCompanyForm({ ...companyForm, industry: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RETAIL">Retail</SelectItem>
                    <SelectItem value="MANUFACTURING">Manufacturing</SelectItem>
                    <SelectItem value="DISTRIBUTION">Distribution</SelectItem>
                    <SelectItem value="SERVICES">Services</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2"><Label>Address</Label><Input value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} /></div>
              <div><Label>Website</Label><Input value={companyForm.website} onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })} /></div>
              <div><Label>Tax ID</Label><Input value={companyForm.taxId} onChange={(e) => setCompanyForm({ ...companyForm, taxId: e.target.value })} /></div>
              <div className="sm:col-span-2">
                <Label>Company logo</Label>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {companyForm.logoDataUrl ? (
                    <img src={companyForm.logoDataUrl} alt="Company logo" className="h-12 w-12 rounded-md border object-contain" />
                  ) : null}
                  <Input
                    type="file"
                    accept="image/*"
                    className="max-w-xs"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const dataUrl = typeof reader.result === "string" ? reader.result : "";
                        setCompanyForm((prev) => ({ ...prev, logoDataUrl: dataUrl }));
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  {companyForm.logoDataUrl ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setCompanyForm((prev) => ({ ...prev, logoDataUrl: "" }))}>
                      Remove logo
                    </Button>
                  ) : null}
                </div>
              </div>
              <Button type="submit" disabled={busy} className="sm:col-span-2 w-fit">Save company</Button>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="workspace" className="mt-4">
          <Card className="border-border bg-card p-6">
            <h2 className="font-semibold">Workspace settings</h2>
            {overview.workspace && (
              <form
                className="mt-4 grid gap-3 sm:max-w-md"
                onSubmit={(e) => {
                  e.preventDefault();
                  setBusy(true);
                  void updateWorkspaceSettings(workspaceForm)
                    .then(() => { toast.success("Workspace updated"); void router.invalidate(); })
                    .catch((err) => toast.error(String(err)))
                    .finally(() => setBusy(false));
                }}
              >
                <div><Label>Workspace name</Label><Input value={workspaceForm.name} onChange={(e) => setWorkspaceForm((f) => ({ ...f, name: e.target.value }))} required /></div>
                <p className="text-xs text-muted-foreground font-mono">URL: /app · slug: {overview.workspace.slug}</p>
                <div>
                  <Label>Timezone</Label>
                  <Select value={workspaceForm.timezone} onValueChange={(v) => setWorkspaceForm((f) => ({ ...f, timezone: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                      <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Currency</Label>
                  <Select value={workspaceForm.currency} onValueChange={(v) => setWorkspaceForm((f) => ({ ...f, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="SAR">SAR</SelectItem>
                      <SelectItem value="AED">AED</SelectItem>
                      <SelectItem value="BHD">BHD</SelectItem>
                      <SelectItem value="OMR">OMR</SelectItem>
                      <SelectItem value="QAR">QAR</SelectItem>
                      <SelectItem value="KWD">KWD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Language</Label>
                  <Select value={workspaceForm.language} onValueChange={(v) => setWorkspaceForm((f) => ({ ...f, language: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={busy} className="w-fit">Save workspace</Button>
              </form>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="seats" className="mt-4">
          <Card className="border-border bg-card p-6">
            <h2 className="font-semibold">Seat licensing</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div><p className="text-xs text-muted-foreground">Plan</p><p className="text-xl font-semibold">{overview.seats.plan}</p></div>
              <div><p className="text-xs text-muted-foreground">Active seats</p><p className="text-xl font-semibold">{overview.seats.activeSeats}{overview.seats.unlimited ? "" : ` / ${overview.seats.limit}`}</p></div>
              <div><p className="text-xs text-muted-foreground">Remaining</p><p className="text-xl font-semibold">{overview.seats.unlimited ? "Unlimited" : overview.seats.remaining}</p></div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <Button variant="secondary" onClick={() => void refreshLists()}>Search</Button>
          </div>
          <Card className="border-border bg-card divide-y">
            {members.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{m.fullName ?? m.email}</p>
                  <p className="text-xs text-muted-foreground">{m.email}{m.departmentName ? ` · ${m.departmentName}` : ""}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={m.isActive ? "secondary" : "outline"}>{m.isActive ? "Active" : "Disabled"}</Badge>
                  <Select value={m.role} onValueChange={(r) => void updateMemberRole(m.id, r).then(refreshLists).then(() => toast.success("Role updated")).catch((e) => toast.error(String(e)))}>
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">User</SelectItem>
                      <SelectItem value="DEPARTMENT_ADMIN">Department Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={m.departmentId ?? "none"}
                    onValueChange={(v) =>
                      void assignMemberDepartment(m.id, v === "none" ? null : v)
                        .then(refreshLists)
                        .then(() => toast.success("Department updated"))
                    }
                  >
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Dept" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No dept</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {m.isActive ? (
                    <Button size="sm" variant="outline" onClick={() => void disableTenantMember(m.id).then(refreshLists).then(() => toast.success("User disabled"))}>Disable</Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => void enableTenantMember(m.id).then(refreshLists).then(() => toast.success("User enabled"))}>Enable</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => void removeTenantMember(m.id).then(refreshLists).then(() => toast.success("User removed"))}>Remove</Button>
                </div>
              </div>
            ))}
            {members.length === 0 && <p className="p-6 text-sm text-muted-foreground">No members found.</p>}
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="mt-4 space-y-4">
          <Card className="border-border bg-card p-6">
            <h2 className="font-semibold">Create department</h2>
            <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onCreateDepartment}>
              <div><Label>Name</Label><Input value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} required /></div>
              <div><Label>Description</Label><Input value={deptForm.description} onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })} /></div>
              <Button type="submit" disabled={busy} className="sm:col-span-2 w-fit">Add department</Button>
            </form>
          </Card>
          <Card className="border-border bg-card divide-y">
            {departments.map((d) => (
              <div key={d.id} className="p-4">
                {editingDeptId === d.id ? (
                  <form
                    className="grid gap-3 sm:grid-cols-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setBusy(true);
                      void updateTenantDepartment(d.id, editDeptForm)
                        .then(() => {
                          toast.success("Department updated");
                          setEditingDeptId(null);
                          return refreshLists();
                        })
                        .catch((err) => toast.error(String(err)))
                        .finally(() => setBusy(false));
                    }}
                  >
                    <div><Label>Name</Label><Input value={editDeptForm.name} onChange={(e) => setEditDeptForm({ ...editDeptForm, name: e.target.value })} required /></div>
                    <div><Label>Description</Label><Input value={editDeptForm.description} onChange={(e) => setEditDeptForm({ ...editDeptForm, description: e.target.value })} /></div>
                    <div className="flex gap-2 sm:col-span-2">
                      <Button type="submit" size="sm" disabled={busy}>Save</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingDeptId(null)}>Cancel</Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div><p className="font-medium">{d.name}</p><p className="text-xs text-muted-foreground">{d.description ?? "—"} · {d.memberCount} members</p></div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingDeptId(d.id);
                          setEditDeptForm({ name: d.name, description: d.description ?? "" });
                        }}
                      >
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void deleteTenantDepartment(d.id).then(refreshLists).then(() => toast.success("Department deleted"))}>Delete</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="mt-4 space-y-4">
          <Card className="border-border bg-card p-6">
            <h2 className="font-semibold">Invite user</h2>
            <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onInvite}>
              <div><Label>Full name</Label><Input value={inviteForm.fullName} onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })} required /></div>
              <div><Label>Email</Label><Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} required /></div>
              <div>
                <Label>Department</Label>
                <Select value={inviteForm.departmentId || "none"} onValueChange={(v) => setInviteForm({ ...inviteForm, departmentId: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Role</Label>
                <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="DEPARTMENT_ADMIN">Department Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={busy} className="sm:col-span-2 w-fit">Send invitation</Button>
            </form>
          </Card>
          <Card className="border-border bg-card divide-y">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <p className="font-medium">{inv.fullName} · {inv.email}</p>
                  <p className="text-xs text-muted-foreground">{inv.status} · expires {new Date(inv.expiresAt).toLocaleDateString()}</p>
                </div>
                {inv.status === "PENDING" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => void resendTenantInvitation(inv.id).then((r) => { toast.success("Invitation resent"); if (r.devInviteUrl) toast.info(r.devInviteUrl); })}>Resend</Button>
                    <Button size="sm" variant="ghost" onClick={() => void revokeTenantInvitation(inv.id).then(refreshLists).then(() => toast.success("Revoked"))}>Revoke</Button>
                  </div>
                )}
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <Card className="border-border bg-card p-6">
            <h2 className="font-semibold">Security</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>At least one active Tenant Owner is always required.</li>
              <li>Owners cannot disable or remove themselves.</li>
              <li>Users cannot change their own role.</li>
              <li>Department Admins cannot be promoted to Tenant Owner via self-service.</li>
              <li>Disabled users cannot authenticate.</li>
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card className="border-border bg-card divide-y">
            {overview.auditLogs.map((log) => (
              <div key={log.id} className="p-4 text-sm">
                <span className="font-mono text-xs">{log.action}</span>
                <span className="ml-2 text-muted-foreground">{new Date(log.at).toLocaleString()}</span>
                {log.actorEmail && <span className="ml-2">· {log.actorEmail}</span>}
              </div>
            ))}
            {overview.auditLogs.length === 0 && <p className="p-6 text-sm text-muted-foreground">No audit events yet.</p>}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
