/**
 * Impact model. Every number on the dashboard comes from a formula a judge can
 * redo in their head. Assumptions are editable in the UI and cited here.
 */

export interface ImpactAssumptions {
  peopleSupported: number; // people accompanied in the first year
  shareWouldLose: number; // share who would lose SNAP without a tool
  shareKeptWithTool: number; // of those, share who keep it thanks to the tool
  avgMonthlyBenefit: number; // USD per person
  volunteerHoursPerMonth: number; // average volunteer hours per kept person
  costPerMeal: number; // USD
  volunteerHourValue: number; // USD
}

export const DEFAULT_ASSUMPTIONS: ImpactAssumptions = {
  peopleSupported: 500,
  shareWouldLose: 0.4,
  shareKeptWithTool: 0.75,
  // Iowa HHS, May 2026: average SNAP benefit $168.51 per person per month (via KCRG, July 2026)
  avgMonthlyBenefit: 168.51,
  volunteerHoursPerMonth: 20,
  // Feeding America Map the Meal Gap 2025 (Iowa): $248.3M / 73M meals ≈ $3.40 per meal
  costPerMeal: 3.4,
  // Independent Sector, value of a volunteer hour (national estimate)
  volunteerHourValue: 34.79,
};

export const ASSUMPTION_SOURCES: Record<keyof ImpactAssumptions, string> = {
  peopleSupported: 'Pilot volume target across 3–5 DMARC-network host sites',
  shareWouldLose: 'Research on exits linked to work requirements (pilot will measure)',
  shareKeptWithTool: 'Pilot target — measured at 3, 6 and 12 months',
  avgMonthlyBenefit: 'Iowa HHS, May 2026 average benefit per person ($168.51)',
  volunteerHoursPerMonth: 'Typical gap between paid hours and 80 h',
  costPerMeal: 'Map the Meal Gap 2025, Iowa: $248.3M ÷ 73M meals',
  volunteerHourValue: 'Independent Sector value of volunteer time',
};

export interface ImpactResult {
  peopleKept: number;
  aidPreservedPerYear: number;
  mealsPreservedPerYear: number;
  volunteerHoursPerYear: number;
  volunteerValuePerYear: number;
}

export function computeImpact(a: ImpactAssumptions): ImpactResult {
  const peopleKept = Math.round(a.peopleSupported * a.shareWouldLose * a.shareKeptWithTool);
  const aidPreservedPerYear = peopleKept * a.avgMonthlyBenefit * 12;
  const volunteerHoursPerYear = peopleKept * a.volunteerHoursPerMonth * 12;
  return {
    peopleKept,
    aidPreservedPerYear,
    mealsPreservedPerYear: Math.round(aidPreservedPerYear / a.costPerMeal),
    volunteerHoursPerYear,
    volunteerValuePerYear: volunteerHoursPerYear * a.volunteerHourValue,
  };
}

/** k-anonymity rule for the public dashboard: never show a cell under 10 people. */
export const K_MIN = 10;
export function kSafe(n: number): string {
  return n < K_MIN ? `<${K_MIN}` : n.toLocaleString('en-US');
}

export const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
