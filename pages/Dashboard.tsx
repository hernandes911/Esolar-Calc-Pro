
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getClients, deleteClient, createEmptyClient } from '../services/clientService';
import { Client } from '../types';
import { Plus, Search, Trash2, FileText, Sun, LogOut, Shield, Settings, Smartphone, X, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [pendingFollowUps, setPendingFollowUps] = useState<number>(0);
  const { user, logout } = useAuth();

  useEffect(() => {
    refreshList();
    requestNotificationPermission();
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      await Notification.requestPermission();
    }
  };

  const checkFollowUps = (clientList: Client[]) => {
    let count = 0;
    const now = new Date();
    
    clientList.forEach(c => {
        if (c.status === 'proposal_sent') {
            const lastUpdate = new Date(c.statusUpdatedAt || c.updatedAt);
            const diffTime = Math.abs(now.getTime() - lastUpdate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            
            if (diffDays >= 45) {
                count++;
                // Trigger notification only if it's the first load or infrequent
                if ('Notification' in window && Notification.permission === 'granted') {
                    // Simple check to avoid spamming on every reload: could use sessionStorage
                    if(!sessionStorage.getItem(`notified_${c.id}`)) {
                        new Notification(`Atenção: Follow-up Necessário`, {
                            body: `O cliente ${c.name} recebeu a proposta há ${diffDays} dias. Entre em contato!`,
                            icon: 'https://cdn-icons-png.flaticon.com/512/869/869869.png'
                        });
                        sessionStorage.setItem(`notified_${c.id}`, 'true');
                    }
                }
            }
        }
    });
    setPendingFollowUps(count);
  };

  const refreshList = () => {
    const list = getClients().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setClients(list);
    checkFollowUps(list);
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

            <div className="relative">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full border ${pendingFollowUps > 0 ? 'border-amber-200 bg-amber-50 text-amber-600' : 'border-slate-200 bg-white text-slate-500'}`}>
                    <Bell size={18} />
                </div>
                {pendingFollowUps > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {pendingFollowUps}
                    </span>
                )}
            </div>

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
        
        {/* Alerts Section */}
        {pendingFollowUps > 0 && (
            <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
                <Bell className="text-amber-600 mt-1" size={20} />
                <div>
                    <h3 className="text-sm font-bold text-amber-800">Atenção Necessária</h3>
                    <p className="text-sm text-amber-700">
                        Você tem <strong>{pendingFollowUps} cliente(s)</strong> com propostas enviadas há mais de 45 dias sem atualização. Verifique a lista abaixo.
                    </p>
                </div>
            </div>
        )}

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
            {filteredClients.map(client => {
                const isLate = client.status === 'proposal_sent' && 
                    (new Date().getTime() - new Date(client.statusUpdatedAt || client.updatedAt).getTime()) / (1000 * 60 * 60 * 24) >= 45;

                return (
                  <Link 
                    key={client.id} 
                    to={`/edit/${client.id}`}
                    className={`group relative block overflow-hidden rounded-xl border bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg ${isLate ? 'border-amber-300 ring-1 ring-amber-300' : 'border-slate-200'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            {client.name || 'Sem Nome'}
                            {isLate && <span className="h-2 w-2 rounded-full bg-red-500" title="Atrasado"></span>}
                        </h3>
                        <p className="text-sm text-slate-500">{client.address.city || 'Cidade não inf.'} - {client.address.state}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${isLate ? 'bg-red-100 text-red-700' : 'bg-amber-50 text-amber-600'}`}>
                        {new Date(client.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="mt-4 space-y-1">
                      <p className="text-xs text-slate-400">ID: {client.id.substring(0, 8)}...</p>
                      <p className="text-sm text-slate-600 truncate">{client.email}</p>
                    </div>

                    {isLate && (
                        <div className="mt-3 text-xs font-semibold text-amber-700 bg-amber-50 p-1.5 rounded text-center">
                            Follow-up atrasado (+45 dias)
                        </div>
                    )}
                    
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
                );
            })}
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
