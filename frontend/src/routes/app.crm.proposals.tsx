import { useCallback, useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';
import { canWriteCrmRecords, normalizeVelonRole } from '@velon/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAccessToken, getSessionMembershipRole } from '@/lib/auth/session';
import {
  generateProposal,
  loadProposals,
  loadQuotations,
  proposalPdfUrl,
  type CrmProposalSummary,
  type CrmQuotation,
} from '@/lib/crm/quotation-api';

export const Route = createFileRoute('/app/crm/proposals')({
  component: CrmProposalsPage,
});

function CrmProposalsPage() {
  const canWrite = canWriteCrmRecords(normalizeVelonRole(getSessionMembershipRole() ?? 'USER'));
  const [quotations, setQuotations] = useState<CrmQuotation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [proposals, setProposals] = useState<CrmProposalSummary[]>([]);

  const refresh = useCallback(async () => {
    const q = await loadQuotations();
    setQuotations(q);
    if (!selectedId && q[0]) setSelectedId(q[0].id);
  }, [selectedId]);

  useEffect(() => {
    void refresh().catch((e) => toast.error(String(e)));
  }, [refresh]);

  useEffect(() => {
    if (!selectedId) return;
    void loadProposals(selectedId)
      .then(setProposals)
      .catch((e) => toast.error(String(e)));
  }, [selectedId]);

  async function openPdf(proposalId: string) {
    const token = getAccessToken();
    const res = await fetch(proposalPdfUrl(proposalId), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      toast.error('Failed to load PDF');
      return;
    }
    const blob = await res.blob();
    window.open(URL.createObjectURL(blob), '_blank');
  }

  const selected = quotations.find((q) => q.id === selectedId);

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[240px]">
            <Label>Quotation</Label>
            <Select
              value={selectedId}
              onValueChange={setSelectedId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select quotation" />
              </SelectTrigger>
              <SelectContent>
                {quotations.map((q) => (
                  <SelectItem
                    key={q.id}
                    value={q.id}
                  >
                    {q.quotationNumber} · {q.customer?.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {canWrite && selectedId && (
            <Button
              onClick={() =>
                void generateProposal(selectedId)
                  .then(() => loadProposals(selectedId))
                  .then(setProposals)
                  .then(() => toast.success('Proposal generated'))
              }
            >
              Generate PDF
            </Button>
          )}
        </div>
        {selected && (
          <p className="text-muted-foreground mt-3 text-sm">
            {selected.quotationNumber} · Rev {selected.revisionNumber} · {selected.status} · $
            {Number(selected.total).toLocaleString()}
          </p>
        )}
      </Card>

      <Card className="border-border bg-card divide-y">
        {proposals.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between p-4"
          >
            <div>
              <p className="font-medium">Version {p.version}</p>
              <p className="text-muted-foreground text-xs">
                Generated {new Date(p.generatedAt).toLocaleString()}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void openPdf(p.id)}
            >
              View PDF
            </Button>
          </div>
        ))}
        {proposals.length === 0 && (
          <p className="text-muted-foreground p-6 text-sm">
            No proposal PDFs for this quotation yet.
          </p>
        )}
      </Card>
    </div>
  );
}
