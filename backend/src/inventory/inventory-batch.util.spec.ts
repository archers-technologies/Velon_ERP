import {
  allocateFefo,
  assertExpiryOnOrAfterMfg,
  batchExpiryStatus,
  parseIsoDate,
} from './inventory-batch.util';

describe('inventory-batch.util', () => {
  it('rejects expiry date earlier than manufacturing date', () => {
    const mfg = parseIsoDate('2026-06-01');
    const exp = parseIsoDate('2026-05-01');
    expect(() => assertExpiryOnOrAfterMfg(mfg, exp)).toThrow(
      'Expiry date cannot be earlier than manufacturing date.',
    );
  });

  it('allocates FEFO by earliest expiry first', () => {
    const allocations = allocateFefo(
      [
        {
          id: 'b2',
          quantity: 5,
          mfgDate: parseIsoDate('2026-01-01'),
          expiryDate: parseIsoDate('2026-12-01'),
          unitCost: 10,
        },
        {
          id: 'b1',
          quantity: 5,
          mfgDate: parseIsoDate('2026-01-01'),
          expiryDate: parseIsoDate('2026-08-01'),
          unitCost: 9,
        },
      ],
      6,
      parseIsoDate('2026-07-01'),
    );

    expect(allocations[0]?.batchId).toBe('b1');
    expect(allocations.reduce((s, a) => s + a.qty, 0)).toBe(6);
  });

  it('blocks sale when only expired batches remain', () => {
    expect(() =>
      allocateFefo(
        [
          {
            id: 'expired',
            quantity: 10,
            mfgDate: parseIsoDate('2025-01-01'),
            expiryDate: parseIsoDate('2025-06-01'),
            unitCost: 8,
          },
        ],
        1,
        parseIsoDate('2026-07-01'),
      ),
    ).toThrow('expired');
  });

  it('marks batches expiring within threshold', () => {
    const ref = parseIsoDate('2026-07-01');
    const status = batchExpiryStatus(parseIsoDate('2026-07-20'), 30, ref);
    expect(status).toBe('expiring_soon');
  });
});
