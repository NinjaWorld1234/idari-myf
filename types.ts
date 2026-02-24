export enum UserRole {
  MANAGER = 'مدير',
  OFFICER = 'مسؤول',
  ACCOUNTANT = 'محاسب'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export enum MembershipType {
  MEMBER = 'عضو',
  FAN = 'محب',
  HONORARY = 'شرفي',
  CONSULTANT = 'مستشار',
  EMPLOYEE = 'موظف'
}

export enum MemberStatus {
  ACTIVE = 'نشط',
  SUSPENDED = 'موقوف',
  EXPIRED = 'منتهٍ'
}

export enum Gender {
  MALE = 'ذكر',
  FEMALE = 'أنثى'
}

export interface Member {
  id: string;
  memberCode: string;
  fullName: string;
  nationalId?: string;
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
  monthlySubscription?: number;
  additionalData?: Record<string, any>;
}

export enum TransactionType {
  SUBSCRIPTION = 'اشتراك',
  DONATION = 'تبرع',
  EXPENSE = 'مصروف',
  PURCHASE = 'شراء',
  REVERSAL = 'عكس عملية',
  TRANSFER = 'تحويل',
  PETTY_CASH = 'عهدة',
  PETTY_CASH_SETTLEMENT = 'تسوية عهدة'
}

export enum TransactionStatus {
  ACTIVE = 'ACTIVE',
  REVERSED = 'REVERSED'
}

export enum TransactionDirection {
  IN = 'وارد',
  OUT = 'صادر'
}

export interface FinancialMedium {
  id: string;
  name: string;
  type: 'CASH' | 'BANK';
  balance: number;
}

export interface SubscriptionType {
  id: string;
  name: string;
  amount: number;
}

export interface MemberFieldDef {
  key: string;        // unique key for storage
  label: string;      // Arabic display name
  type: 'text' | 'select' | 'number' | 'date' | 'textarea';
  required: boolean;
  options?: string[]; // for select type
  group: 'core' | 'extra'; // core = built-in, extra = dynamic
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
  voucherPrefixes?: Record<string, string>;
  memberFields?: MemberFieldDef[];
  subscriptionOptions?: number[]; // e.g. [0, 20, 30, 50]
  freeSubscriptionTypes?: MembershipType[]; // e.g. [HONORARY]
  incomeCategories?: string[];
  expenseCategories?: string[];
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
  isSubscriptionPayment?: boolean;
}

export interface VoucherSequence {
  prefix: string;
  nextNumber: number;
  format: string; // e.g., 'YYYY-NNNN'
}

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
}

export const STATUS_LABELS: Record<MemberStatus, string> = {
  [MemberStatus.ACTIVE]: 'نشط',
  [MemberStatus.SUSPENDED]: 'موقوف',
  [MemberStatus.EXPIRED]: 'منتهٍ'
};

export const MEMBERSHIP_LABELS: Record<MembershipType, string> = {
  [MembershipType.MEMBER]: 'عضو',
  [MembershipType.FAN]: 'محب',
  [MembershipType.HONORARY]: 'شرفي',
  [MembershipType.CONSULTANT]: 'مستشار',
  [MembershipType.EMPLOYEE]: 'موظف'
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
  [TransactionType.PETTY_CASH]: 'عهدة',
  [TransactionType.PETTY_CASH_SETTLEMENT]: 'تسوية عهدة'
};

export const DIRECTION_LABELS: Record<TransactionDirection, string> = {
  [TransactionDirection.IN]: 'وارد',
  [TransactionDirection.OUT]: 'صادر'
};