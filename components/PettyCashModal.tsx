import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, User, Wallet, History, ArrowRightLeft } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { TransactionType, TransactionDirection, TransactionStatus } from '../types';

interface PettyCashModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PettyCashModal = ({ isOpen, onClose }: PettyCashModalProps) => {
    const { financialMedia, addTransaction, transactions } = useApp();
    const [mode, setMode] = useState<'DISBURSE' | 'SETTLE'>('DISBURSE');
    const [amount, setAmount] = useState<number>(0);
    const [mediumId, setMediumId] = useState('');
    const [employeeName, setEmployeeName] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // For settlement
    const [selectedPettyCashId, setSelectedPettyCashId] = useState('');
    const activePettyCashTxns = transactions.filter(t =>
        t.type === TransactionType.PETTY_CASH &&
        t.status === TransactionStatus.ACTIVE &&
        !transactions.some(st => st.reversalOfId === t.id) // Simplified check for settlement
    );

    // Reset state when modal is opened
    useEffect(() => {
        if (isOpen) {
            setMode('DISBURSE');
            setAmount(0);
            setMediumId('');
            setEmployeeName('');
            setDescription('');
            setDate(new Date().toISOString().split('T')[0]);
            setError('');
            setSelectedPettyCashId('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (mode === 'DISBURSE') {
            if (!amount || !mediumId || !employeeName) {
                setError('يرجى إكمال جميع الحقول المطلوبة');
                return;
            }

            setIsSubmitting(true);
            try {
                await addTransaction({
                    type: TransactionType.PETTY_CASH,
                    direction: TransactionDirection.OUT,
                    amount,
                    mediumId,
                    date,
                    description: `عهدة للموظف: ${employeeName} - ${description}`,
                    category: 'عهد مالية',
                    paymentMethod: financialMedia.find(m => m.id === mediumId)?.name || 'نقدي'
                });
                onClose();
            } catch (err: any) {
                setError(err.message || 'حدث خطأ');
            } finally {
                setIsSubmitting(false);
            }
        } else {
            // Settle Logic (Simplified: Return balance or record as expense)
            if (!selectedPettyCashId || !amount) {
                setError('يرجى اختيار العهدة وإدخال المبلغ الفعلي المنفق');
                return;
            }

            const original = transactions.find(t => t.id === selectedPettyCashId);
            if (!original) return;

            setIsSubmitting(true);
            try {
                // 1. Record the settlement (Internal reversal or offset)
                // In this simplified version, we just record a "Petty Cash Settlement" 
                // that returns the internal balance to the medium
                await addTransaction({
                    type: TransactionType.PETTY_CASH_SETTLEMENT,
                    direction: TransactionDirection.IN,
                    amount: original.amount,
                    mediumId: original.mediumId,
                    date,
                    description: `تسوية كاملة للعهدة ${original.voucherNumber}. المبلغ المنفق فعلياً: ${amount}`,
                    category: 'تسوية عهد'
                });

                // 2. record actual expense if needed
                await addTransaction({
                    type: TransactionType.EXPENSE,
                    direction: TransactionDirection.OUT,
                    amount: amount,
                    mediumId: original.mediumId,
                    date,
                    description: `مصروف من عهدة ${original.voucherNumber}: ${description}`,
                    category: 'مصروفات عهد'
                });

                onClose();
            } catch (err: any) {
                setError(err.message || 'حدث خطأ');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-white rounded-t-[32px] md:rounded-[24px] shadow-2xl overflow-hidden animate-slide-up">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
                            <button
                                onClick={() => setMode('DISBURSE')}
                                className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${mode === 'DISBURSE' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400'}`}
                            >صرف عهدة</button>
                            <button
                                onClick={() => setMode('SETTLE')}
                                className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${mode === 'SETTLE' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}
                            >تسوية عهدة</button>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                            <X size={24} className="text-gray-400" />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'DISBURSE' ? (
                            <>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-500 mr-1 uppercase tracking-wider block">اسم الموظف / المستلم</label>
                                    <div className="relative">
                                        <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            required
                                            className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none font-black"
                                            placeholder="أدخل اسم الموظف..."
                                            value={employeeName}
                                            onChange={e => setEmployeeName(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-500 mr-1 uppercase block">المبلغ (₪)</label>
                                        <input
                                            required
                                            type="number"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none font-black text-lg text-purple-700"
                                            value={amount || ''}
                                            onChange={e => setAmount(parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-500 mr-1 uppercase block">التاريخ</label>
                                        <input
                                            required
                                            type="date"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none font-bold text-sm"
                                            value={date}
                                            onChange={e => setDate(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-500 mr-1 uppercase block">الصرف من</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {financialMedia.map(m => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                className={`p-3 rounded-2xl border-2 transition-all text-center ${mediumId === m.id ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-50 bg-gray-50 text-gray-500'}`}
                                                onClick={() => setMediumId(m.id)}
                                            >
                                                <p className="text-xs font-black">{m.name}</p>
                                                <p className="text-[10px] opacity-70">₪ {m.balance.toLocaleString()}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-500 mr-1 uppercase block">اختر العهدة المفتوحة</label>
                                    <select
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                                        value={selectedPettyCashId}
                                        onChange={e => setSelectedPettyCashId(e.target.value)}
                                    >
                                        <option value="">اختر من القائمة...</option>
                                        {activePettyCashTxns.map(t => (
                                            <option key={t.id} value={t.id}>{t.voucherNumber} - {t.description} (₪ {t.amount})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-500 mr-1 uppercase block">المبلغ المنفق فعلياً (₪)</label>
                                    <input
                                        required
                                        type="number"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-black text-lg text-emerald-700"
                                        value={amount || ''}
                                        onChange={e => setAmount(parseFloat(e.target.value))}
                                    />
                                    <p className="text-[10px] text-gray-400 font-bold pr-1">سيتم إرجاع الفرق إلى الصندوق تلقائياً.</p>
                                </div>
                            </>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-500 mr-1 uppercase block">ملاحظات البيان</label>
                            <textarea
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-gray-300 outline-none font-bold text-sm"
                                rows={2}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full py-4 rounded-2xl font-black shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${mode === 'DISBURSE' ? 'bg-purple-600 shadow-purple-100 text-white' : 'bg-emerald-600 shadow-emerald-100 text-white'}`}
                        >
                            {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CheckCircle size={20} /> حفظ العملية</>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PettyCashModal;
