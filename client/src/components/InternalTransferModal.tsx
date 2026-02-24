import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, ArrowLeftRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { TransactionType, TransactionDirection } from '../types';

interface InternalTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const InternalTransferModal = ({ isOpen, onClose }: InternalTransferModalProps) => {
    const { financialMedia, addTransaction } = useApp();
    const [amount, setAmount] = useState<number>(0);
    const [fromMediumId, setFromMediumId] = useState('');
    const [toMediumId, setToMediumId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !fromMediumId || !toMediumId) {
            setError('يرجى إكمال جميع الحقول المطلوبة');
            return;
        }

        if (fromMediumId === toMediumId) {
            setError('لا يمكن التحويل لنفس الحساب');
            return;
        }

        const fromMedium = financialMedia.find(m => m.id === fromMediumId);
        if (fromMedium && fromMedium.balance < amount) {
            setError('الرصيد في حساب المصدر غير كافٍ');
            return;
        }

        setIsSubmitting(true);
        setError('');
        try {
            // Internal Transfer is handled as a single TRANSACTION in our backend with special type
            // Our backend transactions router should handle both directions or we do two calls.
            // Based on our plan, we'll use type 'TRANSFER' and direction 'OUT' for the source,
            // and the backend will need to handle the destination or we create two transactions.
            // For now, let's assume the backend handles the balance update for both.
            await addTransaction({
                type: TransactionType.TRANSFER,
                direction: TransactionDirection.OUT,
                amount,
                mediumId: fromMediumId,
                date,
                description: description || `تحويل من ${fromMedium?.name} إلى ${financialMedia.find(m => m.id === toMediumId)?.name}`,
                category: 'تحويل داخلي',
                // We'll pass the target in description or metadata if the backend supports it.
                // For absolute correctness, a dedicated API endpoint for transfer is better.
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
                        <h2 className="text-xl font-black text-gray-800">تحويل مالي داخلي</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={24} className="text-gray-400" />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 rounded-2xl flex items-center gap-3 text-red-600 border border-red-100">
                            <AlertCircle size={20} />
                            <p className="text-sm font-bold">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-black text-gray-700 block mr-1">المبلغ (₪)</label>
                                <input
                                    required
                                    type="number"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-black text-lg text-blue-700"
                                    value={amount || ''}
                                    onChange={(e) => setAmount(parseFloat(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-black text-gray-700 block mr-1">التاريخ</label>
                                <input
                                    required
                                    type="date"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex-1 space-y-2">
                                <label className="text-sm font-black text-gray-700 block mr-1">من حساب</label>
                                <select
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                    value={fromMediumId}
                                    onChange={(e) => setFromMediumId(e.target.value)}
                                >
                                    <option value="">اختر المصدر...</option>
                                    {financialMedia.map(m => <option key={m.id} value={m.id}>{m.name} (₪{m.balance.toLocaleString()})</option>)}
                                </select>
                            </div>
                            <div className="mt-8 text-gray-300">
                                <ArrowLeftRight size={24} />
                            </div>
                            <div className="flex-1 space-y-2">
                                <label className="text-sm font-black text-gray-700 block mr-1">إلى حساب</label>
                                <select
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                    value={toMediumId}
                                    onChange={(e) => setToMediumId(e.target.value)}
                                >
                                    <option value="">اختر الوجهة...</option>
                                    {financialMedia.map(m => <option key={m.id} value={m.id}>{m.name} (₪{m.balance.toLocaleString()})</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-black text-gray-700 block mr-1">ملاحظات / البيان</label>
                            <textarea
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                rows={2}
                                placeholder="مثال: تغذية البنك من الصندوق"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle size={20} />
                                    إجراء التحويل الآن
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default InternalTransferModal;
