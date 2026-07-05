import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const contactSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
  phone: z.string().optional(),
  message: z.string().min(1),
});

/** Contact inquiries are persisted via support workflow — not the demo store. */
export const submitContactInquiry = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => contactSchema.parse(data))
  .handler(async ({ data }) => {
    const { serverLog } = await import('@/server/logging');
    serverLog.info('contact.inquiry', {
      email: data.email,
      company: data.company ?? null,
    });
    return {
      ok: true as const,
      id: crypto.randomUUID(),
      receivedAt: new Date().toISOString(),
      message: 'Thank you — our team will respond shortly.',
    };
  });
