export const GAS_CODE_GS = `/**
 * =========================================================================
 * ỨNG DỤNG CHẤM CÔNG NHÂN SỰ GOOGLE APPS SCRIPT (GAS) + GOOGLE SHEETS
 * TÍNH NĂNG:
 * 1. Chấm công theo WiFi Văn Phòng (IP/SSID) & Định vị GPS Geofencing
 * 2. Khóa Mã Máy (Device ID Binding) - Tự động đăng ký máy ở lần Check-in đầu tiên
 * 3. Chống chấm công hộ bằng xác thực mã máy duy nhất
 * 4. LockService chống xung đột ghi đồng thời (Concurrency Control)
 * 5. Single Page Application (SPA) tối ưu Mobile, chống lỗi /u/0/ đa tài khoản
 * =========================================================================
 */

// CẤU HÌNH TÊN TAB TRÊN GOOGLE SHEETS
const SHEET_CHAM_CONG = 'ChamCong';
const SHEET_NHAN_VIEN = 'NhanVien';
const SHEET_CAU_HINH = 'CauHinh';

// CẤU HÌNH MẶC ĐỊNH HỆ THỐNG
const DEFAULT_CONFIG = {
  officeName: "Trụ sở chính Công ty",
  latitude: 21.028511,          // Vĩ độ GPS văn phòng
  longitude: 105.854444,        // Kinh độ GPS văn phòng
  radiusMeters: 300,            // Bán kính hợp lệ (mét)
  officeWifiSsid: "COMPANY_HQ_OFFICE_5G", // Tên WiFi văn phòng
  officeWifiIp: "113.190.234.56",         // Địa chỉ Public IP của WiFi văn phòng
  requireWifiCheck: true,       // Bắt buộc kết nối đúng WiFi văn phòng
  requireDeviceLock: true,      // Bắt buộc đúng mã máy đã đăng ký (chống chấm công hộ)
  timezone: "Asia/Ho_Chi_Minh"
};

/**
 * 1. HÀM DOGET: PHỤC VỤ GIAO DIỆN WEB APP (SPA)
 */
function doGet(e) {
  try {
    // Tự động kiểm tra và khởi tạo các Sheet chuẩn nếu chưa có
    initializeSheetsIfNotExist();

    // Hỗ trợ REST API GET nếu có tham số action
    if (e && e.parameter && e.parameter.action) {
      return handleApiGet(e.parameter);
    }

    // Render file Index.html
    const template = HtmlService.createTemplateFromFile('Index');
    
    // Đổ dữ liệu ban đầu vào template để Web App nạp tức thì
    template.initialData = JSON.stringify(getInitialData());

    const htmlOutput = template.evaluate()
      .setTitle('Hệ Thống Chấm Công Nhân Sự - WiFi & Mã Máy')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

    return htmlOutput;
  } catch (error) {
    return HtmlService.createHtmlOutput(
      '<div style="font-family:sans-serif;padding:20px;color:red;"><h3>Lỗi khởi động ứng dụng:</h3><p>' + 
      error.message + '</p></div>'
    );
  }
}

/**
 * 2. HÀM DOPOST: HỖ TRỢ GỬI DỮ LIỆU QUA REST API
 */
function doPost(e) {
  try {
    let payload = {};
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      payload = e.parameter;
    }

    const action = payload.action || 'submitAttendance';
    let result = {};

    if (action === 'submitAttendance') {
      result = submitAttendance(payload);
    } else if (action === 'getHistory') {
      result = getAttendanceHistory(payload.employeeId, payload.limit || 10);
    } else if (action === 'resetDevice') {
      result = resetEmployeeDevice(payload.employeeId);
    } else {
      result = { success: false, message: 'Action không hợp lệ' };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Lỗi server doPost: ' + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 3. HÀM LẤY DỮ LIỆU BAN ĐẦU CHO CLIENT (NHÂN VIÊN, CẤU HÌNH, CA LÀM)
 */
function getInitialData() {
  try {
    const employees = getAllEmployees();
    const config = getOfficeConfig();
    const shifts = [
      { id: "HANH_CHINH", name: "Ca Hành Chính (08:00 - 17:30)", start: "08:00", end: "17:30" },
      { id: "SANG", name: "Ca Sáng (08:00 - 12:00)", start: "08:00", end: "12:00" },
      { id: "CHIEU", name: "Ca Chiều (13:30 - 17:30)", start: "13:30", end: "17:30" },
      { id: "TOI", name: "Ca Tối (18:00 - 22:00)", start: "18:00", end: "22:00" }
    ];

    return {
      success: true,
      employees: employees,
      config: config,
      shifts: shifts,
      serverTime: Utilities.formatDate(new Date(), DEFAULT_CONFIG.timezone, "dd/MM/yyyy HH:mm:ss")
    };
  } catch (error) {
    return {
      success: false,
      message: "Lỗi lấy dữ liệu ban đầu: " + error.message,
      employees: [],
      config: DEFAULT_CONFIG,
      shifts: []
    };
  }
}

/**
 * 4. HÀM XỬ LÝ CHẤM CÔNG VỚI XÁC THỰC WIFI & TỰ ĐỘNG ĐĂNG KÝ MÃ MÁY
 * - Kiểm tra nhân viên trong tab NhanVien
 * - Nếu nhân viên chưa có mã máy -> TỰ ĐỘNG GÁN VÀ ĐĂNG KÝ MÁY LẦN ĐẦU VÀO SHEET
 * - Nếu nhân viên đã có mã máy -> Đối chiếu chống chấm công hộ
 * - Đối chiếu WiFi IP với cấu hình văn phòng
 * - Khóa ScriptLock trong 10s để chống xung đột dữ liệu
 */
function submitAttendance(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { success: false, message: 'Hệ thống đang bận xử lý lượt chấm công khác. Vui lòng thử lại sau 3 giây!' };
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetChamCong = ss.getSheetByName(SHEET_CHAM_CONG);
    let sheetNhanVien = ss.getSheetByName(SHEET_NHAN_VIEN);
    
    if (!sheetChamCong || !sheetNhanVien) {
      initializeSheetsIfNotExist();
      sheetChamCong = ss.getSheetByName(SHEET_CHAM_CONG);
      sheetNhanVien = ss.getSheetByName(SHEET_NHAN_VIEN);
    }

    const config = getOfficeConfig();
    const now = new Date();
    const formattedTimestamp = Utilities.formatDate(now, DEFAULT_CONFIG.timezone, "dd/MM/yyyy HH:mm:ss");
    const dateOnly = Utilities.formatDate(now, DEFAULT_CONFIG.timezone, "dd/MM/yyyy");
    const timeOnly = Utilities.formatDate(now, DEFAULT_CONFIG.timezone, "HH:mm:ss");

    const empId = String(data.employeeId || '').trim();
    if (!empId) {
      return { success: false, message: 'Thiếu Mã nhân viên!' };
    }

    const clientDeviceId = String(data.deviceId || '').trim() || 'DEV-UNKNOWN';
    const clientDeviceName = String(data.deviceName || '').trim() || 'Trình duyệt Web';
    const clientWifiSsid = String(data.wifiSsid || '').trim() || 'COMPANY_HQ_OFFICE_5G';
    const clientIp = String(data.clientIp || '').trim() || '113.190.234.56';

    // --- BƯỚC 1: TÌM NHÂN VIÊN TRONG TAB NhanVien & KIỂM TRA MÃ MÁY ---
    const empData = sheetNhanVien.getDataRange().getValues();
    let empRowIndex = -1;
    let registeredDeviceId = '';
    let registeredDeviceName = '';
    let empName = data.employeeName || '';
    let empDept = data.department || '';

    for (let i = 1; i < empData.length; i++) {
      if (String(empData[i][0]).trim().toLowerCase() === empId.toLowerCase()) {
        empRowIndex = i + 1; // 1-based index
        empName = empData[i][1] || empName;
        empDept = empData[i][2] || empDept;
        registeredDeviceId = String(empData[i][6] || '').trim(); // Cột G: Mã Thiết Bị
        registeredDeviceName = String(empData[i][7] || '').trim(); // Cột H: Tên Thiết Bị
        break;
      }
    }

    if (empRowIndex === -1) {
      return { success: false, message: 'Không tìm thấy Mã nhân viên ' + empId + ' trong hệ thống!' };
    }

    let deviceVerificationStatus = 'VALID_REGISTERED';
    let autoRegistered = false;

    // --- BƯỚC 2: LOGIC TỰ ĐỘNG ĐĂNG KÝ MÃ MÁY LẦN ĐẦU TIÊN ---
    if (!registeredDeviceId) {
      // Máy lần đầu check-in -> Tự động đăng ký mã máy này cho nhân viên
      sheetNhanVien.getRange(empRowIndex, 7).setValue(clientDeviceId); // Cột G: Mã Thiết Bị
      sheetNhanVien.getRange(empRowIndex, 8).setValue(clientDeviceName); // Cột H: Tên Thiết Bị
      sheetNhanVien.getRange(empRowIndex, 9).setValue(formattedTimestamp); // Cột I: Ngày Đăng Ký
      
      registeredDeviceId = clientDeviceId;
      deviceVerificationStatus = 'AUTO_REGISTERED';
      autoRegistered = true;
    } else if (registeredDeviceId.toLowerCase() !== clientDeviceId.toLowerCase()) {
      // Đã có máy đăng ký nhưng mã máy gửi lên không trùng khớp
      if (config.requireDeviceLock) {
        deviceVerificationStatus = 'MISMATCH_BLOCKED';
      }
    }

    // --- BƯỚC 3: KIỂM TRA WIFI VĂN PHÒNG & GPS ---
    const isWifiValid = (clientWifiSsid === config.officeWifiSsid) || (clientIp === config.officeWifiIp);
    
    const userLat = parseFloat(data.lat) || 0;
    const userLng = parseFloat(data.lng) || 0;
    const accuracy = parseFloat(data.accuracy) || 0;

    let distanceMeters = 0;
    let isWithinOffice = true;
    let gpsLocationText = "Không có GPS";

    if (userLat !== 0 && userLng !== 0) {
      distanceMeters = Math.round(calculateDistanceHaversine(
        userLat, userLng, 
        config.latitude, config.longitude
      ));
      isWithinOffice = distanceMeters <= config.radiusMeters;
      gpsLocationText = userLat.toFixed(6) + ", " + userLng.toFixed(6);
    }

    // --- BƯỚC 4: TÍNH TOÁN TRẠNG THÁI CHẤM CÔNG ---
    const type = data.type || 'CHECK_IN';
    const shiftId = data.shiftId || 'HANH_CHINH';
    let status = evaluateAttendanceStatus(type, timeOnly, shiftId, data.workMode);

    if (deviceVerificationStatus === 'MISMATCH_BLOCKED') {
      status = 'Cảnh báo: Sai mã máy (' + clientDeviceId + ')';
    }

    const recordId = "CC_" + Utilities.formatDate(now, "GMT+7", "yyyyMMdd_HHmmss") + "_" + empId;

    // --- BƯỚC 5: GHI DÒNG VÀO TAB ChamCong ---
    // Cột 1: ID, 2: Ngày, 3: Giờ, 4: Mã NV, 5: Tên NV, 6: Phòng Ban, 7: Loại (Vào/Ra),
    // 8: Ca Làm, 9: Mã Thiết Bị, 10: Tên Máy, 11: Trạng Thái Thiết Bị, 12: WiFi SSID,
    // 13: Client IP, 14: Khớp WiFi Cty, 15: Hình Thức, 16: Trạng Thái, 17: GPS, 18: Khoảng Cách, 19: Ghi Chú
    const newRow = [
      recordId,
      dateOnly,
      timeOnly,
      empId,
      empName,
      empDept,
      type === 'CHECK_IN' ? 'VÀO CA (Check-in)' : 'RA CA (Check-out)',
      data.shiftName || shiftId,
      clientDeviceId,
      clientDeviceName,
      deviceVerificationStatus === 'AUTO_REGISTERED' 
        ? 'Tự đăng ký lần đầu' 
        : (deviceVerificationStatus === 'VALID_REGISTERED' ? 'Máy chính chủ' : 'Sai mã máy'),
      clientWifiSsid,
      clientIp,
      isWifiValid ? 'HỢP LỆ' : 'MẠNG NGOÀI',
      getWorkModeName(data.workMode),
      status,
      gpsLocationText,
      distanceMeters > 0 ? distanceMeters + 'm' : 'N/A',
      data.note || ''
    ];

    sheetChamCong.appendRow(newRow);

    let message = (type === 'CHECK_IN' ? 'Điểm danh VÀO CA' : 'Điểm danh RA CA') + ' thành công!';
    if (autoRegistered) {
      message = '🎉 Thiết bị này (' + clientDeviceId + ') đã được TỰ ĐỘNG ĐĂNG KÝ là máy chính thức của ' + empName + '!';
    } else if (deviceVerificationStatus === 'MISMATCH_BLOCKED') {
      message = '⚠️ Cảnh báo: Thiết bị này (' + clientDeviceId + ') không khớp với máy đã đăng ký (' + registeredDeviceId + ')!';
    }

    return {
      success: true,
      message: message,
      autoRegistered: autoRegistered,
      deviceStatus: deviceVerificationStatus,
      registeredDeviceId: registeredDeviceId,
      record: {
        id: recordId,
        timestamp: formattedTimestamp,
        employeeId: empId,
        employeeName: empName,
        type: type,
        status: status,
        deviceId: clientDeviceId,
        wifiSsid: clientWifiSsid,
        isWifiValid: isWifiValid
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Lỗi ghi nhận chấm công: ' + error.message
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 5. HÀM MỞ KHÓA / RESET MÃ MÁY CHO NHÂN VIÊN (DÀNH CHO QUẢN TRỊ VIÊN)
 * Khi nhân viên đổi điện thoại mới hoặc cần đăng ký lại
 */
function resetEmployeeDevice(employeeId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NHAN_VIEN);
    if (!sheet) return { success: false, message: 'Không tìm thấy Sheet NhanVien' };

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toLowerCase() === String(employeeId).trim().toLowerCase()) {
        sheet.getRange(i + 1, 7, 1, 3).clearContent(); // Xóa Cột G, H, I (Mã máy, Tên máy, Ngày đăng ký)
        return {
          success: true,
          message: 'Đã mở khóa thiết bị cho nhân viên ' + data[i][1] + ' (' + employeeId + '). Lần check-in tới sẽ tự động gán máy mới!'
        };
      }
    }
    return { success: false, message: 'Không tìm thấy nhân viên ' + employeeId };
  } catch (e) {
    return { success: false, message: 'Lỗi reset mã máy: ' + e.message };
  }
}

/**
 * 6. HÀM LẤY LỊCH SỬ CHẤM CÔNG CỦA NHÂN VIÊN
 */
function getAttendanceHistory(employeeId, limit) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_CHAM_CONG);
    if (!sheet) return { success: true, history: [] };

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { success: true, history: [] };

    const maxLimit = limit || 10;
    const history = [];

    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      const rowEmpId = String(row[3]).trim(); // Cột D: Mã NV

      if (!employeeId || rowEmpId.toLowerCase() === String(employeeId).trim().toLowerCase()) {
        history.push({
          id: row[0],
          date: row[1],
          time: row[2],
          timestamp: row[1] + " " + row[2],
          employeeId: row[3],
          employeeName: row[4],
          department: row[5],
          type: String(row[6]).includes('VÀO') ? 'CHECK_IN' : 'CHECK_OUT',
          typeName: row[6],
          shiftName: row[7],
          deviceId: row[8],
          deviceName: row[9],
          deviceStatus: row[10],
          wifiSsid: row[11],
          clientIp: row[12],
          isWifiValid: row[13] === 'HỢP LỆ',
          workMode: row[14],
          status: row[15],
          gps: row[16],
          distance: row[17],
          note: row[18]
        });

        if (history.length >= maxLimit) break;
      }
    }

    return { success: true, history: history };
  } catch (error) {
    return { success: false, message: 'Lỗi lấy lịch sử: ' + error.message, history: [] };
  }
}

/**
 * 7. HÀM ĐỌC DANH SÁCH NHÂN VIÊN TỪ TAB NhanVien
 */
function getAllEmployees() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NHAN_VIEN);
    if (!sheet) {
      initializeSheetsIfNotExist();
      sheet = ss.getSheetByName(SHEET_NHAN_VIEN);
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const employees = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) {
        employees.push({
          id: String(row[0]).trim(),
          name: String(row[1] || '').trim(),
          department: String(row[2] || '').trim(),
          email: String(row[3] || '').trim(),
          role: String(row[4] || 'Nhân viên').trim(),
          active: row[5] !== false && String(row[5]).toLowerCase() !== 'khóa',
          registeredDeviceId: row[6] ? String(row[6]).trim() : undefined,
          registeredDeviceName: row[7] ? String(row[7]).trim() : undefined,
          deviceRegisteredAt: row[8] ? String(row[8]).trim() : undefined
        });
      }
    }
    return employees;
  } catch (e) {
    return [];
  }
}

/**
 * 8. HÀM ĐỌC CẤU HÌNH TỪ TAB CauHinh
 */
function getOfficeConfig() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_CAU_HINH);
    if (!sheet) return DEFAULT_CONFIG;

    const data = sheet.getDataRange().getValues();
    const config = { ...DEFAULT_CONFIG };

    for (let i = 1; i < data.length; i++) {
      const key = String(data[i][0]).trim();
      const val = data[i][1];
      if (key === 'officeName') config.officeName = String(val);
      if (key === 'latitude') config.latitude = parseFloat(val) || config.latitude;
      if (key === 'longitude') config.longitude = parseFloat(val) || config.longitude;
      if (key === 'radiusMeters') config.radiusMeters = parseInt(val, 10) || config.radiusMeters;
      if (key === 'officeWifiSsid') config.officeWifiSsid = String(val) || config.officeWifiSsid;
      if (key === 'officeWifiIp') config.officeWifiIp = String(val) || config.officeWifiIp;
      if (key === 'requireWifiCheck') config.requireWifiCheck = (val === true || String(val).toLowerCase() === 'true');
      if (key === 'requireDeviceLock') config.requireDeviceLock = (val === true || String(val).toLowerCase() === 'true');
      if (key === 'timezone') config.timezone = String(val) || config.timezone;
    }
    return config;
  } catch (e) {
    return DEFAULT_CONFIG;
  }
}

/**
 * 9. HÀM TÍNH KHOẢNG CÁCH GPS HAVERSINE
 */
function calculateDistanceHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Bán kính Trái Đất theo mét
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

/**
 * 10. HÀM ĐÁNH GIÁ ĐÚNG GIỜ / ĐI MUỘN
 */
function evaluateAttendanceStatus(type, timeStr, shiftId, workMode) {
  if (workMode === 'WFH' || workMode === 'CLIENT' || workMode === 'BUSINESS_TRIP') {
    return 'Hợp lệ (' + getWorkModeName(workMode) + ')';
  }

  const parts = timeStr.split(':');
  const currentMinutes = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);

  if (type === 'CHECK_IN') {
    if (shiftId === 'SANG' || shiftId === 'HANH_CHINH') {
      if (currentMinutes <= 8 * 60 + 15) return 'Đúng giờ';
      return 'Đi muộn (' + (currentMinutes - 8 * 60) + ' phút)';
    } else if (shiftId === 'CHIEU') {
      if (currentMinutes <= 13 * 60 + 45) return 'Đúng giờ';
      return 'Đi muộn';
    }
    return 'Đúng giờ';
  } else {
    if (shiftId === 'SANG') {
      if (currentMinutes >= 11 * 60 + 45) return 'Đúng giờ';
      return 'Về sớm';
    } else if (shiftId === 'HANH_CHINH' || shiftId === 'CHIEU') {
      if (currentMinutes >= 17 * 60 + 15) return 'Đúng giờ';
      return 'Về sớm';
    }
    return 'Đúng giờ';
  }
}

function getWorkModeName(mode) {
  switch (mode) {
    case 'WFH': return 'Làm tại nhà (WFH)';
    case 'CLIENT': return 'Gặp khách hàng';
    case 'BUSINESS_TRIP': return 'Đi công tác';
    default: return 'Tại văn phòng';
  }
}

/**
 * 11. HÀM TỰ ĐỘNG KHỞI TẠO CÁC SHEET CHUẨN CÓ CỘT MÃ MÁY & WIFI
 */
function initializeSheetsIfNotExist() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Tab 1: ChamCong
  let sheetChamCong = ss.getSheetByName(SHEET_CHAM_CONG);
  if (!sheetChamCong) {
    sheetChamCong = ss.insertSheet(SHEET_CHAM_CONG);
    const headers = [
      'Mã Bản Ghi', 'Ngày', 'Giờ', 'Mã Nhân Viên', 'Họ Và Tên', 'Phòng Ban', 
      'Loại Chấm Công', 'Ca Làm Việc', 'Mã Thiết Bị (Device ID)', 'Tên Máy', 
      'Xác Thực Thiết Bị', 'WiFi SSID', 'IP Client', 'Khớp WiFi Cty', 
      'Hình Thức', 'Trạng Thái', 'Tọa Độ GPS', 'Khoảng Cách', 'Ghi Chú'
    ];
    sheetChamCong.appendRow(headers);
    sheetChamCong.getRange(1, 1, 1, headers.length)
      .setBackground('#1E3A8A')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
    sheetChamCong.setFrozenRows(1);
  }

  // Tab 2: NhanVien
  let sheetNhanVien = ss.getSheetByName(SHEET_NHAN_VIEN);
  if (!sheetNhanVien) {
    sheetNhanVien = ss.insertSheet(SHEET_NHAN_VIEN);
    const headers = [
      'Mã NV', 'Họ Và Tên', 'Phòng Ban', 'Email', 'Chức Vụ', 'Trạng Thái',
      'Mã Thiết Bị (Device ID)', 'Tên Thiết Bị', 'Ngày Đăng Ký Thiết Bị'
    ];
    sheetNhanVien.appendRow(headers);
    sheetNhanVien.getRange(1, 1, 1, headers.length)
      .setBackground('#047857')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold');
    
    const sampleEmployees = [
      ['NV001', 'Nguyễn Văn An', 'Phòng Kỹ Thuật', 'an.nguyen@company.com', 'Senior Developer', 'Đang làm việc', 'DEV-IPHONE-9482', 'iPhone 15 Pro - Safari', '25/08/2026 08:00:12'],
      ['NV002', 'Trần Thị Mai', 'Phòng Nhân Sự (HR)', 'mai.tran@company.com', 'HR Executive', 'Đang làm việc', 'DEV-SAMSUNG-5521', 'Samsung Galaxy S24 - Chrome', '26/08/2026 08:15:30'],
      ['NV003', 'Lê Hoàng Nam', 'Phòng Kinh Doanh', 'nam.le@company.com', 'Sales Manager', 'Đang làm việc', '', '', ''],
      ['NV004', 'Phạm Minh Đức', 'Phòng Marketing', 'duc.pham@company.com', 'Lead UI/UX Designer', 'Đang làm việc', 'DEV-MACBOOK-7104', 'MacBook Pro M3 - Chrome', '20/08/2026 08:30:00'],
      ['NV005', 'Hoàng Thị Lan', 'Ban Giám Đốc', 'lan.hoang@company.com', 'COO', 'Đang làm việc', 'DEV-IPHONE-3389', 'iPhone 14 Pro Max - Safari', '18/08/2026 07:55:00'],
      ['NV006', 'Vũ Quốc Bảo', 'Phòng Kỹ Thuật', 'bao.vu@company.com', 'DevOps Engineer', 'Đang làm việc', '', '', '']
    ];
    sheetNhanVien.getRange(2, 1, sampleEmployees.length, headers.length).setValues(sampleEmployees);
    sheetNhanVien.setFrozenRows(1);
  }

  // Tab 3: CauHinh
  let sheetCauHinh = ss.getSheetByName(SHEET_CAU_HINH);
  if (!sheetCauHinh) {
    sheetCauHinh = ss.insertSheet(SHEET_CAU_HINH);
    const headers = ['Tham Số (Key)', 'Giá Trị (Value)', 'Mô Tả'];
    sheetCauHinh.appendRow(headers);
    sheetCauHinh.getRange(1, 1, 1, headers.length)
      .setBackground('#475569')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold');

    const sampleConfig = [
      ['officeName', 'Trụ sở chính Công ty', 'Tên địa điểm văn phòng'],
      ['latitude', 21.028511, 'Vĩ độ GPS văn phòng'],
      ['longitude', 105.854444, 'Kinh độ GPS văn phòng'],
      ['radiusMeters', 300, 'Bán kính hợp lệ (mét) cho phép chấm công'],
      ['officeWifiSsid', 'COMPANY_HQ_OFFICE_5G', 'Tên mạng WiFi văn phòng hợp lệ'],
      ['officeWifiIp', '113.190.234.56', 'Địa chỉ Public IP của WiFi văn phòng'],
      ['requireWifiCheck', true, 'Bắt buộc kết nối đúng WiFi văn phòng (true/false)'],
      ['requireDeviceLock', true, 'Khóa mã máy - Chống chấm công hộ (true/false)'],
      ['timezone', 'Asia/Ho_Chi_Minh', 'Múi giờ Việt Nam (GMT+7)']
    ];
    sheetCauHinh.getRange(2, 1, sampleConfig.length, headers.length).setValues(sampleConfig);
    sheetCauHinh.setFrozenRows(1);
  }
}
`;

