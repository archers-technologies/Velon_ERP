import { useCallback, useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Mail, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { guardDisabledAdminPath } from '@/lib/auth/production-routes';
import {
  loadPlatformEmailLogs,
  loadPlatformEmailTemplates,
  resendPlatformEmailLog,
  sendTestPlatformEmail,
  updatePlatformEmailTemplate,
  type EmailLogRecord,
  type EmailTemplateRecord,
} from '@/lib/email/api';

export const Route = createFileRoute('/admin/settings/email')({
  beforeLoad: ({ location }) => {
    guardDisabledAdminPath(location.pathname);
  },
  component: AdminEmailSettingsPage,
});

function statusVariant(status: string) {
  if (status === 'SENT' || status === 'DELIVERED') return 'default';
  if (status === 'FAILED' || status === 'BOUNCED') return 'destructive';
  return 'secondary';
}

function AdminEmailSettingsPage() {
  const [templates, setTemplates] = useState<EmailTemplateRecord[]>([]);
  const [logs, setLogs] = useState<EmailLogRecord[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<EmailTemplateRecord>>({});
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(true);

  const selected = templates.find((t) => t.key === selectedKey) ?? null;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [tpls, emailLogs] = await Promise.all([
        loadPlatformEmailTemplates(),
        loadPlatformEmailLogs(),
      ]);
      setTemplates(tpls);
      setLogs(emailLogs);
      if (!selectedKey && tpls[0]) setSelectedKey(tpls[0].key);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load email settings');
    } finally {
      setLoading(false);
    }
  }, [selectedKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (selected) setDraft(selected);
  }, [selected]);

  const saveTemplate = async () => {
    if (!selectedKey) return;
    try {
      const updated = await updatePlatformEmailTemplate(selectedKey, {
        name: draft.name,
        subject: draft.subject,
        previewText: draft.previewText ?? undefined,
        htmlBody: draft.htmlBody,
        textBody: draft.textBody,
        isActive: draft.isActive,
      });
      setTemplates((prev) => prev.map((t) => (t.key === updated.key ? updated : t)));
      toast.success('Template saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const sendTest = async () => {
    if (!selectedKey || !testEmail.trim()) return;
    try {
      await sendTestPlatformEmail(selectedKey, testEmail.trim());
      toast.success('Test email queued');
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test send failed');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">
            <Link
              className="hover:underline"
              to="/admin/settings"
            >
              Settings
            </Link>
            {' / Email'}
          </p>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Mail className="size-6" />
            Email Templates
          </h1>
        </div>
        <Button
          variant="outline"
          onClick={() => void refresh()}
        >
          <RefreshCw className="mr-2 size-4" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="logs">Delivery logs</TabsTrigger>
        </TabsList>

        <TabsContent
          className="mt-4"
          value="templates"
        >
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading templates…</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
              <Card className="max-h-[70vh] overflow-y-auto p-2">
                {templates.map((tpl) => (
                  <button
                    key={tpl.key}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                      selectedKey === tpl.key ? 'bg-muted font-medium' : 'hover:bg-muted/60'
                    }`}
                    type="button"
                    onClick={() => setSelectedKey(tpl.key)}
                  >
                    <div>{tpl.name}</div>
                    <div className="text-muted-foreground text-xs">{tpl.key}</div>
                  </button>
                ))}
              </Card>

              {selected ? (
                <Card className="space-y-4 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{selected.category}</Badge>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={draft.isActive ?? true}
                        onCheckedChange={(checked) =>
                          setDraft((d) => ({ ...d, isActive: checked }))
                        }
                      />
                      <Label>Active</Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={draft.name ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input
                      value={draft.subject ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preview text</Label>
                    <Input
                      value={draft.previewText ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, previewText: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>HTML body</Label>
                    <Textarea
                      className="min-h-[160px] font-mono text-xs"
                      value={draft.htmlBody ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, htmlBody: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Plain text</Label>
                    <Textarea
                      className="min-h-[100px] font-mono text-xs"
                      value={draft.textBody ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, textBody: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    <Input
                      className="max-w-xs"
                      placeholder="Test recipient email"
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      onClick={() => void sendTest()}
                    >
                      <Send className="mr-2 size-4" />
                      Send test
                    </Button>
                    <Button onClick={() => void saveTemplate()}>Save template</Button>
                  </div>
                </Card>
              ) : null}
            </div>
          )}
        </TabsContent>

        <TabsContent
          className="mt-4"
          value="logs"
        >
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3">When</th>
                  <th className="p-3">To</th>
                  <th className="p-3">Template</th>
                  <th className="p-3">Status</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b"
                  >
                    <td className="text-muted-foreground p-3">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3">{log.toEmail}</td>
                    <td className="p-3">{log.templateKey}</td>
                    <td className="p-3">
                      <Badge variant={statusVariant(log.status)}>{log.status}</Badge>
                    </td>
                    <td className="p-3">
                      {log.status === 'FAILED' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await resendPlatformEmailLog(log.id);
                            toast.success('Resend queued');
                            void refresh();
                          }}
                        >
                          Resend
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 ? (
              <p className="text-muted-foreground p-4 text-sm">No email logs yet.</p>
            ) : null}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
