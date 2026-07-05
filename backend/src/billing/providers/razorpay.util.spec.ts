import { createHmac } from 'crypto';
import { verifyRazorpayPaymentSignature, verifyRazorpayWebhookSignature } from './razorpay.util';

describe('razorpay.util', () => {
  const secret = 'test_key_secret';
  const orderId = 'order_test123';
  const paymentId = 'pay_test456';

  it('verifies valid payment signature', () => {
    const signature = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
    expect(verifyRazorpayPaymentSignature(orderId, paymentId, signature, secret)).toBe(true);
  });

  it('rejects invalid payment signature', () => {
    expect(verifyRazorpayPaymentSignature(orderId, paymentId, 'bad-signature', secret)).toBe(false);
  });

  it('verifies webhook signature on raw body', () => {
    const body = JSON.stringify({ event: 'payment.captured' });
    const signature = createHmac('sha256', 'whsec_test').update(body).digest('hex');
    expect(verifyRazorpayWebhookSignature(body, signature, 'whsec_test')).toBe(true);
  });
});
