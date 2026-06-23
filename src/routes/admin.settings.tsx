import { createFileRoute } from "@tanstack/react-router";
import { guardDisabledAdminPath } from "@/lib/auth/production-routes";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminCurrency, type AdminCurrencyPreset } from "@/contexts/admin-currency";
import { VELON_CONTACT_EMAIL } from "@velon/shared";
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, Mail, Radio } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  beforeLoad: ({ location }) => {
    guardDisabledAdminPath(location.pathname);
  },
  component: AdminSettingsPage,
});

const POLICY_STORAGE = "velon-admin-policy-engine-v1";

type RoundingMode = "nearest_whole" | "up_whole" | "down_whole" | "nearest_minor";

type PolicyPersist = {
  taxLabel: string;
  cgstPct: string;
  sgstPct: string;
  igstPct: string;
  rounding: RoundingMode;
  invoiceNumbering: string;
  supportEmail: string;
  systemIncidents: boolean;
  systemIncidentDowntimeMin: number;
  partnerDigest: boolean;
  partnerDigestDay: string;
  partnerDigestTime: string;
  trialEscalation: boolean;
  trialEscalationLeadHours: number;
  trialEscalationUsagePct: number;
  lastChangeSummary: string;
  lastChangeIso: string;
};

const DEFAULT_POLICY: PolicyPersist = {
  taxLabel: "GST / VAT",
  cgstPct: "9",
  sgstPct: "9",
  igstPct: "18",
  rounding: "nearest_whole",
  invoiceNumbering: "VELON-{YYYY}-{SEQ}",
  supportEmail: VELON_CONTACT_EMAIL,
  systemIncidents: true,
  systemIncidentDowntimeMin: 5,
  partnerDigest: true,
  partnerDigestDay: "friday",
  partnerDigestTime: "17:00",
  trialEscalation: false,
  trialEscalationLeadHours: 48,
  trialEscalationUsagePct: 80,
  lastChangeSummary: "Initial platform defaults (demo seed).",
  lastChangeIso: new Date().toISOString(),
};

function safeLoad(): Partial<PolicyPersist> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(POLICY_STORAGE);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<PolicyPersist>;
  } catch {
    return {};
  }
}

function applyRounding(amount: number, mode: RoundingMode): number {
  switch (mode) {
    case "up_whole":
      return Math.ceil(amount);
    case "down_whole":
      return Math.floor(amount);
    case "nearest_minor":
      return Math.round(amount * 100) / 100;
    default:
      return Math.round(amount);
  }
}

function roundingLabel(mode: RoundingMode): string {
  switch (mode) {
    case "up_whole":
      return "Always round up (whole)";
    case "down_whole":
      return "Always round down (whole)";
    case "nearest_minor":
      return "Nearest 0.01 (minor unit)";
    default:
      return "Round to nearest whole number";
  }
}

function fiscalSnapshot(p: {
  taxLabel: string;
  cgstPct: string;
  sgstPct: string;
  igstPct: string;
  rounding: RoundingMode;
  invoiceNumbering: string;
}): string {
  return JSON.stringify(p);
}

function dnsLooksVerified(email: string): boolean {
  const d = email.split("@")[1]?.toLowerCase().trim() ?? "";
  if (!d) return false;
  if (d === "yourdomain.com") return false;
  if (d.endsWith("velon.systems")) return true;
  return d.includes(".");
}

