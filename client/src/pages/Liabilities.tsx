import React, { useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { TransactionType, UserRole, STATUS_LABELS } from '../types';
import { Wallet, Search, Filter, AlertCircle, CheckCircle, Printer, Download, User, X } from 'lucide-react';
import PrintHeader from '../components/PrintHeader';
import { exportToCSV } from '../utils';
import CollectSubscriptionModal from '../components/CollectSubscriptionModal';

const Liabilities = () => {
    const { members, transactions, isLoading } = useApp();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDebtOnly, setFilterDebtOnly] = useState(true);
    const [payMemberId, setPayMemberId] = useState<string | null>(null);

    // Access Control: Only Managers and Accountants
    if (user?.role !== UserRole.MANAGER && user?.role !== UserRole.ACCOUNTANT) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-20">
                <div className="bg-red-50 p-6 rounded-full mb-4">
                    <AlertCircle className="text-red-600 w-12 h-12" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">غير مصرح بالدخول</h2>
                <p className="text-gray-500 mt-2">ليس لديك صلاحية لعرض صفحة الذمم المالية.</p>
            </div>
        );
    }

    // Debt Calculation Logic (Shared with Members.tsx)
    const stats = useMemo(() => {
        const now = new Date();
        const currentYearNum = now.getFullYear();
        const currentMonthNum = now.getMonth() + 1;

        return members.map(member => {
            const paidMonths: { m: number; y: number }[] = [];
            const memberTxns = transactions.filter(t => t.memberId === member.id);

            memberTxns.forEach(t => {
                if (t.type === TransactionType.SUBSCRIPTION && t.description?.includes('شهر')) {
                    const match = t.description.match(/(\d+)\s*\/\s*(\d+)/);
                    if (match) {
                        paidMonths.push({ m: parseInt(match[1]), y: parseInt(match[2]) });
                    }
                }
            });

            const unpaidMonths: { m: number; y: number }[] = [];
            const startYear = 2026;
            for (let y = startYear; y <= currentYearNum; y++) {
                const startM = (y === startYear) ? 1 : 1;
                const endM = (y === currentYearNum) ? currentMonthNum : 12;

                for (let m = startM; m <= endM; m++) {
                    const isPaid = paidMonths.some(p => p.m === m && p.y === y);
                    if (!isPaid) unpaidMonths.push({ m, y });
                }
            }

            return {
                ...member,
                totalDebt: unpaidMonths.length * (member.monthlySubscription || 20),
                paidCount: paidMonths.length,
                unpaidCount: unpaidMonths.length,
                unpaidMonths
            };
        });
    }, [members, transactions]);

    const filteredLiabilities = stats.filter(s => {
        const matchesSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || s.memberCode.includes(searchTerm);
        const matchesDebt = filterDebtOnly ? s.totalDebt > 0 : true;
        return matchesSearch && matchesDebt;
    }).sort((a, b) => b.totalDebt - a.totalDebt); // Sort by highest debt

    const handleExportCSV = () => {
        const headers = ['رقم العضوية', 'الاسم', 'الالتزام الشهري', 'إجمالي الدين', 'الشهور المستحقة'];
        const rows = filteredLiabilities.map(s => [
            s.memberCode,
            s.fullName,
            String(s.monthlySubscription || 20),
            String(s.totalDebt),
            s.unpaidMonths.map(u => `${u.m}/${u.y}`).join(' | ')
        ]);
        exportToCSV(headers, rows, `liabilities_export_${new Date().toISOString().slice(0, 10)}.csv`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">ذمم الأعضاء والمستحقات</h1>
                    <p className="text-gray-500 text-sm mt-1">عرض تفصيلي للشهور غير المسددة ابتداءً من يناير 2026</p>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                    <button onClick={handleExportCSV} className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg shadow-sm font-medium"><Download size={18} /> تصدير</button>
                    <button onClick={() => window.print()} className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg shadow-sm font-medium"><Printer size={18} /> طباعة</button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center print:hidden">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-grow">
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="بحث بالاسم أو الرقم..."
                            className="w-full md:w-64 pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 whitespace-nowrap">
                        <input type="checkbox" checked={filterDebtOnly} onChange={e => setFilterDebtOnly(e.target.checked)} className="rounded text-emerald-600" />
                        فقط المدينين
                    </label>
                </div>
                <div className="bg-red-50 px-4 py-2 rounded-lg text-sm font-bold text-red-700 border border-red-100">
                    إجمالي المتأخرات: {filteredLiabilities.reduce((sum, s) => sum + s.totalDebt, 0).toLocaleString()} ₪
                </div>
            </div>

            <PrintHeader title="تقرير ذمم الأعضاء" />

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:border-gray-300">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 text-gray-600 font-medium text-sm border-b border-gray-200 print:bg-gray-100">
                            <tr>
                                <th className="px-6 py-4">العضو</th>
                                <th className="px-6 py-4">الالتزام</th>
                                <th className="px-6 py-4">المدفوع</th>
                                <th className="px-6 py-4">المستحق</th>
                                <th className="px-6 py-4">إجمالي الدين</th>
                                <th className="px-6 py-4">الشهور المتأخرة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {filteredLiabilities.length === 0 ? (
                                <tr><td colSpan={6} className="py-20 text-center text-gray-500">لا توجد ذمم مالية مطابقة للبحث</td></tr>
                            ) : (
                                filteredLiabilities.map(s => (
                                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => setPayMemberId(s.id)}
                                                className="font-bold text-gray-800 hover:text-emerald-700 text-right w-full"
                                            >
                                                {s.fullName}
                                            </button>
                                            <div className="text-[10px] text-gray-500">#{s.memberCode} | {STATUS_LABELS[s.status]}</div>
                                        </td>
                                        <td className="px-6 py-4 font-medium">{s.monthlySubscription || 20} ₪</td>
                                        <td className="px-6 py-4 text-emerald-600 font-bold">{s.paidCount} شهر</td>
                                        <td className="px-6 py-4 text-red-600 font-bold">{s.unpaidCount} شهر</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full font-black ${s.totalDebt > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {s.totalDebt} ₪
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1 max-w-xs">
                                                {s.unpaidMonths.map((u, i) => (
                                                    <span key={i} className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 border border-gray-200">
                                                        {u.m}/{u.y}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Subscription Collection Modal */}
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
