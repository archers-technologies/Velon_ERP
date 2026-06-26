function read(name: string): string | undefined {
  const value = process.env[name];
  return value?.trim() || undefined;
}

export function isRazorpayEnabledFlag(): boolean {
  return read("RAZORPAY_ENABLED")?.toLowerCase() === "true";
}

export function getRazorpayCurrency(): string {
  return (read("RAZORPAY_CURRENCY") ?? "INR").toUpperCase();
}

export type RazorpaySecrets = {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  currency: string;
};

export function getRazorpaySecrets(): RazorpaySecrets | null {
  if (!isRazorpayEnabledFlag()) return null;

  const keyId = read("RAZORPAY_KEY_ID");
  const keySecret = read("RAZORPAY_KEY_SECRET");
  const webhookSecret = read("RAZORPAY_WEBHOOK_SECRET");

  if (!keyId || !keySecret) {
    return null;
  }

  return {
    keyId,
    keySecret,
    webhookSecret: webhookSecret ?? "",
    currency: getRazorpayCurrency(),
  };
}

/** Public checkout config — never includes secrets. */
export function getRazorpayPublicConfig(): { enabled: boolean; keyId: string | null; currency: string } {
  const secrets = getRazorpaySecrets();
  if (!secrets) {
    return { enabled: false, keyId: null, currency: getRazorpayCurrency() };
  }
  return { enabled: true, keyId: secrets.keyId, currency: secrets.currency };
}

export function assertRazorpayConfigured(): RazorpaySecrets {
  const secrets = getRazorpaySecrets();
  if (!secrets) {
    throw new Error(
      "Razorpay is enabled but RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set.",
    );
  }
  return secrets;
}

export function assertRazorpayWebhookConfigured(): RazorpaySecrets {
  const secrets = assertRazorpayConfigured();
  if (!secrets.webhookSecret) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET must be set to process Razorpay webhooks.");
  }
  return secrets;
}
