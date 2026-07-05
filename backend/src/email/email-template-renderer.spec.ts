import {
  EMAIL_TEMPLATE_KEYS,
  MARKETING_TEMPLATE_KEYS,
  TRANSACTIONAL_TEMPLATE_KEYS,
} from '@velon/shared';
import { renderEmailTemplate } from './email-template-renderer.util';

describe('renderEmailTemplate', () => {
  it('renders nested merge tags', () => {
    const result = renderEmailTemplate('Hi {{user.name}}, plan {{plan.name}}', {
      user: { name: 'Alex' },
      plan: { name: 'Professional' },
    });
    expect(result).toBe('Hi Alex, plan Professional');
  });

  it('uses fallback for missing variables', () => {
    const result = renderEmailTemplate('Hello {{user.name}}', {}, 'there');
    expect(result).toBe('Hello there');
  });
});

describe('email template categories', () => {
  it('marks payment templates as transactional', () => {
    expect(TRANSACTIONAL_TEMPLATE_KEYS.has(EMAIL_TEMPLATE_KEYS.PAYMENT_SUCCESS)).toBe(true);
    expect(TRANSACTIONAL_TEMPLATE_KEYS.has(EMAIL_TEMPLATE_KEYS.PAYMENT_FAILED)).toBe(true);
  });

  it('marks onboarding templates as marketing', () => {
    expect(MARKETING_TEMPLATE_KEYS.has(EMAIL_TEMPLATE_KEYS.ONBOARDING_2_PROFILE)).toBe(true);
  });
});
