import React, { useState } from 'react';
import {
  Employee,
  Shift,
  ShiftRegistration,
  ShiftScheduleConfig,
  WeeklySchedule,
  DayOfWeekKey,
  ToastMessage,
  Branch
} from '../types';
import {
  Calendar,
  Sparkles,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Edit3,
  Plus,
  Trash2,
  Download,
  Share2,
  RefreshCw,
  Clock,
  ShieldCheck,
  ChevronDown,
  Info,
  Check,
  X,
  UserCheck,
  Sliders,
  Eye,
  Building2,
  Filter
} from 'lucide-react';
import {
  DAYS_OF_WEEK,
  getSlotKey,
  parseSlotKey,
  runAutoScheduleAlgorithm,
  AutoScheduleResult
} from '../utils/autoSchedule';

interface ShiftScheduleManagerProps {
  employees: Employee[];
  shifts: Shift[];
  branches?: Branch[];
  registrations: Record<string, ShiftRegistration>;
  scheduleConfig: ShiftScheduleConfig;
  weeklySchedule: WeeklySchedule;
  onUpdateConfig: (config: ShiftScheduleConfig) => void;
  onUpdateSchedule: (schedule: WeeklySchedule) => void;
  onUpdateRegistrations: (registrations: Record<string, ShiftRegistration>) => void;
  showToast: (type: ToastMessage['type'], title: string, message: string) => void;
}

