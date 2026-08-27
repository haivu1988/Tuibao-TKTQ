import { DayOfWeekKey, Employee, Shift, ShiftRegistration, WeeklySchedule } from '../types';

export interface DayInfo {
  key: DayOfWeekKey;
  label: string;
  short: string;
}

export const DAYS_OF_WEEK: DayInfo[] = [
  { key: 'T2', label: 'Thứ 2', short: 'T2' },
  { key: 'T3', label: 'Thứ 3', short: 'T3' },
  { key: 'T4', label: 'Thứ 4', short: 'T4' },
  { key: 'T5', label: 'Thứ 5', short: 'T5' },
  { key: 'T6', label: 'Thứ 6', short: 'T6' },
  { key: 'T7', label: 'Thứ 7', short: 'T7' },
  { key: 'CN', label: 'Chủ Nhật', short: 'CN' }
];

export function getSlotKey(day: DayOfWeekKey, shiftId: string): string {
  return `${day}_${shiftId}`;
}

export function parseSlotKey(slotKey: string): { day: DayOfWeekKey; shiftId: string } {
  const parts = slotKey.split('_');
  const day = parts[0] as DayOfWeekKey;
  const shiftId = parts.slice(1).join('_');
  return { day, shiftId };
}

export interface AutoScheduleResult {
  schedule: Record<string, string[]>; // slotKey -> employeeId[]
  stats: {
    employeeId: string;
    employeeName: string;
    totalShiftsAssigned: number;
    dailyDistribution: Record<DayOfWeekKey, number>;
    registeredSlotsCount: number;
    hasDayWith2Shifts: boolean;
  }[];
  summary: {
    totalSlots: number;
    filledSlots: number;
    requiredStaffPerShift: number;
    minShiftsPerEmployee: number;
    maxShiftsPerEmployee: number;
    averageShiftsPerEmployee: number;
    fairnessScore: number; // 0 - 100% (100% = perfectly equal)
    warnings: string[];
    logs: string[];
  };
}

/**
 * Intelligent Shift Scheduling Algorithm
 * Rules enforced:
 * 1. KHÔNG chia 1 nhân viên làm 3 ca 1 ngày (Strict Cap: Max 2 shifts/day, NEVER 3)
 * 2. HẠN CHẾ tối đa 1 nhân viên làm 2 ca 1 ngày (ưu tiên tuyệt đối người chưa làm ca nào trong ngày)
 * 3. Số ca làm việc của các nhân viên phải "same same" nhau (Cân bằng tổng số ca trong tuần)
 * 4. Ưu tiên theo nguyện vọng đăng ký của nhân viên
 */
