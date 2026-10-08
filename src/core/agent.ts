import { HostSite, MISSION_LABEL, ZIP_CENTROIDS } from '../data/sites';
import { LedgerEntry, validatedHours } from './ledger';
import { LLM } from './llm';
import { Decision, Facts, RuleSet, decide, nextQuestion } from './rules';
import { keyword, langByCode, LANGUAGES } from './i18n';
import { LatLng, SlotOption, matchSlots, monthRisk } from './matching';
import { LetterReading, readLetter } from './letter';

/**
 * The conversational agent. Pure and channel-agnostic: the same code answers
 * the web phone, Twilio SMS and the voice call. The AI understands and
 * translates; the deterministic rules engine decides; a human settles doubts.
 */

export type Step =
  | 'start'
  | 'name'
  | 'screen'
  | 'training'
  | 'zip'
  | 'car'
  | 'availability'
  | 'offer'
  | 'idle'
  | 'share_confirm'
  | 'escalated'
  | 'erased';

export interface Booking {
  siteId: string;
  slotId: string;
  occurrence: string; // ISO start
  end: string; // ISO end
  hours: number;
  siteName: string;
  address: string;
  mission: string;
  code: string;
  travel: string;
}

export interface Reminder { at: string; text: string; sent?: boolean; kind: 'shift' | 'deadline' | 'risk' }

export interface Session {
  phone: string;
  person: string;
  lang: string;
  name?: string;
  step: Step;
  pendingQuestion?: keyof Facts;
  facts: Facts;
  decision?: Decision;
  trainingHoursMonth?: number;
  zip?: string;
  home?: LatLng;
  hasCar?: boolean;
  noLifting?: boolean;
  busy: { weekday: number; start: string; end: string }[];
  offered: { siteId: string; slotId: string; occurrence: string }[];
  bookings: Booking[];
  reminders: Reminder[];
  letters: (LetterReading & { at: string })[];
  attestationUrl?: string;
  sharedWithState?: string[];
  createdAt: string;
}

export interface Reply {
  text: string;
  /** Tappable choices; the text already contains "1 … 2 … 3" for basic phones. */
  quick?: string[];
  card?:
    | { kind: 'gauge'; done: number; goal: number; daysLeft: number; deadline: string }
    | { kind: 'letter'; reading: LetterReading }
    | { kind: 'booking'; booking: Booking }
    | { kind: 'decision'; decision: Decision }
    | { kind: 'attestation'; url: string };
}

export interface AgentDeps {
  llm: LLM;
  rules: RuleSet;
  sites: HostSite[];
  ledger: LedgerEntry[];
  now: Date;
  /** Writes a booking / consent entry to the signed ledger. */
  record: (e: { type: 'booking' | 'cancel' | 'consent' | 'erasure' | 'check_in' | 'check_out'; person: string; siteId?: string; slotId?: string; occurrence?: string; data: Record<string, unknown> }) => void;
  bookedCount: (slotId: string, occurrence: Date) => number;
  /** Builds and signs the monthly attestation, returns its verification URL. */
  issueAttestation?: (s: Session) => Promise<string>;
  /** Notifies a human navigator (escalation). */
  escalate?: (s: Session, reason: string) => void;
}

export interface Input { text?: string; image?: { base64: string; mediaType: string } }

export function newSession(phone: string, person: string, now: Date): Session {
  return { phone, person, lang: 'en', step: 'start', facts: {}, busy: [], offered: [], bookings: [], reminders: [], letters: [], createdAt: now.toISOString() };
}

const GOAL = 80;

export function monthKey(d: Date) {
  return d.toISOString().slice(0, 7);
}
export function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59);
}
const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const fmtShort = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** Hours that count this month: declared paid work + training + coordinator-validated volunteering. */
export function monthlyCount(s: Session, ledger: LedgerEntry[], now: Date) {
  const paid = Math.round((s.facts.weekly_paid_hours ?? 0) * 4.33);
  const training = s.trainingHoursMonth ?? 0;
  const volunteer = validatedHours(ledger, s.person, monthKey(now));
  const booked = s.bookings.filter((b) => new Date(b.occurrence) > now).reduce((x, b) => x + b.hours, 0);
  const done = paid + training + volunteer;
  return { paid, training, volunteer, booked, done, gap: Math.max(0, GOAL - done) };
}

// ---------------------------------------------------------------- questions

