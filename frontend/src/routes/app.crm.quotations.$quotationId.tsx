import { useCallback, useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Download, FileText, Send } from 'lucide-react';
import { toast } from 'sonner';
import { canWriteCrmRecords, normalizeVelonRole } from '@velon/shared';
import { QuotationDocumentBuilder } from '@/components/crm/quotation-document-builder';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getSessionMembershipRole } from '@/lib/auth/session';
import {
  parseQuotationDocument,
  syncLegacyFieldsFromDocument,
  type DocumentBody,
} from '@/lib/crm/document-types';
import {
  downloadQuotationPdf,
  generateProposal,
  getQuotation,
  sendQuotation,
  updateQuotation,
  type CrmQuotation,
} from '@/lib/crm/quotation-api';

export const Route = createFileRoute('/app/crm/quotations/$quotationId')({
  loader: ({ params }) => getQuotation(params.quotationId),
  component: QuotationDetailPage,
});

function QuotationDetailPage() {
  const initial = Route.useLoaderData();
  const { quotationId } = Route.useParams();
  const canWrite = canWriteCrmRecords(normalizeVelonRole(getSessionMembershipRole() ?? 'USER'));
  const [quotation, setQuotation] = useState<CrmQuotation>(initial);
  const [document, setDocument] = useState<DocumentBody>(() => parseQuotationDocument(initial));
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [portalLink, setPortalLink] = useState('');

  const refresh = useCallback(async () => {
    const row = await getQuotation(quotationId);
    setQuotation(row);
    setDocument(parseQuotationDocument(row));
  }, [quotationId]);

  useEffect(() => {
    setQuotation(initial);
    setDocument(parseQuotationDocument(initial));
  }, [initial]);

  async function onSaveDocument() {
    if (!canWrite) return;
    setSaving(true);
    try {
      const legacy = syncLegacyFieldsFromDocument(document);
      const updated = await updateQuotation(quotationId, {
        documentJson: document,
        ...legacy,
      });
      setQuotation(updated);
      setDocument(parseQuotationDocument(updated));
      toast.success('Document saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save document');
    } finally {
      setSaving(false);
    }
  }

  async function onDownloadPdf() {
    setBusy(true);
    try {
      const blob = await downloadQuotationPdf(quotationId);
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download PDF');
    } finally {
      setBusy(false);
    }
  }

  async function onGenerateProposal() {
    if (!canWrite) return;
    setBusy(true);
    try {
      await generateProposal(quotationId);
      toast.success('Proposal generated');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate proposal');
    } finally {
      setBusy(false);
    }
  }

  async function onSend() {
    if (!canWrite) return;
    setBusy(true);
    try {
      const result = await sendQuotation(quotationId);
      if (result.portalToken) {
        setPortalLink(`${window.location.origin}/quote/${result.portalToken}`);
      }
      setQuotation(result);
      toast.success('Quotation sent');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send quotation');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2"
          >
            <Link to="/app/crm/quotations">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to quotations
            </Link>
          </Button>
          <h2 className="text-xl font-semibold">{quotation.quotationNumber}</h2>
          <p className="text-muted-foreground text-sm">
            {quotation.customer?.companyName ?? quotation.customerId} · Rev{' '}
            {quotation.revisionNumber}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{quotation.status}</Badge>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void onDownloadPdf()}
          >
            <Download className="mr-1 h-4 w-4" />
            Download PDF
          </Button>
          {canWrite && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void onGenerateProposal()}
              >
                <FileText className="mr-1 h-4 w-4" />
                Generate Proposal
              </Button>
              {quotation.status === 'DRAFT' && (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => void onSend()}
                >
                  <Send className="mr-1 h-4 w-4" />
                  Send
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {portalLink && (
        <Card className="border-border bg-card p-4">
          <p className="text-sm font-medium">Customer portal link</p>
          <p className="text-muted-foreground mt-1 text-xs break-all">{portalLink}</p>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card p-4">
          <p className="text-muted-foreground text-xs">Subtotal</p>
          <p className="text-lg font-semibold tabular-nums">
            ${Number(quotation.subtotal).toLocaleString()}
          </p>
        </Card>
        <Card className="border-border bg-card p-4">
          <p className="text-muted-foreground text-xs">Tax</p>
          <p className="text-lg font-semibold tabular-nums">
            ${Number(quotation.tax).toLocaleString()}
          </p>
        </Card>
        <Card className="border-border bg-card p-4">
          <p className="text-muted-foreground text-xs">Total</p>
          <p className="text-lg font-semibold tabular-nums">
            ${Number(quotation.total).toLocaleString()}
          </p>
        </Card>
      </div>

      <Card className="border-border bg-card divide-y">
        <div className="p-4">
          <h3 className="font-semibold">Line items</h3>
        </div>
        {(quotation.items ?? []).length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">No line items yet.</p>
        ) : (
          (quotation.items ?? []).map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="font-medium">{item.itemName}</p>
                {item.description && (
                  <p className="text-muted-foreground text-xs">{item.description}</p>
                )}
              </div>
              <p className="text-sm tabular-nums">
                {Number(item.quantity)} × ${Number(item.unitPrice).toLocaleString()} = $
                {Number(item.lineTotal).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </Card>

      <QuotationDocumentBuilder
        document={document}
        onChange={setDocument}
        onSave={() => void onSaveDocument()}
        saving={saving}
        disabled={!canWrite}
      />
    </div>
  );
}
