/**
 * Calculates distance between two coordinates in meters using Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function formatGpsCoordinates(lat?: number, lng?: number): string {
  if (lat === undefined || lng === undefined || (lat === 0 && lng === 0)) {
    return 'Chưa có tọa độ';
  }
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function getGoogleMapsUrl(lat?: number, lng?: number): string {
  if (!lat || !lng || (lat === 0 && lng === 0)) return '#';
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function evaluateAttendance(
  type: 'CHECK_IN' | 'CHECK_OUT',
  now: Date,
  shiftStartTime = '08:00',
  shiftEndTime = '13:00',
  graceMinutes = 15,
  workMode = 'OFFICE'
): string {
  if (workMode !== 'OFFICE') {
    return 'Hợp lệ';
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (type === 'CHECK_IN') {
    const [sH, sM] = shiftStartTime.split(':').map(Number);
    const shiftMinutes = sH * 60 + sM;
    if (currentMinutes <= shiftMinutes + graceMinutes) {
      return 'Đúng giờ';
    }
    return 'Đi muộn';
  } else {
    const [eH, eM] = shiftEndTime.split(':').map(Number);
    const shiftEndMinutes = eH * 60 + eM;
    if (currentMinutes >= shiftEndMinutes - graceMinutes) {
      return 'Đúng giờ';
    }
    return 'Về sớm';
  }
}
