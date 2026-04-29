import type { CalculatorInputs, CalculatorOutputs } from './types';

export const DEFAULT_INPUTS: CalculatorInputs = {
  sharePct: 5,
  upfrontCents: 500_000,            // $5,000
  ongoingCentsPerPctPerWeek: 4_000, // $40/wk per 1% → $200/wk for 5%
  racesPerYear: 10,
  raceStartCostCents: 50_000,       // $500/start per 1%
  yearsHorizon: 3,
};

export function computeCalculator(inputs: CalculatorInputs): CalculatorOutputs {
  const {
    sharePct,
    upfrontCents,
    ongoingCentsPerPctPerWeek,
    racesPerYear,
    raceStartCostCents,
    yearsHorizon,
  } = inputs;

  const ongoingCentsPerWeek = Math.round(ongoingCentsPerPctPerWeek * sharePct);
  const ongoingCentsPerYear = Math.round(ongoingCentsPerWeek * 52);
  // raceStartCostCents is per 1% share per start
  const raceStartCostPerYear = Math.round(raceStartCostCents * (sharePct / 100) * racesPerYear);
  const totalYearlyCost = ongoingCentsPerYear + raceStartCostPerYear;
  const totalProjectedCost = upfrontCents + totalYearlyCost * yearsHorizon;
  const breakEvenPrizemoney = Math.round(totalProjectedCost / (sharePct / 100));
  const monthlyCommitment = Math.round(totalYearlyCost / 12);
  const weeklyCost = Math.round(
    ongoingCentsPerWeek + (raceStartCostCents * (sharePct / 100) * racesPerYear) / 52,
  );

  return {
    ongoingCentsPerWeek,
    ongoingCentsPerYear,
    raceStartCostPerYear,
    totalYearlyCost,
    totalProjectedCost,
    breakEvenPrizemoney,
    monthlyCommitment,
    weeklyCost,
  };
}