const QUESTIONS: Record<keyof Facts, { text: string; quick?: string[] }> = {
  age: { text: 'How old are you?' },
  child_under_14: { text: 'Does a child under 14 live with you and share your SNAP?\n1 Yes\n2 No', quick: ['1 Yes', '2 No'] },
  pregnant: { text: 'Are you pregnant?\n1 Yes\n2 No', quick: ['1 Yes', '2 No'] },
  health_limits_work: { text: 'Do you have a health problem, physical or mental, that makes it hard to work?\n1 Yes\n2 No\n3 Not sure', quick: ['1 Yes', '2 No', '3 Not sure'] },
  cares_for_incapacitated: { text: 'Do you take care of someone who cannot take care of themselves?\n1 Yes\n2 No', quick: ['1 Yes', '2 No'] },
  weekly_paid_hours: { text: 'About how many hours a week do you work for pay? (Send 0 if none.)' },
  tribal_member: { text: 'Are you a member of a federally recognized tribe?\n1 Yes\n2 No', quick: ['1 Yes', '2 No'] },
  veteran: { text: '' },
  homeless: { text: '' },
  former_foster_youth: { text: '' },
};

// ---------------------------------------------------------------- understanding

interface Understanding {
  language: string;
  intent: 'answer' | 'help' | 'delete' | 'question' | 'hours' | 'missions' | 'attestation' | 'yes' | 'no' | 'greeting' | 'other';
  choice: number | null;
  first_name: string | null;
  facts: {
    age: number | null;
    child_under_14: boolean | null;
    pregnant: boolean | null;
    health_limits_work: 'yes' | 'no' | 'unsure' | null;
    cares_for_incapacitated: boolean | null;
    weekly_paid_hours: number | null;
    veteran: boolean | null;
    homeless: boolean | null;
    tribal_member: boolean | null;
  };
  zip: string | null;
  has_car: boolean | null;
  no_lifting: boolean | null;
  busy: { weekday: number; start: string; end: string }[] | null;
  monthly_training_hours: number | null;
  question_answer: string | null;
}

const nullable = (t: string) => ({ type: [t, 'null'] });

const UNDERSTANDING_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['language', 'intent', 'choice', 'first_name', 'facts', 'zip', 'has_car', 'no_lifting', 'busy', 'monthly_training_hours', 'question_answer'],
  properties: {
    language: { type: 'string', enum: [...LANGUAGES.map((l) => l.code), 'other'] },
    intent: { type: 'string', enum: ['answer', 'help', 'delete', 'question', 'hours', 'missions', 'attestation', 'yes', 'no', 'greeting', 'other'] },
    choice: nullable('integer'),
    first_name: nullable('string'),
    facts: {
      type: 'object',
      additionalProperties: false,
      required: ['age', 'child_under_14', 'pregnant', 'health_limits_work', 'cares_for_incapacitated', 'weekly_paid_hours', 'veteran', 'homeless', 'tribal_member'],
      properties: {
        age: nullable('integer'),
        child_under_14: nullable('boolean'),
        pregnant: nullable('boolean'),
        health_limits_work: { type: ['string', 'null'], enum: ['yes', 'no', 'unsure', null] },
        cares_for_incapacitated: nullable('boolean'),
        weekly_paid_hours: nullable('number'),
        veteran: nullable('boolean'),
        homeless: nullable('boolean'),
        tribal_member: nullable('boolean'),
      },
    },
    zip: nullable('string'),
    has_car: nullable('boolean'),
    no_lifting: nullable('boolean'),
    busy: {
      type: ['array', 'null'],
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['weekday', 'start', 'end'],
        properties: { weekday: { type: 'integer' }, start: { type: 'string' }, end: { type: 'string' } },
      },
    },
    monthly_training_hours: nullable('number'),
    question_answer: nullable('string'),
  },
};

function understandingPrompt(s: Session, deps: AgentDeps, expecting: string): string {
  const r = deps.rules;
  return [
    'You are the language-understanding layer of "Count Me In", an SMS assistant that helps people in Iowa keep SNAP food assistance under the 80-hour-a-month work rule.',
    'Your ONLY job: turn the person\'s message into structured facts. You never decide eligibility — a deterministic rules engine does.',
    'Rules: fill a field only if the message clearly supports it; otherwise null. Map approximate statements to facts: "I hurt my back since the accident and can\'t stand long" → health_limits_work "yes"; "maybe, my knees" → "unsure"; "my son is 9" → child_under_14 true; "I clean houses 10 hours a week" → weekly_paid_hours 10; "I served in the Army" → veteran true; "I sleep at the shelter" → homeless true.',
    'If the person answers with a number or word matching a numbered option, set choice. "yes"/"no" in any language → intent yes/no and choice 1/2 for yes/no questions.',
    'busy = times the person is NOT available (weekday 0=Sunday…6=Saturday, 24h "HH:MM"). "weekday mornings" → Mon–Fri 08:00–12:00. "anytime" → [].',
    'language = the language the message is written in (ISO code). Short messages like "1", "ok", digits or a ZIP code → keep the current language "' + s.lang + '".',
    'intent "question" if they ask something; then question_answer = a short, kind, factual answer in English using ONLY this rules summary — never say whether they are eligible:',
    `RULES (${r.name} ${r.version}): ${r.requirement.plain} ${r.requirement.time_limit_plain} Countable: ${r.requirement.countable_activities.map((a) => a.label).join('; ')}. Exemptions: ${r.exemptions.map((e) => e.plain).join(' ')} Removed in 2025: ${r.removed_exemptions.map((e) => e.plain).join(' ')}`,
    `CURRENT STEP: ${s.step}. The assistant just asked: ${expecting}`,
  ].join('\n');
}

