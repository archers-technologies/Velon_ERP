export type SeatPlan = 'STARTER' | 'GROWTH' | 'ENTERPRISE';
export declare const SEAT_LIMITS: Record<SeatPlan, number | null>;
export declare function seatLimitForPlan(plan: SeatPlan | string): number | null;
export declare function isUnlimitedSeats(plan: SeatPlan | string): boolean;
export declare function seatsRemaining(plan: SeatPlan | string, activeSeats: number): number | null;
export declare function canAddSeat(plan: SeatPlan | string, activeSeats: number): boolean;
