import { Member, Transaction, User, UserRole } from "./types";
import { LayoutDashboard, Users, Wallet, FileText, Settings as SettingsIcon } from 'lucide-react';

export const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'لوحة التحكم', roles: [UserRole.MANAGER, UserRole.OFFICER, UserRole.ACCOUNTANT] },
  { to: '/members', icon: Users, label: 'إدارة الأعضاء', roles: [UserRole.MANAGER, UserRole.OFFICER] },
  { to: '/liabilities', icon: Wallet, label: 'ذمم الأعضاء', roles: [UserRole.MANAGER, UserRole.ACCOUNTANT] },
  { to: '/finance', icon: Wallet, label: 'المالية والاشتراكات', roles: [UserRole.MANAGER, UserRole.ACCOUNTANT] },
  { to: '/reports', icon: FileText, label: 'التقارير', roles: [UserRole.MANAGER, UserRole.OFFICER, UserRole.ACCOUNTANT] },
  { to: '/settings', icon: SettingsIcon, label: 'الإعدادات', roles: [UserRole.MANAGER, UserRole.ACCOUNTANT] },
];

export const MOCK_USERS: User[] = [
  { id: '1', name: 'أحمد المدير', email: 'admin@myf.ps', role: UserRole.MANAGER, avatar: 'https://picsum.photos/200' },
  { id: '2', name: 'خالد المسؤول', email: 'officer@myf.ps', role: UserRole.OFFICER }, // Responsible for Members
  { id: '3', name: 'سارة المحاسبة', email: 'accountant@myf.ps', role: UserRole.ACCOUNTANT }, // Responsible for Finance
];

export const PALESTINIAN_CITIES = [
  "القدس",
  "غزة",
  "رام الله والبيرة",
  "نابلس",
  "الخليل",
  "جنين",
  "طولكرم",
  "قلقيلية",
  "أريحا",
  "بيت لحم",
  "سلفيت",
  "طوباس",
  "رفح",
  "خان يونس",
  "دير البلح",
  "شمال غزة"
];

// Empty initial data — real data comes from the backend API or user import
export const INITIAL_MEMBERS: Member[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];