async function understand(s: Session, deps: AgentDeps, text: string, expecting: string): Promise<Understanding> {
  return deps.llm.json<Understanding>({
    system: understandingPrompt(s, deps, expecting),
    user: text,
    schema: UNDERSTANDING_SCHEMA,
    schemaName: 'understanding',
    maxTokens: 3000,
    effort: 'low',
  });
}

// ---------------------------------------------------------------- translation

const translationCache = new Map<string, string>();

export async function translate(llm: LLM, texts: string[], lang: string): Promise<string[]> {
  if (lang === 'en' || !texts.length) return texts;
  const todo = texts.filter((t) => !translationCache.has(`${lang}|${t}`));
  if (todo.length) {
    const language = langByCode(lang).name;
    const res = await llm.json<{ messages: string[] }>({
      system: `Translate SMS messages from a food-assistance helper into ${language}. Warm, simple words (5th-grade level), short sentences, never bureaucratic. Use the informal "you" where natural (tú, tu). Keep unchanged: numbers, dates, times, money, phone numbers, URLs, addresses, place and person names, 4-digit codes, and the option numbers at the start of lines ("1 …", "2 …"). Keep the keywords HELP, DELETE, YES, HOURS, MISSIONS in English capitals and add the ${language} word in parentheses the first time. Keep line breaks. Return exactly one translation per input, same order.`,
      user: JSON.stringify(todo),
      schema: { type: 'object', additionalProperties: false, required: ['messages'], properties: { messages: { type: 'array', items: { type: 'string' } } } },
      schemaName: 'translations',
      maxTokens: 6000,
      effort: 'low',
    });
    todo.forEach((t, i) => translationCache.set(`${lang}|${t}`, res.messages[i] ?? t));
  }
  return texts.map((t) => translationCache.get(`${lang}|${t}`) ?? t);
}

// ---------------------------------------------------------------- helpers

