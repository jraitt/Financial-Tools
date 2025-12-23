'use client';

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { calculatePTC, formatCurrency, type PTCResults, type FplLocation } from "@/lib/ptc-calculations";
import { ConfigurationManager } from "@/components/configuration-manager";
import { Heart, DollarSign, Users, Calculator, Info, Minus, Plus, Percent, AlertCircle, HelpCircle } from "lucide-react";

const formSchema = z.object({
  taxYear: z.coerce.number().min(2024).max(2026),
  familySize: z.coerce.number().min(1).max(20),
  magi: z.coerce.number().min(0),
  location: z.enum(["CONTIGUOUS_48", "ALASKA", "HAWAII"]),
  slcspMonthlyPremium: z.coerce.number().min(0),
  subsidyCliff: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

const educationalTerms = [
  {
    term: "ACA (Affordable Care Act)",
    definition: "Often referred to as 'Obamacare', this comprehensive health care reform law was enacted in March 2010. It aims to make affordable health insurance available to more people."
  },
  {
    term: "PTC (Premium Tax Credit)",
    definition: "A refundable tax credit designed to help eligible individuals and families with low or moderate income afford health insurance purchased through the Health Insurance Marketplace."
  },
  {
    term: "FPL (Federal Poverty Level)",
    definition: "A measure of income issued annually by the Department of Health and Human Services (HHS). Your income relative to the FPL determines your eligibility for subsidies. Subsidies are often available for incomes between 100% and 400% of the FPL."
  },
  {
    term: "MAGI (Modified Adjusted Gross Income)",
    definition: "Used to determine eligibility for the PTC. For most people, it is your Adjusted Gross Income (AGI) plus tax-exempt Social Security benefits, tax-exempt interest, and excluded foreign income."
  },
  {
    term: "SLCSP (Second Lowest Cost Silver Plan)",
    definition: "The benchmark plan used to determine your Premium Tax Credit amount. It is the second-lowest priced Silver plan available in your area that covers your family."
  },
  {
    term: "APTC (Advance Premium Tax Credit)",
    definition: "Tax credits paid in advance directly to your insurance company to lower your monthly premiums. When you file your taxes, you reconcile the APTC paid on your behalf with the PTC you are actually eligible for."
  }
];

export default function AcaPtcCalculator() {
  const [results, setResults] = useState<PTCResults | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      taxYear: 2025,
      familySize: 2,
      magi: 60000,
      location: "CONTIGUOUS_48",
      slcspMonthlyPremium: 1200,
      subsidyCliff: false,
    },
  });

  const allValues = form.watch();
  const familySize = form.watch("familySize");
  const taxYear = form.watch("taxYear");

  // Auto-calculate on any form change
  useEffect(() => {
    const timer = setTimeout(async () => {
      const isValid = await form.trigger();
      if (isValid) {
        try {
          const values = form.getValues();
          const calculationResults = calculatePTC({
            taxYear: values.taxYear,
            familySize: values.familySize,
            magi: values.magi,
            location: values.location as FplLocation,
            slcspMonthlyPremium: values.slcspMonthlyPremium,
            subsidyCliff: values.subsidyCliff,
          });
          setResults(calculationResults);
        } catch (e) {
          console.error("Calculation error:", e);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [allValues, form]);

  const incrementFamilySize = () => {
    if (familySize < 20) {
      form.setValue("familySize", familySize + 1);
    }
  };

  const decrementFamilySize = () => {
    if (familySize > 1) {
      form.setValue("familySize", familySize - 1);
    }
  };

  const handleLoadConfig = (data: FormValues) => {
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
                    <Heart className="w-5 h-5 text-primary" />
                    Your Information
                  </CardTitle>
                  <ConfigurationManager
                    appId="ptc-calculator"
                    currentData={allValues}
                    onLoad={handleLoadConfig}
                  />
                </div>
                <CardDescription>Enter your details to estimate your premium tax credit.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 bg-card">
                <Form {...form}>
                  <form className="space-y-6">

                    {/* Tax Year Selection */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1 h-4 bg-primary rounded-full"></span>
                        Tax Year
                      </h3>

                      <FormField
                        control={form.control}
                        name="taxYear"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="flex bg-muted p-1 rounded-lg">
                                {[2024, 2025, 2026].map((year) => (
                                  <button
                                    key={year}
                                    type="button"
                                    onClick={() => field.onChange(year)}
                                    className={`flex-1 px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                                      field.value === year
                                        ? 'bg-card text-primary shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                  >
                                    {year}
                                  </button>
                                ))}
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    {/* Household Information */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1 h-4 bg-accent rounded-full"></span>
                        Household
                      </h3>

                      <FormField
                        control={form.control}
                        name="familySize"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>Tax Family Size</FormLabel>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={decrementFamilySize}
                                  disabled={familySize <= 1}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-10 text-center text-lg font-semibold">{field.value}</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={incrementFamilySize}
                                  disabled={familySize >= 20}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <FormDescription className="text-xs">
                              Include yourself, spouse, and dependents claimed on your tax return
                            </FormDescription>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="magi"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Household Income (MAGI)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <Input
                                  type="number"
                                  {...field}
                                  className="pl-7 bg-muted border"
                                  placeholder="60000"
                                />
                              </div>
                            </FormControl>
                            <FormDescription className="text-xs">
                              Your Modified Adjusted Gross Income for the tax year
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-muted border">
                                  <SelectValue placeholder="Select location" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="CONTIGUOUS_48">48 States & DC</SelectItem>
                                <SelectItem value="ALASKA">Alaska</SelectItem>
                                <SelectItem value="HAWAII">Hawaii</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-xs">
                              Alaska and Hawaii have higher FPL thresholds
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    {/* Insurance Information */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1 h-4 bg-primary rounded-full"></span>
                        Insurance
                      </h3>

                      <FormField
                        control={form.control}
                        name="slcspMonthlyPremium"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SLCSP Monthly Premium</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <Input
                                  type="number"
                                  {...field}
                                  className="pl-7 bg-muted border"
                                  placeholder="1200"
                                />
                              </div>
                            </FormControl>
                            <FormDescription className="text-xs">
                              Find your SLCSP at{' '}
                              <a
                                href="https://www.healthcare.gov/see-plans/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                healthcare.gov
                              </a>
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    {/* Advanced Options */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1 h-4 bg-accent rounded-full"></span>
                        Planning Options
                      </h3>

                      <FormField
                        control={form.control}
                        name="subsidyCliff"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4 bg-muted/50">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Subsidy Cliff Scenario
                              </FormLabel>
                              <FormDescription className="text-xs">
                                Model if enhanced subsidies expire (400% FPL cutoff)
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={taxYear !== 2026}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      {taxYear !== 2026 && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          Cliff scenario only applies to 2026 tax year
                        </p>
                      )}
                    </div>

                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-8 space-y-6">

            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-accent to-accent/80 border-none shadow-lg ring-1 ring-black/5">
                <CardContent className="p-6 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-white/20 rounded-full text-white">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <Badge className="bg-white/20 text-white hover:bg-white/30 border-0">Annual</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-white/80 font-medium mb-1">Estimated Annual Credit</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight">
                      {results ? formatCurrency(results.totalAllowedPTC) : "..."}
                    </h3>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
                <CardContent className="p-6 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-primary/10 rounded-full text-primary">
                      <Heart className="w-5 h-5" />
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">Monthly</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium mb-1">Monthly Subsidy</p>
                    <h3 className="text-3xl font-bold text-foreground tracking-tight">
                      {results ? formatCurrency(results.monthlyPTC) : "..."}
                    </h3>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
                <CardContent className="p-6 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-amber-500/10 rounded-full text-amber-600 dark:text-amber-400">
                      <Percent className="w-5 h-5" />
                    </div>
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20">Contribution</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium mb-1">Your Monthly Cost</p>
                    <h3 className="text-3xl font-bold text-foreground tracking-tight">
                      {results ? formatCurrency(results.monthlyContribution) : "..."}
                    </h3>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Eligibility Message */}
            {results && (
              <Card className={`border-none shadow-md ring-1 ${
                results.isEligible
                  ? 'ring-accent/30 bg-accent/5'
                  : 'ring-amber-500/30 bg-amber-500/5'
              }`}>
                <CardContent className="p-4 flex items-center gap-3">
                  {results.isEligible ? (
                    <div className="p-2 bg-accent/20 rounded-full text-accent">
                      <Heart className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="p-2 bg-amber-500/20 rounded-full text-amber-600 dark:text-amber-400">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                  )}
                  <p className={`font-medium ${
                    results.isEligible ? 'text-accent' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {results.eligibilityMessage}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Calculation Breakdown */}
            <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-primary" />
                  Calculation Breakdown
                </CardTitle>
                <CardDescription>Form 8962 Part I calculations based on your inputs.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                        4
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Federal Poverty Line (FPL)</p>
                        <p className="text-xs text-muted-foreground">Based on family size and location</p>
                      </div>
                    </div>
                    <span className="font-bold text-lg text-foreground">
                      {results ? formatCurrency(results.fpl) : "..."}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                        5
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Income as % of FPL</p>
                        <p className="text-xs text-muted-foreground">Your household income divided by FPL</p>
                      </div>
                    </div>
                    <span className="font-bold text-lg text-foreground">
                      {results ? `${results.fplPercentage.toFixed(0)}%` : "..."}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                        7
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Applicable Figure</p>
                        <p className="text-xs text-muted-foreground">Percentage of income for contribution</p>
                      </div>
                    </div>
                    <span className="font-bold text-lg text-foreground">
                      {results ? `${(results.applicableFigure * 100).toFixed(2)}%` : "..."}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                        8a
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Annual Contribution</p>
                        <p className="text-xs text-muted-foreground">Income × applicable figure</p>
                      </div>
                    </div>
                    <span className="font-bold text-lg text-foreground">
                      {results ? formatCurrency(results.annualContribution) : "..."}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                        8b
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Monthly Contribution</p>
                        <p className="text-xs text-muted-foreground">Annual contribution ÷ 12</p>
                      </div>
                    </div>
                    <span className="font-bold text-lg text-foreground">
                      {results ? formatCurrency(results.monthlyContribution, 2) : "..."}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Estimated Monthly PTC</p>
                        <p className="text-xs text-muted-foreground">SLCSP premium − your contribution</p>
                      </div>
                    </div>
                    <span className="font-bold text-lg text-accent">
                      {results ? formatCurrency(results.monthlyPTC, 2) : "..."}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Educational Info */}
            <Card className="bg-card border-none shadow-md ring-1 ring-black/5 dark:ring-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  Key Terms & Information
                </CardTitle>
                <CardDescription>Understanding the Premium Tax Credit</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {educationalTerms.map((item, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left font-semibold text-primary hover:no-underline">
                        {item.term}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.definition}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
