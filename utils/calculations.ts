
import { Client, MonthlyData, SolarCalculationResult, initialMonthlyData } from '../types';

export const calculateSolarSystem = (client: Client): SolarCalculationResult => {
  // 1. Consumption Totals & Averages
  const consumptionValues = Object.values(client.consumption);
  const totalConsumption = consumptionValues.reduce((a, b) => a + b, 0);
  const avgMonthlyConsumption = totalConsumption / 12;
  const avgDailyConsumption = avgMonthlyConsumption / 30;

  // 2. Irradiation Averages
  const irradiationValues = Object.values(client.irradiation);
  const totalIrradiation = irradiationValues.reduce((a, b) => a + b, 0);
  const avgIrradiation = totalIrradiation / 12;
  const safeIrradiation = avgIrradiation || 1;
  
  // 3. Required Power
  const requiredSystemPowerKWp = avgDailyConsumption / (safeIrradiation * client.systemEfficiency);

  // 4. Panels
  const panelPowerKW = client.panelPowerWp / 1000;
  const panelCountRaw = requiredSystemPowerKWp / (panelPowerKW || 0.550);
  const panelCountRounded = Math.ceil(panelCountRaw);
  const totalSystemPowerKWp = panelCountRounded * panelPowerKW;

  // 5. Generation Per Month & Totals
  const monthlyGeneration: MonthlyData = { ...initialMonthlyData };
  let totalGeneration = 0;

  const keys = Object.keys(client.irradiation) as Array<keyof MonthlyData>;
  keys.forEach((key) => {
    const days = 30; 
    const irrad = client.irradiation[key];
    const gen = totalSystemPowerKWp * irrad * days * client.systemEfficiency;
    monthlyGeneration[key] = gen;
    totalGeneration += gen;
  });

  const avgMonthlyGeneration = totalGeneration / 12;

  // 6. Financials (Annualized Approach for Accuracy)
  const kwhPrice = client.kwhPrice || 0;
  
  // Calculate Investment Components
  const kitPrice = client.kitPrice || 0;
  const extraMaterials = client.extraMaterials || 0;
  
  let laborCost = 0;
  if (client.laborType === 'percent') {
    const percent = client.laborPercent || 0;
    laborCost = kitPrice * (percent / 100);
  } else {
    laborCost = client.laborPrice || 0;
  }

  const totalInvestment = kitPrice + laborCost + extraMaterials;
  
  // Annual Bill WITHOUT Solar
  const annualBillWithoutSolar = totalConsumption * kwhPrice;
  
  // Availability Cost (Minimum Bill Rules)
  let minKwh = 30; 
  if (client.connectionType === 'bifasico') minKwh = 50;
  if (client.connectionType === 'trifasico') minKwh = 100;

  const monthlyMinimumCost = minKwh * kwhPrice;
  const annualMinimumCost = monthlyMinimumCost * 12;

  // Calculate Bill WITH Solar
  // Rule: You pay for what you consume minus what you generate (Net), 
  // BUT you cannot offset the "Availability Cost" (Minimum Bill).
  // Credits from excess generation can offset energy consumption in other months, 
  // but they CANNOT pay for the availability cost.
  
  // Max offsettable energy = Total Consumption - (12 * Minimum KWh)
  // If Total Consumption < 12 * MinKWh (Very low consumption), then Offsettable is 0.
  const annualOffsettableConsumption = Math.max(0, totalConsumption - (12 * minKwh));
  
  // The energy we can effectively "save" is the minimum of:
  // 1. What we generated
  // 2. What we are allowed to offset (Total Cons - Minimums)
  const effectiveSavedKwh = Math.min(totalGeneration, annualOffsettableConsumption);
  
  const annualSavings = effectiveSavedKwh * kwhPrice;
  
  // Annual Bill With Solar = (Bill Without) - (Savings)
  let annualBillWithSolar = annualBillWithoutSolar - annualSavings;
  
  // Safety clamp: Bill cannot be lower than annual minimum cost (availability cost)
  if (annualBillWithSolar < annualMinimumCost) {
    annualBillWithSolar = annualMinimumCost;
  }

  // Monthly Averages for Display
  const monthlyBillWithoutSolar = annualBillWithoutSolar / 12;
  const monthlyBillWithSolar = annualBillWithSolar / 12;
  const monthlySavings = annualSavings / 12;
  
  // Payback
  // Payback Months = Total Investment / Monthly Savings
  const paybackMonths = (totalInvestment > 0 && monthlySavings > 0) 
    ? totalInvestment / monthlySavings 
    : 0;
    
  const paybackYears = paybackMonths / 12;
  const totalSavings25Years = (monthlySavings * 12 * 25) - totalInvestment;

  return {
    avgMonthlyConsumption,
    avgDailyConsumption,
    avgIrradiation,
    requiredSystemPowerKWp,
    panelCountRaw,
    panelCountRounded,
    totalSystemPowerKWp,
    monthlyGeneration,
    avgMonthlyGeneration,
    financials: {
      calculatedLaborCost: laborCost,
      totalInvestment,
      monthlyBillWithoutSolar, // Averaged annual cost
      monthlyBillWithSolar,    // Averaged annual cost
      monthlySavings,
      paybackMonths,
      paybackYears,
      totalSavings25Years,
      minimumBillCost: monthlyMinimumCost
    }
  };
};

export const formatNumber = (num: number, decimals = 2) => {
  return num.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

export const formatCurrency = (num: number) => {
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
