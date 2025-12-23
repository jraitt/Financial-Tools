// ACA Premium Tax Credit Calculation Logic
// Based on IRS Form 8962 Instructions and HHS Poverty Guidelines
// For a given tax year's PTC calculation, the FPL from the prior calendar year is used.

export type FplLocation = 'CONTIGUOUS_48' | 'ALASKA' | 'HAWAII';

export interface PTCInputs {
  taxYear: number;
  familySize: number;
  magi: number;
  location: FplLocation;
  slcspMonthlyPremium: number;
  subsidyCliff: boolean;
}

export interface PTCResults {
  fpl: number;
  fplPercentage: number;
  applicableFigure: number;
  annualContribution: number;
  monthlyContribution: number;
  totalAllowedPTC: number;
  monthlyPTC: number;
  isEligible: boolean;
  eligibilityMessage: string;
}

interface FplYearData {
  table: { [key: number]: number };
  perAdditional: number;
}

// FPL 2023 - Used for tax year 2024
const FPL_2023: Record<FplLocation, FplYearData> = {
  CONTIGUOUS_48: {
    table: { 1: 14580, 2: 19720, 3: 24860, 4: 30000, 5: 35140, 6: 40280, 7: 45420, 8: 50560 },
    perAdditional: 5140
  },
  ALASKA: {
    table: { 1: 18210, 2: 24640, 3: 31070, 4: 37500, 5: 43930, 6: 50360, 7: 56790, 8: 63220 },
    perAdditional: 6430
  },
  HAWAII: {
    table: { 1: 16770, 2: 22680, 3: 28590, 4: 34500, 5: 40410, 6: 46320, 7: 52230, 8: 58140 },
    perAdditional: 5910
  },
};

// FPL 2024 - Used for tax year 2025
const FPL_2024: Record<FplLocation, FplYearData> = {
  CONTIGUOUS_48: {
    table: { 1: 15060, 2: 20440, 3: 25820, 4: 31200, 5: 36580, 6: 41960, 7: 47340, 8: 52720 },
    perAdditional: 5380
  },
  ALASKA: {
    table: { 1: 18810, 2: 25550, 3: 32290, 4: 39030, 5: 45770, 6: 52510, 7: 59250, 8: 65990 },
    perAdditional: 6740
  },
  HAWAII: {
    table: { 1: 17310, 2: 23500, 3: 29690, 4: 35880, 5: 42070, 6: 48260, 7: 54450, 8: 60640 },
    perAdditional: 6190
  },
};

// FPL 2025 - Used for tax year 2026
// Source: https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines/2025-poverty-guidelines
const FPL_2025: Record<FplLocation, FplYearData> = {
  CONTIGUOUS_48: {
    table: { 1: 15600, 2: 21150, 3: 26700, 4: 32250, 5: 37800, 6: 43350, 7: 48900, 8: 54450 },
    perAdditional: 5550
  },
  ALASKA: {
    table: { 1: 19500, 2: 26430, 3: 33360, 4: 40290, 5: 47220, 6: 54150, 7: 61080, 8: 68010 },
    perAdditional: 6930
  },
  HAWAII: {
    table: { 1: 17940, 2: 24320, 3: 30700, 4: 37080, 5: 43460, 6: 49840, 7: 56220, 8: 62600 },
    perAdditional: 6380
  },
};

const FPL_DATA_BY_TAX_YEAR: { [key: number]: Record<FplLocation, FplYearData> } = {
  2024: FPL_2023,
  2025: FPL_2024,
  2026: FPL_2025,
};

/**
 * Get the Federal Poverty Level for a given family size, tax year, and location
 */
export function getFPL(familySize: number, taxYear: number, location: FplLocation): number {
  const yearData = FPL_DATA_BY_TAX_YEAR[taxYear]?.[location] || FPL_DATA_BY_TAX_YEAR[2026][location];
  if (!yearData) return 0;

  const { table, perAdditional } = yearData;

  if (familySize <= 0) return 0;
  if (table[familySize]) {
    return table[familySize];
  }
  // For family sizes > 8, use base for 8 + per additional person
  const baseFor8 = table[8];
  const additionalPeople = familySize - 8;
  return baseFor8 + additionalPeople * perAdditional;
}

// Applicable Figure Table for calculating contribution amount
// Based on MAGI as a percentage of FPL. This table is valid for tax years 2023-2025
// due to the Inflation Reduction Act, and is assumed to apply for 2026 as well.
const APPLICABLE_FIGURE_TABLE = [
  { fpl_min: 0, fpl_max: 150, start_percent: 0.0, end_percent: 0.0 },
  { fpl_min: 150, fpl_max: 200, start_percent: 0.0, end_percent: 2.0 },
  { fpl_min: 200, fpl_max: 250, start_percent: 2.0, end_percent: 4.0 },
  { fpl_min: 250, fpl_max: 300, start_percent: 4.0, end_percent: 6.0 },
  { fpl_min: 300, fpl_max: 400, start_percent: 6.0, end_percent: 8.5 },
  { fpl_min: 400, fpl_max: Infinity, start_percent: 8.5, end_percent: 8.5 },
];

