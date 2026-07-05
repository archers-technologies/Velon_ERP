import { MARKETING_TEMPLATE_KEYS, TRANSACTIONAL_TEMPLATE_KEYS } from '@velon/shared';
import { PrismaService } from '../prisma/prisma.service';
import { EmailPreferenceService } from './email-preference.service';

describe('EmailPreferenceService', () => {
  const prisma = {
    client: {
      emailPreference: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
    },
  } as unknown as PrismaService;

  const service = new EmailPreferenceService(prisma);

  const defaultPref = {
    transactionalEnabled: true,
    billingAlertsEnabled: true,
    securityAlertsEnabled: true,
    productUpdatesOptIn: false,
    marketingOptIn: false,
    trainingAnnouncementsOptIn: false,
  };

  it('allows transactional billing emails when billing alerts enabled', () => {
    const result = service.canSendTemplate('payment_success', defaultPref);
    expect(result.allowed).toBe(true);
  });

  it('blocks marketing onboarding when opted out', () => {
    const result = service.canSendTemplate('onboarding_2_profile', defaultPref);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('marketing_opt_out');
  });

  it('allows marketing when product updates opted in', () => {
    const result = service.canSendTemplate('onboarding_2_profile', {
      ...defaultPref,
      productUpdatesOptIn: true,
    });
    expect(result.allowed).toBe(true);
  });

  it('still allows payment failed when marketing opted out', () => {
    expect(TRANSACTIONAL_TEMPLATE_KEYS.has('payment_failed')).toBe(true);
    expect(MARKETING_TEMPLATE_KEYS.has('payment_failed')).toBe(false);
    const result = service.canSendTemplate('payment_failed', defaultPref);
    expect(result.allowed).toBe(true);
  });
});
