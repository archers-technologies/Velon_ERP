import { apiFetch, authFetch } from '@/lib/api/client';

export const PASSWORD_RESET_GENERIC_MESSAGE =
  'If an account exists for this email, we have sent a verification code.';

export function apiRequestPasswordReset(email: string) {
  return authFetch<{ message: string; delivered?: boolean; devCode?: string }>(
    '/auth/password-reset/request',
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    },
  );
}

export function apiVerifyPasswordResetOtp(email: string, code: string) {
  return authFetch<{ verificationToken: string }>('/auth/password-reset/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

export function apiCompletePasswordReset(input: {
  email: string;
  verificationToken: string;
  password: string;
}) {
  return authFetch<{ ok: true }>('/auth/password-reset/complete', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function apiChangePassword(currentPassword: string, newPassword: string) {
  return apiFetch<{ ok: true }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
