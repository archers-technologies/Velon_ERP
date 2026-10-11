import { validateSaudiCompanyIdentifiers } from './saudi-address';

describe('Saudi company identifiers', () => {
  it('accepts a complete optional national address', () => {
    expect(
      validateSaudiCompanyIdentifiers({
        commercialRegistrationNumber: '1010123456',
        vatRegistrationNumber: '399999999900003',
        buildingNumber: '1234',
        postalCode: '12211',
        additionalNumber: '5678',
      }),
    ).toEqual([]);
  });

  it('allows blank optional identifiers', () => {
    expect(validateSaudiCompanyIdentifiers({})).toEqual([]);
  });

  it('rejects a partial VAT number', () => {
    const errors = validateSaudiCompanyIdentifiers({ vatRegistrationNumber: '123' });
    expect(errors[0]).toContain('15 digits');
  });
});
