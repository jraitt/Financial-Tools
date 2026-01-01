/**
 * Mortgage Calculator Utilities
 * Core calculation logic for mortgage analysis, amortization, points comparison, and refinance analysis
 */

// =====================================================
// CONSTANTS
// =====================================================

export const BREAK_EVEN_EXCELLENT = 24;
export const BREAK_EVEN_GOOD = 60;
export const BREAK_EVEN_MARGINAL = 120;
export const TIME_HORIZON_5_YEARS = 60;
export const TIME_HORIZON_10_YEARS = 120;
export const MINIMUM_BALANCE = 0.01;
export const MAX_ITERATIONS = 10000;
export const PMI_LTV_THRESHOLD = 78;
export const BIWEEKLY_PERIODS_PER_YEAR = 26;

// =====================================================
// TYPES
// =====================================================

export type PaydownStrategy = 'extra-payments' | 'biweekly' | 'double-principal';

export interface MortgageInputs {
  homePrice: number;
  downPayment: number;
  loanTerm: number;
  interestRate: number;
  propertyTax: number;
  homeInsurance: number;
  pmiRate: number;
  pmiAmount: number;
  extraMonthlyPrincipal: number;
  doubleMonthlyPrincipal: boolean;
  extraAnnualPayment: number;
  biWeeklyPayments: boolean;
  isExistingLoan: boolean;
  currentBalance: number;
  existingInterestRate: number;
  existingMonthlyPayment: number;
  paydownStrategy: PaydownStrategy;
  extraOneTimePayment: number;
}

export interface ScheduleEntry {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  extraPrincipal: number;
  balance: number;
  totalInterest: number;
  pmi: number;
  escrow: number;
}

export interface PointsScenario {
  id: string;
  name: string;
  rate: number;
  points: number;
  isBaseline: boolean;
}

export interface ComparisonResult {
  scenario: PointsScenario;
  monthlyPI: number;
  pointCost: number;
  totalInterest: number;
  totalCost: number;
  breakEvenMonths: number | null;
  monthlySavings: number;
  totalCostAt5Years: number;
  totalCostAt10Years: number;
  totalCostAtFullTerm: number;
}

export interface RefinanceInputs {
  currentBalance: number;
  currentRate: number;
  currentMonthlyPayment: number;
  newRate: number;
  newTerm: number;
  closingCosts: number;
  cashOut: number;
  newPoints: number;
  includeClosingCostsInLoan: boolean;
}

export interface RefinanceResult {
  newLoanAmount: number;
  newMonthlyPayment: number;
  monthlySavings: number;
  totalClosingCosts: number;
  breakEvenMonths: number;
  currentTotalInterest: number;
  newTotalInterest: number;
  interestSavings: number;
  currentTotalCost: number;
  newTotalCost: number;
  netSavings: number;
  costAt5Years: number;
  costAt10Years: number;
  costAtFullTerm: number;
  recommendation: string;
  recommendationType: 'excellent' | 'good' | 'marginal' | 'not-recommended';
  analysisType: 'break-even' | 'time-savings';
  remainingMonths: number;
}

// =====================================================
// BASIC CALCULATIONS
// =====================================================

export function calculateLoanAmount(inputs: MortgageInputs): number {
  return inputs.isExistingLoan ? inputs.currentBalance : inputs.homePrice - inputs.downPayment;
}

export function calculateMonthlyRate(annualRate: number): number {
  return (annualRate || 0) / 100 / 12;
}

export function calculateMonthlyPI(
  loanAmount: number,
  monthlyRate: number,
  totalPayments: number
): number {
  if (monthlyRate === 0) {
    return loanAmount / totalPayments;
  }
  const power = Math.pow(1 + monthlyRate, totalPayments);
  return (loanAmount * (monthlyRate * power)) / (power - 1);
}

export function calculateLTVRatio(inputs: MortgageInputs, loanAmount: number): number {
  if (inputs.isExistingLoan) return 0;
  return inputs.homePrice > 0 ? (loanAmount / inputs.homePrice) * 100 : 0;
}

export function calculateMonthlyPMI(
  inputs: MortgageInputs,
  loanAmount: number,
  ltvRatio: number
): number {
  if (inputs.isExistingLoan) return inputs.pmiAmount || 0;
  if (ltvRatio > PMI_LTV_THRESHOLD) {
    return (loanAmount * ((inputs.pmiRate || 0) / 100)) / 12;
  }
  return 0;
}

export function calculateMonthlyEscrow(inputs: MortgageInputs): number {
  if (inputs.isExistingLoan) return 0;
  return ((inputs.propertyTax || 0) + (inputs.homeInsurance || 0)) / 12;
}

