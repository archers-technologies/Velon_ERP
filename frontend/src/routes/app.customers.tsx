import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoreOptionsSection } from "@/components/workspace/more-options-section";
import { ModuleEmptyState } from "@/components/workspace/module-empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  loadCrmCustomers,
  loadCrmContacts,
  loadCrmNotes,
  loadCrmActivities,
  createCrmCustomer,
  createCrmContact,
  createCrmNote,
  createCrmActivity,
  archiveCrmCustomer,
  restoreCrmCustomer,
  deleteCrmCustomer,
  archiveCrmContact,
  completeCrmActivity,
  cancelCrmActivity,
  deleteCrmNote,
  type CrmCustomer,
  type CrmContact,
  type CrmNote,
  type CrmActivity,
} from "@/lib/crm/api";
import { getSessionMembershipRole, getSessionUserEmail } from "@/lib/auth/session";
import {
  canManageCrmCustomers,
  canWriteCrmRecords,
  normalizeVelonRole,
} from "@velon/shared";

const crmSections = ["customers", "contacts", "activities", "notes"] as const;
type CrmSection = (typeof crmSections)[number];

export const Route = createFileRoute("/app/customers")({
  validateSearch: (search: Record<string, unknown>) => {
    const section = typeof search.section === "string" ? search.section : "customers";
    const safe = crmSections.includes(section as CrmSection) ? (section as CrmSection) : "customers";
    return { section: safe };
  },
  component: CustomersPage,
});

