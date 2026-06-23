import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TenantStatusPill } from "@/components/tenant-status-pill";
import type { TenantStatus } from "@/lib/admin-demo";
import { getSessionMembershipRole } from "@/lib/auth/session";
import { formatApiError } from "@/lib/auth/login-utils";
import { normalizeVelonRole, canManageWorkspaceBilling, parseSettingsUserTab, settingsBillingSearch, VelonRole } from "@velon/shared";
import { SettingsWorkspaceShortcuts } from "@/components/settings/settings-workspace-shortcuts";
import {
  cancelTenantSubscription,
  changeTenantSubscriptionPlan,
  loadBillingAccess,
  loadBillingPaymentConfig,
  loadBillingPlans,
  loadTenantInvoices,
  loadTenantPayments,
  loadTenantSubscription,
  resumeTenantSubscription,
  startBillingCheckout,
  verifyRazorpayPayment,
  type BillingPaymentConfig,
  type SubscriptionInvoiceView,
  type SubscriptionPaymentView,
  type TenantSubscriptionView,
} from "@/lib/api/subscription-billing";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";
import { CreditCard, ArrowLeft, RefreshCw, Landmark, IndianRupee } from "lucide-react";

export const Route = createFileRoute("/app/settings/billing")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: parseSettingsUserTab(search.tab),
  }),
  loader: async () => {
    const [subscription, invoices, payments, access, plans, paymentConfig] = await Promise.all([
      loadTenantSubscription(),
      loadTenantInvoices(),
      loadTenantPayments(),
      loadBillingAccess(),
      loadBillingPlans(),
      loadBillingPaymentConfig(),
    ]);
    return { subscription, invoices, payments, access, plans, paymentConfig };
  },
  component: BillingPortalPage,
});

type PlanId = "STARTER" | "GROWTH" | "ENTERPRISE";

