import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser, formatCPF, formatPhone } from '../services/authService';
import { User, UserRole } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Sun, UserPlus, Lock, Mail, Phone, User as UserIcon, CreditCard, Shield } from 'lucide-react';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    password: '',
    confirmPassword: '',
    role: 'user' as UserRole
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cpf') formattedValue = formatCPF(value);
    if (name === 'phone') formattedValue = formatPhone(value);

    setFormData(prev => ({ ...prev, [name]: formattedValue }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (formData.cpf.length < 14) {
      setError('CPF inválido.');
      return;
    }

    const newUser: User = {
      id: uuidv4(),
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      cpf: formData.cpf,
      password: formData.password,
      role: formData.role,
      createdAt: new Date().toISOString()
    };

    const result = registerUser(newUser);

    if (result.success) {
      setSuccess('Cadastro realizado com sucesso! Redirecionando...');
      setTimeout(() => navigate('/login'), 2000);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-lg space-y-8 rounded-2xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-white shadow-md">
            <Sun size={32} />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-gray-900">Crie sua Conta</h2>
          <p className="mt-2 text-sm text-gray-600">
            Preencha os dados abaixo para começar a usar o SolarCalc Pro
          </p>
        </div>
        
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-green-50 p-3 text-center text-sm text-green-600">
              {success}
            </div>
          )}
          
          <div className="space-y-4">
             {/* Name */}
             <div className="relative">
               <div className="absolute left-3 top-3 text-gray-400">
                  <UserIcon size={18} />
               </div>
               <input
                 name="name"
                 type="text"
                 required
                 className="w-full rounded-lg border border-gray-300 bg-white px-10 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                 placeholder="Nome Completo"
                 value={formData.name}
                 onChange={handleChange}
               />
             </div>

             {/* Email */}
             <div className="relative">
               <div className="absolute left-3 top-3 text-gray-400">
                  <Mail size={18} />
               </div>
               <input
                 name="email"
                 type="email"
                 required
                 className="w-full rounded-lg border border-gray-300 bg-white px-10 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                 placeholder="E-mail"
                 value={formData.email}
                 onChange={handleChange}
               />
             </div>

             <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* CPF */}
                <div className="relative">
                  <div className="absolute left-3 top-3 text-gray-400">
                      <CreditCard size={18} />
                  </div>
                  <input
                    name="cpf"
                    type="text"
                    required
                    maxLength={14}
                    className="w-full rounded-lg border border-gray-300 bg-white px-10 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="CPF (000.000.000-00)"
                    value={formData.cpf}
                    onChange={handleChange}
                  />
                </div>
                {/* Phone */}
                <div className="relative">
                  <div className="absolute left-3 top-3 text-gray-400">
                      <Phone size={18} />
                  </div>
                  <input
                    name="phone"
                    type="text"
                    required
                    maxLength={15}
                    className="w-full rounded-lg border border-gray-300 bg-white px-10 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="Telefone"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
             </div>
             
             {/* Access Level */}
             <div className="relative">
               <div className="absolute left-3 top-3 text-gray-400">
                  <Shield size={18} />
               </div>
               <select
                 name="role"
                 className="w-full rounded-lg border border-gray-300 bg-white px-10 py-2.5 text-sm text-gray-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                 value={formData.role}
                 onChange={handleChange}
               >
                  <option value="user">Nível: Usuário (Padrão)</option>
                  <option value="admin">Nível: Administrador</option>
               </select>
             </div>

             <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                 {/* Password */}
                 <div className="relative">
                   <div className="absolute left-3 top-3 text-gray-400">
                      <Lock size={18} />
                   </div>
                   <input
                     name="password"
                     type="password"
                     required
                     className="w-full rounded-lg border border-gray-300 bg-white px-10 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                     placeholder="Senha"
                     value={formData.password}
                     onChange={handleChange}
                   />
                 </div>
                 {/* Confirm Password */}
                 <div className="relative">
                   <div className="absolute left-3 top-3 text-gray-400">
                      <Lock size={18} />
                   </div>
                   <input
                     name="confirmPassword"
                     type="password"
                     required
                     className="w-full rounded-lg border border-gray-300 bg-white px-10 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                     placeholder="Confirmar Senha"
                     value={formData.confirmPassword}
                     onChange={handleChange}
                   />
                 </div>
             </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="group relative flex w-full justify-center rounded-lg bg-amber-600 px-4 py-3 text-sm font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            >
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <UserPlus size={20} className="text-amber-200 group-hover:text-amber-100" />
              </span>
              Cadastrar
            </button>
          </div>
        </form>
        
        <div className="text-center text-sm">
           <p className="text-gray-500">
             Já tem uma conta?{' '}
             <Link to="/login" className="font-medium text-slate-900 hover:text-slate-800">
               Faça login
             </Link>
           </p>
        </div>
      </div>
    </div>
  );
};

export default Register;