export function calculateTotalMonthlyPayment(
  monthlyPI: number,
  monthlyPMI: number,
  monthlyEscrow: number
): number {
  return monthlyPI + monthlyPMI + monthlyEscrow;
}

export function calculateBasicMetrics(inputs: MortgageInputs) {
  const loanAmount = calculateLoanAmount(inputs);
  const monthlyRate = calculateMonthlyRate(
    inputs.isExistingLoan ? inputs.existingInterestRate : inputs.interestRate
  );
  const totalPayments = inputs.loanTerm * 12;
  const monthlyPI = calculateMonthlyPI(loanAmount, monthlyRate, totalPayments);
  const ltvRatio = calculateLTVRatio(inputs, loanAmount);
  const monthlyPMI = calculateMonthlyPMI(inputs, loanAmount, ltvRatio);
  const monthlyEscrow = calculateMonthlyEscrow(inputs);
  const totalMonthlyPayment = calculateTotalMonthlyPayment(monthlyPI, monthlyPMI, monthlyEscrow);

  return {
    loanAmount,
    monthlyRate,
    totalPayments,
    monthlyPI,
    ltvRatio,
    monthlyPMI,
    monthlyEscrow,
    totalMonthlyPayment
  };
}

// =====================================================
// AMORTIZATION SCHEDULE
// =====================================================

export function generateAmortizationSchedule(
  loanAmount: number,
  monthlyRate: number,
  monthlyPI: number,
  totalPayments: number,
  monthlyEscrow: number,
  monthlyPMI: number,
  inputs: MortgageInputs,
  extraMonthly = 0,
  doubleMonthly = false,
  extraAnnual = 0,
  biWeekly = false
): ScheduleEntry[] {
  const schedule: ScheduleEntry[] = [];
  let remainingBalance = loanAmount;
  let totalInterestPaid = 0;

  if (biWeekly) {
    return generateBiWeeklySchedule(
      loanAmount,
      monthlyRate,
      monthlyPI,
      totalPayments,
      monthlyEscrow,
      monthlyPMI,
      inputs
    );
  }

  const maxMonths = Math.min(totalPayments, MAX_ITERATIONS);

  for (let month = 1; month <= maxMonths && remainingBalance > MINIMUM_BALANCE; month++) {
    const interestPayment = remainingBalance * monthlyRate;
    let principalPayment = monthlyPI - interestPayment;

    if (principalPayment <= 0) {
      console.warn('Monthly payment too low to cover interest. Stopping amortization.');
      break;
    }

    let extraPrincipal = extraMonthly;
    if (doubleMonthly) {
      extraPrincipal += principalPayment;
    }
    if (month % 12 === 0) {
      extraPrincipal += extraAnnual;
    }

    const totalPrincipal = Math.min(principalPayment + extraPrincipal, remainingBalance);
    remainingBalance -= totalPrincipal;
    totalInterestPaid += interestPayment;

    const currentLTV = inputs.isExistingLoan
      ? 0
      : (remainingBalance / inputs.homePrice) * 100;
    const pmiPayment = inputs.isExistingLoan
      ? 0
      : (currentLTV > PMI_LTV_THRESHOLD ? monthlyPMI : 0);

    schedule.push({
      month,
      payment: monthlyPI + extraPrincipal,
      principal: totalPrincipal,
      interest: interestPayment,
      extraPrincipal,
      balance: remainingBalance,
      totalInterest: totalInterestPaid,
      pmi: pmiPayment,
      escrow: monthlyEscrow
    });
  }

  return schedule;
}

function generateBiWeeklySchedule(
  loanAmount: number,
  monthlyRate: number,
  monthlyPI: number,
  totalPayments: number,
  monthlyEscrow: number,
  monthlyPMI: number,
  inputs: MortgageInputs
): ScheduleEntry[] {
  const schedule: ScheduleEntry[] = [];
  let remainingBalance = loanAmount;
  let totalInterestPaid = 0;

  const biWeeklyPayment = monthlyPI / 2;
  const rate = inputs.isExistingLoan ? inputs.existingInterestRate : inputs.interestRate;
  const biWeeklyRate = rate / 100 / BIWEEKLY_PERIODS_PER_YEAR;
  let paymentNumber = 1;
  const maxPayments = Math.min(totalPayments * 2, MAX_ITERATIONS);

  while (remainingBalance > MINIMUM_BALANCE && paymentNumber <= maxPayments) {
    const interestPayment = remainingBalance * biWeeklyRate;
    let principalPayment = biWeeklyPayment - interestPayment;

    if (principalPayment <= 0) break;

    principalPayment = Math.min(principalPayment, remainingBalance);
    remainingBalance -= principalPayment;
    totalInterestPaid += interestPayment;

    if (paymentNumber % 2 === 0) {
      const currentLTV = inputs.isExistingLoan
        ? 0
        : (remainingBalance / inputs.homePrice) * 100;
      const pmiPayment = inputs.isExistingLoan
        ? 0
        : (currentLTV > PMI_LTV_THRESHOLD ? monthlyPMI : 0);

      schedule.push({
        month: Math.ceil(paymentNumber / 2),
        payment: biWeeklyPayment * 2,
        principal: principalPayment * 2,
        interest: interestPayment * 2,
        extraPrincipal: 0,
        balance: remainingBalance,
        totalInterest: totalInterestPaid,
        pmi: pmiPayment,
        escrow: monthlyEscrow
      });
    }
    paymentNumber++;
  }

  return schedule;
}

