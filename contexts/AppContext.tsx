import React, { createContext, useContext, useState, useEffect, PropsWithChildren, useCallback, useMemo } from 'react';
import {
  Member,
  Transaction,
  DashboardStats,
  TransactionDirection,
  FinancialMedium,
  SubscriptionType,
  TransactionStatus,
  TransactionType,
  MemberStatus,
  MembershipType,
  AppSettings,
  MemberFieldDef
} from '../types';
import { api } from '../api';
import { useAuth } from './AuthContext';

interface AppContextType {
  members: Member[];
  transactions: Transaction[];
  financialMedia: FinancialMedium[];
  subscriptionTypes: SubscriptionType[];
  appSettings: AppSettings;
  addMember: (member: Partial<Member>) => Promise<void>;
  updateMember: (id: string, member: Partial<Member>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  clearMembers: () => void;
  addTransaction: (transaction: Partial<Transaction>) => Promise<void>;
  reverseTransaction: (id: string, reason: string) => Promise<void>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  updateFinancialMedium: (id: string, medium: Partial<FinancialMedium>) => Promise<void>;
  addFinancialMedium: (medium: Partial<FinancialMedium>) => Promise<void>;
  deleteFinancialMedium: (id: string) => Promise<void>;
  addSubscriptionType: (type: Partial<SubscriptionType>) => Promise<void>;
  updateSubscriptionType: (id: string, type: Partial<SubscriptionType>) => Promise<void>;
  deleteSubscriptionType: (id: string) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  importFullData: (data: { members: Member[], transactions: Transaction[], appSettings: AppSettings }) => void;
  stats: DashboardStats;
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Default settings (used as fallback)
const DEFAULT_SETTINGS: AppSettings = {
  memberIdStart: 1000,
  organizationName: 'ملتقى الشباب المسلم',
  voucherPrefixes: {
    [TransactionType.SUBSCRIPTION]: 'RC',
    [TransactionType.DONATION]: 'DN',
    [TransactionType.EXPENSE]: 'PY',
    [TransactionType.PURCHASE]: 'PR',
    [TransactionType.TRANSFER]: 'TR',
    [TransactionType.PETTY_CASH]: 'PC',
    [TransactionType.REVERSAL]: 'REV'
  },
  subscriptionOptions: [0, 20, 30, 50],
  freeSubscriptionTypes: [MembershipType.HONORARY],
  incomeCategories: ['تبرعات نقدية', 'كفالات وكوبونات', 'إيرادات أنشطة', 'منح ومشاريع', 'أخرى'],
  expenseCategories: ['إيجار مقر', 'رواتب وأجور', 'كهرباء ومياه', 'صيانة', 'أثاث ومعدات', 'قرطاسية', 'ضيافة', 'أخرى'],
  memberFields: [
    { key: 'fullName', label: 'الاسم الرباعي', type: 'text', required: true, group: 'core' },
    { key: 'nationalId', label: 'رقم الهوية', type: 'text', required: false, group: 'core' },
    { key: 'gender', label: 'الجنس', type: 'select', required: true, options: ['ذكر', 'أنثى'], group: 'core' },
    { key: 'phone', label: 'رقم الهاتف', type: 'text', required: true, group: 'core' },
    { key: 'whatsapp', label: 'رقم الواتساب مع المقدمة', type: 'text', required: true, group: 'core' },
    { key: 'email', label: 'البريد الإلكتروني', type: 'text', required: false, group: 'core' },
    { key: 'city', label: 'المحافظة', type: 'text', required: false, group: 'core' },
    { key: 'address', label: 'مكان الإقامة', type: 'text', required: false, group: 'core' },
    { key: 'job', label: 'طبيعة العمل', type: 'text', required: false, group: 'core' },
    { key: 'membershipType', label: 'نوع العضوية', type: 'select', required: true, options: ['عضو', 'محب', 'شرفي', 'مستشار', 'موظف'], group: 'core' },
    { key: 'monthlySubscription', label: 'الاشتراك الشهري', type: 'select', required: true, options: ['0', '20', '30', '50'], group: 'core' },
  ]
};

// Helper to map server member to frontend Member type
const mapMember = (m: any): Member => ({
  id: m.id,
  memberCode: m.memberCode,
  fullName: m.fullName,
  nationalId: m.nationalId || undefined,
  gender: m.gender === 'MALE' ? 'ذكر' as any : 'أنثى' as any,
  phone: m.phone,
  whatsapp: m.whatsapp || '',
  email: m.email || undefined,
  city: m.city,
  address: m.address || undefined,
  membershipType: mapMembershipType(m.membershipType),
  joinDate: m.joinDate ? new Date(m.joinDate).toISOString().split('T')[0] : '',
  status: mapMemberStatus(m.status),
  job: m.job || undefined,
  monthlySubscription: m.monthlySubscription,
  additionalData: m.additionalData || undefined
});

const mapMembershipType = (type: string): MembershipType => {
  const map: Record<string, MembershipType> = {
    'MEMBER': MembershipType.MEMBER,
    'FAN': MembershipType.FAN,
    'HONORARY': MembershipType.HONORARY,
    'CONSULTANT': MembershipType.CONSULTANT,
    'EMPLOYEE': MembershipType.EMPLOYEE,
  };
  return map[type] || type as MembershipType;
};

const mapMemberStatus = (status: string): MemberStatus => {
  const map: Record<string, MemberStatus> = {
    'ACTIVE': MemberStatus.ACTIVE,
    'SUSPENDED': MemberStatus.SUSPENDED,
    'EXPIRED': MemberStatus.EXPIRED,
  };
  return map[status] || status as MemberStatus;
};

// Reverse map: Arabic -> English for server
const reverseMapMembershipType = (type: string): string => {
  const map: Record<string, string> = {
    [MembershipType.MEMBER]: 'MEMBER',
    [MembershipType.FAN]: 'FAN',
    [MembershipType.HONORARY]: 'HONORARY',
    [MembershipType.CONSULTANT]: 'CONSULTANT',
    [MembershipType.EMPLOYEE]: 'EMPLOYEE',
  };
  return map[type] || type;
};

const reverseMapMemberStatus = (status: string): string => {
  const map: Record<string, string> = {
    [MemberStatus.ACTIVE]: 'ACTIVE',
    [MemberStatus.SUSPENDED]: 'SUSPENDED',
    [MemberStatus.EXPIRED]: 'EXPIRED',
  };
  return map[status] || status;
};

const reverseMapGender = (gender: string): string => {
  if (gender === 'ذكر') return 'MALE';
  if (gender === 'أنثى') return 'FEMALE';
  return gender;
};

const reverseMapTransactionType = (type: string): string => {
  const map: Record<string, string> = {
    [TransactionType.SUBSCRIPTION]: 'SUBSCRIPTION',
    [TransactionType.DONATION]: 'DONATION',
    [TransactionType.EXPENSE]: 'EXPENSE',
    [TransactionType.PURCHASE]: 'PURCHASE',
    [TransactionType.REVERSAL]: 'REVERSAL',
    [TransactionType.TRANSFER]: 'TRANSFER',
    [TransactionType.PETTY_CASH]: 'PETTY_CASH',
    [TransactionType.PETTY_CASH_SETTLEMENT]: 'PETTY_CASH_SETTLEMENT',
  };
  return map[type] || type;
};

const reverseMapDirection = (dir: string): string => {
  if (dir === TransactionDirection.IN || dir === 'وارد') return 'IN';
  if (dir === TransactionDirection.OUT || dir === 'صادر') return 'OUT';
  return dir;
};

// Map server transaction to frontend
const mapTransaction = (t: any): Transaction => ({
  id: t.id,
  date: t.date ? new Date(t.date).toISOString().split('T')[0] : '',
  type: mapTransactionType(t.type),
  direction: t.direction === 'IN' ? TransactionDirection.IN : TransactionDirection.OUT,
  amount: Number(t.amount),
  category: t.category,
  description: t.description || undefined,
  memberId: t.memberId || undefined,
  paymentMethod: t.paymentMethod || 'نقدي',
  createdBy: t.createdBy?.name || t.createdById || '',
  voucherNumber: t.voucherNumber || undefined,
  status: t.status as TransactionStatus,
  reversalReason: t.reversalReason || undefined,
  reversalOfId: t.reversalOfId || undefined,
  mediumId: t.mediumId || undefined,
  attachmentUrl: t.attachmentUrl || undefined,
});

const mapTransactionType = (type: string): TransactionType => {
  const map: Record<string, TransactionType> = {
    'SUBSCRIPTION': TransactionType.SUBSCRIPTION,
    'DONATION': TransactionType.DONATION,
    'EXPENSE': TransactionType.EXPENSE,
    'PURCHASE': TransactionType.PURCHASE,
    'REVERSAL': TransactionType.REVERSAL,
    'TRANSFER': TransactionType.TRANSFER,
    'PETTY_CASH': TransactionType.PETTY_CASH,
    'PETTY_CASH_SETTLEMENT': TransactionType.PETTY_CASH_SETTLEMENT,
  };
  return map[type] || type as TransactionType;
};

export const AppProvider = ({ children }: PropsWithChildren) => {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [financialMedia, setFinancialMedia] = useState<FinancialMedium[]>([]);
  const [subscriptionTypes, setSubscriptionTypes] = useState<SubscriptionType[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);

  // Load all data from API
  const refreshData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const [membersRes, txRes, mediaRes, subTypesRes] = await Promise.all([
        api.get<any[]>('/members'),
        api.get<any[]>('/transactions'),
        api.get<any[]>('/financial-media'),
        api.get<any[]>('/subscription-types'),
      ]);

      setMembers(membersRes.map(mapMember));
      setTransactions(txRes.map(mapTransaction));
      setFinancialMedia(mediaRes);
      setSubscriptionTypes(subTypesRes.map((s: any) => ({ id: s.id, name: s.name, amount: s.amount })));

      // Load settings
      try {
        const settingsRes = await api.get<any>('/settings');
        if (settingsRes) {
          const extraSettings = settingsRes.extraSettings ? JSON.parse(settingsRes.extraSettings) : {};
          setAppSettings(prev => ({
            ...prev,
            organizationName: settingsRes.organization?.name || prev.organizationName,
            registrationNumber: settingsRes.registrationNumber || undefined,
            address: settingsRes.address || undefined,
            phone: settingsRes.phone || undefined,
            email: settingsRes.email || undefined,
            website: settingsRes.website || undefined,
            memberIdStart: settingsRes.memberIdStart || prev.memberIdStart,
            logoUrl: settingsRes.organization?.logoUrl || undefined,
            ...extraSettings,
          }));
        }
      } catch {
        // Settings optional
      }
    } catch (error) {
      console.error('Failed to load data from API:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      refreshData();
    }
  }, [isAuthenticated, isAuthLoading, refreshData]);

