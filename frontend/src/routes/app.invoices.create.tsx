import { createFileRoute } from '@tanstack/react-router';
import { InvoiceForm } from '@/components/sales/invoice-form';

export const Route = createFileRoute('/app/invoices/create')({
  component: CreateInvoicePage,
});

function CreateInvoicePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create Invoice</h1>
        <p className="text-muted-foreground text-sm">
          Build a professional invoice with customers, inventory products, taxes, and payments.
        </p>
      </div>
      <InvoiceForm />
    </div>
  );
}
