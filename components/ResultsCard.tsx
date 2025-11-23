import React from 'react';
import { formatNumber } from '../utils/calculations';
import { SolarCalculationResult } from '../types';
import { Zap, Sun, PanelTop, BatteryCharging } from 'lucide-react';

interface Props {
  results: SolarCalculationResult;
}

export const ResultsCard: React.FC<Props> = ({ results }) => {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* System Power */}
      <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-amber-700">
          <Zap className="h-5 w-5" />
          <span className="font-semibold">Potência do Sistema</span>
        </div>
        <div className="text-3xl font-bold text-gray-800">
          {formatNumber(results.totalSystemPowerKWp)} <span className="text-sm font-normal text-gray-500">kWp</span>
        </div>
        <div className="mt-1 text-xs text-gray-500">Calculado: {formatNumber(results.requiredSystemPowerKWp)} kWp</div>
      </div>

      {/* Panels */}
      <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-blue-700">
          <PanelTop className="h-5 w-5" />
          <span className="font-semibold">Qtd. Painéis</span>
        </div>
        <div className="text-3xl font-bold text-gray-800">
          {results.panelCountRounded} <span className="text-sm font-normal text-gray-500">unid.</span>
        </div>
        <div className="mt-1 text-xs text-gray-500">Exato: {formatNumber(results.panelCountRaw)}</div>
      </div>

      {/* Generation Avg */}
      <div className="rounded-xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-green-700">
          <BatteryCharging className="h-5 w-5" />
          <span className="font-semibold">Geração Média</span>
        </div>
        <div className="text-3xl font-bold text-gray-800">
          {formatNumber(results.avgMonthlyGeneration)} <span className="text-sm font-normal text-gray-500">kWh/mês</span>
        </div>
        <div className="mt-1 text-xs text-gray-500">Eficiência: 75%</div>
      </div>

      {/* Irradiation Avg */}
      <div className="rounded-xl border border-yellow-100 bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-yellow-700">
          <Sun className="h-5 w-5" />
          <span className="font-semibold">Irradiação Média</span>
        </div>
        <div className="text-3xl font-bold text-gray-800">
          {formatNumber(results.avgIrradiation)} <span className="text-sm font-normal text-gray-500">kWh/m²/dia</span>
        </div>
        <div className="mt-1 text-xs text-gray-500">Local</div>
      </div>
    </div>
  );
};