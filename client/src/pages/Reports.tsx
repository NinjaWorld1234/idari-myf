import React from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { TransactionDirection, TransactionType, UserRole, STATUS_LABELS, MEMBERSHIP_LABELS, TRANSACTION_TYPE_LABELS, DIRECTION_LABELS, MemberStatus, GENDER_LABELS } from '../types';
import { FileText, Download, Printer, AlertTriangle, TrendingUp, TrendingDown, Calendar, Users } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import PrintHeader from '../components/PrintHeader';

const Reports = () => {
  const { stats, transactions, members, appSettings } = useApp();
  const { user } = useAuth();

  const isManager = user?.role === UserRole.MANAGER;
  const isAccountant = user?.role === UserRole.ACCOUNTANT;
  const isOfficer = user?.role === UserRole.OFFICER;

  const canViewFinance = isManager || isAccountant;
  const canViewMembers = isManager || isOfficer || isAccountant; // Accountants can see member counts/lists

  const currentYear = new Date().getFullYear();

  // -- Financial Data Prep --
  const pieData = [
    { name: 'واردات', value: stats.totalIncome, color: '#059669' },
    { name: 'مصروفات', value: stats.totalExpense, color: '#dc2626' },
  ];

  const expenseCategories = transactions
    .filter(t => t.direction === TransactionDirection.OUT)
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const expenseData = Object.keys(expenseCategories).map(key => ({
    name: key,
    value: expenseCategories[key]
  })).sort((a, b) => b.value - a.value);

  // Prepare monthly data for the advanced chart
  const monthlyData = React.useMemo(() => {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const data = months.map(m => ({ name: m, income: 0, expense: 0 }));

    transactions.forEach(t => {
      const date = new Date(t.date);
      if (date.getFullYear() === currentYear) {
        const monthIdx = date.getMonth();
        if (t.direction === TransactionDirection.IN) {
          data[monthIdx].income += t.amount;
        } else {
          data[monthIdx].expense += t.amount;
        }
      }
    });
    return data;
  }, [transactions, currentYear]);


  // -- Member Data Prep --
  const memberStats = {
    active: members.filter(m => m.status === MemberStatus.ACTIVE).length,
    suspended: members.filter(m => m.status === MemberStatus.SUSPENDED).length,
    expired: members.filter(m => m.status === MemberStatus.EXPIRED).length,
  };

  const unpaidMembers = members.filter(m => {
    if (m.status === MemberStatus.EXPIRED) return false;
    const hasAnyPayment = transactions.some(t =>
      t.type === TransactionType.SUBSCRIPTION &&
      t.memberId === m.id
    );
    return !hasAnyPayment;
  });

  const handlePrint = () => {
    window.print();
  };

  // Export Finance
  const exportFinanceToCSV = () => {
    const headers = ['المعرف', 'التاريخ', 'النوع', 'البند', 'الوصف', 'المبلغ', 'الاتجاه', 'طريقة الدفع', 'بواسطة'];
    let csvContent = "\uFEFF" + headers.join(',') + '\n';
    transactions.forEach(t => {
      const row = [
        t.id,
        t.date,
        TRANSACTION_TYPE_LABELS[t.type],
        t.category,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        t.amount,
        DIRECTION_LABELS[t.direction],
        t.paymentMethod,
        t.createdBy
      ];
      csvContent += row.join(',') + '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `financial_report_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Members with all details
  const exportMembersToCSV = () => {
    // Determine all available columns including dynamic ones
    const baseHeaders = ['رقم العضوية', 'الاسم', 'رقم الهوية', 'الجنس', 'الهاتف', 'المدينة', 'نوع العضوية', 'مبلغ الاشتراك', 'تاريخ الانضمام', 'الحالة', 'إجمالي المدفوعات'];
    const dynamicHeaders: string[] = [];

    members.forEach(m => {
      if (m.additionalData) {
        Object.keys(m.additionalData).forEach(k => {
          if (!baseHeaders.includes(k) &&
            !dynamicHeaders.includes(k) &&
            !['الاسم الرباعي', 'رقم الهوية', 'رقم الهاتف'].includes(k) &&
            !k.includes('الشروط والسياسات')) {
            dynamicHeaders.push(k);
          }
        });
      }
    });

    const allHeaders = [...baseHeaders, ...dynamicHeaders];
    let csvContent = "\uFEFF" + allHeaders.join(',') + '\n';

    members.forEach(m => {
      const hasPaid = transactions.some(t =>
        t.type === TransactionType.SUBSCRIPTION &&
        t.memberId === m.id &&
        new Date(t.date).getFullYear() === currentYear
      );

      const row = allHeaders.map(header => {
        let val = '';
        if (header === 'رقم العضوية') val = m.memberCode;
        else if (header === 'الاسم') val = m.fullName;
        else if (header === 'رقم الهوية') val = m.nationalId || '';
        else if (header === 'الجنس') val = GENDER_LABELS[m.gender];
        else if (header === 'الهاتف') val = m.phone;
        else if (header === 'المدينة') val = m.city;
        else if (header === 'نوع العضوية') val = MEMBERSHIP_LABELS[m.membershipType];
        else if (header === 'مبلغ الاشتراك') val = `${m.monthlySubscription || 20} ₪`;
        else if (header === 'تاريخ الانضمام') val = m.joinDate;
        else if (header === 'الحالة') val = STATUS_LABELS[m.status];
        else if (header === 'إجمالي المدفوعات') {
          const total = transactions
            .filter(t => t.memberId === m.id && t.type === TransactionType.SUBSCRIPTION)
            .reduce((sum, t) => sum + t.amount, 0);
          val = `${total} ₪`;
        }
        else if (m.additionalData && m.additionalData[header]) val = m.additionalData[header];

        return `"${String(val).replace(/"/g, '""')}"`;
      });

      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `members_full_report_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 print:space-y-4 pb-10">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">التقارير</h1>
          <p className="text-gray-500 text-sm mt-1">ملخصات وبيانات قابلة للتصدير والطباعة</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handlePrint} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-bold">
            <Printer size={18} />
            طباعة التقارير
          </button>
        </div>
      </div>

      {/* Header for Print Only */}
      <PrintHeader title="التقرير الشامل" />

      {/* Financial Reports Section (Manager & Accountant ONLY) */}
      {canViewFinance && (
        <>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 print:shadow-none print:border-gray-300 page-break-inside-avoid">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText className="text-emerald-600" />
                تقرير الوضع المالي العام
              </h2>
              <button onClick={exportFinanceToCSV} className="flex items-center gap-2 text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-bold border border-emerald-200 print:hidden">
                <Download size={16} />
                تصدير الحركات المالية
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <table className="w-full text-right border-collapse">
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 text-gray-600">إجمالي الواردات</td>
                      <td className="py-3 font-bold text-emerald-600" dir="ltr">₪ {stats.totalIncome.toLocaleString()}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 text-gray-600">إجمالي المصروفات</td>
                      <td className="py-3 font-bold text-red-600" dir="ltr">₪ {stats.totalExpense.toLocaleString()}</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="py-3 px-2 font-bold text-gray-800">الرصيد الصافي</td>
                      <td className="py-3 px-2 font-bold text-gray-900" dir="ltr">₪ {stats.netBalance.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="h-48 flex items-center justify-center print:hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="middle" align="right" layout="vertical" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Advanced Analysis (Manager & Accountant) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 print:shadow-none print:border-gray-300 page-break-inside-avoid">
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <TrendingUp className="text-blue-600" />
              تحليل مالي متقدم
            </h2>

            {/* Monthly Chart */}
            <div className="mb-8 print:hidden">
              <h3 className="text-sm font-bold text-gray-600 mb-4 flex items-center gap-2"><Calendar size={16} /> الأداء الشهري للعام {currentYear}</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip cursor={{ fill: '#f3f4f6' }} />
                    <Legend />
                    <Bar dataKey="income" name="واردات" fill="#059669" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="مصروفات" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Expense Table */}
            <div>
              <h3 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2"><TrendingDown size={16} /> تفصيل المصروفات</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-2">البند</th>
                      <th className="px-4 py-2">القيمة</th>
                      <th className="px-4 py-2">النسبة</th>
                      <th className="px-4 py-2 print:hidden">الرسم البياني</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {expenseData.map((item) => {
                      const percent = stats.totalExpense > 0 ? (item.value / stats.totalExpense) * 100 : 0;
                      return (
                        <tr key={item.name}>
                          <td className="px-4 py-2 font-medium">{item.name}</td>
                          <td className="px-4 py-2 text-red-600" dir="ltr">₪ {item.value.toLocaleString()}</td>
                          <td className="px-4 py-2 text-gray-500" dir="ltr">{percent.toFixed(1)}%</td>
                          <td className="px-4 py-2 w-1/3 print:hidden">
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div className="bg-red-500 h-2 rounded-full" style={{ width: `${percent}%` }}></div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Membership Report (Manager & Officer ONLY) */}
      {canViewMembers && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 print:shadow-none print:border-gray-300 page-break-inside-avoid">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Users className="text-blue-600" />
              تقرير العضوية
            </h2>
            <button onClick={exportMembersToCSV} className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-bold border border-blue-200 print:hidden">
              <Download size={16} />
              تصدير بيانات الأعضاء (شامل)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-green-50 rounded-lg text-center border border-green-100 print:bg-white print:border-gray-200">
              <p className="text-sm text-green-800 font-medium print:text-black">عضو نشط</p>
              <p className="text-2xl font-bold text-green-700 print:text-black">{memberStats.active}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg text-center border border-red-100 print:bg-white print:border-gray-200">
              <p className="text-sm text-red-800 font-medium print:text-black">عضو موقوف</p>
              <p className="text-2xl font-bold text-red-700 print:text-black">{memberStats.suspended}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg text-center border border-gray-200 print:bg-white print:border-gray-200">
              <p className="text-sm text-gray-600 font-medium print:text-black">منتهية العضوية</p>
              <p className="text-2xl font-bold text-gray-700 print:text-black">{memberStats.expired}</p>
            </div>
          </div>

          <div className="overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={18} className="text-amber-500" />
              <h4 className="font-bold text-gray-700 text-sm">أعضاء لم يسددوا أي اشتراك مسبقاً:</h4>
            </div>

            {unpaidMembers.length === 0 ? (
              <div className="text-center py-6 bg-green-50 rounded-lg text-green-700 font-medium text-sm">
                جميع الأعضاء النشطين مسددين للاشتراكات!
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-gray-50 text-gray-600 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 border-b">الاسم</th>
                      <th className="px-4 py-3 border-b">رقم العضوية</th>
                      <th className="px-4 py-3 border-b">الهاتف</th>
                      <th className="px-4 py-3 border-b">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {unpaidMembers.map(m => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-800">{m.fullName}</td>
                        <td className="px-4 py-2 text-gray-600">{m.memberCode}</td>
                        <td className="px-4 py-2 text-gray-600" dir="ltr">{m.phone}</td>
                        <td className="px-4 py-2">
                          <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs font-bold print:text-black print:bg-transparent print:border print:border-gray-400">غير مسدد</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;