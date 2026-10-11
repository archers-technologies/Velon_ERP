/** Saudi edition defaults. Deployment can override URL and email via environment variables. */
export const SAUDI_EDITION = {
  appName: 'VelonERP Saudi Arabia',
  appUrl: 'https://velonerp.sa',
  supportEmail: 'info@velonerp.sa',
  currency: 'SAR',
  locale: 'ar-SA',
  secondaryLocale: 'en-SA',
  timezone: 'Asia/Riyadh',
  countryCode: 'SA',
  countryName: 'Saudi Arabia',
  workspaceDomain: 'app.velonerp.sa',
} as const;
