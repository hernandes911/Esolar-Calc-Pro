
import { CompanySettings } from '../types';

const SETTINGS_KEY = 'solarcalc_settings_v1';

const defaultSettings: CompanySettings = {
  logo: null,
  companyName: 'SolarCalc Pro'
};

export const getSettings = (): CompanySettings => {
  const data = localStorage.getItem(SETTINGS_KEY);
  return data ? JSON.parse(data) : defaultSettings;
};

export const saveSettings = (settings: CompanySettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};
