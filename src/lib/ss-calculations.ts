import { addMonths, differenceInMonths, getYear, getMonth, getDate, parseISO, startOfMonth } from "date-fns";

// Types
export interface PersonInput {
  birthDate: Date;
  pia: number;
  claimDate: Date;
}

export interface Inputs {
  maritalStatus: "Single" | "Married";
  primary: PersonInput;
  spouse: PersonInput;
  spousalClaimDate?: Date; // Specific for spousal benefits
  inflationRate: number;
}

export interface AnnualProjection {
  year: number;
  primaryAge: number;
  spouseAge: number;
  primaryBenefit: number;
  spouseBenefit: number;
  spousalAddOn: number;
  total: number;
}

// Constants
const MAX_AGE = 90;

// Helpers
export const getFRA = (birthDate: Date): { age: number; months: number } => {
  const year = getYear(birthDate);
  if (year <= 1937) return { age: 65, months: 0 };
  if (year <= 1942) return { age: 65, months: 2 * (year - 1937) };
  if (year <= 1954) return { age: 66, months: 0 };
  if (year === 1955) return { age: 66, months: 2 };
  if (year === 1956) return { age: 66, months: 4 };
  if (year === 1957) return { age: 66, months: 6 };
  if (year === 1958) return { age: 66, months: 8 };
  if (year === 1959) return { age: 66, months: 10 };
  return { age: 67, months: 0 };
};

export const getFRADate = (birthDate: Date): Date => {
  const { age, months } = getFRA(birthDate);
  return addMonths(birthDate, age * 12 + months);
};

export const calculateBenefit = (
  pia: number,
  birthDate: Date,
  claimDate: Date,
  type: "primary" | "spouse" = "primary"
): number => {
  const fraDate = getFRADate(birthDate);
  
  let monthsDiff = differenceInMonths(startOfMonth(claimDate), startOfMonth(fraDate));

  const age70Date = addMonths(birthDate, 70 * 12);
  const monthsUntil70 = differenceInMonths(startOfMonth(age70Date), startOfMonth(fraDate));
  
  if (monthsDiff > monthsUntil70) monthsDiff = monthsUntil70;
  
  if (type === "primary") {
    if (monthsDiff >= 0) {
      return pia * (1 + (monthsDiff * (8 / 12) / 100));
    } else {
      const monthsEarly = Math.abs(monthsDiff);
      let reduction = 0;
      if (monthsEarly <= 36) {
        reduction = monthsEarly * (5 / 9) / 100;
      } else {
        reduction = (36 * (5 / 9) / 100) + ((monthsEarly - 36) * (5 / 12) / 100);
      }
      return pia * (1 - reduction);
    }
  } else {
    // Spousal: 50% of primary's PIA (passed as pia parameter)
    // Reduce if spouse claims early (relative to their own FRA, not primary's)
    const maxSpousal = pia * 0.5;
    
    if (monthsDiff >= 0) {
      // Spouse claiming at or after their FRA: no reduction for spousal
      return maxSpousal;
    } else {
      // Spouse claiming before their FRA: apply reduction
      const monthsEarly = Math.abs(monthsDiff);
      let reduction = 0;
      if (monthsEarly <= 36) {
        reduction = monthsEarly * (25 / 36) / 100;
      } else {
        reduction = (36 * (25 / 36) / 100) + ((monthsEarly - 36) * (5 / 12) / 100);
      }
      return maxSpousal * (1 - reduction);
    }
  }
};

