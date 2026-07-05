import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthPortalShell } from "@/components/auth/auth-portal-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiLogin, apiRequestSignupOtp, apiSignUp, apiVerifySignupOtp } from "@/lib/api/client";
import { API_V1_BASE, isApiEnabled } from "@/lib/api/config";
import { saveSession } from "@/lib/auth/session";
import { isSuperAdminEmail } from "@/lib/auth/demo-auth";
import { VELON_CONTACT_EMAIL } from "@velon/shared";
import { isPasswordStrong } from "@/lib/auth/password-policy";
import { formatApiError, loginSearch } from "@/lib/auth/login-utils";
import { redirectIfWorkspaceAuthenticated } from "@/lib/auth/route-guard";
import { bootstrapWorkspaceUser } from "@/lib/workspace/user-profile";
import { saveWorkspaceName } from "@/lib/workspace/tenant-workspace";
import { PasswordRequirementsChecklist } from "@/components/auth/password-requirements-checklist";
import {
  BusinessLocalizationFields,
  createDefaultLocalization,
  type BusinessLocalizationValue,
} from "@/components/workspace/business-localization-fields";
import { Headphones, LockKeyhole, ShieldCheck } from "lucide-react";

const INDUSTRY_OPTIONS = [
  { value: "RETAIL", label: "Retail" },
  { value: "MANUFACTURING", label: "Manufacturing" },
  { value: "DISTRIBUTION", label: "Distribution" },
  { value: "SERVICES", label: "Services" },
] as const;

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: search.tab === "signup" ? "signup" : "signin",
    reset: search.reset === "success" ? ("success" as const) : undefined,
  }),
  beforeLoad: () => {
    redirectIfWorkspaceAuthenticated();
  },
  head: () => ({
    meta: [
      { title: "Workspace Sign In · Velon-ERP" },
      {
        name: "description",
        content: "Sign in or create your company workspace on Velon-ERP.",
      },
    ],
  }),
  component: WorkspaceLoginPage,
});

const workspaceSignals = [
  {
    icon: ShieldCheck,
    title: "Verified company signup",
    desc: "Email OTP verification before your workspace is provisioned.",
  },
  {
    icon: LockKeyhole,
    title: "Tenant isolation",
    desc: "Each company workspace is isolated with role-based access.",
  },
];

