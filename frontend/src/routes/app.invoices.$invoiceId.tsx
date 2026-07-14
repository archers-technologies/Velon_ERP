import { useCallback, useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { canWriteSales, normalizeVelonRole } from '@velon/shared';
import { InvoiceDocumentView } from '@/components/sales/invoice-document';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getSessionMembershipRole } from '@/lib/auth/session';
import {
  cancelInvoice,
  deleteInvoice,
  duplicateInvoice,
  loadInvoice,
  recordInvoicePayment,
  sendInvoiceEmail,
  voidInvoice,
  type SalesInvoice,
  type SalesInvoicePaymentMethod,
} from '@/lib/sales/invoice-api';
import { loadInvoiceCompanyProfile } from '@/lib/sales/invoicing/workspace-profile';

export const Route = createFileRoute('/app/invoices/$invoiceId')({
  loader: ({ params }) => loadInvoice(params.invoiceId),
  component: InvoiceDetailPage,
});

const PAYMENT_METHODS: SalesInvoicePaymentMethod[] = [
  'CASH',
  'CARD',
  'UPI',
  'BANK_TRANSFER',
  'WALLET',
  'GIFT',
  'OTHER',
];

function InvoiceDetailPage() {
  const navigate = useNavigate();
  const initial = Route.useLoaderData();
  const [invoice, setInvoice] = useState<SalesInvoice>(initial);
  const [companyName, setCompanyName] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<SalesInvoicePaymentMethod>('CASH');
  const canWrite = canWriteSales(normalizeVelonRole(getSessionMembershipRole() ?? 'USER'));

  const refresh = useCallback(async () => {
    const row = await loadInvoice(invoice.id);
    setInvoice(row);
  }, [invoice.id]);

  useEffect(() => {
    loadInvoiceCompanyProfile()
      .then((profile) => {
        setCompanyName(profile.legalName ?? profile.name);
        setLogoDataUrl(profile.logoDataUrl ?? null);
      })
      .catch(() => undefined);
  }, []);

  const onRecordPayment = async () => {
    try {
      const updated = await recordInvoicePayment(invoice.id, {
        amount: Number(paymentAmount),
        method: paymentMethod,
      });
      setInvoice(updated);
      setShowPayment(false);
      toast.success('Payment recorded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not record payment');
    }
  };

  const onEmail = async () => {
    const result = await sendInvoiceEmail(invoice.id);
    if (result.sent) toast.success('Invoice email sent');
    else toast.warning(result.warning ?? 'Invoice saved but email could not be sent');
  };

  return (
    <div className="space-y-6">
      <InvoiceDocumentView
        invoice={invoice}
        companyName={companyName}
        logoDataUrl={logoDataUrl}
        canWrite={canWrite}
        onRecordPayment={
          canWrite && !['PAID', 'CANCELLED', 'VOID', 'DRAFT'].includes(invoice.status)
            ? () => {
                setPaymentAmount(String(invoice.balanceDue));
                setShowPayment(true);
              }
            : undefined
        }
        onEdit={
          canWrite && invoice.status === 'DRAFT'
            ? () => void navigate({ to: '/app/invoices/create' })
            : undefined
        }
        onDuplicate={
          canWrite
            ? async () => {
                const copy = await duplicateInvoice(invoice.id);
                toast.success('Invoice duplicated');
                await navigate({
                  to: '/app/invoices/$invoiceId',
                  params: { invoiceId: copy.id },
                });
              }
            : undefined
        }
        onCancel={
          canWrite && !['CANCELLED', 'VOID', 'DRAFT'].includes(invoice.status)
            ? async () => {
                const updated = await cancelInvoice(invoice.id);
                setInvoice(updated);
                toast.success('Invoice cancelled');
              }
            : undefined
        }
        onVoid={
          canWrite && !['CANCELLED', 'VOID', 'DRAFT'].includes(invoice.status)
            ? async () => {
                const updated = await voidInvoice(invoice.id);
                setInvoice(updated);
                toast.success('Invoice voided');
              }
            : undefined
        }
        onDelete={
          canWrite && invoice.status === 'DRAFT'
            ? async () => {
                await deleteInvoice(invoice.id);
                toast.success('Draft deleted');
                await navigate({ to: '/app/invoices' });
              }
            : undefined
        }
        onEmail={canWrite ? () => void onEmail() : undefined}
      />

      {showPayment ? (
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Record payment</h2>
          <div className="grid max-w-md gap-3">
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as SalesInvoicePaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem
                      key={method}
                      value={method}
                    >
                      {method.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => void onRecordPayment()}>Save payment</Button>
              <Button
                variant="outline"
                onClick={() => setShowPayment(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
