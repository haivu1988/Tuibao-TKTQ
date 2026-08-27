import React, { useState } from 'react';
import {
  GAS_CODE_GS,
  GAS_INDEX_HTML,
  GAS_SETUP_SHEET_MD,
  GAS_APPSSCRIPT_JSON
} from '../data/gasSourceCode';
import {
  Copy,
  Check,
  FileCode,
  FileSpreadsheet,
  Download,
  Search,
  ExternalLink,
  Code2,
  Terminal,
  Layers,
  Sparkles
} from 'lucide-react';
import { ToastMessage } from '../types';

interface GasCodeStudioProps {
  showToast: (type: ToastMessage['type'], title: string, message: string) => void;
}

export const GasCodeStudio: React.FC<GasCodeStudioProps> = ({ showToast }) => {
  const [activeTab, setActiveTab] = useState<'CODE_GS' | 'INDEX_HTML' | 'SETUP_SHEET' | 'APPSSCRIPT_JSON'>('CODE_GS');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const files = {
    CODE_GS: {
      name: 'Code.gs',
      type: 'Google Apps Script (Server-side)',
      icon: FileCode,
      code: GAS_CODE_GS,
      badge: 'Server GAS (V8 Engine)',
      desc: 'Chứa toàn bộ logic server: doGet, doPost, ghi chép vào Sheet, tính GPS Haversine, khóa LockService chống ghi đè.'
    },
    INDEX_HTML: {
      name: 'Index.html',
      type: 'Client-side SPA (HTML + Tailwind + JS)',
      icon: Code2,
      code: GAS_INDEX_HTML,
      badge: 'Client SPA (Mobile First)',
      desc: 'Giao diện ứng dụng đơn trang hoàn chỉnh: Đồng hồ thời gian thực, HTML5 GPS, dropdown nhân viên, nút Check-in / Check-out to.'
    },
    SETUP_SHEET: {
      name: 'Setup_Sheet.md',
      type: 'Hướng dẫn cấu hình & Cấu trúc Google Sheets',
      icon: FileSpreadsheet,
      code: GAS_SETUP_SHEET_MD,
      badge: 'Cấu hình Sheet & Deploy',
      desc: 'Chi tiết 3 tab ChamCong, NhanVien, CauHinh, các công thức tính toán và giải pháp chống lỗi đa tài khoản /u/0/.'
    },
    APPSSCRIPT_JSON: {
      name: 'appsscript.json',
      type: 'Manifest file',
      icon: Terminal,
      code: GAS_APPSSCRIPT_JSON,
      badge: 'Manifest JSON',
      desc: 'Cấu hình runtime V8, múi giờ Asia/Ho_Chi_Minh và quyền thực thi Web App.'
    }
  };

  const current = files[activeTab];

  const handleCopy = (fileName: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(fileName);
    showToast('success', 'Đã sao chép!', `Mã nguồn ${fileName} đã được lưu vào clipboard`);
    setTimeout(() => {
      setCopiedFile(null);
    }, 2500);
  };

  const handleDownload = (fileName: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('info', 'Đã tải xuống', `Tệp ${fileName} đã được lưu về máy`);
  };

  const handleDownloadAll = () => {
    // Download each file
    handleDownload('Code.gs', GAS_CODE_GS);
    setTimeout(() => handleDownload('Index.html', GAS_INDEX_HTML), 200);
    setTimeout(() => handleDownload('Setup_Sheet.md', GAS_SETUP_SHEET_MD), 400);
    setTimeout(() => handleDownload('appsscript.json', GAS_APPSSCRIPT_JSON), 600);
    showToast('success', 'Đã tải bộ mã nguồn', 'Toàn bộ 4 tệp mã nguồn Google Apps Script đã được tải về máy của bạn!');
  };

  const lineCount = current.code.split('\n').length;
  const charCount = current.code.length;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      
      {/* HEADER BANNER */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mã nguồn hoàn chỉnh 100% (No Placeholders)</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            Google Apps Script & Google Sheets Source Code
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Bộ mã nguồn chuẩn cho phép bạn copy trực tiếp vào trình soạn thảo Apps Script để triển khai Web App chấm công tức thì, hỗ trợ khóa LockService chống ghi đè và định vị GPS.
          </p>
        </div>

        <button
          onClick={handleDownloadAll}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-600/20 shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Tải xuống toàn bộ (.gs, .html, .md)</span>
        </button>
      </div>

      {/* FILE TABS SELECTOR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {(Object.keys(files) as Array<keyof typeof files>).map((key) => {
          const item = files[key];
          const isSelected = activeTab === key;
          const IconComp = item.icon;

          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`p-3.5 rounded-2xl text-left transition flex flex-col justify-between border cursor-pointer ${
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  <IconComp className="w-4 h-4" />
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    isSelected ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.badge}
                </span>
              </div>
              <div>
                <div className="font-extrabold text-sm tracking-wide">{item.name}</div>
                <div
                  className={`text-[11px] truncate mt-0.5 ${
                    isSelected ? 'text-emerald-100' : 'text-slate-500'
                  }`}
                >
                  {item.type}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ACTIVE FILE ACTIONS & CODE VIEWER */}
      <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-xl border border-slate-800 flex flex-col">
        
        {/* Top bar of Code Viewer */}
        <div className="bg-slate-950/80 px-5 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <div className="h-4 w-px bg-slate-800" />
            <span className="font-mono font-bold text-slate-200 text-sm">{current.name}</span>
            <span className="text-slate-500 text-[11px]">
              ({lineCount} dòng • {(charCount / 1024).toFixed(1)} KB)
            </span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => handleCopy(current.name, current.code)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition flex items-center gap-1.5 active:scale-95 shadow-sm cursor-pointer"
            >
              {copiedFile === current.name ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Đã chép!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép mã (Copy)</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleDownload(current.name, current.code)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1.5 cursor-pointer"
              title="Tải tệp này về máy"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải file</span>
            </button>
          </div>
        </div>

        {/* Description Banner */}
        <div className="bg-slate-800/40 px-5 py-2.5 border-b border-slate-800/60 text-xs text-slate-400 flex items-center justify-between">
          <span>💡 {current.desc}</span>
        </div>

        {/* Code Content Box */}
        <div className="relative max-h-[560px] overflow-auto p-4 font-mono text-xs text-slate-200 bg-slate-900/90 leading-relaxed select-text">
          <pre className="overflow-x-auto whitespace-pre font-mono">
            <code>{current.code}</code>
          </pre>
        </div>

        {/* Bottom Status Bar */}
        <div className="bg-slate-950 px-5 py-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Google Apps Script V8 Runtime • UTF-8</span>
          <span>Sẵn sàng copy-paste vào script.google.com</span>
        </div>

      </div>

    </div>
  );
};
