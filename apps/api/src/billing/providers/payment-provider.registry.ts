import type { PaymentProviderId } from "@velon/shared";
import { getRazorpaySecrets } from "../../config/razorpay.env";
import type { PaymentProviderAdapter } from "./payment-provider.types";
import { RazorpayPaymentProvider } from "./razorpay.provider";
import {
  BankTransferProvider,
  HyperPayProvider,
  RazorpayProvider,
  StcPayProvider,
  StripeProvider,
} from "./stub-providers";

const bankTransfer = new BankTransferProvider();
const razorpayStub = new RazorpayProvider();
const razorpayLive = new RazorpayPaymentProvider();

const adapters: Record<PaymentProviderId, PaymentProviderAdapter> = {
  STRIPE: new StripeProvider(),
  RAZORPAY: razorpayStub,
  STC_PAY: new StcPayProvider(),
  HYPERPAY: new HyperPayProvider(),
  BANK_TRANSFER: bankTransfer,
};

export function getPaymentProvider(id: PaymentProviderId): PaymentProviderAdapter {
  if (id === "RAZORPAY" && getRazorpaySecrets()) {
    return razorpayLive;
  }
  return adapters[id];
}

export function listPaymentProviders(): PaymentProviderAdapter[] {
  return listEnabledPaymentProviders();
}

export function listEnabledPaymentProviders(): PaymentProviderAdapter[] {
  const enabled: PaymentProviderAdapter[] = [bankTransfer];
  if (getRazorpaySecrets()) {
    enabled.push(razorpayLive);
  }
  return enabled;
}

export function defaultProviderForCountry(country: string): PaymentProviderId {
  const normalized = country.trim().toLowerCase();
  if (normalized === "india" && getRazorpaySecrets()) return "RAZORPAY";
  if (normalized === "india") return "BANK_TRANSFER";
  if (normalized === "saudi arabia" || normalized === "united arab emirates") return "HYPERPAY";
  return "STRIPE";
}
