'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Home,
  Calculator,
  TrendingDown,
  Scale,
  RefreshCw,
  DollarSign,
  PiggyBank,
  Percent,
  Calendar,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Info,
  Lock,
  Unlock,
} from 'lucide-react';
import { ConfigurationManager } from '@/components/configuration-manager';
import {
  MortgageInputs,
  RefinanceInputs,
  PointsScenario,
  ScheduleEntry,
  defaultMortgageInputs,
  defaultRefinanceInputs,
  defaultPointsScenarios,
  calculateBasicMetrics,
  generateAmortizationSchedule,
  calculateComparisonResults,
  calculateRefinanceAnalysis,
  formatCurrency,
  formatMonthsAsYearsMonths,
  PMI_LTV_THRESHOLD,
} from '@/lib/mortgage-calculations';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

// =====================================================
// ZOD SCHEMAS
// =====================================================

const newMortgageSchema = z.object({
  homePrice: z.coerce.number().min(1000, 'Home price must be at least $1,000'),
  downPayment: z.coerce.number().min(0, 'Down payment cannot be negative'),
  loanTerm: z.coerce.number().min(1).max(50),
  interestRate: z.coerce.number().min(0).max(30, 'Interest rate must be 0-30%'),
  propertyTax: z.coerce.number().min(0),
  homeInsurance: z.coerce.number().min(0),
  pmiRate: z.coerce.number().min(0).max(5),
});

const existingMortgageSchema = z.object({
  currentBalance: z.coerce.number().min(1000, 'Balance must be at least $1,000'),
  existingInterestRate: z.coerce.number().min(0).max(30),
  existingMonthlyPayment: z.coerce.number().min(1, 'Monthly payment required'),
  loanTerm: z.coerce.number().min(1).max(50),
  extraMonthlyPrincipal: z.coerce.number().min(0),
  extraAnnualPayment: z.coerce.number().min(0),
  biWeeklyPayments: z.boolean(),
  doubleMonthlyPrincipal: z.boolean(),
});

