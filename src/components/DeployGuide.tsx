import React, { useState } from 'react';
import {
  Rocket,
  ShieldAlert,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  Copy,
  Check,
  Globe,
  Lock,
  Smartphone,
  Info
} from 'lucide-react';
import { ToastMessage } from '../types';

interface DeployGuideProps {
  showToast: (type: ToastMessage['type'], title: string, message: string) => void;
}

export const DeployGuide: React.FC<DeployGuideProps> = ({ showToast }) => {
  const [copiedStep, setCopiedStep] = useState<string | null>(null);
  const [webAppUrl, setWebAppUrl] = useState('https://script.google.com/macros/s/AKfycbx_YOUR_APP_ID_HERE/exec');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(id);
    showToast('success', 'Đã sao chép!', 'Đoạn văn bản đã được sao chép vào clipboard');
    setTimeout(() => setCopiedStep(null), 2500);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      
      {/* BANNER HEADER */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Rocket className="w-3.5 h-3.5" />
            <span>Hướng Dẫn Triển Khai & Khắc Phục Lỗi</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            Hướng Dẫn Deploy Google Apps Script Web App Chi Tiết
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Các bước cài đặt từng bước để ứng dụng hoạt động 100% không lỗi, kèm giải pháp chống xung đột đa tài khoản Google trên điện thoại di động.
          </p>
        </div>
      </div>

      {/* SECTION 1: CẤU HÌNH DEPLOY CHUẨN */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-6">
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
            1
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">4 Bước Deploy Chuẩn Trên Google Apps Script</h3>
            <p className="text-xs text-slate-500">Thực hiện chính xác các thông số bên dưới để nhân viên truy cập không bị lỗi cấp quyền</p>
          </div>
        </div>

        {/* Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Step 1 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Bước 1: Mở Trình Soạn Thảo</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">Google Sheets</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Mở bảng tính Google Sheets mới → Chọn menu <strong>Tiện ích mở rộng (Extensions)</strong> → Chọn <strong>Apps Script</strong>.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Bước 2: Tạo 2 Tệp Mã Nguồn</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">Code & HTML</span>
            </div>
            <ul className="text-xs text-slate-700 list-disc pl-4 space-y-1">
              <li>Dán mã vào tệp <strong><code>Code.gs</code></strong>.</li>
              <li>Bấm <strong>+</strong> → Chọn <strong>HTML</strong> → Đặt tên là <strong><code>Index</code></strong> và dán mã <code>Index.html</code>.</li>
            </ul>
          </div>

          {/* Step 3 - CRITICAL */}
          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-600" />
                Bước 3: Cấu Hình Triển Khai (Quan Trọng Nhất)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold">Cần Chọn Đúng</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-white p-3 rounded-xl border border-emerald-100 space-y-1">
                <div className="text-xs text-slate-500 font-semibold">Thực thi dưới dạng (Execute as):</div>
                <div className="text-sm font-extrabold text-emerald-700">Tài khoản của tôi (Me)</div>
                <p className="text-[11px] text-slate-600">
                  👉 <em>Lý do:</em> Ứng dụng sẽ dùng quyền của bạn để ghi dữ liệu vào Sheet mà không yêu cầu nhân viên phải có quyền chỉnh sửa bảng tính.
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-emerald-100 space-y-1">
                <div className="text-xs text-slate-500 font-semibold">Người có quyền truy cập (Who has access):</div>
                <div className="text-sm font-extrabold text-emerald-700">Bất kỳ ai (Anyone)</div>
                <p className="text-[11px] text-slate-600">
                  👉 <em>Lý do:</em> Nhân viên chỉ cần mở link trên điện thoại là bấm chấm công được ngay mà không gặp lỗi 403 Forbidden.
                </p>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Bước 4: Cấp Quyền Ủy Quyền Lần Đầu (Authorization)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">Chỉ làm 1 lần</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Nhấn <strong>Deploy</strong> → Khi Google hiện hộp thoại cảnh báo: Nhấn <strong>Xem xét quyền (Review permissions)</strong> → Chọn tài khoản của bạn → Bấm <strong>Nâng cao (Advanced)</strong> → Nhấp vào link <strong>Đi tới [Tên dự án] (không an toàn) / Go to App</strong> → Bấm <strong>Cho phép (Allow)</strong>.
            </p>
          </div>

        </div>
      </div>

      {/* SECTION 2: GIẢI PHÁP TRIỆT ĐỂ CHỐNG LỖI ĐA TÀI KHOẢN GOOGLE (/u/0/, /u/1/) */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-5">
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Xử Lý Lỗi Xung Đột Đa Tài Khoản (/u/0/, /u/1/)</h3>
            <p className="text-xs text-slate-500">Khắc phục triệt để hiện tượng trình duyệt điện thoại tự chèn tiền tố /u/1/ làm hỏng session</p>
          </div>
        </div>

        {/* Nguyên nhân */}
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            Nguyên nhân gốc rễ:
          </div>
          <p className="leading-relaxed">
            Khi nhân viên đăng nhập từ 2 tài khoản Gmail trở lên trên cùng trình duyệt Safari/Chrome điện thoại, Google sẽ chuyển hướng URL từ <code>/macros/s/ID/exec</code> sang <code>/macros/u/1/s/ID/exec</code>. Điều này khiến API <code>google.script.run</code> bị treo hoặc báo lỗi quyền truy cập.
          </p>
        </div>

        {/* 3 Giải pháp */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              01
            </div>
            <h4 className="text-xs font-bold text-slate-800">Dùng Link Rút Gọn (302 Redirect)</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Dán URL Web App vào <strong>TinyURL.com</strong> hoặc <strong>bit.ly</strong>. Khi mở link rút gọn, trình duyệt tự xử lý redirect sạch, tránh bị chèn <code>/u/x/</code>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              02
            </div>
            <h4 className="text-xs font-bold text-slate-800">Quét Mã QR Tại Văn Phòng</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              In mã QR dán tại cửa ra vào. Camera điện thoại quét mã QR sẽ mở trực tiếp trang web chấm công độc lập mà không bị dính cookie phiên đăng nhập cũ.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              03
            </div>
            <h4 className="text-xs font-bold text-slate-800">Thêm Vào Màn Hình Chính (PWA)</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Hướng dẫn nhân viên mở link và chọn <strong>"Add to Home Screen"</strong> (Thêm vào MH chính). App sẽ chạy toàn màn hình như ứng dụng cài đặt riêng.
            </p>
          </div>

        </div>
      </div>

      {/* SECTION 3: TẠO MÃ QR CODE CHẤM CÔNG VĂN PHÒNG */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Công Cụ Tạo QR Code Chấm Công Tức Thì</h3>
            <p className="text-xs text-slate-500">Dán URL Web App của bạn để tạo mã QR cho nhân viên quét vào ca/ra ca nhanh chóng</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
          {/* QR Preview Box */}
          <div className="w-44 h-44 bg-slate-100 border-2 border-dashed border-slate-300 rounded-3xl p-3 flex flex-col items-center justify-center shrink-0 shadow-inner">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(webAppUrl)}`}
              alt="QR Code Chấm Công"
              className="w-36 h-36 rounded-xl object-contain bg-white p-1"
            />
          </div>

          <div className="space-y-3 flex-1 w-full">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Dán URL Web App đã Deploy của bạn vào đây:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={webAppUrl}
                  onChange={(e) => setWebAppUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <button
                  onClick={() => copyToClipboard(webAppUrl, 'qr-url')}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl shrink-0 transition cursor-pointer"
                  title="Sao chép link"
                >
                  {copiedStep === 'qr-url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-slate-700 flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Mẹo: Bạn có thể in mã QR này và dán tại bàn lễ tân hoặc cửa văn phòng. Nhân viên đến nơi chỉ cần mở camera điện thoại quét mã là vào thẳng màn hình chấm công!
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
