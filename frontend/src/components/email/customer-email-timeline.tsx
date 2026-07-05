import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { loadCustomerEmailTimeline, type EmailLogRecord } from '@/lib/email/api';

type Props = {
  customerId: string;
};

export function CustomerEmailTimeline({ customerId }: Props) {
  const [logs, setLogs] = useState<EmailLogRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadCustomerEmailTimeline(customerId)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading communication history…</p>;
  }

  if (logs.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Mail className="size-4" />
          No email history linked to this customer yet.
        </p>
      </Card>
    );
  }

  return (
    <Card className="divide-y">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex flex-wrap items-start justify-between gap-2 p-4"
        >
          <div>
            <p className="font-medium">{log.subject}</p>
            <p className="text-muted-foreground text-sm">
              {log.templateKey} · {new Date(log.createdAt).toLocaleString()}
            </p>
          </div>
          <Badge variant={log.status === 'FAILED' ? 'destructive' : 'secondary'}>
            {log.status}
          </Badge>
        </div>
      ))}
    </Card>
  );
}
