import { createHmac, timingSafeEqual } from "crypto";
import { BillingInterval, TenantPlan } from "@velon/database";
import { planCatalogEntry, yearlyPriceFromMonthly } from "@velon/shared";
import { getRazorpayCurrency } from "../../config/razorpay.env";

/** USD list prices × default INR rate when plan has no explicit INR field. */
const DEFAULT_USD_INR_RATE = Number(process.env.RAZORPAY_USD_INR_RATE ?? "83");

export function planCheckoutAmountUsd(plan: TenantPlan, billingInterval: BillingInterval): number {
  const entry = planCatalogEntry(plan);
  return billingInterval === BillingInterval.YEARLY
    ? yearlyPriceFromMonthly(entry.monthlyPrice)
    : entry.monthlyPrice;
}

export function planCheckoutAmountMinorUnits(
  plan: TenantPlan,
  billingInterval: BillingInterval,
  currency: string,
): number {
  const usd = planCheckoutAmountUsd(plan, billingInterval);
  const normalized = currency.toUpperCase();
  if (normalized === "INR") {
    const inr = Math.round(usd * DEFAULT_USD_INR_RATE);
    return inr * 100;
  }
  return Math.round(usd * 100);
}

export function planCheckoutCurrency(): string {
  return getRazorpayCurrency();
}

export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string,
): boolean {
  const body = `${orderId}|${paymentId}`;
  const expected = createHmac("sha256", keySecret).update(body).digest("hex");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyRazorpayWebhookSignature(
  rawBody: Buffer | string,
  signature: string,
  webhookSecret: string,
): boolean {
  const expected = createHmac("sha256", webhookSecret)
    .update(typeof rawBody === "string" ? rawBody : rawBody)
    .digest("hex");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
