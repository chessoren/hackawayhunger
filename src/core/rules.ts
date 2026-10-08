import { load as yamlLoad } from 'js-yaml';

/** Facts the agent collects. The AI fills these from free text; the evaluator decides. */
export interface Facts {
  age?: number;
  child_under_14?: boolean;
  pregnant?: boolean;
  health_limits_work?: boolean | 'unsure';
  cares_for_incapacitated?: boolean;
  tribal_member?: boolean;
  weekly_paid_hours?: number;
  veteran?: boolean;
  homeless?: boolean;
  former_foster_youth?: boolean;
}

export type Outcome = 'exempt' | 'likely_exempt' | 'needs_review' | 'subject' | 'not_covered';

export interface Rule {
  id: string;
  when: string;
  outcome: Exclude<Outcome, 'subject' | 'not_covered'>;
  cite: string;
  plain: string;
  proof?: string;
}

export interface Source { id: string; title: string; url: string }

export interface RuleSet {
  state: string;
  name: string;
  agency: string;
  version: string;
  effective_date: string;
  sources: Source[];
  requirement: {
    hours_per_month: number;
    plain: string;
    cite: string;
    time_limit_plain: string;
    countable_activities: { id: string; label: string }[];
  };
  exemptions: Rule[];
  removed_exemptions: { id: string; plain: string; cite: string }[];
  covered_population: { when: string; plain: string; cite: string };
}

export interface Decision {
  outcome: Outcome;
  ruleId: string | null;
  plain: string;
  proof?: string;
  cite: Source | undefined;
  /** Exemptions the person may believe in but that were removed by the 2025 law. */
  removedNotices: { id: string; plain: string; cite: Source | undefined }[];
  /** Facts that were needed but missing — the agent must ask before deciding. */
  missing: string[];
  rulesVersion: string;
}

export function parseRules(text: string): RuleSet {
  return yamlLoad(text) as RuleSet;
}

type Value = number | boolean | string | undefined;

function literal(raw: string): Value {
  const t = raw.trim();
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return t.replace(/^['"]|['"]$/g, '');
}

/** Evaluate one comparison. Returns null when the fact is unknown. */
function compare(expr: string, facts: Record<string, Value>, missing: Set<string>): boolean | null {
  const m = expr.trim().match(/^([a-z_0-9]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/i);
  if (!m) throw new Error(`Invalid rule condition: "${expr}"`);
  const [, field, op, rawValue] = m;
  const actual = facts[field];
  if (actual === undefined || actual === null) {
    missing.add(field);
    return null;
  }
  const expected = literal(rawValue);
  switch (op) {
    case '==': return actual === expected;
    case '!=': return actual !== expected;
    case '>=': return Number(actual) >= Number(expected);
    case '<=': return Number(actual) <= Number(expected);
    case '>': return Number(actual) > Number(expected);
    case '<': return Number(actual) < Number(expected);
  }
  return null;
}

/** Evaluate "a and b or c" with standard precedence (and binds tighter). Unknown → null. */
export function evaluate(condition: string, facts: Facts, missing = new Set<string>()): boolean | null {
  const f = facts as Record<string, Value>;
  const ors = condition.split(/\s+or\s+/i);
  let sawUnknown = false;
  for (const clause of ors) {
    const ands = clause.split(/\s+and\s+/i).map((e) => compare(e, f, missing));
    if (ands.some((v) => v === false)) continue;
    if (ands.every((v) => v === true)) return true;
    sawUnknown = true;
  }
  return sawUnknown ? null : false;
}

/** Fields the screening needs, in the order the agent asks them. */
export const SCREENING_ORDER: (keyof Facts)[] = [
  'age',
  'child_under_14',
  'pregnant',
  'health_limits_work',
  'cares_for_incapacitated',
  'weekly_paid_hours',
];

export function decide(rules: RuleSet, facts: Facts): Decision {
  const source = (id: string) => rules.sources.find((s) => s.id === id);
  const removedNotices = rules.removed_exemptions
    .filter((r) => (r.id === 'veteran' && facts.veteran) || (r.id === 'homeless' && facts.homeless) || (r.id === 'former_foster_youth' && facts.former_foster_youth))
    .map((r) => ({ id: r.id, plain: r.plain, cite: source(r.cite) }));

  const base = { removedNotices, rulesVersion: `${rules.state} ${rules.version}` };

  for (const rule of rules.exemptions) {
    const missing = new Set<string>();
    const hit = evaluate(rule.when, facts, missing);
    if (hit === true) {
      return { ...base, outcome: rule.outcome, ruleId: rule.id, plain: rule.plain, proof: rule.proof, cite: source(rule.cite), missing: [] };
    }
    if (hit === null) {
      // A rule we cannot evaluate yet: is the fact one we still plan to ask?
      const askable = [...missing].filter((m) => SCREENING_ORDER.includes(m as keyof Facts));
      if (askable.length) {
        return { ...base, outcome: 'needs_review', ruleId: null, plain: '', cite: undefined, missing: askable };
      }
    }
  }

  const covered = evaluate(rules.covered_population.when, facts);
  if (covered === false) {
    return { ...base, outcome: 'not_covered', ruleId: 'covered_population', plain: 'The 80-hour rule does not apply to your age group.', cite: source(rules.covered_population.cite), missing: [] };
  }
  return {
    ...base,
    outcome: 'subject',
    ruleId: 'requirement',
    plain: `You are covered by the work rule: ${rules.requirement.plain}`,
    cite: source(rules.requirement.cite),
    missing: [],
  };
}

/** The next screening question still unanswered, or null when screening is complete. */
export function nextQuestion(rules: RuleSet, facts: Facts): keyof Facts | null {
  const d = decide(rules, facts);
  if (d.missing.length) return d.missing[0] as keyof Facts;
  return null;
}
