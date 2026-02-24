import React, { createContext, useContext, useState, ReactNode, useEffect, PropsWithChildren, useCallback } from 'react';
import { Member, Transaction, DashboardStats, TransactionDirection, MemberStatus, FinancialMedium, SubscriptionType, SubscriptionDue, TransactionStatus, AppSettings } from '../types';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

interface AppContextType {
  members: Member[];
  transactions: Transaction[];
  financialMedia: FinancialMedium[];
  subscriptionTypes: SubscriptionType[];
  appSettings: AppSettings;
  isLoading: boolean;
  addMember: (member: Partial<Member>) => Promise<void>;
  updateMember: (id: string, member: Partial<Member>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  addTransaction: (transaction: Partial<Transaction>) => Promise<void>;
  reverseTransaction: (id: string, reason: string) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  addSubscriptionType: (type: Partial<SubscriptionType>) => Promise<void>;
  updateSubscriptionType: (id: string, type: Partial<SubscriptionType>) => Promise<void>;
  deleteSubscriptionType: (id: string) => Promise<void>;
  updateFinancialMedium: (id: string, medium: Partial<FinancialMedium>) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  refreshData: () => Promise<void>;
  stats: DashboardStats;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: PropsWithChildren) => {
  const { isAuthenticated } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [financialMedia, setFinancialMedia] = useState<FinancialMedium[]>([]);
  const [subscriptionTypes, setSubscriptionTypes] = useState<SubscriptionType[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>({ memberIdStart: 1000 });
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const [membersData, transData, settingsData, mediaData, subTypesData] = await Promise.all([
        api.get<Member[]>('/members'),
        api.get<Transaction[]>('/transactions'),
        api.get<AppSettings & { organization: { name: string, logoUrl: string } }>('/settings'),
        api.get<FinancialMedium[]>('/financial-media'),
        api.get<SubscriptionType[]>('/subscription-types') // We might need to add this route too
      ]);
      setMembers(membersData);
      setTransactions(transData);
      setFinancialMedia(mediaData);
      setSubscriptionTypes(subTypesData || []);

      // Merge organization name/logo into settings
      setAppSettings({
        ...settingsData,
        organizationName: settingsData.organization?.name,
        logoUrl: settingsData.organization?.logoUrl
      });
    } catch (e) {
      console.error("Failed to fetch app data", e);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addMember = async (member: Partial<Member>) => {
    const newMember = await api.post<Member>('/members', member);
    setMembers(prev => [...prev, newMember]);
  };

  const updateMember = async (id: string, member: Partial<Member>) => {
    const updated = await api.put<Member>(`/members/${id}`, member);
    setMembers(prev => prev.map(m => m.id === id ? updated : m));
  };

  const deleteMember = async (id: string) => {
    await api.delete(`/members/${id}`);
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const addTransaction = async (transaction: Partial<Transaction>) => {
    const res = await api.post<Transaction>('/transactions', transaction);
    setTransactions(prev => [res, ...prev]);
    // Refresh media to get updated balances
    const mediaData = await api.get<FinancialMedium[]>('/financial-media');
    setFinancialMedia(mediaData);
  };

  const reverseTransaction = async (id: string, reason: string) => {
    const res = await api.post<Transaction>(`/transactions/${id}/reverse`, { reason });
    setTransactions(prev => [res, ...prev.map(t => t.id === id ? { ...t, status: TransactionStatus.REVERSED, reversalReason: reason } : t)]);
    // Refresh media
    const mediaData = await api.get<FinancialMedium[]>('/financial-media');
    setFinancialMedia(mediaData);
  };

  const deleteTransaction = async (id: string) => {
    await api.delete(`/transactions/${id}`);
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const updateTransaction = async (id: string, transaction: Partial<Transaction>) => {
    const updated = await api.put<Transaction>(`/transactions/${id}`, transaction);
    setTransactions(prev => prev.map(t => t.id === id ? updated : t));
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = await api.put<AppSettings & { organization: { name: string, logoUrl: string } }>('/settings', {
      ...newSettings,
      name: newSettings.organizationName,
      logoUrl: newSettings.logoUrl
    });
  };

  const addSubscriptionType = async (type: Partial<SubscriptionType>) => {
    const res = await api.post<SubscriptionType>('/subscription-types', type);
    setSubscriptionTypes(prev => [...prev, res]);
  };

  const updateSubscriptionType = async (id: string, type: Partial<SubscriptionType>) => {
    const updated = await api.put<SubscriptionType>(`/subscription-types/${id}`, type);
    setSubscriptionTypes(prev => prev.map(t => t.id === id ? updated : t));
  };

  const deleteSubscriptionType = async (id: string) => {
    await api.delete(`/subscription-types/${id}`);
    setSubscriptionTypes(prev => prev.filter(t => t.id !== id));
  };

  const updateFinancialMedium = async (id: string, medium: Partial<FinancialMedium>) => {
    const updated = await api.put<FinancialMedium>(`/financial-media/${id}`, medium);
    setFinancialMedia(prev => prev.map(m => m.id === id ? updated : m));
  };

  const stats: DashboardStats = {
    totalMembers: members.length,
    activeMembers: members.filter(m => m.status === MemberStatus.ACTIVE).length,
    totalIncome: transactions
      .filter(t => t.direction === TransactionDirection.IN)
      .reduce((sum, t) => sum + Number(t.amount), 0),
    totalExpense: transactions
      .filter(t => t.direction === TransactionDirection.OUT)
      .reduce((sum, t) => sum + Number(t.amount), 0),
    netBalance: 0
  };
  stats.netBalance = stats.totalIncome - stats.totalExpense;

  return (
    <AppContext.Provider value={{
      members,
      transactions,
      financialMedia,
      subscriptionTypes,
      appSettings,
      isLoading,
      addMember,
      updateMember,
      deleteMember,
      addTransaction,
      reverseTransaction,
      deleteTransaction,
      updateTransaction,
      addSubscriptionType,
      updateSubscriptionType,
      deleteSubscriptionType,
      updateFinancialMedium,
      updateSettings,
      refreshData: fetchData,
      stats
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};