function quickChoice(text: string, max: number): number | null {
  const m = text.trim().match(/^(\d)\b/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= max ? n : null;
}

function applyFacts(s: Session, f: Understanding['facts']) {
  const set = <K extends keyof Facts>(k: K, v: Facts[K] | null) => {
    if (v !== null && v !== undefined) s.facts[k] = v as Facts[K];
  };
  set('age', f.age);
  set('child_under_14', f.child_under_14);
  set('pregnant', f.pregnant);
  if (f.health_limits_work) s.facts.health_limits_work = f.health_limits_work === 'yes' ? true : f.health_limits_work === 'no' ? false : 'unsure';
  set('cares_for_incapacitated', f.cares_for_incapacitated);
  set('weekly_paid_hours', f.weekly_paid_hours);
  set('veteran', f.veteran);
  set('homeless', f.homeless);
  set('tribal_member', f.tribal_member);
}

/** Deterministic answer to the pending screening question (buttons, digits, yes/no). */
function deterministicAnswer(q: keyof Facts, text: string): Partial<Facts> | null {
  const t = text.trim().toLowerCase();
  const n = t.match(/^\d{1,3}(\.\d+)?$/) ? Number(t) : null;
  const kw = keyword(t);
  const c = quickChoice(t, 3);
  switch (q) {
    case 'age':
      return n !== null && n >= 10 && n <= 110 ? { age: n } : null;
    case 'weekly_paid_hours':
      return n !== null && n <= 100 ? { weekly_paid_hours: n } : null;
    case 'health_limits_work':
      if (c === 3) return { health_limits_work: 'unsure' };
    // fallthrough
    default: {
      const yes = c === 1 || kw === 'yes';
      const no = c === 2 || kw === 'no';
      if (yes || no) return { [q]: yes } as Partial<Facts>;
      return null;
    }
  }
}

function gaugeReply(s: Session, deps: AgentDeps): Reply {
  const c = monthlyCount(s, deps.ledger, deps.now);
  const deadline = endOfMonth(deps.now);
  const risk = monthRisk(c.done, GOAL, deps.now, deadline);
  const parts = [`Your hours this month: ${c.done} of ${GOAL}.`];
  const detail: string[] = [];
  if (c.paid) detail.push(`${c.paid} h paid work`);
  if (c.training) detail.push(`${c.training} h training`);
  if (c.volunteer) detail.push(`${c.volunteer} h volunteering (confirmed)`);
  if (detail.length) parts.push(`(${detail.join(' + ')})`);
  if (c.gap === 0) parts.push('You reached 80 hours. Well done! Reply ATTESTATION to get your signed proof.');
  else {
    parts.push(`You need ${c.gap} more hours before ${fmtShort(deadline)} (${risk.daysLeft} days).`);
    if (c.booked) parts.push(`${c.booked} h already booked.`);
  }
  return { text: parts.join(' '), card: { kind: 'gauge', done: c.done, goal: GOAL, daysLeft: risk.daysLeft, deadline: deadline.toISOString() } };
}

function offerSlots(s: Session, deps: AgentDeps): Reply[] {
  const c = monthlyCount(s, deps.ledger, deps.now);
  const opts: SlotOption[] = matchSlots(
    deps.sites,
    {
      home: s.home ?? ZIP_CENTROIDS['50316'],
      hasCar: !!s.hasCar,
      language: s.lang,
      age: s.facts.age,
      noLifting: s.noLifting,
      busy: s.busy,
      hoursNeeded: Math.max(4, c.gap - c.booked),
      deadline: endOfMonth(deps.now),
    },
    deps.bookedCount,
    deps.now,
  ).filter((o) => !s.bookings.some((b) => b.slotId === o.slot.id && b.occurrence === o.date.toISOString()));

  if (!opts.length) {
    deps.escalate?.(s, 'No reachable mission found');
    return [{ text: 'I could not find a mission you can reach without a car this month. I asked a navigator to help you find one. You can also reply HELP.' }];
  }
  s.offered = opts.map((o) => ({ siteId: o.site.id, slotId: o.slot.id, occurrence: o.date.toISOString() }));
  s.step = 'offer';
  const lines = opts.map((o, i) => `${i + 1} ${MISSION_LABEL[o.slot.mission]} — ${o.site.name}\n   ${fmtDate(o.date)}, ${o.slot.start}–${o.slot.end} (${o.hours} h) · ${o.reasons.join(' · ')}`);
  return [{ text: `Here are missions that fit you:\n${lines.join('\n')}\nReply 1, 2 or 3.`, quick: opts.map((_, i) => String(i + 1)) }];
}

function book(s: Session, deps: AgentDeps, idx: number): Reply[] {
  const o = s.offered[idx];
  const site = o && deps.sites.find((x) => x.id === o.siteId);
  const slot = site?.slots.find((x) => x.id === o.slotId);
  if (!o || !site || !slot) return [{ text: 'Sorry, that option is no longer available. Reply MISSIONS to see new ones.' }];
  const start = new Date(o.occurrence);
  const [eh, em] = slot.end.split(':').map(Number);
  const end = new Date(start);
  end.setHours(eh, em, 0, 0);
  const hours = (end.getTime() - start.getTime()) / 3600000;
  const opts = matchSlots([site], { home: s.home ?? ZIP_CENTROIDS['50316'], hasCar: !!s.hasCar, language: s.lang, busy: [], hoursNeeded: hours, deadline: endOfMonth(deps.now) }, () => 0, deps.now, 1);
  const travel = opts[0]?.travel.detail ?? '';
  const booking: Booking = {
    siteId: site.id, slotId: slot.id, occurrence: o.occurrence, end: end.toISOString(), hours,
    siteName: site.name, address: site.address, mission: MISSION_LABEL[slot.mission], code: site.code, travel,
  };
  s.bookings.push(booking);
  deps.record({ type: 'booking', person: s.person, siteId: site.id, slotId: slot.id, occurrence: o.occurrence, data: { firstName: s.name ?? '', hours } });
  const eve = new Date(start);
  eve.setDate(eve.getDate() - 1);
  eve.setHours(18, 0, 0, 0);
  s.reminders.push({ at: eve.toISOString(), kind: 'shift', text: `Reminder: tomorrow ${slot.start} — ${MISSION_LABEL[slot.mission]} at ${site.name}, ${site.address}. ${travel ? 'Getting there: ' + travel + '. ' : ''}At the door, scan the QR code or text ${site.code}.` });
  s.offered = [];
  s.step = 'idle';
  const c = monthlyCount(s, deps.ledger, deps.now);
  const remaining = Math.max(0, c.gap - c.booked);
  const out: Reply[] = [
    {
      text: `Booked! ${fmtDate(start)}, ${slot.start}–${slot.end}: ${MISSION_LABEL[slot.mission]} at ${site.name}, ${site.address}.${travel ? ' ' + travel + '.' : ''} I will remind you the day before. When you arrive, scan the QR code at the door, or text ${site.code}. Text it again when you leave.`,
      card: { kind: 'booking', booking },
    },
  ];
  out.push(remaining > 0 ? { text: `With this shift you will still need ${remaining} hours. Reply MISSIONS for more options.`, quick: ['MISSIONS', 'HOURS'] } : { text: 'This shift completes your 80 hours if you go. 🎉', quick: ['HOURS'] });
  return out;
}

/** The person texts a site's 4-digit code: check in, then check out. */
function checkInOut(s: Session, deps: AgentDeps, site: HostSite): Reply[] {
  const now = deps.now;
  const booking = s.bookings.find((b) => b.siteId === site.id && Math.abs(new Date(b.occurrence).getTime() - now.getTime()) < 3 * 3600000)
    ?? s.bookings.find((b) => b.siteId === site.id && now >= new Date(new Date(b.occurrence).getTime() - 3600000) && now <= new Date(new Date(b.end).getTime() + 3 * 3600000));
  if (!booking) return [{ text: `Welcome to ${site.name}! I don't see a mission booked here today. Ask the coordinator, or reply MISSIONS to book one.` }];
  const entries = deps.ledger.filter((e) => e.person === s.person && e.slotId === booking.slotId && e.occurrence === booking.occurrence);
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (!entries.some((e) => e.type === 'check_in')) {
    deps.record({ type: 'check_in', person: s.person, siteId: site.id, slotId: booking.slotId, occurrence: booking.occurrence, data: { at: now.toISOString(), via: 'code', firstName: s.name ?? '' } });
    return [{ text: `Welcome, ${s.name ?? 'friend'}! You are checked in at ${time}. Text ${site.code} again when you leave.` }];
  }
  if (!entries.some((e) => e.type === 'check_out')) {
    deps.record({ type: 'check_out', person: s.person, siteId: site.id, slotId: booking.slotId, occurrence: booking.occurrence, data: { at: now.toISOString(), via: 'code' } });
    return [{ text: `Thank you, ${s.name ?? 'friend'}! Checked out at ${time}. ${site.coordinator} will confirm your hours, then your gauge updates.` }];
  }
  return [{ text: 'You are already checked out for this mission. Thank you!' }];
}

// ---------------------------------------------------------------- main turn

export async function handle(s: Session, input: Input, deps: AgentDeps): Promise<Reply[]> {
  const english = await turn(s, input, deps);
  // Texts prefixed with U+200B are already in the person's language (e.g. letter summaries).
  const toTranslate = english.map((r) => r.text).filter((t) => !t.startsWith('\u200b'));
  const done = await translate(deps.llm, toTranslate, s.lang);
  let k = 0;
  const translated = english.map((r) => (r.text.startsWith('\u200b') ? r.text.slice(1) : done[k++]));
  const quickT = await Promise.all(english.map((r) => (r.quick && s.lang !== 'en' ? translate(deps.llm, r.quick, s.lang) : Promise.resolve(r.quick))));
  return english.map((r, i) => ({ ...r, text: translated[i], quick: quickT[i] }));
}

async function turn(s: Session, input: Input, deps: AgentDeps): Promise<Reply[]> {
  const text = (input.text ?? '').trim();

  if (s.step === 'erased') {
    Object.assign(s, newSession(s.phone, s.person, deps.now));
  }

  // 1. Letters can arrive at any moment.
  if (input.image) return handleLetter(s, input.image, deps);

  // 2. Keywords and site codes work without the AI (basic phones, outages).
  const kw = keyword(text);
  if (kw === 'delete' || kw === 'stop') {
    deps.record({ type: 'erasure', person: s.person, data: { reason: kw } });
    const lang = s.lang;
    Object.assign(s, newSession(s.phone, s.person, deps.now), { step: 'erased' as Step, lang });
    return [{ text: kw === 'stop' ? 'You will not receive any more messages. Your data is erased. Text Hi anytime to start again.' : 'Done. Everything about you is erased: name, answers, hours, reminders. Text Hi anytime to start again.' }];
  }
  if (kw === 'help') {
    deps.escalate?.(s, 'Person asked for a human');
    s.step = s.step === 'start' ? 'name' : s.step;
    return [{ text: 'A community navigator will call you within 1 business day. You can keep texting me in the meantime. If you need food today, call 2-1-1.' }];
  }
  const site = /^\d{4}$/.test(text) ? deps.sites.find((x) => x.code === text) : undefined;
  if (site) return checkInOut(s, deps, site);
  if (s.step !== 'start' && s.step !== 'name') {
    if (kw === 'hours') return [gaugeReply(s, deps)];
    if (kw === 'missions' && s.home) return offerSlots(s, deps);
    if (kw === 'attestation') return attestation(s, deps);
  }

  switch (s.step) {
    case 'start': {
      const u = text ? await understand(s, deps, text, '(first message)') : null;
      if (u && u.language !== 'other') s.lang = u.language;
      s.step = 'name';
      const langs = LANGUAGES.map((l) => l.native).join(' · ');
      const out: Reply[] = [
        { text: "Hi! I'm Count Me In. I help you keep your food assistance (SNAP) under the new 80-hour rule — for free, by text or by phone call." },
        { text: `Private by design: I only keep your first name, phone, language and hours. Nothing goes to the State without your YES. Reply DELETE anytime to erase everything, or HELP to talk to a person.\nI speak: ${langs}.` },
      ];
      if (u?.first_name) {
        s.name = u.first_name;
        return [...out, ...startScreening(s, deps)];
      }
      out.push({ text: "What's your first name?" });
      return out;
    }

    case 'name': {
      let name = text.split(/\s+/).length <= 2 && /^[\p{L}'-]+(\s[\p{L}'-]+)?$/u.test(text) ? text : null;
      if (!name) {
        const u = await understand(s, deps, text, "What's your first name?");
        if (u.language !== 'other' && text.split(/\s+/).length > 2) s.lang = u.language;
        name = u.first_name;
        if (!name) return [{ text: "Sorry, I didn't catch your first name. What should I call you?" }];
      }
      s.name = name.charAt(0).toUpperCase() + name.slice(1);
      return startScreening(s, deps);
    }

    case 'screen': {
      const q = s.pendingQuestion!;
      const det = deterministicAnswer(q, text);
      if (det) Object.assign(s.facts, det);
      else {
        const u = await understand(s, deps, text, QUESTIONS[q].text);
        if (u.language !== 'other' && text.split(/\s+/).length > 2) s.lang = u.language;
        applyFacts(s, u.facts);
        if (u.choice && QUESTIONS[q].quick) {
          const v = deterministicAnswer(q, String(u.choice));
          if (v) Object.assign(s.facts, v);
        }
        if (u.intent === 'question' && u.question_answer && s.facts[q] === undefined) {
          return [{ text: u.question_answer }, { text: QUESTIONS[q].text, quick: QUESTIONS[q].quick }];
        }
        if (s.facts[q] === undefined) return [{ text: `Sorry, I didn't understand. ${QUESTIONS[q].text}`, quick: QUESTIONS[q].quick }];
      }
      return continueScreening(s, deps);
    }

    case 'training': {
      const n = text.match(/^\d{1,3}$/) ? Number(text) : null;
      if (n !== null) s.trainingHoursMonth = n;
      else {
        const u = await understand(s, deps, text, 'How many hours of training or English class do you have this month?');
        s.trainingHoursMonth = u.monthly_training_hours ?? (u.intent === 'no' ? 0 : 0);
      }
      s.step = 'zip';
      return [gaugeReply(s, deps), { text: "Volunteering counts hour for hour. Let's find missions near you. What's your ZIP code?" }];
    }

    case 'zip': {
      let zip = text.match(/\b5\d{4}\b/)?.[0] ?? null;
      if (!zip) zip = (await understand(s, deps, text, "What's your ZIP code?")).zip;
      const c = zip ? ZIP_CENTROIDS[zip] : undefined;
      if (!zip) return [{ text: 'Please send your 5-digit ZIP code, like 50316.' }];
      s.zip = zip;
      s.home = c ?? ZIP_CENTROIDS['50309'];
      s.step = 'car';
      return [{ text: `${c ? c.label + ', got it.' : 'Thanks.'} Do you have a car you can use?\n1 Yes\n2 No — I walk or take the bus`, quick: ['1 Yes', '2 No'] }];
    }

    case 'car': {
      const c = quickChoice(text, 2) ?? (keyword(text) === 'yes' ? 1 : keyword(text) === 'no' ? 2 : null);
      if (c) s.hasCar = c === 1;
      else {
        const u = await understand(s, deps, text, 'Do you have a car you can use? 1 Yes 2 No');
        s.hasCar = u.has_car ?? false;
        if (u.no_lifting !== null) s.noLifting = u.no_lifting;
      }
      s.step = 'availability';
      return [{ text: 'When are you NOT available? For example: "weekday mornings" or "Tuesdays after 2pm".\n1 I am free anytime', quick: ['1 Anytime', 'Weekday mornings', 'Evenings'] }];
    }

    case 'availability': {
      if (quickChoice(text, 1) === 1) s.busy = [];
      else {
        const u = await understand(s, deps, text, 'When are you NOT available?');
        s.busy = u.busy ?? [];
        if (u.no_lifting !== null) s.noLifting = u.no_lifting;
      }
      return offerSlots(s, deps);
    }

    case 'offer': {
      let c = quickChoice(text, s.offered.length);
      if (!c) {
        const u = await understand(s, deps, text, `Choose a mission: reply 1 to ${s.offered.length}.`);
        c = u.choice && u.choice <= s.offered.length ? u.choice : null;
        if (!c) return [{ text: `Reply ${s.offered.map((_, i) => i + 1).join(', ')} to choose, or MISSIONS for other options.` }];
      }
      return book(s, deps, c - 1);
    }

    case 'share_confirm': {
      const k = keyword(text);
      const c = quickChoice(text, 2);
      const yes = c === 1 || k === 'yes' || (!c && !k && (await understand(s, deps, text, 'Send your attestation to Iowa HHS? 1 YES or 2 NO')).intent === 'yes');
      s.step = 'idle';
      if (yes) {
        deps.record({ type: 'consent', person: s.person, data: { scope: 'send_attestation_to_state', month: monthKey(deps.now), url: s.attestationUrl } });
        s.sharedWithState = [...(s.sharedWithState ?? []), monthKey(deps.now)];
        return [{ text: 'Sent to Iowa HHS with your consent (logged). Keep your copy too. In this hackathon demo the sending is simulated; in the pilot it uses the secure channel agreed with Iowa HHS.' }];
      }
      return [{ text: 'OK, nothing was sent. You can print it at the pantry or upload it yourself on the State portal.' }];
    }

    case 'escalated':
    case 'idle':
    default: {
      if (!text) return [];
      const u = await understand(s, deps, text, '(free conversation)');
      if (u.language !== 'other' && text.split(/\s+/).length > 2) s.lang = u.language;
      applyFacts(s, u.facts);
      if (u.intent === 'hours') return [gaugeReply(s, deps)];
      if (u.intent === 'missions') return s.home ? offerSlots(s, deps) : (s.step = 'zip', [{ text: "What's your ZIP code?" }]);
      if (u.intent === 'attestation') return attestation(s, deps);
      if (u.intent === 'help') {
        deps.escalate?.(s, 'Person asked for a human');
        return [{ text: 'A community navigator will call you within 1 business day.' }];
      }
      if (u.intent === 'delete') return turn(s, { text: 'DELETE' }, deps);
      if (u.question_answer) return [{ text: u.question_answer }];
      return [{ text: 'I can show your HOURS, find MISSIONS, explain a letter (send a photo), or get your ATTESTATION. Reply HELP for a person.', quick: ['HOURS', 'MISSIONS', 'ATTESTATION'] }];
    }
  }
}

