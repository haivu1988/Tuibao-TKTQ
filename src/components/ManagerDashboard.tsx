import React, { useState } from 'react';
import {
  Employee,
  Shift,
  AttendanceRecord,
  OfficeConfig,
  ToastMessage,
  AuthUser,
  EmployeeWorkSummary,
  ShiftRegistration,
  ShiftScheduleConfig,
  WeeklySchedule
} from '../types';
import {
  Users,
  Clock,
  UserPlus,
  Trash2,
  Search,
  Filter,
  Download,
  Shield,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  KeyRound,
  Eye,
  Building2,
  Calendar,
  Layers,
  FileSpreadsheet,
  Settings,
  ChevronRight,
  TrendingUp,
  BarChart3,
  LogOut,
  Edit2,
  AlertCircle,
  Wifi,
  MapPin
} from 'lucide-react';
import { calculateAllEmployeesWorkSummary, exportWorkHoursToCsv, formatHours } from '../utils/workHours';
import { getGoogleMapsUrl } from '../utils/geolocation';
import { ShiftScheduleManager } from './ShiftScheduleManager';
import { WifiConfigManager } from './WifiConfigManager';
import { BranchClusterManager } from './BranchClusterManager';
import { Branch } from '../types';

interface ManagerDashboardProps {
  currentUser: AuthUser;
  employees: Employee[];
  shifts: Shift[];
  branches?: Branch[];
  attendanceRecords: AttendanceRecord[];
  officeConfig: OfficeConfig;
  registrations: Record<string, ShiftRegistration>;
  scheduleConfig: ShiftScheduleConfig;
  weeklySchedule: WeeklySchedule;
  onUpdateBranches?: (branches: Branch[]) => void;
  onUpdateEmployees: (employees: Employee[]) => void;
  onUpdateConfig: (config: OfficeConfig) => void;
  onUpdateScheduleConfig: (config: ShiftScheduleConfig) => void;
  onUpdateSchedule: (schedule: WeeklySchedule) => void;
  onUpdateRegistrations: (registrations: Record<string, ShiftRegistration>) => void;
  onLogout: () => void;
  showToast: (type: ToastMessage['type'], title: string, message: string) => void;
  onSwitchToEmployeeTab: (employeeId?: string) => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  currentUser,
  employees,
  shifts,
  branches = [],
  attendanceRecords,
  officeConfig,
  registrations,
  scheduleConfig,
  weeklySchedule,
  onUpdateBranches,
  onUpdateEmployees,
  onUpdateConfig,
  onUpdateScheduleConfig,
  onUpdateSchedule,
  onUpdateRegistrations,
  onLogout,
  showToast,
  onSwitchToEmployeeTab
}) => {
  const [subTab, setSubTab] = useState<'SHIFT_SCHEDULE' | 'BRANCH_CLUSTERS' | 'EMPLOYEE_LIST' | 'WORK_HOURS' | 'ACCOUNT_MANAGEMENT' | 'WIFI_CONFIG'>('SHIFT_SCHEDULE');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('ALL');

  // Add Employee Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const nextEmpId = `NV${String(employees.length + 1).padStart(3, '0')}`;
  const [newEmp, setNewEmp] = useState<Partial<Employee>>({
    id: nextEmpId,
    name: '',
    department: 'Phòng Kỹ Thuật',
    branchId: branches[0]?.id || 'CN_HN_01',
    email: '',
    phone: '',
    role: 'Nhân viên',
    password: '123',
    active: true,
    hourlyRate: 50000
  });

  // Delete Employee Confirmation Modal
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Edit Employee Modal
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);

  // Calculate work hours summaries
  const workSummaries = calculateAllEmployeesWorkSummary(employees, attendanceRecords).filter((summary) => {
    if (selectedBranchFilter === 'ALL') return true;
    const emp = employees.find((e) => e.id === summary.employeeId);
    return emp?.branchId === selectedBranchFilter;
  });

  // Filtered employees
  const filteredEmployees = employees.filter((emp) => {
    const matchSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.registeredDeviceId && emp.registeredDeviceId.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchDept = selectedDept === 'ALL' ? true : emp.department === selectedDept;
    const matchBranch = selectedBranchFilter === 'ALL' ? true : emp.branchId === selectedBranchFilter;

    return matchSearch && matchDept && matchBranch;
  });

  // Departments list
  const departments = ['ALL', ...Array.from(new Set(employees.map((e) => e.department)))];

  // Overall Statistics
  const totalEmployees = employees.length;
  const totalHoursWorked = workSummaries.reduce((sum, s) => sum + s.totalWorkHours, 0);
  const activeAttendeesToday = new Set(attendanceRecords.map((r) => r.employeeId)).size;
  const totalLateCount = workSummaries.reduce((sum, s) => sum + s.lateCount, 0);
  const totalOnTimeCount = workSummaries.reduce((sum, s) => sum + s.onTimeCount, 0);
  const onTimePercentage =
    totalOnTimeCount + totalLateCount > 0
      ? Math.round((totalOnTimeCount / (totalOnTimeCount + totalLateCount)) * 100)
      : 100;

  // Add Employee Handler
  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.id || !newEmp.name || !newEmp.email) {
      showToast('warning', 'Thiếu thông tin', 'Vui lòng nhập đầy đủ Mã NV, Họ tên và Email');
      return;
    }

    // Check duplicate
    if (employees.some((emp) => emp.id.toLowerCase() === newEmp.id?.trim().toLowerCase())) {
      showToast('error', 'Trùng mã NV', `Mã nhân viên ${newEmp.id} đã tồn tại!`);
      return;
    }

    const created: Employee = {
      id: newEmp.id.trim().toUpperCase(),
      name: newEmp.name.trim(),
      department: newEmp.department || 'Phòng Kỹ Thuật',
      email: newEmp.email.trim().toLowerCase(),
      phone: newEmp.phone?.trim() || '0901234567',
      role: newEmp.role || 'Nhân viên',
      password: newEmp.password || '123',
      active: true,
      registeredDeviceId: undefined,
      registeredDeviceName: undefined,
      deviceRegisteredAt: undefined,
      hourlyRate: Number(newEmp.hourlyRate) || 50000
    };

    onUpdateEmployees([...employees, created]);
    setShowAddModal(false);
    showToast('success', 'Thêm thành công', `Đã thêm tài khoản nhân viên ${created.name} (${created.id})`);

    // Reset next
    setNewEmp({
      id: `NV${String(employees.length + 2).padStart(3, '0')}`,
      name: '',
      department: 'Phòng Kỹ Thuật',
      email: '',
      phone: '',
      role: 'Nhân viên',
      password: '123',
      active: true,
      hourlyRate: 50000
    });
  };

  // Delete Employee Handler
  const handleConfirmDelete = () => {
    if (!employeeToDelete) return;

    if (employees.length <= 1) {
      showToast('warning', 'Không thể xóa', 'Hệ thống cần giữ ít nhất 1 tài khoản nhân viên');
      setEmployeeToDelete(null);
      return;
    }

    const updated = employees.filter((e) => e.id !== employeeToDelete.id);
    onUpdateEmployees(updated);
    showToast('info', 'Đã xóa tài khoản', `Đã xóa tài khoản nhân viên ${employeeToDelete.name} (${employeeToDelete.id})`);
    setEmployeeToDelete(null);
  };

  // Edit Employee Handler
  const handleSaveEditEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeToEdit) return;

    const updated = employees.map((emp) => (emp.id === employeeToEdit.id ? employeeToEdit : emp));
    onUpdateEmployees(updated);
    showToast('success', 'Cập nhật thành công', `Đã lưu thông tin tài khoản ${employeeToEdit.name}`);
    setEmployeeToEdit(null);
  };

  // Reset Device ID
  const handleResetDevice = (emp: Employee) => {
    const updated = employees.map((item) => {
      if (item.id === emp.id) {
        return {
          ...item,
          registeredDeviceId: undefined,
          registeredDeviceName: undefined,
          deviceRegisteredAt: undefined
        };
      }
      return item;
    });

    onUpdateEmployees(updated);
    showToast(
      'success',
      'Đã mở khóa thiết bị',
      `Đã xóa mã máy của ${emp.name}. Ở lần điểm danh kế tiếp trên máy mới, hệ thống sẽ tự động đăng ký lại!`
    );
  };

  return (
    <div className="space-y-6">
      
      {/* TOP HEADER: MANAGER PROFILE & SUMMARY */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                Bảng Điều Khiển Quản Lý
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Quyền Quản Trị Hệ Thống
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Đang đăng nhập: <strong>{currentUser.name}</strong> ({currentUser.email}) • {currentUser.department}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onSwitchToEmployeeTab()}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200/60 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mở Tab Điểm Danh NV</span>
          </button>

          <button
            onClick={onLogout}
            className="px-3.5 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng Xuất</span>
          </button>
        </div>
      </div>

      {/* TOP 4 KEY METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Danh Sách Nhân Viên</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-light text-slate-800">{totalEmployees}</span>
            <span className="text-xs font-semibold text-slate-400">nhân sự</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Đầy đủ hồ sơ & mã máy</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Tổng Giờ Làm Việc</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-light text-slate-800">{totalHoursWorked.toFixed(1)}</span>
            <span className="text-xs font-semibold text-emerald-600">giờ công</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Tính theo 3 Ca làm việc</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Có Mặt Hôm Nay</span>
            <CheckCircle2 className="w-4 h-4 text-teal-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-light text-slate-800">{activeAttendeesToday}</span>
            <span className="text-xs font-semibold text-slate-400">/ {totalEmployees}</span>
          </div>
          <p className="text-[10px] text-teal-600 font-semibold mt-1">Đã Check-in vào ca</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Tỉ Lệ Đúng Giờ</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-light text-slate-800">{onTimePercentage}%</span>
            <span className="text-xs font-semibold text-amber-600">{totalLateCount} muộn</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Được kiểm soát tự động</p>
        </div>

      </div>

      {/* 3 CORE MANAGER SUB-TABS */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Navigation Bar for Manager Tabs */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/60">
          
          <div className="flex items-center space-x-1.5 bg-slate-200/70 p-1 rounded-2xl flex-wrap">
            <button
              onClick={() => setSubTab('SHIFT_SCHEDULE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                subTab === 'SHIFT_SCHEDULE'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>1. Phân Chia Ca & Đăng Ký</span>
            </button>

            <button
              onClick={() => setSubTab('BRANCH_CLUSTERS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                subTab === 'BRANCH_CLUSTERS'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>2. Cụm Chi Nhánh & Điểm Làm</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-800">
                {branches.length}
              </span>
            </button>

            <button
              onClick={() => setSubTab('EMPLOYEE_LIST')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                subTab === 'EMPLOYEE_LIST'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>3. Danh Sách Nhân Viên</span>
            </button>

            <button
              onClick={() => setSubTab('WORK_HOURS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                subTab === 'WORK_HOURS'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>4. Số Giờ Làm Việc</span>
            </button>

            <button
              onClick={() => setSubTab('ACCOUNT_MANAGEMENT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                subTab === 'ACCOUNT_MANAGEMENT'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>5. Thêm / Xóa Tài Khoản</span>
            </button>

            <button
              onClick={() => setSubTab('WIFI_CONFIG')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                subTab === 'WIFI_CONFIG'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wifi className="w-3.5 h-3.5 text-blue-600" />
              <span>6. Đăng Ký Địa Chỉ WiFi</span>
              {(officeConfig.authorizedWifiList || []).length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
          </div>

          {/* Action on right */}
          <div className="flex items-center gap-2">
            {subTab === 'WORK_HOURS' ? (
              <button
                onClick={() => {
                  exportWorkHoursToCsv(workSummaries);
                  showToast('success', 'Đã xuất file', 'Đã tải xuống bảng thống kê giờ làm việc định dạng CSV');
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Báo Cáo Giờ Làm</span>
              </button>
            ) : (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Thêm Nhân Viên Mới</span>
              </button>
            )}
          </div>

        </div>

        {/* =========================================================================
            SUB-TAB 0: PHÂN CHIA CA LÀM VIỆC & ĐĂNG KÝ
        ========================================================================== */}
        {subTab === 'SHIFT_SCHEDULE' && (
          <div className="p-6">
            <ShiftScheduleManager
              employees={employees}
              shifts={shifts}
              branches={branches}
              registrations={registrations}
              scheduleConfig={scheduleConfig}
              weeklySchedule={weeklySchedule}
              onUpdateConfig={onUpdateScheduleConfig}
              onUpdateSchedule={onUpdateSchedule}
              onUpdateRegistrations={onUpdateRegistrations}
              showToast={showToast}
            />
          </div>
        )}

        {/* =========================================================================
            SUB-TAB 1: CỤM CHI NHÁNH & ĐIỂM LÀM VIỆC TÁCH BIỆT
        ========================================================================== */}
        {subTab === 'BRANCH_CLUSTERS' && (
          <div className="p-6">
            <BranchClusterManager
              branches={branches}
              employees={employees}
              officeConfig={officeConfig}
              onUpdateBranches={onUpdateBranches || (() => {})}
              onUpdateEmployees={onUpdateEmployees}
              onUpdateConfig={onUpdateConfig}
              showToast={showToast}
            />
          </div>
        )}

        {/* =========================================================================
            SUB-TAB 2: DANH SÁCH NHÂN VIÊN
        ========================================================================== */}
        {subTab === 'EMPLOYEE_LIST' && (
          <div className="p-6 space-y-4">
            
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên, mã NV, email, mã máy..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pl-9 text-xs text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                {/* Branch filter */}
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedBranchFilter}
                    onChange={(e) => setSelectedBranchFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:bg-white"
                  >
                    <option value="ALL">Tất cả chi nhánh ({employees.length})</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({employees.filter(e => e.branchId === b.id).length})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 shrink-0">Phòng ban:</span>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:bg-white"
                  >
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept === 'ALL' ? 'Tất cả phòng ban' : dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Employee Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-4 py-3">Mã NV</th>
                      <th className="px-4 py-3">Họ Và Tên</th>
                      <th className="px-4 py-3">Chi Nhánh</th>
                      <th className="px-4 py-3">Phòng Ban / Vị Trí</th>
                      <th className="px-4 py-3">Email & SĐT</th>
                      <th className="px-4 py-3">Mã Thiết Bị (Device ID)</th>
                      <th className="px-4 py-3">Trạng Thái Máy</th>
                      <th className="px-4 py-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-100">
                    {filteredEmployees.map((emp) => {
                      const hasDevice = Boolean(emp.registeredDeviceId);
                      const branch = branches.find((b) => b.id === emp.branchId);
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                          
                          <td className="px-4 py-3 font-mono font-bold text-slate-800 text-[11px]">
                            {emp.id}
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{emp.name}</div>
                            <div className="text-[10px] text-slate-400">{emp.role}</div>
                          </td>

                          <td className="px-4 py-3">
                            {branch ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 inline-flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-blue-500" />
                                {branch.name.split('(')[0].trim()}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Chưa gán</span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {emp.department}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            <div>{emp.email}</div>
                            <div className="text-[10px] text-slate-400">{emp.phone || '090-xxx-xxxx'}</div>
                          </td>

                          <td className="px-4 py-3">
                            {hasDevice ? (
                              <div>
                                <span className="font-mono font-bold text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                                  {emp.registeredDeviceId}
                                </span>
                                <div className="text-[9px] text-slate-400 mt-0.5">{emp.registeredDeviceName || 'Di động'}</div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-blue-600 font-semibold italic bg-blue-50 px-2 py-0.5 rounded">
                                ✨ Tự gán ở lần đầu
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {hasDevice ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã Khóa Máy
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                <Clock className="w-3 h-3 text-amber-600" /> Chờ Đăng Ký
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {hasDevice && (
                                <button
                                  onClick={() => handleResetDevice(emp)}
                                  title="Mở khóa để nhân viên đổi điện thoại mới"
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-slate-600 text-xs transition cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => setEmployeeToEdit(emp)}
                                title="Chỉnh sửa thông tin"
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 hover:text-blue-800 text-slate-600 text-xs transition cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setEmployeeToDelete(emp)}
                                title="Xóa tài khoản nhân viên"
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 text-xs transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
        )}

        {/* =========================================================================
            SUB-TAB 2: SỐ GIỜ LÀM VIỆC (WORK HOURS ANALYTICS & CA LÀM)
        ========================================================================== */}
        {subTab === 'WORK_HOURS' && (
          <div className="p-6 space-y-6">
            
            {/* Shift Definitions Info Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {shifts.map((s, idx) => (
                <div key={s.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                      {s.id === 'CA_1' ? 'Ca 1: Sáng' : s.id === 'CA_2' ? 'Ca 2: Chiều' : 'Ca 3: Tối'}
                    </span>
                    <h4 className="font-bold text-slate-800 text-xs mt-1">{s.name}</h4>
                    <p className="text-[11px] text-slate-500 font-mono">{s.startTime} - {s.endTime} ({s.durationHours} giờ công)</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                    5h
                  </div>
                </div>
              ))}
            </div>

            {/* Work Hours Summary Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Bảng Thống Kê Giờ Làm Việc Từng Nhân Viên
                </h3>
                <span className="text-[10px] font-bold text-slate-400">
                  Dựa trên các lượt Check-in & Check-out
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                      <th className="px-4 py-3">Nhân Viên</th>
                      <th className="px-4 py-3">Phòng Ban</th>
                      <th className="px-4 py-3 text-center">Ca 1 (8h-13h)</th>
                      <th className="px-4 py-3 text-center">Ca 2 (13h-18h)</th>
                      <th className="px-4 py-3 text-center">Ca 3 (18h-23h)</th>
                      <th className="px-4 py-3 text-center">Tổng Số Ca</th>
                      <th className="px-4 py-3 text-right">Tổng Giờ Làm</th>
                      <th className="px-4 py-3 text-center">Chuyên Cần</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-100">
                    {workSummaries.map((summary) => (
                      <tr key={summary.employeeId} className="hover:bg-slate-50/80 transition-colors">
                        
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800">{summary.employeeName}</div>
                          <div className="text-[10px] font-mono text-slate-400">{summary.employeeId}</div>
                        </td>

                        <td className="px-4 py-3 text-slate-600 font-medium">
                          {summary.department}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded text-[11px]">
                            {summary.shift1Count} ca
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded text-[11px]">
                            {summary.shift2Count} ca
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 font-bold rounded text-[11px]">
                            {summary.shift3Count} ca
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center font-bold text-slate-800">
                          {summary.totalShifts} ca
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="font-bold text-emerald-700 text-sm">
                            {formatHours(summary.totalWorkHours)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            ~{(summary.totalWorkHours / 8).toFixed(1)} ngày công
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center">
                          {summary.lateCount > 0 ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              {summary.lateCount} lần muộn
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              100% Chuẩn
                            </span>
                          )}
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Real-time transaction records */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nhật Ký Chấm Công Chi Tiết Hôm Nay
                </h4>
                <span className="text-[10px] text-slate-500 font-mono">
                  Tổng {attendanceRecords.length} lượt
                </span>
              </div>

              <div className="space-y-2">
                {attendanceRecords.slice(0, 5).map((rec) => (
                  <div key={rec.id} className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                        rec.type === 'CHECK_IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {rec.type === 'CHECK_IN' ? 'Vào Ca' : 'Ra Ca'}
                      </span>
                      <div>
                        <div className="font-bold text-slate-800">
                          {rec.employeeName} ({rec.employeeId}) • <span className="font-normal text-slate-500">{rec.shiftName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Giờ: {rec.timestamp} • Thiết bị: {rec.deviceId || 'DEV-AUTO'} • {rec.wifiSsid || 'WiFi Cty'}
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-50 px-2 py-1 rounded-md">
                      {rec.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* =========================================================================
            SUB-TAB 3: THÊM HOẶC XÓA TÀI KHOẢN NHÂN VIÊN
        ========================================================================== */}
        {subTab === 'ACCOUNT_MANAGEMENT' && (
          <div className="p-6 space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Form Thêm Tài Khoản Mới */}
              <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 text-slate-800">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-sm">Thêm Tài Khoản Nhân Viên</h3>
                </div>
                <p className="text-xs text-slate-500">
                  Tạo tài khoản để nhân viên có thể đăng nhập vào ứng dụng và điểm danh.
                </p>

                <form onSubmit={handleCreateEmployee} className="space-y-3">
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mã NV (*)</label>
                      <input
                        type="text"
                        value={newEmp.id}
                        onChange={(e) => setNewEmp({ ...newEmp, id: e.target.value.toUpperCase() })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 font-mono font-bold text-xs text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Họ và Tên (*)</label>
                      <input
                        type="text"
                        value={newEmp.name}
                        onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                        placeholder="Nguyễn Văn A"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email (*)</label>
                      <input
                        type="email"
                        value={newEmp.email}
                        onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                        placeholder="a.nguyen@company.com"
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Số điện thoại</label>
                      <input
                        type="tel"
                        value={newEmp.phone}
                        onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
                        placeholder="0912345678"
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phòng Ban</label>
                      <select
                        value={newEmp.department}
                        onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Phòng Kỹ Thuật">Phòng Kỹ Thuật</option>
                        <option value="Phòng Nhân Sự (HR)">Phòng Nhân Sự (HR)</option>
                        <option value="Phòng Kinh Doanh">Phòng Kinh Doanh</option>
                        <option value="Phòng Marketing">Phòng Marketing</option>
                        <option value="Phòng Kế Toán">Phòng Kế Toán</option>
                        <option value="Ban Vận Hành">Ban Vận Hành</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Chi Nhánh Trực Thuộc (*)</label>
                      <select
                        value={newEmp.branchId}
                        onChange={(e) => setNewEmp({ ...newEmp, branchId: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Chức danh</label>
                      <input
                        type="text"
                        value={newEmp.role}
                        onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
                        placeholder="Nhân viên"
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mật khẩu (*)</label>
                      <input
                        type="text"
                        value={newEmp.password}
                        onChange={(e) => setNewEmp({ ...newEmp, password: e.target.value })}
                        placeholder="Mặc định: 123"
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-mono text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Lưu và Tạo Tài Khoản</span>
                  </button>

                </form>
              </div>

              {/* Right Column: Danh Sách Thẻ Quản Lý & Xóa Tài Khoản */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-800">
                    Danh Sách Tài Khoản ({employees.length})
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Nhân viên có thể dùng Mã NV hoặc Email để đăng nhập
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {employees.map((emp) => (
                    <div
                      key={emp.id}
                      className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-slate-300 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs">
                          {emp.name.split(' ').slice(-1)[0][0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-xs">{emp.name}</span>
                            <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded font-bold">
                              {emp.id}
                            </span>
                            {(() => {
                              const b = branches.find((br) => br.id === emp.branchId);
                              return b ? (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200/50 flex items-center gap-0.5">
                                  <Building2 className="w-2.5 h-2.5" />
                                  {b.name.split('(')[0].trim()}
                                </span>
                              ) : null;
                            })()}
                            {emp.role.includes('Quản lý') && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                                Quản lý
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {emp.department} • {emp.email} • Pass: <code className="font-mono text-slate-700 bg-slate-100 px-1 rounded">{emp.password || '123'}</code>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEmployeeToEdit(emp)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" /> Sửa
                        </button>

                        <button
                          onClick={() => setEmployeeToDelete(emp)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

              </div>

            </div>

          </div>
        )}

        {/* =========================================================================
            SUB-TAB 4: ĐĂNG KÝ & QUẢN LÝ ĐỊA CHỈ WIFI CHẤM CÔNG
        ========================================================================== */}
        {subTab === 'WIFI_CONFIG' && (
          <div className="p-6">
            <WifiConfigManager
              officeConfig={officeConfig}
              branches={branches}
              onUpdateConfig={onUpdateConfig}
              showToast={showToast}
            />
          </div>
        )}

      </div>

      {/* =========================================================================
          MODAL: XÁC NHẬN XÓA TÀI KHOẢN NHÂN VIÊN
      ========================================================================== */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Xác nhận xóa tài khoản?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Bạn có chắc chắn muốn xóa nhân viên <strong>{employeeToDelete.name}</strong> ({employeeToDelete.id}) khỏi hệ thống?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEmployeeToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CHỈNH SỬA THÔNG TIN NHÂN VIÊN
      ========================================================================== */}
      {employeeToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-800">
                Chỉnh Sửa Tài Khoản {employeeToEdit.id}
              </h3>
              <button
                onClick={() => setEmployeeToEdit(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditEmployee} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Họ và Tên</label>
                <input
                  type="text"
                  value={employeeToEdit.name}
                  onChange={(e) => setEmployeeToEdit({ ...employeeToEdit, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                  <input
                    type="email"
                    value={employeeToEdit.email}
                    onChange={(e) => setEmployeeToEdit({ ...employeeToEdit, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 outline-none focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    value={employeeToEdit.phone || ''}
                    onChange={(e) => setEmployeeToEdit({ ...employeeToEdit, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phòng ban</label>
                  <input
                    type="text"
                    value={employeeToEdit.department}
                    onChange={(e) => setEmployeeToEdit({ ...employeeToEdit, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Chi Nhánh</label>
                  <select
                    value={employeeToEdit.branchId || branches[0]?.id || ''}
                    onChange={(e) => setEmployeeToEdit({ ...employeeToEdit, branchId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:bg-white"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mật khẩu</label>
                <input
                  type="text"
                  value={employeeToEdit.password || '123'}
                  onChange={(e) => setEmployeeToEdit({ ...employeeToEdit, password: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-mono text-slate-800 outline-none focus:bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEmployeeToEdit(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
