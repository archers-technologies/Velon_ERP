import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { commitPosSale } from "@/lib/workspace/mutations";
import { loadPosBootstrap } from "@/lib/workspace/loaders";
import type { PosCatalogItem, PosTicketLine } from "@/erp/pos-seed";
import { useWorkspaceCurrency } from "@/contexts/workspace-currency";
import type { InvoiceDocument } from "@/lib/invoicing/types";
import { printInvoiceDocument } from "@/lib/invoicing/print-invoice";
import { loadInvoiceCompanyProfile } from "@/lib/invoicing/workspace-profile";
import { getPrinterSettings, receiptFormatLabel } from "@/lib/printer-settings";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Receipt,
  Plus,
  Printer,
  Minus,
  Trash2,
  WifiOff,
  ScanBarcode,
  CreditCard,
  Banknote,
  Smartphone,
  Gift,
} from "lucide-react";

export const Route = createFileRoute("/app/billing-pos")({
  loader: () => loadPosBootstrap(),
  component: BillingPosPage,
});

type PaymentMethod = "cash" | "card" | "upi" | "wallet";

function cloneTicket(lines: PosTicketLine[]): PosTicketLine[] {
  return lines.map((l) => ({ ...l }));
}

function BillingPosPage() {
  const router = useRouter();
  const { formatCurrency, moneyFormat } = useWorkspaceCurrency();
  const { defaultTicket, catalog, customers } = Route.useLoaderData();

  const [lines, setLines] = useState<PosTicketLine[]>(() => cloneTicket(defaultTicket));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customerId, setCustomerId] = useState<string>("walk-in");
  const [orderNote, setOrderNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<
    Awaited<ReturnType<typeof loadInvoiceCompanyProfile>> | null
  >(null);
  const [printerSettings, setPrinterSettings] = useState(getPrinterSettings);

  React.useEffect(() => {
    loadInvoiceCompanyProfile()
      .then(setCompanyProfile)
      .catch(() => setCompanyProfile(null));
    setPrinterSettings(getPrinterSettings());
    const refreshPrinter = () => setPrinterSettings(getPrinterSettings());
    window.addEventListener("focus", refreshPrinter);
    return () => window.removeEventListener("focus", refreshPrinter);
  }, []);

  const customerName =
    customerId === "walk-in" ? undefined : customers.find((c) => c.id === customerId)?.name;

  const subtotal = useMemo(
    () => Math.round(lines.reduce((s, l) => s + l.qty * l.unitPrice, 0) * 100) / 100,
    [lines],
  );

  const salePayload = useCallback(
    () =>
      lines.map((l) => ({
        inventoryId: l.inventoryId,
        name: l.name,
        qty: l.qty,
        unitPrice: l.unitPrice,
      })),
    [lines],
  );

  async function settle(kind: "paid" | "due") {
    setBusy(true);
    try {
      const res = await commitPosSale({
        lines: salePayload(),
        kind,
        customerName: customerName ?? "Walk-in",
      });
      const invLabel = kind === "paid" ? "Payment captured" : "Invoice saved as due";
      const settings = getPrinterSettings();
      if (kind === "paid" && settings.autoPrintOnCharge && settings.receiptFormat !== "none") {
        try {
          await printInvoiceDocument(buildInvoiceDoc(res.invoiceId), settings.receiptFormat);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Receipt print failed");
        }
      }
      toast.success(`${invLabel} · ${res.invoiceId} · ${formatCurrency(res.total)}`, {
        description:
          res.inventoryRowsTouched > 0
            ? `Inventory updated for ${res.inventoryRowsTouched} stocked line(s).`
            : "No stock-linked lines on this ticket.",
      });
      setLines(cloneTicket(defaultTicket));
      setCustomerId("walk-in");
      setOrderNote("");
      await router.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not complete sale");
    } finally {
      setBusy(false);
    }
  }

  function newBill() {
    setLines(cloneTicket(defaultTicket));
    setCustomerId("walk-in");
    setOrderNote("");
    toast.message("New ticket", {
      description: defaultTicket.length ? "Default basket restored." : "Fresh empty ticket ready.",
    });
  }

  function addFromCatalog(item: PosCatalogItem) {
    setLines((prev) => [
      ...prev,
      {
        id: `line-${crypto.randomUUID()}`,
        inventoryId: item.inventoryId,
        name: item.name,
        qty: 1,
        unitPrice: item.unitPrice,
      },
    ]);
  }

  function setQty(id: string, qty: number) {
    const q = Math.max(1, Math.min(999, qty));
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, qty: q } : l)));
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  const buildInvoiceDoc = useCallback(
    (invoiceNumber: string): InvoiceDocument => ({
      invoiceNumber,
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
      customerName: customerName ?? "Walk-in",
      lines: lines.map((l) => ({
        name: l.name,
        quantity: l.qty,
        unitPrice: l.unitPrice,
      })),
      currency: moneyFormat.currencyCode,
      company: companyProfile ?? { legalName: "Velon Workspace" },
      paymentStatus: "paid",
    }),
    [lines, customerName, moneyFormat.currencyCode, companyProfile],
  );

  async function printReceipt() {
    const settings = getPrinterSettings();
    setPrinterSettings(settings);
    if (lines.length === 0) return;
    if (settings.receiptFormat === "none") {
      toast.error("Receipt printing is disabled. Choose a format in Printer settings.");
      return;
    }
    const invoiceNumber = `POS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString(36).toUpperCase()}`;
    try {
      await printInvoiceDocument(buildInvoiceDoc(invoiceNumber), settings.receiptFormat);
      toast.success(`${receiptFormatLabel(settings.receiptFormat)} print preview opened.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not print receipt");
    }
  }

  const paymentOptions: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
    { id: "cash", label: "Cash", icon: Banknote },
    { id: "card", label: "Card", icon: CreditCard },
    { id: "upi", label: "UPI", icon: Smartphone },
    { id: "wallet", label: "Wallet / gift", icon: Gift },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-dashed border-border bg-muted/20 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>
              Offline-ready POS: <span className="font-medium text-foreground">0</span> queued sales
              · Auto-sync when online
            </span>
          </div>
          <Badge variant="outline" className="border-border text-[10px] font-normal">
            {companyProfile?.taxId
              ? `VAT/GST ${companyProfile.taxId}`
              : "Configure tax ID in company profile"}
          </Badge>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card p-0 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
            <h2 className="text-lg font-semibold tracking-tight">POS Quick Billing</h2>
            <Button
              type="button"
              size="sm"
              className="rounded-lg bg-foreground text-background hover:bg-foreground/90"
              onClick={newBill}
            >
              <Plus className="mr-1.5 h-4 w-4" /> New bill
            </Button>
          </div>

          <div className="space-y-5 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Customer (CRM)</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="h-11 rounded-lg">
                    <SelectValue placeholder="Customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">Walk-in</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Reference (optional)</Label>
                <Input
                  className="h-11 rounded-lg"
                  placeholder="Table, order #, loyalty id…"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-gradient-to-b from-background to-muted/20 p-5 sm:p-6">
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Current ticket
              </div>
              <div className="mt-2 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
                {formatCurrency(subtotal)}
              </div>
              <Separator className="my-5" />
              {lines.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Ticket is empty — tap a favorite below or scan a barcode (hardware integration).
                </p>
              ) : (
                <ul className="space-y-3">
                  {lines.map((line) => (
                    <li
                      key={line.id}
                      className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium leading-snug">{line.name}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          {line.inventoryId ? (
                            <span className="inline-flex items-center gap-1">
                              <ScanBarcode className="h-3 w-3" /> Stock-linked
                            </span>
                          ) : (
                            <span>Non-stock line</span>
                          )}
                          <span>·</span>
                          <span className="tabular-nums">
                            {formatCurrency(line.unitPrice)} each
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 shrink-0 rounded-md"
                            aria-label="Decrease quantity"
                            onClick={() => setQty(line.id, line.qty - 1)}
                            disabled={line.qty <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="min-w-[2.25rem] text-center text-sm font-semibold tabular-nums">
                            {line.qty}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 shrink-0 rounded-md"
                            aria-label="Increase quantity"
                            onClick={() => setQty(line.id, line.qty + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold tabular-nums">
                            {formatCurrency(line.qty * line.unitPrice)}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-1 h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => removeLine(line.id)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" /> Remove
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Favorites and quick keys
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Touch-friendly · barcode SKU next
                </span>
              </div>
              <div className="-mx-1 flex gap-2 overflow-x-auto pb-2 pt-1">
                {catalog.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                    No POS items yet. Add inventory first, then products appear here.
                  </div>
                ) : (
                  catalog.map((item) => (
                    <Button
                      key={item.id}
                      type="button"
                      variant={item.favorite ? "default" : "outline"}
                      className={`h-auto shrink-0 flex-col gap-0.5 rounded-xl px-4 py-3 ${
                        item.favorite ? "bg-foreground text-background hover:bg-foreground/90" : ""
                      }`}
                      onClick={() => addFromCatalog(item)}
                    >
                      <span className="max-w-[140px] truncate text-sm font-medium">
                        {item.name}
                      </span>
                      <span className="text-xs opacity-80 tabular-nums">
                        {formatCurrency(item.unitPrice)}
                      </span>
                    </Button>
                  ))
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Payment method</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {paymentOptions.map((opt) => {
                  const Icon = opt.icon;
                  const active = paymentMethod === opt.id;
                  return (
                    <Button
                      key={opt.id}
                      type="button"
                      variant={active ? "default" : "outline"}
                      className={`h-12 rounded-xl ${active ? "bg-foreground text-background hover:bg-foreground/90" : ""}`}
                      onClick={() => setPaymentMethod(opt.id)}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {opt.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Settling a ticket creates an invoice and, for stock-linked lines, decrements on-hand
              inventory in real time. Accounting entries follow the same invoice (ledger wiring in a
              full deployment).
            </p>
          </div>
        </Card>

        <Card className="border-border bg-card p-0 shadow-sm">
          <div className="border-b border-border p-5">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Invoice actions</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Complete the sale or park it as receivable. Receipt printing is configured in Settings.
            </p>
          </div>
          <div className="flex flex-col gap-2 p-5">
            <Button
              type="button"
              size="lg"
              className="h-12 w-full rounded-xl bg-foreground text-base font-medium text-background hover:bg-foreground/90"
              disabled={busy || lines.length === 0}
              onClick={() => void settle("paid")}
            >
              {busy
                ? "Processing…"
                : `Charge ${paymentOptions.find((p) => p.id === paymentMethod)?.label ?? "payment"}`}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="h-12 w-full rounded-xl text-base font-medium"
              disabled={busy || lines.length === 0}
              onClick={() => void settle("due")}
            >
              Save as due
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="h-12 w-full rounded-xl text-base font-medium"
              disabled={busy || lines.length === 0 || printerSettings.receiptFormat === "none"}
              onClick={() => void printReceipt()}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print receipt
            </Button>
            <p className="pt-1 text-center text-[11px] text-muted-foreground">
              Receipt:{" "}
              <span className="font-medium text-foreground">
                {receiptFormatLabel(printerSettings.receiptFormat)}
              </span>
              {printerSettings.autoPrintOnCharge && printerSettings.receiptFormat !== "none"
                ? " · auto-print on charge"
                : ""}
              {" · "}
              <Link
                to="/app/settings"
                search={{ tab: "printers" }}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Printer settings
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
