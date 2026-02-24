import { Member, MemberStatus, MembershipType, Transaction, TransactionDirection, TransactionType, User, UserRole, Gender } from "./types";
import { LayoutDashboard, Users, Wallet, FileText, Settings as SettingsIcon } from 'lucide-react';

export const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'لوحة التحكم', roles: [UserRole.MANAGER, UserRole.OFFICER, UserRole.ACCOUNTANT] },
  { to: '/members', icon: Users, label: 'إدارة الأعضاء', roles: [UserRole.MANAGER, UserRole.OFFICER, UserRole.ACCOUNTANT] },
  { to: '/liabilities', icon: Wallet, label: 'ذمم الأعضاء', roles: [UserRole.MANAGER, UserRole.ACCOUNTANT] },
  { to: '/finance', icon: Wallet, label: 'المالية والاشتراكات', roles: [UserRole.MANAGER, UserRole.ACCOUNTANT] },
  { to: '/reports', icon: FileText, label: 'التقارير', roles: [UserRole.MANAGER, UserRole.OFFICER, UserRole.ACCOUNTANT] },
  { to: '/settings', icon: SettingsIcon, label: 'الإعدادات', roles: [UserRole.MANAGER] },
];

export const MOCK_USERS: User[] = [
  { id: '1', name: 'أحمد المدير', email: 'admin@myf.ps', role: UserRole.MANAGER, avatar: 'https://picsum.photos/200', organizationId: 'org1' },
  { id: '2', name: 'خالد المسؤول', email: 'officer@myf.ps', role: UserRole.OFFICER, organizationId: 'org1' }, // Responsible for Members
  { id: '3', name: 'سارة المحاسبة', email: 'accountant@myf.ps', role: UserRole.ACCOUNTANT, organizationId: 'org1' }, // Responsible for Finance
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

export const INITIAL_MEMBERS: Member[] = [
  {
    id: 'm1',
    memberCode: '1001',
    fullName: 'محمد عبدالله',
    gender: Gender.MALE,
    phone: '0599123456',
    whatsapp: '0599123456',
    city: 'القدس',
    membershipType: MembershipType.MEMBER,
    joinDate: '2023-01-15',
    status: MemberStatus.ACTIVE,
    job: 'مهندس'
  },
  {
    id: 'm2',
    memberCode: '1002',
    fullName: 'محمود عباس',
    gender: Gender.MALE,
    phone: '0599654321',
    whatsapp: '0599654321',
    city: 'رام الله والبيرة',
    membershipType: MembershipType.FAN,
    joinDate: '2023-03-10',
    status: MemberStatus.ACTIVE,
    job: 'مدرس'
  },
  {
    id: 'm3',
    memberCode: '1003',
    fullName: 'علي حسين',
    gender: Gender.MALE,
    phone: '0568123123',
    whatsapp: '0568123123',
    city: 'نابلس',
    membershipType: MembershipType.HONORARY,
    joinDate: '2022-11-05',
    status: MemberStatus.EXPIRED,
    job: 'رجل أعمال'
  },
  {
    id: 'm4',
    memberCode: '1004',
    fullName: 'منى خليل',
    gender: Gender.FEMALE,
    phone: '0598777888',
    whatsapp: '0598777888',
    city: 'الخليل',
    membershipType: MembershipType.MEMBER,
    joinDate: '2023-06-20',
    status: MemberStatus.ACTIVE,
    job: 'طبيبة'
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    date: '2023-10-01',
    type: TransactionType.SUBSCRIPTION,
    direction: TransactionDirection.IN,
    amount: 100,
    category: 'اشتراك سنوي',
    description: 'اشتراك العضو محمد عبدالله',
    memberId: 'm1',
    paymentMethod: 'نقدي',
    createdBy: 'admin'
  },
  {
    id: 't2',
    date: '2023-10-05',
    type: TransactionType.DONATION,
    direction: TransactionDirection.IN,
    amount: 5000,
    category: 'تبرع عام',
    description: 'فاعل خير لدعم الأنشطة',
    paymentMethod: 'تحويل بنكي',
    createdBy: 'admin'
  },
  {
    id: 't3',
    date: '2023-10-10',
    type: TransactionType.EXPENSE,
    direction: TransactionDirection.OUT,
    amount: 1200,
    category: 'إيجار',
    description: 'إيجار مقر الجمعية لشهر 10',
    paymentMethod: 'شيك',
    createdBy: 'admin'
  },
  {
    id: 't4',
    date: '2023-10-15',
    type: TransactionType.EXPENSE,
    direction: TransactionDirection.OUT,
    amount: 300,
    category: 'ضيافة',
    description: 'ضيافة اجتماع الهيئة الإدارية',
    paymentMethod: 'نقدي',
    createdBy: 'admin'
  }
];