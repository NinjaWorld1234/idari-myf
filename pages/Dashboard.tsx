import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, TransactionType, TransactionStatus } from '../types';
import { Users, Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, Receipt, Plus, ArrowLeftRight, UserPlus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import CollectSubscriptionModal from '../components/CollectSubscriptionModal';
import ExpenseRecordingModal from '../components/ExpenseRecordingModal';
import TransferRecordingModal from '../components/TransferRecordingModal';
import IncomeRecordingModal from '../components/IncomeRecordingModal';
import PettyCashModal from '../components/PettyCashModal';

const Dashboard = () => {
  const { stats, transactions, isLoading, financialMedia, members } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Modal States
  const [activeModal, setActiveModal] = useState<'EXPENSE' | 'PETTY_CASH' | 'INCOME' | 'TRANSFER' | 'COLLECT_SUB' | null>(null);

  // Calculate specific stats for the accountant view
  const cashBalance = financialMedia.filter(m => m.type === 'CASH').reduce((sum, m) => sum + m.balance, 0);
  const bankBalance = financialMedia.filter(m => m.type === 'BANK').reduce((sum, m) => sum + m.balance, 0);

  // Calculate monthly summary
  const monthlySummary = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthTxs = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth &&
        d.getFullYear() === currentYear &&
        t.status !== 'REVERSED' &&
        t.type !== TransactionType.REVERSAL &&
        t.type !== TransactionType.TRANSFER; // Transfers aren't income/expense
    });

    const income = monthTxs.filter(t => t.direction === 'وارد').reduce((sum, t) => sum + t.amount, 0);
    const expense = monthTxs.filter(t => t.direction === 'صادر').reduce((sum, t) => sum + t.amount, 0);

    return { income, expense };
  }, [transactions]);

  const overdueDetails = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let totalDebt = 0;
    let overdueCount = 0;
    members.forEach(member => {
      // Skip free subscription members
      const sub = member.monthlySubscription || 0;
      if (sub === 0) return;

      // Use the member's actual join date, not a hardcoded year
      const joinDate = member.joinDate ? new Date(member.joinDate) : null;
      if (!joinDate || isNaN(joinDate.getTime())) return;

      const joinYear = joinDate.getFullYear();
      const joinMonth = joinDate.getMonth() + 1;
      const monthsSinceJoin = (currentYear - joinYear) * 12 + (currentMonth - joinMonth) + 1;
      if (monthsSinceJoin <= 0) return;

      const paidMonths = transactions.filter(t =>
        t.memberId === member.id &&
        t.type === TransactionType.SUBSCRIPTION &&
        t.status === TransactionStatus.ACTIVE
      ).length;

      const unpaidCount = Math.max(0, monthsSinceJoin - paidMonths);
      if (unpaidCount > 0) {
        totalDebt += unpaidCount * sub;
        overdueCount++;
      }
    });
    return { totalDebt, overdueCount };
  }, [members, transactions]);

  const quickActions = [
    { id: 'SUB', icon: Receipt, label: 'تحصيل اشتراك', color: 'bg-emerald-600', action: () => setActiveModal('COLLECT_SUB') },
    { id: 'INC', icon: Receipt, label: 'إيراد آخر', color: 'bg-emerald-500', action: () => setActiveModal('INCOME') },
    { id: 'EXP', icon: Wallet, label: 'مصروف', color: 'bg-red-600', action: () => setActiveModal('EXPENSE') },
    { id: 'PC', icon: Wallet, label: 'عهدة / تسوية', color: 'bg-amber-500', action: () => setActiveModal('PETTY_CASH') },
    { id: 'TRANS', icon: ArrowLeftRight, label: 'تحويل', color: 'bg-blue-600', action: () => setActiveModal('TRANSFER') },
    { id: 'NEW', icon: UserPlus, label: 'عضو جديد', color: 'bg-purple-600', action: () => navigate('/members', { state: { openAdd: true } }) },
  ];

  const visibleQuickActions = quickActions.filter(action => {
    if (action.id === 'NEW' && user?.role === UserRole.ACCOUNTANT) return false;
    return true;
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 font-bold">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <header className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">المركز المالي</h1>
          <p className="text-gray-500 text-sm font-bold">نظرة شاملة على أرصدة الجمعية</p>
        </div>
      </header>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs font-bold">رصيد الصندوق</p>
          <h3 className="text-2xl font-black text-emerald-700 mt-1" dir="ltr">₪ {cashBalance.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs font-bold">رصيد البنك</p>
          <h3 className="text-2xl font-black text-blue-700 mt-1" dir="ltr">₪ {bankBalance.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs font-bold">اشتراكات متأخرة</p>
          <h3 className="text-2xl font-black text-orange-600 mt-1" dir="ltr">₪ {overdueDetails.totalDebt.toLocaleString()}</h3>
          <p className="text-[10px] text-orange-400 font-bold mt-1">عدد المتأخرين: {overdueDetails.overdueCount}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-xs font-bold">ملخص الشهر</p>
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex items-center gap-1 text-emerald-600 text-sm font-black">
              <ArrowUpRight size={14} /> ₪ {monthlySummary.income.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-red-600 text-sm font-black">
              <ArrowDownLeft size={14} /> ₪ {monthlySummary.expense.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <h3 className="text-lg font-black text-gray-800 mb-2">إجراءات سريعة</h3>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {visibleQuickActions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            className={`${action.color} text-white p-4 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform active:scale-95`}
          >
            <action.icon size={26} strokeWidth={2.5} />
            <span className="text-xs font-black">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-black text-gray-800 mb-4">آخر الحركات</h3>
        <div className="space-y-4">
          {transactions.slice(0, 5).map(t => (
            <div key={t.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl border-b last:border-0 border-gray-50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${t.direction === 'وارد' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {t.direction === 'وارد' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{t.category}</p>
                  <p className="text-[10px] text-gray-400 font-bold">{t.voucherNumber || 'سند داخلي'}</p>
                </div>
              </div>
              <span className={`font-black text-sm ${t.direction === 'وارد' ? 'text-emerald-600' : 'text-red-600'}`} dir="ltr">
                {t.direction === 'وارد' ? '+' : '-'} {t.amount}
              </span>
            </div>
          ))}
        </div>
      </div>

      <ExpenseRecordingModal
        isOpen={activeModal === 'EXPENSE'}
        onClose={() => setActiveModal(null)}
      />
      <PettyCashModal
        isOpen={activeModal === 'PETTY_CASH'}
        onClose={() => setActiveModal(null)}
      />
      <IncomeRecordingModal
        isOpen={activeModal === 'INCOME'}
        onClose={() => setActiveModal(null)}
      />
      <TransferRecordingModal
        isOpen={activeModal === 'TRANSFER'}
        onClose={() => setActiveModal(null)}
      />
      <CollectSubscriptionModal
        isOpen={activeModal === 'COLLECT_SUB'}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
};

export default Dashboard;