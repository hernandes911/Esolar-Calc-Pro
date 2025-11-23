
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings, saveSettings } from '../services/settingsService';
import { CompanySettings } from '../types';
import { ArrowLeft, Save, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { Toast } from '../components/Toast';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<CompanySettings>({ logo: null, companyName: '' });
  const [showToast, setShowToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB Limit
        setShowToast({ message: 'A imagem deve ter no máximo 2MB.', type: 'error' });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setSettings(prev => ({ ...prev, logo: null }));
  };

  const handleSave = () => {
    saveSettings(settings);
    setShowToast({ message: 'Configurações salvas com sucesso!', type: 'success' });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {showToast && (
        <Toast 
          message={showToast.message} 
          type={showToast.type} 
          onClose={() => setShowToast(null)} 
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="rounded-full p-2 hover:bg-slate-100">
              <ArrowLeft className="text-slate-600" />
            </button>
            <h1 className="text-lg font-bold text-slate-800">Configurações do Sistema</h1>
          </div>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            <Save size={16} />
            Salvar
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-bold text-slate-800">Personalização de Relatório</h2>
          
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Logo da Empresa</label>
              <div className="flex items-start gap-6">
                
                {/* Preview Box */}
                <div className="flex h-32 w-32 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden relative">
                  {settings.logo ? (
                    <img src={settings.logo} alt="Logo Preview" className="h-full w-full object-contain" />
                  ) : (
                    <div className="text-center text-slate-400">
                      <ImageIcon className="mx-auto mb-1 h-8 w-8" />
                      <span className="text-xs">Sem logo</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  <div className="relative">
                     <input 
                      type="file" 
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handleLogoUpload}
                      className="absolute inset-0 cursor-pointer opacity-0 w-full h-full"
                     />
                     <button className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm w-full">
                       <Upload size={16} />
                       Escolher Imagem
                     </button>
                  </div>
                  
                  {settings.logo && (
                    <button 
                      onClick={removeLogo}
                      className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 w-full justify-center"
                    >
                      <Trash2 size={16} />
                      Remover Logo
                    </button>
                  )}
                  
                  <p className="text-xs text-slate-500 max-w-xs mt-1">
                    Recomendado: PNG ou JPG com fundo transparente.<br/>
                    Tamanho máximo: 2MB.<br/>
                    Esta imagem substituirá o ícone de sol padrão nos relatórios PDF.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
