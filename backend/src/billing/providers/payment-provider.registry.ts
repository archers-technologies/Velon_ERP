import type { PaymentProviderId } from '@velon/shared';
import { getRazorpaySecrets } from '../../config/razorpay.env';
import type { PaymentProviderAdapter } from './payment-provider.types';
import { RazorpayPaymentProvider } from './razorpay.provider';
import {
  BankTransferProvider,
  HyperPayProvider,
  RazorpayProvider,
  StcPayProvider,
  StripeProvider,
} from './stub-providers';

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
  if (id === 'RAZORPAY' && getRazorpaySecrets()) {
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

export function defaultProviderForCountry(_country: string): PaymentProviderId {
  return 'BANK_TRANSFER';
}
