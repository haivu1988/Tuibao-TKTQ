import React, { useState } from 'react';
import {
  AttendanceRecord,
  Employee,
  OfficeConfig,
  ToastMessage
} from '../types';
import {
  Table,
  Users,
  Settings,
  Download,
  Search,
  Plus,
  ExternalLink,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Filter,
  FileSpreadsheet,
  Save,
  Trash2,
  Smartphone,
  Wifi,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { getGoogleMapsUrl } from '../utils/geolocation';

interface AdminSheetViewProps {
  attendanceRecords: AttendanceRecord[];
  employees: Employee[];
  officeConfig: OfficeConfig;
  onUpdateEmployees: (employees: Employee[]) => void;
  onUpdateConfig: (config: OfficeConfig) => void;
  showToast: (type: ToastMessage['type'], title: string, message: string) => void;
}

export const AdminSheetView: React.FC<AdminSheetViewProps> = ({
  attendanceRecords,
  employees,
  officeConfig,
  onUpdateEmployees,
  onUpdateConfig,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'CHAM_CONG' | 'NHAN_VIEN' | 'CAU_HINH'>('CHAM_CONG');
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CHECK_IN' | 'CHECK_OUT'>('ALL');
  const [deviceFilter, setDeviceFilter] = useState<'ALL' | 'REGISTERED' | 'UNREGISTERED'>('ALL');

  // Employee creation modal state
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [newEmp, setNewEmp] = useState<Partial<Employee>>({
    id: `NV00${employees.length + 1}`,
    name: '',
    department: 'Phòng Kỹ Thuật',
    email: '',
    role: 'Nhân viên',
    active: true
  });

  // Config local edit state
  const [localConfig, setLocalConfig] = useState<OfficeConfig>({ ...officeConfig });

  // Filter attendance records
  const filteredRecords = attendanceRecords.filter((rec) => {
    const matchSearch =
      rec.employeeName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      rec.employeeId.toLowerCase().includes(searchFilter.toLowerCase()) ||
      rec.department.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (rec.deviceId && rec.deviceId.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (rec.wifiSsid && rec.wifiSsid.toLowerCase().includes(searchFilter.toLowerCase()));

    const matchType =
      typeFilter === 'ALL' ? true : rec.type === typeFilter;

    return matchSearch && matchType;
  });

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const matchSearch =
      emp.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (emp.registeredDeviceId && emp.registeredDeviceId.toLowerCase().includes(searchFilter.toLowerCase()));

    const matchDevice =
      deviceFilter === 'ALL'
        ? true
        : deviceFilter === 'REGISTERED'
        ? Boolean(emp.registeredDeviceId)
        : !emp.registeredDeviceId;

    return matchSearch && matchDevice;
  });

  // Add employee handler
  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.id || !newEmp.name) {
      showToast('warning', 'Thiếu thông tin', 'Vui lòng nhập đầy đủ Mã NV và Họ tên');
      return;
    }

    const created: Employee = {
      id: newEmp.id.trim().toUpperCase(),
      name: newEmp.name.trim(),
      department: newEmp.department || 'Phòng Kỹ Thuật',
      email: newEmp.email || `${newEmp.id.toLowerCase()}@company.com`,
      role: newEmp.role || 'Nhân viên',
      active: true,
      registeredDeviceId: undefined,
      registeredDeviceName: undefined,
      deviceRegisteredAt: undefined
    };

    onUpdateEmployees([...employees, created]);
    setShowAddEmpModal(false);
    setNewEmp({
      id: `NV00${employees.length + 2}`,
      name: '',
      department: 'Phòng Kỹ Thuật',
      email: '',
      role: 'Nhân viên',
      active: true
    });
    showToast('success', 'Đã thêm nhân viên', `Đã tạo nhân viên ${created.name} (${created.id}). Máy sẽ được tự động đăng ký ở lần check-in đầu tiên!`);
  };

  // Reset Employee Device ID (Mở khóa thiết bị để nhân viên đổi máy mới)
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
      `Đã xóa mã máy của ${emp.name} (${emp.id}). Thiết bị mới check-in lần tới sẽ tự động đăng ký làm máy chính thức!`
    );
  };

  // Save config handler
  const handleSaveConfig = () => {
    onUpdateConfig(localConfig);
    showToast('success', 'Đã lưu cấu hình', 'Tọa độ GPS, cấu hình WiFi và chính sách mã máy đã được cập nhật thành công!');
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Mã Bản Ghi,Ngày,Giờ,Mã NV,Họ Tên,Phòng Ban,Loại,Ca Làm Việc,Mã Thiết Bị,Tên Máy,Trạng Thái Thiết Bị,WiFi SSID,IP Client,Khớp WiFi Cty,Hình Thức,Trạng Thái,Tọa Độ GPS,Khoảng Cách,Ghi Chú'
    ];

    const rows = attendanceRecords.map((r) => {
      const [d, t] = r.timestamp.split(' ');
      return [
        `"${r.id}"`,
        `"${d || ''}"`,
        `"${t || ''}"`,
        `"${r.employeeId}"`,
        `"${r.employeeName}"`,
        `"${r.department}"`,
        `"${r.type === 'CHECK_IN' ? 'VÀO CA' : 'RA CA'}"`,
        `"${r.shiftName}"`,
        `"${r.deviceId || 'DEV-N/A'}"`,
        `"${r.deviceName || 'N/A'}"`,
        `"${r.deviceStatus || 'VALID_REGISTERED'}"`,
        `"${r.wifiSsid || 'COMPANY_HQ_OFFICE_5G'}"`,
        `"${r.clientIp || '113.190.234.56'}"`,
        `"${r.isWifiValid ? 'HỢP LỆ' : 'NGOÀI CTY'}"`,
        `"${r.workMode}"`,
        `"${r.status}"`,
        `"${r.gps.lat}, ${r.gps.lng}"`,
        `"${r.gps.distanceToOfficeMeters || 0}m"`,
        `"${r.note || ''}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Bang_Cham_Cong_Chi_Tiet_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Xuất file CSV', 'Đã tải bảng chấm công dạng CSV về máy');
  };

  const registeredCount = employees.filter(e => Boolean(e.registeredDeviceId)).length;
  const unregisteredCount = employees.length - registeredCount;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      
      {/* HEADER & GOOGLE SHEETS TAB CONTROLS */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Google Sheet Database Simulator</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                Đồng bộ WiFi & Mã máy
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Quản lý dữ liệu chấm công, mã định danh thiết bị đã đăng ký và cấu hình hệ thống
            </p>
          </div>
        </div>

        {/* Tab Buttons (ChamCong, NhanVien, CauHinh) */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-2xl w-full md:w-auto">
          <button
            onClick={() => setActiveTab('CHAM_CONG')}
            className={`flex-1 md:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'CHAM_CONG'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Tab ChamCong ({attendanceRecords.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('NHAN_VIEN')}
            className={`flex-1 md:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'NHAN_VIEN'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Tab NhanVien ({employees.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('CAU_HINH')}
            className={`flex-1 md:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'CAU_HINH'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Tab CauHinh (WiFi/GPS/Khóa máy)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CHAM CONG SHEET TABLE */}
      {activeTab === 'CHAM_CONG' && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-4">
          
          {/* Filter and Export Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Tìm theo Tên, Mã NV, Mã máy (DEV-xxx), WiFi..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">Tất cả loại</option>
                <option value="CHECK_IN">Chỉ Vào ca</option>
                <option value="CHECK_OUT">Chỉ Ra ca</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportCsv}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất file Excel/CSV</span>
              </button>
            </div>
          </div>

          {/* Spreadsheet Table View */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead className="bg-slate-800 text-white sticky top-0 z-10 select-none">
                  <tr>
                    <th className="py-3 px-3.5 font-bold border-r border-slate-700 whitespace-nowrap">ID Bản Ghi</th>
                    <th className="py-3 px-3.5 font-bold border-r border-slate-700 whitespace-nowrap">Thời Gian</th>
                    <th className="py-3 px-3.5 font-bold border-r border-slate-700 whitespace-nowrap">Mã NV</th>
                    <th className="py-3 px-3.5 font-bold border-r border-slate-700 whitespace-nowrap">Họ Và Tên</th>
                    <th className="py-3 px-3.5 font-bold border-r border-slate-700 whitespace-nowrap text-center">Loại</th>
                    <th className="py-3 px-3.5 font-bold border-r border-slate-700 whitespace-nowrap">Mã Máy (Device ID)</th>
                    <th className="py-3 px-3.5 font-bold border-r border-slate-700 whitespace-nowrap">Xác Thực Thiết Bị</th>
                    <th className="py-3 px-3.5 font-bold border-r border-slate-700 whitespace-nowrap">Mạng WiFi & IP</th>
                    <th className="py-3 px-3.5 font-bold border-r border-slate-700 whitespace-nowrap">Trạng Thái</th>
                    <th className="py-3 px-3.5 font-bold border-r border-slate-700 whitespace-nowrap">GPS</th>
                    <th className="py-3 px-3.5 font-bold whitespace-nowrap">Ghi Chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        Không có dữ liệu chấm công nào phù hợp với bộ lọc
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r, idx) => {
                      const isCheckIn = r.type === 'CHECK_IN';
                      const statusColor = {
                        'Đúng giờ': 'text-emerald-700 bg-emerald-50 border-emerald-200',
                        'Đi muộn': 'text-rose-700 bg-rose-50 border-rose-200',
                        'Về sớm': 'text-amber-700 bg-amber-50 border-amber-200',
                        'Tăng ca': 'text-purple-700 bg-purple-50 border-purple-200',
                        'Hợp lệ': 'text-blue-700 bg-blue-50 border-blue-200'
                      }[r.status] || (r.status?.includes('Cảnh báo') ? 'text-rose-700 bg-rose-50 border-rose-200 font-bold' : 'text-slate-700 bg-slate-50 border-slate-200');

                      return (
                        <tr key={r.id} className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/40 hover:bg-slate-50'}>
                          <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-500 border-r border-slate-100 whitespace-nowrap">
                            {r.id}
                          </td>
                          <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-800 font-semibold border-r border-slate-100 whitespace-nowrap">
                            {r.timestamp}
                          </td>
                          <td className="py-2.5 px-3.5 font-bold text-slate-800 border-r border-slate-100 whitespace-nowrap">
                            {r.employeeId}
                          </td>
                          <td className="py-2.5 px-3.5 font-semibold text-slate-900 border-r border-slate-100 whitespace-nowrap">
                            {r.employeeName}
                          </td>
                          <td className="py-2.5 px-3.5 border-r border-slate-100 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isCheckIn ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {isCheckIn ? 'VÀO CA' : 'RA CA'}
                            </span>
                          </td>
                          
                          {/* Mã Máy */}
                          <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-800 font-bold border-r border-slate-100 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Smartphone className="w-3 h-3 text-slate-400" />
                              <span>{r.deviceId || 'DEV-N/A'}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-sans block">{r.deviceName || ''}</span>
                          </td>

                          {/* Xác thực máy */}
                          <td className="py-2.5 px-3.5 border-r border-slate-100 whitespace-nowrap">
                            {r.deviceStatus === 'AUTO_REGISTERED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <Sparkles className="w-3 h-3" /> Tự đăng ký lần đầu
                              </span>
                            )}
                            {r.deviceStatus === 'VALID_REGISTERED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <ShieldCheck className="w-3 h-3" /> Máy chính chủ
                              </span>
                            )}
                            {r.deviceStatus === 'MISMATCH_BLOCKED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <ShieldAlert className="w-3 h-3" /> Sai mã máy
                              </span>
                            )}
                            {!r.deviceStatus && (
                              <span className="text-[10px] text-slate-400">Hợp lệ</span>
                            )}
                          </td>

                          {/* WiFi & IP */}
                          <td className="py-2.5 px-3.5 border-r border-slate-100 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-800">
                              <Wifi className={`w-3 h-3 ${r.isWifiValid ? 'text-emerald-600' : 'text-amber-500'}`} />
                              <span>{r.wifiSsid || 'COMPANY_HQ_OFFICE_5G'}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              IP: {r.clientIp || '113.190.234.56'}
                            </span>
                          </td>

                          {/* Trạng thái */}
                          <td className="py-2.5 px-3.5 border-r border-slate-100 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${statusColor}`}>
                              {r.status}
                            </span>
                          </td>

                          {/* GPS */}
                          <td className="py-2.5 px-3.5 border-r border-slate-100 whitespace-nowrap">
                            {r.gps.lat !== 0 ? (
                              <a
                                href={getGoogleMapsUrl(r.gps.lat, r.gps.lng)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-700 hover:text-emerald-900 flex items-center gap-1 text-[11px] font-medium"
                              >
                                <MapPin className="w-3 h-3 text-rose-500" />
                                {r.gps.distanceToOfficeMeters !== undefined ? `${r.gps.distanceToOfficeMeters}m` : 'Maps'}
                              </a>
                            ) : (
                              <span className="text-slate-400 text-[11px]">N/A</span>
                            )}
                          </td>

                          {/* Ghi chú */}
                          <td className="py-2.5 px-3.5 text-slate-500 italic max-w-xs truncate text-[11px]">
                            {r.note || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-right text-[11px] text-slate-500">
            Tổng cộng: <strong>{filteredRecords.length}</strong> dòng bản ghi
          </div>
        </div>
      )}

      {/* TAB 2: NHAN VIEN SHEET TABLE */}
      {activeTab === 'NHAN_VIEN' && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-4">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng Nhân Viên</p>
                <p className="text-xl font-bold text-slate-800">{employees.length}</p>
              </div>
              <Users className="w-6 h-6 text-slate-400" />
            </div>

            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Đã Gán Mã Máy</p>
                <p className="text-xl font-bold text-emerald-900">{registeredCount}</p>
              </div>
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Chờ Tự Đăng Ký Lần Đầu</p>
                <p className="text-xl font-bold text-blue-900">{unregisteredCount}</p>
              </div>
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center space-x-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Tìm nhân viên, mã máy DEV-xxx..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              <select
                value={deviceFilter}
                onChange={(e) => setDeviceFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">Tất cả thiết bị</option>
                <option value="REGISTERED">Đã gán máy</option>
                <option value="UNREGISTERED">Chưa gán máy</option>
              </select>
            </div>

            <button
              onClick={() => setShowAddEmpModal(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Nhân Viên Mới</span>
            </button>
          </div>

          {/* Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="py-3 px-3.5 font-bold">Mã NV</th>
                    <th className="py-3 px-3.5 font-bold">Họ Và Tên</th>
                    <th className="py-3 px-3.5 font-bold">Phòng Ban</th>
                    <th className="py-3 px-3.5 font-bold">Mã Máy Đăng Ký (Device ID)</th>
                    <th className="py-3 px-3.5 font-bold">Tên Thiết Bị</th>
                    <th className="py-3 px-3.5 font-bold">Ngày Đăng Ký</th>
                    <th className="py-3 px-3.5 font-bold text-center">Thao Tác Quản Trị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3.5 font-bold text-emerald-700 font-mono">{emp.id}</td>
                      <td className="py-3 px-3.5 font-bold text-slate-900">{emp.name}</td>
                      <td className="py-3 px-3.5 text-slate-600">{emp.department}</td>
                      
                      {/* Mã Máy Đăng Ký */}
                      <td className="py-3 px-3.5">
                        {emp.registeredDeviceId ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                              {emp.registeredDeviceId}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 font-bold rounded-full">
                              Đã khóa
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 flex items-center gap-1 w-fit">
                            <Sparkles className="w-3 h-3" /> Tự đăng ký lần đầu
                          </span>
                        )}
                      </td>

                      {/* Tên Thiết Bị */}
                      <td className="py-3 px-3.5 text-slate-600">
                        {emp.registeredDeviceName || '—'}
                      </td>

                      {/* Ngày Đăng Ký */}
                      <td className="py-3 px-3.5 text-slate-500 font-mono text-[11px]">
                        {emp.deviceRegisteredAt || 'Chưa đăng ký'}
                      </td>

                      {/* Thao tác Reset Máy */}
                      <td className="py-3 px-3.5 text-center">
                        {emp.registeredDeviceId ? (
                          <button
                            type="button"
                            onClick={() => handleResetDevice(emp)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-semibold transition flex items-center justify-center gap-1 mx-auto cursor-pointer"
                            title="Xóa mã máy hiện tại để nhân viên đổi sang điện thoại mới"
                          >
                            <RotateCcw className="w-3 h-3 text-amber-600" />
                            <span>Mở khóa / Reset máy</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Sẵn sàng gán máy mới</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CAU HINH SHEET */}
      {activeTab === 'CAU_HINH' && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Cấu Hình Bảo Mật WiFi, Mã Máy & GPS (Tab CauHinh)</h3>
            <p className="text-xs text-slate-500">Các tham số kiểm soát tính năng chấm công đúng WiFi văn phòng và khóa mã máy chính chủ</p>
          </div>

          {/* SECTION 1: WIFI & DEVICE LOCK SETTINGS */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Wifi className="w-4 h-4 text-emerald-600" />
              <span>1. Quy Định WiFi Văn Phòng & Chống Chấm Công Hộ</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Tên Mạng WiFi Văn Phòng (SSID)</label>
                <input
                  type="text"
                  value={localConfig.officeWifiSsid}
                  onChange={(e) => setLocalConfig({ ...localConfig, officeWifiSsid: e.target.value })}
                  placeholder="Ví dụ: COMPANY_HQ_OFFICE_5G"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
                <p className="text-[10px] text-slate-400">Tên WiFi tại văn phòng công ty</p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Địa Chỉ Public IP Mạng Văn Phòng</label>
                <input
                  type="text"
                  value={localConfig.officeWifiIp}
                  onChange={(e) => setLocalConfig({ ...localConfig, officeWifiIp: e.target.value })}
                  placeholder="Ví dụ: 113.190.234.56"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
                <p className="text-[10px] text-slate-400">Google Apps Script dùng IP để xác thực nhân viên kết nối đúng WiFi văn phòng</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200/60">
              <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-emerald-300 transition">
                <input
                  type="checkbox"
                  checked={localConfig.requireWifiCheck}
                  onChange={(e) => setLocalConfig({ ...localConfig, requireWifiCheck: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Bắt buộc kết nối WiFi văn phòng</span>
                  <span className="text-[10px] text-slate-500">Chấm công tại văn phòng sẽ kiểm tra IP/WiFi hợp lệ</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-emerald-300 transition">
                <input
                  type="checkbox"
                  checked={localConfig.requireDeviceLock}
                  onChange={(e) => setLocalConfig({ ...localConfig, requireDeviceLock: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Khóa Mã Máy (Chống chấm công hộ)</span>
                  <span className="text-[10px] text-slate-500">Tự động đăng ký máy lần đầu và chỉ cho phép máy chính chủ</span>
                </div>
              </label>
            </div>
          </div>

          {/* SECTION 2: GPS SETTINGS */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-500" />
              <span>2. Tọa Độ GPS Geofencing Văn Phòng</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Tên Văn Phòng / Địa Điểm</label>
                <input
                  type="text"
                  value={localConfig.name}
                  onChange={(e) => setLocalConfig({ ...localConfig, name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Bán Kính Cho Phép (Mét)</label>
                <input
                  type="number"
                  value={localConfig.radiusMeters}
                  onChange={(e) => setLocalConfig({ ...localConfig, radiusMeters: parseInt(e.target.value, 10) || 100 })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Vĩ Độ Văn Phòng (Latitude)</label>
                <input
                  type="number"
                  step="0.000001"
                  value={localConfig.lat}
                  onChange={(e) => setLocalConfig({ ...localConfig, lat: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Kinh Độ Văn Phòng (Longitude)</label>
                <input
                  type="number"
                  step="0.000001"
                  value={localConfig.lng}
                  onChange={(e) => setLocalConfig({ ...localConfig, lng: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <a
              href={`https://www.google.com/maps?q=${localConfig.lat},${localConfig.lng}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-emerald-700 hover:underline flex items-center gap-1 font-medium"
            >
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              Kiểm tra vị trí văn phòng trên Google Maps
            </a>

            <button
              onClick={handleSaveConfig}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cấu Hình Mới</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL THÊM NHÂN VIÊN */}
      {showAddEmpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Thêm Nhân Viên Vào Hệ Thống</h3>
            
            <form onSubmit={handleAddEmployee} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mã Nhân Viên (*)</label>
                <input
                  type="text"
                  required
                  value={newEmp.id}
                  onChange={(e) => setNewEmp({ ...newEmp, id: e.target.value })}
                  placeholder="Ví dụ: NV007"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs uppercase text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Họ Và Tên (*)</label>
                <input
                  type="text"
                  required
                  value={newEmp.name}
                  onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                  placeholder="Ví dụ: Hoàng Minh Tuấn"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phòng Ban</label>
                <select
                  value={newEmp.department}
                  onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Phòng Kỹ Thuật">Phòng Kỹ Thuật</option>
                  <option value="Phòng Nhân Sự (HR)">Phòng Nhân Sự (HR)</option>
                  <option value="Phòng Kinh Doanh">Phòng Kinh Doanh</option>
                  <option value="Phòng Marketing">Phòng Marketing</option>
                  <option value="Phòng Kế Toán">Phòng Kế Toán</option>
                  <option value="Ban Giám Đốc">Ban Giám Đốc</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Chức Vụ</label>
                <input
                  type="text"
                  value={newEmp.role}
                  onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
                  placeholder="Ví dụ: Senior Specialist"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddEmpModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  Lưu Nhân Viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
