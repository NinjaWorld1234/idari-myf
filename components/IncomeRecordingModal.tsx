import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Camera } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { TransactionType, TransactionDirection } from '../types';

interface IncomeRecordingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const IncomeRecordingModal = ({ isOpen, onClose }: IncomeRecordingModalProps) => {
    const { financialMedia, addTransaction, appSettings } = useApp();
    const [amount, setAmount] = useState<number>('' as any); // Initialize empty
    const [mediumId, setMediumId] = useState('');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [payee, setPayee] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const categories = appSettings.incomeCategories || [];


    // Reset state when modal is opened
    useEffect(() => {
        if (isOpen) {
            setAmount('' as any);
            setMediumId('');
            setCategory('');
            setDate(new Date().toISOString().split('T')[0]);
            setDescription('');
            setPayee('');
            setError('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !mediumId || !category) {
            setError('يرجى إكمال الحقول الأساسية (المبلغ، الصندوق، التصنيف)');
            return;
        }

        setIsSubmitting(true);
        setError('');
        try {
            await addTransaction({
                type: TransactionType.DONATION,
                direction: TransactionDirection.IN,
                amount: Number(amount),
                mediumId,
                date,
                description: payee ? `من: ${payee} - ${description}` : description,
                category: category,
                paymentMethod: financialMedia.find(m => m.id === mediumId)?.name || 'نقدي',
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
                        <h2 className="text-xl font-black text-gray-800">تسجيل إيراد آخر</h2>
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
                                <label className="text-sm font-black text-gray-700 block mx-1">المبلغ (شيكل) <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-center text-lg"
                                    value={amount}
                                    onChange={(e) => setAmount(Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-black text-gray-700 block mx-1">التاريخ <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-black text-gray-700 block mx-1">التصنيف <span className="text-red-500">*</span></label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {categories.map(cat => (
                                    <button
                                        type="button"
                                        key={cat}
                                        onClick={() => setCategory(cat)}
                                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${category === cat
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                                            : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-black text-gray-700 block mx-1">إيداع في <span className="text-red-500">*</span></label>
                            <select
                                required
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                                value={mediumId}
                                onChange={(e) => setMediumId(e.target.value)}
                            >
                                <option value="">اختر الصندوق/البنك...</option>
                                {financialMedia.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-black text-gray-700 block mx-1">المصدر / المستلم منه (اختياري)</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                                value={payee}
                                onChange={(e) => setPayee(e.target.value)}
                                placeholder="مثال: فاعل خير، مؤسسة كذا..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-black text-gray-700 block mx-1">البيانات الإضافية (اختياري)</label>
                            <textarea
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold resize-none h-24"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="ملاحظات تفصيلية..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full py-4 rounded-xl text-white font-black text-lg flex items-center justify-center gap-2 transition-all mt-4
                                ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]'}`}
                        >
                            <CheckCircle size={22} />
                            {isSubmitting ? 'جاري الحفظ...' : 'حفظ وإصدار سند قبض'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default IncomeRecordingModal;