function startScreening(s: Session, deps: AgentDeps): Reply[] {
  s.step = 'screen';
  return [{ text: `Nice to meet you, ${s.name}! First, let's see if the new rule applies to you. 6 quick questions, one at a time.` }, ...continueScreening(s, deps)];
}

function continueScreening(s: Session, deps: AgentDeps): Reply[] {
  const q = nextQuestion(deps.rules, s.facts);
  if (q) {
    s.pendingQuestion = q;
    return [{ text: QUESTIONS[q].text, quick: QUESTIONS[q].quick }];
  }
  s.pendingQuestion = undefined;
  const d = decide(deps.rules, s.facts);
  s.decision = d;
  const cite = d.cite ? ` (Rule: ${d.cite.title.split(' — ')[0]}.)` : '';
  const notices = d.removedNotices.map((n) => ({ text: `Good to know: ${n.plain}` }));
  switch (d.outcome) {
    case 'exempt':
    case 'not_covered':
      s.step = 'idle';
      return [{ text: `Good news: ${d.plain}${cite} You do not need to log hours. If you still want to volunteer, reply MISSIONS.`, card: { kind: 'decision', decision: d } }, ...notices];
    case 'likely_exempt':
      s.step = 'idle';
      deps.escalate?.(s, `Possible exemption: ${d.ruleId}`);
      s.reminders.push({ at: new Date(deps.now.getTime() + 3 * 86400000).toISOString(), kind: 'deadline', text: `Reminder: send your proof to Iowa HHS so your exemption is recorded: ${d.proof ?? ''}` });
      return [
        { text: `You are probably exempt: ${d.plain}${cite} To make it official, send Iowa HHS: ${d.proof ?? 'proof of your situation'}. A navigator will help you — they will call you.`, card: { kind: 'decision', decision: d } },
        ...notices,
      ];
    case 'needs_review':
      s.step = 'escalated';
      deps.escalate?.(s, 'Screening needs human review');
      return [{ text: `${d.plain} A navigator will call you within 1 business day. Meanwhile, keep any medical papers you have.`, card: { kind: 'decision', decision: d } }, ...notices];
    case 'subject':
    default: {
      s.step = 'training';
      const paid = Math.round((s.facts.weekly_paid_hours ?? 0) * 4.33);
      return [
        { text: "The 80-hour rule applies to you. Don't worry: work, training and volunteering all count, in any mix. I will help you get there.", card: { kind: 'decision', decision: d } },
        ...notices,
        { text: `${paid ? `Your paid work gives about ${paid} hours a month. ` : ''}Do you have training or English class hours this month? Send the number (0 if none).`, quick: ['0'] },
      ];
    }
  }
}

