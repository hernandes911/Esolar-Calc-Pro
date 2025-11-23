import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { Sun, LogIn, Lock, Mail, AlertCircle } from 'lucide-react';
import { InputGroup } from '../components/InputGroup';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network delay for UX
    setTimeout(() => {
      const result = loginUser(email, password);
      
      if (result.success && result.user) {
        login(result.user);
        navigate('/');
      } else {
        setError(result.message || 'Erro ao entrar.');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg">
            <Sun size={36} />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">SolarCalc Pro</h2>
          <p className="mt-2 text-sm text-gray-600">
            Faça login para acessar o sistema
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          
          <div className="space-y-4 rounded-md">
            <div className="relative">
               <div className="absolute left-3 top-3 text-gray-400">
                  <Mail size={20} />
               </div>
               <input
                 type="email"
                 required
                 className="w-full rounded-lg border border-gray-300 bg-white px-10 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                 placeholder="Seu e-mail"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
               />
            </div>
            <div className="relative">
               <div className="absolute left-3 top-3 text-gray-400">
                  <Lock size={20} />
               </div>
               <input
                 type="password"
                 required
                 className="w-full rounded-lg border border-gray-300 bg-white px-10 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                 placeholder="Sua senha"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
               />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full justify-center rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-70"
            >
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <LogIn size={20} className="text-slate-500 group-hover:text-slate-400" />
              </span>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
        
        <div className="text-center text-sm">
           <p className="text-gray-500">
             Não tem uma conta?{' '}
             <Link to="/register" className="font-medium text-amber-600 hover:text-amber-500">
               Cadastre-se gratuitamente
             </Link>
           </p>
        </div>
      </div>
    </div>
  );
};

export default Login;