export function cleanNumber(value: string) {
  return Number(value.replace(/[^\d]/g, "")) || 0;
}

export function formatNumberInput(value: string) {
  const number = cleanNumber(value);
  return number ? number.toLocaleString("id-ID") : "";
}

export function formatRupiah(number: number) {
  return "Rp" + Math.round(number || 0).toLocaleString("id-ID");
}

export function formatTanpaRp(number: number) {
  return Math.round(number || 0).toLocaleString("id-ID");
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}