function CustomersPage() {
  const router = useRouter();
  const { section } = Route.useSearch();
  const role = normalizeVelonRole(getSessionMembershipRole() ?? "USER");
  const userEmail = getSessionUserEmail();
  const canWrite = canWriteCrmRecords(role);
  const canManage = canManageCrmCustomers(role);

  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [notes, setNotes] = useState<CrmNote[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [customerMoreOpen, setCustomerMoreOpen] = useState(false);

  const [customerForm, setCustomerForm] = useState({
    companyName: "",
    email: "",
    phone: "",
    country: "",
    status: "PROSPECT" as const,
  });
  const [contactForm, setContactForm] = useState({
    customerId: "",
    firstName: "",
    lastName: "",
    email: "",
  });
  const [noteForm, setNoteForm] = useState<{
    targetType: "CUSTOMER" | "CONTACT";
    targetId: string;
    content: string;
  }>({
    targetType: "CUSTOMER",
    targetId: "",
    content: "",
  });
  const [activityForm, setActivityForm] = useState<{
    customerId: string;
    type: CrmActivity["type"];
    title: string;
    activityDate: string;
  }>({
    customerId: "",
    type: "CALL",
    title: "",
    activityDate: new Date().toISOString().slice(0, 16),
  });

  const refresh = useCallback(async () => {
    const [c, co, n, a] = await Promise.all([
      loadCrmCustomers(search),
      loadCrmContacts(search),
      loadCrmNotes(),
      loadCrmActivities(),
    ]);
    setCustomers(c);
    setContacts(co);
    setNotes(n);
    setActivities(a);
  }, [search]);

  useEffect(() => {
    void refresh().catch((e) => toast.error(String(e)));
  }, [refresh]);

  async function onCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setBusy(true);
    try {
      await createCrmCustomer(customerForm);
      toast.success("Customer created");
      setCustomerForm({ companyName: "", email: "", phone: "", country: "", status: "PROSPECT" });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateContact(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setBusy(true);
    try {
      await createCrmContact(contactForm);
      toast.success("Contact created");
      setContactForm({ customerId: "", firstName: "", lastName: "", email: "" });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateNote(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createCrmNote(noteForm);
      toast.success("Note added");
      setNoteForm({ targetType: "CUSTOMER", targetId: "", content: "" });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setBusy(true);
    try {
      await createCrmActivity({
        ...activityForm,
        activityDate: new Date(activityForm.activityDate).toISOString(),
      });
      toast.success("Activity created");
      setActivityForm({
        customerId: "",
        type: "CALL",
        title: "",
        activityDate: new Date().toISOString().slice(0, 16),
      });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add the people and businesses you sell to — takes less than a minute.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="secondary" onClick={() => void refresh()}>
          Search
        </Button>
      </div>

      <Tabs
        value={section}
        onValueChange={(v) =>
          void router.navigate({ to: "/app/customers", search: { section: v as CrmSection } })
        }
      >
        <TabsList>
          {crmSections.map((s) => (
            <TabsTrigger key={s} value={s} className="capitalize">
              {s}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="customers" className="mt-4 space-y-4">
          {canWrite && (
            <Card className="border-border bg-card p-6">
              <h2 className="font-semibold">New customer</h2>
              <form className="mt-4 space-y-3" onSubmit={onCreateCustomer}>
                <div>
                  <Label>Name / company</Label>
                  <Input
                    value={customerForm.companyName}
                    onChange={(e) => setCustomerForm({ ...customerForm, companyName: e.target.value })}
                    placeholder="e.g. Acme Traders"
                    required
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={customerForm.phone}
                      onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                      placeholder="Mobile number"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={customerForm.email}
                      onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <MoreOptionsSection open={customerMoreOpen} onOpenChange={setCustomerMoreOpen}>
                  <div>
                    <Label>Country</Label>
                    <Input
                      value={customerForm.country}
                      onChange={(e) => setCustomerForm({ ...customerForm, country: e.target.value })}
                    />
                  </div>
                </MoreOptionsSection>
                <Button type="submit" disabled={busy} className="w-fit">
                  Add customer
                </Button>
              </form>
            </Card>
          )}
          <Card className="border-border bg-card divide-y">
            {customers.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{c.companyName}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.customerCode} · {c.email ?? "—"} · {c.phone ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{c.status}</Badge>
                  {canManage && !c.isArchived && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void archiveCrmCustomer(c.id).then(refresh).then(() => toast.success("Archived"))
                        }
                      >
                        Archive
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void deleteCrmCustomer(c.id).then(refresh).then(() => toast.success("Deleted"))
                        }
                      >
                        Delete
                      </Button>
                    </>
                  )}
                  {canManage && c.isArchived && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void restoreCrmCustomer(c.id).then(refresh).then(() => toast.success("Restored"))
                      }
                    >
                      Restore
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {customers.length === 0 && (
              <ModuleEmptyState
                icon={Users}
                title="No customers yet"
                description="Add your first customer above — then you can create invoices and quotes for them."
                actionLabel="Add customer"
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="mt-4 space-y-4">
          {canWrite && (
            <Card className="border-border bg-card p-6">
              <h2 className="font-semibold">New contact</h2>
              <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onCreateContact}>
                <div>
                  <Label>Customer</Label>
                  <Select
                    value={contactForm.customerId}
                    onValueChange={(v) => setContactForm({ ...contactForm, customerId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>First name</Label>
                  <Input
                    value={contactForm.firstName}
                    onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Last name</Label>
                  <Input
                    value={contactForm.lastName}
                    onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  />
                </div>
                <Button type="submit" disabled={busy || !contactForm.customerId} className="sm:col-span-2 w-fit">
                  Add contact
                </Button>
              </form>
            </Card>
          )}
          <Card className="border-border bg-card divide-y">
            {contacts.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">
                    {c.firstName} {c.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.customer?.companyName ?? c.customerId} · {c.email ?? "—"}
                  </p>
                </div>
                {canWrite && !c.archivedAt && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void archiveCrmContact(c.id).then(refresh).then(() => toast.success("Archived"))
                    }
                  >
                    Archive
                  </Button>
                )}
              </div>
            ))}
            {contacts.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">No contacts yet.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="mt-4 space-y-4">
          {canWrite && (
            <Card className="border-border bg-card p-6">
              <h2 className="font-semibold">New activity</h2>
              <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onCreateActivity}>
                <div>
                  <Label>Customer</Label>
                  <Select
                    value={activityForm.customerId}
                    onValueChange={(v) => setActivityForm({ ...activityForm, customerId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select
                    value={activityForm.type}
                    onValueChange={(v) =>
                      setActivityForm({ ...activityForm, type: v as CrmActivity["type"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["CALL", "MEETING", "EMAIL", "VISIT", "TASK", "FOLLOW_UP"] as const).map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Title</Label>
                  <Input
                    value={activityForm.title}
                    onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input
                    type="datetime-local"
                    value={activityForm.activityDate}
                    onChange={(e) => setActivityForm({ ...activityForm, activityDate: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" disabled={busy || !activityForm.customerId} className="sm:col-span-2 w-fit">
                  Add activity
                </Button>
              </form>
            </Card>
          )}
          <Card className="border-border bg-card divide-y">
            {activities.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.type} · {a.customer?.companyName} · {new Date(a.activityDate).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={a.status === "OPEN" ? "secondary" : "outline"}>{a.status}</Badge>
                  {canWrite && a.status === "OPEN" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void completeCrmActivity(a.id).then(refresh).then(() => toast.success("Completed"))
                        }
                      >
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void cancelCrmActivity(a.id).then(refresh).then(() => toast.success("Cancelled"))
                        }
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">No activities yet.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4 space-y-4">
          <Card className="border-border bg-card p-6">
            <h2 className="font-semibold">Add note</h2>
            <form className="mt-4 grid gap-3" onSubmit={onCreateNote}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Target type</Label>
                  <Select
                    value={noteForm.targetType}
                    onValueChange={(v) =>
                      setNoteForm({ ...noteForm, targetType: v as "CUSTOMER" | "CONTACT", targetId: "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CUSTOMER">Customer</SelectItem>
                      <SelectItem value="CONTACT">Contact</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Target</Label>
                  <Select
                    value={noteForm.targetId}
                    onValueChange={(v) => setNoteForm({ ...noteForm, targetId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target" />
                    </SelectTrigger>
                    <SelectContent>
                      {(noteForm.targetType === "CUSTOMER" ? customers : contacts).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {"companyName" in t ? t.companyName : `${t.firstName} ${t.lastName}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Content</Label>
                <Input
                  value={noteForm.content}
                  onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" disabled={busy || !noteForm.targetId} className="w-fit">
                Save note
              </Button>
            </form>
          </Card>
          <Card className="border-border bg-card divide-y">
            {notes.map((n) => (
              <div key={n.id} className="flex items-start justify-between gap-3 p-4">
                <div>
                  <p className="text-sm">{n.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {n.targetType} · {new Date(n.createdAt).toLocaleString()}
                    {n.createdBy?.email ? ` · ${n.createdBy.email}` : ""}
                  </p>
                </div>
                {(n.createdBy?.email === userEmail || canWrite) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void deleteCrmNote(n.id).then(refresh).then(() => toast.success("Deleted"))
                    }
                  >
                    Delete
                  </Button>
                )}
              </div>
            ))}
            {notes.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">No notes yet.</p>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
