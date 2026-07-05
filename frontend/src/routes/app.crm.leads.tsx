import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  archiveCrmLead,
  convertCrmLead,
  createCrmLead,
  loadCrmLeads,
  type CrmLead,
  type CrmLeadSource,
  type CrmLeadStatus,
} from "@/lib/crm/pipeline-api";
import { getSessionMembershipRole } from "@/lib/auth/session";
import { canWriteCrmRecords, normalizeVelonRole } from "@velon/shared";

const leadStatuses: CrmLeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "DISQUALIFIED",
  "CONVERTED",
];
const leadSources: CrmLeadSource[] = [
  "MANUAL",
  "WEBSITE",
  "REFERRAL",
  "EMAIL",
  "TRADE_SHOW",
  "IMPORT",
  "OTHER",
];

export const Route = createFileRoute("/app/crm/leads")({
  component: CrmLeadsPage,
});

function CrmLeadsPage() {
  const canWrite = canWriteCrmRecords(normalizeVelonRole(getSessionMembershipRole() ?? "USER"));
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    source: "MANUAL" as CrmLeadSource,
    industry: "",
    status: "NEW" as CrmLeadStatus,
    notes: "",
  });

  const refresh = useCallback(async () => {
    const rows = await loadCrmLeads({
      search: search || undefined,
      status: statusFilter !== "all" ? (statusFilter as CrmLeadStatus) : undefined,
    });
    setLeads(rows);
  }, [search, statusFilter]);

  useEffect(() => {
    void refresh().catch((e) => toast.error(String(e)));
  }, [refresh]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setBusy(true);
    try {
      await createCrmLead(form);
      toast.success("Lead created");
      setForm({
        companyName: "",
        contactName: "",
        email: "",
        phone: "",
        source: "MANUAL",
        industry: "",
        status: "NEW",
        notes: "",
      });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search leads…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {leadStatuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="secondary" onClick={() => void refresh()}>
          Search
        </Button>
      </div>

      {canWrite && (
        <Card className="border-border bg-card p-6">
          <h2 className="font-semibold">New lead</h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onCreate}>
            <div>
              <Label>Company name</Label>
              <Input
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Contact name</Label>
              <Input
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Source</Label>
              <Select
                value={form.source}
                onValueChange={(v) => setForm({ ...form, source: v as CrmLeadSource })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {leadSources.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Industry</Label>
              <Input
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={busy} className="w-fit">
              Add lead
            </Button>
          </form>
        </Card>
      )}

      <Card className="border-border bg-card divide-y">
        {leads.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{l.companyName}</p>
              <p className="text-xs text-muted-foreground">
                {l.leadCode} · {l.contactName ?? "—"} · {l.email ?? "—"} · {l.source}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{l.status}</Badge>
              {canWrite && l.status !== "CONVERTED" && l.status !== "DISQUALIFIED" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void convertCrmLead(l.id, { value: 0 })
                        .then(() => refresh())
                        .then(() => toast.success("Lead converted"))
                    }
                  >
                    Convert
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void archiveCrmLead(l.id)
                        .then(() => refresh())
                        .then(() => toast.success("Archived"))
                    }
                  >
                    Archive
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
        {leads.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">No leads yet.</p>
        )}
      </Card>
    </div>
  );
}
