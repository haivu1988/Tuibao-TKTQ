import React, { useState } from 'react';
import {
  OfficeConfig,
  OfficeWifiNetwork,
  ToastMessage,
  Branch
} from '../types';
import {
  Wifi,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Globe,
  MapPin,
  Info,
  Server,
  Zap,
  Check,
  X,
  Copy,
  Sliders,
  HelpCircle,
  Building2,
  Layers
} from 'lucide-react';

interface WifiConfigManagerProps {
  officeConfig: OfficeConfig;
  branches?: Branch[];
  onUpdateConfig: (config: OfficeConfig) => void;
  showToast: (type: ToastMessage['type'], title: string, message: string) => void;
}

export const WifiConfigManager: React.FC<WifiConfigManagerProps> = ({
  officeConfig,
  branches = [],
  onUpdateConfig,
  showToast
}) => {
  const wifiList = officeConfig.authorizedWifiList || [];

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<OfficeWifiNetwork>>({
    ssid: '',
    ip: '',
    bssid: '',
    branchId: branches[0]?.id || 'CN_HN_01',
    locationName: 'Trụ sở chính - Văn phòng',
    description: '',
    isActive: true
  });

  const [filterQuery, setFilterQuery] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('ALL');
  const [showHelperModal, setShowHelperModal] = useState(false);

  // Quick detected current IP / Network simulation for easy 1-click add
  const detectedNetwork = {
    ssid: 'COMPANY_HQ_OFFICE_5G',
    ip: '113.190.234.56',
    bssid: 'd4:6e:0e:9a:bc:12'
  };

  // Reset form
  const handleResetForm = () => {
    setEditingId(null);
    setFormData({
      ssid: '',
      ip: '',
      bssid: '',
      branchId: branches[0]?.id || 'CN_HN_01',
      locationName: 'Trụ sở chính - Văn phòng',
      description: '',
      isActive: true
    });
  };

  // Pre-fill form from current network
  const handleAutoFillCurrent = () => {
    setFormData({
      ssid: detectedNetwork.ssid,
      ip: detectedNetwork.ip,
      bssid: detectedNetwork.bssid,
      branchId: branches[0]?.id || 'CN_HN_01',
      locationName: 'Văn phòng Hiện Tại (Tự phát hiện)',
      description: 'IP mạng phát hiện tự động từ thiết bị quản trị',
      isActive: true
    });
    showToast('info', 'Đã lấy thông tin mạng', `SSID: ${detectedNetwork.ssid} • IP: ${detectedNetwork.ip}`);
  };

  // Save / Add WiFi
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.ssid?.trim() || !formData.ip?.trim()) {
      showToast('warning', 'Thiếu thông tin', 'Vui lòng nhập Tên WiFi (SSID) và Địa chỉ IP công cộng!');
      return;
    }

    const now = new Date();
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let updatedList: OfficeWifiNetwork[];

    if (editingId) {
      // Edit existing
      updatedList = wifiList.map((item) => {
        if (item.id === editingId) {
          return {
            ...item,
            ssid: formData.ssid!.trim(),
            ip: formData.ip!.trim(),
            bssid: formData.bssid?.trim() || undefined,
            branchId: formData.branchId,
            locationName: formData.locationName?.trim() || 'Văn phòng',
            description: formData.description?.trim() || '',
            isActive: formData.isActive ?? true
          };
        }
        return item;
      });
      showToast('success', 'Cập nhật thành công', `Đã cập nhật mạng WiFi "${formData.ssid}"`);
    } else {
      // Add new
      const newWifi: OfficeWifiNetwork = {
        id: `WIFI_${Date.now().toString(36).toUpperCase()}`,
        ssid: formData.ssid.trim(),
        ip: formData.ip.trim(),
        bssid: formData.bssid?.trim() || undefined,
        branchId: formData.branchId || branches[0]?.id,
        locationName: formData.locationName?.trim() || 'Trụ sở chính',
        description: formData.description?.trim() || '',
        isActive: formData.isActive ?? true,
        registeredAt: dateFormatted
      };

      updatedList = [...wifiList, newWifi];
      showToast('success', 'Đăng ký WiFi thành công', `Đã thêm mạng "${newWifi.ssid}" (${newWifi.ip}) vào danh sách chấm công hợp lệ`);
    }

    // Update primary wifi config as well
    const primaryActive = updatedList.find((w) => w.isActive) || updatedList[0];

    onUpdateConfig({
      ...officeConfig,
      officeWifiSsid: primaryActive ? primaryActive.ssid : officeConfig.officeWifiSsid,
      officeWifiIp: primaryActive ? primaryActive.ip : officeConfig.officeWifiIp,
      authorizedWifiList: updatedList
    });

    handleResetForm();
  };

  // Start editing
  const handleStartEdit = (wifi: OfficeWifiNetwork) => {
    setEditingId(wifi.id);
    setFormData({
      ssid: wifi.ssid,
      ip: wifi.ip,
      bssid: wifi.bssid || '',
      branchId: wifi.branchId || branches[0]?.id,
      locationName: wifi.locationName,
      description: wifi.description || '',
      isActive: wifi.isActive
    });
  };

  // Toggle active status
  const handleToggleActive = (id: string) => {
    const updatedList = wifiList.map((item) => {
      if (item.id === id) {
        return { ...item, isActive: !item.isActive };
      }
      return item;
    });

    onUpdateConfig({
      ...officeConfig,
      authorizedWifiList: updatedList
    });

    const target = wifiList.find((w) => w.id === id);
    if (target) {
      showToast(
        'info',
        target.isActive ? 'Đã tạm dừng mạng' : 'Đã kích hoạt mạng',
        `Mạng WiFi "${target.ssid}" hiện ${!target.isActive ? 'CHO PHÉP' : 'KHÔNG CHO PHÉP'} chấm công.`
      );
    }
  };

  // Delete WiFi
  const handleDeleteWifi = (id: string) => {
    const target = wifiList.find((w) => w.id === id);
    if (!target) return;

    if (wifiList.length <= 1) {
      showToast('warning', 'Không thể xóa', 'Hệ thống cần duy trì ít nhất 1 địa chỉ WiFi văn phòng!');
      return;
    }

    const updatedList = wifiList.filter((w) => w.id !== id);
    onUpdateConfig({
      ...officeConfig,
      authorizedWifiList: updatedList
    });

    showToast('info', 'Đã xóa WiFi', `Đã xóa mạng "${target.ssid}" khỏi danh sách cho phép`);
    if (editingId === id) handleResetForm();
  };

  // Toggle Global Require WiFi Check
  const handleToggleRequireWifiCheck = () => {
    const nextState = !officeConfig.requireWifiCheck;
    onUpdateConfig({
      ...officeConfig,
      requireWifiCheck: nextState
    });

    showToast(
      nextState ? 'success' : 'warning',
      nextState ? 'Đã BẬT Bắt Buộc WiFi' : 'Đã TẮT Bắt Buộc WiFi',
      nextState
        ? 'Nhân viên khi chấm công "Tại văn phòng" bắt buộc phải kết nối đúng địa chỉ WiFi/IP đã đăng ký.'
        : 'Nhân viên có thể chấm công bằng bất kỳ mạng nào (4G, WiFi ngoài).'
    );
  };

  const filteredList = wifiList.filter(
    (w) => {
      const matchSearch =
        w.ssid.toLowerCase().includes(filterQuery.toLowerCase()) ||
        w.ip.toLowerCase().includes(filterQuery.toLowerCase()) ||
        w.locationName.toLowerCase().includes(filterQuery.toLowerCase());
      const matchBranch = selectedBranchFilter === 'ALL' || !w.branchId || w.branchId === selectedBranchFilter;
      return matchSearch && matchBranch;
    }
  );

  const activeCount = wifiList.filter((w) => w.isActive).length;

  return (
    <div className="space-y-6">
      
      {/* TOP BANNER & GLOBAL SETTINGS TOGGLE */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-3xl p-6 shadow-md border border-blue-800">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/30 rounded-xl backdrop-blur-xs text-blue-300 border border-blue-400/30">
                <Wifi className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">
                Đăng Ký & Quản Lý Địa Chỉ WiFi Chấm Công
              </h2>
            </div>
            <p className="text-xs text-blue-200 leading-relaxed">
              Khai báo các mạng WiFi (SSID) và địa chỉ IP Public của văn phòng/chi nhánh. Khi nhân viên chấm công với hình thức <strong>"Tại Văn phòng"</strong>, hệ thống sẽ đối soát IP và WiFi để xác nhận đúng địa điểm làm việc, chống gian lận chấm công từ xa.
            </p>
          </div>

          {/* GLOBAL TOGGLE SWITCH CARD */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shrink-0 w-full lg:w-auto">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Bắt Buộc Đúng WiFi Văn Phòng</span>
                </div>
                <p className="text-[11px] text-blue-200 mt-0.5">
                  {officeConfig.requireWifiCheck
                    ? 'Đang BẬT: Chặn chấm công nếu sai WiFi'
                    : 'Đang TẮT: Cho phép mọi mạng (4G / Ngoài)'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleRequireWifiCheck}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  officeConfig.requireWifiCheck ? 'bg-emerald-500' : 'bg-slate-500'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    officeConfig.requireWifiCheck ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

        </div>

        {/* QUICK STATS PILLS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-blue-700/60">
          <div className="bg-blue-950/50 rounded-xl p-3 border border-blue-700/40">
            <div className="text-[10px] text-blue-300 uppercase tracking-wider font-bold">Tổng Mạng Đăng Ký</div>
            <div className="text-xl font-bold text-white mt-0.5">{wifiList.length} Điểm truy cập</div>
          </div>
          <div className="bg-blue-950/50 rounded-xl p-3 border border-blue-700/40">
            <div className="text-[10px] text-emerald-300 uppercase tracking-wider font-bold">Đang Kích Hoạt</div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">{activeCount} Mạng hợp lệ</div>
          </div>
          <div className="bg-blue-950/50 rounded-xl p-3 border border-blue-700/40">
            <div className="text-[10px] text-blue-300 uppercase tracking-wider font-bold">IP Chính Hiện Tại</div>
            <div className="text-xs font-mono font-bold text-white mt-1.5 truncate">{officeConfig.officeWifiIp || '113.190.234.56'}</div>
          </div>
          <div className="bg-blue-950/50 rounded-xl p-3 border border-blue-700/40 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-blue-300 uppercase tracking-wider font-bold">Trợ Giúp</div>
              <div className="text-xs text-blue-200 mt-0.5">Cách lấy IP WiFi</div>
            </div>
            <button
              onClick={() => setShowHelperModal(true)}
              className="p-1.5 bg-blue-500/30 hover:bg-blue-500/50 text-white rounded-lg transition cursor-pointer"
              title="Xem hướng dẫn"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* 2-COLUMN MAIN CONTENT: FORM ON LEFT, LIST ON RIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* =========================================================================
            LEFT COLUMN (5 COLS): FORM ĐĂNG KÝ / CHỈNH SỬA WIFI
        ========================================================================== */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Form Container Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                  editingId ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {editingId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">
                    {editingId ? 'Chỉnh Sửa Địa Chỉ WiFi' : 'Đăng Ký Địa Chỉ WiFi Mới'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {editingId ? `Đang sửa mã: ${editingId}` : 'Khai báo thông tin mạng văn phòng'}
                  </p>
                </div>
              </div>

              {editingId && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Hủy sửa
                </button>
              )}
            </div>

            {/* QUICK AUTO-DETECT CURRENT NETWORK BOX */}
            <div className="bg-blue-50/80 border border-blue-200/70 rounded-2xl p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-blue-900">
                <Radio className="w-4 h-4 text-blue-600 shrink-0 animate-pulse" />
                <div>
                  <span className="font-bold">Mạng máy này đang bắt: </span>
                  <span className="font-mono text-blue-700 font-semibold">{detectedNetwork.ssid}</span>
                  <span className="text-[10px] text-blue-500 block font-mono">IP: {detectedNetwork.ip}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAutoFillCurrent}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold transition flex items-center gap-1 shrink-0 shadow-xs cursor-pointer"
              >
                <Zap className="w-3 h-3" />
                <span>Lấy Nhanh</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              
              {/* TÊN WIFI (SSID) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Tên Mạng WiFi (SSID) (*)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.ssid || ''}
                    onChange={(e) => setFormData({ ...formData, ssid: e.target.value })}
                    placeholder="VD: COMPANY_HQ_OFFICE_5G"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pl-8 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                    required
                  />
                  <Wifi className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Tên phát sóng hiển thị trên điện thoại nhân viên</p>
              </div>

              {/* ĐỊA CHỈ PUBLIC IP */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Địa Chỉ IP Mạng Công Cộng (Public IP / Static IP) (*)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.ip || ''}
                    onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                    placeholder="VD: 113.190.234.56 hoặc dải IP"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pl-8 text-xs font-mono font-bold text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                    required
                  />
                  <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Địa chỉ IP nhà mạng gán cho Router văn phòng (chống Fake WiFi)</p>
              </div>

              {/* BSSID / MAC ROUTER (TÙY CHỌN) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Mã BSSID / MAC Access Point (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={formData.bssid || ''}
                  onChange={(e) => setFormData({ ...formData, bssid: e.target.value })}
                  placeholder="VD: d4:6e:0e:9a:bc:12"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* VỊ TRÍ & CHI NHÁNH */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {branches.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Chi Nhánh Trực Thuộc (*)
                    </label>
                    <div className="relative">
                      <select
                        value={formData.branchId || branches[0]?.id}
                        onChange={(e) => {
                          const bId = e.target.value;
                          const branch = branches.find((b) => b.id === bId);
                          setFormData({
                            ...formData,
                            branchId: bId,
                            locationName: branch ? branch.name : formData.locationName
                          });
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pl-8 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.code})
                          </option>
                        ))}
                      </select>
                      <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Khu Vực Cụ Thể (*)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.locationName || ''}
                      onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                      placeholder="VD: Tầng 3 - Phòng Kỹ Thuật"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pl-8 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                      required
                    />
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>
              </div>

              {/* GHI CHÚ */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Ghi Chú Router / Nhà Mạng
                </label>
                <input
                  type="text"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="VD: Cáp quang Viettel 300Mbps - Router phòng IT"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* TRẠNG THÁI ACTIVE */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div className="text-xs">
                  <span className="font-bold text-slate-700 block">Kích hoạt cho phép chấm công</span>
                  <span className="text-[10px] text-slate-400">Bật để nhân viên kết nối mạng này được duyệt</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isActive ?? true}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer accent-blue-600"
                />
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                className={`w-full py-3 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                  editingId
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{editingId ? 'Lưu Thay Đổi Mạng WiFi' : '+ Đăng Ký Địa Chỉ WiFi Này'}</span>
              </button>

            </form>

          </div>

        </div>

        {/* =========================================================================
            RIGHT COLUMN (7 COLS): DANH SÁCH CÁC ĐỊA CHỈ WIFI ĐÃ ĐĂNG KÝ
        ========================================================================== */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <span>Danh Sách WiFi Được Phép Chấm Công ({wifiList.length})</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Chỉ nhân viên kết nối đúng các mạng kích hoạt bên dưới mới được chấm công
              </p>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              {branches.length > 0 && (
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => setSelectedBranchFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                >
                  <option value="ALL">Tất cả chi nhánh</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Lọc tên WiFi, IP, vị trí..."
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none w-full sm:w-48 focus:ring-1 focus:ring-blue-500 shadow-2xs"
              />
            </div>
          </div>

          {/* LIST OF REGISTERED NETWORKS */}
          <div className="space-y-3">
            {filteredList.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-2">
                <Wifi className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">Không tìm thấy địa chỉ WiFi nào phù hợp.</p>
              </div>
            ) : (
              filteredList.map((wifi) => {
                const branch = branches.find((b) => b.id === wifi.branchId);
                return (
                <div
                  key={wifi.id}
                  className={`bg-white rounded-3xl border p-4.5 shadow-xs transition-all ${
                    wifi.isActive
                      ? 'border-slate-200 hover:border-blue-300'
                      : 'border-slate-200 bg-slate-50/70 opacity-75'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    
                    {/* Left: Info */}
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        wifi.isActive
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-500'
                      }`}>
                        <Wifi className="w-5 h-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 text-sm">{wifi.ssid}</span>
                          
                          {branch && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-blue-500" />
                              {branch.name}
                            </span>
                          )}

                          {wifi.isActive ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Cho Phép Chấm Công
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600 flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Tạm Dừng
                            </span>
                          )}

                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {wifi.id}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                          <span className="flex items-center gap-1 font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                            <Globe className="w-3 h-3 text-blue-500" />
                            IP: {wifi.ip}
                          </span>

                          <span className="flex items-center gap-1 text-slate-500">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {wifi.locationName}
                          </span>
                        </div>

                        {wifi.description && (
                          <p className="text-[11px] text-slate-400 italic">
                            {wifi.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      
                      <button
                        type="button"
                        onClick={() => handleToggleActive(wifi.id)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          wifi.isActive
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                        title={wifi.isActive ? 'Bấm để tạm dừng' : 'Bấm để kích hoạt'}
                      >
                        {wifi.isActive ? 'Đang bật' : 'Kích hoạt'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartEdit(wifi)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                        title="Chỉnh sửa thông tin"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteWifi(wifi.id)}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                        title="Xóa mạng này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                    </div>

                  </div>
                </div>
              );
            })
          )}
          </div>

          {/* HOW WIFI VERIFICATION WORKS BANNER */}
          <div className="bg-slate-100/80 rounded-3xl p-4.5 border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Cơ Chế Bảo Mật & Chống Gian Lận WiFi</span>
            </div>
            <ul className="space-y-1 text-[11px] text-slate-500 list-disc list-inside">
              <li>
                <strong>Public IP đối soát:</strong> Khi nhân viên bấm chấm công, hệ thống kiểm tra Public IP mà thiết bị đang gửi request lên Google Apps Script có khớp với danh sách IP văn phòng trên hay không.
              </li>
              <li>
                <strong>Chống phát WiFi giả lập:</strong> Dù kẻ gian tự đặt tên WiFi trùng với SSID công ty ở nhà, địa chỉ IP mạng phát ra vẫn sẽ khác Public IP công ty và bị chặn ngay lập tức.
              </li>
              <li>
                <strong>Nhiều chi nhánh:</strong> Có thể thêm không giới hạn các điểm WiFi tại các chi nhánh/kho bãi khác nhau.
              </li>
            </ul>
          </div>

        </div>

      </div>

      {/* =========================================================================
          MODAL: HƯỚNG DẪN LẤY ĐỊA CHỈ IP VÀ CẤU HÌNH WIFI VĂN PHÒNG
      ========================================================================== */}
      {showHelperModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-800">
                  Hướng Dẫn Lấy IP & Cấu Hình WiFi Văn Phòng
                </h3>
              </div>
              <button
                onClick={() => setShowHelperModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="font-bold text-blue-900 mb-1">1. Cách lấy Public IP của WiFi công ty:</p>
                <p className="text-[11px] text-blue-800">
                  Dùng máy tính hoặc điện thoại đang kết nối vào WiFi văn phòng, mở trình duyệt web và truy cập vào trang:
                </p>
                <code className="block mt-1 p-1.5 bg-white text-blue-700 font-mono rounded-lg border border-blue-200 text-center font-bold">
                  https://icanhazip.com hoặc https://whatismyip.com
                </code>
                <p className="text-[10px] text-blue-600 mt-1">
                  Dãy số hiện ra (ví dụ: <code>113.190.234.56</code>) chính là Public IP cần nhập vào ô "Địa Chỉ IP Mạng".
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="font-bold text-slate-800 mb-1">2. Cấu hình IP tĩnh (Static IP):</p>
                <p className="text-[11px] text-slate-600">
                  Nên liên hệ nhà mạng (VNPT, Viettel, FPT...) để đăng ký 1 gói IP Tĩnh cho doanh nghiệp. Điều này giúp IP văn phòng không bị thay đổi sau mỗi lần modem khởi động lại.
                </p>
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                <p className="font-bold text-emerald-900 mb-1">3. Kiểm tra tự động trên Google Apps Script:</p>
                <p className="text-[11px] text-emerald-800">
                  Google Apps Script Web App tự động nhận diện IP client gửi lên qua Webhook và so khớp với bảng cấu hình trong Google Sheets.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowHelperModal(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Đã Hiểu
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