function WorkspaceLoginPage() {
  const search = Route.useSearch();
  const router = useRouter();
  const useApi = isApiEnabled();

  useEffect(() => {
    if (search.reset === "success") {
      toast.success("Password successfully updated. Please sign in.");
      void router.navigate({ to: "/login", search: loginSearch(), replace: true });
    }
  }, [search.reset, router]);

  const [busy, setBusy] = useState(false);
  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [localization, setLocalization] = useState<BusinessLocalizationValue>(() =>
    createDefaultLocalization("IN"),
  );
  const [industry, setIndustry] = useState<string>(INDUSTRY_OPTIONS[0].value);
  const [fullName, setFullName] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupStep, setSignupStep] = useState<"details" | "otp">("details");
  const [signupOtp, setSignupOtp] = useState("");
  const [signupVerificationToken, setSignupVerificationToken] = useState<string | null>(null);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [apiReachable, setApiReachable] = useState<boolean | null>(null);
  const appOrigin = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    void fetch(`${API_V1_BASE}/health/live`)
      .then((r) => setApiReachable(r.ok))
      .catch(() => setApiReachable(false));
  }, []);

  function saveWorkspaceSession(
    res: {
      accessToken: string;
      refreshToken: string;
      role?: string;
      tenantId?: string;
      workspaceId?: string;
      scope?: "platform" | "tenant";
    },
    email: string,
  ) {
    saveSession({
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      route: "app",
      email,
      tenantId: res.tenantId,
      workspaceId: res.workspaceId,
      membershipRole: res.role,
      scope: res.scope ?? "tenant",
    });
  }

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (isSuperAdminEmail(signinEmail)) {
      toast.error("Platform administrators must use the Super Admin gateway.", {
        action: {
          label: "Open gateway",
          onClick: () => void router.navigate({ to: "/platform/login" }),
        },
      });
      return;
    }
    setBusy(true);
    try {
      if (!useApi) {
        toast.error("Configure VITE_API_URL — demo auth was removed in Phase 2C.");
        return;
      }
      const res = await apiLogin(signinEmail, signinPassword);
      if (res.route === "admin") {
        toast.error("Use the platform admin portal for Super Admin access.");
        return;
      }
      saveWorkspaceSession(res, signinEmail);
      bootstrapWorkspaceUser({ email: signinEmail });
      toast.success("Signed in to workspace");
      await router.navigate({ to: "/app" });
    } catch (err) {
      toast.error(formatApiError(err, "Sign in failed"));
    } finally {
      setBusy(false);
    }
  }

  async function completeSignup(verificationToken?: string) {
    try {
      if (!useApi) {
        toast.error("Configure VITE_API_URL — demo signup was removed in Phase 2C.");
        return;
      }
      if (!verificationToken) {
        toast.error("Email verification required. Complete OTP verification first.");
        return;
      }
      const res = await apiSignUp({
        companyName,
        companyEmail,
        companyPhone,
        countryCode: localization.countryCode,
        currency: localization.currency,
        timezone: localization.timezone,
        address: localization.address?.trim() ?? "",
        taxId: localization.taxId?.trim() || undefined,
        industry,
        fullName,
        password: signupPassword,
        verificationToken,
      });
      saveWorkspaceSession(res, companyEmail);
      saveWorkspaceName(companyName);
      bootstrapWorkspaceUser({ email: companyEmail, businessName: companyName, fullName });
      setSignupVerificationToken(null);
      toast.success("Workspace created — redirecting");
      await router.navigate({ to: "/app" });
    } catch (err) {
      toast.error(formatApiError(err, "Could not create workspace"));
    }
  }

  async function requestSignupOtpCode() {
    if (!companyName.trim() || !companyEmail.trim() || !fullName.trim()) {
      toast.error("Complete all required company and owner fields first.");
      return;
    }
    if (!localization.countryCode || !localization.currency) {
      toast.error("Country and currency are required.");
      return;
    }
    if (!localization.address?.trim()) {
      toast.error("Business address is required.");
      return;
    }
    if (!localization.timezone) {
      toast.error("Timezone is required.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiRequestSignupOtp(companyEmail, companyName);
      setSignupStep("otp");
      setSignupVerificationToken(null);
      setDevOtpHint(res.devCode ?? null);
      toast.success(res.delivered ? "OTP sent to your email" : "OTP generated for local testing");
    } catch (err) {
      toast.error(formatApiError(err, "Could not send OTP"));
    } finally {
      setBusy(false);
    }
  }

  async function onSignUp(e: React.FormEvent) {
    e.preventDefault();
    await requestSignupOtpCode();
  }

  async function onVerifySignupOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      let verificationToken = signupVerificationToken;
      if (!verificationToken) {
        const res = await apiVerifySignupOtp(companyEmail, signupOtp);
        verificationToken = res.verificationToken;
        setSignupVerificationToken(verificationToken);
      }
      await completeSignup(verificationToken);
    } catch (err) {
      const message = formatApiError(err, "Could not verify OTP");
      if (message.toLowerCase().includes("verification code")) {
        setSignupVerificationToken(null);
      }
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthPortalShell
      variant="workspace"
      badge="Workspace portal"
      portalLabel="Velon-ERP Workspace"
      portalTitle="Sign in to your workspace"
      headline="Your company ERP workspace."
      description="Sign in with your work email or create a new company workspace. Each email can register one company."
      signals={workspaceSignals}
      complianceIcon={ShieldCheck}
      complianceText={
        <>
          By continuing, you agree to our{" "}
          <Link to="/privacy" className="text-foreground">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link to="/terms" className="text-foreground">
            Terms of Service
          </Link>
          .
        </>
      }
    >
      {import.meta.env.DEV && apiReachable === false ? (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          API not reachable. Close extra terminals, run{" "}
          <code className="rounded bg-destructive/10 px-1 font-mono">npm run dev</code>, then use{" "}
          <a href={appOrigin || "/"} className="font-medium underline">
            {appOrigin ? appOrigin.replace(/^https?:\/\//, "") : "this app origin"}
          </a>{" "}
          only (not 8081).
        </div>
      ) : null}
      <Tabs defaultValue={search.tab}>
        <TabsList className="w-full">
          <TabsTrigger className="flex-1" value="signin">
            Sign In
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="signup">
            Create Workspace
          </TabsTrigger>
        </TabsList>
        <TabsContent value="signin" className="space-y-3 pt-4">
          <form className="space-y-3" onSubmit={onSignIn}>
            <Input
              placeholder="Email"
              type="email"
              autoComplete="email"
              value={signinEmail}
              onChange={(e) => setSigninEmail(e.target.value)}
              required
            />
            <Input
              placeholder="Password"
              type="password"
              autoComplete="current-password"
              value={signinPassword}
              onChange={(e) => setSigninPassword(e.target.value)}
              required
            />
            <Button
              type="submit"
              disabled={busy}
              className="w-full bg-foreground text-background hover:bg-foreground/90"
            >
              {busy ? "Signing in…" : "Sign In"}
            </Button>
            <div className="text-xs text-muted-foreground">
              <Link
                to="/forgot-password"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </form>
        </TabsContent>
        <TabsContent value="signup" className="space-y-3 pt-4">
          {signupStep === "details" ? (
            <form className="space-y-3" onSubmit={onSignUp}>
              <Input
                placeholder="Company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
              <Input
                placeholder="Company email"
                type="email"
                autoComplete="email"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                required
              />
              <Input
                placeholder="Company phone"
                type="tel"
                autoComplete="tel"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                required
              />
              <BusinessLocalizationFields
                value={localization}
                onChange={setLocalization}
                showAddress
                showTaxId
                showFormats={false}
                idPrefix="signup"
              />
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Your full name"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <Input
                placeholder="Password (minimum 8 characters)"
                type="password"
                autoComplete="new-password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                required
              />
              <PasswordRequirementsChecklist password={signupPassword} />
              <Button
                type="submit"
                disabled={busy || !isPasswordStrong(signupPassword)}
                className="w-full bg-foreground text-background hover:bg-foreground/90"
              >
                {busy ? "Sending OTP…" : "Verify email & continue"}
              </Button>
              <p className="text-xs leading-relaxed text-muted-foreground">
                We verify your company email before creating the workspace. You become the Tenant
                Super Admin for your company.
              </p>
            </form>
          ) : (
            <form className="space-y-3" onSubmit={onVerifySignupOtp}>
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                Enter the 6-digit code sent to{" "}
                <span className="font-medium text-foreground">{companyEmail}</span>.
                {devOtpHint ? (
                  <span className="mt-1 block font-mono text-foreground">
                    Local dev OTP: {devOtpHint}
                  </span>
                ) : null}
              </div>
              <Input
                placeholder="6-digit OTP"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={signupOtp}
                onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
              />
              <Button
                type="submit"
                disabled={busy || signupOtp.length !== 6}
                className="w-full bg-foreground text-background hover:bg-foreground/90"
              >
                {busy ? "Creating workspace…" : "Verify OTP & create workspace"}
              </Button>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <button
                  type="button"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                  onClick={() => {
                    setSignupStep("details");
                    setSignupOtp("");
                    setSignupVerificationToken(null);
                    setDevOtpHint(null);
                  }}
                >
                  Edit details
                </button>
                <button
                  type="button"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                  onClick={requestSignupOtpCode}
                  disabled={busy}
                >
                  Resend OTP
                </button>
              </div>
            </form>
          )}
        </TabsContent>
      </Tabs>
      <div className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Headphones className="h-3.5 w-3.5" /> {VELON_CONTACT_EMAIL}
        </span>
      </div>
    </AuthPortalShell>
  );
}
