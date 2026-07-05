import { Logger } from "@nestjs/common";

export type TransactionalMail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type MailProvider = "resend" | "smtp" | "none";

export type SmtpConfigSummary = {
  hostPresent: boolean;
  portPresent: boolean;
  port: number;
  secure: boolean;
  userPresent: boolean;
  passwordPresent: boolean;
  fromPresent: boolean;
};

export type SmtpSendFailureDetail = {
  category:
    | "auth_failed"
    | "connection_timeout"
    | "tls_mismatch"
    | "sender_rejected"
    | "host_unreachable"
    | "unknown";
  code?: string;
  command?: string;
  responseCode?: number;
  message: string;
};

export type ResendSendFailureDetail = {
  statusCode: number;
  body: string;
  message: string;
};

const log = new Logger("MailDelivery");

const NON_DELIVERABLE_SUFFIXES = [".test", ".invalid", ".example", ".localhost"] as const;
const NON_DELIVERABLE_DOMAINS = new Set(["example.com", "example.org", "example.net"]);

/** RFC 2606 / test-only domains must never hit real mail providers. */
export function isNonDeliverableEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at < 1) return true;
  const domain = normalized.slice(at + 1);
  if (NON_DELIVERABLE_DOMAINS.has(domain)) return true;
  return NON_DELIVERABLE_SUFFIXES.some((suffix) => domain.endsWith(suffix));
}

export function getSmtpPassword(): string | undefined {
  const pass = process.env.SMTP_PASS?.trim() || process.env.SMTP_PASSWORD?.trim();
  return pass || undefined;
}

export function parseSmtpSecure(raw = process.env.SMTP_SECURE): boolean {
  return String(raw ?? "false").trim().toLowerCase() === "true";
}

export function parseSmtpPort(raw = process.env.SMTP_PORT): number {
  const port = Number.parseInt(String(raw ?? "587"), 10);
  return Number.isFinite(port) ? port : 587;
}

export function getSmtpConfigSummary(): SmtpConfigSummary {
  const { port, secure } = resolveSmtpPortAndSecure();
  return {
    hostPresent: Boolean(process.env.SMTP_HOST?.trim()),
    portPresent: Boolean(process.env.SMTP_PORT?.trim()),
    port,
    secure,
    userPresent: Boolean(process.env.SMTP_USER?.trim()),
    passwordPresent: Boolean(getSmtpPassword()),
    fromPresent: Boolean(process.env.SMTP_FROM?.trim()),
  };
}

export function formatSmtpConfigForLog(): string {
  const s = getSmtpConfigSummary();
  return [
    "SMTP config:",
    `- host present: ${s.hostPresent ? "yes" : "no"}`,
    `- port present: ${s.portPresent ? "yes" : "no"} (resolved: ${s.port})`,
    `- secure value: ${s.secure}`,
    `- user present: ${s.userPresent ? "yes" : "no"}`,
    `- password present: ${s.passwordPresent ? "yes" : "no"}`,
    `- from present: ${s.fromPresent ? "yes" : "no"}`,
  ].join("\n");
}

export function smtpConfigured(): boolean {
  const summary = getSmtpConfigSummary();
  return (
    summary.hostPresent &&
    summary.userPresent &&
    summary.passwordPresent &&
    summary.fromPresent
  );
}

export function resendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM?.trim());
}

export function resolveMailProvider(): MailProvider {
  const explicit = process.env.MAIL_PROVIDER?.trim().toLowerCase();

  if (explicit === "smtp") {
    return smtpConfigured() ? "smtp" : "none";
  }
  if (explicit === "resend") {
    return resendConfigured() ? "resend" : "none";
  }

  if (resendConfigured()) return "resend";
  if (smtpConfigured()) return "smtp";
  return "none";
}

export function formatMailProviderForLog(): string {
  const provider = resolveMailProvider();
  const lines = [
    `Mail provider: ${provider}`,
    `- RESEND_API_KEY present: ${Boolean(process.env.RESEND_API_KEY?.trim()) ? "yes" : "no"}`,
    `- RESEND_FROM present: ${Boolean(process.env.RESEND_FROM?.trim()) ? "yes" : "no"}`,
    `- MAIL_PROVIDER: ${process.env.MAIL_PROVIDER?.trim() || "(default)"}`,
  ];
  if (provider === "resend" && smtpConfigured()) {
    lines.push("- SMTP disabled (Resend is primary)");
  }
  return lines.join("\n");
}

