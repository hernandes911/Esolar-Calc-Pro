import { User } from '../types';

const USERS_KEY = 'solarcalc_users_v1';
const SESSION_KEY = 'solarcalc_session_v1';

export const getUsers = (): User[] => {
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : [];
};

// Initialize default user if not exists
const initDefaultUser = () => {
  const users = getUsers();
  const defaultEmail = 'hernandes911@gmail.com';
  
  if (!users.some(u => u.email === defaultEmail)) {
    const defaultUser: User = {
      id: 'user-hernandes-master',
      name: 'Hernandes',
      email: defaultEmail,
      phone: '(11) 99999-9999',
      cpf: '000.000.000-00',
      password: '105400',
      role: 'admin',
      createdAt: new Date().toISOString()
    };
    users.push(defaultUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    console.log('Default user initialized');
  }
};

// Execute initialization
initDefaultUser();

export const registerUser = (user: User): { success: boolean; message: string } => {
  const users = getUsers();
  
  if (users.some(u => u.email === user.email)) {
    return { success: false, message: 'Este e-mail já está cadastrado.' };
  }
  
  if (users.some(u => u.cpf === user.cpf)) {
    return { success: false, message: 'Este CPF já está cadastrado.' };
  }
  
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return { success: true, message: 'Usuário cadastrado com sucesso.' };
};

export const loginUser = (email: string, password: string): { success: boolean; user?: User; message?: string } => {
  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  
  if (user) {
    // Return user without password for session safety (shallow copy)
    // We cast to any to allow destructuring unused password if needed, or just object spread
    const { password: _, ...safeUser } = user; 
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    return { success: true, user: safeUser as User };
  }
  
  return { success: false, message: 'E-mail ou senha incorretos.' };
};

export const logoutUser = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(SESSION_KEY);
  return data ? JSON.parse(data) : null;
};

// Helper for masking CPF
export const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

// Helper for masking Phone
export const formatPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};