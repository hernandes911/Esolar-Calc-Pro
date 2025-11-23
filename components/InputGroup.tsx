import React from 'react';
import { Loader2 } from 'lucide-react';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  isLoading?: boolean;
}

export const InputGroup: React.FC<Props> = ({ label, className, isLoading, ...props }) => {
  return (
    <div className="flex flex-col">
      <label className="mb-1 text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          className={`w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 ${className} ${isLoading ? 'pr-10' : ''}`}
          disabled={isLoading}
          {...props}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};