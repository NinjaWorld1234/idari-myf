import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { Transaction, TransactionType, TransactionDirection, UserRole, TransactionStatus } from '../types';
import { Plus, Printer, Download, Search, FileText, RotateCcw, AlertCircle, X, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import PrintHeader from '../components/PrintHeader';
import VoucherPrint from '../components/VoucherPrint';
import { exportToCSV } from '../utils';

const Finance = () => {
  const { transactions, reverseTransaction, members, appSettings, financialMedia } = useApp();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterMedium, setFilterMedium] = useState<string>('ALL');
  const [printingTransaction, setPrintingTransaction] = useState<Transaction | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Reversal Modal State
  const [reversingTransaction, setReversingTransaction] = useState<{ id: string, voucherNum: string } | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // Access Control: Officers cannot access this page.
  if (user?.role === 'مسؤول') {
    return <div className="p-10 text-center font-bold text-red-600">غير مصرح لك بدخول قسم المالية</div>;
  }

  const filteredTransactions = transactions.filter(t => {
    const searchString = `${t.category} ${t.description} ${t.voucherNumber}`.toLowerCase();
    const matchSearch = searchString.includes(searchTerm.toLowerCase());
    const matchType = filterType === 'ALL' || t.type === filterType;
    const matchMedium = filterMedium === 'ALL' || t.mediumId === filterMedium;
    return matchSearch && matchType && matchMedium;
  });

  const handleReverseConfirm = () => {
    if (!reversingTransaction) return;
    if (!reversalReason.trim()) {
      window.alert('سبب عكس العملية مطلوب لإتمام الإجراء.');
      return;
    }
    reverseTransaction(reversingTransaction.id, reversalReason.trim());
    setReversingTransaction(null);
    setReversalReason('');
  };

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">العمليات المالية</h1>
          <p className="text-gray-500 text-sm font-bold">إدارة القبض والصرف والتدقيق</p>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="بحث برقم السند، البيان..."
            className="w-full pr-12 pl-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <select
            className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold outline-none shadow-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="ALL">جميع الأنواع</option>
            {Object.values(TransactionType).map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          <select
            className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold outline-none shadow-sm"
            value={filterMedium}
            onChange={(e) => setFilterMedium(e.target.value)}
          >
            <option value="ALL">جميع الوسائل</option>
            {financialMedia.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      {/* List - Cards for mobile, Table hidden */}
      <div className="space-y-4">
        {filteredTransactions.map(t => (
          <div
            key={t.id}
            onClick={() => setSelectedTransaction(t)}
            className={`bg-white p-5 rounded-3xl shadow-sm border border-gray-50 flex flex-col gap-3 active:scale-[0.98] transition-all ${t.status === TransactionStatus.REVERSED ? 'opacity-50 grayscale border-red-100' : ''}`}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${t.direction === 'وارد' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {t.direction === 'وارد' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold">{t.date}</p>
                  <h4 className="font-black text-gray-800 text-sm">{t.voucherNumber || 'سند داخلي'}</h4>
                </div>
              </div>
              <div className="text-left">
                <p className={`font-black text-lg ${t.direction === 'وارد' ? 'text-emerald-700' : 'text-red-700'}`} dir="ltr">
                  {t.direction === 'وارد' ? '+' : '-'} {t.amount.toLocaleString()}
                </p>
                <p className="text-[10px] text-gray-400 font-bold">{t.category}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 font-bold truncate">{t.description}</p>
            {t.status === TransactionStatus.REVERSED && (
              <div className="mt-1 px-3 py-1 bg-red-50 text-red-600 text-[10px] font-black rounded-lg w-max flex items-center gap-1">
                <RotateCcw size={10} /> تم عكسها
              </div>
            )}
          </div>
        ))}
        {filteredTransactions.length === 0 && (
          <div className="bg-gray-50 p-12 rounded-3xl text-center border-2 border-dashed border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
              <Search size={32} />
            </div>
            <p className="text-gray-400 font-black">لا توجد حركات مطابقة للبحث</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedTransaction(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-t-[32px] md:rounded-[24px] shadow-2xl overflow-hidden p-6 animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-gray-800">تفاصيل الحركة</h2>
              <button onClick={() => setSelectedTransaction(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={24} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                <div>
                  <p className="text-xs text-gray-400 font-bold tracking-tight mb-1 uppercase">رقم السند</p>
                  <p className="font-black text-lg text-gray-800 tracking-wider">#{selectedTransaction.voucherNumber || '---'}</p>
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-400 font-bold mb-1">المبلغ</p>
                  <p className={`text-2xl font-black ${selectedTransaction.direction === 'وارد' ? 'text-emerald-600' : 'text-red-600'}`} dir="ltr">
                    ₪ {selectedTransaction.amount.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <DetailRow label="التاريخ" value={selectedTransaction.date} />
                <DetailRow label="التصنيف" value={selectedTransaction.category} />
                <DetailRow label="الوسيلة" value={financialMedia.find(m => m.id === selectedTransaction.mediumId)?.name || '---'} />
                <DetailRow label="بواسطة" value={selectedTransaction.createdBy || 'النظام'} />
              </div>

              <div className="space-y-2">
                <p className="text-xs text-gray-400 font-bold">البيان / الملاحظات</p>
                <div className="p-4 bg-gray-50 rounded-2xl font-bold text-gray-800 text-sm italic border-r-4 border-emerald-500">
                  {selectedTransaction.description || 'لا يوجد ملاحظات'}
                </div>
              </div>

              {selectedTransaction.attachmentUrl && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-bold">المرفق (إيصال)</p>
                  <img src={selectedTransaction.attachmentUrl} alt="Voucher Attachment" className="w-full h-40 object-cover rounded-2xl border-2 border-gray-100" />
                </div>
              )}

              {selectedTransaction.status === TransactionStatus.REVERSED && (
                <div className="p-4 bg-red-50 rounded-2xl border border-red-100 space-y-2">
                  <div className="flex items-center gap-2 text-red-600 font-black text-sm">
                    <RotateCcw size={16} /> عملية معكوسة
                  </div>
                  <p className="text-xs text-red-500 font-bold">سبب العكس: {selectedTransaction.reversalReason || 'غير محدد'}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2">
                <button
                  onClick={() => { setPrintingTransaction(selectedTransaction); setSelectedTransaction(null); }}
                  className="flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-2xl font-black active:scale-95 transition-all"
                >
                  <Printer size={18} /> طباعة السند
                </button>
                {selectedTransaction.status !== TransactionStatus.REVERSED && selectedTransaction.type !== TransactionType.REVERSAL && (
                  <button
                    onClick={() => {
                      setReversingTransaction({ id: selectedTransaction.id, voucherNum: selectedTransaction.voucherNumber || '' });
                      setReversalReason('');
                      setSelectedTransaction(null);
                    }}
                    className="flex items-center justify-center gap-2 py-4 bg-orange-50 text-orange-600 border-2 border-orange-100 rounded-2xl font-black active:scale-95 transition-all"
                  >
                    <RotateCcw size={18} /> عكس الحركة
                  </button>
                )}
                {selectedTransaction.type === TransactionType.REVERSAL && (
                  <div className="flex items-center justify-center gap-2 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold text-sm">
                    <AlertCircle size={16} /> قيد عكسي (لا يمكن عكسه)
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {printingTransaction && (
        <VoucherPrint
          transaction={printingTransaction}
          settings={appSettings}
          medium={financialMedia.find(m => m.id === printingTransaction.mediumId)}
          member={members.find(m => m.id === printingTransaction.memberId)}
          onClose={() => setPrintingTransaction(null)}
        />
      )}

      {/* Reversal Modal */}
      {reversingTransaction && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setReversingTransaction(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-[24px] shadow-2xl p-6 overflow-hidden animate-slide-up">
            <h3 className="text-xl font-black text-gray-800 mb-2">تأكيد عكس العملية</h3>
            <p className="text-sm font-bold text-gray-500 mb-6">
              سند رقم: {reversingTransaction.voucherNum}
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-black text-gray-700 block mb-2">سبب الإلغاء/العكس (إجباري) <span className="text-red-500">*</span></label>
                <textarea
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none font-bold resize-none"
                  rows={3}
                  placeholder="أدخل سبب عكس هذه العملية بوضوح..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setReversingTransaction(null)}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-600 font-bold rounded-xl active:bg-gray-200 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleReverseConfirm}
                  disabled={!reversalReason.trim()}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-colors ${reversalReason.trim() ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-200 text-red-400 cursor-not-allowed'
                    }`}
                >
                  <RotateCcw size={18} />
                  تأكيد العكس
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[10px] text-gray-400 font-bold mb-0.5">{label}</p>
    <p className="text-sm font-black text-gray-700">{value}</p>
  </div>
);

export default Finance;