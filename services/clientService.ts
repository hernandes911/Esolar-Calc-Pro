
import { Client, initialMonthlyData } from '../types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'solarcalc_clients_v1';

export const getClients = (): Client[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const getClientById = (id: string): Client | undefined => {
  const clients = getClients();
  return clients.find(c => c.id === id);
};

export const saveClient = (client: Client): void => {
  const clients = getClients();
  const index = clients.findIndex(c => c.id === client.id);
  
  if (index >= 0) {
    clients[index] = { ...client, updatedAt: new Date().toISOString() };
  } else {
    clients.push({ ...client, updatedAt: new Date().toISOString() });
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
};

export const deleteClient = (id: string): void => {
  const clients = getClients();
  const newClients = clients.filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newClients));
};

export const createEmptyClient = (): Client => ({
  id: uuidv4(),
  name: '',
  cpf: '', // Initialize CPF
  email: '',
  phone: '',
  address: {
    street: '',
    number: '',
    neighborhood: '',
    zip: '',
    state: '',
    city: ''
  },
  consumption: { ...initialMonthlyData },
  irradiation: { ...initialMonthlyData },
  panelPowerWp: 550, // Default 550W
  systemEfficiency: 0.75, // Default 75%
  // Financial defaults
  kwhPrice: 0.95, // Example default
  kitPrice: 0,
  laborType: 'fixed',
  laborPrice: 0,
  laborPercent: 20, // Default 20%
  extraMaterials: 0,
  connectionType: 'monofasico', // Default standard
  
  // Negotiation / Sales Defaults
  proposalValue: 0,
  discountType: 'fixed',
  discount: 0,
  discountPercent: 0,
  finalValue: 0,
  paymentMethod: '',
  installments: 1,

  // Equipment List
  materials: [],
  
  // Status Defaults
  status: 'lead',
  statusUpdatedAt: new Date().toISOString(),
  
  notes: '',

  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});
