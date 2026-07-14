/** Seat = active user account consuming a license. */
export type SeatPlan = 'STARTER' | 'GROWTH' | 'ENTERPRISE';

export const SEAT_LIMITS: Record<SeatPlan, number | null> = {
  STARTER: 2,
  GROWTH: 10,
  ENTERPRISE: 25,
};

export function seatLimitForPlan(plan: SeatPlan | string): number | null {
  const key = plan as SeatPlan;
  return SEAT_LIMITS[key] ?? SEAT_LIMITS.STARTER;
}

export function isUnlimitedSeats(plan: SeatPlan | string): boolean {
  return seatLimitForPlan(plan) === null;
}

export function seatsRemaining(plan: SeatPlan | string, activeSeats: number): number | null {
  const limit = seatLimitForPlan(plan);
  if (limit === null) return null;
  return Math.max(0, limit - activeSeats);
}

export function canAddSeat(plan: SeatPlan | string, activeSeats: number): boolean {
  const limit = seatLimitForPlan(plan);
  if (limit === null) return true;
  return activeSeats < limit;
}
