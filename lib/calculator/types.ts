export interface CalculatorInputs {
  sharePct: number;                        // e.g. 5 (means 5%)
  upfrontCents: number;                    // purchase price for the share
  ongoingCentsPerPctPerWeek: number;       // weekly training cost per 1% share
  racesPerYear: number;                    // estimated race starts
  raceStartCostCents: number;              // cost per start per 1% share
  yearsHorizon: 1 | 2 | 3;
}

export interface CalculatorOutputs {
  ongoingCentsPerWeek: number;
  ongoingCentsPerYear: number;
  raceStartCostPerYear: number;
  totalYearlyCost: number;
  totalProjectedCost: number;
  breakEvenPrizemoney: number;             // gross horse prizemoney needed to break even
  monthlyCommitment: number;
  weeklyCost: number;
}

export interface CalculatorSeed {
  /** From the highest-view-count active horse with shares available */
  sharePct: number;
  upfrontCents: number;
  ongoingCentsPerPctPerWeek: number;
  horseName: string | null;
  horseSlug: string;
}
