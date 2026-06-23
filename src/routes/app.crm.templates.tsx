import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createProposalTemplate,
  deleteProposalTemplate,
  loadProposalTemplates,
  type CrmProposalTemplate,
} from "@/lib/api/crm-quotation";
import { getSessionMembershipRole } from "@/lib/auth/session";
import { canWriteCrmRecords, normalizeVelonRole } from "@velon/shared";

export const Route = createFileRoute("/app/crm/templates")({
  component: CrmTemplatesPage,
});

function CrmTemplatesPage() {
  const canWrite = canWriteCrmRecords(normalizeVelonRole(getSessionMembershipRole() ?? "USER"));
  const [templates, setTemplates] = useState<CrmProposalTemplate[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    coverTitle: "",
    scopeTemplate: "",
    deliverablesTemplate: "",
    termsTemplate: "",
  });

  const refresh = useCallback(async () => {
    setTemplates(await loadProposalTemplates());
  }, []);

  useEffect(() => {
    void refresh().catch((e) => toast.error(String(e)));
  }, [refresh]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    try {
      await createProposalTemplate(form);
      toast.success("Template created");
      setForm({
        name: "",
        description: "",
        coverTitle: "",
        scopeTemplate: "",
        deliverablesTemplate: "",
        termsTemplate: "",
      });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <Card className="border-border bg-card p-6">
          <h2 className="font-semibold">New proposal template</h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onCreate}>
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Cover title</Label>
              <Input
                value={form.coverTitle}
                onChange={(e) => setForm({ ...form, coverTitle: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Scope template</Label>
              <Input
                value={form.scopeTemplate}
                onChange={(e) => setForm({ ...form, scopeTemplate: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Deliverables template</Label>
              <Input
                value={form.deliverablesTemplate}
                onChange={(e) => setForm({ ...form, deliverablesTemplate: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Terms template</Label>
              <Input
                value={form.termsTemplate}
                onChange={(e) => setForm({ ...form, termsTemplate: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-fit">
              Save template
            </Button>
          </form>
        </Card>
      )}

      <Card className="border-border bg-card divide-y">
        {templates.map((t) => (
          <div key={t.id} className="flex items-start justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.description ?? "—"}</p>
              {t.termsTemplate && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.termsTemplate}</p>
              )}
            </div>
            {canWrite && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  void deleteProposalTemplate(t.id)
                    .then(refresh)
                    .then(() => toast.success("Deleted"))
                }
              >
                Delete
              </Button>
            )}
          </div>
        ))}
        {templates.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">No templates yet.</p>
        )}
      </Card>
    </div>
  );
}