/**
 * Get the Applicable Figure (contribution percentage) based on FPL percentage
 * @param fplPercentage - Income as percentage of FPL
 * @param useCliffLogic - Whether to use the pre-ARPA "subsidy cliff" rules
 *
 * Note: The subsidy cliff only affects eligibility (returns Infinity for FPL >= 400%),
 * not the applicable figure percentages for those below 400% FPL.
 */
export function getApplicableFigure(fplPercentage: number, useCliffLogic: boolean = false): number {
  if (fplPercentage < 0) return 0;

  // Subsidy cliff: no subsidy available for FPL >= 400%
  if (useCliffLogic && fplPercentage >= 400) {
    return Infinity;
  }

  // IRA-extended rules: 8.5% cap for FPL >= 400%
  if (fplPercentage >= 400) return 0.085;

  const tier = APPLICABLE_FIGURE_TABLE.find(
    (t) => fplPercentage >= t.fpl_min && fplPercentage < t.fpl_max
  );

  if (!tier) return 0.085; // Default to max if something goes wrong

  if (tier.fpl_min === 0) return 0.0;

  // Linear interpolation for tiers between 150% and 400%
  const percentageInRange = (fplPercentage - tier.fpl_min) / (tier.fpl_max - tier.fpl_min);
  const figure = tier.start_percent + percentageInRange * (tier.end_percent - tier.start_percent);

  return figure / 100;
}

/**
 * Calculate Premium Tax Credit based on inputs
 */
export function calculatePTC(inputs: PTCInputs): PTCResults {
  const { taxYear, familySize, magi, location, slcspMonthlyPremium, subsidyCliff } = inputs;

  const defaultResult: PTCResults = {
    fpl: 0,
    fplPercentage: 0,
    applicableFigure: 0,
    annualContribution: 0,
    monthlyContribution: 0,
    totalAllowedPTC: 0,
    monthlyPTC: 0,
    isEligible: false,
    eligibilityMessage: 'Unable to calculate',
  };

  // Validate inputs
  if (familySize <= 0 || magi <= 0 || slcspMonthlyPremium <= 0) {
    return {
      ...defaultResult,
      eligibilityMessage: 'Please enter valid values for all fields',
    };
  }

  // Calculate FPL and percentage
  const fpl = getFPL(familySize, taxYear, location);
  if (fpl <= 0) {
    return {
      ...defaultResult,
      eligibilityMessage: 'Unable to determine Federal Poverty Level',
    };
  }

  const fplPercentage = (magi / fpl) * 100;

  // Determine if subsidy cliff logic applies (only for 2026 when toggle is on)
  const useCliffLogic = taxYear === 2026 && subsidyCliff;

  // Get applicable figure
  const applicableFigure = getApplicableFigure(fplPercentage, useCliffLogic);

  // Calculate contribution
  const annualContribution = isFinite(applicableFigure) ? Math.round(magi * applicableFigure) : Infinity;
  const monthlyContribution = annualContribution / 12;

  // Calculate PTC
  const annualSlcspPremium = slcspMonthlyPremium * 12;
  let totalAllowedPTC = Math.max(0, annualSlcspPremium - annualContribution);

  // Apply subsidy cliff for 2026 if enabled
  if (useCliffLogic && fplPercentage >= 400) {
    totalAllowedPTC = 0;
  }

  const monthlyPTC = totalAllowedPTC / 12;

  // Determine eligibility message
  let isEligible = true;
  let eligibilityMessage = 'You may be eligible for the Premium Tax Credit';

  if (fplPercentage < 100) {
    isEligible = false;
    eligibilityMessage = 'Income below 100% FPL - you may qualify for Medicaid instead';
  } else if (useCliffLogic && fplPercentage >= 400) {
    isEligible = false;
    eligibilityMessage = 'Income exceeds 400% FPL - no subsidy available under cliff rules';
  } else if (fplPercentage >= 400) {
    eligibilityMessage = 'Income above 400% FPL - subsidy capped at 8.5% of income';
  } else if (totalAllowedPTC <= 0) {
    eligibilityMessage = 'Your expected contribution exceeds the benchmark premium';
  }

  return {
    fpl,
    fplPercentage,
    applicableFigure: isFinite(applicableFigure) ? applicableFigure : 0,
    annualContribution: isFinite(annualContribution) ? annualContribution : 0,
    monthlyContribution: isFinite(monthlyContribution) ? monthlyContribution : 0,
    totalAllowedPTC,
    monthlyPTC,
    isEligible,
    eligibilityMessage,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, decimals: number = 0): string {
  if (!isFinite(amount)) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number, decimals: number = 2): string {
  if (!isFinite(value)) return 'N/A';
  return `${(value * 100).toFixed(decimals)}%`;
}