// =====================================================
// POINTS CALCULATIONS
// =====================================================

export function calculateScenarioMetrics(
  scenario: PointsScenario,
  loanAmount: number,
  term: number
): ComparisonResult {
  const monthlyRate = scenario.rate / 100 / 12;
  const totalPayments = term * 12;

  const monthlyPI = monthlyRate === 0
    ? loanAmount / totalPayments
    : loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
      (Math.pow(1 + monthlyRate, totalPayments) - 1);

  const pointCost = loanAmount * (scenario.points / 100);

  let remainingBalance = loanAmount;
  let totalInterest = 0;
  for (let month = 1; month <= totalPayments && remainingBalance > 0.01; month++) {
    const interestPayment = remainingBalance * monthlyRate;
    const principalPayment = monthlyPI - interestPayment;
    totalInterest += interestPayment;
    remainingBalance -= principalPayment;
  }

  const totalCost = pointCost + (monthlyPI * totalPayments);
  const costAt5Years = calculatePointsCostAtMonth(monthlyPI, monthlyRate, loanAmount, pointCost, 60);
  const costAt10Years = calculatePointsCostAtMonth(monthlyPI, monthlyRate, loanAmount, pointCost, 120);

  return {
    scenario,
    monthlyPI,
    pointCost,
    totalInterest,
    totalCost,
    breakEvenMonths: null,
    monthlySavings: 0,
    totalCostAt5Years: costAt5Years,
    totalCostAt10Years: costAt10Years,
    totalCostAtFullTerm: totalCost
  };
}

function calculatePointsCostAtMonth(
  monthlyPI: number,
  monthlyRate: number,
  loanAmount: number,
  pointCost: number,
  months: number
): number {
  const totalPayments = Math.ceil(loanAmount / monthlyPI);
  const paymentsToCalculate = Math.min(months, totalPayments);
  return pointCost + (monthlyPI * paymentsToCalculate);
}

export function calculateBreakEven(
  result: ComparisonResult,
  baseline: ComparisonResult
): ComparisonResult {
  const pointCostDiff = result.pointCost - baseline.pointCost;
  const monthlySavings = baseline.monthlyPI - result.monthlyPI;

  let breakEvenMonths = null;
  if (monthlySavings > 0 && pointCostDiff > 0) {
    breakEvenMonths = pointCostDiff / monthlySavings;
  }

  return {
    ...result,
    monthlySavings,
    breakEvenMonths
  };
}

export function calculateComparisonResults(
  scenarios: PointsScenario[],
  loanAmount: number,
  term: number
): ComparisonResult[] {
  const baseline = scenarios.find(s => s.isBaseline);
  if (!baseline) return [];

  const baselineResult = calculateScenarioMetrics(baseline, loanAmount, term);
  return scenarios.map(scenario => {
    const result = calculateScenarioMetrics(scenario, loanAmount, term);
    return scenario.isBaseline ? result : calculateBreakEven(result, baselineResult);
  });
}

// =====================================================
// REFINANCE CALCULATIONS
// =====================================================

function calculateRemainingMonths(balance: number, annualRate: number, monthlyPayment: number): number {
  if (annualRate === 0) {
    return Math.ceil(balance / monthlyPayment);
  }

  const monthlyRate = annualRate / 100 / 12;

  if (monthlyPayment <= balance * monthlyRate) {
    return MAX_ITERATIONS;
  }

  const remainingMonths = Math.log(monthlyPayment / (monthlyPayment - balance * monthlyRate)) / Math.log(1 + monthlyRate);
  return Math.ceil(remainingMonths);
}