function AdminSettingsPage() {
  const { preset, setPreset, customSymbol, setCustomSymbol, formatCurrency } = useAdminCurrency();

  const [hydrated, setHydrated] = useState(false);
  const [taxLabel, setTaxLabel] = useState(DEFAULT_POLICY.taxLabel);
  const [cgstPct, setCgstPct] = useState(DEFAULT_POLICY.cgstPct);
  const [sgstPct, setSgstPct] = useState(DEFAULT_POLICY.sgstPct);
  const [igstPct, setIgstPct] = useState(DEFAULT_POLICY.igstPct);
  const [rounding, setRounding] = useState<RoundingMode>(DEFAULT_POLICY.rounding);
  const [invoiceNumbering, setInvoiceNumbering] = useState(DEFAULT_POLICY.invoiceNumbering);
  const [supportEmail, setSupportEmail] = useState(DEFAULT_POLICY.supportEmail);
  const [systemIncidents, setSystemIncidents] = useState(DEFAULT_POLICY.systemIncidents);
  const [systemIncidentDowntimeMin, setSystemIncidentDowntimeMin] = useState(
    DEFAULT_POLICY.systemIncidentDowntimeMin,
  );
  const [partnerDigest, setPartnerDigest] = useState(DEFAULT_POLICY.partnerDigest);
  const [partnerDigestDay, setPartnerDigestDay] = useState(DEFAULT_POLICY.partnerDigestDay);
  const [partnerDigestTime, setPartnerDigestTime] = useState(DEFAULT_POLICY.partnerDigestTime);
  const [trialEscalation, setTrialEscalation] = useState(DEFAULT_POLICY.trialEscalation);
  const [trialEscalationLeadHours, setTrialEscalationLeadHours] = useState(
    DEFAULT_POLICY.trialEscalationLeadHours,
  );
  const [trialEscalationUsagePct, setTrialEscalationUsagePct] = useState(
    DEFAULT_POLICY.trialEscalationUsagePct,
  );
  const [lastChangeSummary, setLastChangeSummary] = useState(DEFAULT_POLICY.lastChangeSummary);
  const [lastChangeIso, setLastChangeIso] = useState(DEFAULT_POLICY.lastChangeIso);

  const [fiscalBaseline, setFiscalBaseline] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLines, setConfirmLines] = useState<string[]>([]);

  useEffect(() => {
    const s = safeLoad();
    const merged = { ...DEFAULT_POLICY, ...s };
    setTaxLabel(merged.taxLabel);
    setCgstPct(merged.cgstPct);
    setSgstPct(merged.sgstPct);
    setIgstPct(merged.igstPct);
    setRounding(merged.rounding);
    setInvoiceNumbering(merged.invoiceNumbering);
    setSupportEmail(merged.supportEmail);
    setSystemIncidents(merged.systemIncidents);
    setSystemIncidentDowntimeMin(merged.systemIncidentDowntimeMin);
    setPartnerDigest(merged.partnerDigest);
    setPartnerDigestDay(merged.partnerDigestDay);
    setPartnerDigestTime(merged.partnerDigestTime);
    setTrialEscalation(merged.trialEscalation);
    setTrialEscalationLeadHours(merged.trialEscalationLeadHours);
    setTrialEscalationUsagePct(merged.trialEscalationUsagePct);
    setLastChangeSummary(merged.lastChangeSummary);
    setLastChangeIso(merged.lastChangeIso);
    setFiscalBaseline(
      fiscalSnapshot({
        taxLabel: merged.taxLabel,
        cgstPct: merged.cgstPct,
        sgstPct: merged.sgstPct,
        igstPct: merged.igstPct,
        rounding: merged.rounding,
        invoiceNumbering: merged.invoiceNumbering,
      }),
    );
    setHydrated(true);
  }, []);

  const isGstMode = useMemo(() => /\bgst\b/i.test(taxLabel.trim()), [taxLabel]);

  const previewAmount = 12_345.67;
  const roundedPreview = applyRounding(previewAmount, rounding);
  const demoRateNote = "ECB / RBI reference (simulated) · next refresh in 42m";

  const fiscalDirty = useMemo(() => {
    if (!hydrated) return false;
    return (
      fiscalSnapshot({ taxLabel, cgstPct, sgstPct, igstPct, rounding, invoiceNumbering }) !==
      fiscalBaseline
    );
  }, [hydrated, taxLabel, cgstPct, sgstPct, igstPct, rounding, invoiceNumbering, fiscalBaseline]);

  const spfOk = useMemo(() => dnsLooksVerified(supportEmail), [supportEmail]);

  const persistAll = useCallback(
    (changeSummary: string) => {
      const payload: PolicyPersist = {
        taxLabel,
        cgstPct,
        sgstPct,
        igstPct,
        rounding,
        invoiceNumbering,
        supportEmail,
        systemIncidents,
        systemIncidentDowntimeMin,
        partnerDigest,
        partnerDigestDay,
        partnerDigestTime,
        trialEscalation,
        trialEscalationLeadHours,
        trialEscalationUsagePct,
        lastChangeSummary: changeSummary,
        lastChangeIso: new Date().toISOString(),
      };
      try {
        localStorage.setItem(POLICY_STORAGE, JSON.stringify(payload));
      } catch {
        toast.error("Could not persist to this browser.");
        return;
      }
      setLastChangeSummary(changeSummary);
      setLastChangeIso(payload.lastChangeIso);
      setFiscalBaseline(
        fiscalSnapshot({
          taxLabel,
          cgstPct,
          sgstPct,
          igstPct,
          rounding,
          invoiceNumbering,
        }),
      );
      toast.success("Global policy saved", {
        description: "Demo persistence — wire to your control plane API.",
      });
    },
    [
      taxLabel,
      cgstPct,
      sgstPct,
      igstPct,
      rounding,
      invoiceNumbering,
      supportEmail,
      systemIncidents,
      systemIncidentDowntimeMin,
      partnerDigest,
      partnerDigestDay,
      partnerDigestTime,
      trialEscalation,
      trialEscalationLeadHours,
      trialEscalationUsagePct,
    ],
  );

  function buildFiscalConfirmLines(): string[] {
    const lines: string[] = [];
    lines.push(
      "You are changing global fiscal rules. In production this would affect reporting, tax lines, and invoice math for every tenant.",
    );
    lines.push(
      `Rounding: ${roundingLabel(rounding)} — new invoices would compute from ${formatCurrency(previewAmount)} → ${formatCurrency(roundedPreview)}.`,
    );
    lines.push(`Invoice numbering pattern: ${invoiceNumbering}.`);
    lines.push(`Default tax label: ${taxLabel.trim() || "—"}.`);
    if (isGstMode) {
      lines.push(`GST split (demo rates): CGST ${cgstPct}% · SGST ${sgstPct}% · IGST ${igstPct}%.`);
    }
    return lines;
  }

  function handleSaveClick() {
    const summaryParts: string[] = [];
    if (fiscalDirty) summaryParts.push("fiscal rules");
    summaryParts.push("communications & notification matrix");
    const summary = `Updated ${summaryParts.join(" and ")}.`;

    if (fiscalDirty) {
      setConfirmLines(buildFiscalConfirmLines());
      setConfirmOpen(true);
      return;
    }
    persistAll(summary);
  }

  function handleConfirmFiscalSave() {
    setConfirmOpen(false);
    persistAll("Confirmed fiscal change (rounding, tax presets, and/or invoice numbering).");
  }

  const lastChangeHuman = useMemo(() => {
    try {
      return new Date(lastChangeIso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return lastChangeIso;
    }
  }, [lastChangeIso]);

  return (
    <div className="mx-auto grid max-w-3xl gap-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Global policy engine
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          Fiscal rules, identity &amp; escalation
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          These controls define how money is presented, how tax lines read, and how revenue risk
          reaches admins — treat changes as production-critical.
        </p>
      </div>

      <Card className="border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Global fiscal rules</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform books, tax presets, rounding, and invoice sequencing — separate from cosmetic UI
          themes.
        </p>

        <div className="mt-6 space-y-6">
          <div className="space-y-3">
            <Label htmlFor="platform-currency">Platform display currency</Label>
            <p className="text-xs text-muted-foreground">
              Applies to MRR, tenant tables, and Super Admin reports. Matches the header selector
              and is saved to this browser.
            </p>
            <div className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-2">
                <Select value={preset} onValueChange={(v) => setPreset(v as AdminCurrencyPreset)}>
                  <SelectTrigger
                    id="platform-currency"
                    className="h-10 rounded-lg border-border bg-muted/40"
                  >
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR · Indian Rupee (₹)</SelectItem>
                    <SelectItem value="USD">USD · US Dollar ($)</SelectItem>
                    <SelectItem value="EUR">EUR · Euro (€)</SelectItem>
                    <SelectItem value="GBP">GBP · Pound (£)</SelectItem>
                    <SelectItem value="AED">AED · UAE Dirham</SelectItem>
                    <SelectItem value="CUSTOM">Custom symbol…</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {preset === "CUSTOM" && (
                <div className="space-y-2 sm:w-28">
                  <Label htmlFor="currency-symbol" className="sr-only">
                    Custom symbol
                  </Label>
                  <Input
                    id="currency-symbol"
                    value={customSymbol}
                    onChange={(e) => setCustomSymbol(e.target.value)}
                    maxLength={6}
                    className="h-10 rounded-lg border-border bg-muted/40"
                    placeholder="₹"
                    aria-label="Custom currency symbol"
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Preview:{" "}
                  <span className="font-medium text-foreground">
                    {formatCurrency(previewAmount)}
                  </span>
                </p>
                <p className="max-w-xl text-[11px] leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Note:</span> Changing display
                  currency converts multi-currency roll-ups using today&apos;s reference rates for{" "}
                  <em>reporting only</em>; tenant billing contracts and gateway captures stay
                  unchanged until you issue a billing migration.
                </p>
              </div>
              <Alert className="max-w-sm border-warning/30 bg-warning/10 py-3">
                <Clock className="h-4 w-4 text-warning-foreground" />
                <AlertTitle className="text-xs font-semibold text-warning-foreground">
                  Live rate warning
                </AlertTitle>
                <AlertDescription className="text-[11px] text-warning-foreground/90">
                  {demoRateNote}
                </AlertDescription>
              </Alert>
            </div>
          </div>

          <Separator />

          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <div className="space-y-2">
              <Label htmlFor="default-tax">Default tax label</Label>
              <Input
                id="default-tax"
                value={taxLabel}
                onChange={(e) => setTaxLabel(e.target.value)}
                placeholder="GST / VAT"
                className="rounded-lg border-border bg-muted/30"
              />
              <p className="text-[11px] text-muted-foreground">
                Shown on platform invoices and tax summaries. When the label contains{" "}
                <span className="font-medium">GST</span>, the preset builder assumes India CGST /
                SGST / IGST style splits.
              </p>
            </div>
            <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-4">
              <div className="text-xs font-medium text-foreground">Tax presets builder</div>
              {isGstMode ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      CGST %
                    </Label>
                    <Input
                      inputMode="decimal"
                      value={cgstPct}
                      onChange={(e) => setCgstPct(e.target.value)}
                      className="h-9 rounded-lg font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      SGST %
                    </Label>
                    <Input
                      inputMode="decimal"
                      value={sgstPct}
                      onChange={(e) => setSgstPct(e.target.value)}
                      className="h-9 rounded-lg font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      IGST %
                    </Label>
                    <Input
                      inputMode="decimal"
                      value={igstPct}
                      onChange={(e) => setIgstPct(e.target.value)}
                      className="h-9 rounded-lg font-mono text-xs"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Enter a label containing GST to unlock CGST / SGST / IGST fields. For VAT-style
                  regimes, keep a single headline rate in your ERP books module (demo placeholder).
                </p>
              )}
            </div>
          </div>

          <Separator />

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rounding">Rounding rules</Label>
              <Select value={rounding} onValueChange={(v) => setRounding(v as RoundingMode)}>
                <SelectTrigger id="rounding" className="h-10 rounded-lg border-border bg-muted/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nearest_whole">Round to nearest whole number</SelectItem>
                  <SelectItem value="up_whole">Always round up (whole)</SelectItem>
                  <SelectItem value="down_whole">Always round down (whole)</SelectItem>
                  <SelectItem value="nearest_minor">Nearest 0.01 (minor unit)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Preview:{" "}
                <span className="font-mono text-foreground">
                  {formatCurrency(previewAmount)} → {formatCurrency(roundedPreview)}
                </span>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-seq">Invoice numbering</Label>
              <Select value={invoiceNumbering} onValueChange={setInvoiceNumbering}>
                <SelectTrigger
                  id="invoice-seq"
                  className="h-10 rounded-lg border-border bg-muted/40"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VELON-{YYYY}-{SEQ}">
                    VELON-{"{YYYY}"}-{"{SEQ}"} · fiscal year
                  </SelectItem>
                  <SelectItem value="INV-GLOBAL-{SEQ}">
                    INV-GLOBAL-{"{SEQ}"} · mono sequence
                  </SelectItem>
                  <SelectItem value="TENANT-{CODE}-{SEQ}">
                    TENANT-{"{CODE}"}-{"{SEQ}"} · per org
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Governs how platform-generated document ids advance.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Communications infrastructure</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Outbound identity for system and support messages.
        </p>
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="support-email">Outbound support sender</Label>
            <div className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                id="support-email"
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder={VELON_CONTACT_EMAIL}
                className="rounded-lg border-border bg-muted/30"
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0 rounded-lg"
                onClick={() =>
                  toast.message("Test email queued", {
                    description: `Would send from ${supportEmail || "—"} to your Super Admin inbox (demo).`,
                  })
                }
              >
                <Mail className="mr-1.5 h-4 w-4" />
                Send test email
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {spfOk ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden />
                  <span className="text-success">SPF · DKIM · DMARC aligned (demo)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-warning-foreground" aria-hidden />
                  <span className="text-warning-foreground">
                    Domain verification incomplete — publish SPF/DKIM before go-live.
                  </span>
                </>
              )}
              <Badge variant="outline" className="font-mono text-[10px]">
                DNS TTL ~300s
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Admin notification matrix</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Escalation logic instead of dumb on/off toggles alone.
        </p>

        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-border bg-muted/15 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span className="text-sm font-medium">System incidents</span>
              </div>
              <Switch
                checked={systemIncidents}
                onCheckedChange={setSystemIncidents}
                aria-label="System incidents"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Only email Super Admins when synthetic downtime exceeds the threshold (noise gate).
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Email if downtime exceeds</span>
              <Select
                value={String(systemIncidentDowntimeMin)}
                onValueChange={(v) => setSystemIncidentDowntimeMin(Number(v))}
                disabled={!systemIncidents}
              >
                <SelectTrigger className="h-9 w-[140px] rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 minute</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/15 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span className="text-sm font-medium">Partner payout digest</span>
              </div>
              <Switch
                checked={partnerDigest}
                onCheckedChange={setPartnerDigest}
                aria-label="Partner digest"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Day
                </span>
                <Select
                  value={partnerDigestDay}
                  onValueChange={setPartnerDigestDay}
                  disabled={!partnerDigest}
                >
                  <SelectTrigger className="h-9 w-[160px] rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monday">Monday</SelectItem>
                    <SelectItem value="tuesday">Tuesday</SelectItem>
                    <SelectItem value="wednesday">Wednesday</SelectItem>
                    <SelectItem value="thursday">Thursday</SelectItem>
                    <SelectItem value="friday">Friday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Time (UTC)
                </span>
                <Select
                  value={partnerDigestTime}
                  onValueChange={setPartnerDigestTime}
                  disabled={!partnerDigest}
                >
                  <SelectTrigger className="h-9 w-[120px] rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="09:00">09:00</SelectItem>
                    <SelectItem value="12:00">12:00</SelectItem>
                    <SelectItem value="17:00">17:00</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/15 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium">Trial expiry escalation</span>
              <Switch
                checked={trialEscalation}
                onCheckedChange={setTrialEscalation}
                aria-label="Trial escalation"
              />
            </div>
            <Collapsible className="group mt-3">
              <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-foreground underline-offset-4 hover:underline [&[data-state=open]>svg]:rotate-180">
                <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform" />
                Advanced conditional rule
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3 overflow-hidden text-xs text-muted-foreground data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <p>
                  Notify Super Admin{" "}
                  <span className="font-mono font-medium text-foreground">
                    {trialEscalationLeadHours}h
                  </span>{" "}
                  before an Enterprise tenant trial expires if usage exceeds{" "}
                  <span className="font-mono font-medium text-foreground">
                    {trialEscalationUsagePct}%
                  </span>{" "}
                  of entitled capacity (storage + API calls proxy in production).
                </p>
                <div className="flex flex-wrap gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider">
                      Lead time (hours)
                    </Label>
                    <Select
                      value={String(trialEscalationLeadHours)}
                      onValueChange={(v) => setTrialEscalationLeadHours(Number(v))}
                      disabled={!trialEscalation}
                    >
                      <SelectTrigger className="h-9 w-[100px] rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24">24</SelectItem>
                        <SelectItem value="48">48</SelectItem>
                        <SelectItem value="72">72</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider">Usage floor %</Label>
                    <Select
                      value={String(trialEscalationUsagePct)}
                      onValueChange={(v) => setTrialEscalationUsagePct(Number(v))}
                      disabled={!trialEscalation}
                    >
                      <SelectTrigger className="h-9 w-[100px] rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="60">60</SelectItem>
                        <SelectItem value="80">80</SelectItem>
                        <SelectItem value="90">90</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </Card>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          className="rounded-lg bg-foreground text-background hover:bg-foreground/90"
          onClick={handleSaveClick}
        >
          Save global policy
        </Button>
      </div>

      <Card className="border-dashed border-border bg-muted/20 p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Change log snapshot
        </p>
        <p className="mt-1 text-sm text-foreground">
          Last updated by <span className="font-medium">Admin S.A.</span> · {lastChangeHuman}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{lastChangeSummary}</p>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm fiscal change</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left text-sm text-muted-foreground">
                <p className="font-medium text-destructive">
                  You are changing platform-wide fiscal behavior. This can affect how invoices and
                  tax lines render from this moment forward in the control plane.
                </p>
                <ul className="list-inside list-disc space-y-1 text-xs">
                  {confirmLines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-lg" onClick={handleConfirmFiscalSave}>
              I understand — save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