async function handleLetter(s: Session, image: { base64: string; mediaType: string }, deps: AgentDeps): Promise<Reply[]> {
  const reading = await readLetter(deps.llm, image, s.lang, deps.now);
  s.letters.push({ ...reading, at: deps.now.toISOString() });
  if (!reading.is_official_letter || reading.confidence === 'low') {
    return [{ text: 'I could not read this letter well. Try another photo in good light, flat on a table — or reply HELP and a navigator will read it with you.' }];
  }
  const lines = [`📄 ${reading.letter_type} — ${reading.sender}`, ...reading.summary.map((x) => `• ${x}`)];
  if (reading.deadline) lines.push(`⏰ Deadline: ${fmtDate(new Date(reading.deadline + 'T12:00:00'))}`);
  lines.push(`✅ ${reading.action}`);
  if (reading.phone_to_call) lines.push(`📞 ${reading.phone_to_call}`);
  if (reading.deadline) {
    const at = new Date(reading.deadline + 'T09:00:00');
    at.setDate(at.getDate() - 3);
    s.reminders.push({ at: at.toISOString(), kind: 'deadline', text: `Reminder: your letter "${reading.letter_type}" has a deadline in 3 days (${reading.deadline}).` });
  }
  // The letter text is already in the person's language: send it untranslated (marker prefix).
  const out: Reply[] = [{ text: '​' + lines.join('\n'), card: { kind: 'letter', reading } }];
  if (reading.deadline) out.push({ text: 'I set a reminder 3 days before the deadline.' });
  if (reading.mentions_work_requirement && s.step === 'screen' && s.pendingQuestion) {
    out.push({ text: `Let's continue so you know exactly what to do. ${QUESTIONS[s.pendingQuestion].text}`, quick: QUESTIONS[s.pendingQuestion].quick });
  } else if (reading.mentions_work_requirement && (s.step === 'start' || s.step === 'name')) {
    out.push({ text: "Let's check together if this rule applies to you. What's your first name?" });
    s.step = 'name';
  }
  return out;
}

