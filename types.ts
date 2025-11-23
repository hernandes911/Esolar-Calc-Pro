
export interface MonthlyData {
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
}

export interface Address {
  street: string;
  number: string;
  neighborhood: string;
  zip: string;
  state: string;
  city: string;
}

export type ConnectionType = 'monofasico' | 'bifasico' | 'trifasico';

// New Status Type
export type ProjectStatus = 'lead' | 'proposal_sent' | 'proposal_accepted' | 'approval' | 'installation' | 'completed';

export type PaymentMethod = 'pix' | 'boleto' | 'credit_card' | 'debit_card' | 'financing' | '';

export type LaborType = 'fixed' | 'percent';

export type DiscountType = 'fixed' | 'percent';

export interface MaterialItem {
  id: string;
  quantity: number;
  unit: string;
  model: string;
  brand: string;
}

export interface Client {
  id: string;
  name: string;
  cpf: string; // Added CPF
  email: string;
  phone: string;
  address: Address;
  consumption: MonthlyData;
  irradiation: MonthlyData; // kWh/m²/day
  panelPowerWp: number; // Watts peak per panel
  systemEfficiency: number; // 0.75 - 0.85 usually
  // Financials
  kwhPrice: number; // R$/kWh
  kitPrice: number; // R$
  laborType: LaborType;
  laborPrice: number; // R$ (Used if type is fixed)
  laborPercent: number; // % (Used if type is percent, relative to kitPrice)
  extraMaterials: number; // R$
  connectionType: ConnectionType; // Standard type for availability cost
  
  // Negotiation / Sales Details
  proposalValue: number;
  discountType: DiscountType;
  discount: number; // Used if fixed
  discountPercent: number; // Used if percent
  finalValue: number;
  paymentMethod: PaymentMethod;
  installments: number;

  // Equipment List (Structured)
  materials: MaterialItem[];

  // Status Tracking
  status: ProjectStatus;
  statusUpdatedAt: string;
  
  // General Notes
  notes: string;

  createdAt: string;
  updatedAt: string;
}

export interface CompanySettings {
  logo: string | null; // Base64 string of the image
  companyName?: string;
}

export interface SolarCalculationResult {
  avgMonthlyConsumption: number;
  avgDailyConsumption: number;
  avgIrradiation: number;
  requiredSystemPowerKWp: number;
  panelCountRaw: number;
  panelCountRounded: number;
  totalSystemPowerKWp: number;
  monthlyGeneration: MonthlyData;
  avgMonthlyGeneration: number;
  financials: {
    calculatedLaborCost: number; // The actual labor cost used in calc
    totalInvestment: number;
    monthlyBillWithoutSolar: number;
    monthlyBillWithSolar: number;
    monthlySavings: number;
    paybackMonths: number;
    paybackYears: number;
    totalSavings25Years: number;
    minimumBillCost: number; // Added to show the minimum cost
  };
}

export const initialMonthlyData: MonthlyData = {
  jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
  jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0
};

export const monthNames = [
  { key: 'jan', label: 'Janeiro' },
  { key: 'feb', label: 'Fevereiro' },
  { key: 'mar', label: 'Março' },
  { key: 'apr', label: 'Abril' },
  { key: 'may', label: 'Maio' },
  { key: 'jun', label: 'Junho' },
  { key: 'jul', label: 'Julho' },
  { key: 'aug', label: 'Agosto' },
  { key: 'sep', label: 'Setembro' },
  { key: 'oct', label: 'Outubro' },
  { key: 'nov', label: 'Novembro' },
  { key: 'dec', label: 'Dezembro' },
];

// --- AUTH TYPES ---

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  password: string; // In a real app this would be hashed
  role: UserRole;
  createdAt: string;
}
