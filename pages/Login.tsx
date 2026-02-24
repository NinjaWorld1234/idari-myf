import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const success = await login(email);
      if (success) {
        navigate('/');
      } else {
        setError('البريد الإلكتروني غير مسجل أو حدث خطأ في الاتصال');
      }
    } catch (err: any) {
      setError(err.message || 'فشل الاتصال بالخادم');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick login buttons
  const quickLogins = [
    { email: 'admin@myf.ps', label: 'أحمد', role: 'مدير' },
    { email: 'officer@myf.ps', label: 'خالد', role: 'مسؤول' },
    { email: 'accountant@myf.ps', label: 'سامي', role: 'محاسب' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-emerald-700 p-8 text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-emerald-700 font-bold text-3xl mx-auto mb-4 shadow-lg">
            م
          </div>
          <h1 className="text-2xl font-bold text-white">ملتقى الشباب المسلم</h1>
          <p className="text-emerald-100 mt-2">تسجيل الدخول للنظام الإداري</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="example@myf.ps"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
              <input
                type="password"
                disabled
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed"
                value="demo"
              />
              <p className="text-xs text-gray-400 mt-1">كلمة المرور معطلة في النسخة التجريبية</p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري الدخول...
                </>
              ) : 'دخول'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center mb-3">حسابات للتجربة:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickLogins.map(u => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => setEmail(u.email)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-700 transition-colors"
                >
                  {u.role} ({u.label.split(' ')[0]})
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;