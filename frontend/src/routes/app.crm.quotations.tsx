import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  addQuotationItem,
  approveQuotation,
  cancelQuotation,
  cloneQuotation,
  createQuotation,
  generateProposal,
  loadQuotations,
  rejectQuotation,
  sendQuotation,
  type CrmQuotation,
  type CrmQuotationStatus,
} from "@/lib/crm/quotation-api";
import { loadCrmCustomers } from "@/lib/crm/api";
import { loadCrmOpportunities } from "@/lib/crm/pipeline-api";
import { getSessionMembershipRole } from "@/lib/auth/session";
import { canWriteCrmRecords, normalizeVelonRole } from "@velon/shared";

const statuses: CrmQuotationStatus[] = [
  "DRAFT",
  "SENT",
  "VIEWED",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
];

export const Route = createFileRoute("/app/crm/quotations")({
  component: CrmQuotationsPage,
});

function CrmQuotationsPage() {
  const canWrite = canWriteCrmRecords(normalizeVelonRole(getSessionMembershipRole() ?? "USER"));
  const [rows, setRows] = useState<CrmQuotation[]>([]);
  const [customers, setCustomers] = useState<{ id: string; companyName: string }[]>([]);
  const [opportunities, setOpportunities] = useState<{ id: string; title: string }[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [quoteMoreOpen, setQuoteMoreOpen] = useState(false);
  const [portalLink, setPortalLink] = useState("");
  const [form, setForm] = useState({
    customerId: "",
    opportunityId: "",
    expiryDate: "",
    scopeOfWork: "",
    terms: "",
  });
  const [itemForm, setItemForm] = useState({
    quotationId: "",
    itemName: "",
    quantity: "1",
    unitPrice: "",
    taxRate: "0",
  });

  const refresh = useCallback(async () => {
    const [q, c, o] = await Promise.all([
      loadQuotations({
        search: search || undefined,
        status: statusFilter !== "all" ? (statusFilter as CrmQuotationStatus) : undefined,
      }),
      loadCrmCustomers(),
      loadCrmOpportunities({ status: "OPEN" }),
    ]);
    setRows(q);
    setCustomers(c.map((x) => ({ id: x.id, companyName: x.companyName })));
    setOpportunities(o.map((x) => ({ id: x.id, title: x.title })));
  }, [search, statusFilter]);

  useEffect(() => {
    void refresh().catch((e) => toast.error(String(e)));
  }, [refresh]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite || !form.customerId) return;
    setBusy(true);
    try {
      const q = await createQuotation({
        customerId: form.customerId,
        opportunityId: form.opportunityId || undefined,
        expiryDate: form.expiryDate || undefined,
        scopeOfWork: form.scopeOfWork || undefined,
        terms: form.terms || undefined,
      });
      toast.success(`Quotation ${q.quotationNumber} created`);
      setForm({ customerId: "", opportunityId: "", expiryDate: "", scopeOfWork: "", terms: "" });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite || !itemForm.quotationId) return;
    setBusy(true);
    try {
      await addQuotationItem(itemForm.quotationId, {
        itemName: itemForm.itemName,
        quantity: Number(itemForm.quantity),
        unitPrice: Number(itemForm.unitPrice),
        taxRate: Number(itemForm.taxRate),
      });
      toast.success("Item added");
      setItemForm({ quotationId: "", itemName: "", quantity: "1", unitPrice: "", taxRate: "0" });
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
          placeholder="Search quotations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.map((s) => (
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

      {portalLink && (
        <Card className="border-border bg-card p-4">
          <p className="text-sm font-medium">Customer portal link</p>
          <p className="mt-1 break-all text-xs text-muted-foreground">{portalLink}</p>
        </Card>
      )}

      {canWrite && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border bg-card p-6">
            <h2 className="font-semibold">New quotation</h2>
            <form className="mt-4 space-y-3" onSubmit={onCreate}>
              <div>
                <Label>Customer</Label>
                <Select
                  value={form.customerId}
                  onValueChange={(v) => setForm({ ...form, customerId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Who is this quote for?" />
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
              <MoreOptionsSection open={quoteMoreOpen} onOpenChange={setQuoteMoreOpen}>
                <div>
                  <Label>Linked opportunity</Label>
                  <Select
                    value={form.opportunityId}
                    onValueChange={(v) => setForm({ ...form, opportunityId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      {opportunities.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valid until</Label>
                  <Input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Scope of work</Label>
                  <Input
                    value={form.scopeOfWork}
                    onChange={(e) => setForm({ ...form, scopeOfWork: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Terms</Label>
                  <Input
                    value={form.terms}
                    onChange={(e) => setForm({ ...form, terms: e.target.value })}
                  />
                </div>
              </MoreOptionsSection>
              <Button type="submit" disabled={busy || !form.customerId} className="w-fit">
                Create quotation
              </Button>
            </form>
          </Card>

          <Card className="border-border bg-card p-6">
            <h2 className="font-semibold">Add line item</h2>
            <form className="mt-4 grid gap-3" onSubmit={onAddItem}>
              <div>
                <Label>Draft quotation</Label>
                <Select
                  value={itemForm.quotationId}
                  onValueChange={(v) => setItemForm({ ...itemForm, quotationId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select draft" />
                  </SelectTrigger>
                  <SelectContent>
                    {rows
                      .filter((r) => r.status === "DRAFT")
                      .map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.quotationNumber}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Item name</Label>
                <Input
                  value={itemForm.itemName}
                  onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Price</Label>
                  <Input
                    type="number"
                    value={itemForm.unitPrice}
                    onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tax %</Label>
                  <Input
                    type="number"
                    value={itemForm.taxRate}
                    onChange={(e) => setItemForm({ ...itemForm, taxRate: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" disabled={busy} className="w-fit">
                Add item
              </Button>
            </form>
          </Card>
        </div>
      )}

      <Card className="border-border bg-card divide-y">
        {rows.map((q) => (
          <div key={q.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">
                {q.quotationNumber} · {q.customer?.companyName ?? q.customerId}
              </p>
              <p className="text-xs text-muted-foreground">
                Rev {q.revisionNumber} · ${Number(q.total).toLocaleString()} ·{" "}
                {q.opportunity?.title ?? "No opportunity"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{q.status}</Badge>
              {canWrite && q.status === "DRAFT" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void sendQuotation(q.id)
                      .then((r) => {
                        if (r.portalToken) {
                          const base = window.location.origin;
                          setPortalLink(`${base}/quote/${r.portalToken}`);
                        }
                        return refresh();
                      })
                      .then(() => toast.success("Sent"))
                  }
                >
                  Send
                </Button>
              )}
              {canWrite && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void generateProposal(q.id)
                      .then(() => refresh())
                      .then(() => toast.success("PDF generated"))
                  }
                >
                  PDF
                </Button>
              )}
              {canWrite && ["SENT", "VIEWED"].includes(q.status) && (
                <>
                  <Button
                    size="sm"
                    onClick={() =>
                      void approveQuotation(q.id).then(refresh).then(() => toast.success("Approved"))
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void rejectQuotation(q.id).then(refresh).then(() => toast.success("Rejected"))
                    }
                  >
                    Reject
                  </Button>
                </>
              )}
              {canWrite && q.status !== "CANCELLED" && q.status !== "APPROVED" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    void cancelQuotation(q.id).then(refresh).then(() => toast.success("Cancelled"))
                  }
                >
                  Cancel
                </Button>
              )}
              {canWrite && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    void cloneQuotation(q.id).then(refresh).then(() => toast.success("Cloned"))
                  }
                >
                  Clone
                </Button>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <ModuleEmptyState
            icon={ClipboardList}
            title="No quotations yet"
            description="Create a quote for a customer — then send it for approval."
            actionLabel="Add customer first"
            actionTo="/app/customers"
            actionSearch={{ section: "customers" }}
          />
        )}
      </Card>
    </div>
  );
}
