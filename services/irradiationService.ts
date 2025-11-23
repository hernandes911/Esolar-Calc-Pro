import { MonthlyData, initialMonthlyData } from '../types';

// NASA POWER API endpoint
// Community: RE (Renewable Energy)
// Parameters: ALLSKY_SFC_SW_DWN (All Sky Surface Shortwave Downward Irradiance)
const NASA_API_URL = 'https://power.larc.nasa.gov/api/temporal/climatology/point';

export const fetchSolarIrradiation = async (lat: number, lon: number): Promise<MonthlyData | null> => {
  try {
    const url = `${NASA_API_URL}?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${lon}&latitude=${lat}&format=JSON`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Falha na comunicação com NASA POWER API');
    
    const data = await response.json();
    const parameterData = data.properties?.parameter?.ALLSKY_SFC_SW_DWN;

    if (!parameterData) return null;

    // Map NASA keys (JAN, FEB...) to our keys (jan, feb...)
    const result: MonthlyData = { ...initialMonthlyData };
    
    // NASA returns uppercase 3-letter months
    const monthMap: Record<string, keyof MonthlyData> = {
      'JAN': 'jan', 'FEB': 'feb', 'MAR': 'mar', 'APR': 'apr', 
      'MAY': 'may', 'JUN': 'jun', 'JUL': 'jul', 'AUG': 'aug', 
      'SEP': 'sep', 'OCT': 'oct', 'NOV': 'nov', 'DEC': 'dec'
    };

    Object.keys(monthMap).forEach(nasaKey => {
      const val = parameterData[nasaKey];
      if (typeof val === 'number') {
        result[monthMap[nasaKey]] = val;
      }
    });

    return result;
  } catch (error) {
    console.error("Erro ao buscar dados de irradiação:", error);
    return null;
  }
};