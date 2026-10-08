import counties from '../data/iowa-county-population.json';
import { HostSite } from '../data/sites';

/**
 * Opportunity-desert model, county by county.
 *
 *   ratio = car-free accessible mission hours per month
 *           ÷ hours needed by people subject to the rule who must volunteer to close their gap
 *
 * Demand side uses county population × statewide SNAP rate × share newly subject.
 * Supply side is a transparent baseline (host sites scale with population; car-free
 * access depends on fixed-route transit) plus every site registered in Count Me In.
 * In the pilot, supply is replaced by the live site registry and DART/HIRTA data.
 */

export interface CountyRow {
  fips: string;
  name: string;
  population: number;
  fixedRouteTransit: boolean;
}

export const IOWA_SNAP_RATE = 247907 / 3241488; // Iowa HHS May 2026 recipients ÷ population
export const SHARE_SUBJECT = 0.14; // adults 18–64 without a child under 14 (assumption)
export const SHARE_NEED_VOLUNTEER = 0.35; // of those, need volunteer hours to reach 80
export const GAP_HOURS = 20; // average monthly gap (hours)

export interface CountyOpportunity extends CountyRow {
  snapParticipants: number;
  peopleSubject: number;
  hoursNeeded: number;
  accessibleHours: number;
  ratio: number;
  level: 'desert' | 'tight' | 'ok';
  registeredSites: number;
}

const POLK = '19153';

export function countyOpportunities(registered: HostSite[]): CountyOpportunity[] {
  return (counties as CountyRow[]).map((c) => {
    const snapParticipants = Math.round(c.population * IOWA_SNAP_RATE);
    const peopleSubject = Math.round(snapParticipants * SHARE_SUBJECT);
    const hoursNeeded = peopleSubject * SHARE_NEED_VOLUNTEER * GAP_HOURS;
    // Volunteer-hosting organizations (pantries, faith communities, nonprofits, libraries):
    // about 1 per 1,200 residents, each able to absorb ~150 new volunteer hours a month.
    const baselineOrgs = Math.max(1, c.population / 1200);
    // Share of that capacity reachable without a car: fixed-route transit counties vs.
    // small towns (walkable for in-town residents, not for farm residents).
    const carFreeShare = c.fixedRouteTransit ? 0.6 : c.population > 20000 ? 0.4 : 0.25;
    const regHere = c.fips === POLK ? registered.length : 0;
    const registeredHours = c.fips === POLK
      ? registered.reduce((sum, s) => sum + s.slots.reduce((h, sl) => {
          const [sh, sm] = sl.start.split(':').map(Number);
          const [eh, em] = sl.end.split(':').map(Number);
          return h + ((eh * 60 + em - sh * 60 - sm) / 60) * sl.capacity * 4.3;
        }, 0), 0)
      : 0;
    const accessibleHours = Math.round(baselineOrgs * 150 * carFreeShare + registeredHours * 0.8);
    const ratio = hoursNeeded > 0 ? accessibleHours / hoursNeeded : 9;
    const level = ratio < 0.5 ? 'desert' : ratio < 1 ? 'tight' : 'ok';
    return { ...c, snapParticipants, peopleSubject, hoursNeeded: Math.round(hoursNeeded), accessibleHours, ratio, level, registeredSites: regHere };
  });
}
