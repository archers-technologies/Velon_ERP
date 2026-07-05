import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import {
  WorkspaceProfileIdentityPanel,
  WorkspaceSecurityPanel,
} from "@/components/settings/workspace-profile-panels";
import { SettingsWorkspaceShortcuts } from "@/components/settings/settings-workspace-shortcuts";
import { toast } from "sonner";
import {
  useWorkspaceCurrency,
  type WorkspaceCurrencyPreset,
} from "@/contexts/workspace-currency";
import { apiFetch } from "@/lib/api/client";
import { updateCompanyProfile, updateWorkspaceSettings } from "@/lib/tenants/admin-api";
import {
  BusinessLocalizationFields,
  createDefaultLocalization,
  type BusinessLocalizationValue,
} from "@/components/workspace/business-localization-fields";
import { getCountryByCode, getCurrencySymbol } from "@velon/shared";
import { useWorkspacePreferences } from "@/contexts/workspace-preferences";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSessionMembershipRole } from "@/lib/auth/session";
import { normalizeVelonRole, parseSettingsUserTab, VelonRole } from "@velon/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getPrinterSettings,
  RECEIPT_FORMAT_OPTIONS,
  saveAutoPrintOnCharge,
  saveReceiptFormat,
  type ReceiptFormat,
} from "@/lib/shared/printer-settings";
import { printInvoiceDocument } from "@/lib/sales/invoicing/print-invoice";
import { loadInvoiceCompanyProfile } from "@/lib/sales/invoicing/workspace-profile";
import { Printer } from "lucide-react";

const settingsTabs = ["general", "regional", "printers", "profile", "security"] as const;
type SettingsTab = (typeof settingsTabs)[number];

export const Route = createFileRoute("/app/settings/")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: parseSettingsUserTab(search.tab),
  }),
  component: SettingsPage,
});

type RegionalFormDraft = BusinessLocalizationValue;

function isWorkspaceCurrencyPreset(code: string): code is Exclude<WorkspaceCurrencyPreset, "CUSTOM"> {
  return (
    code === "INR" ||
    code === "USD" ||
    code === "EUR" ||
    code === "GBP" ||
    code === "AED" ||
    code === "SAR" ||
    code === "BHD" ||
    code === "OMR" ||
    code === "QAR" ||
    code === "KWD"
  );
}

function SettingsPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { tab: tabFromUrl } = Route.useSearch();
  const {
    theme,
    setTheme,
    lowStockEmailAlerts,
    setLowStockEmailAlerts,
    dailySummaryReport,
    setDailySummaryReport,
    resetToFactoryDefaults,
  } = useWorkspacePreferences();
  const { setPreset } = useWorkspaceCurrency();
  const membershipRole = normalizeVelonRole(getSessionMembershipRole() ?? VelonRole.USER);
  const isWorkspaceOwner = membershipRole === VelonRole.TENANT_OWNER;
  const isOwner = isWorkspaceOwner || membershipRole === VelonRole.TENANT_ADMIN;
  const [resetOpen, setResetOpen] = useState(false);
  const [tab, setTab] = useState<SettingsTab>(tabFromUrl);
  const [receiptFormat, setReceiptFormat] = useState<ReceiptFormat>(() =>
    getPrinterSettings().receiptFormat,
  );
  const [autoPrintOnCharge, setAutoPrintOnCharge] = useState(() =>
    getPrinterSettings().autoPrintOnCharge,
  );
  const [printerTestBusy, setPrinterTestBusy] = useState(false);

  useEffect(() => {
    setTab(tabFromUrl);
  }, [tabFromUrl]);

  useEffect(() => {
    if (tabFromUrl === "printers") {
      const s = getPrinterSettings();
      setReceiptFormat(s.receiptFormat);
      setAutoPrintOnCharge(s.autoPrintOnCharge);
    }
  }, [tabFromUrl]);
  const [regionalDraft, setRegionalDraft] = useState<RegionalFormDraft | null>(null);
  const [regionalSaving, setRegionalSaving] = useState(false);

  const snapshotRegional = useCallback((): RegionalFormDraft => createDefaultLocalization(), []);

  function handleTabChange(next: string) {
    const safe = settingsTabs.includes(next as SettingsTab) ? (next as SettingsTab) : "general";
    if (safe === "regional") {
      const base = createDefaultLocalization();
      setRegionalDraft(base);
      void apiFetch<{
        workspace: {
          countryCode: string;
          currency: string;
          timezone: string;
          dateFormat: string;
          numberFormat: string;
        };
        companyProfile: { address: string | null; taxId: string | null } | null;
      }>("/workspace/context")
        .then((ctx) => {
          setRegionalDraft({
            countryCode: ctx.workspace.countryCode,
            currency: ctx.workspace.currency,
            timezone: ctx.workspace.timezone,
            dateFormat: ctx.workspace.dateFormat,
            numberFormat: ctx.workspace.numberFormat,
            address: ctx.companyProfile?.address ?? "",
            taxId: ctx.companyProfile?.taxId ?? "",
          });
        })
        .catch(() => {
          /* keep defaults */
        });
    }
    setTab(safe);
    void navigate({ to: "/app/settings", search: { tab: safe }, replace: true });
  }

  const effectiveRegional = regionalDraft ?? snapshotRegional();

  const regionalDirty = useMemo(() => {
    if (!regionalDraft) return false;
    return true;
  }, [regionalDraft]);

  async function saveRegional() {
    const e = effectiveRegional;
    if (!e.countryCode?.trim()) {
      toast.error("Country is required");
      return;
    }
    if (!e.currency?.trim()) {
      toast.error("Currency is required");
      return;
    }
    if (!e.timezone?.trim()) {
      toast.error("Timezone is required");
      return;
    }
    setRegionalSaving(true);
    try {
      if (isOwner) {
        const symbol = getCurrencySymbol(e.currency);
        await updateWorkspaceSettings({
          countryCode: e.countryCode.trim().toUpperCase(),
          currency: e.currency.trim().toUpperCase(),
          currencySymbol: symbol,
          timezone: e.timezone,
          dateFormat: e.dateFormat,
          numberFormat: e.numberFormat,
        });
        await updateCompanyProfile({
          address: e.address?.trim() || undefined,
          taxId: e.taxId?.trim() || undefined,
          country: getCountryByCode(e.countryCode)?.label ?? e.countryCode,
        });
        if (isWorkspaceCurrencyPreset(e.currency)) {
          setPreset(e.currency);
        }
        void router.invalidate();
      }
      setRegionalDraft({ ...e });
      toast.success(
        isOwner ? "Business localization saved to workspace" : "Regional preferences saved",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save business localization");
    } finally {
      setRegionalSaving(false);
    }
  }

  function handleReceiptFormatChange(format: ReceiptFormat) {
    setReceiptFormat(format);
    saveReceiptFormat(format);
    toast.success("Printer format saved");
  }

  function handleAutoPrintChange(enabled: boolean) {
    setAutoPrintOnCharge(enabled);
    saveAutoPrintOnCharge(enabled);
    toast.success(enabled ? "Auto-print enabled on charge" : "Auto-print disabled");
  }

  async function runTestPrint() {
    if (receiptFormat === "none") {
      toast.error("Select a receipt format other than Disabled to test print.");
      return;
    }
    setPrinterTestBusy(true);
    try {
      const company = await loadInvoiceCompanyProfile();
      await printInvoiceDocument(
        {
          invoiceNumber: `TEST-${Date.now().toString(36).toUpperCase()}`,
          invoiceDate: new Date().toISOString().slice(0, 10),
          customerName: "Walk-in customer",
          lines: [
            { name: "Sample product", quantity: 1, unitPrice: 100 },
            { name: "Sample service", quantity: 2, unitPrice: 50 },
          ],
          currency: "INR",
          company,
          paymentStatus: "paid",
        },
        receiptFormat,
      );
      toast.success("Test print preview opened.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test print failed");
    } finally {
      setPrinterTestBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SettingsWorkspaceShortcuts />
      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap gap-1 rounded-lg bg-muted/60 p-1 sm:w-auto">
          <TabsTrigger value="general" className="rounded-md text-xs sm:text-sm">
            General
          </TabsTrigger>
          <TabsTrigger value="regional" className="rounded-md text-xs sm:text-sm">
            Business localization
          </TabsTrigger>
          <TabsTrigger value="printers" className="rounded-md text-xs sm:text-sm">
            Printers
          </TabsTrigger>
          <TabsTrigger value="profile" className="rounded-md text-xs sm:text-sm">
            My profile
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-md text-xs sm:text-sm">
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6 outline-none">
          <Card className="border-border bg-card p-6">
            <h2 className="text-lg font-semibold">General preferences</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Notifications, appearance, and defaults for this workspace — no IT ticket required.
            </p>
            <Separator className="my-5" />
            <div className="space-y-5 text-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">Enable low stock email alerts</div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Notify buyers when SKUs cross reorder thresholds.
                  </p>
                </div>
                <Switch
                  checked={lowStockEmailAlerts}
                  onCheckedChange={setLowStockEmailAlerts}
                  aria-label="Low stock email alerts"
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">Enable daily summary report</div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Morning roll-up of sales, dues, and exceptions.
                  </p>
                </div>
                <Switch
                  checked={dailySummaryReport}
                  onCheckedChange={setDailySummaryReport}
                  aria-label="Daily summary report"
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">Dark mode</div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Reduces glare for long sessions; matches the header toggle.
                  </p>
                </div>
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={(on) => setTheme(on ? "dark" : "light")}
                  aria-label="Dark mode"
                />
              </div>
              <Separator />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Restore factory defaults for currency, region, theme, and notification toggles.
                  The page will reload.
                </p>
                <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 rounded-lg"
                    >
                      Reset to defaults
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset all workspace settings?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This clears saved preferences including display currency, location, theme,
                        and notification switches, then reloads the app.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => {
                          setResetOpen(false);
                          toast.info("Resetting workspace…");
                          resetToFactoryDefaults();
                        }}
                      >
                        Reset everything
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="regional" className="mt-6 outline-none">
          <Card className="border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Business localization</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Country, currency, and regional formats used across invoices, quotations, dashboards,
              and billing. Workspace owners save these settings to PostgreSQL for the whole team.
            </p>
            <Separator className="my-5" />
            <div className="space-y-5">
              <BusinessLocalizationFields
                value={effectiveRegional}
                onChange={(next) => setRegionalDraft(next)}
                showAddress
                showTaxId
                idPrefix="ws-localization"
              />
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  disabled={!regionalDirty}
                  onClick={() => setRegionalDraft(null)}
                >
                  Discard changes
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-lg bg-foreground text-background hover:bg-foreground/90"
                  disabled={!regionalDirty || regionalSaving}
                  onClick={() => void saveRegional()}
                >
                  {regionalSaving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="printers" className="mt-6 outline-none">
          <Card className="border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Printer settings</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Configure how Billing &amp; POS prints receipts after a sale. Format applies workspace-wide
              for this browser.
            </p>
            <Separator className="my-5" />
            <div className="space-y-5 text-sm">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Default receipt format</Label>
                <Select value={receiptFormat} onValueChange={(v) => handleReceiptFormatChange(v as ReceiptFormat)}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECEIPT_FORMAT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {RECEIPT_FORMAT_OPTIONS.find((o) => o.value === receiptFormat)?.description}
                </p>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">Auto-print after charge</div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Open print preview automatically when a cash/card sale is captured.
                  </p>
                </div>
                <Switch
                  checked={autoPrintOnCharge}
                  onCheckedChange={handleAutoPrintChange}
                  disabled={receiptFormat === "none"}
                  aria-label="Auto-print after charge"
                />
              </div>
              <Separator />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Send a sample receipt to verify layout before going live on the POS floor.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  disabled={printerTestBusy || receiptFormat === "none"}
                  onClick={() => void runTestPrint()}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Test print
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="mt-6 outline-none">
          <WorkspaceProfileIdentityPanel />
        </TabsContent>

        <TabsContent value="security" className="mt-6 outline-none">
          <WorkspaceSecurityPanel canDeleteWorkspace={isWorkspaceOwner} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