export function shouldSendViaSmtp(to: string): boolean {
  if (process.env.NODE_ENV === "test") return false;
  if (isNonDeliverableEmail(to)) return false;
  return resolveMailProvider() === "smtp";
}

export function shouldSendViaResend(to: string): boolean {
  if (process.env.NODE_ENV === "test") return false;
  if (isNonDeliverableEmail(to)) return false;
  return resolveMailProvider() === "resend";
}

function smtpTransportOptions(override?: { port: number; secure: boolean }) {
  const resolved = override ?? resolveSmtpPortAndSecure();
  const { port, secure } = resolved;
  return {
    host: process.env.SMTP_HOST!.trim(),
    port,
    secure,
    requireTLS: !secure && port === 587,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 12_000,
    auth: {
      user: process.env.SMTP_USER!.trim(),
      pass: getSmtpPassword()!,
    },
  };
}

/** Hostinger: 465 = implicit TLS, 587 = STARTTLS. Auto-correct mismatched SMTP_SECURE. */
export function resolveSmtpPortAndSecure(): { port: number; secure: boolean } {
  const port = parseSmtpPort();
  if (port === 465) return { port, secure: true };
  if (port === 587) return { port, secure: false };
  return { port, secure: parseSmtpSecure() };
}

const SMTP_RETRY_CATEGORIES = new Set<SmtpSendFailureDetail["category"]>([
  "connection_timeout",
  "tls_mismatch",
  "host_unreachable",
  "unknown",
]);

export async function deliverViaSmtp(
  input: TransactionalMail,
  override?: { port: number; secure: boolean },
): Promise<void> {
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport(smtpTransportOptions(override));
  await withSmtpTimeout(
    transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
    12_000,
  );
}

export async function deliverViaResend(input: TransactionalMail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) {
    throw new Error("resend_not_configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (response.ok) return;

  const body = await response.text();
  const detail = parseResendSendFailure(response.status, body);
  log.error(
    [
      "Resend API request failed",
      `- HTTP status: ${detail.statusCode}`,
      `- response body: ${detail.body}`,
      `- message: ${detail.message}`,
    ].join("\n"),
  );
  throw new Error(`resend_send_failed:${JSON.stringify(detail)}`);
}

export function parseResendSendFailure(statusCode: number, body: string): ResendSendFailureDetail {
  let message = `Resend API request failed with HTTP ${statusCode}`;
  try {
    const json = JSON.parse(body) as
      | { message?: string; error?: { message?: string } }
      | undefined;
    const parsed = json?.message ?? json?.error?.message;
    if (parsed) message = parsed;
  } catch {
    /* keep default message */
  }
  return { statusCode, body, message };
}

function sanitizeSmtpErrorMessage(message: string): string {
  return message
    .replace(/(?:pass(word)?|auth(?:entication)?)[^\s]*/gi, "[redacted]")
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[email]");
}

export function classifySmtpSendError(err: unknown): SmtpSendFailureDetail {
  const e = err as {
    code?: string;
    command?: string;
    responseCode?: number;
    message?: string;
  };
  const message = sanitizeSmtpErrorMessage(String(e?.message ?? err));
  const code = e?.code;
  const lower = message.toLowerCase();

  if (code === "EAUTH" || code === "EENVELOPE" || lower.includes("authentication")) {
    return {
      category: "auth_failed",
      code,
      command: e?.command,
      responseCode: e?.responseCode,
      message,
    };
  }
  if (code === "ETIMEDOUT" || code === "ESOCKET" || lower.includes("timeout")) {
    return {
      category: "connection_timeout",
      code,
      command: e?.command,
      responseCode: e?.responseCode,
      message,
    };
  }
  if (
    lower.includes("tls") ||
    lower.includes("ssl") ||
    lower.includes("wrong version number") ||
    lower.includes("certificate")
  ) {
    return {
      category: "tls_mismatch",
      code,
      command: e?.command,
      responseCode: e?.responseCode,
      message,
    };
  }
  if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "EHOSTUNREACH") {
    return {
      category: "host_unreachable",
      code,
      command: e?.command,
      responseCode: e?.responseCode,
      message,
    };
  }
  if (e?.responseCode === 550 || e?.responseCode === 553 || lower.includes("rejected")) {
    return {
      category: "sender_rejected",
      code,
      command: e?.command,
      responseCode: e?.responseCode,
      message,
    };
  }
  return {
    category: "unknown",
    code,
    command: e?.command,
    responseCode: e?.responseCode,
    message,
  };
}

