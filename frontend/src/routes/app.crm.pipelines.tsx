import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  createCrmPipeline,
  createCrmStage,
  deleteCrmStage,
  loadCrmPipelines,
  setDefaultCrmPipeline,
  type CrmPipeline,
} from "@/lib/crm/pipeline-api";
import { getSessionMembershipRole } from "@/lib/auth/session";
import { canWriteCrmRecords, normalizeVelonRole } from "@velon/shared";

export const Route = createFileRoute("/app/crm/pipelines")({
  component: CrmPipelinesPage,
});

function CrmPipelinesPage() {
  const canWrite = canWriteCrmRecords(normalizeVelonRole(getSessionMembershipRole() ?? "USER"));
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [stageForm, setStageForm] = useState({ pipelineId: "", name: "", probability: "20" });

  const refresh = useCallback(async () => {
    const rows = await loadCrmPipelines();
    setPipelines(rows);
    if (!stageForm.pipelineId && rows[0]) {
      setStageForm((f) => ({ ...f, pipelineId: rows[0].id }));
    }
  }, [stageForm.pipelineId]);

  useEffect(() => {
    void refresh().catch((e) => toast.error(String(e)));
  }, [refresh]);

  async function onCreatePipeline(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setBusy(true);
    try {
      await createCrmPipeline(form);
      toast.success("Pipeline created");
      setForm({ name: "", description: "" });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateStage(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite || !stageForm.pipelineId) return;
    setBusy(true);
    try {
      await createCrmStage({
        pipelineId: stageForm.pipelineId,
        name: stageForm.name,
        probability: Number(stageForm.probability),
      });
      toast.success("Stage created");
      setStageForm((f) => ({ ...f, name: "", probability: "20" }));
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border bg-card p-6">
            <h2 className="font-semibold">New pipeline</h2>
            <form className="mt-4 grid gap-3" onSubmit={onCreatePipeline}>
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={busy} className="w-fit">
                Add pipeline
              </Button>
            </form>
          </Card>

          <Card className="border-border bg-card p-6">
            <h2 className="font-semibold">New stage</h2>
            <form className="mt-4 grid gap-3" onSubmit={onCreateStage}>
              <div>
                <Label>Pipeline</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={stageForm.pipelineId}
                  onChange={(e) => setStageForm({ ...stageForm, pipelineId: e.target.value })}
                >
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Stage name</Label>
                <Input
                  value={stageForm.name}
                  onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Probability %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={stageForm.probability}
                  onChange={(e) => setStageForm({ ...stageForm, probability: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={busy} className="w-fit">
                Add stage
              </Button>
            </form>
          </Card>
        </div>
      )}

      {pipelines.map((p) => (
        <Card key={p.id} className="border-border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">{p.name}</h2>
              <p className="text-sm text-muted-foreground">{p.description ?? "No description"}</p>
            </div>
            <div className="flex items-center gap-2">
              {p.isDefault && <Badge>Default</Badge>}
              {canWrite && !p.isDefault && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void setDefaultCrmPipeline(p.id)
                      .then(() => refresh())
                      .then(() => toast.success("Default pipeline set"))
                  }
                >
                  Set default
                </Button>
              )}
            </div>
          </div>
          <ol className="mt-4 space-y-2">
            {p.stages.map((s, i) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <span>
                  {i + 1}. {s.name}{" "}
                  <span className="text-muted-foreground">({s.probability}%)</span>
                </span>
                {canWrite && !["Won", "Lost"].includes(s.name) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void deleteCrmStage(s.id)
                        .then(() => refresh())
                        .then(() => toast.success("Stage deleted"))
                        .catch((err) => toast.error(String(err)))
                    }
                  >
                    Delete
                  </Button>
                )}
              </li>
            ))}
          </ol>
        </Card>
      ))}
      {pipelines.length === 0 && (
        <p className="text-sm text-muted-foreground">Loading pipelines…</p>
      )}
    </div>
  );
}
