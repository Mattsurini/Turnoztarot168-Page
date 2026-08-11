export function callDurationMinutes(packageName = "") {
  const match = String(packageName).match(/(\d+)\s*min/i);
  const minutes = match ? Number(match[1]) : 30;
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 30;
}

function minutesFromTime(time = "") {
  const match = String(time).match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function callSlotsOverlap(first, second) {
  if (!first?.appointmentDate || first.appointmentDate !== second?.appointmentDate) return false;
  const firstStart = minutesFromTime(first.appointmentTime);
  const secondStart = minutesFromTime(second.appointmentTime);
  if (firstStart == null || secondStart == null) return false;
  const firstEnd = firstStart + callDurationMinutes(first.packageName);
  const secondEnd = secondStart + callDurationMinutes(second.packageName);
  return firstStart < secondEnd && secondStart < firstEnd;
}

export function isBangkokFutureSlot(appointmentDate, appointmentTime) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(appointmentDate)) || !/^\d{2}:\d{2}$/.test(String(appointmentTime))) return false;
  const timestamp = new Date(`${appointmentDate}T${appointmentTime}:00+07:00`).getTime();
  return Number.isFinite(timestamp) && timestamp > Date.now();
}
