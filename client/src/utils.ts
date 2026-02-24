import { Member } from './types';

/**
 * Reads a field value from a Member object, supporting both standard and additionalData fields.
 */
export function getMemberFieldValue(member: Member, header: string): string {
  switch (header) {
    case 'رقم العضوية': return member.memberCode;
    case 'الاسم': return member.fullName;
    case 'رقم الهوية': return member.nationalId || '';
    case 'الجنس': return member.gender;
    case 'الهاتف': return member.phone;
    case 'واتساب': return member.whatsapp;
    case 'المدينة': return member.city;
    case 'العنوان': return member.address || '';
    case 'المهنة': return member.job || '';
    case 'نوع العضوية': return member.membershipType;
    case 'تاريخ الانضمام': return member.joinDate;
    case 'الحالة': return member.status;
    default:
      if (member.additionalData && member.additionalData[header]) {
        return String(member.additionalData[header]);
      }
      return '';
  }
}

/**
 * Exports data rows as a CSV file with BOM for proper Arabic encoding.
 */
export function exportToCSV(
  headers: string[],
  rows: string[][],
  filename: string
): void {
  let csvContent = "\uFEFF" + headers.join(',') + '\n';
  rows.forEach(row => {
    csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
