import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MonthlyData, monthNames } from '../types';

interface Props {
  consumption: MonthlyData;
  generation: MonthlyData;
}

export const ConsumptionChart: React.FC<Props> = ({ consumption, generation }) => {
  const data = monthNames.map(m => {
    const key = m.key as keyof MonthlyData;
    return {
      name: m.label.substring(0, 3), // Jan, Fev, Mar...
      Consumo: consumption[key],
      Geração: generation[key],
    };
  });

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 5,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="name" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 12 }}
            dy={10}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 12 }}
          />
          <Tooltip 
            cursor={{ fill: '#f1f5f9' }}
            contentStyle={{ 
              borderRadius: '8px', 
              border: 'none', 
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' 
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }} 
            iconType="circle"
          />
          <Bar 
            dataKey="Consumo" 
            fill="#ef4444" 
            radius={[4, 4, 0, 0]} 
            name="Consumo (kWh)"
            barSize={20}
          />
          <Bar 
            dataKey="Geração" 
            fill="#22c55e" 
            radius={[4, 4, 0, 0]} 
            name="Geração (kWh)"
            barSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};