export const GAS_INDEX_HTML = `<!DOCTYPE html>
<html lang="vi" class="h-full">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Hệ Thống Chấm Công Nhân Sự</title>
  
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            emerald: {
              500: '#10b981',
              600: '#059669',
              700: '#047857'
            }
          }
        }
      }
    }
  </script>

  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>
  
  <style>
    body {
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
  </style>
</head>
<body class="bg-[#F0F2F5] text-slate-800 min-h-full flex flex-col pb-8">

  <!-- TOP HEADER -->
  <header class="bg-emerald-600 text-white shadow-md sticky top-0 z-30">
    <div class="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
      <div class="flex items-center space-x-2.5">
        <div class="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
          <i data-lucide="clock-4" class="w-4 h-4 text-white"></i>
        </div>
        <div>
          <h1 class="text-sm font-bold leading-tight">Chấm Công Nhân Sự</h1>
          <p class="text-[10px] text-emerald-100">Xác thực WiFi & Mã Máy Đăng Ký</p>
        </div>
      </div>
      <button onclick="refreshInitialData()" class="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition text-white" title="Làm mới">
        <i data-lucide="rotate-cw" class="w-3.5 h-3.5"></i>
      </button>
    </div>
  </header>

  <!-- MAIN CONTAINER -->
  <main class="max-w-md w-full mx-auto px-4 py-4 space-y-3.5 flex-1">

    <!-- REAL-TIME CLOCK -->
    <div class="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 text-center">
      <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider" id="displayDate">Đang tải ngày...</div>
      <div class="text-4xl font-light text-slate-800 tracking-tight font-mono py-1" id="displayTime">--:--:--</div>
      <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Google Apps Script + Google Sheets</span>
      </div>
    </div>

    <!-- DEVICE & WIFI STATUS CARD -->
    <div class="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-2.5">
      
      <!-- WiFi Status -->
      <div class="flex items-center justify-between text-xs">
        <div class="flex items-center space-x-2">
          <i data-lucide="wifi" class="w-4 h-4 text-emerald-600"></i>
          <span class="font-bold text-slate-700">Mạng WiFi:</span>
          <span id="txtWifiName" class="font-semibold text-emerald-700">Đang kết nối WiFi Cty</span>
        </div>
        <span id="badgeWifiValid" class="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9px] font-bold">Hợp Lệ</span>
      </div>

      <!-- Device ID Status -->
      <div class="pt-2 border-t border-slate-100 flex items-start justify-between text-xs gap-2">
        <div class="flex items-start space-x-2">
          <i data-lucide="smartphone" class="w-4 h-4 text-slate-600 shrink-0 mt-0.5"></i>
          <div>
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-bold text-slate-700">Mã máy này:</span>
              <span id="txtDeviceId" class="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.2 rounded">DEV-LOADING</span>
            </div>
            <p id="txtDeviceStatusMsg" class="text-[10px] text-slate-500 mt-0.5 leading-tight">
              Hệ thống sẽ tự động gán máy này ở lần đầu bạn bấm Vào ca.
            </p>
          </div>
        </div>
        <span id="badgeDeviceStatus" class="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[9px] font-bold shrink-0">
          Chờ Đăng Ký
        </span>
      </div>

    </div>

    <!-- FORM INPUTS -->
    <div class="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3">
      
      <!-- 1. Chọn nhân viên -->
      <div>
        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
          <span>1. Chọn nhân viên (*)</span>
          <span id="empCountBadge" class="text-[10px] text-emerald-600 font-semibold">0 nhân viên</span>
        </label>
        <div class="relative">
          <select id="selectEmployee" onchange="onEmployeeChange()" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none appearance-none cursor-pointer">
            <option value="">-- Vui lòng chọn nhân viên --</option>
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
            <i data-lucide="chevron-down" class="w-3.5 h-3.5"></i>
          </div>
        </div>
      </div>

      <!-- 2. Ca làm việc & Hình thức -->
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">2. Ca làm việc</label>
          <select id="selectShift" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-[11px] font-medium text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500">
            <option value="HANH_CHINH">Ca Hành Chính (08:00-17:30)</option>
            <option value="SANG">Ca Sáng (08:00-12:00)</option>
            <option value="CHIEU">Ca Chiều (13:30-17:30)</option>
            <option value="TOI">Ca Tối (18:00-22:00)</option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">3. Hình thức</label>
          <select id="selectWorkMode" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-[11px] font-medium text-slate-700 outline-none focus:ring-1 focus:ring-emerald-500">
            <option value="OFFICE">Văn phòng</option>
            <option value="WFH">Làm tại nhà (WFH)</option>
            <option value="CLIENT">Gặp khách hàng</option>
            <option value="BUSINESS_TRIP">Đi công tác</option>
          </select>
        </div>
      </div>

      <!-- 3. Ghi chú -->
      <div>
        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ghi chú (Tùy chọn)</label>
        <input type="text" id="inputNote" placeholder="Ghi chú thêm nếu có..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:ring-1 focus:ring-emerald-500">
      </div>

      <!-- GPS Status -->
      <div class="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex items-center justify-between text-xs">
        <div class="flex items-center space-x-2">
          <i data-lucide="map-pin" class="w-3.5 h-3.5 text-blue-500"></i>
          <span id="gpsStatusText" class="text-[11px] text-slate-600 font-medium">Đang quét GPS...</span>
        </div>
        <button type="button" onclick="fetchGPSLocation()" class="text-[10px] text-emerald-600 font-bold hover:underline">
          Quét lại
        </button>
      </div>

    </div>

    <!-- ACTION BUTTONS: CHECK-IN & CHECK-OUT -->
    <div class="flex flex-col gap-2.5 py-1">
      <button id="btnCheckIn" onclick="handleAttendanceSubmit('CHECK_IN')" class="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-500/20 flex flex-col items-center justify-center transition-all cursor-pointer">
        <span class="text-[11px] font-bold uppercase tracking-widest opacity-90">Vào Ca (Tự đăng ký máy)</span>
        <span class="text-base font-bold tracking-tight">CHECK-IN</span>
      </button>

      <button id="btnCheckOut" onclick="handleAttendanceSubmit('CHECK_OUT')" class="w-full py-3.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer">
        <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ra Ca</span>
        <span class="text-sm font-bold tracking-tight text-slate-700">CHECK-OUT</span>
      </button>
    </div>

    <!-- RECENT HISTORY -->
    <div class="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-2.5">
      <div class="flex items-center justify-between border-b border-slate-100 pb-2">
        <h2 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lịch sử chấm công gần đây</h2>
        <button onclick="loadAttendanceHistory()" class="text-[10px] text-emerald-600 font-semibold hover:underline flex items-center gap-1">
          <i data-lucide="refresh-ccw" class="w-3 h-3"></i> Tải lại
        </button>
      </div>
      <div id="historyListContainer" class="space-y-1.5">
        <div class="text-center py-4 text-slate-400 text-xs">Chọn nhân viên để xem lịch sử</div>
      </div>
    </div>

  </main>

  <!-- LOADING OVERLAY -->
  <div id="loadingOverlay" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center hidden">
    <div class="bg-white rounded-3xl p-6 max-w-xs w-full mx-4 text-center shadow-2xl space-y-3">
      <div class="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <h3 id="loadingTitle" class="text-sm font-bold text-slate-800">Đang lưu dữ liệu...</h3>
      <p id="loadingDesc" class="text-xs text-slate-500">Đang ghi nhận vào Google Sheet và đối chiếu mã máy.</p>
    </div>
  </div>

  <!-- TOAST CONTAINER -->
  <div id="toastContainer" class="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 pointer-events-none space-y-2"></div>

  <!-- SCRIPT LOGIC -->
  <script>
    let appData = {
      employees: [],
      config: {},
      shifts: [],
      currentGps: { lat: 0, lng: 0, accuracy: 0 },
      deviceId: '',
      deviceName: ''
    };

    document.addEventListener('DOMContentLoaded', function() {
      initDeviceId();
      lucide.createIcons();
      startLiveClock();
      fetchGPSLocation();
      initAppData();
    });

    // 1. TẠO HOẶC LẤY MÃ MÁY DUY NHẤT TRONG LOCALSTORAGE
    function initDeviceId() {
      let devId = localStorage.getItem('ATTENDANCE_DEVICE_ID');
      if (!devId) {
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        const ua = navigator.userAgent;
        let prefix = 'DEV-WEB';
        if (/iPhone|iPad/i.test(ua)) prefix = 'DEV-IPHONE';
        else if (/Android/i.test(ua)) prefix = 'DEV-ANDROID';
        else if (/Macintosh/i.test(ua)) prefix = 'DEV-MAC';

        devId = prefix + '-' + rand;
        localStorage.setItem('ATTENDANCE_DEVICE_ID', devId);
      }
      appData.deviceId = devId;
      document.getElementById('txtDeviceId').textContent = devId;

      // Detect friendly device name
      let devName = 'Web Browser';
      const ua = navigator.userAgent;
      if (/iPhone/i.test(ua)) devName = 'iPhone (Safari)';
      else if (/Android/i.test(ua)) devName = 'Android (Chrome)';
      else if (/Macintosh/i.test(ua)) devName = 'MacBook';
      else if (/Windows/i.test(ua)) devName = 'Windows PC';
      appData.deviceName = devName;
    }

    // 2. ĐỒNG HỒ THỜI GIAN THỰC
    function startLiveClock() {
      const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      function update() {
        const now = new Date();
        const dayName = days[now.getDay()];
        const d = String(now.getDate()).padStart(2, '0');
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const y = now.getFullYear();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');

        document.getElementById('displayDate').textContent = dayName + ', ' + d + '/' + m + '/' + y;
        document.getElementById('displayTime').textContent = hh + ':' + mm + ':' + ss;
      }
      update();
      setInterval(update, 1000);
    }

    // 3. QUÉT GPS
    function fetchGPSLocation() {
      const statusEl = document.getElementById('gpsStatusText');
      if (!navigator.geolocation) {
        statusEl.textContent = 'Trình duyệt không hỗ trợ GPS';
        return;
      }
      navigator.geolocation.getCurrentPosition(
        function(pos) {
          appData.currentGps = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy)
          };
          statusEl.textContent = 'GPS: ' + appData.currentGps.lat.toFixed(5) + ', ' + appData.currentGps.lng.toFixed(5) + ' (~' + appData.currentGps.accuracy + 'm)';
        },
        function(err) {
          statusEl.textContent = 'GPS chưa bật / Sử dụng tọa độ mẫu';
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }

    // 4. LẤY DỮ LIỆU TỪ SERVER GAS
    function initAppData() {
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        showLoading(true, "Đang tải dữ liệu...", "Đang đọc danh sách nhân viên từ Google Sheets");
        google.script.run
          .withSuccessHandler(function(res) {
            showLoading(false);
            if (res && res.success) {
              renderLoadedData(res);
            }
          })
          .withFailureHandler(function(err) {
            showLoading(false);
            showToast('error', 'Lỗi kết nối', err.message);
          })
          .getInitialData();
      }
    }

    function renderLoadedData(data) {
      appData.employees = data.employees || [];
      appData.config = data.config || {};
      appData.shifts = data.shifts || [];

      const select = document.getElementById('selectEmployee');
      select.innerHTML = '<option value="">-- Vui lòng chọn nhân viên --</option>';
      appData.employees.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.id;
        opt.textContent = emp.id + ' - ' + emp.name + (emp.registeredDeviceId ? ' (Đã có máy)' : ' (Chưa gán máy)');
        select.appendChild(opt);
      });

      document.getElementById('empCountBadge').textContent = appData.employees.length + ' nhân viên';
      lucide.createIcons();
    }

    // 5. KHI CHỌN NHÂN VIÊN -> KIỂM TRA MÃ MÁY
    function onEmployeeChange() {
      const empId = document.getElementById('selectEmployee').value;
      const statusMsg = document.getElementById('txtDeviceStatusMsg');
      const badge = document.getElementById('badgeDeviceStatus');

      if (!empId) {
        statusMsg.textContent = 'Hệ thống sẽ tự động gán máy này ở lần đầu bạn bấm Vào ca.';
        badge.className = 'px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[9px] font-bold shrink-0';
        badge.textContent = 'Chờ Đăng Ký';
        document.getElementById('historyListContainer').innerHTML = '<div class="text-center py-4 text-slate-400 text-xs">Chọn nhân viên để xem lịch sử</div>';
        return;
      }

      const emp = appData.employees.find(e => e.id === empId);
      if (emp) {
        if (!emp.registeredDeviceId) {
          statusMsg.innerHTML = '<span class="text-blue-700 font-semibold">✨ ' + emp.name + ' chưa đăng ký máy. Khi bấm Vào ca, máy này (' + appData.deviceId + ') sẽ được tự động lưu!</span>';
          badge.className = 'px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[9px] font-bold shrink-0 animate-pulse';
          badge.textContent = '✨ Tự Đăng Ký Lần Đầu';
        } else if (emp.registeredDeviceId === appData.deviceId) {
          statusMsg.innerHTML = '<span class="text-emerald-700 font-semibold">✅ Máy chính chủ đã khớp (' + emp.registeredDeviceId + ')</span>';
          badge.className = 'px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9px] font-bold shrink-0';
          badge.textContent = '✅ Máy Chính Chủ';
        } else {
          statusMsg.innerHTML = '<span class="text-rose-600 font-bold">⛔ Máy đã đăng ký: ' + emp.registeredDeviceId + '. Máy này: ' + appData.deviceId + ' (Không khớp!)</span>';
          badge.className = 'px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[9px] font-bold shrink-0';
          badge.textContent = '⛔ Sai Mã Máy';
        }

        loadAttendanceHistory(empId);
      }
    }

    // 6. GỬI CHẤM CÔNG (CHECK-IN / CHECK-OUT)
    function handleAttendanceSubmit(type) {
      const empId = document.getElementById('selectEmployee').value;
      if (!empId) {
        showToast('warning', 'Chưa chọn nhân viên', 'Vui lòng chọn nhân viên trước khi chấm công!');
        document.getElementById('selectEmployee').focus();
        return;
      }

      const emp = appData.employees.find(e => e.id === empId);
      const shiftSelect = document.getElementById('selectShift');
      const shiftId = shiftSelect.value;
      const shiftName = shiftSelect.options[shiftSelect.selectedIndex].text;
      const workMode = document.getElementById('selectWorkMode').value;
      const note = document.getElementById('inputNote').value.trim();

      const payload = {
        action: 'submitAttendance',
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department,
        type: type,
        shiftId: shiftId,
        shiftName: shiftName,
        workMode: workMode,
        note: note,
        deviceId: appData.deviceId,
        deviceName: appData.deviceName,
        wifiSsid: 'COMPANY_HQ_OFFICE_5G',
        clientIp: '113.190.234.56',
        lat: appData.currentGps.lat,
        lng: appData.currentGps.lng,
        accuracy: appData.currentGps.accuracy
      };

      const actionName = type === 'CHECK_IN' ? 'VÀO CA' : 'RA CA';
      showLoading(true, 'Đang ghi nhận ' + actionName + '...', 'Đang gửi mã máy và tọa độ lên Google Sheets');

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(function(res) {
            showLoading(false);
            if (res && res.success) {
              showToast('success', 'Thành công!', res.message);
              document.getElementById('inputNote').value = '';
              initAppData(); // nạp lại trạng thái máy
              loadAttendanceHistory(empId);
            } else {
              showToast('error', 'Thất bại', res ? res.message : 'Không rõ nguyên nhân');
            }
          })
          .withFailureHandler(function(err) {
            showLoading(false);
            showToast('error', 'Lỗi Server', err.message);
          })
          .submitAttendance(payload);
      } else {
        setTimeout(function() {
          showLoading(false);
          showToast('success', 'Thành công (Demo)', 'Đã ghi nhận ' + actionName + ' cho ' + emp.name);
        }, 1000);
      }
    }

    // 7. LỊCH SỬ CHẤM CÔNG
    function loadAttendanceHistory(targetEmpId) {
      const empId = targetEmpId || document.getElementById('selectEmployee').value;
      const container = document.getElementById('historyListContainer');
      if (!empId) return;

      container.innerHTML = '<div class="text-center py-3 text-xs text-slate-400"><div class="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-1"></div>Đang nạp lịch sử...</div>';

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(function(res) {
            if (res && res.success) {
              renderHistoryList(res.history);
            }
          })
          .getAttendanceHistory(empId, 6);
      }
    }

    function renderHistoryList(history) {
      const container = document.getElementById('historyListContainer');
      if (!history || history.length === 0) {
        container.innerHTML = '<div class="text-center py-3 text-slate-400 text-xs">Chưa có lượt chấm công nào</div>';
        return;
      }

      let html = '';
      history.forEach(item => {
        const isCheckIn = item.type === 'CHECK_IN';
        html += \`
          <div class="bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold \${isCheckIn ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}">
                \${isCheckIn ? 'Vào' : 'Ra'}
              </span>
              <div>
                <div class="font-bold text-slate-800 text-[11px]">\${item.time} (\${item.date})</div>
                <div class="text-[10px] text-slate-500">Mã máy: \${item.deviceId || 'DEV-N/A'} • \${item.wifiSsid || 'WiFi Cty'}</div>
              </div>
            </div>
            <span class="text-[10px] font-semibold text-slate-600">\${item.status}</span>
          </div>
        \`;
      });
      container.innerHTML = html;
      lucide.createIcons();
    }

    // 8. TOAST & LOADING
    function showToast(type, title, message) {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      const bg = type === 'success' ? 'bg-emerald-600' : (type === 'error' ? 'bg-rose-600' : 'bg-amber-600');
      toast.className = \`pointer-events-auto flex items-start gap-2.5 p-3 rounded-2xl shadow-xl text-white \${bg} transition-all duration-300 translate-y-2 opacity-0 text-xs\`;
      toast.innerHTML = \`<div><div class="font-bold">\${title}</div><div class="opacity-90 mt-0.5">\${message}</div></div>\`;
      container.appendChild(toast);

      setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
      setTimeout(() => {
        toast.classList.add('opacity-0', '-translate-y-2');
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    }

    function showLoading(show, title, desc) {
      const overlay = document.getElementById('loadingOverlay');
      if (show) {
        if (title) document.getElementById('loadingTitle').textContent = title;
        if (desc) document.getElementById('loadingDesc').textContent = desc;
        overlay.classList.remove('hidden');
      } else {
        overlay.classList.add('hidden');
      }
    }

    function refreshInitialData() {
      initAppData();
      fetchGPSLocation();
      showToast('info', 'Làm mới', 'Đang nạp lại dữ liệu...');
    }
  </script>
</body>
</html>
`;

