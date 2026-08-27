export interface Branch {
  id: string; // e.g. "CN_HN_01"
  name: string; // e.g. "Chi Nhánh Hà Nội (Trụ Sở Chính)"
  code: string; // e.g. "HN-HQ"
  address: string; // e.g. "Tầng 4, Tòa Golden Palm, 21 Lê Văn Lương, Cầu Giấy, Hà Nội"
  phone?: string;
  managerName?: string;
  color?: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose' | 'indigo' | 'cyan' | string;
  isActive: boolean;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  createdAt?: string;
  description?: string;
}

export interface Employee {
  id: string; // Mã NV (e.g. NV001)
  name: string; // Tên NV
  department: string; // Phòng ban
  email: string;
  phone?: string;
  password?: string;
  avatar?: string;
  role: 'Quản lý' | 'Nhân viên' | string;
  active: boolean;
  branchId?: string; // ID của Chi nhánh trực thuộc (e.g. "CN_HN_01")
  registeredDeviceId?: string; // Mã máy đã đăng ký chính thức (e.g. DEV-IPHONE-9482)
  registeredDeviceName?: string; // Tên thiết bị (e.g. iPhone 15 Pro - Safari)
  deviceRegisteredAt?: string; // Ngày giờ đăng ký thiết bị lần đầu
  hourlyRate?: number; // Mức lương theo giờ (VNĐ)
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
  department: string;
  branchId?: string; // Chi nhánh trực thuộc
  employeeId?: string;
  phone?: string;
}

export interface Shift {
  id: 'CA_1' | 'CA_2' | 'CA_3' | string;
  name: string;
  startTime: string; // "08:00"
  endTime: string; // "13:00"
  durationHours: number; // 5 hours
  gracePeriodLate: number; // phút cho phép đi muộn (e.g. 15)
  gracePeriodEarly: number; // phút cho phép về sớm (e.g. 15)
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  branchId?: string; // Chi nhánh làm việc
  branchName?: string;
  timestamp: string; // "27/08/2026 08:05:20"
  isoDate: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  shiftId: 'CA_1' | 'CA_2' | 'CA_3' | string;
  shiftName: string;
  gps: {
    lat: number;
    lng: number;
    accuracy?: number;
    address?: string;
    isWithinOffice?: boolean;
    distanceToOfficeMeters?: number;
  };
  workMode: 'OFFICE' | 'WFH' | 'CLIENT' | 'BUSINESS_TRIP';
  status: string;
  note?: string;
  photoUrl?: string;
  deviceInfo?: string;
  deviceId?: string; // Mã định danh máy hiện tại (e.g. DEV-IPHONE-7A9B)
  deviceName?: string; // Tên máy (e.g. iPhone 15 Pro)
  deviceStatus?: 'VALID_REGISTERED' | 'AUTO_REGISTERED' | 'MISMATCH_BLOCKED' | 'UNRESTRICTED';
  clientIp?: string; // Địa chỉ IP mạng (e.g. 113.190.234.56)
  wifiSsid?: string; // Tên WiFi kết nối (e.g. COMPANY_HQ_5G)
  isWifiValid?: boolean; // Khớp với WiFi văn phòng
  workHoursCalculated?: number; // Số giờ làm việc ghi nhận
}

export interface EmployeeWorkSummary {
  employeeId: string;
  employeeName: string;
  department: string;
  branchId?: string;
  totalWorkHours: number;
  totalShifts: number;
  shift1Count: number; // Ca 1 (8h-13h)
  shift2Count: number; // Ca 2 (13h-18h)
  shift3Count: number; // Ca 3 (18h-23h)
  onTimeCount: number;
  lateCount: number;
  earlyLeaveCount: number;
  records: AttendanceRecord[];
}

export interface OfficeWifiNetwork {
  id: string;
  branchId?: string; // Chi nhánh quản lý WiFi này
  ssid: string; // Tên WiFi văn phòng (e.g. COMPANY_HQ_OFFICE_5G)
  ip: string; // Địa chỉ IP công cộng (Public IP / Static IP)
  bssid?: string; // Địa chỉ MAC Access Point (e.g. 00:1A:2B:3C:4D:5E)
  locationName: string; // Tên địa điểm / Chi nhánh (e.g. Trụ sở chính - Tầng 4)
  description?: string; // Ghi chú router/nhà mạng
  isActive: boolean;
  registeredAt: string;
}

export interface OfficeConfig {
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number; // e.g. 300m
  requireGps: boolean;
  allowWfh: boolean;
  cameraRequired: boolean;
  officeWifiSsid: string; // Tên WiFi văn phòng chính hợp lệ
  officeWifiIp: string; // Địa chỉ Public IP chính của WiFi văn phòng
  requireWifiCheck: boolean; // Bắt buộc kết nối đúng WiFi văn phòng
  requireDeviceLock: boolean; // Bắt buộc chỉ chấm công trên máy đã đăng ký (Chống chấm công hộ)
  authorizedWifiList?: OfficeWifiNetwork[]; // Danh sách các mạng WiFi văn phòng đã đăng ký
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

export type DayOfWeekKey = 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN';

export interface ShiftRegistration {
  employeeId: string;
  employeeName: string;
  department: string;
  branchId?: string;
  selectedSlots: string[]; // e.g. ['T2_CA_1', 'T2_CA_2', 'T3_CA_1']
  maxShiftsPerWeek?: number;
  note?: string;
  updatedAt: string;
}

export interface ShiftScheduleConfig {
  isRegistrationOpen: boolean; // Quản lý mở hoặc đóng đăng ký
  weekLabel: string; // e.g. "Tuần 35 (24/08 - 30/08/2026)"
  requiredStaffPerShift: number; // Mặc định 2 người/ca
  isPublished: boolean; // Đã công bố lịch chính thức cho nhân viên xem
  publishedAt?: string;
  allowAutoFillIfLacking?: boolean; // Tự động gán thêm nhân viên nếu thiếu đăng ký
}

export interface WeeklySchedule {
  weekLabel: string;
  slots: Record<string, string[]>; // Key: "T2_CA_1", Value: ["NV001", "NV002"]
  lastAutoScheduledAt?: string;
  lastEditedAt?: string;
  isPublished: boolean;
}
