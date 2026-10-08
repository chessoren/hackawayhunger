import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { decide, evaluate, nextQuestion, parseRules } from '../src/core/rules';
import { append, verifyChain, shifts, validatedHours, LedgerEntry } from '../src/core/ledger';
import { newKeyPair, canonical, sign, fingerprint } from '../src/core/crypto';
import { encodeAttestation, verifyAttestation, totals, AttestationPayload } from '../src/core/attestation';
import { matchSlots, busTrip, walkMinutes } from '../src/core/matching';
import { DEMO_SITES, ZIP_CENTROIDS } from '../src/data/sites';
import { computeImpact, DEFAULT_ASSUMPTIONS, kSafe } from '../src/core/impact';
import { countyOpportunities } from '../src/core/deserts';
import { keyword } from '../src/core/i18n';

const rules = parseRules(readFileSync('rules/iowa.yaml', 'utf8'));

describe('rules engine (Iowa)', () => {
  it('asks age first, then the household question', () => {
    expect(nextQuestion(rules, {})).toBe('age');
    expect(nextQuestion(rules, { age: 58 })).toBe('child_under_14');
  });
  it('Linda (58, no child, 10 h/week) is subject to the rule, citing the regulation', () => {
    const d = decide(rules, { age: 58, child_under_14: false, pregnant: false, health_limits_work: false, cares_for_incapacitated: false, weekly_paid_hours: 10 });
    expect(d.outcome).toBe('subject');
    expect(d.cite?.id).toBe('CFR-273.24');
  });
  it('a parent of a child under 14 is exempt', () => {
    expect(decide(rules, { age: 40, child_under_14: true }).outcome).toBe('exempt');
  });
  it('health condition → likely exempt with proof', () => {
    const d = decide(rules, { age: 50, child_under_14: false, pregnant: false, health_limits_work: true });
    expect(d.outcome).toBe('likely_exempt');
    expect(d.proof).toMatch(/medical/);
  });
  it('unsure health → human review', () => {
    const d = decide(rules, { age: 50, child_under_14: false, pregnant: false, health_limits_work: 'unsure', cares_for_incapacitated: false, weekly_paid_hours: 0 });
    expect(d.outcome).toBe('needs_review');
  });
  it('65+ exempt; veterans warned the exemption was removed', () => {
    expect(decide(rules, { age: 66 }).outcome).toBe('exempt');
    const d = decide(rules, { age: 45, veteran: true, child_under_14: false, pregnant: false, health_limits_work: false, cares_for_incapacitated: false, weekly_paid_hours: 0 });
    expect(d.outcome).toBe('subject');
    expect(d.removedNotices[0].id).toBe('veteran');
  });
  it('30 h/week of paid work meets the requirement', () => {
    expect(decide(rules, { age: 30, child_under_14: false, pregnant: false, health_limits_work: false, cares_for_incapacitated: false, weekly_paid_hours: 32 }).outcome).toBe('exempt');
  });
  it('evaluates and/or conditions with unknowns', () => {
    expect(evaluate('age >= 18 and age <= 64', { age: 40 })).toBe(true);
    expect(evaluate('age >= 18 and age <= 64', {})).toBe(null);
    expect(evaluate('age < 18 or age >= 65', { age: 70 })).toBe(true);
  });
});

describe('signed ledger', () => {
  it('detects any modification and verifies coordinator signatures', () => {
    const k = newKeyPair();
    const chain: LedgerEntry[] = [];
    const base = { person: 'p_1', siteId: 'grace', slotId: 'grace-tue-am', occurrence: '2026-10-13T14:00:00.000Z' };
    chain.push(append(chain, { ...base, ts: '1', type: 'booking', data: {} }));
    chain.push(append(chain, { ...base, ts: '2', type: 'check_in', data: {} }));
    chain.push(append(chain, { ...base, ts: '3', type: 'validation', data: { hours: 4 } }, k));
    expect(verifyChain(chain).ok).toBe(true);
    expect(validatedHours(chain, 'p_1', '2026-10')).toBe(4);
    expect(shifts(chain)[0].status).toBe('validated');
    const forged = structuredClone(chain);
    forged[2].data.hours = 40;
    expect(verifyChain(forged)).toMatchObject({ ok: false, brokenAt: 2 });
  });
  it('erasure removes a person from computed shifts', () => {
    const chain: LedgerEntry[] = [];
    chain.push(append(chain, { person: 'p_2', siteId: 's', slotId: 'x', occurrence: 'o', ts: '1', type: 'booking', data: {} }));
    chain.push(append(chain, { person: 'p_2', ts: '2', type: 'erasure', data: {} }));
    expect(shifts(chain)).toHaveLength(0);
  });
});

