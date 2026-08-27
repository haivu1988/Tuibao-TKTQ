import { AttendanceRecord, Employee, EmployeeWorkSummary, Shift } from '../types';

/**
 * Calculates work hours and summary statistics for each employee
 */
export function calculateAllEmployeesWorkSummary(
  employees: Employee[],
  records: AttendanceRecord[]
): EmployeeWorkSummary[] {
  return employees.map((emp) => {
    const empRecords = records.filter((r) => r.employeeId === emp.id);
    
    // Group records by day and shift to pair check-in and check-out
    let totalHours = 0;
    let shift1Count = 0;
    let shift2Count = 0;
    let shift3Count = 0;
    let onTimeCount = 0;
    let lateCount = 0;
    let earlyLeaveCount = 0;

    // Track processed check-ins
    const processedPairs = new Set<string>();

    empRecords.forEach((rec) => {
      // Shift counts
      if (rec.type === 'CHECK_IN') {
        if (rec.shiftId === 'CA_1') shift1Count++;
        else if (rec.shiftId === 'CA_2') shift2Count++;
        else if (rec.shiftId === 'CA_3') shift3Count++;

        if (rec.status.toLowerCase().includes('muộn')) {
          lateCount++;
        } else if (rec.status.toLowerCase().includes('đúng giờ') || rec.status.toLowerCase().includes('hợp lệ')) {
          onTimeCount++;
        }
      } else if (rec.type === 'CHECK_OUT') {
        if (rec.status.toLowerCase().includes('sớm')) {
          earlyLeaveCount++;
        }
      }
    });

    // Calculate actual hours worked by finding check-in/check-out pairs
    // Each standard shift is 5 hours
    const daysMap: { [dateStr: string]: { [shiftId: string]: { checkIn?: AttendanceRecord; checkOut?: AttendanceRecord } } } = {};

    empRecords.forEach((rec) => {
      const datePart = rec.timestamp.split(' ')[0] || rec.isoDate.split('T')[0];
      if (!daysMap[datePart]) daysMap[datePart] = {};
      if (!daysMap[datePart][rec.shiftId]) daysMap[datePart][rec.shiftId] = {};

      if (rec.type === 'CHECK_IN' && !daysMap[datePart][rec.shiftId].checkIn) {
        daysMap[datePart][rec.shiftId].checkIn = rec;
      } else if (rec.type === 'CHECK_OUT' && !daysMap[datePart][rec.shiftId].checkOut) {
        daysMap[datePart][rec.shiftId].checkOut = rec;
      }
    });

    Object.keys(daysMap).forEach((d) => {
      Object.keys(daysMap[d]).forEach((sId) => {
        const pair = daysMap[d][sId];
        if (pair.checkIn && pair.checkOut) {
          // Calculate time difference
          try {
            const timeInParts = pair.checkIn.timestamp.split(' ')[1]?.split(':') || ['08', '00'];
            const timeOutParts = pair.checkOut.timestamp.split(' ')[1]?.split(':') || ['13', '00'];
            const inMinutes = parseInt(timeInParts[0], 10) * 60 + parseInt(timeInParts[1], 10);
            const outMinutes = parseInt(timeOutParts[0], 10) * 60 + parseInt(timeOutParts[1], 10);
            const diffHours = Math.max(0.5, Math.min(6, (outMinutes - inMinutes) / 60));
            totalHours += Math.round(diffHours * 10) / 10;
          } catch {
            totalHours += 5.0; // standard shift duration
          }
        } else if (pair.checkIn) {
          // If only checked in, count standard 5.0 hours for the shift
          totalHours += 5.0;
        }
      });
    });

    const totalShifts = shift1Count + shift2Count + shift3Count;

    return {
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department,
      totalWorkHours: Math.round(totalHours * 10) / 10,
      totalShifts,
      shift1Count,
      shift2Count,
      shift3Count,
      onTimeCount,
      lateCount,
      earlyLeaveCount,
      records: empRecords
    };
  });
}

/**
 * Format hours for display
 */
export function formatHours(hours: number): string {
  return `${hours.toFixed(1)} giờ`;
}

/**
 * Export work hours summary to CSV
 */
export function exportWorkHoursToCsv(summaries: EmployeeWorkSummary[]): void {
  const headers = [
    'Mã Nhân Viên',
    'Họ Và Tên',
    'Phòng Ban',
    'Tổng Giờ Làm (Giờ)',
    'Tổng Số Ca',
    'Ca 1 (8h-13h)',
    'Ca 2 (13h-18h)',
    'Ca 3 (18h-23h)',
    'Đúng Giờ',
    'Đi Muộn',
    'Về Sớm'
  ];

  const rows = summaries.map((s) => [
    `"${s.employeeId}"`,
    `"${s.employeeName}"`,
    `"${s.department}"`,
    s.totalWorkHours,
    s.totalShifts,
    s.shift1Count,
    s.shift2Count,
    s.shift3Count,
    s.onTimeCount,
    s.lateCount,
    s.earlyLeaveCount
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Bao_Cao_Gio_Lam_Viec_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