export const calculateLifetimeBenefit = (
  inputs: Inputs
): { total: number; monthlyData: any[]; annualData: AnnualProjection[] } => {
  let total = 0;
  const monthlyData = [];
  const annualData: AnnualProjection[] = [];
  
  // Start simulation from the earliest claim date
  const earliestClaimDate = inputs.spouse && inputs.spouse.claimDate < inputs.primary.claimDate 
    ? inputs.spouse.claimDate 
    : inputs.primary.claimDate;
  
  const startSim = startOfMonth(earliestClaimDate);
  const endSim = addMonths(inputs.primary.birthDate, MAX_AGE * 12);
  
  let current = startSim;
  const end = startOfMonth(endSim);

  const primaryBase = calculateBenefit(inputs.primary.pia, inputs.primary.birthDate, inputs.primary.claimDate, "primary");
  const spouseOwnBase = calculateBenefit(inputs.spouse.pia, inputs.spouse.birthDate, inputs.spouse.claimDate, "primary");
  
  // Spousal benefit calculation:
  // Max spousal = 50% of primary's PIA
  // Spouse gets own benefit + spousal top-up (if any)
  // Spousal top-up is reduced if spouse claims before their FRA
  const maxSpousalBenefit = inputs.primary.pia * 0.5;
  const spousalTopUpBase = Math.max(maxSpousalBenefit - inputs.spouse.pia, 0);
  
  // Calculate the reduction for spousal top-up based on spouse's age at spousal claim
  const spouseFraDate = getFRADate(inputs.spouse.birthDate);
  const spousalClaimDate = inputs.spousalClaimDate || inputs.spouse.claimDate;
  let spousalTopUpReductionFactor = 1.0;
  
  const monthsBeforeFRA = differenceInMonths(startOfMonth(spousalClaimDate), startOfMonth(spouseFraDate));
  if (monthsBeforeFRA < 0) {
    const monthsEarly = Math.abs(monthsBeforeFRA);
    let reduction = 0;
    if (monthsEarly <= 36) {
      reduction = monthsEarly * (25 / 36) / 100;
    } else {
      reduction = (36 * (25 / 36) / 100) + ((monthsEarly - 36) * (5 / 12) / 100);
    }
    spousalTopUpReductionFactor = 1 - reduction;
  }
  
  const spousalTopUpReduced = spousalTopUpBase * spousalTopUpReductionFactor;

  let lastYear = -1;
  let yearlyPrimary = 0;
  let yearlySpouseOwn = 0;
  let yearlySpouseSpousal = 0;

  while (current <= end) {
    const currentYear = getYear(current);
    
    const isPrimaryAlive = differenceInMonths(current, inputs.primary.birthDate) / 12 < MAX_AGE;
    const isSpouseAlive = differenceInMonths(current, inputs.spouse.birthDate) / 12 < MAX_AGE;

    const yearsElapsed = differenceInMonths(current, startSim) / 12;
    const inflationFactor = Math.pow(1 + inputs.inflationRate / 100, yearsElapsed);

    let monthlyTotal = 0;
    let monthlyPrimary = 0;
    let monthlySpouseOwn = 0;
    let monthlySpouseSpousal = 0;

    if (isPrimaryAlive && current >= startOfMonth(inputs.primary.claimDate)) {
      monthlyPrimary = primaryBase * inflationFactor;
      monthlyTotal += monthlyPrimary;
    }

    if (isSpouseAlive && inputs.maritalStatus === "Married") {
      // Spouse's own benefit
      if (current >= startOfMonth(inputs.spouse.claimDate)) {
        monthlySpouseOwn = spouseOwnBase * inflationFactor;
      }
      
      // Spousal top-up (only if primary has claimed)
      const primaryClaimed = current >= startOfMonth(inputs.primary.claimDate);
      const spouseClaimedSpousal = current >= startOfMonth(inputs.spousalClaimDate || inputs.spouse.claimDate);
      
      if (primaryClaimed && spouseClaimedSpousal && spousalTopUpReduced > 0) {
        monthlySpouseSpousal = spousalTopUpReduced * inflationFactor;
      }
      
      monthlyTotal += monthlySpouseOwn + monthlySpouseSpousal;
    }

    total += monthlyTotal;
    monthlyData.push({
      date: current.toISOString(),
      amount: monthlyTotal,
      year: currentYear,
    });

    // Accumulate for annual data
    if (currentYear !== lastYear && lastYear !== -1) {
      // Calculate ages as of end of year (Dec 31)
      const yearDate = new Date(lastYear, 11, 31);
      const primaryAge = Math.floor(differenceInMonths(yearDate, inputs.primary.birthDate) / 12);
      const spouseAge = Math.floor(differenceInMonths(yearDate, inputs.spouse.birthDate) / 12);
      annualData.push({
        year: lastYear,
        primaryAge,
        spouseAge,
        primaryBenefit: yearlyPrimary,
        spouseBenefit: yearlySpouseOwn,
        spousalAddOn: yearlySpouseSpousal,
        total: yearlyPrimary + yearlySpouseOwn + yearlySpouseSpousal,
      });
      yearlyPrimary = 0;
      yearlySpouseOwn = 0;
      yearlySpouseSpousal = 0;
    }

    yearlyPrimary += monthlyPrimary;
    yearlySpouseOwn += monthlySpouseOwn;
    yearlySpouseSpousal += monthlySpouseSpousal;
    lastYear = currentYear;

    current = addMonths(current, 1);
  }

  // Add final year
  if (lastYear !== -1) {
    const yearDate = new Date(lastYear, 11, 31);
    const primaryAge = Math.floor(differenceInMonths(yearDate, inputs.primary.birthDate) / 12);
    const spouseAge = Math.floor(differenceInMonths(yearDate, inputs.spouse.birthDate) / 12);
    annualData.push({
      year: lastYear,
      primaryAge,
      spouseAge,
      primaryBenefit: yearlyPrimary,
      spouseBenefit: yearlySpouseOwn,
      spousalAddOn: yearlySpouseSpousal,
      total: yearlyPrimary + yearlySpouseOwn + yearlySpouseSpousal,
    });
  }

  return { total, monthlyData, annualData };
};

