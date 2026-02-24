export enum UserRole {
  MANAGER = 'MANAGER',
  OFFICER = 'OFFICER',
  ACCOUNTANT = 'ACCOUNTANT'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  organizationId: string;
}

export enum MembershipType {
  MEMBER = 'MEMBER',
  FAN = 'FAN',
  HONORARY = 'HONORARY',
  CONSULTANT = 'CONSULTANT',
  EMPLOYEE = 'EMPLOYEE'
}

export enum MemberStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED'
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE'
}

export interface Member {
  id: string;
  memberCode: string;
  fullName: string;
  nationalId?: string; // Added field
  gender: Gender;
  phone: string;
  whatsapp: string;
  email?: string;
  city: string;
  address?: string;
  membershipType: MembershipType;
  joinDate: string;
  status: MemberStatus;
  job?: string;
  monthlySubscription?: number; // Added field
  additionalData?: Record<string, any>; // For all the extra excel columns
}

export enum TransactionType {
  SUBSCRIPTION = 'SUBSCRIPTION',
  DONATION = 'DONATION',
  EXPENSE = 'EXPENSE',
  PURCHASE = 'PURCHASE',
  REVERSAL = 'REVERSAL',
  TRANSFER = 'TRANSFER',
  REV_OTHER = 'REV_OTHER',
  CONVEYANCE = 'CONVEYANCE'
}

export enum TransactionStatus {
  ACTIVE = 'ACTIVE',
  REVERSED = 'REVERSED'
}

export enum TransactionDirection {
  IN = 'IN',
  OUT = 'OUT'
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  direction: TransactionDirection;
  amount: number;
  category: string;
  description?: string;
  memberId?: string;
  paymentMethod: string;
  createdBy: string;
  voucherNumber?: string;
  status: TransactionStatus;
  reversalReason?: string;
  reversalOfId?: string;
  mediumId?: string;
  attachmentUrl?: string;
  member?: { fullName: string; memberCode: string };
  medium?: { name: string; type: string };
}

export enum FinancialMediumType {
  CASH = 'CASH',
  BANK = 'BANK'
}

export interface FinancialMedium {
  id: string;
  name: string;
  type: FinancialMediumType;
  accountNumber?: string;
  balance: number;
  isDefault: boolean;
}

export interface SubscriptionType {
  id: string;
  name: string;
  amount: number;
  period: 'MONTHLY' | 'YEARLY' | 'CUSTOM';
}

export interface SubscriptionDue {
  id: string;
  dueDate: string;
  periodText: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'PARTIAL';
  memberId: string;
  subscriptionTypeId: string;
}

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
}

export interface AppSettings {
  memberIdStart: number;
  logoUrl?: string;
  organizationName?: string;
  registrationNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

// ARABIC LABELS FOR UI
export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.MANAGER]: 'مدير',
  [UserRole.OFFICER]: 'مسؤول',
  [UserRole.ACCOUNTANT]: 'محاسب'
};

export const MEMBERSHIP_LABELS: Record<MembershipType, string> = {
  [MembershipType.MEMBER]: 'عضو',
  [MembershipType.FAN]: 'محب',
  [MembershipType.HONORARY]: 'شرفي',
  [MembershipType.CONSULTANT]: 'مستشار',
  [MembershipType.EMPLOYEE]: 'موظف'
};

export const STATUS_LABELS: Record<MemberStatus, string> = {
  [MemberStatus.ACTIVE]: 'نشط',
  [MemberStatus.SUSPENDED]: 'موقوف',
  [MemberStatus.EXPIRED]: 'منتهٍ'
};

export const GENDER_LABELS: Record<Gender, string> = {
  [Gender.MALE]: 'ذكر',
  [Gender.FEMALE]: 'أنثى'
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  [TransactionType.SUBSCRIPTION]: 'اشتراك',
  [TransactionType.DONATION]: 'تبرع',
  [TransactionType.EXPENSE]: 'مصروف',
  [TransactionType.PURCHASE]: 'شراء',
  [TransactionType.REVERSAL]: 'عكس عملية',
  [TransactionType.TRANSFER]: 'تحويل',
  [TransactionType.REV_OTHER]: 'إيراد آخر',
  [TransactionType.CONVEYANCE]: 'عهدة'
};

export const DIRECTION_LABELS: Record<TransactionDirection, string> = {
  [TransactionDirection.IN]: 'وارد',
  [TransactionDirection.OUT]: 'صادر'
};