  // ===================== MEMBERS =====================
  const addMember = async (member: Partial<Member>) => {
    try {
      const serverData = {
        ...member,
        gender: reverseMapGender(member.gender || 'ذكر'),
        membershipType: reverseMapMembershipType(member.membershipType || ''),
        status: reverseMapMemberStatus(member.status || ''),
      };
      delete (serverData as any).id;
      const created = await api.post<any>('/members', serverData);
      setMembers(prev => [...prev, mapMember(created)]);
    } catch (error) {
      console.error('Add member error:', error);
      throw error;
    }
  };

  const updateMember = async (id: string, updated: Partial<Member>) => {
    try {
      const serverData: any = { ...updated };
      if (serverData.gender) serverData.gender = reverseMapGender(serverData.gender);
      if (serverData.membershipType) serverData.membershipType = reverseMapMembershipType(serverData.membershipType);
      if (serverData.status) serverData.status = reverseMapMemberStatus(serverData.status);
      delete serverData.id;
      const result = await api.put<any>(`/members/${id}`, serverData);
      setMembers(prev => prev.map(m => m.id === id ? mapMember(result) : m));
    } catch (error) {
      console.error('Update member error:', error);
      throw error;
    }
  };

  const deleteMember = async (id: string) => {
    try {
      await api.delete(`/members/${id}`);
      setMembers(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      console.error('Delete member error:', error);
      throw error;
    }
  };

  const clearMembers = async () => {
    try {
      if (!window.confirm("تحذير: ستقوم بمسح جميع بيانات الأعضاء بشكل دائم من النظام. هل أنت متأكد من هذا الإجراء؟")) return;
      await api.delete('/members');
      setMembers([]);
    } catch (error) {
      console.error('Clear members error:', error);
      alert('حدث خطأ أثناء مسح الأعضاء. يرجى المحاولة مرة أخرى.');
      throw error;
    }
  };

  // ===================== TRANSACTIONS =====================
  const addTransaction = async (transaction: Partial<Transaction>) => {
    try {
      const serverData: any = {
        ...transaction,
        type: reverseMapTransactionType(transaction.type || ''),
        direction: reverseMapDirection(transaction.direction || ''),
        amount: Number(transaction.amount),
      };
      delete serverData.id;
      delete serverData.voucherNumber; // Server generates this
      delete serverData.status;
      delete serverData.createdBy;
      const created = await api.post<any>('/transactions', serverData);
      setTransactions(prev => [mapTransaction(created), ...prev]);

      // Refresh financial media to get updated balances
      const mediaRes = await api.get<any[]>('/financial-media');
      setFinancialMedia(mediaRes);
    } catch (error) {
      console.error('Add transaction error:', error);
      throw error;
    }
  };

  const reverseTransaction = async (id: string, reason: string) => {
    try {
      const reversal = await api.post<any>(`/transactions/${id}/reverse`, { reason });
      // Update original as reversed + add reversal
      setTransactions(prev => [
        mapTransaction(reversal),
        ...prev.map(t => t.id === id ? { ...t, status: TransactionStatus.REVERSED, reversalReason: reason } : t)
      ]);
      // Refresh financial media
      const mediaRes = await api.get<any[]>('/financial-media');
      setFinancialMedia(mediaRes);
    } catch (error) {
      console.error('Reverse transaction error:', error);
      throw error;
    }
  };

  const updateTransaction = async (id: string, updated: Partial<Transaction>) => {
    try {
      const serverData: any = { ...updated };
      if (serverData.type) serverData.type = reverseMapTransactionType(serverData.type);
      if (serverData.direction) serverData.direction = reverseMapDirection(serverData.direction);
      delete serverData.id;
      const result = await api.put<any>(`/transactions/${id}`, serverData);
      setTransactions(prev => prev.map(t => t.id === id ? mapTransaction(result) : t));
    } catch (error) {
      console.error('Update transaction error:', error);
      throw error;
    }
  };

  // ===================== FINANCIAL MEDIA =====================
  const addFinancialMedium = async (medium: Partial<FinancialMedium>) => {
    try {
      const created = await api.post<any>('/financial-media', {
        name: medium.name || 'وسيلة جديدة',
        type: medium.type || 'CASH',
        balance: medium.balance || 0
      });
      setFinancialMedia(prev => [...prev, created]);
    } catch (error) {
      console.error('Add financial medium error:', error);
      throw error;
    }
  };

  const updateFinancialMedium = async (id: string, updated: Partial<FinancialMedium>) => {
    try {
      const result = await api.put<any>(`/financial-media/${id}`, updated);
      setFinancialMedia(prev => prev.map(m => m.id === id ? result : m));
    } catch (error) {
      console.error('Update financial medium error:', error);
      throw error;
    }
  };

  const deleteFinancialMedium = async (id: string) => {
    try {
      await api.delete(`/financial-media/${id}`);
      setFinancialMedia(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      console.error('Delete financial medium error:', error);
      throw error;
    }
  };

  // ===================== SUBSCRIPTION TYPES =====================
  const addSubscriptionType = async (type: Partial<SubscriptionType>) => {
    try {
      const created = await api.post<any>('/subscription-types', {
        name: type.name || 'نوع جديد',
        amount: type.amount || 0,
        period: 'MONTHLY'
      });
      setSubscriptionTypes(prev => [...prev, { id: created.id, name: created.name, amount: created.amount }]);
    } catch (error) {
      console.error('Add subscription type error:', error);
      throw error;
    }
  };

  const updateSubscriptionType = async (id: string, updated: Partial<SubscriptionType>) => {
    try {
      const result = await api.put<any>(`/subscription-types/${id}`, updated);
      setSubscriptionTypes(prev => prev.map(t => t.id === id ? { id: result.id, name: result.name, amount: result.amount } : t));
    } catch (error) {
      console.error('Update subscription type error:', error);
      throw error;
    }
  };

  const deleteSubscriptionType = async (id: string) => {
    try {
      await api.delete(`/subscription-types/${id}`);
      setSubscriptionTypes(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Delete subscription type error:', error);
      throw error;
    }
  };

  // ===================== SETTINGS =====================
  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      // Update local state first for immediate UI feedback
      setAppSettings(prev => ({ ...prev, ...newSettings }));

      // Send to server
      await api.put('/settings', {
        name: newSettings.organizationName,
        logoUrl: newSettings.logoUrl,
        registrationNumber: newSettings.registrationNumber,
        address: newSettings.address,
        phone: newSettings.phone,
        email: newSettings.email,
        website: newSettings.website,
        memberIdStart: newSettings.memberIdStart,
        extraSettings: JSON.stringify({
          voucherPrefixes: newSettings.voucherPrefixes,
          memberFields: newSettings.memberFields,
          subscriptionOptions: newSettings.subscriptionOptions,
          freeSubscriptionTypes: newSettings.freeSubscriptionTypes,
          incomeCategories: newSettings.incomeCategories,
          expenseCategories: newSettings.expenseCategories,
        }),
      });
    } catch (error) {
      console.error('Update settings error:', error);
      // Don't throw — settings update is best-effort
    }
  };

  const importFullData = (data: { members: Member[], transactions: Transaction[], appSettings: AppSettings }) => {
    if (data.members) setMembers(data.members);
    if (data.transactions) setTransactions(data.transactions);
    if (data.appSettings) setAppSettings(data.appSettings);
  };

  // ===================== STATS =====================
  const stats: DashboardStats = useMemo(() => {
    const activeTransactions = transactions.filter(t => t.status !== TransactionStatus.REVERSED);
    const totalIncome = activeTransactions
      .filter(t => t.direction === TransactionDirection.IN)
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = activeTransactions
      .filter(t => t.direction === TransactionDirection.OUT)
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      totalMembers: members.length,
      activeMembers: members.filter(m => m.status === MemberStatus.ACTIVE).length,
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
    };
  }, [members, transactions]);

  return (
    <AppContext.Provider value={{
      members,
      transactions,
      financialMedia,
      subscriptionTypes,
      appSettings,
      addMember,
      updateMember,
      deleteMember,
      clearMembers,
      addTransaction,
      reverseTransaction,
      updateTransaction,
      updateFinancialMedium,
      addFinancialMedium,
      deleteFinancialMedium,
      addSubscriptionType,
      updateSubscriptionType,
      deleteSubscriptionType,
      updateSettings,
      importFullData,
      stats,
      isLoading,
      refreshData
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