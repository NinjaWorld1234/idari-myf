import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Users, Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, Receipt, Plus, ArrowLeftRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import CollectSubscriptionModal from '../components/CollectSubscriptionModal';
import ExpenseRecordingModal from '../components/ExpenseRecordingModal';

const Dashboard = () => {
  const { stats, transactions, isLoading, financialMedia, members } = useApp();

  // Modal States
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Calculate specific stats for the accountant view
  const cashBalance = financialMedia.filter(m => m.type === 'CASH').reduce((sum, m) => sum + m.balance, 0);
  const bankBalance = financialMedia.filter(m => m.type === 'BANK').reduce((sum, m) => sum + m.balance, 0);

  // Dynamic Debt Calculation (Simplified for Dashboard)
  const overdueSubs = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let totalDebt = 0;
    members.forEach(member => {
      // Count paid months from transactions
      const paidMonths = transactions.filter(t =>
        t.memberId === member.id &&
        t.type === 'SUBSCRIPTION' &&
        t.status === 'ACTIVE'
      ).length;

      // Months since Jan 2026 (Launch Date)
      const monthsSinceStart = (currentYear - 2026) * 12 + currentMonth;
      const unpaidCount = Math.max(0, monthsSinceStart - paidMonths);
      totalDebt += unpaidCount * (member.monthlySubscription || 20);
    });
    return totalDebt;
  }, [members, transactions]);

  const monthlySummary = stats.totalIncome - stats.totalExpense;

  const quickActions = [
    { label: 'تحصيل اشتراك', icon: Receipt, color: 'bg-emerald-600', textColor: 'text-white', onClick: () => setShowCollectModal(true) },
    { label: 'صرف مصروف', icon: TrendingDown, color: 'bg-red-600', textColor: 'text-white', onClick: () => setShowExpenseModal(true) },
    { label: 'تحويل مالي', icon: ArrowDownLeft, color: 'bg-blue-600', textColor: 'text-white', onClick: () => { } }, // Transfer to be implemented
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        <p className="mr-3 text-gray-500 font-bold">جاري تحميل البيانات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <header className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">المركز المالي</h1>
          <p className="text-gray-500 text-sm font-bold">{new Date().toLocaleDateString('ar-PS', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </header>

      {/* Accountant Stats Grid - 2x2 on Mobile, 1x4 on Desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        {/* Cash Balance */}
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <p className="text-gray-500 text-xs md:text-sm font-bold">رصيد الصندوق</p>
          <div>
            <h3 className="text-lg md:text-2xl font-black text-emerald-700 mt-1" dir="ltr">₪ {cashBalance.toLocaleString()}</h3>
            <div className="w-full bg-emerald-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-500 h-full w-2/3"></div>
            </div>
          </div>
        </div>

        {/* Bank Balance */}
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <p className="text-gray-500 text-xs md:text-sm font-bold">رصيد البنك</p>
          <div>
            <h3 className="text-lg md:text-2xl font-black text-blue-700 mt-1" dir="ltr">₪ {bankBalance.toLocaleString()}</h3>
            <div className="w-full bg-blue-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-blue-500 h-full w-1/2"></div>
            </div>
          </div>
        </div>

        {/* Overdue Subscriptions */}
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <p className="text-gray-500 text-xs md:text-sm font-bold">اشتراكات متأخرة</p>
          <div>
            <h3 className="text-lg md:text-2xl font-black text-orange-600 mt-1" dir="ltr">₪ {overdueSubs.toLocaleString()}</h3>
            <p className="text-[10px] text-orange-500 mt-1 font-bold">تتطلب تحصيل فوراً</p>
          </div>
        </div>

        {/* Monthly Summary */}
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <p className="text-gray-500 text-xs md:text-sm font-bold">خلاصة الشهر</p>
          <div>
            <h3 className={`text-lg md:text-2xl font-black mt-1 ${monthlySummary >= 0 ? 'text-emerald-600' : 'text-red-600'}`} dir="ltr">
              ₪ {monthlySummary.toLocaleString()}
            </h3>
            <p className="text-[10px] text-gray-400 mt-1 font-bold">صافي الحركة المالية</p>
          </div>
        </div>
      </div>

      {/* Quick Actions - 3 Round Buttons Side-by-Side */}
      <div className="grid grid-cols-3 gap-4 py-2">
        {quickActions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.onClick}
            className="flex flex-col items-center gap-2 group active:scale-95 transition-transform"
          >
            <div className={`w-14 h-14 md:w-16 md:h-16 ${action.color} ${action.textColor} rounded-2xl shadow-md flex items-center justify-center group-hover:shadow-lg transition-all`}>
              <action.icon size={28} />
            </div>
            <span className="text-xs font-black text-gray-700">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Recent Journal / Daily Transactions */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-50 flex justify-between items-center">
          <h3 className="font-black text-gray-800">أحدث العمليات</h3>
          <button className="text-emerald-600 text-xs font-bold hover:underline">عرض الكل</button>
        </div>
        <div className="divide-y divide-gray-50">
          {transactions.slice(0, 10).map((t) => (
            <div key={t.id} className={`p-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${t.status === 'REVERSED' ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-3 text-right">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.direction === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                  }`}>
                  {t.direction === 'IN' ? <ArrowUpRight size={20} /> : <TrendingDown size={20} />}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{t.description || t.category}</p>
                  <p className="text-[10px] text-gray-500 font-bold">{new Date(t.date).toLocaleDateString('ar-PS')} • {t.voucherNumber || 'بدون سند'}</p>
                </div>
              </div>
              <div className="text-left font-mono">
                <p className={`font-black ${t.direction === 'IN' ? 'text-emerald-600' : 'text-red-600'}`} dir="ltr">
                  {t.direction === 'IN' ? '+' : '-'} {t.amount.toLocaleString()}
                </p>
                <p className="text-[10px] text-gray-400 font-bold">{t.paymentMethod}</p>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="p-10 text-center text-gray-400 font-bold">لا توجد عمليات مسجلة حالياً</div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CollectSubscriptionModal isOpen={showCollectModal} onClose={() => setShowCollectModal(false)} />
      <ExpenseRecordingModal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} />
    </div>
  );
};

export default Dashboard;