import React, { useState } from 'react';
import { Employee, AuthUser, ToastMessage, Branch } from '../types';
import {
  User,
  Shield,
  KeyRound,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  MapPin,
  Layers
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  employees: Employee[];
  branches: Branch[];
  onLoginSuccess: (user: AuthUser) => void;
  onRegisterEmployee: (newEmp: Employee) => void;
  showToast: (type: ToastMessage['type'], title: string, message: string) => void;
  initialMode?: 'LOGIN' | 'REGISTER';
  defaultRole?: 'ADMIN' | 'EMPLOYEE';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  employees,
  branches,
  onLoginSuccess,
  onRegisterEmployee,
  showToast,
  initialMode = 'LOGIN',
  defaultRole = 'EMPLOYEE'
}) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>(initialMode);
  const [roleTab, setRoleTab] = useState<'EMPLOYEE' | 'ADMIN'>(defaultRole);

  // Branch Selection State for Login Filter
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('ALL');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState(''); // email or empId
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state (for employees)
  const nextEmpId = `NV${String(employees.length + 1).padStart(3, '0')}`;
  const [regId, setRegId] = useState(nextEmpId);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDepartment, setRegDepartment] = useState('Phòng Kỹ Thuật');
  const [regBranchId, setRegBranchId] = useState<string>(branches[0]?.id || 'CN_HN_01');
  const [regRole, setRegRole] = useState('Nhân viên');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  if (!isOpen) return null;

  // Handle Login Submit
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginIdentifier.trim()) {
      showToast('warning', 'Thiếu thông tin', 'Vui lòng nhập Mã nhân viên hoặc Email');
      return;
    }

    if (!loginPassword) {
      showToast('warning', 'Thiếu mật khẩu', 'Vui lòng nhập mật khẩu');
      return;
    }

    const cleanInput = loginIdentifier.trim().toLowerCase();

    // Check if logging in as Admin / Manager
    if (roleTab === 'ADMIN') {
      if (cleanInput === 'admin' || cleanInput === 'admin@company.com') {
        if (loginPassword === 'admin' || loginPassword === '123' || loginPassword === 'admin123') {
          const authUser: AuthUser = {
            id: 'ADMIN',
            name: 'Ban Quản Trị Hệ Thống',
            email: 'admin@company.com',
            role: 'ADMIN',
            department: 'Ban Giám Đốc',
            phone: '0909998877',
            branchId: branches[0]?.id
          };
          onLoginSuccess(authUser);
          showToast('success', 'Đăng nhập thành công', 'Chào mừng Quản trị viên truy cập Bảng điều khiển Quản lý!');
          if (onClose) onClose();
          return;
        }
      }

      // Or check if user is in employee list with role 'Quản lý'
      const adminEmp = employees.find(
        (emp) =>
          (emp.id.toLowerCase() === cleanInput || emp.email.toLowerCase() === cleanInput) &&
          (emp.role.toLowerCase().includes('quản') || emp.role.toLowerCase().includes('giám') || emp.role.toLowerCase().includes('lead') || emp.role.toLowerCase().includes('manager'))
      );

      if (adminEmp) {
        if (!adminEmp.password || adminEmp.password === loginPassword || loginPassword === '123' || loginPassword === 'admin') {
          const authUser: AuthUser = {
            id: adminEmp.id,
            name: adminEmp.name,
            email: adminEmp.email,
            role: 'ADMIN',
            department: adminEmp.department,
            phone: adminEmp.phone,
            employeeId: adminEmp.id,
            branchId: adminEmp.branchId
          };
          onLoginSuccess(authUser);
          showToast('success', 'Đăng nhập Quản lý', `Xin chào Quản lý ${adminEmp.name}!`);
          if (onClose) onClose();
          return;
        } else {
          showToast('error', 'Sai mật khẩu', 'Mật khẩu tài khoản Quản lý không chính xác (Thử: 123 hoặc admin)');
          return;
        }
      }

      showToast('error', 'Không tìm thấy Quản lý', 'Tài khoản không tồn tại hoặc không có quyền Quản lý. (Gợi ý: admin@company.com / pass: admin)');
      return;
    }

    // Role Tab is EMPLOYEE
    const emp = employees.find(
      (e) => e.id.toLowerCase() === cleanInput || e.email.toLowerCase() === cleanInput || (e.phone && e.phone === cleanInput)
    );

    if (!emp) {
      showToast('error', 'Không tìm thấy', `Không tìm thấy nhân viên với thông tin "${loginIdentifier}". Vui lòng đăng ký tài khoản mới!`);
      return;
    }

    // If a branch filter was actively selected, check if employee belongs to it
    if (selectedBranchFilter !== 'ALL' && emp.branchId && emp.branchId !== selectedBranchFilter) {
      const actualBranch = branches.find((b) => b.id === emp.branchId);
      showToast(
        'warning',
        'Chi nhánh không khớp',
        `Nhân viên ${emp.name} thuộc "${actualBranch ? actualBranch.name : emp.branchId}", không thuộc chi nhánh đang chọn lọc.`
      );
    }

    if (emp.password && emp.password !== loginPassword && loginPassword !== '123') {
      showToast('error', 'Sai mật khẩu', 'Mật khẩu không chính xác. Mặc định là: 123');
      return;
    }

    const authUser: AuthUser = {
      id: emp.id,
      name: emp.name,
      email: emp.email,
      role: 'EMPLOYEE',
      department: emp.department,
      phone: emp.phone,
      employeeId: emp.id,
      branchId: emp.branchId
    };

    const branch = branches.find((b) => b.id === emp.branchId);
    onLoginSuccess(authUser);
    showToast('success', 'Đăng nhập thành công', `Xin chào ${emp.name} (${emp.id}) - ${branch ? branch.name : 'Chi nhánh trực thuộc'}!`);
    if (onClose) onClose();
  };

  // Handle Register Submit for Employees
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!regName.trim() || !regEmail.trim()) {
      showToast('warning', 'Thiếu thông tin', 'Vui lòng nhập đầy đủ Họ tên và Email');
      return;
    }

    if (!regPassword) {
      showToast('warning', 'Thiếu mật khẩu', 'Vui lòng đặt mật khẩu tài khoản');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      showToast('error', 'Mật khẩu không khớp', 'Mật khẩu và xác nhận mật khẩu không trùng khớp');
      return;
    }

    // Check duplicate ID or Email
    const exists = employees.some(
      (e) => e.id.toLowerCase() === regId.trim().toLowerCase() || e.email.toLowerCase() === regEmail.trim().toLowerCase()
    );

    if (exists) {
      showToast('error', 'Đã tồn tại', 'Mã nhân viên hoặc Email này đã có trong hệ thống!');
      return;
    }

    const newEmployee: Employee = {
      id: regId.trim().toUpperCase(),
      name: regName.trim(),
      email: regEmail.trim().toLowerCase(),
      phone: regPhone.trim() || '0901234567',
      department: regDepartment,
      branchId: regBranchId,
      role: regRole || 'Nhân viên',
      password: regPassword,
      active: true,
      registeredDeviceId: undefined,
      registeredDeviceName: undefined,
      deviceRegisteredAt: undefined,
      hourlyRate: 50000
    };

    onRegisterEmployee(newEmployee);

    // Auto login as this new employee
    const authUser: AuthUser = {
      id: newEmployee.id,
      name: newEmployee.name,
      email: newEmployee.email,
      role: 'EMPLOYEE',
      department: newEmployee.department,
      phone: newEmployee.phone,
      employeeId: newEmployee.id,
      branchId: newEmployee.branchId
    };

    const branch = branches.find((b) => b.id === newEmployee.branchId);
    onLoginSuccess(authUser);
    showToast(
      'success',
      'Đăng ký thành công',
      `Tài khoản ${newEmployee.name} (${newEmployee.id}) đã được tạo tại "${branch?.name}". Máy sẽ tự động đăng ký ở lần check-in đầu tiên!`
    );
    if (onClose) onClose();
  };

  // Quick 1-Click Login Helper
  const handleQuickLogin = (emp: Employee, asAdmin = false) => {
    const authUser: AuthUser = {
      id: asAdmin ? 'ADMIN' : emp.id,
      name: emp.name,
      email: emp.email,
      role: asAdmin ? 'ADMIN' : 'EMPLOYEE',
      department: emp.department,
      phone: emp.phone,
      employeeId: emp.id,
      branchId: emp.branchId
    };
    onLoginSuccess(authUser);
    const branch = branches.find((b) => b.id === emp.branchId);
    showToast('success', 'Đăng nhập Demo', `Đã đăng nhập: ${emp.name} (${branch ? branch.code : 'Toàn hệ thống'})`);
    if (onClose) onClose();
  };

  // Filtered Quick-Login Employees based on selected branch
  const filteredQuickEmps = selectedBranchFilter === 'ALL'
    ? employees
    : employees.filter((e) => e.branchId === selectedBranchFilter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white text-center relative shrink-0">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-full bg-black/10 hover:bg-black/20 text-xs font-bold w-6 h-6 flex items-center justify-center transition cursor-pointer"
            >
              ✕
            </button>
          )}

          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-2.5 backdrop-blur-xs shadow-inner">
            {mode === 'LOGIN' ? <LogIn className="w-6 h-6 text-white" /> : <UserPlus className="w-6 h-6 text-white" />}
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            {mode === 'LOGIN' ? 'Hệ Thống Đăng Nhập Theo Chi Nhánh' : 'Đăng Ký Tài Khoản Nhân Viên Mới'}
          </h2>
          <p className="text-xs text-emerald-100 mt-1">
            {mode === 'LOGIN'
              ? 'Chọn chi nhánh trực thuộc để điểm danh và quản lý dữ liệu tách biệt'
              : 'Khai báo thông tin nhân sự và gán vào cụm chi nhánh làm việc'}
          </p>

          {/* Switch Mode Pill Tabs */}
          <div className="flex bg-black/20 p-1 rounded-xl mt-4 max-w-xs mx-auto text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('LOGIN')}
              className={`flex-1 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'LOGIN' ? 'bg-white text-emerald-800 shadow-xs' : 'text-white/80 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" /> Đăng Nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setRegId(`NV${String(employees.length + 1).padStart(3, '0')}`);
              }}
              className={`flex-1 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'REGISTER' ? 'bg-white text-emerald-800 shadow-xs' : 'text-white/80 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Đăng Ký NV
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* ================= MODE: LOGIN ================= */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              
              {/* Role Selection Tabs */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  1. Bạn đang đăng nhập với tư cách:
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => {
                      setRoleTab('EMPLOYEE');
                      setLoginIdentifier('NV001');
                      setLoginPassword('123');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      roleTab === 'EMPLOYEE'
                        ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/50'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <User className="w-4 h-4" /> Nhân Viên
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRoleTab('ADMIN');
                      setLoginIdentifier('admin@company.com');
                      setLoginPassword('admin');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      roleTab === 'ADMIN'
                        ? 'bg-white text-blue-700 shadow-xs border border-slate-200/50'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Shield className="w-4 h-4" /> Quản Lý
                  </button>
                </div>
              </div>

              {/* BRANCH SELECTOR FOR EMPLOYEE */}
              {roleTab === 'EMPLOYEE' && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-1.5">
                  <label className="block text-[11px] font-bold text-indigo-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>2. Chọn Cụm Chi Nhánh Làm Việc:</span>
                    </span>
                    <span className="text-[10px] font-normal text-indigo-600">
                      Tách biệt độc lập
                    </span>
                  </label>
                  <select
                    value={selectedBranchFilter}
                    onChange={(e) => {
                      setSelectedBranchFilter(e.target.value);
                      // Auto select first employee from that branch for quick testing
                      if (e.target.value !== 'ALL') {
                        const firstEmp = employees.find((emp) => emp.branchId === e.target.value);
                        if (firstEmp) {
                          setLoginIdentifier(firstEmp.id);
                          setLoginPassword('123');
                        }
                      }
                    }}
                    className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="ALL">🏢 [Tất Cả Chi Nhánh Toàn Hệ Thống]</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        📍 [{b.code}] {b.name} — ({employees.filter((e) => e.branchId === b.id).length} NV)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Identifier Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {roleTab === 'EMPLOYEE' ? 'Mã Nhân Viên hoặc Email (*)' : 'Email Quản Trị (*)'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder={roleTab === 'EMPLOYEE' ? 'Ví dụ: NV001 hoặc an.nguyen@company.com' : 'admin@company.com hoặc admin'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pl-9 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition"
                    required
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    {roleTab === 'EMPLOYEE' ? <User className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-600">Mật khẩu (*)</label>
                  <span className="text-[10px] text-slate-400">Mặc định: 123 hoặc admin</span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pl-9 pr-9 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition"
                    required
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                {roleTab === 'EMPLOYEE' ? 'Đăng Nhập Vào Ca' : 'Đăng Nhập Quản Trị Hệ Thống'}
              </button>

              {/* Quick 1-Click Demo Logins grouped by Branch */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    ⚡ Chọn nhanh tài khoản mẫu:
                  </p>
                  <span className="text-[10px] text-indigo-600 font-medium">
                    {filteredQuickEmps.length} nhân sự
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      const admin = employees.find((e) => e.role.includes('Quản lý')) || employees[0];
                      handleQuickLogin(admin, true);
                    }}
                    className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-[11px] font-semibold flex items-center justify-between transition text-left border border-blue-200/60 cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">Quản lý (Admin)</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 bg-blue-200/60 rounded-md shrink-0">ALL</span>
                  </button>

                  {filteredQuickEmps.map((emp) => {
                    const br = branches.find((b) => b.id === emp.branchId);
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => handleQuickLogin(emp, false)}
                        className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 text-[11px] font-semibold flex items-center justify-between transition text-left border border-slate-200 hover:border-emerald-200 cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{emp.name}</span>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 bg-slate-200/70 text-slate-700 font-mono rounded-md shrink-0">
                          {br ? br.code : emp.id}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </form>
          )}

          {/* ================= MODE: REGISTER (EMPLOYEE) ================= */}
          {mode === 'REGISTER' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 text-xs text-emerald-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-snug">
                  Đăng ký xong tài khoản sẽ được phân tách theo <strong>Chi nhánh bạn chọn</strong>, sẵn sàng chấm công & đăng ký ca ngay.
                </p>
              </div>

              {/* BRANCH SELECTION FOR REGISTRATION */}
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-1">
                <label className="block text-[11px] font-bold text-indigo-900 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Chi Nhánh Trực Thuộc (*)</span>
                </label>
                <select
                  value={regBranchId}
                  onChange={(e) => setRegBranchId(e.target.value)}
                  className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2 text-xs font-bold text-indigo-950 outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      [{b.code}] {b.name} — {b.address}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mã NV & Họ tên */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mã NV (*)</label>
                  <input
                    type="text"
                    value={regId}
                    onChange={(e) => setRegId(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-mono font-bold text-xs text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Họ và Tên (*)</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Ví dụ: Hoàng Minh Tuấn"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email (*)</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="tuan.hoang@company.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Phòng ban & Chức vụ */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Phòng ban</label>
                  <select
                    value={regDepartment}
                    onChange={(e) => setRegDepartment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Phòng Kỹ Thuật">Phòng Kỹ Thuật</option>
                    <option value="Phòng Nhân Sự (HR)">Phòng Nhân Sự (HR)</option>
                    <option value="Phòng Kinh Doanh">Phòng Kinh Doanh</option>
                    <option value="Phòng Marketing">Phòng Marketing</option>
                    <option value="Phòng Kế Toán">Phòng Kế Toán</option>
                    <option value="Ban Vận Hành">Ban Vận Hành</option>
                    <option value="Ban Giám Đốc">Ban Giám Đốc</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Chức danh</label>
                  <input
                    type="text"
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    placeholder="Nhân viên / Chuyên viên"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Mật khẩu & Xác nhận mật khẩu */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mật khẩu (*)</label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Tối thiểu 3 ký tự"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Xác nhận mật khẩu (*)</label>
                  <input
                    type="password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Submit Register */}
              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <UserPlus className="w-4 h-4" /> Đăng Ký Tài Khoản Nhân Viên
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setMode('LOGIN')}
                  className="text-xs font-semibold text-emerald-600 hover:underline cursor-pointer"
                >
                  Đã có tài khoản? Bấm vào đây để đăng nhập
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};

