import React, { useState } from 'react';
import { Branch, Employee, OfficeConfig, OfficeWifiNetwork, ToastMessage } from '../types';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Users,
  MapPin,
  Phone,
  UserCheck,
  Wifi,
  Sparkles,
  Search,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Layers,
  Info,
  Check,
  X,
  ExternalLink,
  ArrowLeftRight
} from 'lucide-react';

interface BranchClusterManagerProps {
  branches: Branch[];
  employees: Employee[];
  officeConfig: OfficeConfig;
  onUpdateBranches: (branches: Branch[]) => void;
  onUpdateEmployees: (employees: Employee[]) => void;
  onUpdateConfig: (config: OfficeConfig) => void;
  showToast: (type: ToastMessage['type'], title: string, message: string) => void;
}

export const BranchClusterManager: React.FC<BranchClusterManagerProps> = ({
  branches,
  employees,
  officeConfig,
  onUpdateBranches,
  onUpdateEmployees,
  onUpdateConfig,
  showToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Transfer Employee Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferEmpId, setTransferEmpId] = useState<string>('');
  const [targetBranchId, setTargetBranchId] = useState<string>('');

  // Form State for Add / Edit Branch
  const [formData, setFormData] = useState<Partial<Branch>>({
    id: '',
    name: '',
    code: '',
    address: '',
    managerName: '',
    phone: '',
    color: 'blue',
    isActive: true,
    lat: 21.028511,
    lng: 105.854444,
    radiusMeters: 300,
    description: ''
  });

  // Open Add Modal
  const handleOpenAddModal = () => {
    const nextNum = branches.length + 1;
    setFormData({
      id: `CN_${String(nextNum).padStart(2, '0')}`,
      name: '',
      code: `CN-${nextNum}`,
      address: '',
      managerName: '',
      phone: '',
      color: ['blue', 'emerald', 'amber', 'purple', 'rose', 'indigo', 'cyan'][nextNum % 7],
      isActive: true,
      lat: 21.028511,
      lng: 105.854444,
      radiusMeters: 300,
      description: ''
    });
    setEditingBranch(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (branch: Branch) => {
    setFormData({ ...branch });
    setEditingBranch(branch);
    setIsAddModalOpen(true);
  };

  // Save Branch (Add or Edit)
  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim() || !formData.code?.trim() || !formData.address?.trim()) {
      showToast('warning', 'Thiếu thông tin', 'Vui lòng nhập Tên chi nhánh, Mã hiệu và Địa chỉ chi tiết!');
      return;
    }

    if (editingBranch) {
      // Edit existing branch
      const updated = branches.map((b) =>
        b.id === editingBranch.id
          ? ({
              ...b,
              ...formData,
              id: editingBranch.id,
              name: formData.name!.trim(),
              code: formData.code!.trim().toUpperCase(),
              address: formData.address!.trim()
            } as Branch)
          : b
      );
      onUpdateBranches(updated);
      showToast('success', 'Đã Cập Nhật Chi Nhánh', `Chi nhánh "${formData.name}" đã được lưu thông tin thành công.`);
    } else {
      // Create new branch
      const branchId = (formData.id || `CN_${Date.now()}`).trim();
      const isDuplicate = branches.some((b) => b.id.toLowerCase() === branchId.toLowerCase());
      if (isDuplicate) {
        showToast('error', 'Trùng mã chi nhánh', 'Mã chi nhánh này đã tồn tại trong hệ thống!');
        return;
      }

      const newBranch: Branch = {
        id: branchId,
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        address: formData.address.trim(),
        managerName: formData.managerName?.trim() || 'Chưa gán',
        phone: formData.phone?.trim() || '024.1234.5678',
        color: formData.color || 'blue',
        isActive: formData.isActive ?? true,
        lat: Number(formData.lat) || 21.028511,
        lng: Number(formData.lng) || 105.854444,
        radiusMeters: Number(formData.radiusMeters) || 300,
        createdAt: new Date().toLocaleDateString('vi-VN'),
        description: formData.description?.trim() || ''
      };

      onUpdateBranches([...branches, newBranch]);
      showToast('success', 'Đã Tạo Cụm Chi Nhánh Mới', `Đã thêm cụm chi nhánh "${newBranch.name}" (${newBranch.code}) thành công.`);
    }

    setIsAddModalOpen(false);
  };

  // Toggle Branch Active status
  const handleToggleActive = (branchId: string) => {
    const target = branches.find((b) => b.id === branchId);
    if (!target) return;

    const nextState = !target.isActive;
    const updated = branches.map((b) => (b.id === branchId ? { ...b, isActive: nextState } : b));
    onUpdateBranches(updated);

    showToast(
      nextState ? 'success' : 'info',
      nextState ? 'Đã kích hoạt chi nhánh' : 'Đã tạm dừng chi nhánh',
      `Chi nhánh "${target.name}" hiện ở trạng thái ${nextState ? 'Hoạt động' : 'Tạm dừng'}.`
    );
  };

  // Delete Branch
  const handleDeleteBranch = (branch: Branch) => {
    const branchEmps = employees.filter((e) => e.branchId === branch.id);
    if (branchEmps.length > 0) {
      showToast(
        'warning',
        'Không thể xóa',
        `Chi nhánh "${branch.name}" đang có ${branchEmps.length} nhân viên trực thuộc. Vui lòng chuyển nhân viên sang chi nhánh khác trước khi xóa!`
      );
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa cụm chi nhánh "${branch.name}" (${branch.code}) khỏi hệ thống?`)) {
      const filtered = branches.filter((b) => b.id !== branch.id);
      onUpdateBranches(filtered);
      showToast('info', 'Đã Xóa Chi Nhánh', `Đã gỡ bỏ chi nhánh "${branch.name}".`);
    }
  };

  // Transfer Employee Submit
  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferEmpId || !targetBranchId) {
      showToast('warning', 'Chưa chọn', 'Vui lòng chọn Nhân viên và Chi nhánh đích cần chuyển!');
      return;
    }

    const emp = employees.find((e) => e.id === transferEmpId);
    const targetBranch = branches.find((b) => b.id === targetBranchId);

    if (!emp || !targetBranch) return;

    const updatedEmployees = employees.map((e) =>
      e.id === transferEmpId ? { ...e, branchId: targetBranchId } : e
    );

    onUpdateEmployees(updatedEmployees);
    setIsTransferModalOpen(false);

    showToast(
      'success',
      'Đã Chuyển Chi Nhánh Thành Công',
      `Đã chuyển nhân sự ${emp.name} (${emp.id}) sang "${targetBranch.name}". Toàn bộ phân ca và chấm công của NV sẽ tự động đồng bộ theo chi nhánh mới.`
    );
  };

  // Filtered branches
  const filteredBranches = branches.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.managerName && b.managerName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Color helper
  const getColorClasses = (color?: string) => {
    switch (color) {
      case 'emerald':
        return {
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          border: 'border-emerald-500',
          bgLight: 'bg-emerald-50/60',
          text: 'text-emerald-700',
          bar: 'bg-emerald-500'
        };
      case 'amber':
        return {
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          border: 'border-amber-500',
          bgLight: 'bg-amber-50/60',
          text: 'text-amber-700',
          bar: 'bg-amber-500'
        };
      case 'purple':
        return {
          badge: 'bg-purple-100 text-purple-800 border-purple-300',
          border: 'border-purple-500',
          bgLight: 'bg-purple-50/60',
          text: 'text-purple-700',
          bar: 'bg-purple-500'
        };
      case 'rose':
        return {
          badge: 'bg-rose-100 text-rose-800 border-rose-300',
          border: 'border-rose-500',
          bgLight: 'bg-rose-50/60',
          text: 'text-rose-700',
          bar: 'bg-rose-500'
        };
      case 'indigo':
        return {
          badge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
          border: 'border-indigo-500',
          bgLight: 'bg-indigo-50/60',
          text: 'text-indigo-700',
          bar: 'bg-indigo-500'
        };
      case 'cyan':
        return {
          badge: 'bg-cyan-100 text-cyan-800 border-cyan-300',
          border: 'border-cyan-500',
          bgLight: 'bg-cyan-50/60',
          text: 'text-cyan-700',
          bar: 'bg-cyan-500'
        };
      case 'blue':
      default:
        return {
          badge: 'bg-blue-100 text-blue-800 border-blue-300',
          border: 'border-blue-500',
          bgLight: 'bg-blue-50/60',
          text: 'text-blue-700',
          bar: 'bg-blue-500'
        };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. TOP BANNER & ACTION BAR */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-indigo-300" />
                <span>Multi-Branch Management</span>
              </span>
              <span className="text-xs text-slate-300">
                • {branches.length} Chi nhánh trực thuộc
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Quản Lý Cụm Chi Nhánh & Phân Tuyến Nhân Sự</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Tạo và quản lý các chi nhánh độc lập. Mỗi chi nhánh có đội ngũ nhân viên, lịch phân ca tuần, danh sách WiFi và bảng chấm công tách biệt hoàn toàn.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                setTransferEmpId(employees[0]?.id || '');
                setTargetBranchId(branches[0]?.id || '');
                setIsTransferModalOpen(true);
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <ArrowLeftRight className="w-4 h-4 text-indigo-400" />
              <span>Chuyển Nhân Sự Chi Nhánh</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/25"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Cụm Chi Nhánh Mới</span>
            </button>
          </div>
        </div>

        {/* STATS OVERVIEW CARDS INSIDE BANNER */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
            <div className="text-[11px] text-slate-300 font-medium">Tổng Chi Nhánh</div>
            <div className="text-2xl font-black text-white mt-0.5 flex items-baseline gap-1.5">
              <span>{branches.length}</span>
              <span className="text-[11px] text-emerald-400 font-medium">
                ({branches.filter((b) => b.isActive).length} hoạt động)
              </span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
            <div className="text-[11px] text-slate-300 font-medium">Tổng Nhân Sự Đã Phân</div>
            <div className="text-2xl font-black text-indigo-300 mt-0.5 flex items-baseline gap-1.5">
              <span>{employees.filter((e) => Boolean(e.branchId)).length}</span>
              <span className="text-[11px] text-slate-300 font-medium">/ {employees.length} NV</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
            <div className="text-[11px] text-slate-300 font-medium">Điểm WiFi Doanh Nghiệp</div>
            <div className="text-2xl font-black text-amber-300 mt-0.5">
              {(officeConfig.authorizedWifiList || []).length}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
            <div className="text-[11px] text-slate-300 font-medium">Cơ Chế Phân Quyền</div>
            <div className="text-sm font-bold text-emerald-300 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Độc lập 100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & FILTER TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, mã, địa chỉ, người phụ trách..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 self-end sm:self-auto">
          <span>Hiển thị: <strong>{filteredBranches.length}</strong> chi nhánh</span>
        </div>
      </div>

      {/* 3. BRANCH CLUSTER CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBranches.map((branch) => {
          const colorStyles = getColorClasses(branch.color);
          const branchEmps = employees.filter((e) => e.branchId === branch.id);
          const branchWifis = (officeConfig.authorizedWifiList || []).filter(
            (w) => w.branchId === branch.id || w.locationName?.toLowerCase().includes(branch.code.toLowerCase())
          );

          return (
            <div
              key={branch.id}
              className={`bg-white rounded-3xl border ${branch.isActive ? 'border-slate-200 hover:border-indigo-300' : 'border-slate-200 opacity-70'} shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden relative group`}
            >
              {/* TOP COLOR STRIP */}
              <div className={`h-2 w-full ${colorStyles.bar}`} />

              <div className="p-5 space-y-4">
                {/* CARD HEADER */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider border ${colorStyles.badge}`}>
                        {branch.code}
                      </span>
                      {branch.isActive ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Đang hoạt động</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Tạm dừng
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {branch.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditModal(branch)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                      title="Chỉnh sửa chi nhánh"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBranch(branch)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Xóa chi nhánh"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ADDRESS & CONTACT */}
                <div className="space-y-2 text-xs text-slate-600 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span className="line-clamp-2 leading-relaxed">{branch.address}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Phụ trách: <strong className="text-slate-800">{branch.managerName || 'Chưa gán'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <Phone className="w-3 h-3" />
                      <span>{branch.phone || '024.3999...'}</span>
                    </div>
                  </div>
                </div>

                {/* STAFF & WIFI STATS */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                    <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center justify-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>Nhân Sự</span>
                    </div>
                    <div className="text-lg font-black text-indigo-900 mt-0.5">
                      {branchEmps.length} <span className="text-xs font-normal text-indigo-600">người</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
                      <Wifi className="w-3 h-3" />
                      <span>WiFi Chấm Công</span>
                    </div>
                    <div className="text-lg font-black text-slate-800 mt-0.5">
                      {branchWifis.length} <span className="text-xs font-normal text-slate-500">mạng</span>
                    </div>
                  </div>
                </div>

                {/* EMPLOYEES AVATAR PREVIEW */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Danh sách nhân viên ({branchEmps.length}):</span>
                  </div>
                  {branchEmps.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                      {branchEmps.map((emp) => (
                        <span
                          key={emp.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          <span>{emp.name}</span>
                          <span className="text-[9px] text-slate-400">({emp.id})</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic py-1">
                      Chưa có nhân viên nào thuộc chi nhánh này
                    </div>
                  )}
                </div>
              </div>

              {/* CARD FOOTER */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => handleToggleActive(branch.id)}
                  className={`text-[11px] font-bold cursor-pointer transition ${
                    branch.isActive ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'
                  }`}
                >
                  {branch.isActive ? 'Tạm Dừng Chi Nhánh' : 'Kích Hoạt Lại'}
                </button>

                <button
                  onClick={() => {
                    setTransferEmpId(employees[0]?.id || '');
                    setTargetBranchId(branch.id);
                    setIsTransferModalOpen(true);
                  }}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>+ Thêm NV vào đây</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredBranches.length === 0 && (
        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-3">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">Không tìm thấy chi nhánh phù hợp</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Thử tìm kiếm với từ khóa khác hoặc bấm nút "Thêm Cụm Chi Nhánh Mới" để tạo cơ sở đầu tiên.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition cursor-pointer"
          >
            + Tạo Chi Nhánh Ngay
          </button>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: ADD / EDIT BRANCH CLUSTER
      ========================================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* MODAL HEADER */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingBranch ? 'Chỉnh Sửa Cụm Chi Nhánh' : 'Tạo Mới Cụm Chi Nhánh'}
                  </h3>
                  <p className="text-[11px] text-indigo-200">
                    Khai báo thông tin chi nhánh & vị trí làm việc tách biệt
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MODAL FORM */}
            <form onSubmit={handleSaveBranch} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Mã Chi Nhánh (ID) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingBranch)}
                    value={formData.id || ''}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    placeholder="VD: CN_HN_01, CN_HCM_02"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Mã Viết Tắt (Ký hiệu) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="VD: HN-HQ, HCM-Q1, DN-HC"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Tên Cụm Chi Nhánh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Chi Nhánh Hà Nội (Trụ Sở Chính), Chi Nhánh Cầu Giấy..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Địa Chỉ Chi Tiết <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Số nhà, tòa nhà, tên đường, quận/huyện, tỉnh/thành phố..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Người Quản Lý / Phụ Trách
                  </label>
                  <input
                    type="text"
                    value={formData.managerName || ''}
                    onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                    placeholder="VD: Hoàng Thị Lan"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Số Điện Thoại Hotline
                  </label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="VD: 024.3999.8877"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* COLOR BADGE SELECTION */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Màu Sắc Nhận Diện Chi Nhánh
                </label>
                <div className="flex items-center gap-2">
                  {[
                    { key: 'blue', label: 'Xanh Dương', bg: 'bg-blue-500' },
                    { key: 'emerald', label: 'Xanh Lá', bg: 'bg-emerald-500' },
                    { key: 'amber', label: 'Vàng Cam', bg: 'bg-amber-500' },
                    { key: 'purple', label: 'Tím', bg: 'bg-purple-500' },
                    { key: 'rose', label: 'Đỏ Hồng', bg: 'bg-rose-500' },
                    { key: 'indigo', label: 'Chàm Indigo', bg: 'bg-indigo-500' },
                    { key: 'cyan', label: 'Xanh Ngọc', bg: 'bg-cyan-500' }
                  ].map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c.key as any })}
                      className={`w-7 h-7 rounded-full ${c.bg} flex items-center justify-center text-white transition-all cursor-pointer ${
                        formData.color === c.key ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={c.label}
                    >
                      {formData.color === c.key && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* GPS COORDINATES */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Tọa Độ GPS & Bán Kính Chấm Công (Tùy chọn)</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Vĩ độ (Lat)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.lat || 21.028511}
                      onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Kinh độ (Lng)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.lng || 105.854444}
                      onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Bán kính (Mét)</label>
                    <input
                      type="number"
                      value={formData.radiusMeters || 300}
                      onChange={(e) => setFormData({ ...formData, radiusMeters: parseInt(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mô Tả / Ghi Chú Chi Nhánh
                </label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ghi chú về phân cấp chi nhánh, chức năng nhiệm vụ..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* MODAL ACTION BUTTONS */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingBranch ? 'Lưu Thay Đổi' : 'Tạo Chi Nhánh'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: TRANSFER EMPLOYEE TO ANOTHER BRANCH
      ========================================================================== */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
            
            <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Chuyển Chi Nhánh Cho Nhân Sự</h3>
                  <p className="text-[11px] text-indigo-200">Điều phối nhân viên sang cơ sở làm việc mới</p>
                </div>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  1. Chọn Nhân Viên Cần Chuyển <span className="text-rose-500">*</span>
                </label>
                <select
                  value={transferEmpId}
                  onChange={(e) => setTransferEmpId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                >
                  {employees.map((emp) => {
                    const currentBranch = branches.find((b) => b.id === emp.branchId);
                    return (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.id}) — Hiện tại: {currentBranch ? currentBranch.name : 'Chưa gán'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  2. Chọn Cụm Chi Nhánh Đích <span className="text-rose-500">*</span>
                </label>
                <select
                  value={targetBranchId}
                  onChange={(e) => setTargetBranchId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-indigo-900"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      [{b.code}] {b.name} — ({b.address})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1 text-amber-800">
                  <Info className="w-3.5 h-3.5" />
                  <span>Lưu ý phân tuyến độc lập:</span>
                </div>
                <p className="leading-relaxed">
                  Khi chuyển sang chi nhánh mới, nhân viên sẽ tự động chỉ thấy lịch ca, chấm công và WiFi của chi nhánh đó.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>Xác Nhận Chuyển</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
