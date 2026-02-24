import React, { createContext, useContext, useState, PropsWithChildren, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../api';

interface AuthContextType {
  user: User | null;
  usersList: User[];
  login: (email: string) => Promise<boolean>;
  logout: () => void;
  addUser: (user: User) => void;
  deleteUser: (id: string) => void;
  importUsers: (users: User[]) => void;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Map server roles to frontend roles
const mapRole = (role: string): UserRole => {
  switch (role) {
    case 'MANAGER': return UserRole.MANAGER;
    case 'OFFICER': return UserRole.OFFICER;
    case 'ACCOUNTANT': return UserRole.ACCOUNTANT;
    default: return UserRole.OFFICER;
  }
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // On mount, check if we have a valid token
  useEffect(() => {
    const checkAuth = async () => {
      if (!api.hasToken()) {
        setIsAuthLoading(false);
        return;
      }
      try {
        const data = await api.get<any>('/auth/me');
        if (data && data.id) {
          setUser({
            id: data.id,
            name: data.name,
            email: data.email,
            role: mapRole(data.role),
            avatar: data.avatar
          });
        }
      } catch {
        api.clearToken();
      } finally {
        setIsAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (email: string): Promise<boolean> => {
    try {
      // Call server login with password "demo" (as agreed)
      const data = await api.post<any>('/auth/login', { email, password: 'demo' });
      if (data && data.token) {
        api.setToken(data.token);
        setUser({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: mapRole(data.user.role),
          avatar: data.user.avatar
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    api.clearToken();
    localStorage.removeItem('app_user');
  };

  const addUser = (newUser: User) => {
    setUsersList(prev => [...prev, newUser]);
  };

  const deleteUser = (id: string) => {
    setUsersList(prev => prev.filter(u => u.id !== id));
  };

  const importUsers = (users: User[]) => {
    setUsersList(users);
  };

  return (
    <AuthContext.Provider value={{ user, usersList, login, logout, addUser, deleteUser, importUsers, isAuthenticated: !!user, isAuthLoading }}>
      {children}
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