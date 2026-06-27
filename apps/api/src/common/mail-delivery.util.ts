export type TransactionalMail = {
  to: string;
  subject: string;
  text: string;
  html: string;
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

export function smtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_FROM?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim(),
  );
}

export function shouldSendViaSmtp(to: string): boolean {
  if (process.env.NODE_ENV === "test") return false;
  if (isNonDeliverableEmail(to)) return false;
  return smtpConfigured();
}

function smtpTransportOptions() {
  const port = Number.parseInt(process.env.SMTP_PORT ?? "587", 10);
  const resolvedPort = Number.isFinite(port) ? port : 587;
  const secure = process.env.SMTP_SECURE === "true" || resolvedPort === 465;
  return {
    host: process.env.SMTP_HOST,
    port: resolvedPort,
    secure,
    requireTLS: !secure,
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 12_000,
    auth: {
      user: process.env.SMTP_USER!.trim(),
      pass: process.env.SMTP_PASS!,
    },
  };
}

async function withSmtpTimeout<T>(promise: Promise<T>, ms = 12_000): Promise<T> {
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
): Promise<{ delivered: boolean; skippedReason?: string }> {
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

    await withSmtpTimeout(transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    }));

    return { delivered: true };
  } catch (err) {
    const message = String(err);
    if (message.includes("smtp_timeout")) {
      return { delivered: false, skippedReason: "smtp_timeout" };
    }
    return { delivered: false, skippedReason: "smtp_send_failed" };
  }
}
