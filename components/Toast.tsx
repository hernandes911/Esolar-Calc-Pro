import React, { useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-3 text-white shadow-lg animate-fade-in-up transition-all">
      {type === 'success' ? <CheckCircle size={20} className="text-green-400" /> : <XCircle size={20} className="text-red-400" />}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};