import React, { useState, useEffect } from 'react';
import {
  Employee,
  Shift,
  ShiftRegistration,
  ShiftScheduleConfig,
  WeeklySchedule,
  DayOfWeekKey,
  ToastMessage,
  AuthUser
} from '../types';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Save,
  Lock,
  Unlock,
  Check,
  User,
  Users,
  Eye,
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DAYS_OF_WEEK, getSlotKey, parseSlotKey } from '../utils/autoSchedule';

interface EmployeeShiftRegistrationProps {
  currentUser: AuthUser | null;
  employees: Employee[];
  shifts: Shift[];
  scheduleConfig: ShiftScheduleConfig;
  weeklySchedule: WeeklySchedule;
  registrations: Record<string, ShiftRegistration>;
  onSaveRegistration: (registration: ShiftRegistration) => void;
  showToast: (type: ToastMessage['type'], title: string, message: string) => void;
}

export const EmployeeShiftRegistration: React.FC<EmployeeShiftRegistrationProps> = ({
  currentUser,
  employees,
  shifts,
  scheduleConfig,
  weeklySchedule,
  registrations,
  onSaveRegistration,
  showToast
}) => {
  const currentEmpId = currentUser?.employeeId || employees[0]?.id || '';
  const currentEmp = employees.find((e) => e.id === currentEmpId) || employees[0];

  // Local state for selected slots
  const existingReg = registrations[currentEmpId];
  const [selectedSlots, setSelectedSlots] = useState<string[]>(
    existingReg?.selectedSlots || []
  );
  const [note, setNote] = useState<string>(existingReg?.note || '');
  const [isSaving, setIsSaving] = useState(false);
  const [viewOnlyMyShifts, setViewOnlyMyShifts] = useState(false);

  // Sync when currentEmpId changes
  useEffect(() => {
    const reg = registrations[currentEmpId];
    if (reg) {
      setSelectedSlots(reg.selectedSlots || []);
      setNote(reg.note || '');
    } else {
      setSelectedSlots([]);
      setNote('');
    }
  }, [currentEmpId, registrations]);

  // Toggle slot selection
  const handleToggleSlot = (slotKey: string) => {
    if (!scheduleConfig.isRegistrationOpen) {
      showToast('warning', 'Đăng ký đã đóng', 'Quản lý hiện đã khóa nhận đăng ký ca mới.');
      return;
    }

    if (selectedSlots.includes(slotKey)) {
      setSelectedSlots((prev) => prev.filter((k) => k !== slotKey));
    } else {
      setSelectedSlots((prev) => [...prev, slotKey]);
    }
  };

  // Select all or clear
  const handleSelectAllDaysShift = (shiftId: string) => {
    if (!scheduleConfig.isRegistrationOpen) return;
    const allForShift = DAYS_OF_WEEK.map((d) => getSlotKey(d.key, shiftId));
    const allSelected = allForShift.every((k) => selectedSlots.includes(k));

    if (allSelected) {
      setSelectedSlots((prev) => prev.filter((k) => !allForShift.includes(k)));
    } else {
      setSelectedSlots((prev) => Array.from(new Set([...prev, ...allForShift])));
    }
  };

  // Save registration
  const handleSave = async () => {
    if (!currentEmp) return;
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 400));

    const now = new Date();
    const timestampStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} - ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

    const newReg: ShiftRegistration = {
      employeeId: currentEmp.id,
      employeeName: currentEmp.name,
      department: currentEmp.department,
      selectedSlots: selectedSlots,
      note: note,
      updatedAt: timestampStr
    };

    onSaveRegistration(newReg);
    setIsSaving(false);

    try {
      confetti({ particleCount: 60, spread: 55, origin: { y: 0.8 } });
    } catch {
      // ignore
    }

    showToast(
      'success',
      'Đã Lưu Đăng Ký Ca Làm Việc!',
      `${currentEmp.name} đã đăng ký thành công ${selectedSlots.length} ca trong ${scheduleConfig.weekLabel}.`
    );
  };

  // Calculate my assigned shifts in official schedule
  const myAssignedSlots: string[] = [];
  Object.entries(weeklySchedule?.slots || {}).forEach(([slotKey, empIds]) => {
    const list = Array.isArray(empIds) ? empIds : [];
    if (list.includes(currentEmpId)) {
      myAssignedSlots.push(slotKey);
    }
  });

  return (
    <div className="space-y-6">
      
      {/* 1. TOP BANNER: STATUS OF REGISTRATION & INSTRUCTIONS */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`p-3 rounded-2xl shrink-0 ${
              scheduleConfig.isRegistrationOpen
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {scheduleConfig.isRegistrationOpen ? (
              <Unlock className="w-6 h-6" />
            ) : (
              <Lock className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-base">
                {scheduleConfig.isRegistrationOpen
                  ? 'Đang Mở Đăng Ký Ca Làm Việc Tuần'
                  : 'Đã Đóng Đăng Ký Ca Tuần'}
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  scheduleConfig.isRegistrationOpen
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {scheduleConfig.weekLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {scheduleConfig.isRegistrationOpen
                ? 'Tích chọn các ca bạn có thể đi làm từ Thứ 2 đến Chủ Nhật, sau đó bấm Lưu Lại.'
                : 'Quản lý đã chốt danh sách và xếp lịch chính thức. Bạn có thể xem bảng ca làm việc bên dưới.'}
            </p>
          </div>
        </div>

        {/* Current Employee Info Pill */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200/80 text-xs">
          <div className="w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
            {currentEmp?.name ? currentEmp.name.split(' ').pop()?.[0] : 'NV'}
          </div>
          <div>
            <p className="font-bold text-slate-800 leading-tight">{currentEmp?.name}</p>
            <p className="text-[10px] text-slate-500 font-mono">{currentEmp?.id}</p>
          </div>
        </div>
      </div>

      {/* 2. REGISTRATION FORM (WHEN OPEN) OR MY SCHEDULE VIEW (WHEN CLOSED / PUBLISHED) */}
      {scheduleConfig.isRegistrationOpen ? (
        
        /* REGISTRATION MATRIX (T2 -> CN, 3 SHIFTS) */
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h4 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Bảng Đăng Ký Ca Nguyện Vọng (Thứ 2 - CN)</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Bấm vào các ca bạn có thể làm để chọn hoặc bỏ chọn (Mỗi ca 5 tiếng)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                Đã chọn: <strong>{selectedSlots.length}</strong> ca ({selectedSlots.length * 5} giờ)
              </span>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Đang lưu...' : 'Lưu Đăng Ký Ca'}</span>
              </button>
            </div>
          </div>

          {/* THE INTERACTIVE REGISTRATION GRID */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left border-collapse min-w-[700px]">
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
                  <tr key={shift.id} className="hover:bg-slate-50/50">
                    
                    {/* Shift Label Header Column */}
                    <td className="p-3 bg-slate-50 font-bold text-slate-800 border-r border-slate-200 align-top">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          {shift.id === 'CA_1' ? 'Ca 1 (Sáng)' : shift.id === 'CA_2' ? 'Ca 2 (Chiều)' : 'Ca 3 (Tối)'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {shift.startTime} - {shift.endTime}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectAllDaysShift(shift.id)}
                        className="text-[9px] text-emerald-600 hover:text-emerald-700 font-semibold mt-1.5 cursor-pointer block"
                      >
                        Chọn cả tuần &rarr;
                      </button>
                    </td>

                    {/* 7 Days Checkbox Cells for this Shift */}
                    {DAYS_OF_WEEK.map((day) => {
                      const slotKey = getSlotKey(day.key, shift.id);
                      const isSelected = selectedSlots.includes(slotKey);

                      return (
                        <td
                          key={day.key}
                          onClick={() => handleToggleSlot(slotKey)}
                          className={`p-3 border-r border-slate-200 text-center cursor-pointer transition select-none ${
                            isSelected
                              ? 'bg-emerald-50/80 hover:bg-emerald-100/80'
                              : 'hover:bg-slate-100'
                          }`}
                        >
                          <div
                            className={`w-full py-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-xs scale-102'
                                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {isSelected ? (
                              <CheckCircle2 className="w-5 h-5 text-white" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
                            )}
                            <span className="text-[10px] mt-1 font-semibold">
                              {isSelected ? 'Đã Chọn' : 'Trống'}
                            </span>
                          </div>
                        </td>
                      );
                    })}

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Registration Notes & Save */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú nguyện vọng thêm (ví dụ: bận tối T5, ưu tiên ca sáng)..."
              className="w-full sm:max-w-md bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
            />

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu Đăng Ký Ca Làm Việc'}</span>
            </button>
          </div>

        </div>

      ) : (

        /* OFFICIAL PUBLISHED SCHEDULE VIEW (WHEN CLOSED / PUBLISHED) */
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h4 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Lịch Phân Ca Chính Thức ({scheduleConfig.weekLabel})</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Các ca của bạn được đánh dấu màu nổi bật. Hãy đến đúng giờ theo ca phân công.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewOnlyMyShifts(!viewOnlyMyShifts)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  viewOnlyMyShifts
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {viewOnlyMyShifts ? '✅ Đang lọc: Chỉ ca của tôi' : '👁️ Xem toàn bộ lịch'}
              </button>

              <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
                Bạn được phân: <strong>{myAssignedSlots.length}</strong> ca ({myAssignedSlots.length * 5} giờ)
              </span>
            </div>
          </div>

          {/* VISUAL OFFICIAL SCHEDULE TABLE */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left border-collapse min-w-[700px]">
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
                  <tr key={shift.id} className="hover:bg-slate-50/50">
                    
                    <td className="p-3 bg-slate-50 font-bold text-slate-800 border-r border-slate-200 align-top">
                      <div className="text-xs font-bold text-slate-900">
                        {shift.id === 'CA_1' ? 'Ca 1 (Sáng)' : shift.id === 'CA_2' ? 'Ca 2 (Chiều)' : 'Ca 3 (Tối)'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {shift.startTime} - {shift.endTime}
                      </div>
                    </td>

                    {DAYS_OF_WEEK.map((day) => {
                      const slotKey = getSlotKey(day.key, shift.id);
                      const assignedIds = weeklySchedule?.slots?.[slotKey] || [];
                      const isMyShift = assignedIds.includes(currentEmpId);

                      if (viewOnlyMyShifts && !isMyShift) {
                        return (
                          <td key={day.key} className="p-2 border-r border-slate-200 bg-slate-50/50 text-center">
                            <span className="text-[10px] text-slate-300">-</span>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={day.key}
                          className={`p-2.5 border-r border-slate-200 align-top transition ${
                            isMyShift ? 'bg-emerald-50/80' : ''
                          }`}
                        >
                          <div className="space-y-1 min-h-[44px]">
                            {assignedIds.length === 0 ? (
                              <span className="text-[10px] text-slate-300 italic block text-center py-2">
                                Trống
                              </span>
                            ) : (
                              assignedIds.map((id) => {
                                const isMe = id === currentEmpId;
                                const emp = employees.find((e) => e.id === id);

                                return (
                                  <div
                                    key={id}
                                    className={`p-1.5 rounded-xl border text-[11px] flex items-center justify-between ${
                                      isMe
                                        ? 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-xs'
                                        : 'bg-white text-slate-700 border-slate-200'
                                    }`}
                                  >
                                    <span className="truncate">
                                      {isMe ? '⭐ Bạn (' + (emp?.name.split(' ').pop() || 'Tôi') + ')' : emp?.name || id}
                                    </span>
                                  </div>
                                );
                              })
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

      )}

    </div>
  );
};
