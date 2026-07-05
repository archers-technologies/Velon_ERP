import type { EmailMergeContext } from '@velon/shared';

const MERGE_PATTERN = /\{\{([a-zA-Z0-9_.]+)\}\}/g;

function resolvePath(ctx: EmailMergeContext, path: string): string {
  const parts = path.split('.');
  let current: unknown = ctx;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return '';
    current = (current as Record<string, unknown>)[part];
  }
  if (current == null) return '';
  return String(current);
}

export function renderEmailTemplate(
  template: string,
  context: EmailMergeContext,
  fallback = '',
): string {
  return template.replace(MERGE_PATTERN, (_match, path: string) => {
    const value = resolvePath(context, path.trim());
    return value || fallback;
  });
}

export function wrapEmailHtml(bodyHtml: string, cta?: { label: string; url: string }): string {
  const ctaBlock = cta
    ? `<p style="margin:24px 0"><a href="${cta.url}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">${cta.label}</a></p>`
    : '';
  return `<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1e293b;max-width:560px;margin:0 auto;padding:24px">${bodyHtml}${ctaBlock}<p style="color:#64748b;font-size:13px;margin-top:32px">Velon ERP — business operations in one place.</p></body></html>`;
}
