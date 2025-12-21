'use client';

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addMonths, parseISO, startOfMonth } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { calculateLifetimeBenefit, generateStrategies, getFRADate, calculateSurvivorBenefits } from "@/lib/ss-calculations";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { Calculator, TrendingUp, Users, CalendarClock, DollarSign } from "lucide-react";
import { ConfigurationManager } from "@/components/configuration-manager";

const formSchema = z.object({
  maritalStatus: z.enum(["Single", "Married"]),
  primaryBirthDate: z.string(),
  primaryPia: z.coerce.number().min(0),
  primaryClaimDate: z.string(), // YYYY-MM
  spouseBirthDate: z.string(),
  spousePia: z.coerce.number().min(0),
  spouseClaimDate: z.string(), // YYYY-MM
  spousalClaimDate: z.string(), // YYYY-MM
  inflationRate: z.coerce.number().min(0).max(10),
}).superRefine((data, ctx) => {
  // Validation for Primary
  const primaryBirth = parseISO(data.primaryBirthDate);
  const primaryClaim = parseISO(data.primaryClaimDate + "-01");
  // Age 62 check
  // Rule: Must be 62 for the entire month.
  // - Born on 1st or 2nd: Eligible in birth month of 62nd year.
  // - Born after 2nd: Eligible in following month.
  let primaryMinDate = startOfMonth(addMonths(primaryBirth, 62 * 12));
  if (primaryBirth.getDate() > 2) {
    primaryMinDate = addMonths(primaryMinDate, 1);
  }

  if (primaryClaim < primaryMinDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Cannot claim before age 62 (Earliest: ${format(primaryMinDate, 'MMM yyyy')})`,
      path: ["primaryClaimDate"],
    });
  }

  // Validation for Spouse
  if (data.maritalStatus === "Married") {
    const spouseBirth = parseISO(data.spouseBirthDate);
    const spouseClaim = parseISO(data.spouseClaimDate + "-01");
    let spouseMinDate = startOfMonth(addMonths(spouseBirth, 62 * 12));
    if (spouseBirth.getDate() > 2) {
      spouseMinDate = addMonths(spouseMinDate, 1);
    }

    if (spouseClaim < spouseMinDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Cannot claim before age 62 (Earliest: ${format(spouseMinDate, 'MMM yyyy')})`,
        path: ["spouseClaimDate"],
      });
    }

    // Spousal Benefit Rule: Cannot claim spousal benefits before primary earner claims
    const spousalClaim = parseISO(data.spousalClaimDate + "-01");
    if (spousalClaim < primaryClaim) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cannot claim before primary earner",
        path: ["spousalClaimDate"],
      });
    }

    if (spousalClaim < spouseMinDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Cannot claim before age 62 (Earliest: ${format(spouseMinDate, 'MMM yyyy')})`,
        path: ["spousalClaimDate"],
      });
    }
  }
});

export default function SocialSecurityCalculator() {
  const [results, setResults] = useState<any>(null);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [survivorBenefits, setSurvivorBenefits] = useState<any>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      maritalStatus: "Married",
      primaryBirthDate: "1963-12-02",
      primaryPia: 4083,
      primaryClaimDate: "2033-12",
      spouseBirthDate: "1967-06-21",
      spousePia: 1725,
      spouseClaimDate: "2029-07",
      spousalClaimDate: "2033-12",
      inflationRate: 0,
    },
  });

  const calculate = (values: z.infer<typeof formSchema>) => {
    const inputs = {
      maritalStatus: values.maritalStatus,
      primary: {
        birthDate: parseISO(values.primaryBirthDate),
        pia: values.primaryPia,
        claimDate: parseISO(values.primaryClaimDate + "-01"),
      },
      spouse: {
        birthDate: parseISO(values.spouseBirthDate),
        pia: values.spousePia,
        claimDate: parseISO(values.spouseClaimDate + "-01"),
      },
      spousalClaimDate: parseISO(values.spousalClaimDate + "-01"),
      inflationRate: values.inflationRate,
    };

    const currentStrategy = calculateLifetimeBenefit(inputs);
    const topStrategies = generateStrategies(inputs);
    const survivor = calculateSurvivorBenefits(inputs);

    setResults(currentStrategy);
    setStrategies(topStrategies);
    setSurvivorBenefits(survivor);
  };

  // Auto-calculate on any form change
  const allValues = form.watch();

  useEffect(() => {
    const timer = setTimeout(async () => {
      const isValid = await form.trigger();

      if (isValid) {
        try {
          const values = form.getValues();
          const inputs = {
            maritalStatus: values.maritalStatus,
            primary: {
              birthDate: parseISO(values.primaryBirthDate),
              pia: values.primaryPia,
              claimDate: parseISO(values.primaryClaimDate + "-01"),
            },
            spouse: {
              birthDate: parseISO(values.spouseBirthDate),
              pia: values.spousePia,
              claimDate: parseISO(values.spouseClaimDate + "-01"),
            },
            spousalClaimDate: parseISO(values.spousalClaimDate + "-01"),
            inflationRate: values.inflationRate,
          };

          const currentStrategy = calculateLifetimeBenefit(inputs);
          const topStrategies = generateStrategies(inputs);
          const survivor = calculateSurvivorBenefits(inputs);

          setResults(currentStrategy);
          setStrategies(topStrategies);
          setSurvivorBenefits(survivor);
        } catch (e) {
          console.error("Calculation error:", e);
        }
      } else {
        // If invalid, clear results to indicate issue
        // Optional: could keep old results, but clearing makes issues obvious
        // setResults(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [allValues, form]);

  const handleLoadConfig = (data: any) => {
    // Reset form with loaded data
    form.reset(data);
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <div className="max-w-7xl mx-auto px-4 pt-2 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Input Section */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-none shadow-lg ring-1 ring-black/5 dark:ring-white/20 overflow-hidden">
              <CardHeader className="bg-card border-b pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Profile Inputs
                  </CardTitle>
                  <ConfigurationManager
                    appId="social-security"
                    currentData={allValues}
                    onLoad={handleLoadConfig}
                  />
                </div>
                <CardDescription>Enter your details to generate scenarios.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 bg-card">
                <Form {...form}>
                  <form className="space-y-6">

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1 h-4 bg-primary rounded-full"></span>
                        Primary Earner
                      </h3>

                      <FormField
                        control={form.control}
                        name="maritalStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Marital Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-muted border">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Single">Single</SelectItem>
                                <SelectItem value="Married">Married</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="primaryBirthDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Birth Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} className="bg-muted border" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="primaryPia"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>PIA Amount</FormLabel>
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

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="primaryClaimDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Claim Date</FormLabel>
                              <FormControl>
                                <Input type="month" {...field} className="bg-muted border" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    {form.watch("maritalStatus") === "Married" && (
                      <div className="space-y-4 animate-in slide-in-from-top-4 fade-in duration-500">
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                          <span className="w-1 h-4 bg-accent rounded-full"></span>
                          Spouse
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="spouseBirthDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Birth Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} className="bg-muted border" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="spousePia"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>PIA Amount</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                    <Input type="number" {...field} className="pl-7 bg-muted border" />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="spouseClaimDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Claim Date</FormLabel>
                                <FormControl>
                                  <Input type="month" {...field} className="bg-muted border" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="spousalClaimDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Spousal Benefit Date</FormLabel>
                                <FormControl>
                                  <Input type="month" {...field} className="bg-muted border" />
                                </FormControl>
                                <FormDescription className="text-xs">When spouse claims spousal benefit</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}

                    <Separator />

                    <FormField
                      control={form.control}
                      name="inflationRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Annual Inflation Rate (%)</FormLabel>
                          <div className="flex items-center gap-4">
                            <FormControl>
                              <div className="relative w-24">
                                <Input type="number" step="0.1" {...field} className="pr-6 bg-muted border" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                              </div>
                            </FormControl>
                            <span className="text-xs text-muted-foreground">Adjusts projection</span>
                          </div>
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

            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
                <CardContent className="p-6 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-primary/10 rounded-full text-primary">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">Projected Lifetime</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium mb-1">Total Lifetime Benefit</p>
                    <h3 className="text-3xl font-bold text-foreground tracking-tight">
                      {results ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(results.total) : "..."}
                    </h3>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
                <CardContent className="p-6 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-full text-emerald-700 dark:text-emerald-300">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-500/30">Top Strategy</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium mb-1">Best Alternative</p>
                    <h3 className="text-xl font-bold text-foreground tracking-tight mb-1">
                      {strategies[0]?.name || "Calculating..."}
                    </h3>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                      +{strategies[0] && results ? ((strategies[0].totalBenefit - results.total) > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(strategies[0].totalBenefit - results.total) : "$0") : "..."} vs current
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
                <CardContent className="p-6 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-purple-500/10 rounded-full text-purple-600">
                      <CalendarClock className="w-5 h-5" />
                    </div>
                    <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20">Years</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium mb-1">Projection Period</p>
                    <h3 className="text-3xl font-bold text-foreground tracking-tight">
                      To Age 90
                    </h3>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chart Tabs */}
            <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
              <CardHeader>
                <CardTitle>Strategy Comparison</CardTitle>
                <CardDescription>Visualize how different claiming ages affect your total wealth.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="chart" className="w-full">
                  <TabsList className="mb-4 bg-muted p-1">
                    <TabsTrigger value="chart">Comparison Chart</TabsTrigger>
                    <TabsTrigger value="strategies">Top 5 Strategies</TabsTrigger>
                  </TabsList>

                  <TabsContent value="chart" className="h-[400px] w-full mt-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={strategies}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={140}
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                          interval={0}
                        />
                        <Tooltip
                          cursor={{ fill: 'hsl(var(--muted))' }}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value))}
                        />
                        <Bar
                          dataKey="totalBenefit"
                          fill="hsl(var(--primary))"
                          radius={[0, 4, 4, 0]}
                          barSize={32}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </TabsContent>

                  <TabsContent value="strategies">
                    <div className="space-y-4">
                      {strategies.map((strat, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-accent/20 text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                              {idx + 1}
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground">{strat.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                Primary: <span className="font-medium">{format(strat.primaryDate, 'MMM yyyy')}</span> •
                                Spouse: <span className="font-medium">{format(strat.spouseDate, 'MMM yyyy')}</span>
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-foreground">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(strat.totalBenefit)}
                            </div>
                            {idx === 0 && <span className="text-xs font-medium text-accent-foreground bg-accent/10 px-2 py-0.5 rounded-full">Best Option</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Cashflow Chart */}
            {results && results.monthlyData && (
              <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
                <CardHeader>
                  <CardTitle>Projected Monthly Income</CardTitle>
                  <CardDescription>Estimated monthly cashflow from Social Security over time (adjusted for inflation).</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={results.monthlyData.filter((_: any, i: number) => i % 12 === 0)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="year"
                        tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value))}
                        labelFormatter={(label) => `Year: ${label}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Annual Cash Flow Projection Table */}
            {results && results.annualData && (
              <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
                <CardHeader>
                  <CardTitle>Annual Cash Flow Projection</CardTitle>
                  <CardDescription>Year-by-year breakdown of retirement income for you and your spouse.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border bg-primary text-primary-foreground">
                          <th className="px-4 py-3 text-left text-sm font-semibold">Year</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold">Age</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold">Sp. Age</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold">Your Retirement</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold">Spouse Retirement</th>
                          {form.watch("maritalStatus") === "Married" && (
                            <th className="px-4 py-3 text-right text-sm font-semibold">Spouse Spousal</th>
                          )}
                          <th className="px-4 py-3 text-right text-sm font-semibold font-bold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const data = results.annualData.slice(0, 30);

                          // Find first year where total stabilizes and stays stable for the rest
                          let stableYearIndex = data.length - 1;
                          for (let i = 0; i < data.length - 1; i++) {
                            // Check if this year has the same total as the next year
                            if (Math.abs(data[i].total - data[i + 1].total) < 1) {
                              // Make sure it stays stable for rest of data
                              let staysStable = true;
                              for (let j = i + 1; j < data.length - 1; j++) {
                                if (Math.abs(data[j].total - data[j + 1].total) >= 1) {
                                  staysStable = false;
                                  break;
                                }
                              }
                              if (staysStable) {
                                stableYearIndex = i;
                                break;
                              }
                            }
                          }

                          // Display rows before the stable year
                          const rowsToDisplay = data.slice(0, stableYearIndex);

                          return (
                            <>
                              {rowsToDisplay.map((row: any, idx: number) => (
                                <tr
                                  key={idx}
                                  className={`border-b border-border ${idx % 2 === 0 ? 'bg-muted/50' : 'bg-card'} hover:bg-primary/5 transition-colors`}
                                >
                                  <td className="px-4 py-3 text-sm font-medium text-foreground">{row.year}</td>
                                  <td className="px-4 py-3 text-sm text-muted-foreground text-center">{row.primaryAge}</td>
                                  <td className="px-4 py-3 text-sm text-muted-foreground text-center">{row.spouseAge}</td>
                                  <td className="px-4 py-3 text-sm text-right font-medium text-foreground">
                                    {row.primaryBenefit > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(row.primaryBenefit) : '$0'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-right font-medium text-foreground">
                                    {row.spouseBenefit > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(row.spouseBenefit) : '$0'}
                                  </td>
                                  {form.watch("maritalStatus") === "Married" && (
                                    <td className="px-4 py-3 text-sm text-right font-medium text-primary">
                                      {row.spousalAddOn > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(row.spousalAddOn) : '$0'}
                                    </td>
                                  )}
                                  <td className="px-4 py-3 text-sm text-right font-bold text-foreground bg-primary/10/50">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(row.total)}
                                  </td>
                                </tr>
                              ))}

                              {stableYearIndex < data.length && (
                                <tr className="border-b border-border bg-muted/50 hover:bg-primary/5 transition-colors">
                                  <td className="px-4 py-3 text-sm font-medium text-foreground">{data[stableYearIndex].year} and beyond</td>
                                  <td className="px-4 py-3 text-sm text-muted-foreground text-center">{data[stableYearIndex].primaryAge}</td>
                                  <td className="px-4 py-3 text-sm text-muted-foreground text-center">{data[stableYearIndex].spouseAge}</td>
                                  <td className="px-4 py-3 text-sm text-right font-medium text-foreground">
                                    {data[stableYearIndex].primaryBenefit > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(data[stableYearIndex].primaryBenefit) : '$0'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-right font-medium text-foreground">
                                    {data[stableYearIndex].spouseBenefit > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(data[stableYearIndex].spouseBenefit) : '$0'}
                                  </td>
                                  {form.watch("maritalStatus") === "Married" && (
                                    <td className="px-4 py-3 text-sm text-right font-medium text-primary">
                                      {data[stableYearIndex].spousalAddOn > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(data[stableYearIndex].spousalAddOn) : '$0'}
                                    </td>
                                  )}
                                  <td className="px-4 py-3 text-sm text-right font-bold text-foreground bg-primary/10/50">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(data[stableYearIndex].total)}
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">Showing first 30 years of projection (adjusted for inflation)</p>
                </CardContent>
              </Card>
            )}

            {/* Survivor Benefits Section */}
            {survivorBenefits && form.watch("maritalStatus") === "Married" && (
              <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
                <CardHeader>
                  <CardTitle>Survivor Benefit Scenarios</CardTitle>
                  <CardDescription>What would the surviving spouse receive if one spouse passes away?</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Scenario 1: Primary Dies */}
                    <div className="border border rounded-lg p-6 bg-muted/50">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-orange-500/10 rounded-full text-orange-600 dark:text-orange-400">
                          <Users className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold text-foreground">If Primary Passes Away</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-card rounded p-3">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Yearly Benefit</p>
                          <p className="text-2xl font-bold text-foreground">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(survivorBenefits.primaryDies.spouseSurvival)}
                          </p>
                        </div>
                        <div className="bg-card rounded p-3">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Monthly Benefit</p>
                          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(survivorBenefits.primaryDies.monthlyAmount)}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground pt-2 border-t border">
                          {survivorBenefits.primaryDies.note}
                        </p>
                      </div>
                    </div>

                    {/* Scenario 2: Spouse Dies */}
                    <div className="border border rounded-lg p-6 bg-muted/50">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-primary/20 rounded-full text-primary">
                          <Users className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold text-foreground">If Spouse Passes Away</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-card rounded p-3">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Yearly Benefit</p>
                          <p className="text-2xl font-bold text-foreground">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(survivorBenefits.spouseDies.primaryContinues)}
                          </p>
                        </div>
                        <div className="bg-card rounded p-3">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Monthly Benefit</p>
                          <p className="text-2xl font-bold text-primary">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(survivorBenefits.spouseDies.monthlyAmount)}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground pt-2 border-t border">
                          {survivorBenefits.spouseDies.note}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