export function calculateRefinanceAnalysis(refInputs: RefinanceInputs): RefinanceResult {
  const remainingMonths = calculateRemainingMonths(
    refInputs.currentBalance,
    refInputs.currentRate,
    refInputs.currentMonthlyPayment
  );

  const pointsCost = refInputs.currentBalance * ((refInputs.newPoints || 0) / 100);
  const closingCostsInLoan = refInputs.includeClosingCostsInLoan ? refInputs.closingCosts : 0;
  const newLoanAmount = refInputs.currentBalance + (refInputs.cashOut || 0) + pointsCost + closingCostsInLoan;
  const totalClosingCosts = refInputs.closingCosts + pointsCost;

  const newMonthlyRate = refInputs.newRate / 100 / 12;
  const newTotalPayments = refInputs.newTerm * 12;

  const newMonthlyPayment = newMonthlyRate === 0
    ? newLoanAmount / newTotalPayments
    : newLoanAmount * (newMonthlyRate * Math.pow(1 + newMonthlyRate, newTotalPayments)) /
      (Math.pow(1 + newMonthlyRate, newTotalPayments) - 1);

  const monthlySavings = refInputs.currentMonthlyPayment - newMonthlyPayment;
  const breakEvenMonths = monthlySavings > 0 ? totalClosingCosts / monthlySavings : Infinity;

  const currentTotalInterest = calculateRefinanceTotalInterest(
    refInputs.currentBalance,
    refInputs.currentRate,
    refInputs.currentMonthlyPayment,
    remainingMonths
  );

  const newTotalInterest = calculateRefinanceTotalInterest(
    newLoanAmount,
    refInputs.newRate,
    newMonthlyPayment,
    newTotalPayments
  );

  const currentTotalCost = currentTotalInterest + (refInputs.currentMonthlyPayment * remainingMonths);
  const newTotalCost = totalClosingCosts + newTotalInterest + (newMonthlyPayment * newTotalPayments);

  const interestSavings = currentTotalInterest - newTotalInterest;
  const netSavings = currentTotalCost - newTotalCost;

  const costAt5Years = calculateRefinanceCostAtMonths(newLoanAmount, newMonthlyRate, newMonthlyPayment, totalClosingCosts, TIME_HORIZON_5_YEARS);
  const costAt10Years = calculateRefinanceCostAtMonths(newLoanAmount, newMonthlyRate, newMonthlyPayment, totalClosingCosts, TIME_HORIZON_10_YEARS);
  const costAtFullTerm = newTotalCost;

  const recommendationResult = generateRecommendation(
    breakEvenMonths,
    monthlySavings,
    interestSavings,
    netSavings,
    refInputs.newTerm * 12,
    remainingMonths
  );

  return {
    newLoanAmount,
    newMonthlyPayment,
    monthlySavings,
    totalClosingCosts,
    breakEvenMonths,
    currentTotalInterest,
    newTotalInterest,
    interestSavings,
    currentTotalCost,
    newTotalCost,
    netSavings,
    costAt5Years,
    costAt10Years,
    costAtFullTerm,
    recommendation: recommendationResult.text,
    recommendationType: recommendationResult.type,
    analysisType: recommendationResult.analysisType,
    remainingMonths
  };
}

function calculateRefinanceTotalInterest(
  balance: number,
  annualRate: number,
  monthlyPayment: number,
  months: number
): number {
  const monthlyRate = annualRate / 100 / 12;
  let currentBalance = balance;
  let totalInterest = 0;
  const maxMonths = Math.min(months, MAX_ITERATIONS);

  for (let month = 1; month <= maxMonths && currentBalance > MINIMUM_BALANCE; month++) {
    const interestPayment = currentBalance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;

    if (principalPayment <= 0) break;

    totalInterest += interestPayment;
    currentBalance -= principalPayment;
  }

  return totalInterest;
}

function calculateRefinanceCostAtMonths(
  loanAmount: number,
  monthlyRate: number,
  monthlyPayment: number,
  closingCosts: number,
  months: number
): number {
  const totalPayments = Math.ceil(loanAmount / monthlyPayment);
  const monthsToCalc = Math.min(months, totalPayments, MAX_ITERATIONS);
  return closingCosts + (monthlyPayment * monthsToCalc);
}

