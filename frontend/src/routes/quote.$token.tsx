import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { API_V1_BASE } from '@/lib/api/config';
import { customerViewPdfUrl } from '@/lib/crm/quotation-api';

type CustomerView = {
  quotationNumber: string;
  status: string;
  issueDate: string;
  expiryDate: string | null;
  subtotal: string | number;
  discount: string | number;
  tax: string | number;
  total: string | number;
  notes: string | null;
  terms: string | null;
  scopeOfWork: string | null;
  deliverables: string | null;
  revisionNumber: number;
  customer: { companyName: string; email?: string | null };
  company: { name: string; legalName?: string | null };
  items: Array<{
    itemName: string;
    quantity: string | number;
    unitPrice: string | number;
    lineTotal: string | number;
  }>;
};

export const Route = createFileRoute('/quote/$token')({
  component: CustomerQuoteViewPage,
});

function CustomerQuoteViewPage() {
  const { token } = Route.useParams();
  const [data, setData] = useState<CustomerView | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch(`${API_V1_BASE}/crm/customer-view/${token}`)
      .then((r) => r.json())
      .then((body) => setData(body.data ?? body))
      .catch((e) => toast.error(String(e)));
  }, [token]);

  async function postAction(path: string) {
    setBusy(true);
    try {
      const res = await fetch(`${API_V1_BASE}/crm/customer-view/${token}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: comment || undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Submitted');
      const body = await fetch(`${API_V1_BASE}/crm/customer-view/${token}`).then((r) => r.json());
      setData(body.data ?? body);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return <p className="text-muted-foreground p-8 text-sm">Loading quotation…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <p className="text-muted-foreground text-xs tracking-wider uppercase">Quotation</p>
        <h1 className="text-2xl font-semibold">{data.quotationNumber}</h1>
        <p className="text-muted-foreground text-sm">
          From {data.company.legalName ?? data.company.name} · Rev {data.revisionNumber}
        </p>
      </div>

      <Card className="border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-medium">{data.customer.companyName}</p>
            <p className="text-muted-foreground text-sm">
              Issued {new Date(data.issueDate).toLocaleDateString()}
              {data.expiryDate
                ? ` · Expires ${new Date(data.expiryDate).toLocaleDateString()}`
                : ''}
            </p>
          </div>
          <Badge>{data.status}</Badge>
        </div>
        <p className="mt-4 text-2xl font-semibold tabular-nums">
          ${Number(data.total).toLocaleString()}
        </p>
      </Card>

      {data.scopeOfWork && (
        <Card className="border-border bg-card p-6">
          <h2 className="font-semibold">Scope of work</h2>
          <p className="mt-2 text-sm">{data.scopeOfWork}</p>
        </Card>
      )}

      <Card className="border-border bg-card divide-y">
        {data.items.map((item, i) => (
          <div
            key={i}
            className="flex justify-between p-4 text-sm"
          >
            <span>
              {item.itemName} × {Number(item.quantity)}
            </span>
            <span>${Number(item.lineTotal).toLocaleString()}</span>
          </div>
        ))}
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          asChild
        >
          <a
            href={customerViewPdfUrl(token)}
            target="_blank"
            rel="noreferrer"
          >
            Download PDF
          </a>
        </Button>
        {!['APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(data.status) && (
          <>
            <Button
              disabled={busy}
              onClick={() => void postAction('accept')}
            >
              Accept
            </Button>
            <Button
              disabled={busy}
              variant="ghost"
              onClick={() => void postAction('reject')}
            >
              Reject
            </Button>
          </>
        )}
      </div>

      <Card className="border-border bg-card p-6">
        <Label>Comment</Label>
        <Input
          className="mt-2"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Questions or feedback"
        />
        <Button
          className="mt-3"
          variant="secondary"
          disabled={busy || !comment.trim()}
          onClick={() => void postAction('comment')}
        >
          Send comment
        </Button>
      </Card>
    </div>
  );
}
