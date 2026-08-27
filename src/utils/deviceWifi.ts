/**
 * Device Fingerprint & WiFi Network Verification Utilities
 */

export interface SimulatedDevice {
  id: string;
  name: string;
  userAgent: string;
  label: string;
}

export interface SimulatedNetwork {
  ssid: string;
  ip: string;
  isOffice: boolean;
  label: string;
}

export const SIMULATED_DEVICES: SimulatedDevice[] = [
  {
    id: 'DEV-IPHONE-9482',
    name: 'iPhone 15 Pro - Safari',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
    label: '📱 iPhone 15 Pro (Mã: DEV-IPHONE-9482 - Máy đã gán cho NV001)'
  },
  {
    id: 'DEV-SAMSUNG-5521',
    name: 'Samsung Galaxy S24 - Chrome',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36',
    label: '📱 Samsung Galaxy S24 (Mã: DEV-SAMSUNG-5521 - Máy đã gán cho NV002)'
  },
  {
    id: 'DEV-NEW-8819',
    name: 'Xiaomi 14 Ultra - Chrome',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; 24030PN60G) AppleWebKit/537.36 Chrome/125.0.0.0 Mobile Safari/537.36',
    label: '✨ Điện thoại Mới (Mã: DEV-NEW-8819 - Chưa đăng ký, sẽ tự gán lần đầu)'
  },
  {
    id: 'DEV-STRANGER-9999',
    name: 'Unknown Device - Firefox',
    userAgent: 'Mozilla/5.0 (Android; Mobile; rv:126.0) Gecko/126.0 Firefox/126.0',
    label: '⛔ Thiết bị Lạ (Mã: DEV-STRANGER-9999 - Test chặn chấm công hộ)'
  }
];

export const SIMULATED_NETWORKS: SimulatedNetwork[] = [
  {
    ssid: 'COMPANY_HQ_OFFICE_5G',
    ip: '113.190.234.56',
    isOffice: true,
    label: '📶 WiFi Văn Phòng: COMPANY_HQ_OFFICE_5G (IP: 113.190.234.56 - Hợp lệ)'
  },
  {
    ssid: 'COMPANY_GUEST_WIFI',
    ip: '113.190.234.56',
    isOffice: true,
    label: '📶 WiFi Khách Cty: COMPANY_GUEST_WIFI (Cùng IP Cty 113.190.234.56)'
  },
  {
    ssid: '4G_VIETTEL_MOBILE',
    ip: '14.225.10.15',
    isOffice: false,
    label: '📶 4G / Dữ Liệu Di Động (IP: 14.225.10.15 - Ngoài mạng văn phòng)'
  },
  {
    ssid: 'HIGHLANDS_COFFEE_FREE',
    ip: '118.69.182.44',
    isOffice: false,
    label: '☕ WiFi Quán Cà Phê (IP: 118.69.182.44 - Không hợp lệ)'
  }
];

/**
 * Get or initialize persistent local device ID from localStorage
 */
export function getLocalDeviceId(): string {
  try {
    const existing = localStorage.getItem('ATTENDANCE_DEVICE_ID');
    if (existing) return existing;

    // Generate random short device ID
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isMac = /Macintosh/i.test(navigator.userAgent);
    
    let prefix = 'DEV-WEB';
    if (isIOS) prefix = 'DEV-IPHONE';
    else if (isAndroid) prefix = 'DEV-ANDROID';
    else if (isMac) prefix = 'DEV-MAC';

    const newId = `${prefix}-${randomHex}`;
    localStorage.setItem('ATTENDANCE_DEVICE_ID', newId);
    return newId;
  } catch (e) {
    return 'DEV-BROWSER-8842';
  }
}

/**
 * Get friendly device name from User Agent
 */
export function getFriendlyDeviceName(): string {
  const ua = navigator.userAgent;
  let os = 'Máy tính';
  if (/iPhone/i.test(ua)) os = 'iPhone';
  else if (/iPad/i.test(ua)) os = 'iPad';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Macintosh/i.test(ua)) os = 'MacBook';
  else if (/Windows/i.test(ua)) os = 'Windows PC';

  let browser = 'Browser';
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Edg/i.test(ua)) browser = 'Edge';

  return `${os} - ${browser}`;
}