export function runAutoScheduleAlgorithm(
  employees: Employee[],
  registrations: Record<string, ShiftRegistration>,
  shifts: Shift[],
  requiredStaffPerShift: number = 2,
  allowAutoFillIfLacking: boolean = true
): AutoScheduleResult {
  const activeEmployees = employees.filter((e) => e.active !== false);
  const resultSchedule: Record<string, string[]> = {};
  const logs: string[] = [];
  const warnings: string[] = [];

  // Track assignments
  const weeklyAssignedCount: Record<string, number> = {};
  const dailyAssignedCount: Record<string, Record<DayOfWeekKey, number>> = {};

  activeEmployees.forEach((emp) => {
    weeklyAssignedCount[emp.id] = 0;
    dailyAssignedCount[emp.id] = {
      T2: 0,
      T3: 0,
      T4: 0,
      T5: 0,
      T6: 0,
      T7: 0,
      CN: 0
    };
  });

  // Calculate target average shifts per employee
  const totalSlotsCount = DAYS_OF_WEEK.length * shifts.length;
  const totalStaffRequired = totalSlotsCount * requiredStaffPerShift;
  const targetShiftsPerEmp = activeEmployees.length > 0
    ? Math.round((totalStaffRequired / activeEmployees.length) * 10) / 10
    : 0;

  logs.push(`Bắt đầu xếp lịch: ${activeEmployees.length} nhân viên, ${totalSlotsCount} ca tuần (${totalStaffRequired} lượt trực). Mục tiêu: ~${targetShiftsPerEmp} ca/người.`);

  // Iterate over all days and shifts
  // We process Day by Day, and within each day Ca 1 -> Ca 2 -> Ca 3
  DAYS_OF_WEEK.forEach((dayInfo) => {
    const day = dayInfo.key;

    shifts.forEach((shift) => {
      const slotKey = getSlotKey(day, shift.id);
      resultSchedule[slotKey] = [];

      // Step 1: Find all employees who registered for this slot
      const registeredCandidates = activeEmployees.filter((emp) => {
        const reg = registrations[emp.id];
        return reg && reg.selectedSlots && reg.selectedSlots.includes(slotKey);
      });

      // Eligible candidates must have < 2 shifts today (NEVER 3 shifts, rule #1)
      let eligibleCandidates = registeredCandidates.filter((emp) => {
        const todayCount = dailyAssignedCount[emp.id][day];
        return todayCount < 2; // rule #1: cannot work 3 shifts
      });

      // Sort candidates by:
      // 1. Prioritize employee with 0 shifts today over 1 shift today (rule #2)
      // 2. Prioritize employee with lowest weekly assigned shifts (rule #3: same same nhau)
      // 3. Tie breaker: pseudo-random or employee ID to prevent bias
      eligibleCandidates.sort((a, b) => {
        const todayCountA = dailyAssignedCount[a.id][day];
        const todayCountB = dailyAssignedCount[b.id][day];
        if (todayCountA !== todayCountB) {
          return todayCountA - todayCountB; // 0 shifts today goes first!
        }

        const weeklyA = weeklyAssignedCount[a.id];
        const weeklyB = weeklyAssignedCount[b.id];
        if (weeklyA !== weeklyB) {
          return weeklyA - weeklyB; // Lowest weekly shifts goes first!
        }

        return a.id.localeCompare(b.id);
      });

      // Assign required staff from registered candidates
      let assignedForThisSlot: Employee[] = [];

      while (assignedForThisSlot.length < requiredStaffPerShift && eligibleCandidates.length > 0) {
        const candidate = eligibleCandidates.shift()!;
        assignedForThisSlot.push(candidate);
        resultSchedule[slotKey].push(candidate.id);

        weeklyAssignedCount[candidate.id] += 1;
        dailyAssignedCount[candidate.id][day] += 1;
      }

      // Step 2: Fallback if not enough registered candidates and auto-fill is enabled
      if (assignedForThisSlot.length < requiredStaffPerShift && allowAutoFillIfLacking) {
        const needed = requiredStaffPerShift - assignedForThisSlot.length;
        const alreadyInSlot = new Set(assignedForThisSlot.map((e) => e.id));

        // Find non-registered active employees who:
        // - are not already in this shift
        // - have < 2 shifts today (rule #1)
        const backupCandidates = activeEmployees.filter((emp) => {
          if (alreadyInSlot.has(emp.id)) return false;
          const todayCount = dailyAssignedCount[emp.id][day];
          return todayCount < 2;
        });

        // Sort backup candidates with the same fairness criteria
        backupCandidates.sort((a, b) => {
          const todayCountA = dailyAssignedCount[a.id][day];
          const todayCountB = dailyAssignedCount[b.id][day];
          if (todayCountA !== todayCountB) {
            return todayCountA - todayCountB;
          }
          return weeklyAssignedCount[a.id] - weeklyAssignedCount[b.id];
        });

        const addedBackups = backupCandidates.slice(0, needed);
        addedBackups.forEach((bEmp) => {
          assignedForThisSlot.push(bEmp);
          resultSchedule[slotKey].push(bEmp.id);
          weeklyAssignedCount[bEmp.id] += 1;
          dailyAssignedCount[bEmp.id][day] += 1;
        });

        if (assignedForThisSlot.length < requiredStaffPerShift) {
          warnings.push(`Ca ${dayInfo.label} - ${shift.name.split(':')[0]} chỉ xếp được ${assignedForThisSlot.length}/${requiredStaffPerShift} người do không còn nhân viên khả dụng.`);
        }
      }
    });
  });

  // Calculate stats & fairness metrics
  const stats = activeEmployees.map((emp) => {
    const total = weeklyAssignedCount[emp.id] || 0;
    const daily = dailyAssignedCount[emp.id];
    const hasDay2 = Object.values(daily).some((cnt) => cnt >= 2);
    const reg = registrations[emp.id];
    const regCount = reg?.selectedSlots?.length || 0;

    return {
      employeeId: emp.id,
      employeeName: emp.name,
      totalShiftsAssigned: total,
      dailyDistribution: daily,
      registeredSlotsCount: regCount,
      hasDayWith2Shifts: hasDay2
    };
  });

  const shiftCounts = stats.map((s) => s.totalShiftsAssigned);
  const minShifts = shiftCounts.length > 0 ? Math.min(...shiftCounts) : 0;
  const maxShifts = shiftCounts.length > 0 ? Math.max(...shiftCounts) : 0;
  const diff = maxShifts - minShifts;

  // Fairness score: 100 if all equal, drops with disparity
  const fairnessScore = Math.max(70, Math.round(100 - diff * 10));

  let totalAssignedAllSlots = 0;
  Object.values(resultSchedule).forEach((arr) => {
    totalAssignedAllSlots += arr.length;
  });

  logs.push(`✅ Hoàn thành phân ca: Tối thiểu ${minShifts} ca/người, Tối đa ${maxShifts} ca/người (Chênh lệch: ${diff} ca). Điểm cân bằng công bằng: ${fairnessScore}%.`);

  return {
    schedule: resultSchedule,
    stats,
    summary: {
      totalSlots: totalSlotsCount,
      filledSlots: totalAssignedAllSlots,
      requiredStaffPerShift,
      minShiftsPerEmployee: minShifts,
      maxShiftsPerEmployee: maxShifts,
      averageShiftsPerEmployee: targetShiftsPerEmp,
      fairnessScore,
      warnings,
      logs
    }
  };
}