describe('attestation', () => {
  const k = newKeyPair();
  const it_ = [{ d: '2026-10-13', s: 'Grace', mi: 'Food distribution', in: '09:00', out: '13:00', h: 4, c: 'Pastor Dave', cat: 'volunteer' as const }];
  const payload: AttestationPayload = { v: 1, id: 'X', st: 'IA', n: 'Linda', m: '2026-10', iss: 'now', rv: 'IA', goal: 80, it: it_, tot: totals(it_), pk: fingerprint(k.publicKey) };
  const signed = { payload, sig: sign(canonical(payload), k.secretKey), publicKey: k.publicKey };
  it('verifies an authentic attestation', () => {
    expect(verifyAttestation(encodeAttestation(signed), [k.publicKey]).status).toBe('authentic');
  });
  it('rejects a modified attestation', () => {
    const bad = { ...signed, payload: { ...payload, it: [{ ...it_[0], h: 40 }], tot: totals([{ ...it_[0], h: 40 }]) } };
    expect(verifyAttestation(encodeAttestation(bad), [k.publicKey]).status).toBe('tampered');
  });
  it('rejects a document signed by an unknown key', () => {
    expect(verifyAttestation(encodeAttestation(signed), [newKeyPair().publicKey]).status).toBe('tampered');
  });
});

describe('matching', () => {
  it('finds at most 3 reachable missions without a car, from East Des Moines', () => {
    const now = new Date('2026-10-08T15:00:00');
    const opts = matchSlots(DEMO_SITES, { home: ZIP_CENTROIDS['50316'], hasCar: false, language: 'es', busy: [], hoursNeeded: 22, deadline: new Date('2026-10-31T23:00:00') }, () => 0, now);
    expect(opts.length).toBe(3);
    expect(new Set(opts.map((o) => o.site.id)).size).toBe(3);
    expect(opts.every((o) => o.travel.mode !== 'car')).toBe(true);
    expect(opts.find((o) => o.site.id === 'corteva-days')).toBeUndefined();
  });
  it('estimates walking and bus times', () => {
    expect(walkMinutes(ZIP_CENTROIDS['50316'], DEMO_SITES[0])).toBeLessThan(15);
    expect(busTrip(ZIP_CENTROIDS['50315'], { lat: 41.5862, lng: -93.6302 })).not.toBeNull();
  });
  it('respects busy windows', () => {
    const now = new Date('2026-10-08T15:00:00');
    const busyAll = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, start: '00:00', end: '23:59' }));
    expect(matchSlots(DEMO_SITES, { home: ZIP_CENTROIDS['50316'], hasCar: true, language: 'en', busy: busyAll, hoursNeeded: 10, deadline: new Date('2026-10-31') }, () => 0, now)).toHaveLength(0);
  });
});

describe('impact & privacy', () => {
  it('reproduces the pitch formula', () => {
    const r = computeImpact(DEFAULT_ASSUMPTIONS);
    expect(r.peopleKept).toBe(150);
    expect(Math.round(r.aidPreservedPerYear)).toBe(303318);
  });
  it('never shows cells under 10', () => {
    expect(kSafe(3)).toBe('<10');
    expect(kSafe(12)).toBe('12');
  });
  it('computes opportunity levels for all 99 Iowa counties', () => {
    const rows = countyOpportunities(DEMO_SITES);
    expect(rows).toHaveLength(99);
    expect(rows.some((r) => r.level === 'desert')).toBe(true);
  });
  it('recognizes keywords in several languages', () => {
    expect(keyword('AIDE')).toBe('help');
    expect(keyword('borrar')).toBe('delete');
    expect(keyword('Sí')).toBe('yes');
  });
});
