/**
 * Demo host-site registry for the Des Moines pilot.
 * Site names are illustrative (no partnership is implied); coordinates are real
 * Des Moines locations so walking and bus estimates are realistic.
 * In production this list is filled by the 10-minute site onboarding flow.
 */

export type MissionType = 'sorting' | 'distribution' | 'welcome' | 'kitchen' | 'garden' | 'admin' | 'driver' | 'esl_class';

export interface RecurringSlot {
  id: string;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  start: string; // "09:00"
  end: string; // "12:00"
  mission: MissionType;
  capacity: number;
  /** Physical demands, for filtering. */
  seated?: boolean;
  noLifting?: boolean;
}

export interface HostSite {
  id: string;
  name: string;
  kind: 'pantry' | 'faith' | 'garden' | 'public' | 'corporate' | 'school';
  address: string;
  lat: number;
  lng: number;
  coordinator: string;
  coordinatorPhone: string;
  languages: string[];
  minAge: number;
  accessible: boolean;
  /** 4-digit check-in code printed on the poster for basic phones. */
  code: string;
  slots: RecurringSlot[];
  /** Ed25519 public key of the coordinator (base64), generated at onboarding. */
  coordinatorKey?: string;
  createdAt?: string;
}

export const MISSION_LABEL: Record<MissionType, string> = {
  sorting: 'Food sorting',
  distribution: 'Food distribution',
  welcome: 'Welcome desk',
  kitchen: 'Community kitchen',
  garden: 'Community garden',
  admin: 'Office help',
  driver: 'Delivery driver',
  esl_class: 'English class (training)',
};

export const DEMO_SITES: HostSite[] = [
  {
    id: 'grace',
    name: 'Grace Church Community Grocery',
    kind: 'faith',
    address: '1000 E Grand Ave, Des Moines, IA 50316',
    lat: 41.5913,
    lng: -93.6007,
    coordinator: 'Pastor Dave',
    coordinatorPhone: '(515) 555-0142',
    languages: ['en', 'es'],
    minAge: 16,
    accessible: true,
    code: '4821',
    slots: [
      { id: 'grace-tue-am', weekday: 2, start: '09:00', end: '13:00', mission: 'distribution', capacity: 6 },
      { id: 'grace-thu-pm', weekday: 4, start: '14:00', end: '18:00', mission: 'sorting', capacity: 4, noLifting: false },
      { id: 'grace-sat-am', weekday: 6, start: '09:00', end: '12:00', mission: 'welcome', capacity: 3, seated: true, noLifting: true },
    ],
  },
  {
    id: 'eastside',
    name: 'Eastside Neighborhood Pantry',
    kind: 'pantry',
    address: '1521 E 14th St, Des Moines, IA 50316',
    lat: 41.6066,
    lng: -93.5951,
    coordinator: 'Maria',
    coordinatorPhone: '(515) 555-0177',
    languages: ['en', 'es', 'sw'],
    minAge: 14,
    accessible: true,
    code: '3307',
    slots: [
      { id: 'east-mon-am', weekday: 1, start: '08:30', end: '12:30', mission: 'sorting', capacity: 5 },
      { id: 'east-wed-pm', weekday: 3, start: '13:00', end: '17:00', mission: 'distribution', capacity: 6 },
      { id: 'east-sat-am', weekday: 6, start: '08:00', end: '12:00', mission: 'distribution', capacity: 8 },
    ],
  },
  {
    id: 'southside',
    name: 'Southside Food Hub',
    kind: 'pantry',
    address: '2200 SW 9th St, Des Moines, IA 50315',
    lat: 41.5655,
    lng: -93.6311,
    coordinator: 'Tom',
    coordinatorPhone: '(515) 555-0193',
    languages: ['en', 'es', 'vi'],
    minAge: 16,
    accessible: true,
    code: '5590',
    slots: [
      { id: 'south-tue-pm', weekday: 2, start: '15:00', end: '19:00', mission: 'distribution', capacity: 6 },
      { id: 'south-fri-am', weekday: 5, start: '09:00', end: '13:00', mission: 'kitchen', capacity: 4 },
      { id: 'south-sat-am', weekday: 6, start: '09:00', end: '13:00', mission: 'sorting', capacity: 6 },
    ],
  },
  {
    id: 'highland',
    name: 'Highland Park Community Garden',
    kind: 'garden',
    address: '3500 6th Ave, Des Moines, IA 50313',
    lat: 41.6235,
    lng: -93.6276,
    coordinator: 'Keisha',
    coordinatorPhone: '(515) 555-0108',
    languages: ['en'],
    minAge: 12,
    accessible: false,
    code: '7714',
    slots: [
      { id: 'garden-wed-am', weekday: 3, start: '08:00', end: '11:00', mission: 'garden', capacity: 8 },
      { id: 'garden-sat-am', weekday: 6, start: '08:00', end: '11:00', mission: 'garden', capacity: 10 },
    ],
  },
  {
    id: 'library-esl',
    name: 'Central Library — Adult ESL Program',
    kind: 'public',
    address: '1000 Grand Ave, Des Moines, IA 50309',
    lat: 41.5862,
    lng: -93.6302,
    coordinator: 'Ms. Nguyen',
    coordinatorPhone: '(515) 555-0121',
    languages: ['en', 'sw', 'my', 'ar', 'vi', 'fr', 'rw', 'es'],
    minAge: 16,
    accessible: true,
    code: '2468',
    slots: [
      { id: 'esl-mon-pm', weekday: 1, start: '18:00', end: '20:00', mission: 'esl_class', capacity: 15, seated: true, noLifting: true },
      { id: 'esl-wed-pm', weekday: 3, start: '18:00', end: '20:00', mission: 'esl_class', capacity: 15, seated: true, noLifting: true },
    ],
  },
  {
    id: 'meals-downtown',
    name: 'Downtown Community Kitchen',
    kind: 'faith',
    address: '815 High St, Des Moines, IA 50309',
    lat: 41.5888,
    lng: -93.6276,
    coordinator: 'Rev. Ana',
    coordinatorPhone: '(515) 555-0165',
    languages: ['en', 'es', 'ar'],
    minAge: 16,
    accessible: true,
    code: '9032',
    slots: [
      { id: 'kitchen-mon-am', weekday: 1, start: '09:00', end: '13:00', mission: 'kitchen', capacity: 6 },
      { id: 'kitchen-thu-am', weekday: 4, start: '09:00', end: '13:00', mission: 'kitchen', capacity: 6 },
      { id: 'kitchen-sun-pm', weekday: 0, start: '12:00', end: '15:00', mission: 'welcome', capacity: 4, seated: true, noLifting: true },
    ],
  },
  {
    id: 'corteva-days',
    name: 'Employee Volunteer Day (corporate host site)',
    kind: 'corporate',
    address: '7000 NW 62nd Ave, Johnston, IA 50131',
    lat: 41.6933,
    lng: -93.7268,
    coordinator: 'Volunteer program lead',
    coordinatorPhone: '(515) 555-0100',
    languages: ['en', 'es'],
    minAge: 18,
    accessible: true,
    code: '1150',
    slots: [
      { id: 'corp-fri-am', weekday: 5, start: '08:00', end: '12:00', mission: 'sorting', capacity: 20 },
    ],
  },
];

