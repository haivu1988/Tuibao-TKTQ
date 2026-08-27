import React, { useState, useEffect } from 'react';
import {
  Employee,
  Shift,
  AttendanceRecord,
  OfficeConfig,
  ToastMessage,
  AuthUser,
  Branch
} from '../types';
import {
  Clock,
  MapPin,
  Wifi,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  RotateCw,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Radio,
  RefreshCw,
  ExternalLink,
  Laptop,
  User,
  LogOut,
  UserPlus,
  LogIn,
  Layers,
  Calendar,
  Shield,
  Building2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { calculateHaversineDistance, evaluateAttendance } from '../utils/geolocation';
import {
  SIMULATED_DEVICES,
  SIMULATED_NETWORKS,
  SimulatedDevice,
  SimulatedNetwork,
  getLocalDeviceId,
  getFriendlyDeviceName
} from '../utils/deviceWifi';
import { calculateAllEmployeesWorkSummary, formatHours } from '../utils/workHours';

interface AttendanceAppProps {
  currentUser?: AuthUser | null;
  employees: Employee[];
  shifts: Shift[];
  branches?: Branch[];
  officeConfig: OfficeConfig;
  attendanceHistory: AttendanceRecord[];
  onAddAttendanceRecord: (record: AttendanceRecord) => void;
  onUpdateEmployees?: (employees: Employee[]) => void;
  showToast: (type: ToastMessage['type'], title: string, message: string) => void;
  onOpenAuthModal?: (mode: 'LOGIN' | 'REGISTER') => void;
  onLogout?: () => void;
  onSwitchToManagerTab?: () => void;
  onSwitchToScheduleTab?: () => void;
  isRegistrationOpen?: boolean;
}

export const AttendanceApp: React.FC<AttendanceAppProps> = ({
  currentUser,
  employees,
  shifts,
  branches = [],
  officeConfig,
  attendanceHistory,
  onAddAttendanceRecord,
  onUpdateEmployees,
  showToast,
  onOpenAuthModal,
  onLogout,
  onSwitchToManagerTab,
  onSwitchToScheduleTab,
  isRegistrationOpen = true
}) => {
  // If currentUser is an employee, default to their ID, else the first employee
  const defaultEmpId = currentUser?.employeeId || employees[0]?.id || '';
  const [selectedEmpId, setSelectedEmpId] = useState<string>(defaultEmpId);
  const [selectedShiftId, setSelectedShiftId] = useState<string>(shifts[0]?.id || 'CA_1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<'CHECK_IN' | 'CHECK_OUT' | null>(null);

  // Sync selectedEmpId when currentUser changes
  useEffect(() => {
    if (currentUser?.employeeId) {
      setSelectedEmpId(currentUser.employeeId);
    }
  }, [currentUser]);

  // Device ID & WiFi State
  const [currentDeviceId, setCurrentDeviceId] = useState<string>(SIMULATED_DEVICES[0].id);
  const [currentDeviceName, setCurrentDeviceName] = useState<string>(SIMULATED_DEVICES[0].name);
  const [currentWifi, setCurrentWifi] = useState<SimulatedNetwork>(SIMULATED_NETWORKS[0]);

  // Real-time clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // GPS state
  const [gps, setGps] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    status: 'loading' | 'success' | 'error';
    errorMsg?: string;
  }>({
    lat: officeConfig.lat,
    lng: officeConfig.lng,
    accuracy: 15,
    status: 'loading'
  });

  // Real-time clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Request browser geolocation
  const fetchGps = () => {
    setGps((prev) => ({ ...prev, status: 'loading' }));
    if (!navigator.geolocation) {
      setGps({
        lat: officeConfig.lat,
        lng: officeConfig.lng,
        accuracy: 15,
        status: 'error',
        errorMsg: 'Trình duyệt không hỗ trợ Geolocation'
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          status: 'success'
        });
      },
      (err) => {
        let msg = 'Không lấy được GPS';
        if (err.code === err.PERMISSION_DENIED) msg = 'Người dùng từ chối cấp quyền GPS';
        else if (err.code === err.POSITION_UNAVAILABLE) msg = 'Vị trí GPS không khả dụng';
        else if (err.code === err.TIMEOUT) msg = 'Hết thời gian chờ GPS';

        setGps({
          lat: officeConfig.lat,
          lng: officeConfig.lng,
          accuracy: 20,
          status: 'error',
          errorMsg: msg
        });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    fetchGps();
  }, []);

  const selectedEmployee = employees.find((e) => e.id === selectedEmpId) || employees[0];
  const selectedShift = shifts.find((s) => s.id === selectedShiftId) || shifts[0];

  // Calculate work summary for this employee
  const empWorkSummary = calculateAllEmployeesWorkSummary([selectedEmployee], attendanceHistory)[0];

  // Calculate distance to office
  const distanceToOffice = calculateHaversineDistance(
    gps.lat,
    gps.lng,
    officeConfig.lat,
    officeConfig.lng
  );
  const isWithinOffice = distanceToOffice <= officeConfig.radiusMeters;

  // Filter history for current selected employee
  const employeeHistory = attendanceHistory.filter(
    (r) => r.employeeId === selectedEmployee?.id
  );

  // WiFi verification logic - checking primary and registered authorized wifi list
  const isOfficeWifi =
    currentWifi.isOffice ||
    currentWifi.ip === officeConfig.officeWifiIp ||
    currentWifi.ssid === officeConfig.officeWifiSsid ||
    (officeConfig.authorizedWifiList || []).some(
      (w) => w.isActive && (w.ip === currentWifi.ip || w.ssid === currentWifi.ssid)
    );

  // Latest attendance record for current selected employee to track shift status
  const latestEmployeeRecord = attendanceHistory
    .filter((r) => r.employeeId === selectedEmployee?.id)
    .sort((a, b) => new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime())[0];

  const isCurrentlyCheckedIn = latestEmployeeRecord?.type === 'CHECK_IN';

  // Dynamic simulated networks list including custom registered ones from officeConfig
  const customNetworks: SimulatedNetwork[] = (officeConfig.authorizedWifiList || [])
    .filter((w) => w.isActive)
    .map((w) => ({
      ssid: w.ssid,
      ip: w.ip,
      isOffice: true,
      label: `📶 ${w.ssid} (${w.locationName} - IP: ${w.ip})`
    }));

  const allSimulatedNetworks = [
    ...customNetworks,
    ...SIMULATED_NETWORKS.filter((n) => !customNetworks.some((c) => c.ssid === n.ssid))
  ];

  // Device registration status verification
  const isDeviceRegistered = Boolean(selectedEmployee?.registeredDeviceId);
  const isDeviceMatching = isDeviceRegistered && selectedEmployee?.registeredDeviceId === currentDeviceId;
  const isDeviceNew = !isDeviceRegistered; // Chưa đăng ký -> Sẽ tự động đăng ký lần đầu

  // Handle Simulated Device Change
  const handleDeviceChange = (dev: SimulatedDevice) => {
    setCurrentDeviceId(dev.id);
    setCurrentDeviceName(dev.name);
    showToast('info', 'Đã chuyển đổi thiết bị', `Đang mô phỏng: ${dev.name} (${dev.id})`);
  };

  // Handle Simulated Network Change
  const handleNetworkChange = (net: SimulatedNetwork) => {
    setCurrentWifi(net);
    showToast('info', 'Đã chuyển mạng kết nối', `Đang kết nối: ${net.ssid} (IP: ${net.ip})`);
  };

  // Submit attendance handler with Device & WiFi Verification
  const handleAttendance = async (type: 'CHECK_IN' | 'CHECK_OUT') => {
    if (!selectedEmployee) {
      showToast('warning', 'Chưa chọn nhân viên', 'Vui lòng chọn nhân viên trước khi chấm công!');
      return;
    }

    // 1. Kiểm tra WiFi văn phòng nếu bật requireWifiCheck
    if (officeConfig.requireWifiCheck && !isOfficeWifi) {
      showToast(
        'warning',
        'Cảnh báo WiFi Văn Phòng',
        `Bạn đang kết nối mạng ngoài (${currentWifi.ssid}). Chấm công tại văn phòng yêu cầu kết nối WiFi ${officeConfig.officeWifiSsid} (IP: ${officeConfig.officeWifiIp})`
      );
    }

    // 2. Kiểm tra mã máy đã đăng ký (Device Lock)
    if (officeConfig.requireDeviceLock && isDeviceRegistered && !isDeviceMatching) {
      showToast(
        'error',
        '⛔ Vi phạm: Thiết bị không trùng khớp!',
        `Máy đã đăng ký của bạn là ${selectedEmployee.registeredDeviceId} (${selectedEmployee.registeredDeviceName || 'Máy chính chủ'}). Máy hiện tại: ${currentDeviceId}. Chống chấm công hộ!`
      );
    }

    setIsSubmitting(true);
    setSubmittingAction(type);

    // Giả lập độ trễ kết nối mạng Apps Script
    await new Promise((resolve) => setTimeout(resolve, 650));

    const now = new Date();
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const timestampStr = `${dateFormatted} ${timeFormatted}`;

    let status = evaluateAttendance(
      type,
      now,
      selectedShift?.startTime || '08:00',
      selectedShift?.endTime || '13:00',
      selectedShift?.gracePeriodLate || 15,
      'OFFICE'
    );

    let deviceStatus: AttendanceRecord['deviceStatus'] = 'VALID_REGISTERED';
    let autoRegisteredMessage = '';

    // LOGIC: NẾU MÁY CHƯA ĐĂNG KÝ -> TỰ ĐỘNG ĐĂNG KÝ LẦN ĐẦU VÀO HỆ THỐNG
    if (isDeviceNew) {
      deviceStatus = 'AUTO_REGISTERED';
      const updatedEmployees = employees.map((emp) => {
        if (emp.id === selectedEmployee.id) {
          return {
            ...emp,
            registeredDeviceId: currentDeviceId,
            registeredDeviceName: currentDeviceName,
            deviceRegisteredAt: timestampStr
          };
        }
        return emp;
      });

      if (onUpdateEmployees) {
        onUpdateEmployees(updatedEmployees);
      }
      autoRegisteredMessage = `🎉 Thiết bị này (${currentDeviceId}) đã được TỰ ĐỘNG ĐĂNG KÝ là máy chính thức của ${selectedEmployee.name}!`;
    } else if (!isDeviceMatching && officeConfig.requireDeviceLock) {
      deviceStatus = 'MISMATCH_BLOCKED';
      status = `Cảnh báo: Sai mã máy (${currentDeviceId})`;
    }

    const recordId = `CC_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}_${selectedEmployee.id}`;

    const newRecord: AttendanceRecord = {
      id: recordId,
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      department: selectedEmployee.department,
      branchId: selectedEmployee.branchId,
      timestamp: timestampStr,
      isoDate: now.toISOString(),
      type: type,
      shiftId: selectedShift.id,
      shiftName: selectedShift.name,
      gps: {
        lat: gps.lat,
        lng: gps.lng,
        accuracy: gps.accuracy,
        isWithinOffice: isWithinOffice,
        distanceToOfficeMeters: distanceToOffice
      },
      workMode: 'OFFICE',
      status: status,
      note: '',
      photoUrl: undefined,
      deviceInfo: `${currentDeviceName} (ID: ${currentDeviceId})`,
      deviceId: currentDeviceId,
      deviceName: currentDeviceName,
      deviceStatus: deviceStatus,
      clientIp: currentWifi.ip,
      wifiSsid: currentWifi.ssid,
      isWifiValid: isOfficeWifi,
      workHoursCalculated: 5.0
    };

    onAddAttendanceRecord(newRecord);
    setIsSubmitting(false);
    setSubmittingAction(null);

    // Trigger confetti
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.75 }
      });
    } catch {
      // ignore
    }

    const actionText = type === 'CHECK_IN' ? 'VÀO CA (Check-in)' : 'RA CA (Check-out)';

    if (autoRegisteredMessage) {
      showToast('success', `Điểm danh ${actionText} thành công!`, autoRegisteredMessage);
    } else if (deviceStatus === 'MISMATCH_BLOCKED') {
      showToast('warning', `Ghi nhận có cảnh báo`, `${selectedEmployee.name} • Sai thiết bị đăng ký!`);
    } else {
      showToast(
        'success',
        `Điểm danh ${actionText} thành công!`,
        `${selectedEmployee.name} • ${selectedShift.name.split(':')[0]} • ${status} (${timeFormatted})`
      );
    }
  };

  // Format date display (Vietnamese)
  const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = daysOfWeek[currentTime.getDay()];
  const dateString = `${dayName}, ${String(currentTime.getDate()).padStart(2, '0')}/${String(currentTime.getMonth() + 1).padStart(2, '0')}/${currentTime.getFullYear()}`;
  const timeString = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}:${String(currentTime.getSeconds()).padStart(2, '0')}`;

  const [showSimModal, setShowSimModal] = useState(false);

  return (
    <div className="w-full space-y-3">
      {/* HEADER: EMERALD EMPLOYEE PROFILE BANNER */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-4 rounded-3xl text-white shadow-md shadow-emerald-700/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center font-bold text-sm backdrop-blur-xs border border-white/20">
              {selectedEmployee?.name
                ? selectedEmployee.name.split(' ').map((n) => n[0]).slice(-2).join('').toUpperCase()
                : 'NV'}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-bold tracking-tight leading-tight">
                  {selectedEmployee?.name || 'Nhân viên'}
                </h3>
                <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse" />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <p className="text-[10px] text-emerald-100 uppercase tracking-wider font-semibold">
                  {selectedEmployee?.id} • {selectedEmployee?.department}
                </p>
                {(() => {
                  const branch = branches.find((b) => b.id === selectedEmployee?.branchId);
                  return branch ? (
                    <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded-md text-white font-bold inline-flex items-center gap-0.5">
                      <Building2 className="w-2.5 h-2.5" />
                      {branch.name}
                    </span>
                  ) : null;
                })()}
              </div>
            </div>
          </div>

          {/* Quick Auth Actions */}
          <div className="flex items-center gap-1">
            {onOpenAuthModal && (
              <button
                type="button"
                onClick={() => onOpenAuthModal('LOGIN')}
                className="px-2.5 py-1.5 bg-white/15 hover:bg-white/25 rounded-xl text-[10px] font-bold transition flex items-center gap-1 cursor-pointer border border-white/15"
                title="Đổi tài khoản"
              >
                <User className="w-3 h-3" />
                <span>Đổi TK</span>
              </button>
            )}
          </div>
        </div>

        {/* Mini Personal Work Hours Summary Pill */}
        {empWorkSummary && (
          <div className="mt-3 pt-2.5 border-t border-white/15 flex items-center justify-between text-[11px]">
            <span className="text-emerald-100 font-medium">Giờ làm tích lũy:</span>
            <span className="font-bold bg-white/20 px-2.5 py-0.5 rounded-lg text-white font-mono border border-white/10">
              {formatHours(empWorkSummary.totalWorkHours)} ({empWorkSummary.totalShifts} ca)
            </span>
          </div>
        )}
      </div>

      {/* MAIN SCROLLABLE BODY */}
      <div className="space-y-3">
        {/* REAL-TIME DIGITAL CLOCK CARD */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-xs text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
          <h2 className="text-4xl sm:text-5xl font-light tracking-tight text-slate-800 font-mono">
            {timeString}
          </h2>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1">
            {dateString}
          </p>
        </div>

        {/* QUICK LINK TO WEEKLY SHIFT SCHEDULE & REGISTRATION */}
        {onSwitchToScheduleTab && (
          <button
            type="button"
            onClick={onSwitchToScheduleTab}
            className="w-full bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200/80 p-3 rounded-2xl flex items-center justify-between text-left transition cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-emerald-600 text-white rounded-xl flex items-center justify-center text-xs shadow-xs">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>{isRegistrationOpen ? 'Đang Mở Đăng Ký Ca Tuần' : 'Xem Lịch Phân Ca Tuần'}</span>
                  {isRegistrationOpen && (
                    <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full uppercase animate-pulse">
                      Mở
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">
                  {isRegistrationOpen ? 'Bấm để đăng ký ca T2 - CN của bạn' : 'Xem danh sách xếp ca tuần 35'}
                </p>
              </div>
            </div>
            <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-0.5">
              <span>Chi tiết</span>
              <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
            </div>
          </button>
        )}

        {/* 3 SHIFTS SELECTOR (CA 1: 8h-13h, CA 2: 13h-18h, CA 3: 18h-23h) */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Chọn Ca Làm Việc:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {shifts.map((shift) => {
                  const isSelected = selectedShiftId === shift.id;
                  let labelShort = 'Ca 1 (8h-13h)';
                  if (shift.id === 'CA_2') labelShort = 'Ca 2 (13h-18h)';
                  if (shift.id === 'CA_3') labelShort = 'Ca 3 (18h-23h)';

                  return (
                    <button
                      key={shift.id}
                      type="button"
                      onClick={() => setSelectedShiftId(shift.id)}
                      className={`p-2 rounded-xl text-center transition cursor-pointer border ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs'
                          : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-bold text-[11px] leading-tight">
                        {shift.id === 'CA_1' ? 'Ca 1' : shift.id === 'CA_2' ? 'Ca 2' : 'Ca 3'}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                        {shift.startTime}-{shift.endTime}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LIVE VERIFICATION STATUS: WIFI & REGISTERED DEVICE CARD */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-2.5">
              
              {/* 1. WiFi Status Indicator */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <div
                    className={`p-1.5 rounded-lg shrink-0 ${
                      isOfficeWifi ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    <Wifi className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{currentWifi.ssid}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold uppercase ${
                          isOfficeWifi ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isOfficeWifi ? 'WiFi Văn Phòng' : 'WiFi Ngoài/4G'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono">
                      IP: {currentWifi.ip} {isOfficeWifi ? '• Hợp lệ' : '• Không thuộc Cty'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Device ID & Registration Status Indicator */}
              <div className="pt-2 border-t border-slate-200/60 flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <div
                    className={`p-1.5 rounded-lg shrink-0 ${
                      isDeviceMatching
                        ? 'bg-emerald-100 text-emerald-700'
                        : isDeviceNew
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                      <span>Mã máy: {currentDeviceId}</span>
                      {isDeviceMatching && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                          ✅ Máy Chính Chủ
                        </span>
                      )}
                      {isDeviceNew && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 font-semibold animate-pulse">
                          ✨ Tự Gán Lần Đầu
                        </span>
                      )}
                      {!isDeviceMatching && !isDeviceNew && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 font-semibold">
                          ⛔ Sai Mã Máy
                        </span>
                      )}
                    </div>

                    {isDeviceNew && (
                      <p className="text-[10px] text-blue-700 leading-tight">
                        Chưa gán máy. Khi bấm <strong>Vào ca</strong>, hệ thống sẽ tự động đăng ký máy này!
                      </p>
                    )}
                    {isDeviceMatching && (
                      <p className="text-[10px] text-emerald-700 leading-tight">
                        Đã khớp với thiết bị chính chủ của {selectedEmployee?.name}.
                      </p>
                    )}
                    {!isDeviceMatching && !isDeviceNew && (
                      <p className="text-[10px] text-rose-600 leading-tight font-medium">
                        Đã đăng ký máy: {selectedEmployee?.registeredDeviceId}.
                      </p>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* EMPLOYEE SELECTION */}
            <div className="space-y-3">
              {/* Employee Selection Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nhân viên thực hiện:
                </label>
                <div className="relative">
                  <select
                    value={selectedEmpId}
                    onChange={(e) => setSelectedEmpId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none appearance-none cursor-pointer"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.id} - {emp.name} ({emp.registeredDeviceId ? `Máy: ${emp.registeredDeviceId}` : 'Chưa có máy'})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* DYNAMIC SINGLE ACTION BUTTON: TOGGLES BETWEEN CHECK-IN & CHECK-OUT */}
            <div className="space-y-2 py-1">
              
              {/* CURRENT SHIFT STATUS BADGE */}
              <div className="flex items-center justify-between px-1 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Trạng thái hiện tại:
                </span>
                {isCurrentlyCheckedIn ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1.5 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Đang trong ca (từ {latestEmployeeRecord?.timestamp.split(' ')[1] || '08:00'})</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>Chưa vào ca</span>
                  </span>
                )}
              </div>

              {/* ONLY 1 PROMINENT BUTTON: WHEN NOT CHECKED IN -> CHECK IN, WHEN CHECKED IN -> CHECK OUT */}
              {!isCurrentlyCheckedIn ? (
                /* CHECK-IN BUTTON (KHI CHƯA VÀO CA) */
                <button
                  type="button"
                  onClick={() => handleAttendance('CHECK_IN')}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.99] disabled:opacity-60 text-white rounded-2xl shadow-lg shadow-emerald-500/25 flex flex-col items-center justify-center transition-all cursor-pointer group"
                >
                  {isSubmitting && submittingAction === 'CHECK_IN' ? (
                    <div className="flex items-center gap-2 py-1">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-bold">Đang xử lý vào ca...</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-100 mb-0.5">
                        <LogIn className="w-3.5 h-3.5" />
                        <span>{isDeviceNew ? 'Vào Ca Lần Đầu • Tự Gán Máy' : 'Bắt Đầu Làm Việc'}</span>
                      </div>
                      <span className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                        <span>VÀO CA (CHECK-IN)</span>
                      </span>
                      <span className="text-[10px] text-emerald-100/90 font-medium mt-0.5">
                        Ca đang chọn: {selectedShift?.name.split(':')[0]} ({selectedShift?.startTime} - {selectedShift?.endTime})
                      </span>
                    </>
                  )}
                </button>
              ) : (
                /* CHECK-OUT BUTTON (TỰ ĐỘNG THAY ĐỔI THÀNH NÚT NÀY SAU KHI VÀO CA) */
                <button
                  type="button"
                  onClick={() => handleAttendance('CHECK_OUT')}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-gradient-to-r from-rose-500 via-rose-600 to-amber-600 hover:from-rose-600 hover:to-amber-700 active:scale-[0.99] disabled:opacity-60 text-white rounded-2xl shadow-lg shadow-rose-500/25 flex flex-col items-center justify-center transition-all cursor-pointer group"
                >
                  {isSubmitting && submittingAction === 'CHECK_OUT' ? (
                    <div className="flex items-center gap-2 py-1">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-bold">Đang ghi nhận ra ca...</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-rose-100 mb-0.5">
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Đang Làm Việc Từ {latestEmployeeRecord?.timestamp.split(' ')[1]}</span>
                      </div>
                      <span className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                        <span>RA CA (CHECK-OUT)</span>
                      </span>
                      <span className="text-[10px] text-rose-100/90 font-medium mt-0.5">
                        Bấm để kết thúc ca & ghi nhận tổng giờ làm việc
                      </span>
                    </>
                  )}
                </button>
              )}

            </div>

            {/* GPS LOCATION STATUS CARD */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center shrink-0">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div className="text-[10px] leading-tight">
                  <p className="font-bold text-slate-700">
                    {gps.status === 'loading'
                      ? 'Đang dò sóng GPS...'
                      : gps.status === 'success'
                      ? 'Định vị GPS: Hợp lệ'
                      : 'Định vị GPS: Tọa độ mẫu'}
                  </p>
                  <p className="text-slate-400 font-mono mt-0.5">
                    {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)} (~{distanceToOffice}m)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchGps}
                disabled={gps.status === 'loading'}
                className="p-1 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                title="Quét lại GPS"
              >
                <RotateCw className={`w-3 h-3 ${gps.status === 'loading' ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* RECENT EMPLOYEE ATTENDANCE HISTORY LIST */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Lịch sử gần đây ({selectedEmployee?.name?.split(' ').pop()})</span>
                <span>{employeeHistory.length} lượt</span>
              </div>

              <div className="space-y-1.5">
                {employeeHistory.length === 0 ? (
                  <p className="text-center py-3 text-slate-400 text-[11px]">
                    Chưa có lượt chấm công nào.
                  </p>
                ) : (
                  employeeHistory.slice(0, 3).map((item) => {
                    const isCheckIn = item.type === 'CHECK_IN';
                    return (
                      <div
                        key={item.id}
                        className="bg-slate-50 hover:bg-slate-100/70 p-2.5 rounded-2xl border border-slate-100 flex items-center justify-between text-xs transition"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase ${
                              isCheckIn
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/50'
                                : 'bg-slate-200/80 text-slate-700'
                            }`}
                          >
                            {isCheckIn ? 'Vào' : 'Ra'}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-800 text-[11px] flex items-center gap-1">
                              <span>{item.timestamp.split(' ')[1] || item.timestamp}</span>
                              <span className="text-[9px] text-slate-400 font-mono">
                                ({item.shiftName.split(':')[0]})
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {item.wifiSsid ? `WiFi: ${item.wifiSsid}` : 'Mạng văn phòng'}
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-medium text-slate-600">
                          {item.status}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
      </div>

      {/* QUICK TESTING SIMULATION CONTROLLER (COLLAPSIBLE) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-3.5 shadow-xs space-y-2.5">
        <button
          type="button"
          onClick={() => setShowSimModal(!showSimModal)}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Laptop className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mô Phỏng Thiết Bị & WiFi ({currentDeviceName.split(' ')[0]})</span>
          </div>
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            {showSimModal ? 'Thu gọn' : 'Đổi máy/WiFi'}
          </span>
        </button>

        {showSimModal && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            {/* 1. Select Simulated Device */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Mô phỏng máy đang dùng (Device ID):</span>
                <span className="text-emerald-600 font-mono">{currentDeviceId}</span>
              </label>
              <div className="grid grid-cols-1 gap-1">
                {SIMULATED_DEVICES.map((dev) => (
                  <button
                    key={dev.id}
                    type="button"
                    onClick={() => handleDeviceChange(dev)}
                    className={`p-2 rounded-xl text-left text-xs transition border flex items-center justify-between cursor-pointer ${
                      currentDeviceId === dev.id
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                        : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate pr-2">{dev.label}</span>
                    {currentDeviceId === dev.id && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Select Simulated Network */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Mô phỏng mạng ({allSimulatedNetworks.length} mạng):</span>
                <span className="text-slate-600 font-mono">{currentWifi.ssid}</span>
              </label>
              <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto pr-0.5">
                {allSimulatedNetworks.map((net) => (
                  <button
                    key={net.ssid}
                    type="button"
                    onClick={() => handleNetworkChange(net)}
                    className={`p-2 rounded-xl text-left text-xs transition border flex items-center justify-between cursor-pointer ${
                      currentWifi.ssid === net.ssid
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                        : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate pr-2">{net.label}</span>
                    {currentWifi.ssid === net.ssid && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
