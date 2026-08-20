export const normalizeEmailSlug = (email: string) =>
  email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "master";

export const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const normalizeSlugOrFallback = (value: string, fallback = "master") => normalizeSlug(value) || fallback;

export const resolveLatinSlug = (value: string, fallback: string) => {
  const hasLatinOrDigit = /[a-z0-9]/i.test(value);
  return hasLatinOrDigit ? normalizeSlug(value) : normalizeSlugOrFallback(fallback);
};

export const getDateParts = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
};

export const buildDateKey = (year: number, month: number, day: number) => {
  const maxDay = new Date(year, month, 0).getDate();
  const normalizedDay = Math.min(day, maxDay);
  return `${year}-${String(month).padStart(2, "0")}-${String(normalizedDay).padStart(2, "0")}`;
};

export const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

export const intervalsOverlap = (startA: number, endA: number, startB: number, endB: number) =>
  startA < endB && startB < endA;

export const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatLongDate = (date: Date) =>
  date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "long" });

export const formatClientVisitDate = (date: Date) =>
  date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

export const formatNotificationDate = (dateKey: string) =>
  parseDateKey(dateKey).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

export const formatMonth = (date: Date) =>
  date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

export const parseDateKey = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
};

export const isDateInRange = (dateKey: string, startDate: string, endDate: string) =>
  dateKey >= startDate && dateKey <= endDate;

export const clampImagePosition = (value: number) => Math.min(100, Math.max(0, Math.round(value)));
