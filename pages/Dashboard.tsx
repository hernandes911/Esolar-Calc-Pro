
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getClients, deleteClient, createEmptyClient } from '../services/clientService';
import { Client } from '../types';
import { Plus, Search, Trash2, FileText, Sun, LogOut, Shield, Settings, Smartphone, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileModal, setShowMobileModal] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    refreshList();
  }, []);

  const refreshList = () => {
    setClients(getClients().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (user?.role !== 'admin') {
       alert("Apenas administradores podem excluir clientes.");
       return;
    }

    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      deleteClient(id);
      refreshList();
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-white">
              <Sun size={24} />
            </div>
            <div>
               <h1 className="text-xl font-bold text-gray-800 leading-tight">SolarCalc Pro</h1>
               {user && (
                 <p className="text-xs text-slate-500 flex items-center gap-1">
                    Olá, {user.name.split(' ')[0]} 
                    {user.role === 'admin' && <Shield size={10} className="text-amber-600" />}
                 </p>
               )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link 
              to={`/edit/${createEmptyClient().id}`}
              className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Novo Cliente</span>
            </Link>

            <button
              onClick={() => setShowMobileModal(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition"
              title="Instalar no Celular"
            >
              <Smartphone size={18} />
            </button>

            <Link
              to="/settings"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition"
              title="Configurações"
            >
              <Settings size={18} />
            </Link>
            
            <button 
              onClick={logout}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-red-50 hover:text-red-500 transition"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center rounded-xl bg-white p-2 shadow-sm">
          <Search className="ml-3 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou email..." 
            className="w-full border-none bg-transparent px-4 py-2 text-gray-700 focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-6 text-slate-400">
              <FileText size={48} />
            </div>
            <h3 className="text-lg font-medium text-slate-700">Nenhum cliente encontrado</h3>
            <p className="text-slate-500">Comece criando um novo dimensionamento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map(client => (
              <Link 
                key={client.id} 
                to={`/edit/${client.id}`}
                className="group relative block overflow-hidden rounded-xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800">{client.name || 'Sem Nome'}</h3>
                    <p className="text-sm text-slate-500">{client.address.city || 'Cidade não inf.'} - {client.address.state}</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-600">
                    {new Date(client.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="mt-4 space-y-1">
                  <p className="text-xs text-slate-400">ID: {client.id.substring(0, 8)}...</p>
                  <p className="text-sm text-slate-600 truncate">{client.email}</p>
                </div>
                
                {user?.role === 'admin' && (
                    <button 
                    onClick={(e) => handleDelete(client.id, e)}
                    className="absolute bottom-4 right-4 rounded-full bg-slate-100 p-2 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                    title="Excluir (Admin)"
                    >
                    <Trash2 size={16} />
                    </button>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Mobile Install Modal */}
      {showMobileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl relative">
             <button
               onClick={() => setShowMobileModal(false)}
               className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
             >
               <X size={20} />
             </button>

             <div className="text-center">
               <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <Smartphone size={24} />
               </div>
               <h3 className="text-lg font-bold text-slate-800">Instalar App</h3>
               <p className="mt-2 text-sm text-slate-500">
                 Escaneie o QR Code abaixo com a câmera do seu celular para abrir o app.
               </p>

               <div className="my-6 flex justify-center">
                  <div className="p-2 border border-slate-200 rounded-lg bg-white">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}`}
                        alt="QR Code"
                        className="h-48 w-48"
                      />
                  </div>
               </div>

               <div className="mb-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 break-all border border-slate-100">
                  {window.location.href}
               </div>

               <div className="text-left text-sm text-slate-600 space-y-2">
                  <p className="font-semibold text-slate-800">Como instalar:</p>
                  <p>1. Abra o link no navegador (Chrome ou Safari).</p>
                  <p>2. No <span className="font-bold">Android</span>: Toque no menu (⋮) e em "Instalar aplicativo".</p>
                  <p>3. No <span className="font-bold">iPhone</span>: Toque em Compartilhar e "Adicionar à Tela de Início".</p>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
