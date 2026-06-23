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
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_FROM?.trim());
}

export function shouldSendViaSmtp(to: string): boolean {
  if (process.env.NODE_ENV === "test") return false;
  if (isNonDeliverableEmail(to)) return false;
  return smtpConfigured();
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

  const nodemailer = await import("nodemailer");
  const port = Number.parseInt(process.env.SMTP_PORT ?? "587", 10);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number.isFinite(port) ? port : 587,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  return { delivered: true };
}