/**
 * Generate Sample Initial Registrations for realistic preview
 */
export function generateSampleRegistrations(employees: Employee[]): Record<string, ShiftRegistration> {
  const registrations: Record<string, ShiftRegistration> = {};
  const allSlotKeys: string[] = [];

  DAYS_OF_WEEK.forEach((d) => {
    ['CA_1', 'CA_2', 'CA_3'].forEach((s) => {
      allSlotKeys.push(getSlotKey(d.key, s));
    });
  });

  employees.forEach((emp, index) => {
    // Each employee registers for ~10-14 slots across the week based on preference patterns
    let selected: string[] = [];
    if (index === 0) {
      // Nguyễn Văn An prefers morning & afternoon (CA_1, CA_2) Mon-Fri
      selected = ['T2_CA_1', 'T2_CA_2', 'T3_CA_1', 'T4_CA_1', 'T4_CA_2', 'T5_CA_1', 'T6_CA_1', 'T6_CA_2', 'T7_CA_1'];
    } else if (index === 1) {
      // Trần Thị Bình prefers evening & afternoon (CA_2, CA_3)
      selected = ['T2_CA_2', 'T2_CA_3', 'T3_CA_2', 'T3_CA_3', 'T4_CA_2', 'T5_CA_3', 'T6_CA_2', 'T7_CA_2', 'T7_CA_3', 'CN_CA_2'];
    } else if (index === 2) {
      // Lê Hoàng Cường prefers morning & evening
      selected = ['T2_CA_1', 'T3_CA_1', 'T3_CA_3', 'T4_CA_3', 'T5_CA_1', 'T5_CA_2', 'T6_CA_3', 'T7_CA_1', 'CN_CA_1', 'CN_CA_3'];
    } else if (index === 3) {
      // Phạm Minh Dũng
      selected = ['T2_CA_3', 'T3_CA_2', 'T4_CA_1', 'T5_CA_2', 'T6_CA_1', 'T7_CA_2', 'CN_CA_2', 'CN_CA_3'];
    } else {
      // Hoàng Thị Giang
      selected = ['T2_CA_2', 'T3_CA_1', 'T4_CA_2', 'T5_CA_3', 'T6_CA_2', 'T7_CA_3', 'CN_CA_1'];
    }

    registrations[emp.id] = {
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department,
      branchId: emp.branchId,
      selectedSlots: selected,
      note: 'Đã đăng ký ca mong muốn',
      updatedAt: '27/08/2026 09:30'
    };
  });

  return registrations;
}