export const ShiftScheduleManager: React.FC<ShiftScheduleManagerProps> = ({
  employees,
  shifts,
  branches = [],
  registrations,
  scheduleConfig,
  weeklySchedule,
  onUpdateConfig,
  onUpdateSchedule,
  onUpdateRegistrations,
  showToast
}) => {
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [selectedStaffPerShift, setSelectedStaffPerShift] = useState<number>(
    scheduleConfig.requiredStaffPerShift || 2
  );
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [scheduleLogs, setScheduleLogs] = useState<string[]>([]);
  const [lastStats, setLastStats] = useState<AutoScheduleResult['stats'] | null>(null);

  // Manual Edit Slot Modal
  const [editingSlotKey, setEditingSlotKey] = useState<string | null>(null);
  const [selectedEmployeeToAdd, setSelectedEmployeeToAdd] = useState<string>(employees[0]?.id || '');

  // Filter or highlight view
  const [highlightEmployeeId, setHighlightEmployeeId] = useState<string>('ALL');

  // Branch-filtered employees
  const displayEmployees = selectedBranchId === 'ALL'
    ? employees
    : employees.filter((e) => e.branchId === selectedBranchId);

  // Toggle Registration Open / Closed
  const handleToggleRegistration = () => {
    const nextState = !scheduleConfig.isRegistrationOpen;
    onUpdateConfig({
      ...scheduleConfig,
      isRegistrationOpen: nextState
    });

    if (nextState) {
      showToast(
        'success',
        'Đã MỞ ĐĂNG KÝ CA',
        'Nhân viên hiện có thể truy cập lịch tuần và gửi đăng ký nguyện vọng ca làm việc.'
      );
    } else {
      showToast(
        'info',
        'Đã ĐÓNG ĐĂNG KÝ CA',
        'Đã khóa nhận đăng ký. Bạn có thể tiến hành Auto chia ca thông minh ngay.'
      );
    }
  };

  // Run Auto Schedule Algorithm (branch isolated or global)
  const handleRunAutoSchedule = async () => {
    setIsAutoScheduling(true);

    // Simulate smart calculation delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    const targetEmployees = selectedBranchId === 'ALL'
      ? employees
      : employees.filter((e) => e.branchId === selectedBranchId);

    const result = runAutoScheduleAlgorithm(
      targetEmployees,
      registrations,
      shifts,
      selectedStaffPerShift,
      scheduleConfig.allowAutoFillIfLacking ?? true
    );

    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} - ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

    // If scheduling for specific branch, merge with existing slots for other branches
    let mergedSlots = result.schedule;
    if (selectedBranchId !== 'ALL' && weeklySchedule?.slots) {
      mergedSlots = { ...weeklySchedule.slots };
      // Replace slots for this branch's employees
      const branchEmpIds = new Set(targetEmployees.map(e => e.id));
      Object.keys(result.schedule).forEach((slotKey) => {
        const existingSlot = mergedSlots[slotKey] || [];
        const nonBranchEmployees = existingSlot.filter(id => !branchEmpIds.has(id));
        const newBranchEmployees = result.schedule[slotKey] || [];
        mergedSlots[slotKey] = [...nonBranchEmployees, ...newBranchEmployees];
      });
    }

    const newWeeklySchedule: WeeklySchedule = {
      weekLabel: scheduleConfig.weekLabel,
      slots: mergedSlots,
      lastAutoScheduledAt: timestamp,
      isPublished: true
    };

    onUpdateSchedule(newWeeklySchedule);
    setScheduleLogs(result.summary.logs);
    setLastStats(result.stats);
    setIsAutoScheduling(false);

    const branchName = branches.find(b => b.id === selectedBranchId)?.name || 'Tất Cả Chi Nhánh';

    showToast(
      'success',
      `Đã Tự Động Chia Ca: ${branchName}`,
      `Đã phân bổ đều ${result.summary.filledSlots} lượt trực cho ${result.stats.length} nhân viên (Độ công bằng: ${result.summary.fairnessScore}%).`
    );
  };

  // Toggle Publish Schedule
  const handleTogglePublish = () => {
    const nextState = !weeklySchedule.isPublished;
    onUpdateSchedule({
      ...weeklySchedule,
      isPublished: nextState
    });

    showToast(
      nextState ? 'success' : 'info',
      nextState ? 'Đã Công Bố Lịch Ca Chính Thức' : 'Đã Ẩn Lịch Ca',
      nextState
        ? 'Tất cả nhân viên đã có thể xem bảng phân ca chính thức trên app của họ.'
        : 'Lịch ca đã chuyển về chế độ dự thảo (Draft).'
    );
  };

  // Open Edit Slot Modal
  const handleOpenEditSlot = (slotKey: string) => {
    setEditingSlotKey(slotKey);
    // Default select an employee not in this slot
    const currentInSlot = weeklySchedule?.slots?.[slotKey] || [];
    const available = employees.find((e) => !currentInSlot.includes(e.id));
    if (available) {
      setSelectedEmployeeToAdd(available.id);
    }
  };

  // Add Employee to Slot
  const handleAddEmployeeToSlot = () => {
    if (!editingSlotKey || !selectedEmployeeToAdd) return;
    const current = weeklySchedule?.slots?.[editingSlotKey] || [];
    if (current.includes(selectedEmployeeToAdd)) {
      showToast('warning', 'Đã có trong ca', 'Nhân viên này đã được phân trong ca trực này!');
      return;
    }

    const updated = {
      ...(weeklySchedule?.slots || {}),
      [editingSlotKey]: [...current, selectedEmployeeToAdd]
    };

    onUpdateSchedule({
      ...weeklySchedule,
      slots: updated,
      lastEditedAt: new Date().toLocaleTimeString('vi-VN')
    });

    showToast('success', 'Đã thêm nhân viên', `Đã thêm ${employees.find((e) => e.id === selectedEmployeeToAdd)?.name} vào ca.`);
  };

  // Remove Employee from Slot
  const handleRemoveEmployeeFromSlot = (empId: string) => {
    if (!editingSlotKey) return;
    const current = weeklySchedule?.slots?.[editingSlotKey] || [];
    const updated = {
      ...(weeklySchedule?.slots || {}),
      [editingSlotKey]: current.filter((id) => id !== empId)
    };

    onUpdateSchedule({
      ...weeklySchedule,
      slots: updated,
      lastEditedAt: new Date().toLocaleTimeString('vi-VN')
    });

    showToast('info', 'Đã xóa khỏi ca', 'Đã bỏ nhân viên khỏi ca trực này.');
  };

  // Count registrations
  const totalRegisteredCount = Object.keys(registrations).length;
  const activeEmployees = employees.filter((e) => e.active !== false);

  // Export schedule to CSV
  const handleExportScheduleCsv = () => {
    let csv = '\uFEFF'; // UTF-8 BOM
    csv += `LỊCH PHÂN CHIA CA LÀM VIỆC - ${scheduleConfig.weekLabel}\n`;
    csv += 'Ca Làm Việc,' + DAYS_OF_WEEK.map((d) => d.label).join(',') + '\n';

    shifts.forEach((shift) => {
      let row = `"${shift.name} (${shift.startTime}-${shift.endTime})"`;
      DAYS_OF_WEEK.forEach((day) => {
        const slotKey = getSlotKey(day.key, shift.id);
        const assignedIds = weeklySchedule?.slots?.[slotKey] || [];
        const names = assignedIds
          .map((id) => employees.find((e) => e.id === id)?.name || id)
          .join(' & ');
        row += `,"${names}"`;
      });
      csv += row + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Lich_Phan_Ca_${scheduleConfig.weekLabel.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Đã tải file lịch ca', 'File CSV lịch làm việc đã được xuất thành công.');
  };

  // Calculate shift stats for all employees in current schedule
  const employeeShiftCounts: Record<string, number> = {};
  employees.forEach((e) => {
    employeeShiftCounts[e.id] = 0;
  });
  Object.values(weeklySchedule.slots || {}).forEach((ids) => {
    const list = Array.isArray(ids) ? ids : [];
    list.forEach((id) => {
      employeeShiftCounts[id] = (employeeShiftCounts[id] || 0) + 1;
    });
  });

  return (
    <div className="space-y-6">
      
      {/* 1. TOP CONTROL PANEL: REGISTRATION STATE & AUTO-SCHEDULE ACTIONS */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
        
        {/* Header Title & Registration Switch */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-xl">
                <Calendar className="w-5 h-5" />
              </span>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                Hệ Thống Phân Chia Ca Làm Việc Tuần
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Quản lý đăng ký ca nguyện vọng của nhân viên và tự động xếp ca công bằng theo thuật toán thông minh
            </p>
          </div>

          {/* OPEN / CLOSE REGISTRATION TOGGLE BUTTON */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleRegistration}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition shadow-sm cursor-pointer ${
                scheduleConfig.isRegistrationOpen
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
              }`}
            >
              {scheduleConfig.isRegistrationOpen ? (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Đang MỞ Đăng Ký (Bấm để Đóng)</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Đang ĐÓNG Đăng Ký (Bấm để Mở)</span>
                </>
              )}
            </button>

            {/* Publish Toggle */}
            <button
              type="button"
              onClick={handleTogglePublish}
              className={`px-3.5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition border cursor-pointer ${
                weeklySchedule.isPublished
                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {weeklySchedule.isPublished ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Đã Công Bố Lịch</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Chế độ Dự Thảo</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2. AUTO-SCHEDULE ALGORITHM TRIGGER & RULES CARD */}
        <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Rules Summary Pill */}
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Quy Tắc Tự Động Chia Ca Thông Minh:
                </span>
              </div>
              <ul className="text-xs text-slate-600 space-y-1 font-medium pl-1">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                  <span><strong>Quy tắc 1:</strong> Tuyệt đối <strong>KHÔNG</strong> chia 1 nhân viên làm 3 ca trong 1 ngày (Tối đa 2 ca).</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                  <span><strong>Quy tắc 2:</strong> <strong>Hạn chế tối đa</strong> việc 1 người làm 2 ca/ngày (ưu tiên người chưa có ca trong ngày).</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                  <span><strong>Quy tắc 3:</strong> Số ca làm việc của các nhân viên được cân bằng <strong>"same same nhau"</strong> theo tuần.</span>
                </li>
              </ul>
            </div>

            {/* Target Capacity & Action */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {branches.length > 0 && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-indigo-600" />
                    <span>Cụm Chi Nhánh:</span>
                  </label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-bold text-indigo-900 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                  >
                    <option value="ALL">🏢 Toàn bộ chi nhánh ({employees.length} NV)</option>
                    {branches.map((b) => {
                      const count = employees.filter((e) => e.branchId === b.id).length;
                      return (
                        <option key={b.id} value={b.id}>
                          {b.name} ({count} NV)
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Số người / 1 Ca:
                </label>
                <select
                  value={selectedStaffPerShift}
                  onChange={(e) => setSelectedStaffPerShift(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value={1}>1 Nhân viên / Ca</option>
                  <option value={2}>2 Nhân viên / Ca (Chuẩn)</option>
                  <option value={3}>3 Nhân viên / Ca</option>
                  <option value={4}>4 Nhân viên / Ca</option>
                </select>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleRunAutoSchedule}
                  disabled={isAutoScheduling}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  {isAutoScheduling ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>
                    {isAutoScheduling
                      ? 'Đang Xếp Ca...'
                      : selectedBranchId === 'ALL'
                      ? 'Tự Động Chia Ca Tất Cả'
                      : `Chia Ca: ${branches.find(b => b.id === selectedBranchId)?.code || 'Chi Nhánh'}`}
                  </span>
                </button>
              </div>
            </div>

          </div>

          {/* Registration Progress Indicator */}
          <div className="pt-3 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>
                Tiến độ đăng ký: <strong>{totalRegisteredCount} / {activeEmployees.length}</strong> nhân viên đã gửi nguyện vọng ca.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportScheduleCsv}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Xuất CSV Lịch Ca</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* 3. VISUAL WEEKLY SCHEDULE GRID (MA TRẬN LỊCH CA TRỰC QUAN T2 - CN) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-bold text-slate-800">
                Bảng Phân Chia Ca Tuần (Ma Trận Trực Quan)
              </h4>
              <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {scheduleConfig.weekLabel}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              💡 Bấm vào bất kỳ ô ca nào để <strong>chỉnh sửa, thêm/bớt nhân viên trực</strong> thủ công.
            </p>
          </div>

          {/* Highlight Filter by Employee */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Lọc xem:</span>
            <select
              value={highlightEmployeeId}
              onChange={(e) => setHighlightEmployeeId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">Tất cả nhân viên ({displayEmployees.length})</option>
              {displayEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.id} - {employeeShiftCounts[e.id] || 0} ca)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* THE RESPONSIVE WEEKLY GRID */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-slate-800 text-white text-xs">
                <th className="p-3 font-bold border-r border-slate-700 w-36">
                  Ca Làm Việc
                </th>
                {DAYS_OF_WEEK.map((d) => (
                  <th key={d.key} className="p-3 font-bold border-r border-slate-700 text-center">
                    <div>{d.label}</div>
                    <div className="text-[10px] text-slate-300 font-normal mt-0.5">
                      {d.key === 'T2' ? '24/08' : d.key === 'T3' ? '25/08' : d.key === 'T4' ? '26/08' : d.key === 'T5' ? '27/08' : d.key === 'T6' ? '28/08' : d.key === 'T7' ? '29/08' : '30/08'}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-xs">
              {shifts.map((shift) => (
                <tr key={shift.id} className="hover:bg-slate-50/50 transition">
                  
                  {/* Shift Label Header Column */}
                  <td className="p-3 bg-slate-50 font-bold text-slate-800 border-r border-slate-200 align-top">
                    <div className="text-xs font-bold text-slate-900">
                      {shift.id === 'CA_1' ? 'Ca 1 (Sáng)' : shift.id === 'CA_2' ? 'Ca 2 (Chiều)' : 'Ca 3 (Tối)'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {shift.startTime} - {shift.endTime}
                    </div>
                    <div className="text-[10px] text-blue-600 font-medium mt-1">
                      {shift.durationHours}h / ca
                    </div>
                  </td>

                  {/* 7 Days Columns for this Shift */}
                  {DAYS_OF_WEEK.map((day) => {
                    const slotKey = getSlotKey(day.key, shift.id);
                    const assignedEmpIds = weeklySchedule?.slots?.[slotKey] || [];
                    const isLacking = assignedEmpIds.length < selectedStaffPerShift;

                    return (
                      <td
                        key={day.key}
                        onClick={() => handleOpenEditSlot(slotKey)}
                        className={`p-2.5 border-r border-slate-200 align-top hover:bg-blue-50/40 cursor-pointer transition relative group ${
                          isLacking ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        {/* Edit Quick Icon on Hover */}
                        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition p-1 bg-white rounded-lg shadow-xs text-blue-600">
                          <Edit3 className="w-3 h-3" />
                        </div>

                        {/* Assigned Employees Chips */}
                        <div className="space-y-1.5 min-h-[50px]">
                          {assignedEmpIds.length === 0 ? (
                            <span className="text-[10px] text-slate-300 italic block py-2 text-center">
                              Trống (Chưa có NV)
                            </span>
                          ) : (
                            assignedEmpIds.map((empId) => {
                              const emp = employees.find((e) => e.id === empId);
                              const empBranch = branches.find((b) => b.id === emp?.branchId);
                              const isHighlighted = highlightEmployeeId === empId;
                              const isDimmed = highlightEmployeeId !== 'ALL' && !isHighlighted;

                              return (
                                <div
                                  key={empId}
                                  className={`p-1.5 rounded-xl border flex items-center justify-between text-[11px] transition ${
                                    isHighlighted
                                      ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-xs'
                                      : isDimmed
                                      ? 'opacity-30 bg-slate-100 text-slate-500 border-slate-200'
                                      : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200/80 font-medium'
                                  }`}
                                >
                                  <div className="truncate pr-1">
                                    <span className="font-bold">{emp?.name || empId}</span>
                                    {empBranch && (
                                      <span className={`text-[8px] px-1 py-0.2 rounded ml-1 font-bold ${
                                        isHighlighted ? 'bg-blue-800 text-white' : 'bg-blue-100 text-blue-700'
                                      }`}>
                                        {empBranch.code}
                                      </span>
                                    )}
                                    <span className="text-[9px] opacity-75 ml-1 font-mono">
                                      ({emp?.id})
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}

                          {isLacking && (
                            <div className="text-[9px] text-amber-700 font-semibold flex items-center gap-1 pt-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>Thiếu người ({assignedEmpIds.length}/{selectedStaffPerShift})</span>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}

                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* 4. FAIRNESS SUMMARY: SHIFT DISTRIBUTION EQUALITY TABLE */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Thống Kê Phân Bổ Ca Của Từng Nhân Viên (Kiểm Tra Độ Cân Bằng "Same Same")
            </h4>
          </div>
          <span className="text-xs text-slate-500">
            Tổng cộng: <strong>{Object.values(employeeShiftCounts).reduce((a, b) => a + b, 0)}</strong> lượt ca tuần
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
          {displayEmployees.map((emp) => {
            const count = employeeShiftCounts[emp.id] || 0;
            const regCount = registrations[emp.id]?.selectedSlots?.length || 0;
            const empBranch = branches.find((b) => b.id === emp.branchId);

            return (
              <div
                key={emp.id}
                className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 truncate">{emp.name}</span>
                  <span className="font-mono font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full text-[11px]">
                    {count} ca
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 flex justify-between">
                  <span>Mã NV: {emp.id}</span>
                  <span>Đã ĐK: {regCount} ca</span>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>{emp.department}</span>
                  {empBranch && (
                    <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200/60">
                      {empBranch.code}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. MANUAL EDIT MODAL FOR A SPECIFIC SHIFT SLOT */}
      {editingSlotKey && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-600" />
                  <span>Chỉnh Sửa Ca Trực Thủ Công</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {(() => {
                    const parsed = parseSlotKey(editingSlotKey);
                    const dayLabel = DAYS_OF_WEEK.find((d) => d.key === parsed.day)?.label;
                    const shiftLabel = shifts.find((s) => s.id === parsed.shiftId)?.name;
                    return `${dayLabel} • ${shiftLabel}`;
                  })()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSlotKey(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Staff in this slot */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Nhân viên đang phân trong ca này:
              </label>

              <div className="space-y-1.5">
                {(weeklySchedule?.slots?.[editingSlotKey] || []).length === 0 ? (
                  <p className="text-xs text-slate-400 py-2 italic text-center bg-slate-50 rounded-xl">
                    Chưa có nhân viên nào trong ca này.
                  </p>
                ) : (
                  (weeklySchedule?.slots?.[editingSlotKey] || []).map((empId) => {
                    const emp = employees.find((e) => e.id === empId);
                    return (
                      <div
                        key={empId}
                        className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{emp?.name || empId}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{empId} • {emp?.department}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveEmployeeFromSlot(empId)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Xóa khỏi ca này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Add Employee to this slot */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Thêm nhân viên khác vào ca này:
              </label>

              <div className="flex gap-2">
                <select
                  value={selectedEmployeeToAdd}
                  onChange={(e) => setSelectedEmployeeToAdd(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.id} - Đang có {employeeShiftCounts[emp.id] || 0} ca)
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAddEmployeeToSlot}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm
                </button>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setEditingSlotKey(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Xong
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
