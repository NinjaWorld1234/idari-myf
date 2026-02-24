import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Tag, Camera, User } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { TransactionType, TransactionDirection } from '../types';

interface ExpenseRecordingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ExpenseRecordingModal = ({ isOpen, onClose }: ExpenseRecordingModalProps) => {
    const { financialMedia, addTransaction, appSettings } = useApp();
    const [amount, setAmount] = useState<number>(0);
    const [mediumId, setMediumId] = useState('');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [payee, setPayee] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const categories = appSettings.expenseCategories || [];

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setAmount(0);
            setMediumId('');
            setCategory('');
            setDate(new Date().toISOString().split('T')[0]);
            setDescription('');
            setPayee('');
            setAttachment(null);
            setError('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !mediumId || !category) {
            setError('يرجى إكمال جميع الحقول المطلوبة');
            return;
        }

        setIsSubmitting(true);
        setError('');
        try {
            await addTransaction({
                type: TransactionType.EXPENSE,
                direction: TransactionDirection.OUT,
                amount,
                mediumId,
                date,
                description: payee ? `إلى: ${payee} - ${description}` : description,
                category: category,
                paymentMethod: financialMedia.find(m => m.id === mediumId)?.name || 'نقدي',
                attachmentUrl: attachment ? URL.createObjectURL(attachment) : undefined
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
                        <h2 className="text-xl font-black text-gray-800">تسجيل مصروف</h2>
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
                                <label className="text-sm font-black text-gray-700 block mr-1">المبلغ (₪)</label>
                                <input
                                    required
                                    type="number"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none font-black text-lg text-red-700"
                                    value={amount || ''}
                                    onChange={(e) => setAmount(parseFloat(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-black text-gray-700 block mr-1">التاريخ</label>
                                <input
                                    required
                                    type="date"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none font-bold"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-black text-gray-700 block mr-1">بند المصروف</label>
                            <div className="relative">
                                <Tag className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <select
                                    required
                                    className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none font-bold appearance-none"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                >
                                    <option value="">اختر البند...</option>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-black text-gray-700 block mr-1">الدفع من (الخزينة/البنك)</label>
                            <div className="grid grid-cols-2 gap-3">
                                {financialMedia.map(m => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        className={`p-3 rounded-2xl border-2 transition-all text-center ${mediumId === m.id
                                            ? 'border-red-500 bg-red-50 text-red-700'
                                            : 'border-gray-50 bg-gray-50 text-gray-500'
                                            }`}
                                        onClick={() => setMediumId(m.id)}
                                    >
                                        <p className="text-xs font-black">{m.name}</p>
                                        <p className="text-[10px] opacity-70" dir="ltr">₪ {m.balance.toLocaleString()}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-black text-gray-700 block mr-1 text-red-500">الجهة / المستفيد (اختياري)</label>
                            <div className="relative">
                                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none font-bold"
                                    placeholder="اسم الشخص أو الشركة"
                                    value={payee}
                                    onChange={(e) => setPayee(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-black text-gray-700 block mr-1 text-red-500">ملاحظات / البيان</label>
                            <textarea
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none font-bold"
                                rows={2}
                                placeholder="مثال: فاتورة كهرباء مقر الجمعية"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-black text-gray-700 block mr-1 text-red-500">إرفاق صورة المستند (اختياري)</label>
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 hover:bg-red-50 hover:border-red-300 transition-all cursor-pointer group">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Camera className="w-8 h-8 text-gray-400 group-hover:text-red-500 mb-1" />
                                    <p className="text-xs text-gray-500 group-hover:text-red-600 font-bold">
                                        {attachment ? attachment.name : 'اضغط للتصوير أو اختيار صورة'}
                                    </p>
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && setAttachment(e.target.files[0])} />
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="py-4 border-2 border-gray-100 text-gray-400 rounded-2xl font-black active:bg-gray-50 transition-all"
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle size={20} />
                                        تأكيد الصرف
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ExpenseRecordingModal;
