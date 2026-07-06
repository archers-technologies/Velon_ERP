import { type SeatPlan } from './seats';

export type PlanCatalogEntry = {
  id: SeatPlan;
  name: string;
  displayName: string;
  seatLimit: number | null;
  monthlyPrice: number;
  description: string;
  features: string[];
};
export declare const PLAN_CATALOG: PlanCatalogEntry[];
export declare function planCatalogEntry(plan: string): PlanCatalogEntry;
