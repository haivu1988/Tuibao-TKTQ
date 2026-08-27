import React, { useState } from 'react';
import {
  Smartphone,
  Code2,
  Table,
  Rocket,
  Clock,
  Sparkles,
  CheckCircle2,
  Activity,
  Layers,
  ArrowRight,
  Shield,
  User,
  LogIn,
  UserPlus,
  LogOut,
  ChevronDown,
  KeyRound,
  FileSpreadsheet
} from 'lucide-react';
import {
  INITIAL_EMPLOYEES,
  INITIAL_SHIFTS,
  INITIAL_OFFICE_CONFIG,
  INITIAL_BRANCHES,
  SAMPLE_ATTENDANCE_RECORDS
} from './data/initialData';
import {
  Employee,
  Shift,
  OfficeConfig,
  AttendanceRecord,
  ToastMessage,
  AuthUser,
  ShiftRegistration,
  ShiftScheduleConfig,
  WeeklySchedule,
  Branch
} from './types';
import { generateSampleRegistrations, runAutoScheduleAlgorithm } from './utils/autoSchedule';
import { AttendanceApp } from './components/AttendanceApp';
import { GasCodeStudio } from './components/GasCodeStudio';
import { AdminSheetView } from './components/AdminSheetView';
import { DeployGuide } from './components/DeployGuide';
import { ManagerDashboard } from './components/ManagerDashboard';
import { EmployeeShiftRegistration } from './components/EmployeeShiftRegistration';
import { AuthModal } from './components/AuthModal';
import { Toast } from './components/Toast';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'APP_PREVIEW' | 'SHIFT_SCHEDULE_VIEW' | 'MANAGER_DASHBOARD' | 'AUTH_VIEW' | 'GAS_CODE' | 'SHEET_DATA' | 'DEPLOY_GUIDE'
  >('APP_PREVIEW');
  
  // App state
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [shifts, setShifts] = useState<Shift[]>(INITIAL_SHIFTS);
  const [officeConfig, setOfficeConfig] = useState<OfficeConfig>(INITIAL_OFFICE_CONFIG);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(SAMPLE_ATTENDANCE_RECORDS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Shift Scheduling State
  const initialRegs = generateSampleRegistrations(INITIAL_EMPLOYEES);
  const initialAutoSched = runAutoScheduleAlgorithm(INITIAL_EMPLOYEES, initialRegs, INITIAL_SHIFTS, 2).schedule;

  const [scheduleConfig, setScheduleConfig] = useState<ShiftScheduleConfig>({
    isRegistrationOpen: true,
    weekLabel: 'Tuần 35 (24/08 - 30/08/2026)',
    requiredStaffPerShift: 2,
    isPublished: true
  });
  const [registrations, setRegistrations] = useState<Record<string, ShiftRegistration>>(initialRegs);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({
    weekLabel: 'Tuần 35 (24/08 - 30/08/2026)',
    slots: initialAutoSched,
    isPublished: true,
    lastAutoScheduledAt: '27/08/2026 10:00'
  });

  // Authentication State
  // Default: Logged in as NV001 (Nguyễn Văn An) for quick demo, or null
  const [currentUser, setCurrentUser] = useState<AuthUser | null>({
    id: INITIAL_EMPLOYEES[0].id,
    name: INITIAL_EMPLOYEES[0].name,
    email: INITIAL_EMPLOYEES[0].email,
    role: 'EMPLOYEE',
    department: INITIAL_EMPLOYEES[0].department,
    phone: INITIAL_EMPLOYEES[0].phone,
    employeeId: INITIAL_EMPLOYEES[0].id,
    branchId: INITIAL_EMPLOYEES[0].branchId || 'CN_HN_01'
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Toast Helper
  const showToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    const newToast: ToastMessage = { id, type, title, message };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Add Attendance record
  const handleAddAttendanceRecord = (newRecord: AttendanceRecord) => {
    setAttendanceRecords((prev) => [newRecord, ...prev]);
  };

  // Open Auth Modal
  const handleOpenAuthModal = (mode: 'LOGIN' | 'REGISTER') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  // Handle Login Success
  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    if (user.role === 'ADMIN') {
      setActiveTab('MANAGER_DASHBOARD');
    } else {
      setActiveTab('APP_PREVIEW');
    }
  };

  // Handle Register Employee
  const handleRegisterEmployee = (newEmp: Employee) => {
    setEmployees((prev) => [newEmp, ...prev]);
  };

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null);
    showToast('info', 'Đã đăng xuất', 'Bạn đã đăng xuất khỏi hệ thống');
  };

  // Quick stats for the live monitor
  const totalEmployees = employees.length;
  const uniqueAttendees = new Set(attendanceRecords.map(r => r.employeeId)).size;
  const lateCount = attendanceRecords.filter(r => r.status.toLowerCase().includes('muộn')).length;
  const onTimeCount = attendanceRecords.filter(r => r.status.toLowerCase().includes('đúng giờ') || r.status.toLowerCase().includes('hợp lệ')).length;

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-slate-800 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* GLOBAL TOAST NOTIFICATIONS */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* AUTHENTICATION MODAL POPUP */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        employees={employees}
        branches={branches}
        onLoginSuccess={handleLoginSuccess}
        onRegisterEmployee={handleRegisterEmployee}
        showToast={showToast}
        initialMode={authModalMode}
        defaultRole="EMPLOYEE"
      />

      {/* TOP NAVIGATION HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand & Status Indicator */}
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-600/20">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-slate-800 text-base tracking-tight">
                    Chấm Công Nhân Sự
                  </h1>
                  <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {branches.length} Chi Nhánh
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block font-medium">
                  Cụm Chi Nhánh Độc Lập • Khóa Mã Máy • Lịch Ca Tự Động
                </p>
              </div>
            </div>

            {/* Main Tabs Navigation */}
            <nav className="hidden lg:flex items-center space-x-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/60">
              <button
                id="tab-btn-app-preview"
                onClick={() => setActiveTab('APP_PREVIEW')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'APP_PREVIEW'
                    ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/50'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Chấm Công</span>
              </button>

              <button
                id="tab-btn-shift-schedule-view"
                onClick={() => setActiveTab('SHIFT_SCHEDULE_VIEW')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'SHIFT_SCHEDULE_VIEW'
                    ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/50'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                <span>Đăng Ký & Lịch Ca</span>
                {scheduleConfig.isRegistrationOpen && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                )}
              </button>

              <button
                id="tab-btn-manager-dashboard"
                onClick={() => setActiveTab('MANAGER_DASHBOARD')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'MANAGER_DASHBOARD'
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200/50'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span>Quản Lý & Chi Nhánh</span>
              </button>

              <button
                id="tab-btn-auth-view"
                onClick={() => setActiveTab('AUTH_VIEW')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'AUTH_VIEW'
                    ? 'bg-white text-purple-700 shadow-sm border border-slate-200/50'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 text-purple-600" />
                <span>Đăng Nhập / Đăng Ký</span>
              </button>

              <button
                id="tab-btn-sheet-data"
                onClick={() => setActiveTab('SHEET_DATA')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'SHEET_DATA'
                    ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/50'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Google Sheet</span>
              </button>

              <button
                id="tab-btn-gas-code"
                onClick={() => setActiveTab('GAS_CODE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'GAS_CODE'
                    ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/50'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Code.gs</span>
              </button>

              <button
                id="tab-btn-deploy-guide"
                onClick={() => setActiveTab('DEPLOY_GUIDE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'DEPLOY_GUIDE'
                    ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/50'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Rocket className="w-3.5 h-3.5" />
                <span>Deploy</span>
              </button>
            </nav>

            {/* User Account / Auth Actions on Header */}
            <div className="flex items-center gap-2">
              {currentUser ? (
                <div className="flex items-center gap-2 bg-slate-100/90 pl-2.5 pr-1.5 py-1 rounded-2xl border border-slate-200/80">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <p className="text-xs font-bold text-slate-800 leading-tight">
                        {currentUser.name}
                      </p>
                      {(() => {
                        const curBranch = branches.find((b) => b.id === currentUser.branchId);
                        return curBranch ? (
                          <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            {curBranch.code}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-none mt-0.5">
                      {currentUser.role === 'ADMIN' ? (
                        <span className="font-bold text-blue-600">🛡️ Quản Lý Toàn Hệ Thống</span>
                      ) : (
                        <span className="font-bold text-emerald-600">👤 {currentUser.employeeId || 'NV'}</span>
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenAuthModal('LOGIN')}
                    className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-white rounded-xl transition text-xs font-medium cursor-pointer"
                    title="Đổi tài khoản khác"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition text-xs cursor-pointer"
                    title="Đăng xuất"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenAuthModal('LOGIN')}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Đăng Nhập</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenAuthModal('REGISTER')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Đăng Ký NV</span>
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Mobile sub-tabs navigation */}
          <div className="flex lg:hidden overflow-x-auto py-2 gap-1 border-t border-slate-100 text-xs font-semibold no-scrollbar">
            <button
              onClick={() => setActiveTab('APP_PREVIEW')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap ${
                activeTab === 'APP_PREVIEW' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600 bg-slate-100'
              }`}
            >
              📱 Chấm Công
            </button>
            <button
              onClick={() => setActiveTab('SHIFT_SCHEDULE_VIEW')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap ${
                activeTab === 'SHIFT_SCHEDULE_VIEW' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600 bg-slate-100'
              }`}
            >
              🗓️ Đăng Ký / Lịch Ca
            </button>
            <button
              onClick={() => setActiveTab('MANAGER_DASHBOARD')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap ${
                activeTab === 'MANAGER_DASHBOARD' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 bg-slate-100'
              }`}
            >
              🛡️ Quản Lý
            </button>
            <button
              onClick={() => setActiveTab('AUTH_VIEW')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap ${
                activeTab === 'AUTH_VIEW' ? 'bg-purple-600 text-white font-bold' : 'text-slate-600 bg-slate-100'
              }`}
            >
              🔐 Đăng Nhập / ĐK
            </button>
            <button
              onClick={() => setActiveTab('SHEET_DATA')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap ${
                activeTab === 'SHEET_DATA' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600 bg-slate-100'
              }`}
            >
              📊 Sheet
            </button>
            <button
              onClick={() => setActiveTab('GAS_CODE')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap ${
                activeTab === 'GAS_CODE' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600 bg-slate-100'
              }`}
            >
              ⚡ Code.gs
            </button>
            <button
              onClick={() => setActiveTab('DEPLOY_GUIDE')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap ${
                activeTab === 'DEPLOY_GUIDE' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600 bg-slate-100'
              }`}
            >
              🚀 Deploy
            </button>
          </div>

        </div>
      </header>

      {/* MAIN VIEWPORT CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* ================= TAB 1: ATTENDANCE APP (NHÂN VIÊN) ================= */}
        {activeTab === 'APP_PREVIEW' && (
          <div className="space-y-6">
            
            {/* Top Quick Status & Action Notification Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                <span>
                  <strong className="text-slate-800">Trình Chấm Công Nhân Viên:</strong> Bạn đang đăng nhập là{' '}
                  <strong className="text-emerald-700">{currentUser ? currentUser.name : 'Khách'}</strong>. Chọn ca và bấm{' '}
                  <strong className="text-emerald-600">VÀO CA / RA CA</strong>. Máy sẽ tự động đăng ký ở lần đầu!
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setActiveTab('MANAGER_DASHBOARD')}
                  className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" /> Sang trang Quản lý &rarr;
                </button>
              </div>
            </div>

            {/* Split View: Phone Simulator on Left, Live Admin Monitor on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Interactive Mobile App (Width: 5 cols on lg) */}
              <div className="lg:col-span-5 flex justify-center">
                <AttendanceApp
                  currentUser={currentUser}
                  employees={employees}
                  shifts={shifts}
                  branches={branches}
                  officeConfig={officeConfig}
                  attendanceHistory={attendanceRecords}
                  onAddAttendanceRecord={handleAddAttendanceRecord}
                  onUpdateEmployees={setEmployees}
                  showToast={showToast}
                  onOpenAuthModal={handleOpenAuthModal}
                  onLogout={handleLogout}
                  onSwitchToManagerTab={() => setActiveTab('MANAGER_DASHBOARD')}
                  onSwitchToScheduleTab={() => setActiveTab('SHIFT_SCHEDULE_VIEW')}
                  isRegistrationOpen={scheduleConfig.isRegistrationOpen}
                />
              </div>

              {/* Right Column: Clean Minimalism Live Admin Monitoring Dashboard (Width: 7 cols on lg) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Header for Admin Monitor */}
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-[0.2em] mb-1">
                      Giám Sát Thời Gian Thực
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight">
                      Lịch Sử Điểm Danh Hôm Nay
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Dữ liệu cập nhật lúc
                    </p>
                    <p className="text-xs font-mono font-semibold text-slate-700">
                      {new Date().toLocaleTimeString('vi-VN')}
                    </p>
                  </div>
                </div>

                {/* 3 Metric Cards matching Clean Minimalism Mockup */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Có mặt hôm nay
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-light text-slate-800">{uniqueAttendees}</span>
                      <span className="text-xs font-bold text-emerald-500">/ {totalEmployees}</span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Đi muộn
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-light text-slate-800">
                        {String(lateCount).padStart(2, '0')}
                      </span>
                      <span className="text-xs font-bold text-amber-500">
                        {lateCount > 0 ? `+${lateCount}` : '0%'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Đúng giờ / WFH
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-light text-slate-800">
                        {String(onTimeCount).padStart(2, '0')}
                      </span>
                      <span className="text-xs font-bold text-slate-400">Chuẩn</span>
                    </div>
                  </div>
                </div>

                {/* Real-time Google Sheet Transaction History Table */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Lịch sử Giao dịch Gần nhất
                    </h4>
                    <span className="px-3 py-1 bg-white text-[10px] font-bold border border-slate-200 rounded-full text-slate-500">
                      Dữ liệu từ Google Sheet
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/30">
                          <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mã NV</th>
                          <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Họ Và Tên</th>
                          <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thời Gian</th>
                          <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Loại Hình</th>
                          <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trạng Thái</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs divide-y divide-slate-50">
                        {attendanceRecords.slice(0, 7).map((rec) => {
                          const isCheckIn = rec.type === 'CHECK_IN';
                          return (
                            <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-6 py-3.5 font-mono text-slate-500 text-[11px]">
                                #{rec.employeeId}
                              </td>
                              <td className="px-6 py-3.5 font-semibold text-slate-800">
                                {rec.employeeName}
                              </td>
                              <td className="px-6 py-3.5 text-slate-500 font-mono text-[11px]">
                                {rec.timestamp.split(' ')[1] || rec.timestamp}
                              </td>
                              <td className="px-6 py-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  isCheckIn
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200/60'
                                }`}>
                                  {isCheckIn ? 'Vào Ca' : 'Ra Ca'}
                                </span>
                              </td>
                              <td className="px-6 py-3.5 text-slate-500 italic text-[11px]">
                                {rec.status}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3.5 border-t border-slate-100 bg-slate-50/30 text-center flex items-center justify-center gap-4">
                    <button
                      onClick={() => setActiveTab('MANAGER_DASHBOARD')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      Xem Bảng Quản Lý Nhân Sự &rarr;
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      onClick={() => setActiveTab('SHEET_DATA')}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      Bảng Dữ Liệu Google Sheet &rarr;
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ================= TAB 1.5: SHIFT REGISTRATION & SCHEDULE (NHÂN VIÊN) ================= */}
        {activeTab === 'SHIFT_SCHEDULE_VIEW' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                  <span>🗓️ Đăng Ký Ca & Lịch Phân Ca Tuần</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đăng ký nguyện vọng làm việc Thứ 2 - Chủ Nhật (Ca 1: 8h-13h, Ca 2: 13h-18h, Ca 3: 18h-23h)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('MANAGER_DASHBOARD')}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200/60 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Trang Quản Lý & Tự Động Chia Ca &rarr;</span>
                </button>
              </div>
            </div>

            <EmployeeShiftRegistration
              currentUser={currentUser}
              employees={employees}
              shifts={shifts}
              scheduleConfig={scheduleConfig}
              weeklySchedule={weeklySchedule}
              registrations={registrations}
              onSaveRegistration={(newReg) => {
                setRegistrations((prev) => ({
                  ...prev,
                  [newReg.employeeId]: newReg
                }));
              }}
              showToast={showToast}
            />
          </div>
        )}

        {/* ================= TAB 2: MANAGER DASHBOARD (QUẢN LÝ) ================= */}
        {activeTab === 'MANAGER_DASHBOARD' && (
          <ManagerDashboard
            currentUser={
              currentUser && currentUser.role === 'ADMIN'
                ? currentUser
                : {
                    id: 'ADMIN',
                    name: 'Ban Quản Trị Hệ Thống',
                    email: 'admin@company.com',
                    role: 'ADMIN',
                    department: 'Ban Giám Đốc',
                    phone: '0909998877'
                  }
            }
            branches={branches}
            employees={employees}
            shifts={shifts}
            attendanceRecords={attendanceRecords}
            officeConfig={officeConfig}
            registrations={registrations}
            scheduleConfig={scheduleConfig}
            weeklySchedule={weeklySchedule}
            onUpdateBranches={setBranches}
            onUpdateEmployees={setEmployees}
            onUpdateConfig={setOfficeConfig}
            onUpdateScheduleConfig={setScheduleConfig}
            onUpdateSchedule={setWeeklySchedule}
            onUpdateRegistrations={setRegistrations}
            onLogout={handleLogout}
            showToast={showToast}
            onSwitchToEmployeeTab={(empId) => {
              if (empId) {
                const target = employees.find((e) => e.id === empId);
                if (target) {
                  setCurrentUser({
                    id: target.id,
                    name: target.name,
                    email: target.email,
                    role: 'EMPLOYEE',
                    department: target.department,
                    phone: target.phone,
                    employeeId: target.id,
                    branchId: target.branchId
                  });
                }
              }
              setActiveTab('APP_PREVIEW');
            }}
          />
        )}

        {/* ================= TAB 3: AUTH VIEW (ĐĂNG NHẬP / ĐĂNG KÝ FULLSCREEN VIEW) ================= */}
        {activeTab === 'AUTH_VIEW' && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-slate-800">
                Trung Tâm Xác Thực & Đăng Ký Tài Khoản
              </h2>
              <p className="text-xs text-slate-500">
                Đăng nhập tài khoản Quản lý để xem báo cáo, hoặc đăng ký nhân viên mới để bắt đầu chấm công
              </p>
            </div>

            {/* Embedded Auth Panel */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex bg-slate-100 p-1 rounded-2xl mb-6 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setAuthModalMode('LOGIN')}
                  className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                    authModalMode === 'LOGIN' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LogIn className="w-4 h-4" /> Đăng Nhập
                </button>
                <button
                  type="button"
                  onClick={() => setAuthModalMode('REGISTER')}
                  className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                    authModalMode === 'REGISTER' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserPlus className="w-4 h-4" /> Đăng Ký Nhân Viên Mới
                </button>
              </div>

              {/* Directly trigger the interactive modal or embedded flow */}
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  {authModalMode === 'LOGIN' ? <LogIn className="w-8 h-8" /> : <UserPlus className="w-8 h-8" />}
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-base">
                    {authModalMode === 'LOGIN' ? 'Sẵn sàng Đăng nhập' : 'Tạo Tài Khoản Nhân Viên Mới'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {authModalMode === 'LOGIN'
                      ? 'Chọn vai trò Nhân viên hoặc Quản lý để truy cập tính năng tương ứng.'
                      : 'Hệ thống tự động cấp Mã NV tiếp theo và liên kết thiết bị ở lần check-in đầu tiên.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl font-bold text-xs shadow-md shadow-emerald-600/20 transition inline-flex items-center gap-2 cursor-pointer"
                >
                  {authModalMode === 'LOGIN' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  <span>{authModalMode === 'LOGIN' ? 'Mở Form Đăng Nhập' : 'Mở Form Đăng Ký'}</span>
                </button>

                {/* Quick 1-Click test accounts */}
                <div className="pt-6 border-t border-slate-100 text-left space-y-3">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
                    ⚡ Danh sách tài khoản mẫu để kiểm thử nhanh:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleLoginSuccess({
                          id: 'ADMIN',
                          name: 'Ban Quản Trị Hệ Thống',
                          email: 'admin@company.com',
                          role: 'ADMIN',
                          department: 'Ban Giám Đốc',
                          phone: '0909998877'
                        });
                        showToast('success', 'Đăng nhập Quản lý', 'Chào mừng Quản trị viên!');
                      }}
                      className="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-2xl text-left transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-blue-600" /> Quản Lý (Admin)
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-200/60 text-blue-800">
                          Báo cáo & DS
                        </span>
                      </div>
                      <p className="text-[10px] text-blue-700 font-mono">TK: admin@company.com | MK: admin</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const emp = employees[0];
                        handleLoginSuccess({
                          id: emp.id,
                          name: emp.name,
                          email: emp.email,
                          role: 'EMPLOYEE',
                          department: emp.department,
                          phone: emp.phone,
                          employeeId: emp.id
                        });
                        showToast('success', 'Đăng nhập Nhân viên', `Xin chào ${emp.name}!`);
                      }}
                      className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-2xl text-left transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-600" /> {employees[0].name}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200/60 text-emerald-800">
                          {employees[0].id}
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-700 font-mono">TK: {employees[0].id} | MK: 123</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const emp = employees[1];
                        handleLoginSuccess({
                          id: emp.id,
                          name: emp.name,
                          email: emp.email,
                          role: 'EMPLOYEE',
                          department: emp.department,
                          phone: emp.phone,
                          employeeId: emp.id
                        });
                        showToast('success', 'Đăng nhập Nhân viên', `Xin chào ${emp.name}!`);
                      }}
                      className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-left transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-600" /> {employees[1].name}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                          {employees[1].id}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 font-mono">TK: {employees[1].id} | MK: 123</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenAuthModal('REGISTER')}
                      className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-2xl text-left transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                          <UserPlus className="w-3.5 h-3.5 text-amber-600" /> Tạo Nhân Viên Mới
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-800">
                          + Đăng ký
                        </span>
                      </div>
                      <p className="text-[10px] text-amber-700">Đăng ký tự động cấp mã nhân viên</p>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: GAS SOURCE CODE STUDIO ================= */}
        {activeTab === 'GAS_CODE' && (
          <GasCodeStudio showToast={showToast} />
        )}

        {/* ================= TAB 5: ADMIN GOOGLE SHEET SIMULATOR ================= */}
        {activeTab === 'SHEET_DATA' && (
          <AdminSheetView
            attendanceRecords={attendanceRecords}
            employees={employees}
            officeConfig={officeConfig}
            onUpdateEmployees={setEmployees}
            onUpdateConfig={setOfficeConfig}
            showToast={showToast}
          />
        )}

        {/* ================= TAB 6: DEPLOY & TROUBLESHOOTING GUIDE ================= */}
        {activeTab === 'DEPLOY_GUIDE' && (
          <DeployGuide showToast={showToast} />
        )}

      </main>

      {/* FOOTER - CLEAN MINIMALISM */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700">
            Hệ Thống Chấm Công Nhân Sự 3 Ca • Google Apps Script & Google Sheets
          </p>
          <p className="text-slate-400">
            Tự động gán mã máy • WiFi Geofencing • Báo cáo giờ làm & Phân quyền Quản lý
          </p>
        </div>
      </footer>

    </div>
  );
}