/** Approximate centroids for Des Moines-area ZIP codes (for walking/bus estimates). */
export const ZIP_CENTROIDS: Record<string, { lat: number; lng: number; label: string }> = {
  '50309': { lat: 41.5868, lng: -93.6250, label: 'Downtown' },
  '50310': { lat: 41.6260, lng: -93.6720, label: 'Beaverdale' },
  '50311': { lat: 41.6010, lng: -93.6720, label: 'Drake' },
  '50312': { lat: 41.5850, lng: -93.6720, label: 'Ingersoll' },
  '50313': { lat: 41.6380, lng: -93.6230, label: 'Highland Park' },
  '50314': { lat: 41.6040, lng: -93.6330, label: 'River Bend' },
  '50315': { lat: 41.5480, lng: -93.6180, label: 'South Side' },
  '50316': { lat: 41.5962, lng: -93.5948, label: 'Capitol East' },
  '50317': { lat: 41.6100, lng: -93.5450, label: 'East Des Moines' },
  '50320': { lat: 41.5350, lng: -93.5800, label: 'Southeast' },
  '50321': { lat: 41.5480, lng: -93.6620, label: 'Southwest' },
  '50131': { lat: 41.6900, lng: -93.7100, label: 'Johnston' },
};

/**
 * Simplified DART fixed-route excerpt (stop sequences on real streets).
 * Production: load the full DART GTFS feed.
 */
export const DART_ROUTES: { id: string; name: string; headwayMin: number; stops: [number, number][] }[] = [
  { id: '3', name: 'Route 3 — University', headwayMin: 15, stops: [[41.5870, -93.6250], [41.5960, -93.6450], [41.6010, -93.6600], [41.6010, -93.6720], [41.6030, -93.6900]] },
  { id: '6', name: 'Route 6 — Indianola', headwayMin: 20, stops: [[41.5870, -93.6250], [41.5800, -93.6150], [41.5650, -93.6080], [41.5480, -93.6050], [41.5350, -93.5900]] },
  { id: '7', name: 'Route 7 — SW 9th St', headwayMin: 20, stops: [[41.5870, -93.6250], [41.5780, -93.6300], [41.5655, -93.6311], [41.5500, -93.6320], [41.5480, -93.6620]] },
  { id: '4', name: 'Route 4 — E 14th St', headwayMin: 20, stops: [[41.5870, -93.6250], [41.5913, -93.6050], [41.6000, -93.5960], [41.6066, -93.5951], [41.6200, -93.5950], [41.6380, -93.5950]] },
  { id: '1', name: 'Route 1 — Fairgrounds', headwayMin: 20, stops: [[41.5870, -93.6250], [41.5913, -93.6007], [41.5950, -93.5800], [41.6000, -93.5600], [41.6100, -93.5450]] },
  { id: '5', name: 'Route 5 — Highland Park', headwayMin: 30, stops: [[41.5870, -93.6250], [41.6040, -93.6330], [41.6235, -93.6276], [41.6380, -93.6230]] },
  { id: '17', name: 'Route 17 — Hubbell / Johnston', headwayMin: 30, stops: [[41.5870, -93.6250], [41.6260, -93.6720], [41.6600, -93.7000], [41.6933, -93.7268]] },
];