const refinanceSchema = z.object({
  currentBalance: z.coerce.number().min(1000),
  currentRate: z.coerce.number().min(0).max(30),
  currentMonthlyPayment: z.coerce.number().min(1),
  newRate: z.coerce.number().min(0).max(30),
  newTerm: z.coerce.number().min(1).max(50),
  closingCosts: z.coerce.number().min(0),
  cashOut: z.coerce.number().min(0),
  newPoints: z.coerce.number().min(0).max(10),
  includeClosingCostsInLoan: z.boolean(),
});

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function MortgageCalculator() {
  const [activeTab, setActiveTab] = useState('new-mortgage');
  const [showAmortization, setShowAmortization] = useState(false);
  const [scenarios, setScenarios] = useState<PointsScenario[]>(defaultPointsScenarios);
  const [pointsLoanAmount, setPointsLoanAmount] = useState(320000);
  const [pointsLoanTerm, setPointsLoanTerm] = useState(30);
  const [scrollLocked, setScrollLocked] = useState(true);
  const [showScheduleComparison, setShowScheduleComparison] = useState(false);

  // Refs for synchronized scrolling
  const originalScheduleRef = useRef<HTMLDivElement>(null);
  const enhancedScheduleRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  // Synchronized scroll handler
  const handleSyncScroll = useCallback((source: 'original' | 'enhanced') => {
    if (!scrollLocked || isScrolling.current) return;

    isScrolling.current = true;
    const sourceRef = source === 'original' ? originalScheduleRef : enhancedScheduleRef;
    const targetRef = source === 'original' ? enhancedScheduleRef : originalScheduleRef;

    if (sourceRef.current && targetRef.current) {
      targetRef.current.scrollTop = sourceRef.current.scrollTop;
    }

    requestAnimationFrame(() => {
      isScrolling.current = false;
    });
  }, [scrollLocked]);

  // =====================================================
  // NEW MORTGAGE FORM
  // =====================================================

  const newMortgageForm = useForm<z.infer<typeof newMortgageSchema>>({
    resolver: zodResolver(newMortgageSchema),
    defaultValues: {
      homePrice: defaultMortgageInputs.homePrice,
      downPayment: defaultMortgageInputs.downPayment,
      loanTerm: defaultMortgageInputs.loanTerm,
      interestRate: defaultMortgageInputs.interestRate,
      propertyTax: defaultMortgageInputs.propertyTax,
      homeInsurance: defaultMortgageInputs.homeInsurance,
      pmiRate: defaultMortgageInputs.pmiRate,
    },
  });

  const newMortgageValues = newMortgageForm.watch();

  const newMortgageMetrics = useMemo(() => {
    const inputs: MortgageInputs = {
      ...defaultMortgageInputs,
      ...newMortgageValues,
      isExistingLoan: false,
    };
    return calculateBasicMetrics(inputs);
  }, [newMortgageValues]);

  const newMortgageSchedule = useMemo(() => {
    const inputs: MortgageInputs = {
      ...defaultMortgageInputs,
      ...newMortgageValues,
      isExistingLoan: false,
    };
    const { loanAmount, monthlyRate, monthlyPI, totalPayments, monthlyEscrow, monthlyPMI } = newMortgageMetrics;
    return generateAmortizationSchedule(
      loanAmount,
      monthlyRate,
      monthlyPI,
      totalPayments,
      monthlyEscrow,
      monthlyPMI,
      inputs
    );
  }, [newMortgageValues, newMortgageMetrics]);

  // =====================================================
  // EXISTING MORTGAGE FORM
  // =====================================================

  const existingMortgageForm = useForm<z.infer<typeof existingMortgageSchema>>({
    resolver: zodResolver(existingMortgageSchema),
    defaultValues: {
      currentBalance: defaultMortgageInputs.currentBalance,
      existingInterestRate: defaultMortgageInputs.existingInterestRate,
      existingMonthlyPayment: defaultMortgageInputs.existingMonthlyPayment,
      loanTerm: defaultMortgageInputs.loanTerm,
      extraMonthlyPrincipal: defaultMortgageInputs.extraMonthlyPrincipal,
      extraAnnualPayment: defaultMortgageInputs.extraAnnualPayment,
      biWeeklyPayments: defaultMortgageInputs.biWeeklyPayments,
      doubleMonthlyPrincipal: defaultMortgageInputs.doubleMonthlyPrincipal,
    },
  });

  const existingMortgageValues = existingMortgageForm.watch();

  const existingMortgageMetrics = useMemo(() => {
    const inputs: MortgageInputs = {
      ...defaultMortgageInputs,
      ...existingMortgageValues,
      currentBalance: Number(existingMortgageValues.currentBalance) || 0,
      interestRate: Number(existingMortgageValues.existingInterestRate) || 0,
      existingInterestRate: Number(existingMortgageValues.existingInterestRate) || 0,
      loanTerm: Number(existingMortgageValues.loanTerm) || 30,
      isExistingLoan: true,
    };
    return calculateBasicMetrics(inputs);
  }, [existingMortgageValues]);

  const { standardSchedule, paydownSchedule } = useMemo(() => {
    const inputs: MortgageInputs = {
      ...defaultMortgageInputs,
      ...existingMortgageValues,
      interestRate: Number(existingMortgageValues.existingInterestRate) || 0,
      isExistingLoan: true,
    };
    const { loanAmount, monthlyRate, totalPayments } = existingMortgageMetrics;
    const monthlyPI = Number(existingMortgageValues.existingMonthlyPayment) || 0;

    // Ensure numeric values for extra payments (form inputs can be strings)
    const extraMonthly = Number(existingMortgageValues.extraMonthlyPrincipal) || 0;
    const extraAnnual = Number(existingMortgageValues.extraAnnualPayment) || 0;

    const standard = generateAmortizationSchedule(
      loanAmount,
      monthlyRate,
      monthlyPI,
      totalPayments,
      0,
      0,
      inputs
    );

    const paydown = generateAmortizationSchedule(
      loanAmount,
      monthlyRate,
      monthlyPI,
      totalPayments,
      0,
      0,
      inputs,
      extraMonthly,
      existingMortgageValues.doubleMonthlyPrincipal,
      extraAnnual,
      existingMortgageValues.biWeeklyPayments
    );

    return { standardSchedule: standard, paydownSchedule: paydown };
  }, [existingMortgageValues, existingMortgageMetrics]);

  // =====================================================
  // REFINANCE FORM
  // =====================================================

  const refinanceForm = useForm<z.infer<typeof refinanceSchema>>({
    resolver: zodResolver(refinanceSchema),
    defaultValues: {
      currentBalance: defaultRefinanceInputs.currentBalance,
      currentRate: defaultRefinanceInputs.currentRate,
      currentMonthlyPayment: defaultRefinanceInputs.currentMonthlyPayment,
      newRate: defaultRefinanceInputs.newRate,
      newTerm: defaultRefinanceInputs.newTerm,
      closingCosts: defaultRefinanceInputs.closingCosts,
      cashOut: defaultRefinanceInputs.cashOut,
      newPoints: defaultRefinanceInputs.newPoints,
      includeClosingCostsInLoan: defaultRefinanceInputs.includeClosingCostsInLoan,
    },
  });

  const refinanceValues = refinanceForm.watch();

  const refinanceResult = useMemo(() => {
    return calculateRefinanceAnalysis(refinanceValues);
  }, [refinanceValues]);

  // =====================================================
  // POINTS CALCULATOR
  // =====================================================

  const pointsResults = useMemo(() => {
    return calculateComparisonResults(scenarios, pointsLoanAmount, pointsLoanTerm);
  }, [scenarios, pointsLoanAmount, pointsLoanTerm]);

  const addScenario = () => {
    const newId = String(Date.now());
    setScenarios([
      ...scenarios,
      { id: newId, name: `Scenario ${scenarios.length + 1}`, rate: 5.5, points: 0.5, isBaseline: false },
    ]);
  };

  const removeScenario = (id: string) => {
    if (scenarios.length > 1) {
      setScenarios(scenarios.filter(s => s.id !== id));
    }
  };

  const updateScenario = (id: string, field: keyof PointsScenario, value: any) => {
    setScenarios(scenarios.map(s => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const setBaseline = (id: string) => {
    setScenarios(scenarios.map(s => ({ ...s, isBaseline: s.id === id })));
  };

  // =====================================================
  // CONFIGURATION MANAGER HANDLERS
  // =====================================================

  const getCurrentConfig = () => {
    switch (activeTab) {
      case 'new-mortgage':
        return newMortgageForm.getValues();
      case 'existing-mortgage':
        return existingMortgageForm.getValues();
      case 'refinance':
        return refinanceForm.getValues();
      case 'points':
        return { scenarios, pointsLoanAmount, pointsLoanTerm };
      default:
        return {};
    }
  };

  const handleLoadConfig = (data: any) => {
    switch (activeTab) {
      case 'new-mortgage':
        newMortgageForm.reset(data);
        break;
      case 'existing-mortgage':
        existingMortgageForm.reset(data);
        break;
      case 'refinance':
        refinanceForm.reset(data);
        break;
      case 'points':
        if (data.scenarios) setScenarios(data.scenarios);
        if (data.pointsLoanAmount) setPointsLoanAmount(data.pointsLoanAmount);
        if (data.pointsLoanTerm) setPointsLoanTerm(data.pointsLoanTerm);
        break;
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <div className="max-w-7xl mx-auto px-4 pt-2 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-6 h-auto">
            <TabsTrigger value="new-mortgage" className="flex items-center gap-2 py-3">
              <Calculator className="w-4 h-4" />
              <span className="hidden sm:inline">New Mortgage</span>
              <span className="sm:hidden">New</span>
            </TabsTrigger>
            <TabsTrigger value="existing-mortgage" className="flex items-center gap-2 py-3">
              <TrendingDown className="w-4 h-4" />
              <span className="hidden sm:inline">Existing Mortgage</span>
              <span className="sm:hidden">Existing</span>
            </TabsTrigger>
            <TabsTrigger value="points" className="flex items-center gap-2 py-3">
              <Scale className="w-4 h-4" />
              <span className="hidden sm:inline">Points Calculator</span>
              <span className="sm:hidden">Points</span>
            </TabsTrigger>
            <TabsTrigger value="refinance" className="flex items-center gap-2 py-3">
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refinance</span>
              <span className="sm:hidden">Refi</span>
            </TabsTrigger>
          </TabsList>

          {/* ============================================= */}
          {/* NEW MORTGAGE TAB */}
          {/* ============================================= */}

          <TabsContent value="new-mortgage">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Input Section */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="border-none shadow-lg ring-1 ring-black/5 dark:ring-white/20 overflow-hidden">
                  <CardHeader className="bg-card border-b pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Home className="w-5 h-5 text-primary" />
                        Loan Details
                      </CardTitle>
                      <ConfigurationManager
                        appId="mortgage-calculator-new"
                        currentData={getCurrentConfig()}
                        onLoad={handleLoadConfig}
                      />
                    </div>
                    <CardDescription>Enter your mortgage details to calculate payments.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 bg-card">
                    <Form {...newMortgageForm}>
                      <form className="space-y-6">
                        <FormField
                          control={newMortgageForm.control}
                          name="homePrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Home Price</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                  <Input type="number" {...field} className="pl-7 bg-muted border" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={newMortgageForm.control}
                          name="downPayment"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Down Payment</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                  <Input type="number" {...field} className="pl-7 bg-muted border" />
                                </div>
                              </FormControl>
                              <FormDescription>
                                {((newMortgageValues.downPayment / newMortgageValues.homePrice) * 100 || 0).toFixed(1)}% down
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Separator />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={newMortgageForm.control}
                            name="interestRate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Interest Rate</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input type="number" step="0.01" {...field} className="pr-7 bg-muted border" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={newMortgageForm.control}
                            name="loanTerm"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Loan Term</FormLabel>
                                <Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={String(field.value)}>
                                  <FormControl>
                                    <SelectTrigger className="bg-muted border">
                                      <SelectValue placeholder="Select term" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="15">15 years</SelectItem>
                                    <SelectItem value="20">20 years</SelectItem>
                                    <SelectItem value="25">25 years</SelectItem>
                                    <SelectItem value="30">30 years</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={newMortgageForm.control}
                            name="propertyTax"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Annual Property Tax</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                    <Input type="number" {...field} className="pl-7 bg-muted border" />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={newMortgageForm.control}
                            name="homeInsurance"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Annual Insurance</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                    <Input type="number" {...field} className="pl-7 bg-muted border" />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={newMortgageForm.control}
                          name="pmiRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>PMI Rate (Annual)</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input type="number" step="0.01" {...field} className="pr-7 bg-muted border" />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                                </div>
                              </FormControl>
                              <FormDescription>
                                {newMortgageMetrics.ltvRatio > PMI_LTV_THRESHOLD ? 'PMI Required' : 'No PMI Required'} (LTV: {newMortgageMetrics.ltvRatio.toFixed(1)}%)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>

              {/* Results Section */}
              <div className="lg:col-span-8 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-primary/10 rounded-full text-primary">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <Badge variant="secondary" className="bg-primary/10 text-primary">Loan Amount</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground font-medium mb-1">Principal</p>
                      <h3 className="text-3xl font-bold text-foreground tracking-tight">
                        {formatCurrency(newMortgageMetrics.loanAmount)}
                      </h3>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-full text-emerald-700 dark:text-emerald-300">
                          <PiggyBank className="w-5 h-5" />
                        </div>
                        <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">P&I</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground font-medium mb-1">Monthly P&I</p>
                      <h3 className="text-3xl font-bold text-foreground tracking-tight">
                        {formatCurrency(newMortgageMetrics.monthlyPI)}
                      </h3>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-purple-500/10 rounded-full text-purple-600">
                          <Home className="w-5 h-5" />
                        </div>
                        <Badge variant="secondary" className="bg-purple-500/10 text-purple-600">Total</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground font-medium mb-1">Total Monthly</p>
                      <h3 className="text-3xl font-bold text-foreground tracking-tight">
                        {formatCurrency(newMortgageMetrics.totalMonthlyPayment)}
                      </h3>
                    </CardContent>
                  </Card>
                </div>

                {/* Payment Breakdown */}
                <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
                  <CardHeader>
                    <CardTitle>Payment Breakdown</CardTitle>
                    <CardDescription>Monthly payment components</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-muted-foreground">Principal & Interest</span>
                        <span className="font-semibold">{formatCurrency(newMortgageMetrics.monthlyPI)}</span>
                      </div>
                      {newMortgageMetrics.monthlyPMI > 0 && (
                        <div className="flex justify-between items-center py-2 border-b border-border">
                          <span className="text-muted-foreground">PMI</span>
                          <span className="font-semibold text-amber-600">{formatCurrency(newMortgageMetrics.monthlyPMI)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-muted-foreground">Taxes & Insurance</span>
                        <span className="font-semibold">{formatCurrency(newMortgageMetrics.monthlyEscrow)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 bg-primary/5 rounded-lg px-3">
                        <span className="font-semibold">Total Monthly Payment</span>
                        <span className="font-bold text-xl text-primary">{formatCurrency(newMortgageMetrics.totalMonthlyPayment)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Loan Summary */}
                <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
                  <CardHeader>
                    <CardTitle>Loan Summary</CardTitle>
                    <CardDescription>Total costs over the life of the loan</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Total Interest</p>
                        <p className="text-xl font-bold text-destructive">
                          {formatCurrency(newMortgageSchedule[newMortgageSchedule.length - 1]?.totalInterest || 0)}
                        </p>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Total Cost</p>
                        <p className="text-xl font-bold">
                          {formatCurrency(newMortgageMetrics.loanAmount + (newMortgageSchedule[newMortgageSchedule.length - 1]?.totalInterest || 0))}
                        </p>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Payoff Date</p>
                        <p className="text-xl font-bold">
                          {new Date(Date.now() + newMortgageSchedule.length * 30.44 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Amortization Schedule Toggle */}
                <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() => setShowAmortization(!showAmortization)}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Amortization Schedule
                      </CardTitle>
                      {showAmortization ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                    <CardDescription>
                      {newMortgageSchedule.length} payments | Total Interest: {formatCurrency(newMortgageSchedule[newMortgageSchedule.length - 1]?.totalInterest || 0)}
                    </CardDescription>
                  </CardHeader>
                  {showAmortization && (
                    <CardContent>
                      <ScrollArea className="h-[400px] w-full">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-muted">
                            <tr>
                              <th className="text-left p-2 font-semibold">#</th>
                              <th className="text-left p-2 font-semibold">Date</th>
                              <th className="text-right p-2 font-semibold">Payment</th>
                              <th className="text-right p-2 font-semibold">Principal</th>
                              <th className="text-right p-2 font-semibold">Interest</th>
                              <th className="text-right p-2 font-semibold">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {newMortgageSchedule.map((entry, idx) => {
                              const paymentDate = new Date();
                              paymentDate.setMonth(paymentDate.getMonth() + entry.month);
                              return (
                                <tr key={idx} className={`border-b border-border hover:bg-muted/50 ${entry.month % 12 === 0 ? 'bg-primary/5' : ''}`}>
                                  <td className="p-2 font-medium">{entry.month}</td>
                                  <td className="p-2 text-muted-foreground">
                                    {paymentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                  </td>
                                  <td className="p-2 text-right">{formatCurrency(entry.payment)}</td>
                                  <td className="p-2 text-right text-emerald-600">{formatCurrency(entry.principal)}</td>
                                  <td className="p-2 text-right text-destructive">{formatCurrency(entry.interest)}</td>
                                  <td className="p-2 text-right font-medium">{formatCurrency(entry.balance)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </ScrollArea>
                    </CardContent>
                  )}
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ============================================= */}
          {/* EXISTING MORTGAGE TAB */}
          {/* ============================================= */}

          <TabsContent value="existing-mortgage">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Input Section */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="border-none shadow-lg ring-1 ring-black/5 dark:ring-white/20 overflow-hidden">
                  <CardHeader className="bg-card border-b pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-primary" />
                        Current Loan
                      </CardTitle>
                      <ConfigurationManager
                        appId="mortgage-calculator-existing"
                        currentData={getCurrentConfig()}
                        onLoad={handleLoadConfig}
                      />
                    </div>
                    <CardDescription>Enter your existing mortgage details and paydown strategies.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 bg-card">
                    <Form {...existingMortgageForm}>
                      <form className="space-y-6">
                        <FormField
                          control={existingMortgageForm.control}
                          name="currentBalance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Balance</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                  <Input type="number" {...field} className="pl-7 bg-muted border" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={existingMortgageForm.control}
                            name="existingInterestRate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Interest Rate</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input type="number" step="0.01" {...field} className="pr-7 bg-muted border" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={existingMortgageForm.control}
                            name="existingMonthlyPayment"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Monthly P&I</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                    <Input type="number" {...field} className="pl-7 bg-muted border" />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <Separator />

                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                          <span className="w-1 h-4 bg-accent rounded-full"></span>
                          Paydown Strategies
                        </h3>

                        <FormField
                          control={existingMortgageForm.control}
                          name="extraMonthlyPrincipal"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Extra Monthly Principal</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                  <Input type="number" {...field} className="pl-7 bg-muted border" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={existingMortgageForm.control}
                          name="extraAnnualPayment"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Extra Annual Payment</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                  <Input type="number" {...field} className="pl-7 bg-muted border" />
                                </div>
                              </FormControl>
                              <FormDescription>Applied at end of each year</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={existingMortgageForm.control}
                          name="biWeeklyPayments"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Bi-Weekly Payments</FormLabel>
                                <FormDescription>26 payments/year = 13 monthly</FormDescription>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={existingMortgageForm.control}
                          name="doubleMonthlyPrincipal"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Double Principal</FormLabel>
                                <FormDescription>Pay 2x principal each month</FormDescription>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>

              {/* Results Section */}
              <div className="lg:col-span-8 space-y-6">
                {/* Comparison Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-muted-foreground"></div>
                        Standard Payoff
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Months Remaining</span>
                          <span className="font-semibold">{standardSchedule.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Interest</span>
                          <span className="font-semibold text-destructive">
                            {formatCurrency(standardSchedule[standardSchedule.length - 1]?.totalInterest || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Payoff Date</span>
                          <span className="font-semibold">
                            {new Date(Date.now() + standardSchedule.length * 30.44 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-none shadow-md ring-1 ring-emerald-500/20 dark:ring-emerald-400/20 border-emerald-500/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        With Paydown Strategy
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Months Remaining</span>
                          <span className="font-semibold text-emerald-600">{paydownSchedule.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Interest</span>
                          <span className="font-semibold text-emerald-600">
                            {formatCurrency(paydownSchedule[paydownSchedule.length - 1]?.totalInterest || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Payoff Date</span>
                          <span className="font-semibold text-emerald-600">
                            {new Date(Date.now() + paydownSchedule.length * 30.44 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Savings Summary */}
                {paydownSchedule.length < standardSchedule.length && (
                  <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                        <div>
                          <h3 className="font-bold text-lg text-emerald-800 dark:text-emerald-200">Paydown Strategy Impact</h3>
                          <p className="text-emerald-700 dark:text-emerald-300">Your accelerated payments will save you:</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4">
                          <p className="text-sm text-emerald-700 dark:text-emerald-300">Time Saved</p>
                          <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                            {formatMonthsAsYearsMonths(standardSchedule.length - paydownSchedule.length)}
                          </p>
                        </div>
                        <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4">
                          <p className="text-sm text-emerald-700 dark:text-emerald-300">Interest Saved</p>
                          <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                            {formatCurrency(
                              (standardSchedule[standardSchedule.length - 1]?.totalInterest || 0) -
                              (paydownSchedule[paydownSchedule.length - 1]?.totalInterest || 0)
                            )}
                          </p>
                        </div>
                        <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4">
                          <p className="text-sm text-emerald-700 dark:text-emerald-300">Earlier Payoff</p>
                          <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                            {new Date(Date.now() + paydownSchedule.length * 30.44 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Balance Comparison Chart */}
                <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
                  <CardHeader>
                    <CardTitle>Balance Over Time</CardTitle>
                    <CardDescription>Standard vs accelerated payoff comparison</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={(() => {
                          const maxMonths = Math.max(standardSchedule.length, paydownSchedule.length);
                          const chartData = [];
                          for (let month = 0; month <= maxMonths; month += 12) {
                            const year = month / 12;
                            const stdEntry = standardSchedule.find(e => e.month === month) || standardSchedule[standardSchedule.length - 1];
                            const payEntry = paydownSchedule.find(e => e.month === month) || paydownSchedule[paydownSchedule.length - 1];
                            chartData.push({
                              year,
                              standard: month <= standardSchedule.length ? (standardSchedule.find(e => e.month === month)?.balance ?? (month === 0 ? existingMortgageValues.currentBalance : 0)) : null,
                              withStrategy: month <= paydownSchedule.length ? (paydownSchedule.find(e => e.month === month)?.balance ?? (month === 0 ? existingMortgageValues.currentBalance : 0)) : null,
                            });
                          }
                          return chartData;
                        })()}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="year"
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                          axisLine={false}
                          tickLine={false}
                          label={{ value: 'Years', position: 'insideBottom', offset: -5, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value) => value !== null ? formatCurrency(Number(value)) : 'Paid off'}
                          labelFormatter={(year) => `Year ${year}`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="standard"
                          name="Standard"
                          stroke="hsl(var(--muted-foreground))"
                          strokeWidth={2}
                          dot={false}
                          connectNulls={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="withStrategy"
                          name="With Strategy"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={false}
                          connectNulls={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Schedule Comparison Toggle */}
                <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() => setShowScheduleComparison(!showScheduleComparison)}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Schedule Comparison
                      </CardTitle>
                      {showScheduleComparison ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                    <CardDescription>
                      Compare amortization schedules side by side
                    </CardDescription>
                  </CardHeader>
                  {showScheduleComparison && (
                    <CardContent className="space-y-6">
                      {/* Summary Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Original Schedule Summary */}
                        <Card className="bg-muted/50 border">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base text-primary">Original Schedule</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Payoff Time:</span>
                              <span className="font-medium">{formatMonthsAsYearsMonths(standardSchedule.length)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Monthly Payment:</span>
                              <span className="font-medium">{formatCurrency(existingMortgageValues.existingMonthlyPayment)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Interest:</span>
                              <span className="font-medium">{formatCurrency(standardSchedule[standardSchedule.length - 1]?.totalInterest || 0)}</span>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Enhanced Strategy Summary */}
                        <Card className={`border ${paydownSchedule.length < standardSchedule.length ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-500/30' : 'bg-muted/50'}`}>
                          <CardHeader className="pb-2">
                            <CardTitle className={`text-base ${paydownSchedule.length < standardSchedule.length ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                              {paydownSchedule.length < standardSchedule.length ? 'Enhanced Payment Strategy' : 'No Strategy Selected'}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Payoff Time:</span>
                              <span className="font-medium">{formatMonthsAsYearsMonths(paydownSchedule.length)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Payment Amount:</span>
                              <span className="font-medium">{formatCurrency(paydownSchedule[0]?.payment || existingMortgageValues.existingMonthlyPayment)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Interest:</span>
                              <span className="font-medium">{formatCurrency(paydownSchedule[paydownSchedule.length - 1]?.totalInterest || 0)}</span>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Savings Summary */}
                        <Card className="bg-muted/50 border">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base text-emerald-600 dark:text-emerald-400">Savings</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Time Saved:</span>
                              <span className="font-medium">
                                {standardSchedule.length - paydownSchedule.length > 0
                                  ? formatMonthsAsYearsMonths(standardSchedule.length - paydownSchedule.length)
                                  : '0 months'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Interest Saved:</span>
                              <span className="font-medium">
                                {formatCurrency(
                                  Math.max(0, (standardSchedule[standardSchedule.length - 1]?.totalInterest || 0) -
                                  (paydownSchedule[paydownSchedule.length - 1]?.totalInterest || 0))
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Early Payoff:</span>
                              <span className="font-medium">
                                {new Date(Date.now() + paydownSchedule.length * 30.44 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Lock/Unlock Button */}
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setScrollLocked(!scrollLocked)}
                          className="flex items-center gap-2"
                        >
                          {scrollLocked ? (
                            <>
                              <Lock className="w-4 h-4" />
                              Unlock Scrolling
                            </>
                          ) : (
                            <>
                              <Unlock className="w-4 h-4" />
                              Lock Scrolling
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Side-by-Side Tables */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Original Schedule Table */}
                        <Card className="border overflow-hidden">
                          <CardHeader className="bg-primary/10 py-3">
                            <CardTitle className="text-base text-primary">Original Schedule</CardTitle>
                            <CardDescription className="text-xs">Standard monthly payments</CardDescription>
                          </CardHeader>
                          <CardContent className="p-0">
                            <div
                              ref={originalScheduleRef}
                              onScroll={() => handleSyncScroll('original')}
                              className="h-[350px] overflow-auto"
                            >
                              <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-muted z-10">
                                  <tr>
                                    <th className="text-left p-2 font-semibold">Month</th>
                                    <th className="text-right p-2 font-semibold">Payment</th>
                                    <th className="text-right p-2 font-semibold">Principal</th>
                                    <th className="text-right p-2 font-semibold">Interest</th>
                                    <th className="text-right p-2 font-semibold">Balance</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {standardSchedule.map((entry, idx) => (
                                    <tr key={idx} className={`border-b border-border hover:bg-muted/50 ${entry.month % 12 === 0 ? 'bg-primary/5' : ''}`}>
                                      <td className="p-2 font-medium">{entry.month}</td>
                                      <td className="p-2 text-right">{formatCurrency(entry.payment)}</td>
                                      <td className="p-2 text-right text-emerald-600">{formatCurrency(entry.principal)}</td>
                                      <td className="p-2 text-right text-destructive">{formatCurrency(entry.interest)}</td>
                                      <td className="p-2 text-right font-medium">{formatCurrency(entry.balance)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Enhanced Strategy Table */}
                        <Card className="border overflow-hidden">
                          <CardHeader className="bg-emerald-500/10 py-3">
                            <CardTitle className="text-base text-emerald-600 dark:text-emerald-400">Enhanced Payment Strategy</CardTitle>
                            <CardDescription className="text-xs">With extra payments</CardDescription>
                          </CardHeader>
                          <CardContent className="p-0">
                            <div
                              ref={enhancedScheduleRef}
                              onScroll={() => handleSyncScroll('enhanced')}
                              className="h-[350px] overflow-auto"
                            >
                              <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-muted z-10">
                                  <tr>
                                    <th className="text-left p-2 font-semibold">Month</th>
                                    <th className="text-right p-2 font-semibold">Payment</th>
                                    <th className="text-right p-2 font-semibold">Principal</th>
                                    <th className="text-right p-2 font-semibold">Interest</th>
                                    <th className="text-right p-2 font-semibold">Balance</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {paydownSchedule.map((entry, idx) => (
                                    <tr key={idx} className={`border-b border-border hover:bg-muted/50 ${entry.month % 12 === 0 ? 'bg-emerald-500/5' : ''}`}>
                                      <td className="p-2 font-medium">{entry.month}</td>
                                      <td className="p-2 text-right">{formatCurrency(entry.payment)}</td>
                                      <td className="p-2 text-right text-emerald-600">{formatCurrency(entry.principal)}</td>
                                      <td className="p-2 text-right text-destructive">{formatCurrency(entry.interest)}</td>
                                      <td className="p-2 text-right font-medium">{formatCurrency(entry.balance)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ============================================= */}
          {/* POINTS CALCULATOR TAB */}
          {/* ============================================= */}

          <TabsContent value="points">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Input Section */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="border-none shadow-lg ring-1 ring-black/5 dark:ring-white/20 overflow-hidden">
                  <CardHeader className="bg-card border-b pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Scale className="w-5 h-5 text-primary" />
                        Points Analysis
                      </CardTitle>
                      <ConfigurationManager
                        appId="mortgage-calculator-points"
                        currentData={getCurrentConfig()}
                        onLoad={handleLoadConfig}
                      />
                    </div>
                    <CardDescription>Compare different rate/points combinations.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 bg-card space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Loan Amount</label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            type="number"
                            value={pointsLoanAmount}
                            onChange={(e) => setPointsLoanAmount(Number(e.target.value))}
                            className="pl-7 bg-muted border"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Loan Term</label>
                        <Select value={String(pointsLoanTerm)} onValueChange={(val) => setPointsLoanTerm(Number(val))}>
                          <SelectTrigger className="bg-muted border mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 years</SelectItem>
                            <SelectItem value="20">20 years</SelectItem>
                            <SelectItem value="30">30 years</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-wider">Scenarios</h3>
                        <Button variant="outline" size="sm" onClick={addScenario}>
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </div>

                      {scenarios.map((scenario, idx) => (
                        <div key={scenario.id} className={`p-4 rounded-lg border ${scenario.isBaseline ? 'border-primary bg-primary/5' : 'border-border'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <Input
                              value={scenario.name}
                              onChange={(e) => updateScenario(scenario.id, 'name', e.target.value)}
                              className="h-8 w-32 text-sm bg-transparent border-none p-0 font-medium"
                            />
                            <div className="flex items-center gap-2">
                              {scenario.isBaseline ? (
                                <Badge variant="secondary" className="bg-primary/10 text-primary">Baseline</Badge>
                              ) : (
                                <Button variant="ghost" size="sm" onClick={() => setBaseline(scenario.id)}>
                                  Set Baseline
                                </Button>
                              )}
                              {scenarios.length > 1 && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeScenario(scenario.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-muted-foreground">Rate (%)</label>
                              <Input
                                type="number"
                                step="0.001"
                                value={scenario.rate}
                                onChange={(e) => updateScenario(scenario.id, 'rate', Number(e.target.value))}
                                className="h-8 mt-1 bg-muted"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Points</label>
                              <Input
                                type="number"
                                step="0.125"
                                value={scenario.points}
                                onChange={(e) => updateScenario(scenario.id, 'points', Number(e.target.value))}
                                className="h-8 mt-1 bg-muted"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Results Section */}
              <div className="lg:col-span-8 space-y-6">
                {/* Comparison Table */}
                <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
                  <CardHeader>
                    <CardTitle>Scenario Comparison</CardTitle>
                    <CardDescription>Side-by-side analysis of different rate/points combinations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-3">Scenario</th>
                            <th className="text-right p-3">Rate</th>
                            <th className="text-right p-3">Points Cost</th>
                            <th className="text-right p-3">Monthly P&I</th>
                            <th className="text-right p-3">Break-Even</th>
                            <th className="text-right p-3">Monthly Savings</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pointsResults.map((result, idx) => (
                            <tr key={result.scenario.id} className={`border-b border-border ${result.scenario.isBaseline ? 'bg-primary/5' : ''}`}>
                              <td className="p-3 font-medium">
                                {result.scenario.name}
                                {result.scenario.isBaseline && (
                                  <Badge variant="outline" className="ml-2 text-xs">Baseline</Badge>
                                )}
                              </td>
                              <td className="p-3 text-right">{result.scenario.rate.toFixed(3)}%</td>
                              <td className="p-3 text-right">{formatCurrency(result.pointCost)}</td>
                              <td className="p-3 text-right font-medium">{formatCurrency(result.monthlyPI)}</td>
                              <td className="p-3 text-right">
                                {result.breakEvenMonths !== null
                                  ? `${Math.round(result.breakEvenMonths)} mo`
                                  : '—'}
                              </td>
                              <td className={`p-3 text-right font-medium ${result.monthlySavings > 0 ? 'text-emerald-600' : ''}`}>
                                {result.monthlySavings > 0 ? formatCurrency(result.monthlySavings) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Cost Over Time Chart */}
                <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
                  <CardHeader>
                    <CardTitle>Total Cost at Different Time Horizons</CardTitle>
                    <CardDescription>Compare total costs at 5 years, 10 years, and full term</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            period: '5 Years',
                            ...Object.fromEntries(pointsResults.map(r => [r.scenario.name, r.totalCostAt5Years]))
                          },
                          {
                            period: '10 Years',
                            ...Object.fromEntries(pointsResults.map(r => [r.scenario.name, r.totalCostAt10Years]))
                          },
                          {
                            period: 'Full Term',
                            ...Object.fromEntries(pointsResults.map(r => [r.scenario.name, r.totalCostAtFullTerm]))
                          },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="period" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                        <Legend />
                        {pointsResults.map((result, idx) => (
                          <Bar
                            key={result.scenario.id}
                            dataKey={result.scenario.name}
                            fill={idx === 0 ? 'hsl(var(--primary))' : idx === 1 ? 'hsl(var(--accent))' : `hsl(${220 + idx * 30}, 70%, 50%)`}
                            radius={[4, 4, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Insight Card */}
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Understanding Points</h3>
                        <p className="text-blue-700 dark:text-blue-300 text-sm">
                          Each point costs 1% of the loan amount and typically reduces your rate by 0.25%.
                          Points make sense if you plan to keep the loan past the break-even point.
                          Consider your time horizon when deciding whether to buy points.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ============================================= */}
          {/* REFINANCE TAB */}
          {/* ============================================= */}

          <TabsContent value="refinance">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Input Section */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="border-none shadow-lg ring-1 ring-black/5 dark:ring-white/20 overflow-hidden">
                  <CardHeader className="bg-card border-b pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-primary" />
                        Refinance Analysis
                      </CardTitle>
                      <ConfigurationManager
                        appId="mortgage-calculator-refinance"
                        currentData={getCurrentConfig()}
                        onLoad={handleLoadConfig}
                      />
                    </div>
                    <CardDescription>Compare your current loan with refinancing options.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 bg-card">
                    <Form {...refinanceForm}>
                      <form className="space-y-6">
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                          <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                          Current Loan
                        </h3>

                        <div className="grid grid-cols-1 gap-4">
                          <FormField
                            control={refinanceForm.control}
                            name="currentBalance"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Current Balance</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                    <Input type="number" {...field} className="pl-7 bg-muted border" />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={refinanceForm.control}
                              name="currentRate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Current Rate</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Input type="number" step="0.001" {...field} className="pr-7 bg-muted border" />
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={refinanceForm.control}
                              name="currentMonthlyPayment"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Monthly P&I</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                      <Input type="number" {...field} className="pl-7 bg-muted border" />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <Separator />

                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                          <span className="w-1 h-4 bg-primary rounded-full"></span>
                          New Loan
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={refinanceForm.control}
                            name="newRate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>New Rate</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input type="number" step="0.001" {...field} className="pr-7 bg-muted border" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={refinanceForm.control}
                            name="newTerm"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>New Term</FormLabel>
                                <Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={String(field.value)}>
                                  <FormControl>
                                    <SelectTrigger className="bg-muted border">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="10">10 years</SelectItem>
                                    <SelectItem value="15">15 years</SelectItem>
                                    <SelectItem value="20">20 years</SelectItem>
                                    <SelectItem value="25">25 years</SelectItem>
                                    <SelectItem value="30">30 years</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={refinanceForm.control}
                            name="closingCosts"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Closing Costs</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                    <Input type="number" {...field} className="pl-7 bg-muted border" />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={refinanceForm.control}
                            name="newPoints"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Points</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input type="number" step="0.125" {...field} className="pr-7 bg-muted border" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={refinanceForm.control}
                          name="cashOut"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cash Out (Optional)</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                  <Input type="number" {...field} className="pl-7 bg-muted border" />
                                </div>
                              </FormControl>
                              <FormDescription>Amount to take from equity</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={refinanceForm.control}
                          name="includeClosingCostsInLoan"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Roll Costs Into Loan</FormLabel>
                                <FormDescription>Add closing costs to loan balance</FormDescription>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>

              {/* Results Section */}
              <div className="lg:col-span-8 space-y-6">
                {/* Recommendation Card */}
                <Card className={`border-2 ${
                  refinanceResult.recommendationType === 'excellent'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500'
                    : refinanceResult.recommendationType === 'good'
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                    : refinanceResult.recommendationType === 'marginal'
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-500'
                }`}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {refinanceResult.recommendationType === 'excellent' && <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />}
                      {refinanceResult.recommendationType === 'good' && <CheckCircle2 className="w-8 h-8 text-blue-600 flex-shrink-0" />}
                      {refinanceResult.recommendationType === 'marginal' && <AlertCircle className="w-8 h-8 text-amber-600 flex-shrink-0" />}
                      {refinanceResult.recommendationType === 'not-recommended' && <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />}
                      <div>
                        <h3 className="font-bold text-lg mb-2">Recommendation</h3>
                        <p className="text-foreground">{refinanceResult.recommendation}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground mb-1">New Monthly</p>
                      <p className="text-2xl font-bold">{formatCurrency(refinanceResult.newMonthlyPayment)}</p>
                      <p className={`text-sm ${refinanceResult.monthlySavings > 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                        {refinanceResult.monthlySavings > 0 ? '-' : '+'}{formatCurrency(Math.abs(refinanceResult.monthlySavings))}/mo
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground mb-1">Closing Costs</p>
                      <p className="text-2xl font-bold">{formatCurrency(refinanceResult.totalClosingCosts)}</p>
                      <p className="text-sm text-muted-foreground">
                        {((refinanceResult.totalClosingCosts / refinanceValues.currentBalance) * 100).toFixed(1)}% of balance
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground mb-1">Break-Even</p>
                      <p className="text-2xl font-bold">
                        {refinanceResult.breakEvenMonths === Infinity
                          ? 'Never'
                          : `${Math.round(refinanceResult.breakEvenMonths)} mo`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {refinanceResult.breakEvenMonths !== Infinity
                          ? `${(refinanceResult.breakEvenMonths / 12).toFixed(1)} years`
                          : 'N/A'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground mb-1">Interest Savings</p>
                      <p className={`text-2xl font-bold ${refinanceResult.interestSavings > 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                        {formatCurrency(refinanceResult.interestSavings)}
                      </p>
                      <p className="text-sm text-muted-foreground">Over loan life</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Comparison */}
                <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
                  <CardHeader>
                    <CardTitle>Detailed Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-3">Metric</th>
                            <th className="text-right p-3">Current Loan</th>
                            <th className="text-right p-3">New Loan</th>
                            <th className="text-right p-3">Difference</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-border">
                            <td className="p-3">Loan Amount</td>
                            <td className="p-3 text-right">{formatCurrency(refinanceValues.currentBalance)}</td>
                            <td className="p-3 text-right">{formatCurrency(refinanceResult.newLoanAmount)}</td>
                            <td className={`p-3 text-right font-medium ${refinanceResult.newLoanAmount > refinanceValues.currentBalance ? 'text-destructive' : 'text-emerald-600'}`}>
                              {refinanceResult.newLoanAmount > refinanceValues.currentBalance ? '+' : '-'}
                              {formatCurrency(Math.abs(refinanceResult.newLoanAmount - refinanceValues.currentBalance))}
                            </td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="p-3">Monthly Payment</td>
                            <td className="p-3 text-right">{formatCurrency(refinanceValues.currentMonthlyPayment)}</td>
                            <td className="p-3 text-right">{formatCurrency(refinanceResult.newMonthlyPayment)}</td>
                            <td className={`p-3 text-right font-medium ${refinanceResult.monthlySavings > 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                              {refinanceResult.monthlySavings > 0 ? '-' : '+'}
                              {formatCurrency(Math.abs(refinanceResult.monthlySavings))}
                            </td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="p-3">Interest Rate</td>
                            <td className="p-3 text-right">{refinanceValues.currentRate.toFixed(3)}%</td>
                            <td className="p-3 text-right">{refinanceValues.newRate.toFixed(3)}%</td>
                            <td className={`p-3 text-right font-medium ${refinanceValues.newRate < refinanceValues.currentRate ? 'text-emerald-600' : 'text-destructive'}`}>
                              {(refinanceValues.newRate - refinanceValues.currentRate).toFixed(3)}%
                            </td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="p-3">Remaining Term</td>
                            <td className="p-3 text-right">{formatMonthsAsYearsMonths(refinanceResult.remainingMonths)}</td>
                            <td className="p-3 text-right">{refinanceValues.newTerm} years</td>
                            <td className={`p-3 text-right font-medium ${refinanceValues.newTerm * 12 < refinanceResult.remainingMonths ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                              {((refinanceValues.newTerm * 12 - refinanceResult.remainingMonths) / 12).toFixed(1)} years
                            </td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="p-3">Total Interest</td>
                            <td className="p-3 text-right">{formatCurrency(refinanceResult.currentTotalInterest)}</td>
                            <td className="p-3 text-right">{formatCurrency(refinanceResult.newTotalInterest)}</td>
                            <td className={`p-3 text-right font-medium ${refinanceResult.interestSavings > 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                              {refinanceResult.interestSavings > 0 ? '-' : '+'}
                              {formatCurrency(Math.abs(refinanceResult.interestSavings))}
                            </td>
                          </tr>
                          <tr className="bg-primary/5">
                            <td className="p-3 font-semibold">Total Cost</td>
                            <td className="p-3 text-right font-semibold">{formatCurrency(refinanceResult.currentTotalCost)}</td>
                            <td className="p-3 text-right font-semibold">{formatCurrency(refinanceResult.newTotalCost)}</td>
                            <td className={`p-3 text-right font-bold ${refinanceResult.netSavings > 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                              {refinanceResult.netSavings > 0 ? '-' : '+'}
                              {formatCurrency(Math.abs(refinanceResult.netSavings))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
