import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, ArrowRightLeft } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { TransactionType, TransactionDirection } from '../types';

interface TransferRecordingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TransferRecordingModal = ({ isOpen, onClose }: TransferRecordingModalProps) => {
    const { financialMedia, addTransaction } = useApp();
    const [amount, setAmount] = useState<number>('' as any);
    const [fromMediumId, setFromMediumId] = useState('');
    const [toMediumId, setToMediumId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');


    // Reset state when modal is opened
    useEffect(() => {
        if (isOpen) {
            setAmount('' as any);
            setFromMediumId('');
            setToMediumId('');
            setDate(new Date().toISOString().split('T')[0]);
            setDescription('');
            setError('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !fromMediumId || !toMediumId) {
            setError('يرجى إكمال جميع الحقول المطلوبة');
            return;
        }
        if (fromMediumId === toMediumId) {
            setError('لا يمكن التحويل من وإلى نفس الصندوق');
            return;
        }

        const fromMedium = financialMedia.find(m => m.id === fromMediumId);
        const toMedium = financialMedia.find(m => m.id === toMediumId);

        if (!fromMedium || !toMedium) return;

        if (fromMedium.balance < amount) {
            if (!window.confirm(`رصيد ${fromMedium.name} غير كافٍ. الرصيد الحالي: ${fromMedium.balance.toLocaleString()}. هل تريد الاستمرار بالسالب؟`)) {
                return;
            }
        }

        setIsSubmitting(true);
        setError('');
        try {
            // OUT transaction
            await addTransaction({
                type: TransactionType.TRANSFER,
                direction: TransactionDirection.OUT,
                amount: Number(amount),
                mediumId: fromMediumId,
                date,
                description: `تحويل صادر إلى [${toMedium.name}]: ${description}`,
                category: 'تحويلات داخلية',
                paymentMethod: 'تحويل داخلي'
            });

            // IN transaction
            await addTransaction({
                type: TransactionType.TRANSFER,
                direction: TransactionDirection.IN,
                amount: Number(amount),
                mediumId: toMediumId,
                date,
                description: `تحويل وارد من [${fromMedium.name}]: ${description}`,
                category: 'تحويلات داخلية',
                paymentMethod: 'تحويل داخلي'
            });

            onClose();
        } catch (err: any) {
            setError(err.message || 'حدث خطأ أثناء الحفظ');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-white rounded-t-[32px] md:rounded-[24px] shadow-2xl overflow-hidden animate-slide-up">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                            <ArrowRightLeft className="text-indigo-600" size={24} />
                            تحويل بين الصناديق
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={24} className="text-gray-400" />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 rounded-2xl flex items-center gap-3 text-red-600 border border-red-100 animate-shake">
                            <AlertCircle size={20} />
                            <p className="text-sm font-bold">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-black text-gray-700 block mx-1">من (المصدر) <span className="text-red-500">*</span></label>
                                <select
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                                    value={fromMediumId}
                                    onChange={(e) => setFromMediumId(e.target.value)}
                                >
                                    <option value="">اختر الصندوق...</option>
                                    {financialMedia.map(m => (
                                        <option key={m.id} value={m.id}>{m.name} ({m.balance.toLocaleString()})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-black text-gray-700 block mx-1">إلى (المستلم) <span className="text-red-500">*</span></label>
                                <select
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                                    value={toMediumId}
                                    onChange={(e) => setToMediumId(e.target.value)}
                                >
                                    <option value="">اختر الصندوق...</option>
                                    {financialMedia.map(m => (
                                        <option key={m.id} value={m.id}>{m.name} ({m.balance.toLocaleString()})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-black text-gray-700 block mx-1">المبلغ (شيكل) <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-center text-lg"
                                    value={amount}
                                    onChange={(e) => setAmount(Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-black text-gray-700 block mx-1">التاريخ <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-black text-gray-700 block mx-1">البيانات الإضافية (اختياري)</label>
                            <textarea
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold resize-none h-24"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="سبب التحويل أو ملاحظات..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full py-4 rounded-xl text-white font-black text-lg flex items-center justify-center gap-2 transition-all mt-4
                                ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'}`}
                        >
                            <CheckCircle size={22} />
                            {isSubmitting ? 'جاري الحفظ...' : 'حفظ التحويل'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TransferRecordingModal;
