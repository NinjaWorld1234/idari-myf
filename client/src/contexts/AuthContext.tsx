import React, { createContext, useContext, useState, ReactNode, PropsWithChildren, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  usersList: User[];
  fetchUsers: () => Promise<void>;
  addUser: (userData: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on startup
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('app_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await api.get<User>('/auth/me');
        setUser(userData);
      } catch (e) {
        console.error("Failed to restore session", e);
        localStorage.removeItem('app_token');
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await api.get<User[]>('/users');
      setUsersList(data);
    } catch (e) {
      console.error("Failed to fetch users", e);
    }
  };

  const addUser = async (userData: Partial<User>) => {
    const newUser = await api.post<User>('/users', userData);
    setUsersList(prev => [...prev, newUser]);
  };

  const deleteUser = async (id: string) => {
    await api.delete(`/users/${id}`);
    setUsersList(prev => prev.filter(u => u.id !== id));
  };

  const login = async (email: string, password = 'demo') => {
    try {
      const response = await api.post<{ token: string, user: User }>('/auth/login', { email, password });
      localStorage.setItem('app_token', response.token);
      setUser(response.user);
    } catch (e) {
      throw e;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('app_token');
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user,
      isLoading,
      usersList,
      fetchUsers,
      addUser,
      deleteUser
    }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};