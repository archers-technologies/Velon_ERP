export type BatchExpiryStatus = 'ok' | 'expiring_soon' | 'expired' | 'no_expiry';

export function parseIsoDate(value: string): Date {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error('Date must be in YYYY-MM-DD format.');
  }
  const d = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new Error('Invalid date.');
  }
  return d;
}

export function assertExpiryOnOrAfterMfg(mfgDate: Date, expiryDate: Date): void {
  if (expiryDate.getTime() < mfgDate.getTime()) {
    throw new Error('Expiry date cannot be earlier than manufacturing date.');
  }
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function addDaysUtc(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function batchExpiryStatus(
  expiryDate: Date,
  expiringSoonDays: number,
  referenceDate: Date = todayUtc(),
): BatchExpiryStatus {
  const exp = new Date(expiryDate);
  exp.setUTCHours(0, 0, 0, 0);
  const ref = new Date(referenceDate);
  ref.setUTCHours(0, 0, 0, 0);

  if (exp.getTime() < ref.getTime()) return 'expired';
  const soonThreshold = addDaysUtc(ref, expiringSoonDays);
  if (exp.getTime() <= soonThreshold.getTime()) return 'expiring_soon';
  return 'ok';
}

export type FefoBatchRow = {
  id: string;
  quantity: number;
  mfgDate: Date;
  expiryDate: Date;
  unitCost: number;
};

export type FefoAllocation = {
  batchId: string;
  qty: number;
  mfgDate: string;
  expiryDate: string;
  unitCost: number;
};

/** First Expiry, First Out — skips expired batches. */
export function allocateFefo(
  batches: FefoBatchRow[],
  requestedQty: number,
  referenceDate: Date = todayUtc(),
): FefoAllocation[] {
  const ref = new Date(referenceDate);
  ref.setUTCHours(0, 0, 0, 0);

  const eligible = batches
    .filter((b) => {
      if (b.quantity <= 0) return false;
      const exp = new Date(b.expiryDate);
      exp.setUTCHours(0, 0, 0, 0);
      return exp.getTime() >= ref.getTime();
    })
    .sort((a, b) => {
      const expDiff = a.expiryDate.getTime() - b.expiryDate.getTime();
      if (expDiff !== 0) return expDiff;
      return a.mfgDate.getTime() - b.mfgDate.getTime();
    });

  let remaining = requestedQty;
  const allocations: FefoAllocation[] = [];

  for (const batch of eligible) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    if (take <= 0) continue;
    allocations.push({
      batchId: batch.id,
      qty: take,
      mfgDate: toIsoDate(batch.mfgDate),
      expiryDate: toIsoDate(batch.expiryDate),
      unitCost: batch.unitCost,
    });
    remaining -= take;
  }

  if (remaining > 0) {
    const hasExpiredOnly = batches.some((b) => b.quantity > 0) && eligible.length === 0;
    if (hasExpiredOnly) {
      throw new Error('Cannot sell expired stock. Remove or write off expired batches first.');
    }
    throw new Error('Insufficient non-expired stock for this product.');
  }

  return allocations;
}