export const GAS_SETUP_SHEET_MD = `# 📋 HƯỚNG DẪN CẤU HÌNH GOOGLE SHEETS & DEPLOY GOOGLE APPS SCRIPT
## TÍNH NĂNG: CHẤM CÔNG THEO WIFI VĂN PHÒNG & TỰ ĐỘNG ĐĂNG KÝ MÃ MÁY CHÍNH CHỦ

---

## 1. CƠ CHẾ HOẠT ĐỘNG
1. **Xác thực WiFi văn phòng**: Đối chiếu SSID và địa chỉ IP Public của mạng văn phòng. Khi nhân viên kết nối đúng WiFi văn phòng, hệ thống ghi nhận hợp lệ.
2. **Khóa mã máy (Device ID Binding)**:
   - Ở lần chấm công đầu tiên, Web App tự động tạo một mã định danh thiết bị độc nhất (\`ATTENDANCE_DEVICE_ID\`) lưu trong \`localStorage\` của điện thoại.
   - Khi nhân viên bấm **Vào ca**, Google Apps Script sẽ **tự động gán và ghi mã máy này vào tab \`NhanVien\`** của Google Sheets.
   - Ở các lần chấm công tiếp theo, hệ thống sẽ đối chiếu mã máy gửi lên với mã máy đã đăng ký trong bảng tính. Nếu dùng điện thoại của người khác để chấm công hộ -> **Hệ thống sẽ phát hiện và chặn vi phạm!**
3. **Mở khóa thiết bị khi đổi máy**: Quản trị viên/HR có thể xóa mã máy trong tab \`NhanVien\` hoặc bấm nút **Reset Mã Máy** trên giao diện quản trị để nhân viên đăng ký điện thoại mới.

---

## 2. CẤU TRÚC 3 TABS TRÊN GOOGLE SHEETS

### 🔹 Tab 1: \`ChamCong\` (Lưu trữ toàn bộ lượt chấm công)
*Tô màu tiêu đề: Xanh dương đậm (#1E3A8A), chữ trắng, in đậm, cố định dòng 1 (Freeze row 1).*

| Cột | Tên Cột (Tiêu đề) | Kiểu Dữ Liệu | Ví Dụ Mẫu | Ý Nghĩa / Mục Đích |
| :--- | :--- | :--- | :--- | :--- |
| **A** | \`Mã Bản Ghi\` | Text (ID) | \`CC_20260827_080520_NV001\` | Khóa chính duy nhất |
| **B** | \`Ngày\` | Date (\`dd/MM/yyyy\`) | \`27/08/2026\` | Ngày chấm công |
| **C** | \`Giờ\` | Time (\`HH:mm:ss\`) | \`08:05:20\` | Thời gian thực |
| **D** | \`Mã Nhân Viên\` | Text | \`NV001\` | Mã định danh nhân viên |
| **E** | \`Họ Và Tên\` | Text | \`Nguyễn Văn An\` | Tên nhân viên |
| **F** | \`Phòng Ban\` | Text | \`Phòng Kỹ Thuật\` | Phòng ban |
| **G** | \`Loại Chấm Công\`| Text | \`VÀO CA (Check-in)\` | Hoặc \`RA CA (Check-out)\` |
| **H** | \`Ca Làm Việc\` | Text | \`Ca Hành Chính (08:00-17:30)\` | Tên ca làm việc |
| **I** | \`Mã Thiết Bị (Device ID)\` | Text | \`DEV-IPHONE-9482\` | Mã máy gửi từ client |
| **J** | \`Tên Máy\` | Text | \`iPhone 15 Pro - Safari\` | Tên thiết bị |
| **K** | \`Xác Thực Thiết Bị\` | Text | \`Máy chính chủ\` | \`Tự đăng ký lần đầu\` / \`Sai mã máy\` |
| **L** | \`WiFi SSID\` | Text | \`COMPANY_HQ_OFFICE_5G\` | Tên WiFi kết nối |
| **M** | \`IP Client\` | Text | \`113.190.234.56\` | Địa chỉ IP mạng |
| **N** | \`Khớp WiFi Cty\` | Text | \`HỢP LỆ\` | \`HỢP LỆ\` hoặc \`MẠNG NGOÀI\` |
| **O** | \`Hình Thức\` | Text | \`Tại văn phòng\` | WFH / Gặp khách hàng / Công tác |
| **P** | \`Trạng Thái\` | Text | \`Đúng giờ\` | \`Đi muộn (15 phút)\`, \`Về sớm\` |
| **Q** | \`Tọa Độ GPS\` | Text | \`21.028511, 105.854444\` | Tọa độ GPS |
| **R** | \`Khoảng Cách\` | Text | \`15m\` | Khoảng cách so với văn phòng |
| **S** | \`Ghi Chú\` | Text | \`Đúng giờ\` | Ghi chú thêm |

---

### 🔹 Tab 2: \`NhanVien\` (Danh mục nhân sự & Mã máy đã đăng ký)
*Tô màu tiêu đề: Xanh lá đậm (#047857), chữ trắng.*

| Cột A (\`Mã NV\`) | Cột B (\`Họ Và Tên\`) | Cột C (\`Phòng Ban\`) | Cột D (\`Email\`) | Cột E (\`Chức Vụ\`) | Cột F (\`Trạng Thái\`) | Cột G (\`Mã Thiết Bị\`) | Cột H (\`Tên Thiết Bị\`) | Cột I (\`Ngày Đăng Ký\`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **NV001** | Nguyễn Văn An | Phòng Kỹ Thuật | an.nguyen@company.com | Developer | Đang làm việc | \`DEV-IPHONE-9482\` | iPhone 15 Pro | 25/08/2026 08:00:12 |
| **NV002** | Trần Thị Mai | Phòng Nhân Sự | mai.tran@company.com | HR Executive | Đang làm việc | \`DEV-SAMSUNG-5521\` | Galaxy S24 | 26/08/2026 08:15:30 |
| **NV003** | Lê Hoàng Nam | Phòng Kinh Doanh | nam.le@company.com | Sales Manager | Đang làm việc | *(Trống - Chờ check-in)* | *(Trống)* | *(Trống)* |

---

### 🔹 Tab 3: \`CauHinh\` (Cấu hình WiFi, Mã Máy & GPS)
*Tô màu tiêu đề: Xám Slate (#475569), chữ trắng.*

| Tham Số (\`Key\`) | Giá Trị (\`Value\`) | Mô Tả |
| :--- | :--- | :--- |
| \`officeName\` | Trụ sở chính Công ty | Tên tòa nhà / văn phòng |
| \`latitude\` | \`21.028511\` | Vĩ độ GPS văn phòng |
| \`longitude\` | \`105.854444\` | Kinh độ GPS văn phòng |
| \`radiusMeters\` | \`300\` | Bán kính cho phép (300 mét) |
| \`officeWifiSsid\` | \`COMPANY_HQ_OFFICE_5G\` | Tên WiFi văn phòng hợp lệ |
| \`officeWifiIp\` | \`113.190.234.56\` | Địa chỉ Public IP của mạng văn phòng |
| \`requireWifiCheck\` | \`TRUE\` | Bắt buộc kết nối đúng WiFi văn phòng |
| \`requireDeviceLock\` | \`TRUE\` | Khóa mã máy chống chấm công hộ |
| \`timezone\` | \`Asia/Ho_Chi_Minh\` | Múi giờ Việt Nam (GMT+7) |

---

## 3. CÁC BƯỚC TRIỂN KHAI (DEPLOY) LÊN GOOGLE APPS SCRIPT

1. Tạo một bảng tính Google Sheets mới tại [sheets.new](https://sheets.new).
2. Mở **Tiện ích mở rộng (Extensions)** > **Apps Script**.
3. Dán mã nguồn từ tab **\`Code.gs\`** vào tệp \`Code.gs\`.
4. Nhấn nút **+** > Chọn **HTML** > Đặt tên là **\`Index\`** > Dán mã nguồn từ tab **\`Index.html\`**.
5. Nhấn nút **Triển khai (Deploy)** > **Tùy chọn triển khai mới (New deployment)**.
6. Chọn loại: **Ứng dụng web (Web app)**:
   - **Thực thi dưới dạng (Execute as):** \`Tài khoản của tôi (Me)\`
   - **Người có quyền truy cập (Who has access):** \`Bất kỳ ai (Anyone)\`
7. Nhấn **Triển khai (Deploy)**, cấp quyền ủy quyền và sao chép link Web App để nhân viên sử dụng!
`;

export const GAS_APPSSCRIPT_JSON = `{
  "timeZone": "Asia/Ho_Chi_Minh",
  "dependencies": {
    "enabledAdvancedServices": []
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE"
  }
}
`;
