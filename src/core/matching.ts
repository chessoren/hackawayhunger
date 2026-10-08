import { DART_ROUTES, HostSite, MISSION_LABEL, RecurringSlot } from '../data/sites';

export interface LatLng { lat: number; lng: number }

export interface PersonConstraints {
  home: LatLng;
  hasCar: boolean;
  language: string;
  age?: number;
  noLifting?: boolean;
  /** Busy windows, e.g. paid work: weekday + "HH:MM" range. */
  busy: { weekday: number; start: string; end: string }[];
  hoursNeeded: number;
  deadline: Date;
}

export interface SlotOption {
  site: HostSite;
  slot: RecurringSlot;
  date: Date; // the concrete occurrence
  hours: number;
  travel: { mode: 'walk' | 'bus' | 'car'; minutes: number; detail: string };
  score: number;
  reasons: string[];
  spotsLeft: number;
}

const toRad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in meters. */
export function haversine(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Street distance ≈ 1.3 × straight line; walking 80 m/min. */
export function walkMinutes(a: LatLng, b: LatLng): number {
  return Math.round((haversine(a, b) * 1.3) / 80);
}

/** Best single-route DART trip: walk to a stop, ride, walk from a stop. */
export function busTrip(a: LatLng, b: LatLng): { minutes: number; route: string } | null {
  let best: { minutes: number; route: string } | null = null;
  for (const r of DART_ROUTES) {
    const pts = r.stops.map(([lat, lng]) => ({ lat, lng }));
    let iA = 0, iB = 0, dA = Infinity, dB = Infinity;
    pts.forEach((p, i) => {
      const da = haversine(a, p), db = haversine(b, p);
      if (da < dA) { dA = da; iA = i; }
      if (db < dB) { dB = db; iB = i; }
    });
    if (dA > 1200 || dB > 1200 || iA === iB) continue;
    let ride = 0;
    const [lo, hi] = iA < iB ? [iA, iB] : [iB, iA];
    for (let i = lo; i < hi; i++) ride += haversine(pts[i], pts[i + 1]);
    const minutes = Math.round((dA * 1.3) / 80 + r.headwayMin / 2 + (ride * 1.2) / 330 + (dB * 1.3) / 80);
    if (!best || minutes < best.minutes) best = { minutes, route: r.name };
  }
  return best;
}

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const slotHours = (s: RecurringSlot) => (toMinutes(s.end) - toMinutes(s.start)) / 60;

/** Next concrete occurrences of a recurring slot between `from` and `until`. */
export function occurrences(slot: RecurringSlot, from: Date, until: Date): Date[] {
  const out: Date[] = [];
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 45 && d <= until; i++) {
    if (d.getDay() === slot.weekday) {
      const occ = new Date(d);
      const [h, m] = slot.start.split(':').map(Number);
      occ.setHours(h, m, 0, 0);
      if (occ > from && occ <= until) out.push(occ);
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function overlapsBusy(slot: RecurringSlot, busy: PersonConstraints['busy']): boolean {
  return busy.some((b) => b.weekday === slot.weekday && toMinutes(b.start) < toMinutes(slot.end) && toMinutes(slot.start) < toMinutes(b.end));
}

/**
 * Rank missions for success of the month (reach the goal before the deadline),
 * not for volume. Returns at most `limit` options (design rule: three choices max).
 */
export function matchSlots(
  sites: HostSite[],
  p: PersonConstraints,
  bookedCount: (slotId: string, date: Date) => number,
  now = new Date(),
  limit = 3,
): SlotOption[] {
  const options: SlotOption[] = [];
  for (const site of sites) {
    if (p.age !== undefined && p.age < site.minAge) continue;
    const walk = walkMinutes(p.home, site);
    const bus = busTrip(p.home, site);
    let travel: SlotOption['travel'];
    if (walk <= 25) travel = { mode: 'walk', minutes: walk, detail: `${walk} min walk` };
    else if (bus && bus.minutes <= 50) travel = { mode: 'bus', minutes: bus.minutes, detail: `${bus.route}, about ${bus.minutes} min` };
    else if (p.hasCar) travel = { mode: 'car', minutes: Math.round(haversine(p.home, site) / 600) + 5, detail: 'by car' };
    else continue; // not reachable without a car — this is what the desert map counts

    for (const slot of site.slots) {
      if (p.noLifting && slot.noLifting === false) continue;
      if (overlapsBusy(slot, p.busy)) continue;
      for (const date of occurrences(slot, now, p.deadline).slice(0, 2)) {
        const spotsLeft = slot.capacity - bookedCount(slot.id, date);
        if (spotsLeft <= 0) continue;
        const hours = slotHours(slot);
        const reasons: string[] = [travel.detail];
        let score = 100 - travel.minutes * 1.5;
        if (site.languages.includes(p.language)) { score += 15; if (p.language !== 'en') reasons.push('staff speak your language'); }
        score += Math.min(hours, p.hoursNeeded) * 4; // longer shifts close the gap faster
        const daysOut = (date.getTime() - now.getTime()) / 86400000;
        score -= daysOut * 1.2; // sooner is safer for the deadline
        if (slot.seated) reasons.push('seated work');
        if (slot.mission === 'esl_class') reasons.push('counts as training');
        options.push({ site, slot, date, hours, travel, score, reasons, spotsLeft });
      }
    }
  }
  options.sort((a, b) => b.score - a.score);
  // Diversity: no two options from the same site and same day.
  const picked: SlotOption[] = [];
  for (const o of options) {
    if (picked.some((x) => x.site.id === o.site.id)) continue;
    picked.push(o);
    if (picked.length === limit) break;
  }
  return picked;
}

export function describeOption(o: SlotOption, locale = 'en-US'): string {
  const day = o.date.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
  return `${MISSION_LABEL[o.slot.mission]} — ${o.site.name}, ${day} ${o.slot.start}–${o.slot.end} (${o.hours} h). ${o.reasons.join(', ')}.`;
}

/** Risk of missing the month: hours still needed vs. realistic pace. */
export function monthRisk(hoursDone: number, goal: number, today: Date, deadline: Date): { onTrack: boolean; needed: number; daysLeft: number; perWeek: number } {
  const needed = Math.max(0, goal - hoursDone);
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - today.getTime()) / 86400000));
  const perWeek = daysLeft > 0 ? (needed / daysLeft) * 7 : needed;
  return { onTrack: perWeek <= 12, needed, daysLeft, perWeek: Math.round(perWeek * 10) / 10 };
}