async function attestation(s: Session, deps: AgentDeps): Promise<Reply[]> {
  if (!deps.issueAttestation) return [{ text: 'Attestations are not available on this channel yet.' }];
  const c = monthlyCount(s, deps.ledger, deps.now);
  if (!c.volunteer && !c.training && !c.paid) return [{ text: 'You have no confirmed hours yet this month. Your attestation will be ready after your first mission.' }];
  const url = await deps.issueAttestation(s);
  s.attestationUrl = url;
  s.step = 'share_confirm';
  return [
    { text: `Your signed attestation for ${deps.now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} is ready: ${c.done} hours. Anyone at Iowa HHS can check it in one second with its QR code.`, card: { kind: 'attestation', url } },
    { text: 'Do you want me to send it to Iowa HHS for you? Nothing is sent without your YES.\n1 YES, send it\n2 NO, I will hand it in myself', quick: ['1 YES', '2 NO'] },
  ];
}

/** Proactive messages: reminders that are due, and month-at-risk nudges. */
export function tick(s: Session, deps: Pick<AgentDeps, 'ledger' | 'now'>): string[] {
  const out: string[] = [];
  for (const r of s.reminders) {
    if (!r.sent && new Date(r.at) <= deps.now) {
      r.sent = true;
      out.push(r.text);
    }
  }
  if (s.decision?.outcome === 'subject' && deps.now.getDate() >= 20) {
    const key = `risk-${monthKey(deps.now)}`;
    if (!s.reminders.some((r) => r.text === key)) {
      const c = monthlyCount(s, deps.ledger, deps.now);
      if (c.gap - c.booked > 0) {
        s.reminders.push({ at: deps.now.toISOString(), kind: 'risk', text: key, sent: true });
        out.push(`${s.name ?? 'Hi'}, you are at ${c.done} of 80 hours and the month ends soon. Reply MISSIONS and I will find shifts that fit, or HELP to talk to a person.`);
      }
    }
  }
  return out;
}