function generateRecommendation(
  breakEvenMonths: number,
  monthlySavings: number,
  interestSavings: number,
  netSavings: number,
  newTermMonths: number,
  currentRemainingMonths: number
): { text: string; type: 'excellent' | 'good' | 'marginal' | 'not-recommended'; analysisType: 'break-even' | 'time-savings' } {
  const termReductionMonths = currentRemainingMonths - newTermMonths;
  const termReductionYears = termReductionMonths / 12;
  const significantTermReduction = termReductionMonths >= 60;
  const moderateTermReduction = termReductionMonths >= 24;
  const significantInterestSavings = interestSavings >= 50000;
  const moderateInterestSavings = interestSavings >= 20000;

  if (breakEvenMonths < BREAK_EVEN_EXCELLENT) {
    return {
      text: "Excellent! You'll break even in less than 2 years. This refinance is highly recommended.",
      type: 'excellent',
      analysisType: 'break-even'
    };
  }

  if (significantTermReduction && significantInterestSavings) {
    return {
      text: `Excellent for building equity! You'll pay off your loan ${termReductionYears.toFixed(1)} years earlier and save ${(interestSavings / 1000).toFixed(0)}k in interest, despite higher monthly payments.`,
      type: 'excellent',
      analysisType: 'time-savings'
    };
  }

  if (significantTermReduction && moderateInterestSavings) {
    return {
      text: `Good for wealth building! You'll pay off your loan ${termReductionYears.toFixed(1)} years earlier and save ${(interestSavings / 1000).toFixed(0)}k in interest. Consider if you can afford the higher payment.`,
      type: 'good',
      analysisType: 'time-savings'
    };
  }

  if (breakEvenMonths < BREAK_EVEN_GOOD && monthlySavings > 0) {
    return {
      text: "Good opportunity. You'll break even in " + Math.round(breakEvenMonths / 12) + " years. Worth refinancing if you plan to stay longer.",
      type: 'good',
      analysisType: 'break-even'
    };
  }

  if (moderateTermReduction && interestSavings > 0) {
    return {
      text: `Worth considering for faster payoff. You'll finish ${termReductionYears.toFixed(1)} years earlier and save ${(interestSavings / 1000).toFixed(0)}k in interest, but monthly payments will increase.`,
      type: 'marginal',
      analysisType: 'time-savings'
    };
  }

  if (breakEvenMonths < BREAK_EVEN_MARGINAL && monthlySavings > 0) {
    return {
      text: "Marginal benefit. Break-even takes " + Math.round(breakEvenMonths / 12) + " years. Only refinance if you're certain you'll keep the loan that long.",
      type: 'marginal',
      analysisType: 'break-even'
    };
  }

  if (monthlySavings < 0 && !moderateTermReduction) {
    return {
      text: 'Not recommended. Your monthly payment would increase without significant term reduction or interest savings.',
      type: 'not-recommended',
      analysisType: 'break-even'
    };
  }

  if (breakEvenMonths === Infinity) {
    return {
      text: 'Not recommended. Your monthly payment increases, making break-even impossible from a cash flow perspective.',
      type: 'not-recommended',
      analysisType: 'break-even'
    };
  }

  return {
    text: 'Not recommended. The break-even period is too long to justify the closing costs.',
    type: 'not-recommended',
    analysisType: 'break-even'
  };
}

// =====================================================
// FORMATTING UTILITIES
// =====================================================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

export function formatMonthsAsYearsMonths(months: number): string {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) {
    return `${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
  }
  if (remainingMonths === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`;
  }
  return `${years} yr${years !== 1 ? 's' : ''}, ${remainingMonths} mo`;
}

// =====================================================
// DEFAULT VALUES
// =====================================================

export const defaultMortgageInputs: MortgageInputs = {
  homePrice: 400000,
  downPayment: 80000,
  loanTerm: 30,
  interestRate: 6.5,
  propertyTax: 8000,
  homeInsurance: 1200,
  pmiRate: 0.5,
  pmiAmount: 0,
  extraMonthlyPrincipal: 0,
  doubleMonthlyPrincipal: false,
  extraAnnualPayment: 0,
  biWeeklyPayments: false,
  isExistingLoan: false,
  currentBalance: 300000,
  existingInterestRate: 6.5,
  existingMonthlyPayment: 2000,
  paydownStrategy: 'extra-payments',
  extraOneTimePayment: 0,
};

export const defaultRefinanceInputs: RefinanceInputs = {
  currentBalance: 300000,
  currentRate: 6.5,
  currentMonthlyPayment: 2000,
  newRate: 5.5,
  newTerm: 30,
  closingCosts: 3000,
  cashOut: 0,
  newPoints: 0,
  includeClosingCostsInLoan: false,
};

export const defaultPointsScenarios: PointsScenario[] = [
  { id: '1', name: '0 Points', rate: 5.625, points: 0, isBaseline: true },
  { id: '2', name: '1.0 Points', rate: 5.375, points: 1.0, isBaseline: false },
  { id: '3', name: '1.625 Points', rate: 5.25, points: 1.625, isBaseline: false },
];
