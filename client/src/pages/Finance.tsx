import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import VoucherPrint from '../components/VoucherPrint';
import {
  Transaction,
  TransactionType,
  TransactionDirection,
  TransactionStatus,
  UserRole,
  TRANSACTION_TYPE_LABELS,
  DIRECTION_LABELS
} from '../types';
import {
  Search,
  Filter,
  Download,
  Printer,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  X,
  CreditCard
} from 'lucide-react';

const Finance = () => {
  const { transactions, reverseTransaction, financialMedia, members, isLoading } = useApp();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Reversal Modal State
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [printingTransaction, setPrintingTransaction] = useState<Transaction | null>(null);

  // Filtering Logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch =
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.voucherNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;

      const matchesDate = (!dateFrom || (t.date && new Date(t.date) >= new Date(dateFrom))) &&
        (!dateTo || (t.date && new Date(t.date) <= new Date(dateTo)));

      return matchesSearch && matchesType && matchesStatus && matchesDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, typeFilter, statusFilter, dateFrom, dateTo]);

  const handleReverse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingId || !reversalReason) return;

    setIsSubmitting(true);
    try {
      await reverseTransaction(reversingId, reversalReason);
      setReversingId(null);
      setReversalReason('');
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء عكس العملية');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800">سجل الحركات المالية</h2>
          <p className="text-gray-500 text-sm mt-1">عرض وتدقيق قيود اليومية، السندات، وعمليات العكس</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 font-bold text-sm hover:bg-gray-50 shadow-sm">
            <Printer size={18} /> طباعة القائمة
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-white rounded-xl font-bold text-sm hover:bg-gray-900 shadow-sm">
            <Download size={18} /> تصدير Excel
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-black text-gray-400 mb-2">بحث (بيان، رقم سند، تصنيف)</label>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
              placeholder="ابحث هنا..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-black text-gray-400 mb-2">نوع الحركة</label>
          <select
            className="px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">الكل</option>
            {Object.entries(TRANSACTION_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-black text-gray-400 mb-2">الحالة</label>
          <select
            className="px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">الكل</option>
            <option value="ACTIVE">نشط</option>
            <option value="REVERSED">معكوس</option>
          </select>
        </div>

        <div className="flex gap-2">
          <div>
            <label className="block text-xs font-black text-gray-400 mb-2">من تاريخ</label>
            <input
              type="date"
              className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-xs"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-400 mb-2">إلى تاريخ</label>
            <input
              type="date"
              className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-xs"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Transactions Table container */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-black text-gray-400">رقم السند</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400">التاريخ</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400">البيان والتصنيف</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400">من/إلى</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400">المبلغ</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400">الحالة</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={7} className="p-12 text-center text-gray-400 font-bold">جاري تحميل البيانات...</td></tr>
              ) : filteredTransactions.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center text-gray-400 font-bold">لا يوجد حركات تطابق الفلاتر</td></tr>
              ) : filteredTransactions.map((t) => (
                <tr key={t.id} className={`hover:bg-gray-50/50 transition-colors ${t.status === 'REVERSED' ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-gray-100 rounded-lg text-gray-400">
                        <FileText size={16} />
                      </div>
                      <span className="font-black text-gray-800">{t.voucherNumber || '---'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-700 text-sm">{new Date(t.date).toLocaleDateString('ar-EG')}</span>
                      <span className="text-[10px] text-gray-400 font-bold">{new Date(t.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-gray-800">{t.category}</span>
                      <p className="text-xs text-gray-400 font-bold truncate max-w-[200px]" title={t.description}>{t.description}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${t.direction === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {t.direction === 'IN' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                      </div>
                      <span className="text-xs font-black text-gray-600">
                        {financialMedia.find(m => m.id === t.mediumId)?.name || 'غير محدد'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-black ${t.direction === 'IN' ? 'text-emerald-600' : 'text-red-600'}`} dir="ltr">
                      {t.direction === 'IN' ? '+' : '-'} {t.amount.toLocaleString()} ₪
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {t.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black border border-emerald-100">
                        <CheckCircle size={10} /> نشط
                      </span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-[10px] font-black border border-red-100 w-fit">
                          <RotateCcw size={10} /> معكوس
                        </span>
                        <p className="text-[9px] text-gray-400 font-bold italic">بسبب: {t.reversalReason}</p>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {t.status === 'ACTIVE' && user?.role === UserRole.MANAGER && (
                        <button
                          onClick={() => setReversingId(t.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="عكس الحركة (إلغاء)"
                        >
                          <RotateCcw size={18} />
                        </button>
                      )}
                      {t.memberId && (
                        <div className="p-2 text-blue-400" title="مرتبط بعضو">
                          <CreditCard size={18} />
                        </div>
                      )}
                      <button
                        onClick={() => setPrintingTransaction(t)}
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                        title="طباعة / حفظ سند"
                      >
                        <Printer size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reversal Reason Modal */}
      {reversingId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setReversingId(null)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-gray-800">عكس القيد المالي</h3>
              <button onClick={() => setReversingId(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 mb-6">
              <div className="flex items-center gap-3 text-red-600 mb-2">
                <AlertCircle size={20} />
                <span className="font-black">تنبيه محاسبي</span>
              </div>
              <p className="text-xs text-red-500 font-bold leading-relaxed">
                عكس القيد سيقوم بإنشاء حركة مالية مقابلة لتصفير هذا المبلغ وتعديل أرصدة الصناديق/البنوك. لا يمكن التراجع عن هذه الخطوة.
              </p>
            </div>

            <form onSubmit={handleReverse} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-black text-gray-700 mr-1">سبب العكس / الإلغاء</label>
                <textarea
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none font-bold"
                  rows={3}
                  placeholder="مثال: خطأ في إدخال المبلغ، تكرار السند..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-200 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'تأكيد عكس القيد الآن'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Voucher Print Preview */}
      {printingTransaction && (
        <VoucherPrint
          transaction={printingTransaction}
          settings={useApp().appSettings}
          medium={financialMedia.find(m => m.id === printingTransaction.mediumId)}
          member={members.find(m => m.id === printingTransaction.memberId)}
          onClose={() => setPrintingTransaction(null)}
        />
      )}
    </div>
  );
};

export default Finance;