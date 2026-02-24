import React, { useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { MemberStatus, TransactionDirection, TransactionType } from '../types';
import { Search, Printer, Download, CreditCard, AlertCircle } from 'lucide-react';
import CollectSubscriptionModal from '../components/CollectSubscriptionModal';

const Liabilities = () => {
    const { members, transactions, isLoading } = useApp();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [payMemberId, setPayMemberId] = useState<string | null>(null);

    // Filtered Liabilities
    const filteredLiabilities = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        return members.map(member => {
            // Count paid subscription months (non-reversed)
            const paidMonths = transactions.filter(t =>
                t.memberId === member.id &&
                t.type === 'اشتراك' &&
                t.status !== 'REVERSED'
            ).length;

            // Calculate months since member's join date
            const joinDate = new Date(member.joinDate);
            const joinYear = joinDate.getFullYear();
            const joinMonth = joinDate.getMonth() + 1;

            let totalMonthsDue = 0;
            for (let y = joinYear; y <= currentYear; y++) {
                const sM = y === joinYear ? joinMonth : 1;
                const eM = y === currentYear ? currentMonth : 12;
                totalMonthsDue += Math.max(0, eM - sM + 1);
            }

            const unpaidCount = Math.max(0, totalMonthsDue - paidMonths);
            const totalDebt = unpaidCount * (member.monthlySubscription || 20);

            return { ...member, unpaidCount, totalDebt };
        }).filter(m =>
            (m.fullName.includes(searchTerm) || m.memberCode.includes(searchTerm)) && m.totalDebt > 0
        ).sort((a, b) => b.totalDebt - a.totalDebt);
    }, [members, transactions, searchTerm]);

    if (user?.role === 'مسؤول') {
        return <div className="p-10 text-center font-bold text-red-600">غير مصرح لك بدخول قسم الذمم</div>;
    }

    return (
        <div className="space-y-6 pb-24 md:pb-8">
            <header className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">ذمم الأعضاء</h1>
                    <p className="text-gray-500 text-sm font-bold">متابعة المتأخرات والتحصيل</p>
                </div>
            </header>

            <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="بحث باسم العضو أو الرقم..."
                    className="w-full pr-12 pl-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 border-b border-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-xs font-black text-gray-400">العضو</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 text-center">المتأخرات</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 text-center">إجمالي الدين</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-400 text-center">إجراء</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredLiabilities.map(s => (
                                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => setPayMemberId(s.id)}
                                            className="font-bold text-gray-800 hover:text-emerald-700 text-right w-full"
                                        >
                                            {s.fullName}
                                        </button>
                                        <div className="text-[10px] text-gray-500">#{s.memberCode}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center font-black text-red-600 text-sm">
                                        {s.unpaidCount} شهر
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full font-black text-sm">
                                            ₪ {s.totalDebt.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => setPayMemberId(s.id)}
                                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                        >
                                            <CreditCard size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {payMemberId && (
                <CollectSubscriptionModal
                    isOpen={!!payMemberId}
                    onClose={() => setPayMemberId(null)}
                    memberId={payMemberId}
                />
            )}
        </div>
    );
};

export default Liabilities;
