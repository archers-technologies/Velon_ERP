export type TransactionalMail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

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

const NON_DELIVERABLE_SUFFIXES = [".test", ".invalid", ".example", ".localhost"] as const;
const NON_DELIVERABLE_DOMAINS = new Set(["example.com", "example.org", "example.net"]);

/** RFC 2606 / test-only domains must never hit real SMTP (avoids bounce-back spam). */
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
  const port = parseSmtpPort();
  return {
    hostPresent: Boolean(process.env.SMTP_HOST?.trim()),
    portPresent: Boolean(process.env.SMTP_PORT?.trim()),
    port,
    secure: parseSmtpSecure(),
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

export function shouldSendViaSmtp(to: string): boolean {
  if (process.env.NODE_ENV === "test") return false;
  if (isNonDeliverableEmail(to)) return false;
  return smtpConfigured();
}

function smtpTransportOptions() {
  const port = parseSmtpPort();
  const secure = parseSmtpSecure();
  return {
    host: process.env.SMTP_HOST?.trim(),
    port,
    secure,
    requireTLS: !secure && port === 587,
    connectionTimeout: 12_000,
    greetingTimeout: 12_000,
    socketTimeout: 15_000,
    auth: {
      user: process.env.SMTP_USER!.trim(),
      pass: getSmtpPassword()!,
    },
  };
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

export async function sendTransactionalMail(
  input: TransactionalMail,
): Promise<{
  delivered: boolean;
  skippedReason?: string;
  failureDetail?: SmtpSendFailureDetail;
}> {
  if (!shouldSendViaSmtp(input.to)) {
    const reason =
      process.env.NODE_ENV === "test"
        ? "test_environment"
        : isNonDeliverableEmail(input.to)
          ? "non_deliverable_recipient"
          : "smtp_not_configured";
    return { delivered: false, skippedReason: reason };
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport(smtpTransportOptions());

    await withSmtpTimeout(
      transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
    );

    return { delivered: true };
  } catch (err) {
    const message = String(err);
    if (message.includes("smtp_timeout")) {
      return {
        delivered: false,
        skippedReason: "smtp_timeout",
        failureDetail: {
          category: "connection_timeout",
          message: "SMTP connection timed out",
        },
      };
    }
    return {
      delivered: false,
      skippedReason: "smtp_send_failed",
      failureDetail: classifySmtpSendError(err),
    };
  }
}
