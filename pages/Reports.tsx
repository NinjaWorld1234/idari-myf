import React from 'react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { TransactionDirection, TransactionType, UserRole } from '../types';
import { FileText, Download, Printer, TrendingUp, TrendingDown, Calendar, Users, History, Wallet as WalletIcon, CheckCircle2, XCircle, User as UserIcon, ListChecks } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import PrintHeader from '../components/PrintHeader';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports = () => {
  const { stats, transactions, members, appSettings, financialMedia } = useApp();
  const { user, usersList } = useAuth();

  // Filter States
  const [finDateFrom, setFinDateFrom] = React.useState('');
  const [finDateTo, setFinDateTo] = React.useState('');
  const [finMedium, setFinMedium] = React.useState('all');
  const [finType, setFinType] = React.useState('all');

  const [memSearch, setMemSearch] = React.useState('');
  const [memStatus, setMemStatus] = React.useState('all');

  const [printingSection, setPrintingSection] = React.useState<string | null>(null);

  const isManager = user?.role === UserRole.MANAGER;
  const isAccountant = user?.role === UserRole.ACCOUNTANT;
  const isOfficer = user?.role === UserRole.OFFICER;

  const canViewFinance = isManager || isAccountant;
  const canViewMembers = isManager || isOfficer || isAccountant;

  const currentYear = new Date().getFullYear();

  // Filtered Data Logic
  const filteredTransactions = React.useMemo(() => {
    return transactions.filter(t => {
      // Exclude reversed and reversal transactions from standard reports
      if (t.status === 'REVERSED' || t.type === TransactionType.REVERSAL) return false;

      const dateMatch = (!finDateFrom || t.date >= finDateFrom) && (!finDateTo || t.date <= finDateTo);
      const mediumMatch = finMedium === 'all' || t.mediumId === finMedium;
      const typeMatch = finType === 'all' || t.type === finType || (finType === 'IN' && t.direction === TransactionDirection.IN) || (finType === 'OUT' && t.direction === TransactionDirection.OUT);
      return dateMatch && mediumMatch && typeMatch;
    });
  }, [transactions, finDateFrom, finDateTo, finMedium, finType]);

  const filteredMembers = React.useMemo(() => {
    return members.filter(m => {
      const searchMatch = !memSearch || m.fullName.includes(memSearch) || m.memberCode.includes(memSearch);
      if (memStatus === 'all') return searchMatch;

      // Status logic (needs debt calc)
      const memberTransactions = transactions.filter(t => t.memberId === m.id && t.type === TransactionType.SUBSCRIPTION && t.status !== 'REVERSED');
      const totalPaid = memberTransactions.reduce((sum, t) => sum + t.amount, 0);

      const joinDate = m.joinDate ? new Date(m.joinDate) : new Date();
      const validJoinDate = !isNaN(joinDate.getTime()) ? joinDate : new Date();
      const totalExpectedMonths = (currentYear - validJoinDate.getFullYear()) * 12 + (new Date().getMonth() - validJoinDate.getMonth() + 1);
      const subAmount = m.monthlySubscription || 0;
      const totalExpected = subAmount * Math.max(0, totalExpectedMonths);
      const isPaid = (totalExpected - totalPaid) <= 0;

      if (memStatus === 'paid') return searchMatch && isPaid;
      if (memStatus === 'debt') return searchMatch && !isPaid;
      return searchMatch;
    });
  }, [members, memSearch, memStatus, transactions, currentYear]);

  // Helper to get user display info (Name + Role)
  const getUserDisplay = (emailOrId: string) => {
    const found = usersList.find(u => u.email === emailOrId || u.id === emailOrId);
    if (found) return `${found.name} (${found.role})`;
    return emailOrId;
  };

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

  const handlePrintAll = () => {
    setPrintingSection(null);
    setTimeout(() => window.print(), 100);
  };

  const handlePrintSection = (id: string) => {
    setPrintingSection(id);
    setTimeout(() => {
      window.print();
      setPrintingSection(null);
    }, 100);
  };

  // Export to Excel Helper
  const exportToExcel = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportFinanceExcel = () => {
    const data = filteredTransactions.map(t => ({
      'المعرف': t.id,
      'التاريخ': t.date,
      'البند': t.category,
      'الوصف': t.description || '',
      'المبلغ': t.amount,
      'الاتجاه': t.direction === TransactionDirection.IN ? 'وارد' : 'صادر',
      'الوسيلة الماليّة': financialMedia.find(m => m.id === t.mediumId)?.name || '',
      'بواسطة': getUserDisplay(t.createdBy)
    }));
    exportToExcel(data, `financial_report_filtered_${new Date().toISOString().slice(0, 10)}`);
  };

  const exportMembersExcel = () => {
    const data = filteredMembers.map(m => {
      const memberTransactions = transactions.filter(t => t.memberId === m.id && t.type === TransactionType.SUBSCRIPTION && t.status !== 'REVERSED');
      const totalPaid = memberTransactions.reduce((sum, t) => sum + t.amount, 0);

      const extraData: Record<string, any> = {};
      appSettings.memberFields?.filter(f => f.group === 'extra').forEach(f => {
        extraData[f.label] = m.additionalData?.[f.key] || '';
      });

      return {
        'رقم العضوية': m.memberCode,
        'الاسم': m.fullName,
        'رقم الهوية': m.nationalId || '',
        'الهاتف': m.phone,
        'نوع العضوية': m.membershipType,
        'الحالة': m.status,
        'الاشتراك الشهري': m.monthlySubscription,
        'إجمالي المدفوع': totalPaid,
        ...extraData
      };
    });
    exportToExcel(data, `members_report_filtered_${new Date().toISOString().slice(0, 10)}`);
  };

  // ===== TEXT-BASED PDF EXPORT (jspdf-autotable) =====
  // Uses Amiri Arabic font for proper RTL text rendering
  const exportToPDF = async (_elementId: string, fileName: string) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const orgName = appSettings.organizationName || 'ملتقى الشباب المسلم';
    const dateStr = new Date().toISOString().slice(0, 10);

    // Load and register Arabic font (Regular + Bold)
    try {
      const loadFont = async (url: string, vfsName: string, fontFamily: string, style: string) => {
        const resp = await fetch(url);
        const buf = await resp.arrayBuffer();
        const b64 = btoa(new Uint8Array(buf).reduce((d, b) => d + String.fromCharCode(b), ''));
        pdf.addFileToVFS(vfsName, b64);
        pdf.addFont(vfsName, fontFamily, style);
      };
      await loadFont('/fonts/Amiri-Regular.ttf', 'Amiri-Regular.ttf', 'Amiri', 'normal');
      await loadFont('/fonts/Amiri-Bold.ttf', 'Amiri-Bold.ttf', 'Amiri', 'bold');
      pdf.setFont('Amiri');
    } catch (e) {
      console.warn('Could not load Arabic font, falling back to default', e);
    }

    // Header
    pdf.setFontSize(16);
    pdf.text(orgName, pageWidth / 2, 15, { align: 'center' });
    pdf.setFontSize(10);
    pdf.text(`تاريخ التقرير: ${dateStr}`, pageWidth / 2, 22, { align: 'center' });

    const fontName = 'Amiri';

    if (fileName.includes('finance')) {
      // === FINANCE PDF ===
      pdf.setFontSize(13);
      pdf.text('التقرير المالي', pageWidth / 2, 30, { align: 'center' });

      const income = filteredTransactions.filter(t => t.direction === TransactionDirection.IN).reduce((s, t) => s + t.amount, 0);
      const expense = filteredTransactions.filter(t => t.direction === TransactionDirection.OUT).reduce((s, t) => s + t.amount, 0);

      // Summary table
      autoTable(pdf, {
        startY: 35,
        head: [['البند', 'المبلغ (₪)']],
        body: [
          ['إجمالي الواردات', income.toLocaleString()],
          ['إجمالي المصروفات', expense.toLocaleString()],
          ['الرصيد الصافي', (income - expense).toLocaleString()],
        ],
        styles: { font: fontName, halign: 'right', fontSize: 10 },
        headStyles: { fillColor: [5, 150, 105], halign: 'right' },
        theme: 'grid',
        tableWidth: 'auto',
        margin: { right: 14, left: 14 },
      });

      // Transactions table
      const txRows = filteredTransactions.map(t => [
        t.date,
        t.category,
        t.description || '-',
        t.amount.toLocaleString(),
        t.direction === TransactionDirection.IN ? 'وارد' : 'صادر',
        financialMedia.find(m => m.id === t.mediumId)?.name || '-',
      ]);

      autoTable(pdf, {
        startY: (pdf as any).lastAutoTable?.finalY + 10 || 70,
        head: [['التاريخ', 'البند', 'الوصف', 'المبلغ', 'الاتجاه', 'الوسيلة']],
        body: txRows,
        styles: { font: fontName, halign: 'right', fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [5, 150, 105], halign: 'right', fontSize: 9 },
        theme: 'grid',
        margin: { right: 14, left: 14 },
      });

    } else {
      // === MEMBERS PDF ===
      pdf.setFontSize(13);
      pdf.text('تقرير المديونية وعضوية الأعضاء', pageWidth / 2, 30, { align: 'center' });
      pdf.setFontSize(9);
      pdf.text(`عدد الأعضاء: ${filteredMembers.length}`, pageWidth / 2, 36, { align: 'center' });

      const memberRows = filteredMembers.map(m => {
        const memberTxns = transactions.filter(t => t.memberId === m.id && t.type === TransactionType.SUBSCRIPTION && t.status !== 'REVERSED');
        const totalPaid = memberTxns.reduce((s, t) => s + t.amount, 0);
        const joinDate = m.joinDate ? new Date(m.joinDate) : new Date();
        const validJoinDate = !isNaN(joinDate.getTime()) ? joinDate : new Date();
        const totalMonths = (currentYear - validJoinDate.getFullYear()) * 12 + (new Date().getMonth() - validJoinDate.getMonth() + 1);
        const subAmount = m.monthlySubscription || 0;
        const totalExpected = subAmount * Math.max(0, totalMonths);
        const totalDebt = Math.max(0, totalExpected - totalPaid);

        return [
          m.fullName,
          m.memberCode,
          m.nationalId || '-',
          m.phone || '-',
          m.job || '-',
          `${subAmount}`,
          totalPaid.toLocaleString(),
          totalDebt.toLocaleString(),
          totalDebt === 0 ? 'مسدد' : 'مدين',
        ];
      });

      autoTable(pdf, {
        startY: 40,
        head: [['الاسم', 'الكود', 'الهوية', 'الهاتف', 'الوظيفة', 'الاشتراك', 'المدفوع', 'الدين', 'الحالة']],
        body: memberRows,
        styles: { font: fontName, halign: 'right', fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [37, 99, 235], halign: 'right', fontSize: 8 },
        theme: 'grid',
        margin: { right: 10, left: 10 },
        columnStyles: {
          0: { cellWidth: 30 }, // Name
          8: { cellWidth: 14 }, // Status
        },
      });
    }

    // Footer on all pages
    pdf.setFont(fontName);
    const pageCount = (pdf as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(7);
      pdf.text(`${orgName} - ${dateStr} - صفحة ${i} من ${pageCount}`, pageWidth / 2, pdf.internal.pageSize.getHeight() - 5, { align: 'center' });
    }

    pdf.save(`${fileName}_${dateStr}.pdf`);
  };

  const expenseCategories = React.useMemo(() => {
    return filteredTransactions
      .filter(t => t.direction === TransactionDirection.OUT)
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);
  }, [filteredTransactions]);

  const expenseData = React.useMemo(() => {
    return Object.keys(expenseCategories).map(key => ({
      name: key,
      value: expenseCategories[key]
    })).sort((a, b) => b.value - a.value);
  }, [expenseCategories]);

  return (
    <div className="space-y-8 print:space-y-4 pb-10">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">التقارير المخصصة</h1>
          <p className="text-gray-500 text-sm mt-1">فلترة البيانات، طباعة أقسام محددة، وتصدير Excel</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handlePrintAll} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-bold">
            <Printer size={18} />
            طباعة شاملة
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; font-family: 'Arial', sans-serif !important; }
          .no-print { display: none !important; }
          ${printingSection ? `.printable-section:not(#${printingSection}) { display: none !important; }` : ''}
          .printable-section { 
            width: 100% !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            border: none !important;
            box-shadow: none !important;
          }
          table { 
            width: 100% !important; 
            border-collapse: collapse !important; 
            table-layout: auto !important;
            font-size: 9pt !important;
            border: 1.5pt solid #000 !important;
          }
          th, td { 
            border: 0.5pt solid #000 !important; 
            padding: 3pt 5pt !important; 
            color: #000 !important;
            background: #fff !important;
          }
          th { background: #eee !important; font-weight: bold !important; }
          thead { display: table-header-group !important; }
          tr { page-break-inside: avoid !important; }
          h1, h2, h3, h4 { color: #000 !important; margin-bottom: 3mm !important; }
        }
      `}</style>

      {/* Header for Print Only */}
      <PrintHeader title="التقرير المالي والإداري" />

      {/* Financial Reports Section */}
      {canViewFinance && (
        <div className="space-y-8">
          <div id="finance-summary" className="printable-section bg-white p-6 rounded-xl shadow-sm border border-gray-100 print:shadow-none print:border-gray-300 page-break-inside-avoid">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText className="text-emerald-600" />
                ملخص الوضع المالي (الفترة المختارة)
              </h2>
              <div className="flex gap-2 no-print">
                <button onClick={() => handlePrintSection('finance-summary')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors" title="طباعة الملخص">
                  <Printer size={18} />
                </button>
                <button onClick={exportFinanceExcel} className="flex items-center gap-2 text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-bold border border-emerald-200">
                  <Download size={16} />
                  Excel
                </button>
                <button onClick={() => exportToPDF('finance-summary', 'finance_summary')} className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-bold border border-red-200">
                  <FileText size={16} />
                  PDF
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <table className="w-full text-right border-collapse">
                  <tbody>
                    {(() => {
                      const income = filteredTransactions.filter(t => t.direction === TransactionDirection.IN).reduce((sum, t) => sum + t.amount, 0);
                      const expense = filteredTransactions.filter(t => t.direction === TransactionDirection.OUT).reduce((sum, t) => sum + t.amount, 0);
                      return (
                        <>
                          <tr className="border-b border-gray-100">
                            <td className="py-3 text-gray-600">إجمالي الواردات المفلترة</td>
                            <td className="py-3 font-bold text-emerald-600" dir="ltr">₪ {income.toLocaleString()}</td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td className="py-3 text-gray-600">إجمالي المصروفات المفلترة</td>
                            <td className="py-3 font-bold text-red-600" dir="ltr">₪ {expense.toLocaleString()}</td>
                          </tr>
                          <tr className="bg-gray-50 font-black text-lg">
                            <td className="py-3 px-2 text-gray-800">الرصيد الصافي للفترة</td>
                            <td className="py-3 px-2 text-gray-900" dir="ltr">₪ {(income - expense).toLocaleString()}</td>
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
              <div className="h-48 flex items-center justify-center print:hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'واردات', value: filteredTransactions.filter(t => t.direction === TransactionDirection.IN).reduce((sum, t) => sum + t.amount, 0) },
                        { name: 'مصروفات', value: filteredTransactions.filter(t => t.direction === TransactionDirection.OUT).reduce((sum, t) => sum + t.amount, 0) }
                      ]}
                      cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value"
                    >
                      <Cell fill="#059669" />
                      <Cell fill="#dc2626" />
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="middle" align="right" layout="vertical" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div id="financial-analysis" className="printable-section bg-white p-6 rounded-xl shadow-sm border border-gray-100 print:shadow-none print:border-gray-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp className="text-blue-600" />
                تحليل مالي متقدم وفلاتر
              </h2>
              <div className="no-print">
                <button onClick={() => handlePrintSection('financial-analysis')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors" title="طباعة هذا التحليل">
                  <Printer size={18} />
                </button>
              </div>
            </div>

            {/* Finance Filters Toolbar */}
            <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 p-5 rounded-2xl border border-gray-200 no-print">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">من تاريخ</label>
                <input type="date" value={finDateFrom} onChange={(e) => setFinDateFrom(e.target.value)} className="w-full text-sm border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">إلى تاريخ</label>
                <input type="date" value={finDateTo} onChange={(e) => setFinDateTo(e.target.value)} className="w-full text-sm border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">الوسيلة المالية</label>
                <select value={finMedium} onChange={(e) => setFinMedium(e.target.value)} className="w-full text-sm border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500">
                  <option value="all">كل الوسائل</option>
                  {financialMedia.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600">نوع الحركة</label>
                <select value={finType} onChange={(e) => setFinType(e.target.value)} className="w-full text-sm border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500">
                  <option value="all">الكل</option>
                  <option value="IN">الواردات (إجمالي)</option>
                  <option value="OUT">المصروفات (إجمالي)</option>
                  <option value={TransactionType.SUBSCRIPTION}>اشتراكات الأعضاء</option>
                  <option value={TransactionType.DONATION}>تبرعات وإيرادات</option>
                  <option value={TransactionType.EXPENSE}>مصاريف تشغيلية</option>
                </select>
              </div>
            </div>

            {/* Monthly Chart */}
            <div className="mb-10 print:hidden">
              <h3 className="text-sm font-bold text-gray-600 mb-4 flex items-center gap-2"><Calendar size={16} /> الأداء الشهري للعام الحالي</h3>
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

            {/* Expense Breakdown */}
            <div className="mb-10 printable-section">
              <h3 className="text-sm font-bold text-gray-600 mb-4 flex items-center gap-2"><TrendingDown size={16} /> المصروفات حسب البند للفترة المختارة</h3>
              <div className="overflow-x-auto border border-gray-100 rounded-xl print:overflow-visible print:shadow-none print:border-none">
                <table className="w-full text-right text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-5 py-3 border-l">البند</th>
                      <th className="px-5 py-3 border-l">القيمة</th>
                      <th className="px-5 py-3 border-l">النسبة</th>
                      <th className="px-5 py-3 print:hidden">بيان مرئي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {expenseData.length > 0 ? expenseData.map((item) => {
                      const totalE = filteredTransactions.filter(t => t.direction === TransactionDirection.OUT).reduce((sum, t) => sum + t.amount, 0);
                      const percent = totalE > 0 ? (item.value / totalE) * 100 : 0;
                      return (
                        <tr key={item.name} className="hover:bg-gray-50">
                          <td className="px-5 py-2.5 font-medium border-l">{item.name}</td>
                          <td className="px-5 py-2.5 border-l text-red-600 font-bold" dir="ltr">₪ {item.value.toLocaleString()}</td>
                          <td className="px-5 py-2.5 border-l text-gray-500" dir="ltr">{percent.toFixed(1)}%</td>
                          <td className="px-5 py-2.5 w-1/4 print:hidden">
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${percent}%` }}></div>
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={4} className="py-4 text-center text-gray-400">لا يوجد مصروفات للفترة المختارة</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed Transaction Table */}
            <div id="financial-transactions" className="printable-section pt-8 page-break-before-always">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-bold text-gray-800 flex items-center gap-2">
                  <History className="text-emerald-600" size={20} />
                  سجل الحركات المالية المفلترة ({filteredTransactions.length})
                </h3>
              </div>
              <div className="overflow-x-auto border rounded-2xl overflow-hidden shadow-sm print:overflow-visible print:shadow-none print:border-none">
                <table className="w-full text-right text-sm">
                  <thead className="bg-emerald-600 text-white font-bold">
                    <tr>
                      <th className="px-4 py-3 border-l border-emerald-500">التاريخ</th>
                      <th className="px-4 py-3 border-l border-emerald-500">البند</th>
                      <th className="px-4 py-3 border-l border-emerald-500">المبلغ</th>
                      <th className="px-4 py-3 border-l border-emerald-500">الوسيلة</th>
                      <th className="px-4 py-3">بواسطة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredTransactions.slice().reverse().map(t => (
                      <tr key={t.id} className="hover:bg-emerald-50 transition-colors">
                        <td className="px-4 py-2.5 border-l font-bold text-gray-700">{t.date}</td>
                        <td className="px-4 py-2.5 border-l text-gray-600">{t.category}</td>
                        <td className={`px-4 py-2.5 border-l font-black ${t.direction === TransactionDirection.IN ? 'text-emerald-600' : 'text-red-600'}`} dir="ltr">
                          {t.direction === TransactionDirection.IN ? '+' : '-'}{t.amount.toLocaleString()} ₪
                        </td>
                        <td className="px-4 py-2.5 border-l font-medium text-gray-600">
                          {financialMedia.find(m => m.id === t.mediumId)?.name || 'غير محدد'}
                        </td>
                        <td className="px-4 py-2.5 text-[11px] font-bold text-gray-800">
                          <div className="flex items-center gap-1">
                            <UserIcon size={12} className="text-gray-400" />
                            {getUserDisplay(t.createdBy)}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredTransactions.length === 0 && (
                      <tr><td colSpan={5} className="py-10 text-center text-gray-400 font-bold">لا يوجد حركات تطابق البحث</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Media Balances Card */}
            <div className="mt-12 no-print">
              <h3 className="text-md font-bold text-gray-800 mb-5 flex items-center gap-2">
                <WalletIcon className="text-blue-600" size={20} />
                أرصدة الصناديق اللحظية
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {financialMedia.map(m => (
                  <div key={m.id} className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center">
                    <p className="font-bold text-gray-800 mb-1">{m.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold mb-4">{m.type === 'CASH' ? 'صندوق نقدي' : 'حساب بنكي'}</p>
                    <p className="text-2xl font-black text-emerald-600" dir="ltr">₪ {m.balance.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Membership Report */}
      {canViewMembers && (
        <div id="members-debt-report" className="printable-section bg-white p-6 rounded-2xl shadow-sm border border-gray-100 print:shadow-none print:border-gray-200 page-break-inside-avoid">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Users className="text-blue-600" />
              تقرير المديونية وعضوية الأعضاء
            </h2>
            <div className="flex gap-2 no-print">
              <button onClick={() => handlePrintSection('members-debt-report')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors" title="طباعة مديونية الأعضاء">
                <Printer size={18} />
              </button>
              <button onClick={exportMembersExcel} className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-bold border border-blue-200">
                <Download size={16} />
                Excel
              </button>
              <button onClick={() => exportToPDF('members-debt-report', 'members_report')} className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-bold border border-red-200">
                <FileText size={16} />
                PDF
              </button>
            </div>
          </div>

          {/* Member Filter Bar */}
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-5 rounded-2xl border border-gray-100 no-print">
            <div className="relative">
              <label className="text-xs font-bold text-gray-500 block mb-1">بحث سريع (اسم/كود)</label>
              <input type="text" placeholder="ابحث باسم العضو..." value={memSearch} onChange={(e) => setMemSearch(e.target.value)} className="w-full text-sm border-gray-300 rounded-xl px-4 py-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">حالة الالتزام المالي</label>
              <select value={memStatus} onChange={(e) => setMemStatus(e.target.value)} className="w-full text-sm border-gray-300 rounded-xl px-4 py-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="all">كل الأعضاء</option>
                <option value="debt">عليهم مستحقات مالية</option>
                <option value="paid">مسددين بالكامل</option>
              </select>
            </div>
          </div>

          <div className="overflow-hidden">
            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <ListChecks className="text-blue-600" size={20} />
              جدول الالتزامات المالية ({filteredMembers.length} فرداً)
            </h4>

            <div className="overflow-x-auto border border-gray-100 rounded-2xl max-h-[600px] shadow-sm scrollbar-thin scrollbar-thumb-blue-200 print:overflow-visible print:max-h-none print:shadow-none print:border-none">
              <table className="w-full text-right text-sm">
                <thead className="bg-blue-600 text-white sticky top-0 font-bold">
                  <tr>
                    <th className="px-3 py-3 border-l border-blue-500 min-w-[140px]">الاسم الكامل</th>
                    <th className="px-3 py-3 border-l border-blue-500 whitespace-nowrap">الكود</th>
                    <th className="px-3 py-3 border-l border-blue-500 whitespace-nowrap">الهوية</th>
                    <th className="px-3 py-3 border-l border-blue-500 whitespace-nowrap">الهاتف</th>
                    <th className="px-3 py-3 border-l border-blue-500 whitespace-nowrap">الوظيفة</th>
                    <th className="px-3 py-3 border-l border-blue-500 font-black whitespace-nowrap">الاشتراك</th>
                    <th className="px-3 py-3 border-l border-blue-500 whitespace-nowrap">إجمالي المدفوع</th>
                    <th className="px-3 py-3 border-l border-blue-500 whitespace-nowrap">تأخير {currentYear}</th>
                    <th className="px-3 py-3 border-l border-blue-500 font-black whitespace-nowrap">الدين الكلي</th>
                    <th className="px-3 py-3 whitespace-nowrap">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredMembers.map(m => {
                    const memberTransactions = transactions.filter(t => t.memberId === m.id && t.type === TransactionType.SUBSCRIPTION && t.status !== 'REVERSED');
                    const totalPaid = memberTransactions.reduce((sum, t) => sum + t.amount, 0);

                    const joinDate = m.joinDate ? new Date(m.joinDate) : new Date();
                    const validJoinDate = !isNaN(joinDate.getTime()) ? joinDate : new Date();
                    const totalMonths = (currentYear - validJoinDate.getFullYear()) * 12 + (new Date().getMonth() - validJoinDate.getMonth() + 1);
                    const subAmount = m.monthlySubscription || 0;
                    const totalExpected = subAmount * Math.max(0, totalMonths);
                    const totalDebt = Math.max(0, totalExpected - totalPaid);

                    const expectedThisYear = subAmount * (new Date().getMonth() + 1);
                    const paidThisYear = memberTransactions.filter(t => new Date(t.date).getFullYear() === currentYear).reduce((sum, t) => sum + t.amount, 0);
                    const lateMonths = Math.max(0, Math.floor((expectedThisYear - paidThisYear) / (subAmount || 1)));

                    return (
                      <tr key={m.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-3 py-2 border-l font-bold text-gray-800">{m.fullName}</td>
                        <td className="px-3 py-2 border-l text-gray-600 whitespace-nowrap">{m.memberCode}</td>
                        <td className="px-3 py-2 border-l text-gray-600 whitespace-nowrap">{m.nationalId || '-'}</td>
                        <td className="px-3 py-2 border-l text-gray-600 whitespace-nowrap">{m.phone}</td>
                        <td className="px-3 py-2 border-l text-gray-600 truncate max-w-[100px]" title={m.job}>{m.job || '-'}</td>
                        <td className="px-3 py-2 border-l font-black text-gray-700 whitespace-nowrap">{m.monthlySubscription} ₪</td>
                        <td className="px-3 py-2 border-l font-black text-emerald-600 whitespace-nowrap">{totalPaid.toLocaleString()} ₪</td>
                        <td className="px-3 py-2 border-l font-bold text-amber-600 whitespace-nowrap">{lateMonths} شهر</td>
                        <td className="px-3 py-2 border-l font-black text-red-600 whitespace-nowrap">{totalDebt.toLocaleString()} ₪</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {totalDebt === 0 ? (
                            <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs"><CheckCircle2 size={14} /> مسدد</span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600 font-bold text-xs"><XCircle size={14} /> مدين</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredMembers.length === 0 && (
                    <tr><td colSpan={10} className="py-12 text-center text-gray-400 font-bold">لم يتم العثور على أعضاء يطابقون الفلترة</td></tr>
                  )}

                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;