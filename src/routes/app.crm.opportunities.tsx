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
  archiveCrmOpportunity,
  closeCrmOpportunityLost,
  closeCrmOpportunityWon,
  createCrmOpportunity,
  loadCrmOpportunities,
  loadCrmPipelines,
  moveCrmOpportunityStage,
  type CrmOpportunity,
  type CrmOpportunityStatus,
  type CrmPipeline,
} from "@/lib/api/crm-pipeline";
import { loadCrmCustomers } from "@/lib/api/crm";
import { getSessionMembershipRole } from "@/lib/auth/session";
import { canWriteCrmRecords, normalizeVelonRole } from "@velon/shared";
import { Briefcase, LayoutGrid, List } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const Route = createFileRoute("/app/crm/opportunities")({
  component: CrmOpportunitiesPage,
});

function CrmOpportunitiesPage() {
  const canWrite = canWriteCrmRecords(normalizeVelonRole(getSessionMembershipRole() ?? "USER"));
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([]);
  const [customers, setCustomers] = useState<{ id: string; companyName: string }[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("OPEN");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban");
  const [kanbanPipelineId, setKanbanPipelineId] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    pipelineId: "",
    stageId: "",
    customerId: "",
    value: "",
    expectedCloseDate: "",
  });

  const refresh = useCallback(async () => {
    const [rows, pipes, custs] = await Promise.all([
      loadCrmOpportunities({
        search: search || undefined,
        status: statusFilter !== "all" ? (statusFilter as CrmOpportunityStatus) : undefined,
      }),
      loadCrmPipelines(),
      loadCrmCustomers(),
    ]);
    setOpportunities(rows);
    setPipelines(pipes);
    setCustomers(custs.map((c) => ({ id: c.id, companyName: c.companyName })));
    setKanbanPipelineId((prev) => prev || pipes[0]?.id || "");
    setForm((f) => {
      if (f.pipelineId) return f;
      const p = pipes[0];
      if (!p) return f;
      return {
        ...f,
        pipelineId: p.id,
        stageId: p.stages.find((s) => s.name === "New")?.id ?? p.stages[0]?.id ?? "",
      };
    });
  }, [search, statusFilter]);

  useEffect(() => {
    void refresh().catch((e) => toast.error(String(e)));
  }, [refresh]);

  const selectedPipeline = pipelines.find((p) => p.id === form.pipelineId);
  const kanbanPipeline = pipelines.find((p) => p.id === kanbanPipelineId) ?? pipelines[0];
  const openOpportunities = opportunities.filter((o) => o.status === "OPEN");
  const showKanban = viewMode === "kanban" && statusFilter === "OPEN" && kanbanPipeline;

  function statusBadgeVariant(status: CrmOpportunityStatus) {
    if (status === "WON") return "success" as const;
    if (status === "LOST") return "destructive" as const;
    return "info" as const;
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite || !form.pipelineId || !form.stageId) return;
    setBusy(true);
    try {
      await createCrmOpportunity({
        title: form.title,
        pipelineId: form.pipelineId,
        stageId: form.stageId,
        customerId: form.customerId || undefined,
        value: form.value ? Number(form.value) : 0,
        expectedCloseDate: form.expectedCloseDate || undefined,
      });
      toast.success("Opportunity created");
      setForm((f) => ({ ...f, title: "", customerId: "", value: "", expectedCloseDate: "" }));
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
          placeholder="Search opportunities…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="WON">Won</SelectItem>
            <SelectItem value="LOST">Lost</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="secondary" onClick={() => void refresh()}>
          Search
        </Button>
        {statusFilter === "OPEN" && (
          <>
            <Select value={kanbanPipelineId} onValueChange={setKanbanPipelineId}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Pipeline" />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex rounded-lg border border-border p-0.5">
              <Button
                type="button"
                size="sm"
                variant={viewMode === "kanban" ? "secondary" : "ghost"}
                className="h-8 px-2.5"
                onClick={() => setViewMode("kanban")}
                aria-pressed={viewMode === "kanban"}
              >
                <LayoutGrid className="mr-1.5 h-4 w-4" />
                Board
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === "list" ? "secondary" : "ghost"}
                className="h-8 px-2.5"
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
              >
                <List className="mr-1.5 h-4 w-4" />
                List
              </Button>
            </div>
          </>
        )}
      </div>

      {canWrite && (
        <Card className="border-border bg-card p-6">
          <h2 className="font-semibold">New opportunity</h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onCreate}>
            <div>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Customer</Label>
              <Select
                value={form.customerId}
                onValueChange={(v) => setForm({ ...form, customerId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
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
              <Label>Pipeline</Label>
              <Select
                value={form.pipelineId}
                onValueChange={(v) => {
                  const p = pipelines.find((x) => x.id === v);
                  setForm({
                    ...form,
                    pipelineId: v,
                    stageId: p?.stages[0]?.id ?? "",
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stage</Label>
              <Select
                value={form.stageId}
                onValueChange={(v) => setForm({ ...form, stageId: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(selectedPipeline?.stages ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Value</Label>
              <Input
                type="number"
                min={0}
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            </div>
            <div>
              <Label>Expected close</Label>
              <Input
                type="date"
                value={form.expectedCloseDate}
                onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={busy} className="sm:col-span-2 w-fit">
              Add opportunity
            </Button>
          </form>
        </Card>
      )}

      {showKanban ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {kanbanPipeline.stages.map((stage) => {
            const cards = openOpportunities.filter(
              (o) => o.pipelineId === kanbanPipeline.id && o.stageId === stage.id,
            );
            return (
              <div
                key={stage.id}
                className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-muted/30"
              >
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h3 className="text-sm font-semibold">{stage.name}</h3>
                  <Badge variant="neutral">{cards.length}</Badge>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  {cards.map((o) => (
                    <Card key={o.id} className="border-border bg-card p-3 shadow-sm">
                      <p className="text-sm font-medium leading-snug">{o.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{o.opportunityCode}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>${Number(o.value).toLocaleString()}</span>
                        <span>·</span>
                        <span>{o.probability}%</span>
                      </div>
                      {canWrite && (
                        <Select
                          value={o.stageId}
                          onValueChange={(stageId) =>
                            void moveCrmOpportunityStage(o.id, stageId)
                              .then(() => refresh())
                              .then(() => toast.success("Stage updated"))
                          }
                        >
                          <SelectTrigger className="mt-2 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {kanbanPipeline.stages.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </Card>
                  ))}
                  {cards.length === 0 && (
                    <p className="py-6 text-center text-xs text-muted-foreground">No deals</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
      <Card className="border-border bg-card divide-y">
        {opportunities.map((o) => (
          <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{o.title}</p>
              <p className="text-xs text-muted-foreground">
                {o.opportunityCode} · {o.stage?.name ?? "—"} · $
                {Number(o.value).toLocaleString()} · {o.probability}%
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusBadgeVariant(o.status)}>{o.status}</Badge>
              {canWrite && o.status === "OPEN" && o.pipeline && (
                <Select
                  value={o.stageId}
                  onValueChange={(stageId) =>
                    void moveCrmOpportunityStage(o.id, stageId)
                      .then(() => refresh())
                      .then(() => toast.success("Stage updated"))
                  }
                >
                  <SelectTrigger className="h-8 w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(pipelines.find((p) => p.id === o.pipelineId)?.stages ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {canWrite && o.status === "OPEN" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void closeCrmOpportunityWon(o.id)
                        .then(() => refresh())
                        .then(() => toast.success("Won"))
                    }
                  >
                    Won
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void closeCrmOpportunityLost(o.id)
                        .then(() => refresh())
                        .then(() => toast.success("Lost"))
                    }
                  >
                    Lost
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void archiveCrmOpportunity(o.id)
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
        {opportunities.length === 0 && (
          <EmptyState
            icon={Briefcase}
            title="No opportunities yet"
            description="Create your first opportunity to start tracking your sales pipeline."
            className="m-4 border-0 bg-transparent"
          />
        )}
      </Card>
      )}
    </div>
  );
}
