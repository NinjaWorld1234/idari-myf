import { Member, Transaction, DashboardStats, TransactionDirection, MemberStatus } from '../types';
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { appSettings } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login(email);
      navigate('/');
    } catch (e: any) {
      setError(e.message || 'فشل تسجيل الدخول. يرجى التأكد من البريد الإلكتروني.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-emerald-700 p-8 text-center">
          {appSettings.logoUrl ? (
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg p-2">
              <img src={appSettings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-emerald-700 font-bold text-3xl mx-auto mb-4 shadow-lg">
              م
            </div>
          )}
          <h1 className="text-2xl font-bold text-white">{appSettings.organizationName || 'ملتقى الشباب المسلم'}</h1>
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
                value="password123"
              />
              <p className="text-xs text-gray-400 mt-1">كلمة المرور معطلة في النسخة التجريبية</p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'جاري التحميل...' : 'دخول'}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
};

export default Login;