function BillingPortalPage() {
  const initial = Route.useLoaderData();
  const [subscription, setSubscription] = useState(initial.subscription);
  const [invoices, setInvoices] = useState(initial.invoices);
  const [payments, setPayments] = useState(initial.payments);
  const [access] = useState(initial.access);
  const [plans] = useState(initial.plans);
  const [paymentConfig] = useState<BillingPaymentConfig>(initial.paymentConfig);
  const [busy, setBusy] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(subscription.plan as PlanId);
  const [interval, setInterval] = useState<"MONTHLY" | "YEARLY">(subscription.billingInterval);
  const role = normalizeVelonRole(getSessionMembershipRole() ?? VelonRole.USER);
  const canAccessBilling = canManageWorkspaceBilling(role);
  const isOwner = role === VelonRole.TENANT_OWNER;

  if (!canAccessBilling) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <Card className="border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Tenant Owner or Tenant Admin access is required to view subscription and billing.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/app/settings" search={{ tab: "general" }}>
              Back to settings
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  const pendingPayment = payments.find((p) => p.status === "PENDING");
  const pendingBankTransfer =
    pendingPayment?.provider === "BANK_TRANSFER" ? pendingPayment : undefined;
  const razorpayEnabled = paymentConfig.razorpay.enabled && Boolean(paymentConfig.razorpay.keyId);
  const selectedPlanMeta = plans.find((p) => p.id === selectedPlan);

  const refresh = async () => {
    const [sub, inv, pay] = await Promise.all([
      loadTenantSubscription(),
      loadTenantInvoices(),
      loadTenantPayments(),
    ]);
    setSubscription(sub);
    setInvoices(inv);
    setPayments(pay);
  };

  const onChangePlan = async () => {
    if (!isOwner) return;
    setBusy(true);
    try {
      await changeTenantSubscriptionPlan(selectedPlan, interval);
      await refresh();
      toast.success("Plan updated");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const onRequestManualPayment = async () => {
    if (!isOwner) return;
    setBusy(true);
    try {
      const result = await startBillingCheckout({
        plan: selectedPlan,
        billingInterval: interval,
        provider: "BANK_TRANSFER",
        idempotencyKey: crypto.randomUUID(),
      });
      const instructions =
        result.session.instructions ??
        "Bank transfer request created. Include your workspace code in the payment reference.";
      toast.success(instructions);
      await refresh();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const onPayWithRazorpay = async () => {
    if (!isOwner || !razorpayEnabled) return;
    setBusy(true);
    try {
      const result = await startBillingCheckout({
        plan: selectedPlan,
        billingInterval: interval,
        provider: "RAZORPAY",
        idempotencyKey: crypto.randomUUID(),
      });
      const checkout = result.razorpay ?? result.session.razorpay;
      if (!checkout?.keyId || !checkout.orderId) {
        throw new Error("Razorpay checkout is not available");
      }

      await openRazorpayCheckout({
        keyId: checkout.keyId,
        orderId: checkout.orderId,
        amount: checkout.amount,
        currency: checkout.currency,
        planLabel: selectedPlanMeta?.displayName ?? selectedPlan,
        onDismiss: () => {
          toast.message("Payment cancelled");
          setBusy(false);
        },
        onSuccess: async (response) => {
          try {
            await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await refresh();
            toast.success("Payment verified — subscription activated");
          } catch (err) {
            toast.error(formatApiError(err));
          } finally {
            setBusy(false);
          }
        },
      });
    } catch (err) {
      toast.error(formatApiError(err));
      setBusy(false);
    }
  };

  const onCancel = async () => {
    if (!isOwner) return;
    setBusy(true);
    try {
      await cancelTenantSubscription();
      await refresh();
      toast.success("Subscription will cancel at period end");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const onResume = async () => {
    if (!isOwner) return;
    setBusy(true);
    try {
      await resumeTenantSubscription();
      await refresh();
      toast.success("Subscription resumed");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            to="/app/settings"
            search={{ tab: "general" }}
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Settings
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Subscription & Billing</h1>
          <p className="text-sm text-muted-foreground">
            Manage your Velon ERP plan, invoices, and payment history.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={busy}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <SettingsWorkspaceShortcuts />

      <Card className="border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">Bank transfer billing is always available.</strong>
          {razorpayEnabled
            ? " Pay online with Razorpay (cards, UPI, netbanking) or request a manual bank transfer below."
            : " Online payment gateways are disabled until configured by platform administration. Request a bank transfer below; a platform admin will approve your payment and activate your subscription."}
        </p>
      </Card>

      {!access.allowsWorkspace && (
        <Card className="border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          ERP access is restricted until your subscription is active. Submit a manual payment
          request below and wait for platform approval.
        </Card>
      )}

      {pendingBankTransfer ? (
        <Card className="border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium text-foreground">Payment pending approval</p>
          <p className="mt-1 text-muted-foreground">
            Your bank transfer request ({pendingBankTransfer.currency === "INR" ? "₹" : "$"}
            {pendingBankTransfer.amount}) is awaiting platform admin review. You will regain full
            access once it is approved.
          </p>
        </Card>
      ) : null}

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Current plan</p>
            <h2 className="text-xl font-semibold">{subscription.planDisplayName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              ${subscription.mrr}/mo · Renews {subscription.currentPeriodEnd}
              {subscription.trialEndsAt ? ` · Trial ends ${subscription.trialEndsAt}` : ""}
            </p>
            {subscription.seatLimit != null ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Seat limit: {subscription.seatLimit} users
              </p>
            ) : null}
          </div>
          <TenantStatusPill status={mapBillingStatus(subscription.status)} />
        </div>
        {subscription.cancelAtPeriodEnd && (
          <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">
            Cancellation scheduled at period end.
          </p>
        )}
      </Card>

      {isOwner && (
        <Card className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <h3 className="font-semibold">Change plan &amp; request payment</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Plan</p>
              <Select value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as PlanId)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.displayName} — ${p.monthlyPrice}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Billing interval</p>
              <Select value={interval} onValueChange={(v) => setInterval(v as "MONTHLY" | "YEARLY")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="YEARLY">Yearly (2 months free)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void onChangePlan()} disabled={busy}>
              Save plan selection
            </Button>
            <Button
              variant="outline"
              onClick={() => void onRequestManualPayment()}
              disabled={busy || Boolean(pendingPayment)}
            >
              <Landmark className="mr-2 h-4 w-4" />
              Request bank transfer payment
            </Button>
            {razorpayEnabled ? (
              <Button
                variant="default"
                onClick={() => void onPayWithRazorpay()}
                disabled={busy || Boolean(pendingPayment)}
              >
                <IndianRupee className="mr-2 h-4 w-4" />
                Pay with Razorpay
              </Button>
            ) : null}
            {subscription.cancelAtPeriodEnd ? (
              <Button variant="secondary" onClick={() => void onResume()} disabled={busy}>
                Resume subscription
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => void onCancel()} disabled={busy}>
                Cancel at period end
              </Button>
            )}
          </div>
          {pendingPayment ? (
            <p className="text-xs text-muted-foreground">
              A payment is already pending review. Wait for approval before submitting another request.
            </p>
          ) : null}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <InvoiceTable title="Invoices" rows={invoices} />
        <PaymentTable title="Payment history" rows={payments} />
      </div>
    </div>
  );
}

function mapBillingStatus(status: string): TenantStatus {
  switch (status) {
    case "TRIAL":
      return "Trial";
    case "ACTIVE":
      return "Active";
    case "PAST_DUE":
      return "Past due";
    case "SUSPENDED":
    case "CANCELLED":
      return "Suspended";
    default:
      return "Active";
  }
}

function InvoiceTable({ title, rows }: { title: string; rows: SubscriptionInvoiceView[] }) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invoices yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{row.invoiceNumber}</p>
                <p className="text-muted-foreground">
                  {row.periodStart} → {row.periodEnd}
                </p>
              </div>
              <div className="text-right">
                <p>
                  {row.currency === "INR" ? "₹" : "$"}
                  {row.amount}
                </p>
                <Badge variant="outline">{row.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function PaymentTable({ title, rows }: { title: string; rows: SubscriptionPaymentView[] }) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payments yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{formatProvider(row.provider)}</p>
                <p className="text-muted-foreground">{new Date(row.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p>
                  {row.currency === "INR" ? "₹" : "$"}
                  {row.amount}
                </p>
                <Badge variant="outline">{row.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function formatProvider(provider: string) {
  if (provider === "BANK_TRANSFER") return "Bank transfer";
  if (provider === "RAZORPAY") return "Razorpay";
  return provider.replace(/_/g, " ");
}