export function formatSmtpSendErrorForLog(err: unknown): string {
  const detail = classifySmtpSendError(err);
  return [
    `SMTP send failed [${detail.category}]`,
    detail.code ? `- code: ${detail.code}` : null,
    detail.command ? `- command: ${detail.command}` : null,
    detail.responseCode ? `- responseCode: ${detail.responseCode}` : null,
    `- message: ${detail.message}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function withSmtpTimeout<T>(promise: Promise<T>, ms = 15_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("smtp_timeout")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function skippedReasonForProvider(provider: MailProvider): string {
  if (provider === "none") {
    if (resendConfigured() || process.env.MAIL_PROVIDER?.trim().toLowerCase() === "resend") {
      return "resend_not_configured";
    }
    return "smtp_not_configured";
  }
  return "mail_not_configured";
}

export async function sendTransactionalMail(
  input: TransactionalMail,
): Promise<{
  delivered: boolean;
  skippedReason?: string;
  failureDetail?: SmtpSendFailureDetail;
  resendFailureDetail?: ResendSendFailureDetail;
}> {
  const isTestEnv = process.env.NODE_ENV === "test";
  const nonDeliverable = isNonDeliverableEmail(input.to);

  if (isTestEnv || nonDeliverable) {
    const reason = isTestEnv ? "test_environment" : "non_deliverable_recipient";
    return { delivered: false, skippedReason: reason };
  }

  const provider = resolveMailProvider();

  if (provider === "resend") {
    log.log("Using Resend");
    if (smtpConfigured()) {
      log.log("SMTP disabled");
    }
    try {
      await deliverViaResend(input);
      return { delivered: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.startsWith("resend_send_failed:")) {
        try {
          const detail = JSON.parse(message.slice("resend_send_failed:".length)) as ResendSendFailureDetail;
          return {
            delivered: false,
            skippedReason: "resend_send_failed",
            resendFailureDetail: detail,
          };
        } catch {
          return { delivered: false, skippedReason: "resend_send_failed" };
        }
      }
      return { delivered: false, skippedReason: "resend_send_failed" };
    }
  }

  if (provider === "smtp") {
    log.log("Using SMTP");
    return sendViaSmtp(input);
  }

  log.log(
    resendConfigured() || process.env.RESEND_API_KEY?.trim()
      ? "Resend not fully configured (missing RESEND_API_KEY or RESEND_FROM)"
      : "No mail provider configured",
  );
  if (smtpConfigured() && !resendConfigured()) {
    log.log("SMTP disabled (incomplete SMTP credentials)");
  }
  return { delivered: false, skippedReason: skippedReasonForProvider(provider) };
}

async function sendViaSmtp(
  input: TransactionalMail,
): Promise<{
  delivered: boolean;
  skippedReason?: string;
  failureDetail?: SmtpSendFailureDetail;
}> {
  const primary = resolveSmtpPortAndSecure();

  try {
    await deliverViaSmtp(input);
    return { delivered: true };
  } catch (err) {
    const message = String(err);
    const primaryFailure =
      message.includes("smtp_timeout")
        ? ({
            category: "connection_timeout" as const,
            message: "SMTP connection timed out",
          } satisfies SmtpSendFailureDetail)
        : classifySmtpSendError(err);

    const shouldRetryOn587 =
      primary.port !== 587 &&
      (SMTP_RETRY_CATEGORIES.has(primaryFailure.category) ||
        message.toLowerCase().includes("greeting never received"));

    if (shouldRetryOn587) {
      try {
        await deliverViaSmtp(input, { port: 587, secure: false });
        return { delivered: true };
      } catch (retryErr) {
        const retryMessage = String(retryErr);
        const retryFailure = retryMessage.includes("smtp_timeout")
          ? ({
              category: "connection_timeout" as const,
              message: "SMTP connection timed out on port 587 fallback",
            } satisfies SmtpSendFailureDetail)
          : classifySmtpSendError(retryErr);
        return {
          delivered: false,
          skippedReason: retryMessage.includes("smtp_timeout")
            ? "smtp_timeout"
            : "smtp_send_failed",
          failureDetail: retryFailure,
        };
      }
    }

    if (message.includes("smtp_timeout")) {
      return {
        delivered: false,
        skippedReason: "smtp_timeout",
        failureDetail: primaryFailure,
      };
    }
    return {
      delivered: false,
      skippedReason: "smtp_send_failed",
      failureDetail: primaryFailure,
    };
  }
}