export const generateStrategies = (inputs: Inputs) => {
  const scenarios = [
    { name: "As Selected", primaryDate: inputs.primary.claimDate, spouseDate: inputs.spouse.claimDate },
    { name: "Both at 70", primaryDate: addMonths(inputs.primary.birthDate, 70 * 12), spouseDate: addMonths(inputs.spouse.birthDate, 70 * 12) },
    { name: "Both at FRA", primaryDate: getFRADate(inputs.primary.birthDate), spouseDate: getFRADate(inputs.spouse.birthDate) },
    { name: "Primary 70, Spouse FRA", primaryDate: addMonths(inputs.primary.birthDate, 70 * 12), spouseDate: getFRADate(inputs.spouse.birthDate) },
    { name: "Earliest (62)", primaryDate: addMonths(inputs.primary.birthDate, 62 * 12), spouseDate: addMonths(inputs.spouse.birthDate, 62 * 12) },
  ];
  
  return scenarios.map(s => {
    const newInputs = { ...inputs, primary: { ...inputs.primary, claimDate: s.primaryDate }, spouse: { ...inputs.spouse, claimDate: s.spouseDate }, spousalClaimDate: s.spouseDate };
    const res = calculateLifetimeBenefit(newInputs);
    return { ...s, totalBenefit: res.total };
  }).sort((a, b) => b.totalBenefit - a.totalBenefit).slice(0, 5);
};

// Survivor benefits: Survivor receives the higher of their own benefit or the deceased's benefit
// Returns the survivor benefit amount (difference between deceased and own retirement)
export const calculateSurvivorBenefits = (inputs: Inputs) => {
  // Calculate what each person receives at their claim date
  const primaryBenefitAtClaim = calculateBenefit(inputs.primary.pia, inputs.primary.birthDate, inputs.primary.claimDate, "primary");
  const spouseBenefitAtClaim = calculateBenefit(inputs.spouse.pia, inputs.spouse.birthDate, inputs.spouse.claimDate, "primary");
  
  // Survivor benefit: If spouse dies, primary gets MAX(own retirement, spouse's retirement)
  // The survivor benefit shown is the difference above their own retirement
  const primarySurvivorTotal = Math.max(primaryBenefitAtClaim, spouseBenefitAtClaim);
  const primarySurvivorBenefitAmount = Math.max(0, primarySurvivorTotal - primaryBenefitAtClaim);
  
  // If primary dies, spouse gets MAX(own retirement, primary's retirement)
  const spouseSurvivorTotal = Math.max(spouseBenefitAtClaim, primaryBenefitAtClaim);
  const spouseSurvivorBenefitAmount = Math.max(0, spouseSurvivorTotal - spouseBenefitAtClaim);
  
  const primaryFraDate = getFRADate(inputs.primary.birthDate);
  const primaryFraInfo = getFRA(inputs.primary.birthDate);
  const spouseFraDate = getFRADate(inputs.spouse.birthDate);
  const spouseFraInfo = getFRA(inputs.spouse.birthDate);
  
  return {
    primaryDies: {
      spouseSurvival: spouseSurvivorTotal * 12,
      monthlyAmount: spouseSurvivorTotal,
      spouseFraDate: spouseFraDate,
      spouseFraAge: spouseFraInfo.age,
      note: `Survivor receives ${(spouseSurvivorTotal).toFixed(0)}/month (higher of own or deceased's benefit)`
    },
    spouseDies: {
      primaryContinues: primarySurvivorTotal * 12,
      monthlyAmount: primarySurvivorTotal,
      primaryFraDate: primaryFraDate,
      primaryFraAge: primaryFraInfo.age,
      note: `Survivor receives ${(primarySurvivorTotal).toFixed(0)}/month (higher of own or deceased's benefit)`
    }
  };
};
