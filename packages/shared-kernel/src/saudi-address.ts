/** Administrative regions of the Kingdom of Saudi Arabia. */
export const SAUDI_REGIONS = [
  { code: 'RD', nameEn: 'Riyadh', nameAr: 'الرياض' },
  { code: 'MK', nameEn: 'Makkah', nameAr: 'مكة المكرمة' },
  { code: 'MD', nameEn: 'Madinah', nameAr: 'المدينة المنورة' },
  { code: 'QS', nameEn: 'Qassim', nameAr: 'القصيم' },
  { code: 'EP', nameEn: 'Eastern Province', nameAr: 'المنطقة الشرقية' },
  { code: 'AS', nameEn: 'Asir', nameAr: 'عسير' },
  { code: 'TB', nameEn: 'Tabuk', nameAr: 'تبوك' },
  { code: 'HA', nameEn: 'Hail', nameAr: 'حائل' },
  { code: 'NB', nameEn: 'Northern Borders', nameAr: 'الحدود الشمالية' },
  { code: 'JZ', nameEn: 'Jazan', nameAr: 'جازان' },
  { code: 'NJ', nameEn: 'Najran', nameAr: 'نجران' },
  { code: 'BA', nameEn: 'Al Bahah', nameAr: 'الباحة' },
  { code: 'JF', nameEn: 'Al Jawf', nameAr: 'الجوف' },
] as const;

export type SaudiCompanyIdentifiers = {
  commercialRegistrationNumber?: string | null;
  vatRegistrationNumber?: string | null;
  buildingNumber?: string | null;
  postalCode?: string | null;
  additionalNumber?: string | null;
};

export function validateSaudiCompanyIdentifiers(input: SaudiCompanyIdentifiers): string[] {
  const errors: string[] = [];
  const cr = input.commercialRegistrationNumber?.trim();
  if (cr && !/^\d{10}$/.test(cr)) {
    errors.push('Commercial Registration number must be 10 digits when provided.');
  }
  const vat = input.vatRegistrationNumber?.trim();
  if (vat && !/^\d{15}$/.test(vat)) {
    errors.push('VAT registration number must be 15 digits when provided.');
  }
  const building = input.buildingNumber?.trim();
  if (building && !/^\d{4}$/.test(building)) {
    errors.push('National address building number must be 4 digits when provided.');
  }
  const postal = input.postalCode?.trim();
  if (postal && !/^\d{5}$/.test(postal)) {
    errors.push('Postal code must be 5 digits when provided.');
  }
  const additional = input.additionalNumber?.trim();
  if (additional && !/^\d{4}$/.test(additional)) {
    errors.push('National address additional number must be 4 digits when provided.');
  }
  return errors;
}
