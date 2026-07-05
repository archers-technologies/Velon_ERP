type RazorpayHandlerResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { email?: string };
  handler: (response: RazorpayHandlerResponse) => void;
  modal?: { ondismiss?: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

export function loadRazorpayCheckoutScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Browser only'));
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Failed to load Razorpay checkout')),
      );
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout'));
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(input: {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  planLabel: string;
  onSuccess: (response: RazorpayHandlerResponse) => void | Promise<void>;
  onDismiss?: () => void;
}) {
  await loadRazorpayCheckoutScript();
  if (!window.Razorpay) throw new Error('Razorpay checkout unavailable');

  const rzp = new window.Razorpay({
    key: input.keyId,
    amount: input.amount,
    currency: input.currency,
    name: 'Velon ERP',
    description: `${input.planLabel} subscription`,
    order_id: input.orderId,
    prefill: input.customerEmail ? { email: input.customerEmail } : undefined,
    handler: (response) => {
      void input.onSuccess(response);
    },
    modal: {
      ondismiss: input.onDismiss,
    },
  });
  rzp.open();
}
