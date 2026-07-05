"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEAT_LIMITS = void 0;
exports.seatLimitForPlan = seatLimitForPlan;
exports.isUnlimitedSeats = isUnlimitedSeats;
exports.seatsRemaining = seatsRemaining;
exports.canAddSeat = canAddSeat;
exports.SEAT_LIMITS = {
    STARTER: 5,
    GROWTH: 25,
    ENTERPRISE: null,
};
function seatLimitForPlan(plan) {
    const key = plan;
    return exports.SEAT_LIMITS[key] ?? exports.SEAT_LIMITS.STARTER;
}
function isUnlimitedSeats(plan) {
    return seatLimitForPlan(plan) === null;
}
function seatsRemaining(plan, activeSeats) {
    const limit = seatLimitForPlan(plan);
    if (limit === null)
        return null;
    return Math.max(0, limit - activeSeats);
}
function canAddSeat(plan, activeSeats) {
    const limit = seatLimitForPlan(plan);
    if (limit === null)
        return true;
    return activeSeats < limit;
}
//# sourceMappingURL=seats.js.map