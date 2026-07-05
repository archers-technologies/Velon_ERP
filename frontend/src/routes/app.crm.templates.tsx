import { useCallback, useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';
import { canWriteCrmRecords, normalizeVelonRole } from '@velon/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSessionMembershipRole } from '@/lib/auth/session';
import {
  createProposalTemplate,
  deleteProposalTemplate,
  loadProposalTemplates,
  type CrmProposalTemplate,
} from '@/lib/crm/quotation-api';

export const Route = createFileRoute('/app/crm/templates')({
  component: CrmTemplatesPage,
});

function CrmTemplatesPage() {
  const canWrite = canWriteCrmRecords(normalizeVelonRole(getSessionMembershipRole() ?? 'USER'));
  const [templates, setTemplates] = useState<CrmProposalTemplate[]>([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    coverTitle: '',
    scopeTemplate: '',
    deliverablesTemplate: '',
    termsTemplate: '',
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
      toast.success('Template created');
      setForm({
        name: '',
        description: '',
        coverTitle: '',
        scopeTemplate: '',
        deliverablesTemplate: '',
        termsTemplate: '',
      });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <Card className="border-border bg-card p-6">
          <h2 className="font-semibold">New proposal template</h2>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            onSubmit={onCreate}
          >
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
            <Button
              type="submit"
              className="w-fit"
            >
              Save template
            </Button>
          </form>
        </Card>
      )}

      <Card className="border-border bg-card divide-y">
        {templates.map((t) => (
          <div
            key={t.id}
            className="flex items-start justify-between gap-3 p-4"
          >
            <div>
              <p className="font-medium">{t.name}</p>
              <p className="text-muted-foreground text-xs">{t.description ?? '—'}</p>
              {t.termsTemplate && (
                <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{t.termsTemplate}</p>
              )}
            </div>
            {canWrite && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  void deleteProposalTemplate(t.id)
                    .then(refresh)
                    .then(() => toast.success('Deleted'))
                }
              >
                Delete
              </Button>
            )}
          </div>
        ))}
        {templates.length === 0 && (
          <p className="text-muted-foreground p-6 text-sm">No templates yet.</p>
        )}
      </Card>
    </div>
  );
}
