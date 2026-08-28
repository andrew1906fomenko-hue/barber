"use client";
import { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode, type TouchEvent } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { ArrowBendUpLeft, ArrowLeft, Bell, CalendarBlank, CalendarCheck, CaretDown, CaretLeft, CaretRight, ChartLineUp, ChatText, Check, Clock, CurrencyRub, DotsThree, Eye, Folder, FunnelSimple, GearSix, Globe, Gauge, House, InstagramLogo, ListChecks, MapPin, Megaphone, Note, PencilSimple, Phone, Plus, MagnifyingGlass, SignOut, Palette, Receipt, SlidersHorizontal, TelegramLogo, TextAa, Trash, Tag, User, Users, Wallet, WhatsappLogo, X, XCircle, } from "@phosphor-icons/react";
import { StatusBadge, subscriptionStatusLabels } from "../../components/StatusBadge";
import { TimeRangeWheelPicker, TimeWheelPicker } from "../../components/TimeWheelPicker";
import { addDays, buildDateKey, clampImagePosition, formatClientVisitDate, formatDateKey, formatLongDate, formatMonth, formatNotificationDate, getDateParts, intervalsOverlap, isDateInRange, normalizeEmailSlug, normalizeSlug, normalizeSlugOrFallback, parseDateKey, resolveLatinSlug, timeToMinutes, } from "./dashboard-utils";
type Section = "Главная" | "Услуги" | "График работы" | "Статистика" | "Страница записи" | "Аналитика" | "Финансы" | "Клиенты" | "Настройки";
type AppointmentStatus = string;
type AppointmentTimelineStatus = "past" | "active" | "future";
type Service = {
    id: string;
    title: string;
    category: string;
    duration: number;
    price: number;
    priceFrom?: boolean;
    description: string;
    preparation: string;
    includedItems: string[];
    materialName: string;
    materialCost: number;
    active: boolean;
    onlineBookingEnabled: boolean;
    calendarColor: string;
    photoUrl?: string;
};
type ServicePayload = Omit<Partial<Service>, "includedItems"> & {
    includedItems?: string[] | string;
    included_items?: string[] | string;
    material_name?: string;
    material_cost?: number;
    price_from?: boolean;
    photo_url?: string;
    images?: string[];
    photos?: string[];
    is_public?: boolean;
    is_active?: boolean;
    calendar_color?: string;
    duration_min?: number;
};
type Appointment = {
    id: string;
    date: string;
    time: string;
    client: string;
    phone: string;
    serviceId: string;
    serviceIds?: string[];
    status: AppointmentStatus;
    statusCode?: string;
    archived?: boolean;
    notes?: string;
};
type Client = {
    id: string;
    name: string;
    phone: string;
    notes: string;
    telegramConnected?: boolean;
    telegramUsername?: string;
    telegramConnectedAt?: string;
    visits: number;
    lastVisit: string;
    totalSpent: number;
};
type BlockedTime = {
    id: string;
    date: string;
    start: string;
    end: string;
    reason: string;
};
type NotificationItem = {
    id: string;
    kind: "appointment" | "system";
    title: string;
    meta: string;
    date: string;
    time: string;
};
type FreeSlot = {
    start: string;
    end: string;
};
type StoryPlatform = "instagram" | "telegram" | "whatsapp";
type MasterProfile = {
    displayName: string;
    slug: string;
    showOnBookingPage: boolean;
};
type BookingPageSettings = {
    notes: string;
    profession: string;
    description: string;
    city: string;
    address: string;
    isOnline: boolean;
    phone: string;
    contactLink: string;
    socialLinks: Record<string, string>;
    coverImageUrl: string;
    avatarUrl: string;
    coverPositionX: number;
    coverPositionY: number;
    timezone: string;
    primaryColor: string;
    buttonColor: string;
    ctaText: string;
    visibleSections: Record<string, boolean | string>;
    requiredFields: Record<string, boolean>;
    showPrice: boolean;
    maxBookingDaysAhead: number;
};
type BreakPeriod = {
    id: string;
    start: string;
    end: string;
};
type DaySchedule = {
    enabled: boolean;
    start: string;
    end: string;
    breakEnabled: boolean;
    breakStart: string;
    breakEnd: string;
    breaks?: BreakPeriod[];
};
type WeeklySchedule = Record<string, DaySchedule>;
type ScheduleMode = "weekdays" | "cycle";
type CyclePreset = "all" | "weekdays" | "odd" | "even" | "custom";
type SchedulePanel = "weekdays" | "individual" | null;
type SettingsPanel = "account" | "interface" | "analytics" | "finance" | "subscription" | null;
type ScheduleDayRule = {
    enabled: boolean;
    allDay: boolean;
    start: string;
    end: string;
    breakEnabled: boolean;
    breakStart: string;
    breakEnd: string;
};
type SchedulePlan = {
    mode: ScheduleMode;
    startDate: string;
    endDate: string;
    selectedWeekdays: number[];
    cyclePreset: CyclePreset;
    customWorkDays: number;
    customOffDays: number;
    dayRule: ScheduleDayRule;
    dateOverrides: Record<string, ScheduleDayRule>;
};
type StoredIndividualSchedulePlan = {
    startDate: string;
    endDate: string;
    cyclePreset: CyclePreset;
    customWorkDays: number;
    customOffDays: number;
};
type StoredWeeklyScheduleMetadata = {
    __scheduleMode?: ScheduleMode;
    __individualPlan?: StoredIndividualSchedulePlan;
    __dateOverrides?: Record<string, DaySchedule>;
};
type CalendarCell = {
    date: string;
    day: number;
    inMonth: boolean;
    rule: ScheduleDayRule;
};
type CalendarMonth = {
    key: string;
    title: string;
    workingDays: number;
    totalDays: number;
    cells: CalendarCell[];
};
type AuthSession = {
    id: string;
    email: string;
    name: string;
    slug: string;
};
type SubscriptionPlan = {
    id: string;
    code: string;
    name: string;
    duration_months: number;
    price: number;
    currency: string;
    discount_percent: number;
    is_active: boolean;
};
type SubscriptionInfo = {
    status: string;
    planName: string;
    trialStartedAt: string | null;
    trialEndsAt: string | null;
    currentPeriodStartedAt: string | null;
    currentPeriodEndsAt: string | null;
    daysLeft: number;
    autoRenew: boolean;
    autoRenewPlanId: string | null;
    nextChargeAt: string | null;
    nextChargeAmount: number | null;
    nextChargeCurrency: string;
    hasAccess: boolean;
    autoRenewEnabled: boolean;
};
type SubscriptionPayment = {
    id: string;
    amount: number;
    currency: string;
    duration_months: number;
    status: string;
    payment_url: string | null;
    created_at: string;
    paid_at: string | null;
    failed_at: string | null;
    failure_message: string | null;
    payment_method_title: string | null;
    receipt_url: string | null;
};
const nav: Section[] = ["Главная", "Услуги", "График работы", "Статистика", "Страница записи", "Клиенты"];
const mobileSwipeSections: Section[] = ["Главная", "Клиенты", "График работы", "Услуги", "Статистика"];
const dashboardSwipeIgnoreSelector = "button, input, textarea, select, [contenteditable='true'], [data-dashboard-swipe-ignore='true']";
const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const timeSlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];
const settingsMenuTitleStyle: CSSProperties = { fontFamily: "var(--chatTypography)", fontSize: "var(--text-settings-title-size)", fontWeight: "var(--text-settings-title-weight)", lineHeight: "var(--text-settings-title-line)", letterSpacing: 0,
};
const ruMonths = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const scheduleDays = [{ index: 1, label: "Понедельник" }, { index: 2, label: "Вторник" }, { index: 3, label: "Среда" }, { index: 4, label: "Четверг" }, { index: 5, label: "Пятница" }, { index: 6, label: "Суббота" }, { index: 0, label: "Воскресенье" },];
const slotStepOptions = [15, 30, 45, 60];
const createBreakPeriod = (index = 0): BreakPeriod => ({ id: `break-${Date.now()}-${index}`, start: "13:00", end: "14:00", });
const getBreakKey = (item: Pick<BreakPeriod, "start" | "end">) => `${item.start}-${item.end}`;
const uniqueBreakPeriods = (breaks: BreakPeriod[]) => { const seen = new Set<string>(); return breaks.filter((item) => { const key = getBreakKey(item); if (seen.has(key))
    return false; seen.add(key); return true; }); };
const breakPeriodsOverlap = (left: Pick<BreakPeriod, "start" | "end">, right: Pick<BreakPeriod, "start" | "end">) => intervalsOverlap(timeToMinutes(left.start), timeToMinutes(left.end), timeToMinutes(right.start), timeToMinutes(right.end));
const hasOverlappingBreakPeriod = (breaks: BreakPeriod[], target: BreakPeriod) => breaks.some((item) => item.id !== target.id && breakPeriodsOverlap(item, target));
const isBreakPeriodValid = (item: Pick<BreakPeriod, "start" | "end">) => timeToMinutes(item.start) < timeToMinutes(item.end);
const getDayBreaks = (schedule: DaySchedule): BreakPeriod[] => { if (Array.isArray(schedule.breaks)) {
    return uniqueBreakPeriods(schedule.breaks.map((item, index) => ({ id: item.id || `break-${index}`, start: item.start || schedule.breakStart || "13:00", end: item.end || schedule.breakEnd || "14:00", })));
} return schedule.breakEnabled ? [{ id: "break-0", start: schedule.breakStart || "13:00", end: schedule.breakEnd || "14:00" }] : []; };
const withSyncedBreakFields = (schedule: DaySchedule): DaySchedule => { const breaks = getDayBreaks(schedule); return { ...schedule, breaks, breakEnabled: breaks.length > 0, breakStart: breaks[0]?.start || schedule.breakStart || "13:00", breakEnd: breaks[0]?.end || schedule.breakEnd || "14:00", }; };
const normalizeWeeklyScheduleBreaks = (schedule: WeeklySchedule) => Object.fromEntries(Object.entries(schedule).map(([key, value]) => key.startsWith("__") ? [key, value] : [key, withSyncedBreakFields({ ...value, breaks: getDayBreaks(value).filter(isBreakPeriodValid), }),])) as WeeklySchedule;
const defaultWeeklySchedule = scheduleDays.reduce<WeeklySchedule>((schedule, day) => { schedule[String(day.index)] = { enabled: day.index > 0 && day.index < 6, start: "10:00", end: "20:00", breakEnabled: false, breakStart: "13:00", breakEnd: "14:00", breaks: [], }; return schedule; }, {});
const defaultScheduleDayRule: ScheduleDayRule = { enabled: true, allDay: false, start: "09:00", end: "18:00", breakEnabled: false, breakStart: "12:00", breakEnd: "13:00", };
const emptyService = { title: "", category: "", duration: "60", price: "", priceFrom: false, description: "", preparation: "", includedItems: [] as string[], materialName: "", materialCost: "", photoUrl: "", onlineBookingEnabled: true, active: true, calendarColor: "#0f766e", };
const emptyAppointment = { time: "10:00", client: "", phone: "", serviceId: "", serviceIds: [] as string[],
};
const getCallHref = (phone: string) => {
    const normalized = phone.trim().replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
    return normalized ? `tel:${normalized}` : "";
};
const getMessageHref = (phone: string) => {
    const normalized = phone.trim().replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
    return normalized ? `sms:${normalized}` : "";
};
const getMessengerPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("8"))
        return `7${digits.slice(1)}`;
    return digits;
};
const getWhatsAppHref = (phone: string, text = "") => {
    const normalized = getMessengerPhone(phone);
    return normalized ? `https://wa.me/${normalized}${text ? `?text=${encodeURIComponent(text)}` : ""}` : "";
};
const getPreparedMessageText = (name: string) => `Здравствуйте${name.trim() ? `, ${name.trim()}` : ""}!`;
const getTelegramHref = (phone: string, text = "") => {
    const normalized = getMessengerPhone(phone);
    return normalized ? `https://t.me/+${normalized}${text ? `?text=${encodeURIComponent(text)}` : ""}` : "";
};
const getMaxShareHref = (text: string) => `https://max.ru/:share?text=${encodeURIComponent(text)}`;
const emptyBlock = { date: "", start: "10:00", end: "12:00", reason: "",
};
const defaultMasterProfile: MasterProfile = { displayName: "", slug: "anna-nails", showOnBookingPage: true, };
const defaultBookingPageSettings: BookingPageSettings = { notes: "", profession: "", description: "", city: "", address: "", isOnline: false, phone: "", contactLink: "", socialLinks: { instagram: "", telegram: "", vk: "", website: "" }, coverImageUrl: "", avatarUrl: "", coverPositionX: 50, coverPositionY: 50, timezone: "Europe/Moscow", primaryColor: "#0F766E", buttonColor: "#0F766E", ctaText: "Записаться", visibleSections: { cover: true, avatar: true, description: true, masterComment: true, address: true, contacts: true, socials: true, services: true, serviceImages: false, serviceCards: false, dateWheel: false, dateCalendar: false, serviceCardStyle: "stack", headingMode: "friendly", accentMode: "default" }, requiredFields: { name: true, phone: true, email: false, telegram: false }, showPrice: true, maxBookingDaysAhead: 14, };
const getAppointmentServiceIds = (appointment: Pick<Appointment, "serviceId" | "serviceIds">) => appointment.serviceIds?.length ? appointment.serviceIds : appointment.serviceId ? [appointment.serviceId] : [];
const uniqueById = <T extends {
    id: string;
}>(items: T[]) => { const map = new Map<string, T>(); items.forEach((item) => map.set(item.id, item)); return Array.from(map.values()); };
const getAppointmentServices = (appointment: Pick<Appointment, "serviceId" | "serviceIds">, services: Service[]) => Array.from(new Set(getAppointmentServiceIds(appointment))).map((serviceId) => services.find((service) => service.id === serviceId)).filter((service): service is Service => Boolean(service));
const getAppointmentServiceColor = (appointment: Pick<Appointment, "serviceId" | "serviceIds">, services: Service[]) => { const serviceIds = Array.from(new Set(getAppointmentServiceIds(appointment))); const primaryService = serviceIds.length ? services.find((service) => service.id === serviceIds[0]) : undefined; return primaryService?.calendarColor || getAppointmentServices(appointment, services)[0]?.calendarColor || "#0f766e"; };
const getAppointmentDuration = (appointment: Pick<Appointment, "serviceId" | "serviceIds">, services: Service[]) => { const selectedServices = getAppointmentServices(appointment, services); return selectedServices.length ? selectedServices.reduce((sum, service) => sum + service.duration, 0) : 60; };
const getAppointmentTimelineStatus = (appointment: Pick<Appointment, "date" | "time">, durationMinutes: number, nowMs = Date.now()): AppointmentTimelineStatus => { const startMinutes = timeToMinutes(appointment.time); if (!Number.isFinite(startMinutes))
    return "future"; const start = parseDateKey(appointment.date); start.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0); const end = new Date(start); end.setMinutes(end.getMinutes() + Math.max(1, durationMinutes || 60)); if (nowMs >= end.getTime())
    return "past"; if (nowMs >= start.getTime())
    return "active"; return "future"; };
const isNoShowAppointment = (appointment: Pick<Appointment, "status">) => { const status = (appointment.status || "").trim().toLowerCase(); return status === "no_show" || status.includes("не приш") || status.includes("no show"); };
const isArchivedAppointment = (appointment: Pick<Appointment, "statusCode" | "archived">) => Boolean(appointment.archived) || appointment.statusCode === "no_show_deleted";
const isBillableAppointment = (appointment: Pick<Appointment, "status">) => !isNoShowAppointment(appointment);
const getAppointmentPrice = (appointment: Pick<Appointment, "serviceId" | "serviceIds" | "status">, services: Service[]) => isBillableAppointment(appointment) ? getAppointmentServices(appointment, services).reduce((sum, service) => sum + service.price, 0) : 0;
const getAppointmentMaterialCost = (appointment: Pick<Appointment, "serviceId" | "serviceIds" | "status">, services: Service[]) => isBillableAppointment(appointment) ? getAppointmentServices(appointment, services).reduce((sum, service) => sum + (service.materialCost || 0), 0) : 0;
const getAppointmentServiceTitle = (appointment: Pick<Appointment, "serviceId" | "serviceIds">, services: Service[]) => {
    const selectedServices = getAppointmentServices(appointment, services);
    if (!selectedServices.length)
        return "Услуга";
    return selectedServices.map((service) => service.title).join(", ");
};
const deriveServiceIncludedItems = (service: Pick<Service, "description" | "includedItems" | "preparation" | "title">) => { if (service.includedItems?.length)
    return service.includedItems.filter((item) => item.trim()); const text = service.description || service.preparation; const items = text.split(/\n|,|;|•/g).map((item) => item.trim()).filter((item) => item.length > 2).slice(0, 4); return items.length ? items : ["Консультация клиента", service.title, "Финальная проверка результата"]; };
const parseServiceStringList = (value: unknown) => { if (Array.isArray(value))
    return value.map((item) => String(item).trim()).filter(Boolean); if (typeof value !== "string")
    return []; try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).filter(Boolean) : [];
}
catch {
    return value.split(/\n|,|;|•/g).map((item) => item.trim()).filter(Boolean);
} };
const getStoredServicePhotoUrl = (value: string | undefined) => (value?.startsWith("/uploads/") ? value : "");
const getServicePayloadPhotoUrl = (service: ServicePayload) => getStoredServicePhotoUrl(service.photoUrl) || getStoredServicePhotoUrl(service.photo_url) || getStoredServicePhotoUrl(parseServiceStringList(service.images)[0]) || getStoredServicePhotoUrl(parseServiceStringList(service.photos)[0]) || getStoredServicePhotoUrl(parseServiceStringList(service.includedItems ?? service.included_items).find((item) => item.startsWith("/uploads/")));
const normalizeBoolean = (value: unknown) => value === true || value === 1 || value === "1" || value === "true";
const normalizeService = (service: ServicePayload): Service => ({ id: service.id || "", title: service.title || "", category: service.category || "", duration: Number(service.duration ?? service.duration_min) || 60, price: Number(service.price) || 0, priceFrom: normalizeBoolean(service.priceFrom ?? service.price_from), description: service.description || "", preparation: service.preparation || "", includedItems: parseServiceStringList(service.includedItems ?? service.included_items).filter((item) => !item.startsWith("/uploads/")), materialName: service.materialName || service.material_name || "", materialCost: Number(service.materialCost ?? service.material_cost) || 0, active: service.active ?? service.is_active ?? true, onlineBookingEnabled: service.onlineBookingEnabled ?? service.is_public ?? true, calendarColor: service.calendarColor || service.calendar_color || "#0f766e", photoUrl: getServicePayloadPhotoUrl(service), });
const formatServicePrice = (service: Pick<Service, "price" | "priceFrom">) => `${normalizeBoolean(service.priceFrom) ? "от " : ""}${service.price.toLocaleString("ru-RU")} ₽`;
const servicePhotoMaxDimension = 900;
const servicePhotoTargetBytes = 260 * 1024;
const servicePhotoQualitySteps = [0.72, 0.62, 0.52, 0.44];
const loadServicePhotoImage = (file: File) => new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
    };
    image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Service photo could not be decoded."));
    };
    image.src = url;
});
const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
const compressServicePhoto = async (file: File) => {
    const image = await loadServicePhotoImage(file);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const scale = Math.min(1, servicePhotoMaxDimension / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context)
        return file;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, width, height);
    let bestBlob: Blob | null = null;
    for (const quality of servicePhotoQualitySteps) {
        const blob = await canvasToBlob(canvas, "image/webp", quality);
        if (!blob)
            continue;
        bestBlob = blob;
        if (blob.size <= servicePhotoTargetBytes)
            break;
    }
    if (!bestBlob || (bestBlob.size >= file.size && file.size <= servicePhotoTargetBytes))
        return file;
    const fileName = file.name.replace(/\.[^.]+$/, "") || "service-photo";
    return new File([bestBlob], `${fileName}.webp`, { type: "image/webp", lastModified: Date.now() });
};
const minutesToTime = (minutes: number) => { const normalized = ((minutes % 1440) + 1440) % 1440; return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`; };
const emptyClient = { name: "", phone: "", notes: "",
};
const appendNoteText = (current: string, addition: string) => {
    const base = current.trim();
    const next = addition.trim();
    if (!next)
        return base;
    return base ? `${base}\n${next}` : next;
};
const getCycleEnabled = (date: Date, plan: SchedulePlan) => { if (plan.cyclePreset === "all")
    return true; if (plan.cyclePreset === "weekdays")
    return date.getDay() > 0 && date.getDay() < 6; if (plan.cyclePreset === "odd")
    return date.getDate() % 2 === 1; if (plan.cyclePreset === "even")
    return date.getDate() % 2 === 0; const workDays = Math.max(0, plan.customWorkDays); const offDays = Math.max(0, plan.customOffDays); const cycleLength = Math.max(1, workDays + offDays); const diffDays = Math.floor((parseDateKey(formatDateKey(date)).getTime() - parseDateKey(plan.startDate).getTime()) / 86400000); const cycleIndex = ((diffDays % cycleLength) + cycleLength) % cycleLength; return workDays > 0 && cycleIndex < workDays; };
const resolveScheduleRuleForDate = (date: Date, plan: SchedulePlan): ScheduleDayRule => { const dateKey = formatDateKey(date); const override = plan.dateOverrides[dateKey]; if (override)
    return override; const inRange = isDateInRange(dateKey, plan.startDate, plan.endDate); const enabledByMode = inRange && (plan.mode === "weekdays" ? plan.selectedWeekdays.includes(date.getDay()) : getCycleEnabled(date, plan)); return { ...plan.dayRule, enabled: enabledByMode, }; };
const buildScheduleMonths = (plan: SchedulePlan, monthCount = 3): CalendarMonth[] => { const start = parseDateKey(plan.startDate); const firstMonth = new Date(start.getFullYear(), start.getMonth(), 1); return Array.from({ length: monthCount }, (_, monthOffset) => { const monthDate = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + monthOffset, 1); const month = monthDate.getMonth(); const year = monthDate.getFullYear(); const first = new Date(year, month, 1); const last = new Date(year, month + 1, 0); const leading = (first.getDay() + 6) % 7; const cells: CalendarCell[] = []; for (let index = 0; index < leading; index += 1) {
    const date = addDays(first, index - leading);
    cells.push({ date: formatDateKey(date), day: date.getDate(), inMonth: false, rule: resolveScheduleRuleForDate(date, plan) });
} for (let day = 1; day <= last.getDate(); day += 1) {
    const date = new Date(year, month, day);
    cells.push({ date: formatDateKey(date), day, inMonth: true, rule: resolveScheduleRuleForDate(date, plan) });
} while (cells.length % 7 !== 0) {
    const date = addDays(last, cells.length - leading - last.getDate() + 1);
    cells.push({ date: formatDateKey(date), day: date.getDate(), inMonth: false, rule: resolveScheduleRuleForDate(date, plan) });
} const inMonthCells = cells.filter((cell) => cell.inMonth); return { key: `${year}-${month}`, title: formatMonth(monthDate), workingDays: inMonthCells.filter((cell) => cell.rule.enabled).length, totalDays: inMonthCells.length, cells, }; }); };
const getStoredScheduleMode = (schedule: WeeklySchedule): ScheduleMode => ((schedule as WeeklySchedule & StoredWeeklyScheduleMetadata).__scheduleMode === "cycle" ? "cycle" : "weekdays");
const getStoredIndividualPlan = (schedule: WeeklySchedule): StoredIndividualSchedulePlan | null => { const plan = (schedule as WeeklySchedule & StoredWeeklyScheduleMetadata).__individualPlan; return plan && typeof plan.startDate === "string" ? plan : null; };
const getStoredDateOverrides = (schedule: WeeklySchedule): Record<string, DaySchedule> => { const overrides = (schedule as WeeklySchedule & StoredWeeklyScheduleMetadata).__dateOverrides; return overrides && typeof overrides === "object" ? overrides : {}; };
const getScheduleForDate = (date: Date, schedule: WeeklySchedule, fallbackStart = "09:00", fallbackEnd = "20:00"): DaySchedule => {
    const weekdayKey = String(date.getDay());
    const baseSchedule = withSyncedBreakFields({ ...defaultWeeklySchedule[weekdayKey], ...(schedule[weekdayKey] || {}), start: schedule[weekdayKey]?.start || fallbackStart, end: schedule[weekdayKey]?.end || fallbackEnd });
    const dateOverride = getStoredDateOverrides(schedule)[formatDateKey(date)];
    if (dateOverride)
        return withSyncedBreakFields({ ...baseSchedule, ...dateOverride });
    if (getStoredScheduleMode(schedule) !== "cycle")
        return baseSchedule;
    const storedPlan = getStoredIndividualPlan(schedule);
    if (!storedPlan)
        return baseSchedule;
    const plan: SchedulePlan = { mode: "cycle", startDate: storedPlan.startDate, endDate: storedPlan.endDate || formatDateKey(addDays(parseDateKey(storedPlan.startDate), 90)), selectedWeekdays: [], cyclePreset: storedPlan.cyclePreset, customWorkDays: storedPlan.customWorkDays, customOffDays: storedPlan.customOffDays, dayRule: { ...defaultScheduleDayRule, ...baseSchedule }, dateOverrides: {} };
    return withSyncedBreakFields({ ...baseSchedule, enabled: getCycleEnabled(date, plan) });
};
const getScheduleWorkMinutes = (schedule: DaySchedule) => {
    const dayStart = timeToMinutes(schedule.start);
    const dayEnd = timeToMinutes(schedule.end);
    if (schedule.enabled === false || !Number.isFinite(dayStart) || !Number.isFinite(dayEnd) || dayStart >= dayEnd)
        return 0;
    const breakMinutes = getDayBreaks(schedule).filter(isBreakPeriodValid).reduce((total, item) => {
        const breakStart = Math.max(dayStart, timeToMinutes(item.start));
        const breakEnd = Math.min(dayEnd, timeToMinutes(item.end));
        return total + Math.max(0, breakEnd - breakStart);
    }, 0);
    return Math.max(0, dayEnd - dayStart - breakMinutes);
};
const isLoadBearingAppointment = (appointment: Appointment) => !isArchivedAppointment(appointment) && appointment.statusCode !== "cancelled" && !isNoShowAppointment(appointment);
const getAppointmentLoadPercent = (appointments: Appointment[], services: Service[], workMinutes: number) => {
    if (workMinutes <= 0)
        return 0;
    const bookedMinutes = appointments.filter(isLoadBearingAppointment).reduce((total, appointment) => total + getAppointmentDuration(appointment, services), 0);
    return Math.min(100, Math.round((bookedMinutes / workMinutes) * 100));
};
const getRangeWorkMinutes = (start: Date, end: Date, weeklySchedule: WeeklySchedule, fallbackStart = "09:00", fallbackEnd = "20:00") => {
    let total = 0;
    for (let date = new Date(start); date <= end; date = addDays(date, 1)) {
        total += getScheduleWorkMinutes(getScheduleForDate(date, weeklySchedule, fallbackStart, fallbackEnd));
    }
    return total;
};
const getRangeLoadPercent = (start: Date, end: Date, appointments: Appointment[], services: Service[], weeklySchedule: WeeklySchedule, fallbackStart = "09:00", fallbackEnd = "20:00") => getAppointmentLoadPercent(appointments, services, getRangeWorkMinutes(start, end, weeklySchedule, fallbackStart, fallbackEnd));
const formatWorkScheduleLabel = (schedule: DaySchedule) => schedule.enabled ? `${schedule.start}-${schedule.end}` : "Выходной";
const getMonthDays = (monthDate: Date) => { const year = monthDate.getFullYear(); const month = monthDate.getMonth(); const first = new Date(year, month, 1); const last = new Date(year, month + 1, 0); const leading = (first.getDay() + 6) % 7; const days: Array<Date | null> = Array.from({ length: leading }, () => null); for (let day = 1; day <= last.getDate(); day += 1) {
    days.push(new Date(year, month, day));
} while (days.length % 7 !== 0) {
    days.push(null);
} return days; };
const getSelectedWeekDays = (date: Date) => { const monday = new Date(date); monday.setDate(date.getDate() - ((date.getDay() + 6) % 7)); return Array.from({ length: 7 }, (_, index) => { const day = new Date(monday); day.setDate(monday.getDate() + index); return day; }); };
function usePersistentBoolean(key: string, defaultValue = false) { const [value, setValue] = useState(defaultValue); const [loaded, setLoaded] = useState(false); useEffect(() => { const storedValue = window.localStorage.getItem(key); setValue(storedValue === null ? defaultValue : storedValue === "true"); setLoaded(true); }, [defaultValue, key]); useEffect(() => { if (!loaded)
    return; window.localStorage.setItem(key, String(value)); }, [key, loaded, value]); return [value, setValue] as const; }
function useMobileKeyboardViewportVars() {
    useEffect(() => {
        if (typeof window === "undefined" || typeof document === "undefined")
            return;
        const root = document.documentElement;
        const updateViewportVars = () => {
            const viewport = window.visualViewport;
            const viewportHeight = viewport?.height || window.innerHeight;
            const keyboardInset = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
            root.style.setProperty("--dashboard-visual-viewport-height", `${Math.round(viewportHeight)}px`);
            root.style.setProperty("--dashboard-keyboard-inset", `${Math.round(keyboardInset)}px`);
        };
        updateViewportVars();
        window.visualViewport?.addEventListener("resize", updateViewportVars);
        window.visualViewport?.addEventListener("scroll", updateViewportVars);
        window.addEventListener("resize", updateViewportVars);
        window.addEventListener("orientationchange", updateViewportVars);
        return () => {
            window.visualViewport?.removeEventListener("resize", updateViewportVars);
            window.visualViewport?.removeEventListener("scroll", updateViewportVars);
            window.removeEventListener("resize", updateViewportVars);
            window.removeEventListener("orientationchange", updateViewportVars);
            root.style.removeProperty("--dashboard-visual-viewport-height");
            root.style.removeProperty("--dashboard-keyboard-inset");
        };
    }, []);
}
function DraggableBottomSheetFrame({ children, labelledBy, onClose, panelClassName = "", screenClassName = "", showSpacer = true, }: { children: ReactNode; labelledBy?: string; onClose: () => void; panelClassName?: string; screenClassName?: string; showSpacer?: boolean; }) {
    const [offset, setOffset] = useState(0);
    const [phase, setPhase] = useState<"open" | "dragging" | "settling" | "closing">("open");
    const swipeRef = useRef<{ pointerId?: number; startX: number; startY: number; startedAt: number; dragging: boolean } | null>(null);
    const sheetRef = useRef<HTMLElement | null>(null);
    const closeTimerRef = useRef<number | null>(null);
    useLayoutEffect(() => {
        document.body.classList.add("client-bottom-sheet-lock");
        return () => {
            document.body.classList.remove("client-bottom-sheet-lock");
        };
    }, []);
    const cleanupWindowListeners = () => {
        window.removeEventListener("pointermove", handleWindowPointerMove);
        window.removeEventListener("pointerup", handleWindowPointerUp);
        window.removeEventListener("pointercancel", handleWindowPointerCancel);
        window.removeEventListener("mousemove", handleWindowMouseMove);
        window.removeEventListener("mouseup", handleWindowMouseUp);
        window.removeEventListener("touchmove", handleWindowTouchMove);
        window.removeEventListener("touchend", handleWindowTouchEnd);
        window.removeEventListener("touchcancel", handleWindowTouchCancel);
    };
    const closeWithMotion = () => {
        swipeRef.current = null;
        cleanupWindowListeners();
        if (closeTimerRef.current)
            window.clearTimeout(closeTimerRef.current);
        setPhase("closing");
        closeTimerRef.current = window.setTimeout(() => {
            setOffset(0);
            setPhase("open");
            closeTimerRef.current = null;
            onClose();
        }, 220);
    };
    const listenWindowGesture = () => {
        cleanupWindowListeners();
        window.addEventListener("pointermove", handleWindowPointerMove, { passive: false });
        window.addEventListener("pointerup", handleWindowPointerUp);
        window.addEventListener("pointercancel", handleWindowPointerCancel);
        window.addEventListener("mousemove", handleWindowMouseMove, { passive: false });
        window.addEventListener("mouseup", handleWindowMouseUp);
        window.addEventListener("touchmove", handleWindowTouchMove, { passive: false });
        window.addEventListener("touchend", handleWindowTouchEnd);
        window.addEventListener("touchcancel", handleWindowTouchCancel);
    };
    useEffect(() => () => {
        if (closeTimerRef.current)
            window.clearTimeout(closeTimerRef.current);
        cleanupWindowListeners();
    }, []);
    function isInteractiveGestureTarget(target: EventTarget | null) {
        return target instanceof Element && Boolean(target.closest("input, textarea, select, button, a, [contenteditable='true']"));
    }
    function stopSheetPropagation(event: { stopPropagation: () => void }) {
        event.stopPropagation();
    }
    function stopSheetTouchPropagation(event: TouchEvent<HTMLElement>) {
        event.stopPropagation();
        if (event.target === event.currentTarget)
            event.preventDefault();
    }
    function beginSwipe(clientX: number, clientY: number, sheet: HTMLElement, pointerId?: number) {
        swipeRef.current = { pointerId, startX: clientX, startY: clientY, startedAt: Date.now(), dragging: false };
        sheetRef.current = sheet;
        listenWindowGesture();
    }
    function moveSwipe(clientX: number, clientY: number, sheet: HTMLElement, cancelDefault: () => void) {
        const swipe = swipeRef.current;
        if (!swipe)
            return;
        const deltaX = clientX - swipe.startX;
        const deltaY = clientY - swipe.startY;
        if (!swipe.dragging && (deltaY < 10 || Math.abs(deltaY) < Math.abs(deltaX) * 1.25))
            return;
        if (deltaY <= 0)
            return;
        if (!swipe.dragging && sheet.scrollTop > 0)
            return;
        swipe.dragging = true;
        cancelDefault();
        setPhase("dragging");
        const maxOffset = Math.max(window.innerHeight, sheet.getBoundingClientRect().height);
        setOffset(Math.min(deltaY, maxOffset));
    }
    function finishSwipe(clientY: number, cancelDefault: () => void) {
        const swipe = swipeRef.current;
        if (!swipe)
            return;
        swipeRef.current = null;
        cleanupWindowListeners();
        const deltaY = clientY - swipe.startY;
        const elapsed = Math.max(1, Date.now() - swipe.startedAt);
        const velocity = deltaY / elapsed;
        if (swipe.dragging)
            cancelDefault();
        if (deltaY > 92 || (deltaY > 52 && velocity > 0.45)) {
            closeWithMotion();
            return;
        }
        setPhase("settling");
        setOffset(0);
        window.setTimeout(() => {
            setPhase((current) => current === "settling" ? "open" : current);
        }, 180);
    }
    function cancelSwipe() {
        swipeRef.current = null;
        cleanupWindowListeners();
        setPhase("settling");
        setOffset(0);
    }
    function handleWindowPointerMove(event: globalThis.PointerEvent) {
        const swipe = swipeRef.current;
        const sheet = sheetRef.current;
        if (!swipe || !sheet || swipe.pointerId !== event.pointerId)
            return;
        moveSwipe(event.clientX, event.clientY, sheet, () => { event.preventDefault(); event.stopPropagation(); });
    }
    function handleWindowPointerUp(event: globalThis.PointerEvent) {
        const swipe = swipeRef.current;
        if (!swipe || swipe.pointerId !== event.pointerId)
            return;
        finishSwipe(event.clientY, () => { event.preventDefault(); event.stopPropagation(); });
    }
    function handleWindowPointerCancel(event: globalThis.PointerEvent) {
        const swipe = swipeRef.current;
        if (!swipe || swipe.pointerId !== event.pointerId)
            return;
        cancelSwipe();
    }
    function handleWindowMouseMove(event: globalThis.MouseEvent) {
        const swipe = swipeRef.current;
        const sheet = sheetRef.current;
        if (!swipe || !sheet || swipe.pointerId !== undefined)
            return;
        moveSwipe(event.clientX, event.clientY, sheet, () => { event.preventDefault(); event.stopPropagation(); });
    }
    function handleWindowMouseUp(event: globalThis.MouseEvent) {
        const swipe = swipeRef.current;
        if (!swipe || swipe.pointerId !== undefined)
            return;
        finishSwipe(event.clientY, () => { event.preventDefault(); event.stopPropagation(); });
    }
    function handleWindowTouchMove(event: globalThis.TouchEvent) {
        const touch = event.touches[0];
        const sheet = sheetRef.current;
        if (!touch || !sheet)
            return;
        moveSwipe(touch.clientX, touch.clientY, sheet, () => { event.preventDefault(); event.stopPropagation(); });
    }
    function handleWindowTouchEnd(event: globalThis.TouchEvent) {
        const touch = event.changedTouches[0];
        if (!touch)
            return;
        finishSwipe(touch.clientY, () => { event.preventDefault(); event.stopPropagation(); });
    }
    function handleWindowTouchCancel() { cancelSwipe(); }
    const panelStyle = phase === "open" && offset === 0 ? undefined : {
        transform: phase === "closing" ? "translateY(100%)" : offset > 0 ? `translateY(${offset}px)` : "translateY(0)",
        transition: phase === "dragging" ? "none" : "transform .22s cubic-bezier(.22, 1, .36, 1)",
        animation: "none",
        willChange: "transform",
    } as CSSProperties;
    const backdropOpacity = phase === "closing" ? 0 : Math.max(0.08, 0.36 - Math.min(offset, 260) / 260 * 0.22);
    const screenStyle = {
        background: `rgba(17, 27, 33, ${backdropOpacity.toFixed(3)})`,
        transition: phase === "dragging" ? "none" : "background .22s ease-out",
    } as CSSProperties;
    return (<div className={`client-bottom-sheet-screen client-bottom-sheet-screen-open ${screenClassName}`} data-dashboard-swipe-ignore="true" role="dialog" aria-modal="true" aria-labelledby={labelledBy} style={screenStyle} onClick={closeWithMotion} onPointerDown={stopSheetPropagation} onPointerMove={stopSheetPropagation} onPointerUp={stopSheetPropagation} onTouchStart={stopSheetTouchPropagation} onTouchMove={stopSheetTouchPropagation} onTouchEnd={stopSheetPropagation}>
        {showSpacer && <div className="client-bottom-sheet-spacer" aria-hidden="true"/>}
        <section className={`client-bottom-sheet ${panelClassName}`} data-dashboard-swipe-ignore="true" style={panelStyle} onClick={(event) => event.stopPropagation()} onPointerDown={(event) => { event.stopPropagation(); if (event.pointerType === "touch" || isInteractiveGestureTarget(event.target)) return; beginSwipe(event.clientX, event.clientY, event.currentTarget, event.pointerId); event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { event.stopPropagation(); if (event.pointerType === "touch") return; const swipe = swipeRef.current; if (!swipe || swipe.pointerId !== event.pointerId) return; moveSwipe(event.clientX, event.clientY, event.currentTarget, () => { event.preventDefault(); }); }} onPointerUp={(event) => { event.stopPropagation(); if (event.pointerType === "touch") return; const swipe = swipeRef.current; if (!swipe || swipe.pointerId !== event.pointerId) return; event.currentTarget.releasePointerCapture(event.pointerId); finishSwipe(event.clientY, () => { event.preventDefault(); }); }} onPointerCancel={(event) => { event.stopPropagation(); if (event.pointerType === "touch") return; cancelSwipe(); }} onMouseDown={(event) => { event.stopPropagation(); if (event.button !== 0 || swipeRef.current?.pointerId !== undefined || isInteractiveGestureTarget(event.target)) return; beginSwipe(event.clientX, event.clientY, event.currentTarget); }} onMouseMove={(event) => { event.stopPropagation(); const swipe = swipeRef.current; if (!swipe || swipe.pointerId !== undefined) return; moveSwipe(event.clientX, event.clientY, event.currentTarget, () => { event.preventDefault(); }); }} onMouseUp={(event) => { event.stopPropagation(); const swipe = swipeRef.current; if (!swipe || swipe.pointerId !== undefined) return; finishSwipe(event.clientY, () => { event.preventDefault(); }); }} onTouchStart={(event) => { event.stopPropagation(); const touch = event.touches[0]; if (!touch || isInteractiveGestureTarget(event.target)) return; beginSwipe(touch.clientX, touch.clientY, event.currentTarget); }} onTouchMove={(event) => { event.stopPropagation(); const touch = event.touches[0]; if (!touch) return; moveSwipe(touch.clientX, touch.clientY, event.currentTarget, () => { event.preventDefault(); }); }} onTouchEnd={(event) => { event.stopPropagation(); const touch = event.changedTouches[0]; if (!touch) return; finishSwipe(touch.clientY, () => { event.preventDefault(); }); }} onTouchCancel={(event) => { event.stopPropagation(); cancelSwipe(); }}>
            {children}
        </section>
    </div>);
}
export default function DashboardPage() { useMobileKeyboardViewportVars(); const router = useRouter(); const today = useMemo(() => new Date(), []); const dashboardSwipeStageRef = useRef<HTMLDivElement | null>(null); const dashboardSwipeStart = useRef<{
    x: number;
    y: number;
    time: number;
    serviceFilterEdge?: "all" | "archive" | null;
    servicePage?: boolean;
} | null>(null); const dashboardDragRef = useRef<{
    target: Section | null;
    offsetX: number;
    width: number;
    direction: "next" | "prev" | null;
}>({ target: null, offsetX: 0, width: 1, direction: null, }); const dashboardDragFrame = useRef<number | null>(null); const clientFormNavigationLockUntil = useRef(0); const [section, setSection] = useState<Section>("Главная"); const [dashboardTabDirection, setDashboardTabDirection] = useState<"next" | "prev" | "idle">("idle"); const [dashboardDrag, setDashboardDrag] = useState<{
    target: Section | null;
    width: number;
    direction: "next" | "prev" | null;
}>({ target: null, width: 1, direction: null, }); const [toast, setToast] = useState(""); const [mobileCompact, setMobileCompact] = usePersistentBoolean("dashboard-mobile-compact"); const [compactAppointments, setCompactAppointments] = usePersistentBoolean("compact-appointments"); const [compactClients, setCompactClients] = usePersistentBoolean("compact-clients"); const [darkTheme, setDarkTheme] = useState(false); const [authSession, setAuthSession] = useState<AuthSession | null>(null); const [serverDataLoaded, setServerDataLoaded] = useState(false); const [monthDate, setMonthDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1)); const [selectedDate, setSelectedDate] = useState(() => formatDateKey(today)); const [calendarWeekDate, setCalendarWeekDate] = useState(() => formatDateKey(today)); const [appointments, setAppointments] = useState<Appointment[]>([]); const [clients, setClients] = useState<Client[]>([]); const [services, setServices] = useState<Service[]>([]); const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]); const [clientsLoaded, setClientsLoaded] = useState(false); const [bookingSettingsLoaded, setBookingSettingsLoaded] = useState(false); const [notificationsOpen, setNotificationsOpen] = useState(false); const [storyCreatorOpen, setStoryCreatorOpen] = useState(false); const [notificationsReady, setNotificationsReady] = useState(false); const [seenNotificationIds, setSeenNotificationIds] = useState<Set<string>>(() => new Set()); const [calendarExpanded, setCalendarExpanded] = useState(false); const [showFilters, setShowFilters] = useState(false); const [showAppointmentForm, setShowAppointmentForm] = useState(false); const [appointmentForm, setAppointmentForm] = useState(emptyAppointment); const [clientForm, setClientForm] = useState(emptyClient); const [editingClientId, setEditingClientId] = useState<string | null>(null); const [serviceForm, setServiceForm] = useState(emptyService); const [serviceFormOpen, setServiceFormOpen] = useState(false); const [serviceSaving, setServiceSaving] = useState(false); const [editingServiceId, setEditingServiceId] = useState<string | null>(null); const [serviceOverlayOpen, setServiceOverlayOpen] = useState(false); const [workStart, setWorkStart] = useState("09:00"); const [workEnd, setWorkEnd] = useState("20:00"); const [slotStepMin, setSlotStepMin] = useState(30); const [autoTimeSnap, setAutoTimeSnap] = useState(true); const [bufferMin, setBufferMin] = useState(0); const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(defaultWeeklySchedule); const [blockForm, setBlockForm] = useState(() => ({ ...emptyBlock, date: formatDateKey(today) })); const [schedulePanel, setSchedulePanel] = useState<SchedulePanel>(null); const [openWeekdayEditor, setOpenWeekdayEditor] = useState<string | null>(null); const [openIndividualWorkHoursEditor, setOpenIndividualWorkHoursEditor] = useState(false); const [selectedWorkHoursDate, setSelectedWorkHoursDate] = useState<string | null>(null); const [selectedWorkHoursReturnSection, setSelectedWorkHoursReturnSection] = useState<Section | null>(null); const [clientFormOpen, setClientFormOpen] = useState(false); const [selectedSettingsPanel, setSelectedSettingsPanel] = useState<SettingsPanel>(null); const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null); const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]); const [subscriptionPayments, setSubscriptionPayments] = useState<SubscriptionPayment[]>([]); const [subscriptionLoading, setSubscriptionLoading] = useState(false); const [masterProfile, setMasterProfile] = useState<MasterProfile>(defaultMasterProfile); const [accountSaving, setAccountSaving] = useState(false); const [bookingPageSettings, setBookingPageSettings] = useState<BookingPageSettings>(defaultBookingPageSettings); const [bookingPageSaving, setBookingPageSaving] = useState(false); const [bookingEnabled, setBookingEnabled] = useState(true); const clientsRequestRef = useRef<Promise<void> | null>(null); const bookingSettingsRequestRef = useRef<Promise<void> | null>(null); const deferredDashboardDataRequested = useRef(false); const [origin, setOrigin] = useState(""); const bookingPath = `/m/${masterProfile.slug || "master"}`; const bookingUrl = origin ? `${origin}${bookingPath}` : bookingPath; const loadSubscriptionData = async () => { setSubscriptionLoading(true); try {
    const [subscriptionResponse, plansResponse] = await Promise.all([fetch("/api/subscription"), fetch("/api/subscription/plans")]);
    const subscriptionData = subscriptionResponse.ok ? ((await subscriptionResponse.json()) as {
        success: boolean;
        subscription?: SubscriptionInfo;
        payments?: SubscriptionPayment[];
    }) : { success: false };
    const plansData = plansResponse.ok ? ((await plansResponse.json()) as {
        success: boolean;
        plans?: SubscriptionPlan[];
    }) : { success: false };
    if (subscriptionData.success) {
        setSubscription(subscriptionData.subscription || null);
        setSubscriptionPayments(subscriptionData.payments || []);
    }
    if (plansData.success)
        setSubscriptionPlans(plansData.plans || []);
}
finally {
    setSubscriptionLoading(false);
} }; useEffect(() => { window.localStorage.removeItem("compact-services-fast"); window.localStorage.removeItem("compact-clients-fast"); }, []); useEffect(() => { if (selectedSettingsPanel === "subscription")
    void loadSubscriptionData(); }, [selectedSettingsPanel]); useEffect(() => { const params = new URLSearchParams(window.location.search); const demoOrderId = params.get("subscription_demo_order"); if (!demoOrderId)
    return; setSelectedSettingsPanel("subscription"); void (async () => { const response = await fetch(`/api/subscription/payments/${encodeURIComponent(demoOrderId)}/confirm`, { method: "POST" }); const data = (await response.json()) as {
    success: boolean;
    error?: string;
}; showToast(data.success ? "Оплата подписки подтверждена" : data.error || "Не удалось подтвердить оплату"); await loadSubscriptionData(); params.delete("subscription_demo_order"); const nextQuery = params.toString(); window.history.replaceState(null, "", `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`); })(); }, []); const applyBookingPageSettings = (settings: BookingPageSettings) => { const visibleSections = Object.fromEntries(Object.entries(settings.visibleSections || {}).filter(([key]) => key in defaultBookingPageSettings.visibleSections)); setBookingPageSettings({ ...defaultBookingPageSettings, ...settings, socialLinks: { ...defaultBookingPageSettings.socialLinks, ...(settings.socialLinks || {}) }, visibleSections: { ...defaultBookingPageSettings.visibleSections, ...visibleSections }, requiredFields: { ...defaultBookingPageSettings.requiredFields, ...(settings.requiredFields || {}) }, }); }; const loadClients = async () => { if (clientsRequestRef.current)
    return clientsRequestRef.current; clientsRequestRef.current = (async () => { const response = await fetch("/api/clients"); const data = (await response.json()) as {
    success: boolean;
    clients?: Client[];
}; if (data.success) {
    setClients(data.clients || []);
    setClientsLoaded(true);
} })().finally(() => { clientsRequestRef.current = null; }); return clientsRequestRef.current; }; const loadBookingPageSettings = async () => { if (bookingSettingsRequestRef.current)
    return bookingSettingsRequestRef.current; bookingSettingsRequestRef.current = (async () => { const response = await fetch("/api/booking-page/settings"); const data = response.ok ? ((await response.json()) as {
    success: boolean;
    settings?: BookingPageSettings;
}) : { success: false }; if (data.success && data.settings) {
    applyBookingPageSettings(data.settings);
    setBookingSettingsLoaded(true);
} })().finally(() => { bookingSettingsRequestRef.current = null; }); return bookingSettingsRequestRef.current; }; const loadDeferredDashboardData = () => { if (deferredDashboardDataRequested.current)
    return; deferredDashboardDataRequested.current = true; const run = () => { void Promise.allSettled([loadClients(), loadBookingPageSettings()]); }; if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 1500 });
    return;
} globalThis.setTimeout(run, 250); }; const loadServerData = async () => { const meResponse = await fetch("/api/me"); const meData = (await meResponse.json()) as {
    success: boolean;
    user?: AuthSession;
    master?: {
        name: string;
        slug: string;
        workStart: string;
        workEnd: string;
        slotStepMin?: number;
        autoTimeSnap?: boolean;
        bufferMin?: number;
        workDays?: number[];
        weeklySchedule?: WeeklySchedule;
        bookingEnabled?: boolean;
    };
}; if (!meResponse.ok || !meData.success || !meData.user || !meData.master) {
    if (meResponse.status === 401)
        router.replace("/login");
    else
        showToast(meData.success === false ? "Не удалось проверить аккаунт" : "Ошибка загрузки кабинета");
    return;
} const [servicesResponse, appointmentsResponse, blockedTimesResponse] = await Promise.all([fetch("/api/services", { cache: "no-store" }), fetch("/api/appointments", { cache: "no-store" }), fetch("/api/blocked_times", { cache: "no-store" }),]); const servicesData = servicesResponse.ok ? ((await servicesResponse.json()) as {
    success: boolean;
    services?: Service[];
}) : { success: false }; const appointmentsData = appointmentsResponse.ok ? ((await appointmentsResponse.json()) as {
    success: boolean;
    appointments?: Appointment[];
}) : { success: false }; const blockedTimesData = blockedTimesResponse.ok ? ((await blockedTimesResponse.json()) as {
    success: boolean;
    blockedTimes?: BlockedTime[];
}) : { success: false }; setAuthSession(meData.user); setServices(servicesData.success ? (servicesData.services || []).map((service) => ({ ...normalizeService(service), photoUrl: getServicePayloadPhotoUrl(service), })) : []); setAppointments(appointmentsData.success ? appointmentsData.appointments || [] : []); setBlockedTimes(blockedTimesData.success ? blockedTimesData.blockedTimes || [] : []); setWorkStart(meData.master.workStart || "10:00"); setWorkEnd(meData.master.workEnd || "20:00"); setSlotStepMin(Number(meData.master.slotStepMin) || 30); setAutoTimeSnap(meData.master.autoTimeSnap !== false); setBufferMin(Number(meData.master.bufferMin) || 0); setBookingEnabled(meData.master.bookingEnabled !== false); setWeeklySchedule(() => { const enabledDays = new Set((meData.master?.workDays || [1, 2, 3, 4, 5]).map(Number)); const saved = meData.master?.weeklySchedule || {}; const metadata = saved as WeeklySchedule & StoredWeeklyScheduleMetadata; const nextSchedule = scheduleDays.reduce<WeeklySchedule>((schedule, day) => { const key = String(day.index); schedule[key] = withSyncedBreakFields({ ...defaultWeeklySchedule[key], ...(saved[key] || {}), enabled: saved[key]?.enabled ?? enabledDays.has(day.index), }); return schedule; }, {}); return { ...nextSchedule, ...(metadata.__scheduleMode ? { __scheduleMode: metadata.__scheduleMode } : {}), ...(metadata.__individualPlan ? { __individualPlan: metadata.__individualPlan } : {}), ...(metadata.__dateOverrides ? { __dateOverrides: metadata.__dateOverrides } : {}), } as WeeklySchedule; }); setMasterProfile({ ...defaultMasterProfile, displayName: meData.master.name, slug: resolveLatinSlug(meData.master.slug, normalizeEmailSlug(meData.user.email)), }); setServerDataLoaded(true); loadDeferredDashboardData(); }; useEffect(() => { const loadSession = async () => { try {
    await loadServerData();
}
catch {
    showToast("Не удалось загрузить данные кабинета");
} }; void loadSession(); }, [router]); useEffect(() => { setOrigin(window.location.origin); const savedTheme = window.localStorage.getItem("dashboard-theme"); setDarkTheme(savedTheme === "dark" && document.body.classList.contains("dark-theme")); }, []); useEffect(() => { document.body.classList.toggle("dark-theme", darkTheme); window.localStorage.setItem("dashboard-theme", darkTheme ? "dark" : "light"); return () => { document.body.classList.remove("dark-theme"); }; }, [darkTheme]); const selectedDateObject = useMemo(() => { const [year, month, day] = selectedDate.split("-").map(Number); return new Date(year, month - 1, day); }, [selectedDate]); const monthDays = useMemo(() => getMonthDays(monthDate), [monthDate]); const calendarWeekDateObject = useMemo(() => parseDateKey(calendarWeekDate), [calendarWeekDate]); const selectedWeekDays = useMemo(() => getSelectedWeekDays(calendarWeekDateObject), [calendarWeekDateObject]); const visibleAppointments = useMemo(() => appointments.filter((item) => !isArchivedAppointment(item)), [appointments]); const notificationItems = useMemo<NotificationItem[]>(() => { const appointmentItems = visibleAppointments.filter((appointment) => appointment.statusCode !== "cancelled").map((appointment) => { const serviceTitle = getAppointmentServiceTitle(appointment, services); return { id: `appointment:${appointment.id}`, kind: "appointment" as const, title: "Новая запись", meta: `${appointment.client || "Клиент"} записан(а) на ${serviceTitle} · ${formatNotificationDate(appointment.date)} · ${appointment.time}`, date: appointment.date, time: appointment.time, }; }); const systemItems = blockedTimes.map((event) => ({ id: `event:${event.id}`, kind: "system" as const, title: event.reason ? `График: ${event.reason}` : "Системное уведомление", meta: `${formatNotificationDate(event.date)} · ${event.start}-${event.end}`, date: event.date, time: event.start, })); return [...appointmentItems, ...systemItems].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)).slice(0, 18); }, [blockedTimes, services, visibleAppointments]); const unreadNotificationsCount = notificationsReady ? notificationItems.filter((item) => !seenNotificationIds.has(item.id)).length : 0; useEffect(() => { if (!authSession || !serverDataLoaded || notificationsReady)
    return; const saved = window.localStorage.getItem(getNotificationsStorageKey()); if (saved) {
    try {
        setSeenNotificationIds(new Set(JSON.parse(saved) as string[]));
    }
    catch {
        setSeenNotificationIds(new Set(notificationItems.map((item) => item.id)));
    }
}
else {
    const initialSeen = new Set(notificationItems.map((item) => item.id));
    setSeenNotificationIds(initialSeen);
    window.localStorage.setItem(getNotificationsStorageKey(), JSON.stringify([...initialSeen]));
} setNotificationsReady(true); }, [authSession, notificationItems, notificationsReady, serverDataLoaded]); useEffect(() => { if (!authSession || !notificationsReady)
    return; window.localStorage.setItem(getNotificationsStorageKey(), JSON.stringify([...seenNotificationIds].slice(-80))); }, [authSession, notificationsReady, seenNotificationIds]); useEffect(() => { if (!authSession || !serverDataLoaded)
    return; const refreshNotifications = async () => { try {
    const [appointmentsResponse, blockedTimesResponse] = await Promise.all([fetch("/api/appointments", { cache: "no-store" }), fetch("/api/blocked_times", { cache: "no-store" }),]);
    const appointmentsData = (await appointmentsResponse.json()) as {
        success: boolean;
        appointments?: Appointment[];
    };
    const blockedTimesData = (await blockedTimesResponse.json()) as {
        success: boolean;
        blockedTimes?: BlockedTime[];
    };
    if (appointmentsData.success)
        setAppointments(appointmentsData.appointments || []);
    if (blockedTimesData.success)
        setBlockedTimes(blockedTimesData.blockedTimes || []);
}
catch { /* Background refresh should stay quiet; the main data load still reports hard failures. */ } }; const interval = window.setInterval(refreshNotifications, 45000); return () => window.clearInterval(interval); }, [authSession, serverDataLoaded]); useEffect(() => { if (!authSession || !serverDataLoaded || clientsLoaded)
    return; if (section === "\u041a\u043b\u0438\u0435\u043d\u0442\u044b" || showAppointmentForm)
    void loadClients(); }, [authSession, clientsLoaded, section, serverDataLoaded, showAppointmentForm]); useEffect(() => { if (!authSession || !serverDataLoaded || bookingSettingsLoaded)
    return; if (section === "\u0421\u0442\u0440\u0430\u043d\u0438\u0446\u0430 \u0437\u0430\u043f\u0438\u0441\u0438" || section === "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438")
    void loadBookingPageSettings(); }, [authSession, bookingSettingsLoaded, section, serverDataLoaded]); useEffect(() => { if (section !== "Главная")
    setNotificationsOpen(false); }, [section]); useEffect(() => { if (schedulePanel !== "individual") {
    setOpenIndividualWorkHoursEditor(false);
    setSelectedWorkHoursDate(null);
} }, [schedulePanel]); const selectedDateWorkSchedule = useMemo(() => getScheduleForDate(selectedDateObject, weeklySchedule, workStart, workEnd), [selectedDateObject, weeklySchedule, workEnd, workStart]); const selectedAppointments = useMemo(() => visibleAppointments.filter((item) => item.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time)), [selectedDate, visibleAppointments]); const selectedBlockedTimes = useMemo(() => blockedTimes.filter((item) => item.date === selectedDate).sort((a, b) => a.start.localeCompare(b.start)), [blockedTimes, selectedDate]); const todayKey = formatDateKey(today); const todayFreeSlots = useMemo<FreeSlot[]>(() => { const daySchedule = getScheduleForDate(today, weeklySchedule, workStart, workEnd); const dayStart = timeToMinutes(daySchedule?.start || workStart); const dayEnd = timeToMinutes(daySchedule?.end || workEnd); if (daySchedule?.enabled === false || dayStart >= dayEnd)
    return []; const busyIntervals = [...getDayBreaks(daySchedule || { enabled: true, start: workStart, end: workEnd, breakEnabled: false, breakStart: "13:00", breakEnd: "14:00", breaks: [], }).filter(isBreakPeriodValid).map((item) => ({ start: timeToMinutes(item.start), end: timeToMinutes(item.end) })), ...blockedTimes.filter((item) => item.date === todayKey).map((item) => ({ start: timeToMinutes(item.start), end: timeToMinutes(item.end) })), ...visibleAppointments.filter((item) => item.date === todayKey).map((item) => { const start = timeToMinutes(item.time); return { start, end: start + getAppointmentDuration(item, services) }; }),].map((item) => ({ start: Math.max(dayStart, item.start), end: Math.min(dayEnd, item.end) })).filter((item) => item.start < item.end).sort((left, right) => left.start - right.start); const freeSlots: FreeSlot[] = []; let cursor = dayStart; busyIntervals.forEach((interval) => { if (interval.start - cursor >= slotStepMin) {
    freeSlots.push({ start: minutesToTime(cursor), end: minutesToTime(interval.start) });
} cursor = Math.max(cursor, interval.end); }); if (dayEnd - cursor >= slotStepMin) {
    freeSlots.push({ start: minutesToTime(cursor), end: minutesToTime(dayEnd) });
} return freeSlots; }, [blockedTimes, services, slotStepMin, today, todayKey, visibleAppointments, weeklySchedule, workEnd, workStart]); const activeServices = useMemo(() => services.filter((service) => service.active), [services]); const totalRevenue = useMemo(() => visibleAppointments.reduce((sum, item) => sum + getAppointmentPrice(item, services), 0), [services, visibleAppointments]); const updateDashboardDragStyles = (offsetX: number, width: number, direction: "next" | "prev" | null) => { const stage = dashboardSwipeStageRef.current; if (!stage)
    return; if (dashboardDragFrame.current !== null) {
    window.cancelAnimationFrame(dashboardDragFrame.current);
} dashboardDragFrame.current = window.requestAnimationFrame(() => { const previewOffset = direction === "prev" ? -width + offsetX : width + offsetX; stage.style.setProperty("--dashboard-drag-offset", `${offsetX}px`); stage.style.setProperty("--dashboard-preview-offset", `${previewOffset}px`); dashboardDragFrame.current = null; }); }; const resetDashboardDrag = () => { dashboardDragRef.current = { target: null, offsetX: 0, width: 1, direction: null }; setDashboardDrag({ target: null, width: 1, direction: null }); updateDashboardDragStyles(0, 1, null); }; const lockClientFormNavigation = () => { clientFormNavigationLockUntil.current = Date.now() + 800; dashboardSwipeStart.current = null; resetDashboardDrag(); }; const shouldBlockNavigationFromClientForm = (next: Section) => section === "Клиенты" && next !== "Клиенты" && (clientFormOpen || Date.now() < clientFormNavigationLockUntil.current); const setClientFormOpenFromClients: React.Dispatch<React.SetStateAction<boolean>> = (value) => { const next = typeof value === "function" ? value(clientFormOpen) : value; if (!next && clientFormOpen)
    lockClientFormNavigation(); setClientFormOpen(next); }; const resolveNextSection = (value: React.SetStateAction<Section>) => (typeof value === "function" ? value(section) : value); const commitSectionNavigation = (next: Section, direction: "next" | "prev" | "idle") => { startTransition(() => { setDashboardTabDirection(next !== section ? direction : "idle"); setSection(next); }); }; const navigateSection: React.Dispatch<React.SetStateAction<Section>> = (value) => { const next = resolveNextSection(value); if (shouldBlockNavigationFromClientForm(next))
    return; commitSectionNavigation(next, "idle"); }; const closeSelectedDateWorkHours = () => { const returnSection = selectedWorkHoursReturnSection || "Главная"; setDashboardTabDirection("idle"); setSection(returnSection); setSchedulePanel(null); setOpenIndividualWorkHoursEditor(false); setSelectedWorkHoursDate(null); setSelectedWorkHoursReturnSection(null); }; const openSelectedDateWorkHours = () => { setOpenWeekdayEditor(null); setSelectedWorkHoursReturnSection(section); setSelectedWorkHoursDate(selectedDate); setOpenIndividualWorkHoursEditor(true); setSchedulePanel("individual"); }; const navigateSectionWithSwipe = (value: React.SetStateAction<Section>, direction: "next" | "prev") => { const next = typeof value === "function" ? value(section) : value; if (shouldBlockNavigationFromClientForm(next))
    return; commitSectionNavigation(next, direction); }; const isBottomSheetOpen = () => typeof document !== "undefined" && Boolean(document.querySelector(".client-bottom-sheet-screen-open")); const handleDashboardTouchStart = (event: TouchEvent<HTMLElement>) => { if (selectedSettingsPanel || isBottomSheetOpen() || window.innerWidth >= 768 || event.touches.length !== 1) {
    dashboardSwipeStart.current = null;
    resetDashboardDrag();
    return;
} const target = event.target; if (section === "Главная" && calendarExpanded && target instanceof HTMLElement && target.closest(".home-calendar-shell")) {
    dashboardSwipeStart.current = null;
    resetDashboardDrag();
    return;
} if (target instanceof HTMLElement && target.closest(dashboardSwipeIgnoreSelector)) {
    dashboardSwipeStart.current = null;
    return;
} const servicePage = section === nav[1] && target instanceof HTMLElement && Boolean(target.closest(".services-phone-section")); const serviceFilterButton = servicePage ? document.querySelector<HTMLButtonElement>(".services-filter-row button.is-active[data-service-status-filter]") : null; const serviceFilterEdge = serviceFilterButton?.dataset.serviceStatusFilter === "all" || serviceFilterButton?.dataset.serviceStatusFilter === "archive" ? serviceFilterButton.dataset.serviceStatusFilter : null; const touch = event.touches[0]; dashboardSwipeStart.current = { x: touch.clientX, y: touch.clientY, time: Date.now(), serviceFilterEdge, servicePage }; dashboardDragRef.current = { target: null, offsetX: 0, width: Math.max(1, window.innerWidth), direction: null }; setDashboardDrag({ target: null, width: Math.max(1, window.innerWidth), direction: null }); updateDashboardDragStyles(0, Math.max(1, window.innerWidth), null); }; const handleDashboardTouchMove = (event: TouchEvent<HTMLElement>) => { if (selectedSettingsPanel || isBottomSheetOpen()) {
    dashboardSwipeStart.current = null;
    resetDashboardDrag();
    return;
} const start = dashboardSwipeStart.current; if (!start || window.innerWidth >= 768 || event.touches.length !== 1)
    return; const touch = event.touches[0]; const deltaX = touch.clientX - start.x; const deltaY = touch.clientY - start.y; if (Math.abs(deltaX) < 8 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2)
    return; if (start.servicePage) {
    const swipingToPreviousSection = deltaX > 0;
    const isAllowedEdgeSwipe = (swipingToPreviousSection && start.serviceFilterEdge === "all") || (!swipingToPreviousSection && start.serviceFilterEdge === "archive");
    if (!isAllowedEdgeSwipe) {
        if (dashboardDragRef.current.target)
            resetDashboardDrag();
        return;
    }
} const currentIndex = mobileSwipeSections.indexOf(section); if (currentIndex === -1)
    return; const targetIndex = currentIndex + (deltaX < 0 ? 1 : -1); const target = mobileSwipeSections[targetIndex]; if (!target) {
    if (dashboardDragRef.current.target) {
        resetDashboardDrag();
    }
    return;
} const width = Math.max(1, window.innerWidth); const direction = deltaX < 0 ? "next" : "prev"; const limitedOffset = deltaX < 0 ? Math.max(deltaX, -width) : Math.min(deltaX, width); const previousDrag = dashboardDragRef.current; dashboardDragRef.current = { target, offsetX: limitedOffset, width, direction }; if (previousDrag.target !== target || previousDrag.width !== width || previousDrag.direction !== direction) {
    setDashboardDrag({ target, width, direction });
} updateDashboardDragStyles(limitedOffset, width, direction); }; const handleDashboardTouchEnd = (event: TouchEvent<HTMLElement>) => { if (selectedSettingsPanel) {
    dashboardSwipeStart.current = null;
    resetDashboardDrag();
    return;
} const start = dashboardSwipeStart.current; const drag = dashboardDragRef.current; dashboardSwipeStart.current = null; resetDashboardDrag(); if (!start || isBottomSheetOpen() || window.innerWidth >= 768 || event.changedTouches.length !== 1)
    return; const touch = event.changedTouches[0]; const deltaX = touch.clientX - start.x; const deltaY = touch.clientY - start.y; const elapsed = Date.now() - start.time; const isHorizontalSwipe = Math.abs(deltaX) >= 56 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4; const isNaturalSwipeSpeed = elapsed <= 650; if (start.servicePage) {
    const swipingToPreviousSection = deltaX > 0;
    const isAllowedEdgeSwipe = (swipingToPreviousSection && start.serviceFilterEdge === "all") || (!swipingToPreviousSection && start.serviceFilterEdge === "archive");
    if (!isAllowedEdgeSwipe)
        return;
} if (drag.target && Math.abs(drag.offsetX) >= Math.min(120, drag.width * 0.26)) {
    navigateSectionWithSwipe(drag.target, drag.direction || (deltaX < 0 ? "next" : "prev"));
    return;
} if (!isHorizontalSwipe || !isNaturalSwipeSpeed)
    return; navigateSectionWithSwipe((current) => { const currentIndex = mobileSwipeSections.indexOf(current); if (currentIndex === -1)
    return current; const nextIndex = currentIndex + (deltaX < 0 ? 1 : -1); return mobileSwipeSections[nextIndex] || current; }, deltaX < 0 ? "next" : "prev"); }; const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 1800); }; const getNotificationsStorageKey = () => `dashboard-notifications-seen-${authSession?.id || "guest"}`; const rememberSeenNotification = (id: string) => { setSeenNotificationIds((current) => { if (current.has(id))
    return current; const next = new Set(current); next.add(id); return next; }); }; const markNotificationsRead = () => { setSeenNotificationIds((current) => { const next = new Set(current); notificationItems.forEach((item) => next.add(item.id)); return next; }); }; const copyLink = async () => { try {
    await navigator.clipboard.writeText(bookingUrl);
    showToast("Ссылка скопирована");
}
catch {
    showToast("Не удалось скопировать ссылку");
} }; const logout = async () => { await fetch("/api/logout", { method: "POST" }); window.localStorage.removeItem("dashboard-session-email"); document.cookie = "user_email=; Path=/; Max-Age=0; SameSite=Lax"; router.replace("/login"); }; const saveClient = (event?: React.FormEvent) => { event?.preventDefault(); if (!clientForm.name.trim() || !clientForm.phone.trim()) {
    showToast("Добавьте имя и телефон клиента");
    return;
} const savedEditingClientId = editingClientId; const optimisticClient: Client = { id: savedEditingClientId || `pending-client-${Date.now()}`, name: clientForm.name.trim(), phone: clientForm.phone.trim(), notes: clientForm.notes.trim(), telegramConnected: false, telegramUsername: "", telegramConnectedAt: "", visits: 0, lastVisit: "", totalSpent: 0, }; const previousClients = clients; setClients((current) => savedEditingClientId ? current.map((item) => (item.id === savedEditingClientId ? { ...item, ...optimisticClient } : item)) : [optimisticClient, ...current]); setClientFormOpen(false); setClientForm(emptyClient); setEditingClientId(null); showToast(savedEditingClientId ? "Клиент сохраняется" : "Клиент добавляется"); void fetch("/api/clients", { method: editingClientId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: savedEditingClientId || undefined, name: optimisticClient.name, phone: optimisticClient.phone, notes: optimisticClient.notes, }), }).then(async (response) => { const data = (await response.json()) as {
    success: boolean;
    clients?: Client[];
    error?: string;
}; if (!response.ok || !data.success)
    throw new Error(data.error || "Не удалось сохранить клиента"); setClients(data.clients || []); }).catch((error) => { setClients(previousClients); showToast(error instanceof Error ? error.message : "Не удалось сохранить клиента"); }); }; const editClient = (client: Client) => { setEditingClientId(client.id); setClientForm({ name: client.name, phone: client.phone, notes: client.notes, }); navigateSection("Клиенты"); }; const cancelClientEdit = () => { setEditingClientId(null); setClientForm(emptyClient); if (clientFormOpen)
    lockClientFormNavigation(); setClientFormOpen(false); }; const deleteClient = async (id: string) => { await fetch(`/api/clients?id=${encodeURIComponent(id)}`, { method: "DELETE" }); setClients((current) => current.filter((item) => item.id !== id)); if (editingClientId === id)
    cancelClientEdit(); showToast("Клиент удалён из базы"); }; const saveMasterProfile = async (profile: MasterProfile) => { if (!authSession)
    return; const displayName = profile.displayName.trim() || authSession.name; const slug = normalizeSlugOrFallback(profile.slug, normalizeEmailSlug(authSession.email)); setAccountSaving(true); try {
    const response = await fetch("/api/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: authSession.email, name: displayName, slug, }), });
    const data = (await response.json()) as {
        success: boolean;
        error?: string;
    };
    if (!response.ok || !data.success)
        throw new Error(data.error || "Не удалось сохранить настройки аккаунта");
    setAuthSession((current) => (current ? { ...current, name: displayName, slug } : current));
    setMasterProfile((current) => ({ ...current, displayName, slug }));
    showToast("Настройки аккаунта сохранены");
}
catch (error) {
    showToast(error instanceof Error ? error.message : "Не удалось сохранить настройки аккаунта");
}
finally {
    setAccountSaving(false);
} }; const saveBookingPageSettings = async (settingsOverride?: BookingPageSettings) => { const nextSettings = settingsOverride || bookingPageSettings; setBookingPageSaving(true); try {
    const response = await fetch("/api/booking-page/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nextSettings), });
    const data = (await response.json()) as {
        success: boolean;
        settings?: BookingPageSettings;
        error?: string;
    };
    if (!response.ok || !data.success)
        throw new Error(data.error || "Не удалось сохранить страницу записи");
    if (data.settings)
        setBookingPageSettings((current) => ({ ...current, ...data.settings! }));
    showToast("Страница записи сохранена");
}
catch (error) {
    showToast(error instanceof Error ? error.message : "Не удалось сохранить страницу записи");
}
finally {
    setBookingPageSaving(false);
} }; const uploadBookingImage = async (type: "cover" | "avatar", file: File) => { if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    showToast("Поддерживаются JPG, PNG и WebP");
    return;
} if (file.size > 5 * 1024 * 1024) {
    showToast("Файл должен быть не больше 5 МБ");
    return;
} const previewUrl = URL.createObjectURL(file); setBookingPageSettings((current) => ({ ...current, [type === "cover" ? "coverImageUrl" : "avatarUrl"]: previewUrl, ...(type === "cover" ? { coverPositionX: 50, coverPositionY: 50 } : {}), })); const formData = new FormData(); formData.append("type", type); formData.append("file", file); try {
    const response = await fetch("/api/booking-page/images", { method: "POST", body: formData });
    const data = (await response.json()) as {
        success: boolean;
        url?: string;
        error?: string;
    };
    if (!response.ok || !data.success || !data.url)
        throw new Error(data.error || "Не удалось загрузить изображение");
    setBookingPageSettings((current) => ({ ...current, [type === "cover" ? "coverImageUrl" : "avatarUrl"]: data.url!, ...(type === "cover" ? { coverPositionX: 50, coverPositionY: 50 } : {}), }));
    showToast(type === "cover" ? "Обложка загружена" : "Аватар загружен");
}
catch (error) {
    setBookingPageSettings((current) => ({ ...current, [type === "cover" ? "coverImageUrl" : "avatarUrl"]: "", ...(type === "cover" ? { coverPositionX: 50, coverPositionY: 50 } : {}), }));
    showToast(error instanceof Error ? error.message : "Не удалось загрузить изображение");
}
finally {
    URL.revokeObjectURL(previewUrl);
} }; const deleteBookingImage = async (type: "cover" | "avatar") => { setBookingPageSettings((current) => ({ ...current, [type === "cover" ? "coverImageUrl" : "avatarUrl"]: "", ...(type === "cover" ? { coverPositionX: 50, coverPositionY: 50 } : {}), })); const response = await fetch(`/api/booking-page/images?type=${type}`, { method: "DELETE" }); if (!response.ok)
    showToast("Не удалось удалить изображение"); }; const saveSchedule = (overrides?: {
    autoTimeSnap?: boolean;
    weeklySchedule?: WeeklySchedule;
    scheduleMode?: ScheduleMode;
    individualPlan?: StoredIndividualSchedulePlan;
}) => { const sourceWeeklySchedule = overrides?.weeklySchedule ?? weeklySchedule; const normalizedWeeklySchedule = normalizeWeeklyScheduleBreaks(sourceWeeklySchedule); const dateOverrides = getStoredDateOverrides(sourceWeeklySchedule); const schedulePayload = { ...normalizedWeeklySchedule, __scheduleMode: overrides?.scheduleMode ?? getStoredScheduleMode(sourceWeeklySchedule), ...(overrides?.individualPlan ? { __individualPlan: overrides.individualPlan } : getStoredIndividualPlan(sourceWeeklySchedule) ? { __individualPlan: getStoredIndividualPlan(sourceWeeklySchedule)! } : {}), ...(Object.keys(dateOverrides).length ? { __dateOverrides: dateOverrides } : {}), } as unknown as WeeklySchedule; setWeeklySchedule(schedulePayload); const workDays = scheduleDays.filter((day) => normalizedWeeklySchedule[String(day.index)]?.enabled).map((day) => day.index); void fetch("/api/schedule", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingEnabled, autoTimeSnap: overrides?.autoTimeSnap ?? autoTimeSnap, bufferMin, slotStepMin, weeklySchedule: schedulePayload, workDays, workEnd, workStart, maxBookingDaysAhead: bookingPageSettings.maxBookingDaysAhead, timezone: bookingPageSettings.timezone, }), }).then(async (response) => { const data = (await response.json()) as {
    success: boolean;
    error?: string;
}; if (!response.ok || !data.success)
    showToast(data.error || "Не удалось сохранить график"); }).catch(() => showToast("Не удалось сохранить график")); showToast("График сохраняется"); }; const selectToday = () => { const todayKey = formatDateKey(today); setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(todayKey); setCalendarWeekDate(todayKey); }; const selectCalendarDate = (dateKey: string) => { const nextDate = parseDateKey(dateKey); setSelectedDate(dateKey); setCalendarWeekDate(dateKey); setMonthDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1)); }; const changeWeek = (direction: -1 | 1) => { setCalendarWeekDate((current) => formatDateKey(addDays(parseDateKey(current), direction * 7))); }; const changeMonth = (direction: -1 | 1) => { setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1)); }; const addService = async (event: React.FormEvent) => { event.preventDefault(); if (!serviceForm.title.trim() || !serviceForm.price.trim()) {
    showToast("Добавьте название и цену, и услугу можно сохранять");
    return;
} if (serviceSaving)
    return; const activeEditingServiceId = editingServiceId; const optimisticService: Service = { id: activeEditingServiceId || `pending-service-${Date.now()}`, title: serviceForm.title.trim(), category: serviceForm.category, duration: Number(serviceForm.duration) || 60, price: Number(serviceForm.price) || 0, priceFrom: serviceForm.priceFrom, description: serviceForm.description.trim(), preparation: serviceForm.preparation, includedItems: serviceForm.includedItems.map((item) => item.trim()).filter(Boolean), materialName: serviceForm.materialName.trim(), materialCost: Number(serviceForm.materialCost) || 0, active: serviceForm.active, onlineBookingEnabled: serviceForm.onlineBookingEnabled, calendarColor: serviceForm.calendarColor, photoUrl: serviceForm.photoUrl, }; setServiceSaving(true); showToast(activeEditingServiceId ? "Услуга сохраняется" : "Услуга добавляется"); try {
    const response = await fetch("/api/services", { method: activeEditingServiceId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: activeEditingServiceId || undefined, title: optimisticService.title, price: optimisticService.price, priceFrom: optimisticService.priceFrom, duration: optimisticService.duration, description: optimisticService.description, notes: optimisticService.preparation, includedItems: optimisticService.includedItems, materialName: optimisticService.materialName, materialCost: optimisticService.materialCost, category: optimisticService.category, photoUrl: optimisticService.photoUrl, onlineBookingEnabled: optimisticService.onlineBookingEnabled, calendarColor: optimisticService.calendarColor, sortOrder: activeEditingServiceId ? undefined : services.length, active: optimisticService.active, }), });
    const data = (await response.json()) as {
        success: boolean;
        service?: Service;
        error?: string;
    };
    if (!response.ok || !data.success || !data.service)
        throw new Error(data.error || "Не удалось сохранить услугу");
    const normalizedService = normalizeService(data.service);
    const savedService = { ...normalizedService, priceFrom: normalizedService.priceFrom ?? optimisticService.priceFrom, includedItems: normalizedService.includedItems.length ? normalizedService.includedItems : optimisticService.includedItems, materialName: normalizedService.materialName || optimisticService.materialName, materialCost: normalizedService.materialCost || optimisticService.materialCost, calendarColor: data.service.calendarColor || optimisticService.calendarColor, photoUrl: getStoredServicePhotoUrl(data.service.photoUrl) || getStoredServicePhotoUrl(optimisticService.photoUrl), };
    setServices((current) => activeEditingServiceId ? current.some((item) => item.id === activeEditingServiceId) ? current.map((item) => (item.id === activeEditingServiceId ? savedService : item)) : [savedService, ...current] : [savedService, ...current]);
    setServiceForm(emptyService);
    setEditingServiceId(null);
    setServiceFormOpen(false);
    showToast(activeEditingServiceId ? "Услуга сохранена" : "Услуга добавлена");
}
catch (error) {
    showToast(error instanceof Error ? error.message : "Не удалось сохранить услугу");
}
finally {
    setServiceSaving(false);
} }; const addAppointment = (event: React.FormEvent) => { event.preventDefault(); const clientName = appointmentForm.client.trim() || "Без имени"; const clientPhone = appointmentForm.phone.trim(); const selectedServiceIds = appointmentForm.serviceIds.length ? appointmentForm.serviceIds : appointmentForm.serviceId ? [appointmentForm.serviceId] : services[0]?.id ? [services[0].id] : []; const serviceId = selectedServiceIds[0] || ""; if (!serviceId) {
    showToast("Сначала добавьте услугу");
    navigateSection("Услуги");
    return;
} const selectedServices = selectedServiceIds.map((selectedServiceId) => services.find((service) => service.id === selectedServiceId)).filter((service): service is Service => Boolean(service)); const appointmentStart = timeToMinutes(appointmentForm.time); const appointmentDuration = selectedServices.length ? selectedServices.reduce((sum, service) => sum + service.duration, 0) : 60; const appointmentEnd = appointmentStart + appointmentDuration; const timeBlocked = blockedTimes.some((block) => block.date === selectedDate && intervalsOverlap(appointmentStart, appointmentEnd, timeToMinutes(block.start), timeToMinutes(block.end))); if (timeBlocked) {
    showToast("Это время заблокировано мастером");
    return;
} const appointmentOverlaps = visibleAppointments.some((item) => { if (item.date !== selectedDate)
    return false; const itemStart = timeToMinutes(item.time); const itemEnd = itemStart + getAppointmentDuration(item, services); return intervalsOverlap(appointmentStart, appointmentEnd, itemStart, itemEnd); }); if (appointmentOverlaps) {
    showToast("Это время пересекается с другой записью");
    return;
} const optimisticAppointment: Appointment = { id: `pending-appointment-${Date.now()}`, date: selectedDate, time: appointmentForm.time, client: clientName, phone: clientPhone, serviceId, serviceIds: selectedServiceIds, status: "Активна", }; const previousAppointments = appointments; setAppointments((current) => [...current, optimisticAppointment]); rememberSeenNotification(`appointment:${optimisticAppointment.id}`); setAppointmentForm(emptyAppointment); setShowAppointmentForm(false); showToast("Запись добавляется"); void fetch("/api/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: selectedDate, time: optimisticAppointment.time, client: optimisticAppointment.client, phone: optimisticAppointment.phone, serviceId, serviceIds: selectedServiceIds, end: minutesToTime(appointmentEnd), }), }).then(async (response) => { const data = (await response.json()) as {
    success: boolean;
    appointment?: Appointment;
    error?: string;
}; if (!response.ok || !data.success || !data.appointment)
    throw new Error(data.error || "Не удалось создать запись"); rememberSeenNotification(`appointment:${data.appointment.id}`); setAppointments((current) => current.map((item) => (item.id === optimisticAppointment.id ? { ...data.appointment!, serviceIds: selectedServiceIds } : item))); void loadClients(); }).catch((error) => { setAppointments(previousAppointments); showToast(error instanceof Error ? error.message : "Не удалось создать запись"); }); }; const deleteAppointment = async (id: string) => { const target = appointments.find((item) => item.id === id); if (target && isNoShowAppointment(target)) {
    await updateAppointment(target, { status: "Не пришёл", statusCode: "no_show_deleted", archived: true });
    showToast("Запись удалена из расписания, но сохранена в истории");
    return;
} await fetch(`/api/appointments?id=${encodeURIComponent(id)}`, { method: "DELETE" }); setAppointments((current) => current.filter((item) => item.id !== id)); showToast("Запись удалена"); }; const updateAppointment = async (appointment: Appointment, patch: Partial<Appointment> & {
    statusCode?: string;
}) => { const nextAppointment = { ...appointment, ...patch }; const previousAppointments = appointments; const selectedServices = getAppointmentServices(nextAppointment, services); const duration = selectedServices.length ? selectedServices.reduce((sum, service) => sum + service.duration, 0) : getAppointmentDuration(nextAppointment, services); const end = minutesToTime(timeToMinutes(nextAppointment.time) + duration); setAppointments((current) => current.map((item) => (item.id === appointment.id ? nextAppointment : item))); try {
    const response = await fetch("/api/appointments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: appointment.id, date: nextAppointment.date, time: nextAppointment.time, end, client: nextAppointment.client, phone: nextAppointment.phone, serviceId: nextAppointment.serviceId, serviceIds: nextAppointment.serviceIds || [], status: patch.statusCode, notes: nextAppointment.notes || "", }), });
    const data = (await response.json()) as {
        success: boolean;
        appointment?: Appointment;
        error?: string;
    };
    if (!response.ok || !data.success || !data.appointment)
        throw new Error(data.error || "Не удалось сохранить запись");
    setAppointments((current) => current.map((item) => (item.id === appointment.id ? data.appointment! : item)));
}
catch (error) {
    setAppointments(previousAppointments);
    showToast(error instanceof Error ? error.message : "Не удалось сохранить запись");
} }; const syncAppointmentClientNote = async (appointment: Appointment, notes: string) => { if (!appointment.phone.trim()) {
    showToast("У записи нет телефона клиента для сохранения заметки");
    return;
} const normalizedPhone = appointment.phone.replace(/\D/g, ""); const normalizedName = appointment.client.trim().toLowerCase(); const currentClient = clients.find((client) => { const clientPhone = client.phone.replace(/\D/g, ""); if (normalizedPhone)
    return clientPhone === normalizedPhone; return normalizedName ? client.name.trim().toLowerCase() === normalizedName : false; }); const nextNotes = appendNoteText(currentClient?.notes || "", notes); try {
    const response = await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: appointment.client.trim() || "Клиент", phone: appointment.phone.trim(), notes: nextNotes, }), });
    const data = (await response.json()) as {
        success: boolean;
        clients?: Client[];
        error?: string;
    };
    if (!response.ok || !data.success)
        throw new Error(data.error || "Не удалось сохранить заметку клиента");
    setClients(data.clients || []);
}
catch (error) {
    showToast(error instanceof Error ? error.message : "Не удалось сохранить заметку клиента");
} }; const toggleService = (id: string) => { const service = services.find((item) => item.id === id); if (!service)
    return; const nextService = { ...service, active: !service.active }; setServices((current) => current.map((item) => (item.id === id ? nextService : item))); void fetch("/api/services", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, title: nextService.title, price: nextService.price, priceFrom: nextService.priceFrom, duration: nextService.duration, description: nextService.description, notes: nextService.preparation, includedItems: nextService.includedItems, materialName: nextService.materialName, materialCost: nextService.materialCost, category: nextService.category, photoUrl: nextService.photoUrl || "", onlineBookingEnabled: nextService.onlineBookingEnabled, calendarColor: nextService.calendarColor, active: nextService.active, }), }).catch(() => showToast("Не удалось сохранить видимость услуги")); }; const deleteService = async (id: string) => { await fetch(`/api/services?id=${encodeURIComponent(id)}`, { method: "DELETE" }); setServices((current) => current.filter((item) => item.id !== id)); setAppointments((current) => current.filter((item) => !getAppointmentServiceIds(item).includes(id))); showToast("Услуга удалена"); }; const editService = (service: Service) => { if (editingServiceId === service.id) {
    cancelServiceEdit();
    return;
} setEditingServiceId(service.id); setServiceForm({ title: service.title, category: service.category, duration: String(service.duration), price: String(service.price), priceFrom: normalizeBoolean(service.priceFrom), description: service.description, preparation: service.preparation, includedItems: deriveServiceIncludedItems(service), materialName: service.materialName || "", materialCost: String(service.materialCost || ""), photoUrl: service.photoUrl || "", onlineBookingEnabled: service.onlineBookingEnabled, active: service.active, calendarColor: service.calendarColor || "#0f766e", }); setServiceFormOpen(true); }; const cancelServiceEdit = () => { setEditingServiceId(null); setServiceForm(emptyService); setServiceFormOpen(false); }; const addBlockedTime = (event: React.FormEvent) => { event.preventDefault(); if (blockForm.start >= blockForm.end) {
    showToast("Время окончания должно быть позже начала");
    return;
} const blockStart = timeToMinutes(blockForm.start); const blockEnd = timeToMinutes(blockForm.end); const blockOverlapsAppointment = appointments.some((item) => { if (item.date !== blockForm.date)
    return false; const appointmentStart = timeToMinutes(item.time); const appointmentEnd = appointmentStart + getAppointmentDuration(item, services); return intervalsOverlap(blockStart, blockEnd, appointmentStart, appointmentEnd); }); if (blockOverlapsAppointment) {
    showToast("Блокировка пересекается с существующей записью");
    return;
} const blockOverlapsBlock = blockedTimes.some((item) => item.date === blockForm.date && intervalsOverlap(blockStart, blockEnd, timeToMinutes(item.start), timeToMinutes(item.end))); if (blockOverlapsBlock) {
    showToast("Такая блокировка пересекается с другой");
    return;
} const optimisticBlock: BlockedTime = { id: `pending-block-${Date.now()}`, date: blockForm.date, start: blockForm.start, end: blockForm.end, reason: blockForm.reason.trim() || "Недоступно", }; const previousBlockedTimes = blockedTimes; setBlockedTimes((current) => [optimisticBlock, ...current]); rememberSeenNotification(`event:${optimisticBlock.id}`); setBlockForm((current) => ({ ...emptyBlock, date: current.date })); showToast("Время блокируется"); void fetch("/api/blocked_times", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: optimisticBlock.date, start: optimisticBlock.start, end: optimisticBlock.end, reason: optimisticBlock.reason, }), }).then(async (response) => { const data = (await response.json()) as {
    success: boolean;
    blockedTime?: BlockedTime;
    error?: string;
}; if (!response.ok || !data.success || !data.blockedTime)
    throw new Error(data.error || "Не удалось создать блокировку"); rememberSeenNotification(`event:${data.blockedTime.id}`); setBlockedTimes((current) => current.map((item) => (item.id === optimisticBlock.id ? data.blockedTime! : item))); }).catch((error) => { setBlockedTimes(previousBlockedTimes); showToast(error instanceof Error ? error.message : "Не удалось создать блокировку"); }); }; const deleteBlockedTime = async (id: string) => { await fetch(`/api/blocked_times?id=${encodeURIComponent(id)}`, { method: "DELETE" }); setBlockedTimes((current) => current.filter((item) => item.id !== id)); showToast("Блокировка удалена"); }; const getDashboardContentClassName = (view: Section, extra = "") => `whatsapp-mobile-content dashboard-tab-transition ${extra} min-w-0 space-y-2 px-2 pb-4 md:space-y-5 md:px-0 md:pb-0 ${view === "Главная" ? "" : "dashboard-wide-tab"} ${view === "Услуги" ? "services-tab" : ""} ${view === "Статистика" ? "statistics-tab" : ""} ${view === "Клиенты" ? "clients-tab" : ""} ${mobileCompact ? "mobile-compact" : ""}`; const renderDashboardSection = (view: Section) => (<> <div className={`hidden justify-end md:flex ${view === "Финансы" ? "md:hidden" : ""}`}> <SettingsQuickButton active={view === "Настройки"} setSection={navigateSection}/> </div> {view === "Главная" && (<HomeSection activeServices={activeServices.length} appointments={selectedAppointments} calendarAppointments={appointments} calendarBlockedTimes={blockedTimes} blockedTimes={selectedBlockedTimes} clients={clients} compactAppointments={compactAppointments} deleteAppointment={deleteAppointment} updateAppointment={updateAppointment} syncAppointmentClientNote={syncAppointmentClientNote} formatSelectedDate={formatLongDate(selectedDateObject)} monthDate={monthDate} monthDays={monthDays} onToggleNotifications={() => setNotificationsOpen((current) => !current)} bookingUrl={bookingUrl} selectedDate={selectedDate} selectedWeekDays={selectedWeekDays} services={services} setSection={navigateSection} setStoryCreatorOpen={setStoryCreatorOpen} setAppointmentForm={setAppointmentForm} setSelectedDate={selectCalendarDate} setShowAppointmentForm={setShowAppointmentForm} showAppointmentForm={showAppointmentForm} showFilters={showFilters} showToast={showToast} storyCreatorOpen={storyCreatorOpen} storyDateLabel={formatLongDate(today)} todayFreeSlots={todayFreeSlots} timeSlots={timeSlots} appointmentForm={appointmentForm} addAppointment={addAppointment} changeWeek={changeWeek} changeMonth={changeMonth} selectToday={selectToday} setCalendarExpanded={setCalendarExpanded} setCompactAppointments={setCompactAppointments} setShowFilters={setShowFilters} unreadNotificationsCount={unreadNotificationsCount} calendarExpanded={calendarExpanded} calendarWeekDate={calendarWeekDate} selectedDateWorkSchedule={selectedDateWorkSchedule} onEditSelectedWorkHours={openSelectedDateWorkHours}/>)} {view === "Услуги" && (<ServicesSection addService={addService} appointments={visibleAppointments} cancelServiceEdit={cancelServiceEdit} deleteService={deleteService} editService={editService} editingServiceId={editingServiceId} serviceForm={serviceForm} serviceFormOpen={serviceFormOpen} serviceSaving={serviceSaving} services={services} setServiceOverlayOpen={setServiceOverlayOpen} setServiceFormOpen={setServiceFormOpen} setServiceForm={setServiceForm} previewServiceColor={(serviceId, color) => { setServices((current) => current.map((service) => (service.id === serviceId ? { ...service, calendarColor: color } : service))); }} toggleService={toggleService}/>)} {(view === "График работы" || Boolean(selectedWorkHoursDate)) && (<ScheduleSection addBlockedTime={addBlockedTime} blockForm={blockForm} blockedTimes={blockedTimes} bookingEnabled={bookingEnabled} bookingPageSettings={bookingPageSettings} autoTimeSnap={autoTimeSnap} bufferMin={bufferMin} deleteBlockedTime={deleteBlockedTime} openIndividualWorkHoursEditor={openIndividualWorkHoursEditor} openWeekdayEditor={openWeekdayEditor} selectedWorkHoursDate={selectedWorkHoursDate} onCloseSelectedWorkHours={closeSelectedDateWorkHours} saveBookingPageSettings={saveBookingPageSettings} saveSchedule={saveSchedule} setBlockForm={setBlockForm} setAutoTimeSnap={setAutoTimeSnap} setBookingPageSettings={setBookingPageSettings} setBufferMin={setBufferMin} setBookingEnabled={setBookingEnabled} setOpenWeekdayEditor={setOpenWeekdayEditor} setSchedulePanel={setSchedulePanel} setSlotStepMin={setSlotStepMin} setWeeklySchedule={setWeeklySchedule} setWorkEnd={setWorkEnd} setWorkStart={setWorkStart} showToast={showToast} schedulePanel={schedulePanel} slotStepMin={slotStepMin} weeklySchedule={weeklySchedule} workEnd={workEnd} workStart={workStart}/>)} {view === "Статистика" && (<StatisticsSection appointments={appointments} activeServices={activeServices.length} blockedTimes={blockedTimes} services={services} totalRevenue={totalRevenue} weeklySchedule={weeklySchedule} workEnd={workEnd} workStart={workStart}/>)} {view === "Страница записи" && (<BookingPageSettingsSection bookingPageSaving={bookingPageSaving} bookingPageSettings={bookingPageSettings} bookingUrl={bookingUrl} deleteBookingImage={deleteBookingImage} masterName={masterProfile.displayName || authSession?.name || "Мастер"} onBack={() => navigateSection("Настройки")} saveBookingPageSettings={saveBookingPageSettings} services={services} setBookingPageSettings={setBookingPageSettings} uploadBookingImage={uploadBookingImage}/>)} {view === "Аналитика" && (<AnalyticsSection appointments={appointments} activeServices={activeServices.length} blockedTimes={blockedTimes} services={services} weeklySchedule={weeklySchedule} workEnd={workEnd} workStart={workStart}/>)} {view === "Финансы" && (<FinanceSection appointments={visibleAppointments} services={services} totalRevenue={totalRevenue}/>)} {view === "Клиенты" && (<ClientsSection appointments={appointments} cancelClientEdit={cancelClientEdit} clientForm={clientForm} clientFormOpen={clientFormOpen} compactClients={compactClients} clients={clients} deleteClient={deleteClient} editClient={editClient} editingClientId={editingClientId} saveClient={saveClient} services={services} setCompactClients={setCompactClients} setClientForm={setClientForm} setClientFormOpen={setClientFormOpenFromClients}/>)} {view === "Настройки" && (<SettingsSection activeServices={activeServices.length} accountSaving={accountSaving} appointments={visibleAppointments} blockedTimes={blockedTimes} bookingPageSaving={bookingPageSaving} bookingPageSettings={bookingPageSettings} email={authSession?.email || ""} bookingUrl={bookingUrl} copyLink={copyLink} logout={logout} masterProfile={masterProfile} darkTheme={darkTheme} mobileCompact={mobileCompact} saveBookingPageSettings={saveBookingPageSettings} saveMasterProfile={saveMasterProfile} selectedSettingsPanel={selectedSettingsPanel} services={services} setBookingPageSettings={setBookingPageSettings} setSelectedSettingsPanel={setSelectedSettingsPanel} setSection={navigateSection} setMasterProfile={setMasterProfile} setDarkTheme={setDarkTheme} setMobileCompact={setMobileCompact} subscription={subscription} subscriptionLoading={subscriptionLoading} subscriptionPayments={subscriptionPayments} subscriptionPlans={subscriptionPlans} reloadSubscription={loadSubscriptionData} totalRevenue={totalRevenue} weeklySchedule={weeklySchedule} workEnd={workEnd} workStart={workStart}/>)} </>); const dashboardDragActive = Boolean(dashboardDrag.target); const dashboardCurrentStyle: CSSProperties | undefined = dashboardDragActive ? { transform: "translate3d(var(--dashboard-drag-offset, 0px), 0, 0)" } : undefined; const dashboardPreviewStyle: CSSProperties | undefined = dashboardDragActive ? { transform: "translate3d(var(--dashboard-preview-offset, 100vw), 0, 0)" } : undefined; const serviceFullscreenActive = section === "Услуги" && (serviceFormOpen || serviceOverlayOpen); const shouldShowMobileHeader = (view: Section) => !(view === "Услуги" && serviceFullscreenActive); const renderDashboardHeader = (view: Section) => shouldShowMobileHeader(view) ? (<MobileWhatsAppHeader appointmentsCount={appointments.length} clientsCount={clients.length} onAddClient={() => { if (editingClientId)
    cancelClientEdit(); setClientForm(emptyClient); setClientFormOpen(true); }} onAddService={() => { if (editingServiceId)
    cancelServiceEdit(); setServiceFormOpen(true); }} onMarkNotificationsRead={markNotificationsRead} notificationsOpen={notificationsOpen} selectedDate={selectedDate} selectedWeekDays={selectedWeekDays} section={view} servicesCount={activeServices.length} setNotificationsOpen={setNotificationsOpen} setSelectedDate={selectCalendarDate} setSection={navigateSection} unreadNotificationsCount={unreadNotificationsCount}/>) : null; return (<main ref={dashboardSwipeStageRef} className="master-workspace whatsapp-mobile-shell min-h-screen bg-transparent pb-28 md:pb-0" onTouchCancel={() => { dashboardSwipeStart.current = null; resetDashboardDrag(); }} onTouchEnd={handleDashboardTouchEnd} onTouchMove={handleDashboardTouchMove} onTouchStart={handleDashboardTouchStart}> <div className={`master-layout dashboard-swipe-stage mx-auto grid w-full max-w-[1600px] gap-0 px-0 py-0 md:grid-cols-[280px_1fr] md:gap-6 md:px-4 md:py-6 ${dashboardDragActive ? "dashboard-swipe-dragging" : ""}`}> <aside className="master-sidebar saas-card pattern-surface sticky top-6 hidden h-fit p-3 md:block"> <p className="px-3 py-3 text-navigationTitle text-textPrimary">Beauty Time</p> <nav className="space-y-1"> {nav.map((item) => { const active = section === item || (item === "Статистика" && (section === "Аналитика" || section === "Финансы")); return (<button key={item} type="button" onClick={() => navigateSection(item)} className={`w-full rounded-lg px-3 py-2.5 text-left text-tabLabel transition ${active ? "bg-primarySurface text-textPrimary shadow-sm" : "text-textSecondary hover:bg-background hover:text-textPrimary"}`}> {item}</button>); })} </nav> <button type="button" onClick={logout} className="mt-4 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-left text-buttonLabel text-textPrimary transition hover:bg-background"> Выйти</button> </aside> <section key={`${section}-${dashboardTabDirection}`} className={`dashboard-page-pane ${dashboardTabDirection === "next" ? "dashboard-tab-slide-next" : dashboardTabDirection === "prev" ? "dashboard-tab-slide-prev" : ""} ${dashboardDragActive ? "dashboard-tab-drag-current" : ""}`} style={dashboardCurrentStyle}> {renderDashboardHeader(section)} <div className={getDashboardContentClassName(section)}> {renderDashboardSection(section)} </div> </section> {dashboardDrag.target && (<section aria-hidden="true" className="dashboard-page-pane dashboard-page-preview dashboard-tab-drag-preview" style={dashboardPreviewStyle}> {renderDashboardHeader(dashboardDrag.target)} <div className={getDashboardContentClassName(dashboardDrag.target)}> {renderDashboardSection(dashboardDrag.target)} </div> </section>)} </div> <nav className="hidden"> <div className="mx-auto flex max-w-4xl gap-2 overflow-x-auto"> {nav.map((item) => (<button key={item} type="button" onClick={() => navigateSection(item)} className={`shrink-0 rounded-xl px-4 py-3 text-tabLabel ${section === item ? "text-tabLabelActive bg-primarySurface text-primary" : "text-textSecondary"}`}> {item}</button>))} <button type="button" onClick={logout} className="shrink-0 rounded-xl px-4 py-3 text-buttonLabel text-textPrimary"> Выйти</button> </div> </nav> {!serviceFullscreenActive && (<MobileWhatsAppBottomNav section={section} setSection={navigateSection}/>)} <AppointmentCreateModalFixed open={section === "Главная" && showAppointmentForm} addAppointment={addAppointment} appointmentForm={appointmentForm} clients={clients} services={services} setAppointmentForm={setAppointmentForm} setShowAppointmentForm={setShowAppointmentForm}/> {section === "Главная" && (<div className="appointment-fab-row"> <button type="button" onClick={() => setShowAppointmentForm((value) => !value)} className={`home-add-appointment-fab ${showAppointmentForm ? "home-add-appointment-fab-active" : ""}`} aria-label="Добавить запись" title="Добавить запись"> <ActionIcon name="plus"/></button> </div>)} {section === "Главная" && (<NotificationCenter items={notificationItems} onMarkRead={markNotificationsRead} open={notificationsOpen} seenIds={seenNotificationIds} setOpen={setNotificationsOpen} unreadCount={unreadNotificationsCount}/>)} {section === "Главная" && storyCreatorOpen && (<StoryCreatorPanel bookingUrl={bookingUrl} dateLabel={formatLongDate(today)} freeSlots={todayFreeSlots} masterName={masterProfile.displayName || masterProfile.slug} onClose={() => setStoryCreatorOpen(false)} showToast={showToast}/>)} {toast && <div className="fixed left-4 right-4 top-4 z-[9999] rounded-xl bg-textPrimary px-4 py-2 text-systemMessage text-surface md:left-auto md:right-4">{toast}</div>} </main>); }
function NotificationCenter({ items, onMarkRead, open, seenIds, setOpen, unreadCount, }: {
    items: NotificationItem[];
    onMarkRead: () => void;
    open: boolean;
    seenIds: Set<string>;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    unreadCount: number;
}) {
    type NotificationTab = "all" | "new" | "appointments" | "system";
    const [activeTab, setActiveTab] = useState<NotificationTab>("all");
    const toggle = () => setOpen((current) => !current);
    const tabs: Array<{ id: NotificationTab; label: string; }> = [{ id: "all", label: "Все" }, { id: "new", label: "Новые" }, { id: "appointments", label: "Записи" }, { id: "system", label: "Система" },];
    const filteredItems = items.filter((item) => {
        if (activeTab === "new")
            return !seenIds.has(item.id);
        if (activeTab === "appointments")
            return item.kind === "appointment";
        if (activeTab === "system")
            return item.kind === "system";
        return true;
    });
    const groupedItems = filteredItems.reduce<Array<{ label: string; items: NotificationItem[]; }>>((groups, item) => {
        const todayDate = parseDateKey(formatDateKey(new Date()));
        const yesterday = addDays(todayDate, -1);
        const label = item.date === formatDateKey(todayDate) ? "Сегодня" : item.date === formatDateKey(yesterday) ? "Вчера" : formatNotificationDate(item.date);
        const group = groups.find((entry) => entry.label === label);
        if (group)
            group.items.push(item);
        else
            groups.push({ label, items: [item] });
        return groups;
    }, []);
    const openItem = (item: NotificationItem) => {
        if (item.kind === "appointment") {
            window.dispatchEvent(new CustomEvent("dashboard-open-appointment", { detail: { id: item.id.replace(/^appointment:/, ""), date: item.date } }));
        }
        setOpen(false);
    };
    return (<div> <button type="button" onClick={toggle} className={`pattern-surface fixed right-4 top-6 z-30 hidden h-9 min-h-0 w-9 items-center justify-center rounded-full bg-surface text-textPrimary shadow-sm backdrop-blur transition hover:bg-background md:top-4 md:flex ${open ? "bg-surface" : ""}`} aria-label="Открыть уведомления" title="Уведомления"> <BellIcon /> {unreadCount > 0 && (<span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-badge text-surface"> {unreadCount > 9 ? "9+" : unreadCount} </span>)}</button> {open && (<div className="notification-client-modal fixed inset-0 z-[130] bg-surface" role="dialog" aria-modal="true" aria-labelledby="notifications-title"> <div className="client-reference-screen notification-reference-screen"> <header className="client-reference-header notification-reference-header"> <div className="client-reference-title-row notification-reference-title-row"> <h1 id="notifications-title">Уведомления</h1> <div className="notification-reference-actions"> <button type="button" className="notification-reference-icon" aria-label="Фильтры" title="Фильтры"> <SlidersHorizontal className="h-5 w-5" weight="bold" aria-hidden="true"/></button> <button type="button" onClick={onMarkRead} className="notification-reference-read-all">Прочитать всё</button> <button type="button" onClick={() => setOpen(false)} className="notification-reference-close" aria-label="Закрыть уведомления" title="Закрыть"> <CloseIcon /></button> </div> </div> <div className="services-search-field client-reference-search notification-reference-search notification-reference-title-field"> <BellIcon /> <span>Уведомления</span> <button type="button" onClick={() => setOpen(false)} className="notification-reference-title-close" aria-label="Закрыть уведомления" title="Закрыть"> <X className="h-5 w-5" weight="regular" aria-hidden="true"/></button> </div> <div className="client-reference-filters notification-reference-filters" role="tablist" aria-label="Фильтр уведомлений"> {tabs.map((tab) => (<button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={activeTab === tab.id ? "client-reference-filter-active" : ""} role="tab" aria-selected={activeTab === tab.id}> {tab.label}</button>))} </div> </header> <div className="client-reference-list-viewport notification-reference-list-viewport"> <div className="client-reference-list-track"> <section className="client-list client-reference-list notification-reference-list"> {groupedItems.length === 0 ? (<article className="notification-reference-empty"> {items.length === 0 ? "Новые записи и системные уведомления появятся здесь." : "По этому запросу уведомлений не найдено."} </article>) : groupedItems.map((group) => (<div key={group.label} className="notification-reference-group"> <h3>{group.label}</h3> {group.items.map((item) => { const unread = !seenIds.has(item.id); return (<NotificationCard key={item.id} item={item} unread={unread} onOpen={() => openItem(item)}/>); })} </div>))} </section> </div> </div> </div> </div>)} </div>);
}function NotificationCard({ item, onOpen, unread, }: {
    item: NotificationItem;
    onOpen: () => void;
    unread: boolean;
}) {
    return (<article onClick={onOpen} className="client-card client-reference-card notification-reference-card relative cursor-pointer overflow-hidden"> <div className="client-reference-card-inner notification-reference-card-inner"> <span className={`client-reference-avatar client-reference-list-avatar notification-reference-avatar ${getNotificationToneClass(item.kind)}`} aria-hidden="true"> <NotificationKindIcon kind={item.kind}/> </span> <div className="client-reference-card-body notification-reference-card-body"> <div className="client-reference-card-main notification-reference-card-main"> <p className="client-name-settings-copy settings-menu-title-copy truncate text-textPrimary" style={settingsMenuTitleStyle}>{item.title}</p> <p>{item.meta}</p> <p>{formatNotificationDate(item.date)} · {item.time}</p> {unread && <div className="client-reference-card-tags notification-reference-card-tags"><span>Новое</span></div>} </div> <CaretRight className="client-reference-chevron notification-reference-chevron" weight="bold" aria-hidden="true"/> </div> </div> </article>);
}function getNotificationToneClass(kind: NotificationItem["kind"]) { if (kind === "appointment")
    return "bg-primary"; return "bg-textDisabled text-textSecondary"; }
function NotificationKindIcon({ kind }: {
    kind: NotificationItem["kind"];
}) { if (kind === "appointment")
    return <MiniCalendarIcon />; return <GearSix className="h-5 w-5" weight="bold" aria-hidden="true"/>; }
function StoryCreatorPanel({ bookingUrl, dateLabel, freeSlots, masterName, onClose, showToast, }: {
    bookingUrl: string;
    dateLabel: string;
    freeSlots: FreeSlot[];
    masterName: string;
    onClose: () => void;
    showToast: (message: string) => void;
}) { const [menuOpen, setMenuOpen] = useState(false); const visibleSlots = freeSlots.slice(0, 5); const slotLines = visibleSlots.length ? visibleSlots.map((slot) => `${slot.start} - ${slot.end}`) : ["сегодня мест нет"]; const storyText = [`Свободные окна на ${dateLabel}`, "", ...slotLines, "", `Запись: ${bookingUrl}`].join("\n"); const platforms: Array<{
    id: StoryPlatform;
    label: string;
    hint: string;
    appUrl: string;
    fallbackUrl: string;
}> = [{ id: "instagram", label: "Instagram", hint: "Скопировать текст и открыть сторис", appUrl: "instagram://story-camera", fallbackUrl: "https://www.instagram.com/", }, { id: "telegram", label: "Telegram", hint: "Отправить готовый текст", appUrl: `tg://share?text=${encodeURIComponent(storyText)}`, fallbackUrl: `https://t.me/share/url?text=${encodeURIComponent(storyText)}`, }, { id: "whatsapp", label: "WhatsApp", hint: "Отправить готовый текст", appUrl: `whatsapp://send?text=${encodeURIComponent(storyText)}`, fallbackUrl: `https://wa.me/?text=${encodeURIComponent(storyText)}`, },]; const copyText = async (value: string) => { try {
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(value);
            return true;
        }
        catch { /* Some mobile browsers expose Clipboard API but still reject writes. */ }
    }
    const textArea = document.createElement("textarea");
    textArea.value = value;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, textArea.value.length);
    const copied = document.execCommand("copy");
    document.body.removeChild(textArea);
    return copied;
}
catch {
    return false;
} }; const copyStoryText = async () => { const copied = await copyText(storyText); if (copied) {
    showToast("Текст сторис скопирован");
}
else {
    showToast("Не удалось скопировать текст сторис");
} }; const shareStoryText = async () => { setMenuOpen(false); if (navigator.share) {
    try {
        await navigator.share({ title: "Окна на сегодня", text: storyText, });
        return;
    }
    catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
            return;
    }
} setMenuOpen(true); showToast("Выберите платформу для публикации"); }; const openPublishService = (target: (typeof platforms)[number]) => { setMenuOpen(false); void copyText(storyText).then((copied) => { showToast(copied ? "Текст сторис скопирован" : "Скопируйте текст сторис вручную"); }); window.location.href = target.appUrl; window.setTimeout(() => { if (document.visibilityState === "visible")
    window.open(target.fallbackUrl, "_blank", "noopener,noreferrer"); }, 900); }; return (<div className="fixed inset-0 z-[120] bg-background" role="dialog" aria-modal="true"> <section className="flex h-full w-full flex-col overflow-hidden bg-background"> <div className="flex items-start justify-between gap-3 border-b border-border bg-surface px-4 py-3 shadow-sm md:px-6"> <div className="min-w-0"> <h2 className="text-navigationTitle text-textPrimary">Окна на сегодня</h2> </div> <button type="button" onClick={onClose} className="flex h-9 min-h-0 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-textPrimary shadow-sm transition hover:bg-background" aria-label="Закрыть сторис" title="Закрыть"> <CloseIcon /></button> </div> <div className="flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-7"> <div className="mx-auto grid min-h-full w-full max-w-5xl gap-5"> <div className="grid w-full grid-cols-[minmax(0,1fr)_116px] items-center gap-4 overflow-hidden rounded-[24px] border border-success/20 bg-[linear-gradient(135deg,rgb(var(--color-surface))_0%,rgb(var(--color-primary-surface))_100%)] p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_124px] md:p-5"> <div className="min-w-0 text-left"> <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-success text-surface shadow-sm" aria-hidden="true"> <StoryIcon /> </span> <p className="mt-3 text-messageBody text-textPrimary"> Скопируйте свободные окна и опубликуйте их в сторис </p> <p className="mt-1 max-w-sm text-settingsRowDescription text-textSecondary"> Текст уже разбит по строкам, чтобы вставка выглядела аккуратно. </p> </div> <div className="ml-auto w-full max-w-[116px] rotate-1 rounded-[16px] bg-textPrimary p-1 text-surface shadow-[0_14px_34px_rgb(var(--color-text-primary)_/_0.26)] md:max-w-[124px]"> <div className="relative aspect-[9/16] overflow-hidden rounded-[16px] bg-[radial-gradient(circle_at_20%_12%,rgb(var(--color-primary-surface)_/_0.45),transparent_28%),linear-gradient(160deg,rgb(var(--color-success))_0%,rgb(var(--color-primary))_50%,rgb(var(--color-text-primary))_100%)] p-3"> <div className="absolute left-4 right-4 top-3 flex gap-1" aria-hidden="true"> <span className="h-0.5 flex-1 rounded-full bg-surface/90"/> <span className="h-0.5 flex-1 rounded-full bg-surface/35"/> <span className="h-0.5 flex-1 rounded-full bg-surface/35"/> </div> <div className="flex h-full flex-col pt-4"> <p className="text-messageMetadata leading-tight text-surface/75">{masterName || "Beauty Time"}</p> <p className="mt-2 text-conversationName leading-tight">Свободные окна</p> <p className="mt-1 text-messageMetadata leading-tight text-surface/80">{dateLabel}</p> <div className="mt-auto space-y-1.5"> {visibleSlots.length ? (visibleSlots.map((slot) => (<div key={`${slot.start}-${slot.end}`} className="rounded-lg bg-surface/18 px-2 py-1.5 text-center text-badge backdrop-blur"> {slot.start} - {slot.end} </div>))) : (<div className="rounded-lg bg-surface/18 px-2 py-1.5 text-center text-badge backdrop-blur">Сегодня мест нет</div>)} <div className="rounded-lg bg-surface px-2 py-1.5 text-center text-badge text-success shadow-sm"> Записаться </div> </div> </div> </div> </div> </div> <div className="w-full rounded-[22px] border border-border bg-surface p-4 shadow-sm md:p-6"> <p className="text-sectionLabel text-textSecondary">Текст для публикации</p> <pre className="mt-3 min-h-[240px] whitespace-pre-wrap rounded-2xl bg-background px-4 py-4 font-sans text-messageBodyEmphasis text-textPrimary md:min-h-[330px] md:px-6 md:py-5">{storyText}</pre> <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2"> <button type="button" onClick={copyStoryText} className="w-full rounded-xl border border-success/35 bg-surface px-4 py-3 text-buttonLabel text-success hover:bg-success/10"> Скопировать текст</button> <button type="button" onClick={shareStoryText} className="w-full rounded-xl bg-success px-4 py-3 text-buttonLabel text-surface hover:bg-success/90" aria-expanded={menuOpen}> Поделиться</button> </div> {menuOpen && (<div className="mt-2 overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-[0_18px_46px_rgb(var(--color-text-primary)_/_0.18)]"> {platforms.map((item) => (<button key={item.id} type="button" onClick={() => openPublishService(item)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-background"> <span> <span className="block text-conversationName text-textPrimary">{item.label}</span> <span className="mt-0.5 block text-messageMetadata text-textSecondary">{item.hint}</span> </span> <span className="flex h-8 w-8 shrink-0 items-center justify-center"> <PlatformIcon platform={item.id}/> </span></button>))} </div>)} </div> </div> </div> </section> </div>); }
function StoryIcon() { return <Megaphone className="h-5 w-5" weight="bold" aria-hidden="true"/>; }
function PlatformIcon({ platform }: {
    platform: StoryPlatform;
}) { if (platform === "instagram") {
    return <InstagramLogo className="h-8 w-8 text-danger" weight="fill" aria-hidden="true"/>;
} if (platform === "telegram") {
    return <TelegramLogo className="h-8 w-8 text-info" weight="fill" aria-hidden="true"/>;
} return <WhatsappLogo className="h-8 w-8 text-success" weight="fill" aria-hidden="true"/>; }
function BellIcon() { return <Bell className="h-5 w-5" weight="bold" aria-hidden="true"/>; }
function CloseIcon() { return <X className="h-4 w-4" weight="bold" aria-hidden="true"/>; }
function MiniCalendarIcon() { return <CalendarBlank className="h-4 w-4" weight="bold" aria-hidden="true"/>; }
function TodayIcon() { return <CalendarCheck className="h-4 w-4" weight="bold" aria-hidden="true"/>; }
function MiniEventIcon() { return <Clock className="h-4 w-4" weight="bold" aria-hidden="true"/>; }
function AppointmentCreateModalFixed({ addAppointment, appointmentForm, clients, open, services, setAppointmentForm, setShowAppointmentForm, }: {
    addAppointment: (event: React.FormEvent) => void;
    appointmentForm: typeof emptyAppointment;
    clients: Client[];
    open: boolean;
    services: Service[];
    setAppointmentForm: React.Dispatch<React.SetStateAction<typeof emptyAppointment>>;
    setShowAppointmentForm: React.Dispatch<React.SetStateAction<boolean>>;
}) { if (!open)
    return null; const close = () => setShowAppointmentForm(false); return (<DraggableBottomSheetFrame screenClassName="appointment-modal" panelClassName="appointment-modal-panel" onClose={close}> <form onSubmit={addAppointment} className="grid gap-3 md:grid-cols-2"> <div className="client-bottom-sheet-header md:col-span-2"> <div className="min-w-0"> <p className="text-conversationName text-textPrimary">Новая запись</p> <p className="mt-1 text-settingsRowDescription text-textSecondary">Заполните основные данные клиента.</p> </div> <button type="button" onClick={close} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background text-textPrimary hover:bg-background" aria-label="Закрыть" title="Закрыть"> <CloseIcon /></button> </div> <TimeWheelPicker className="appointment-modal-time-wheel" label="Время" value={appointmentForm.time} onChange={(time) => setAppointmentForm((current) => ({ ...current, time }))}/> <ClientPicker className="md:col-span-2" clients={clients} valueName={appointmentForm.client} valuePhone={appointmentForm.phone} onSelect={(client) => setAppointmentForm((current) => ({ ...current, client: client.name, phone: client.phone }))}/> <input value={appointmentForm.client} onChange={(event) => setAppointmentForm((current) => ({ ...current, client: event.target.value }))} className="h-10 w-full rounded-lg border border-border px-3 text-settingsRowDescription" placeholder="Имя клиента"/> <input value={appointmentForm.phone} onChange={(event) => setAppointmentForm((current) => ({ ...current, phone: event.target.value }))} className="h-10 w-full rounded-lg border border-border px-3 text-settingsRowDescription" placeholder="Телефон"/> <ServicePicker className="md:col-span-2" services={services} value={appointmentForm.serviceIds.length ? appointmentForm.serviceIds : appointmentForm.serviceId ? [appointmentForm.serviceId] : []} onChange={(serviceIds) => setAppointmentForm((current) => ({ ...current, serviceId: serviceIds[0] || "", serviceIds }))}/> <div className="client-bottom-sheet-actions grid grid-cols-2 gap-2 md:col-span-2 md:flex md:flex-row"> <button type="submit" className="client-bottom-sheet-submit w-full rounded-lg bg-primary px-3 py-3 text-settingsRowTitle text-surface md:w-auto"> Готово</button> <button type="button" onClick={close} className="client-bottom-sheet-cancel w-full rounded-lg border border-border px-3 py-3 text-settingsRowTitle md:w-auto"> Не сейчас</button> </div> </form> </DraggableBottomSheetFrame>); }
function ServicePicker({ className = "", onChange, services, value, }: {
    className?: string;
    onChange: (serviceIds: string[]) => void;
    services: Service[];
    value: string[];
}) { const [open, setOpen] = useState(false); const availableServices = useMemo(() => uniqueById(services), [services]); const selectedServices = value.map((serviceId) => availableServices.find((service) => service.id === serviceId)).filter((service): service is Service => Boolean(service)); const label = selectedServices.length > 1 ? `${selectedServices[0].title} +${selectedServices.length - 1}` : selectedServices[0]?.title || "Выберите услугу"; const toggleService = (serviceId: string) => { onChange(value.includes(serviceId) ? value.filter((id) => id !== serviceId) : [...value, serviceId]); }; return (<div className={`service-picker-field ${className}`}> <button type="button" className={`service-picker-trigger ${selectedServices.length ? "service-picker-trigger-selected" : ""}`} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}> <span className="truncate">{label}</span> <CaretDown className="h-4 w-4 shrink-0" weight="bold" aria-hidden="true"/></button> {open && (<div className="service-picker-screen service-picker-screen-open" onClick={() => setOpen(false)} role="dialog" aria-modal="true"> <div className="service-picker-sheet" onClick={(event) => event.stopPropagation()}> <div className="service-picker-header"> <div className="min-w-0"> <p>Выберите услугу</p> <span>{services.length ? "Услуга будет добавлена к новой записи" : "Сначала добавьте услугу в разделе услуг"}</span> </div> <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть" title="Закрыть"> <CloseIcon /></button> </div> <div className="service-picker-list"> {availableServices.length === 0 && (<div className="service-picker-empty">Нет доступных услуг</div>)} {availableServices.map((service) => { const selected = value.includes(service.id); return (<button key={service.id} type="button" className={`service-picker-option ${selected ? "service-picker-option-selected" : ""}`} onClick={() => toggleService(service.id)} aria-pressed={selected}> <span className="service-picker-option-main"> <span className="truncate">{service.title}</span> <small>{service.duration} мин · {formatServicePrice(service)}</small> </span> <span className="service-picker-check" aria-hidden="true"> {selected && (<Check weight="bold" aria-hidden="true"/>)} </span></button>); })} </div> <div className="service-picker-footer"> <button type="button" className="service-picker-ok" onClick={() => setOpen(false)}> Ок</button> </div> </div> </div>)} </div>); }
function ClientPicker({ className = "", clients, onSelect, valueName, valuePhone, }: {
    className?: string;
    clients: Client[];
    onSelect: (client: Client) => void;
    valueName: string;
    valuePhone: string;
}) { const [open, setOpen] = useState(false); const [query, setQuery] = useState(""); const selectedLabel = valueName.trim() || valuePhone.trim(); const normalizedQuery = query.trim().toLowerCase(); const filteredClients = normalizedQuery ? clients.filter((client) => `${client.name} ${client.phone}`.toLowerCase().includes(normalizedQuery)) : clients; const chooseClient = (client: Client) => { onSelect(client); setOpen(false); setQuery(""); }; return (<div className={`service-picker-field ${className}`}> <button type="button" className={`service-picker-trigger ${selectedLabel ? "service-picker-trigger-selected" : ""}`} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}> <span className="truncate">{selectedLabel || "Выбрать клиента из списка"}</span> <CaretDown className="h-4 w-4 shrink-0" weight="bold" aria-hidden="true"/></button> {open && (<div className="service-picker-screen service-picker-screen-open" onClick={() => setOpen(false)} role="dialog" aria-modal="true"> <div className="service-picker-sheet" onClick={(event) => event.stopPropagation()}> <div className="service-picker-header"> <div className="min-w-0"> <p>Выбрать клиента из списка</p> <span>{clients.length ? "Подставим имя и телефон в новую запись" : "Клиентов пока нет в базе"}</span> </div> <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть" title="Закрыть"> <CloseIcon /></button> </div> <div className="client-picker-search"> <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по имени или телефону"/> </div> <div className="service-picker-list"> {filteredClients.length === 0 && (<div className="service-picker-empty">{clients.length ? "Клиент не найден" : "Клиенты появятся после записей или добавления вручную"}</div>)} {filteredClients.map((client) => (<button key={client.id} type="button" className="service-picker-option" onClick={() => chooseClient(client)}> <span className="service-picker-option-main"> <span className="truncate">{client.name || "Без имени"}</span> <small>{client.phone || "Без телефона"}</small> </span> <span className="service-picker-check" aria-hidden="true"> {valueName === client.name && valuePhone === client.phone && (<Check weight="bold" aria-hidden="true"/>)} </span></button>))} </div> <div className="service-picker-footer"> <button type="button" className="service-picker-ok" onClick={() => setOpen(false)}> Ок</button> </div> </div> </div>)} </div>); }
function MobileWhatsAppBottomNav({ section, setSection, }: {
    section: Section;
    setSection: React.Dispatch<React.SetStateAction<Section>>;
}) { const items: Array<{
    section: Section;
    label: string;
    icon: IconName;
}> = [{ section: "Главная", label: "Главная", icon: "home" }, { section: "Клиенты", label: "Клиенты", icon: "clients" }, { section: "График работы", label: "График", icon: "calendar" }, { section: "Услуги", label: "Услуги", icon: "services" }, { section: "Статистика", label: "Статистика", icon: "chart" },]; return (<nav className="whatsapp-bottom-nav fixed bottom-0 left-0 right-0 z-30 md:hidden"> <div className="grid grid-cols-5 px-1.5 pb-[calc(env(safe-area-inset-bottom)+4px)] pt-1.5"> {items.map((item) => { const active = section === item.section || (item.section === "Статистика" && (section === "Аналитика" || section === "Финансы")); return (<button key={item.section} type="button" onClick={() => setSection(item.section)} className={`mobile-nav-item whatsapp-bottom-nav-item flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-tabLabel ${active ? "mobile-nav-item-active whatsapp-bottom-nav-active" : ""}`}> <span className="relative flex h-7 w-10 items-center justify-center rounded-full"> <NavIcon name={item.icon} active={active}/> </span> <span>{item.label}</span></button>); })} </div> </nav>); }
function SettingsQuickButton({ active, setSection, }: {
    active: boolean;
    setSection: React.Dispatch<React.SetStateAction<Section>>;
}) { return (<button type="button" onClick={() => setSection((current) => (current === "Настройки" ? "Главная" : "Настройки"))} className={`pattern-surface flex h-10 min-h-0 w-10 items-center justify-center rounded-full border bg-surface/95 text-textPrimary shadow-sm backdrop-blur transition hover:bg-background md:h-11 md:w-11 ${active ? "border-textPrimary bg-background" : "border-border"}`} aria-label="Открыть настройки" title="Настройки"> <NavIcon name="settings" active={active}/></button>); }
const mobileWhatsAppTabs: Array<{
    section: Section;
    label: string;
    icon: IconName;
}> = [{ section: "Главная", label: "Чаты", icon: "home" }, { section: "Клиенты", label: "Клиенты", icon: "clients" }, { section: "График работы", label: "График", icon: "calendar" }, { section: "Статистика", label: "Статистика", icon: "chart" },];
function MobileWhatsAppHeader({ appointmentsCount, clientsCount, onAddClient, onAddService, onMarkNotificationsRead, notificationsOpen, selectedDate, selectedWeekDays, section, servicesCount, setNotificationsOpen, setSelectedDate, setSection, unreadNotificationsCount, }: {
    appointmentsCount: number;
    clientsCount: number;
    onAddClient?: () => void;
    onAddService?: () => void;
    onMarkNotificationsRead: () => void;
    notificationsOpen: boolean;
    selectedDate: string;
    selectedWeekDays: Date[];
    section: Section;
    servicesCount: number;
    setNotificationsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setSelectedDate: (date: string) => void;
    setSection: React.Dispatch<React.SetStateAction<Section>>;
    unreadNotificationsCount: number;
}) { const activeTab = mobileWhatsAppTabs.find((item) => item.section === section); const headerTitle = section === "Главная" ? "Beauty Time" : section === "График работы" ? "Настройки графика" : section; if (section === "Главная" || section === "Статистика")
    return null; if (section === "Финансы") {
    return (<header className="neutral-app-header whatsapp-mobile-header sticky top-0 z-30 md:hidden" style={{ background: "var(--surface)", backgroundColor: "var(--surface)", backgroundImage: "none", color: "var(--textPrimary)" }}> <div className="px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)]"> <div className="flex items-center justify-between gap-3"> <div className="flex min-w-0 items-start gap-3"> <button type="button" onClick={() => setSection("Статистика")} className="settings-panel-back -mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full" aria-label="Назад к статистике"> <BackArrowIcon /></button> <p className="app-main-header-title whatsapp-header-title truncate text-navigationTitle">{headerTitle}</p> </div> <span className="services-header-add mobile-header-right-spacer" aria-hidden="true"/> </div> </div> </header>);
} if (section === "Настройки") {
    return (<header className="neutral-app-header whatsapp-mobile-header whatsapp-settings-mobile-header sticky top-0 z-30 md:hidden" style={{ background: "var(--surface)", backgroundColor: "var(--surface)", backgroundImage: "none", color: "var(--textPrimary)" }}> <div className="px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)]"> <div className="flex items-center justify-between gap-3"> <div className="flex min-w-0 items-start gap-3"> <button type="button" onClick={() => setSection("Главная")} className="settings-panel-back -mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full" aria-label="Назад на главную"> <BackArrowIcon /></button> <h1 className="app-main-header-title whatsapp-header-title truncate text-navigationTitle">Настройки</h1> </div> <span className="services-header-add mobile-header-right-spacer" aria-hidden="true"/> </div> </div> </header>);
} return (<header className={`neutral-app-header whatsapp-mobile-header sticky top-0 z-30 md:hidden ${section === "Страница записи" ? "booking-page-mobile-header" : ""}`} style={{ background: "var(--surface)", backgroundColor: "var(--surface)", backgroundImage: "none", color: "var(--textPrimary)" }}> <div className="px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)]"> <div className="flex items-center justify-between gap-3"> <div className="flex min-w-0 items-start gap-3"> {(section === "Страница записи" || section === "Услуги" || section === "Аналитика") && (<button type="button" onClick={() => setSection(section === "Аналитика" ? "Статистика" : "Настройки")} className="settings-panel-back -mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full" aria-label={section === "Аналитика" ? "Назад к статистике" : "Назад к настройкам"}> <BackArrowIcon /></button>)} <p className="app-main-header-title whatsapp-header-title truncate text-navigationTitle">{headerTitle}</p> </div> {(section === "Услуги" || section === "Клиенты") && (<button type="button" onClick={section === "Клиенты" ? onAddClient : onAddService} className="services-header-add" aria-label={section === "Клиенты" ? "Добавить клиента" : "Добавить услугу"} title={section === "Клиенты" ? "Добавить клиента" : "Добавить услугу"}> <Plus className="h-6 w-6" aria-hidden="true"/></button>)} {section !== "Услуги" && section !== "Клиенты" && (<span className="services-header-add mobile-header-right-spacer" aria-hidden="true"/>)} </div> </div> </header>); const stats = [{ label: "Записи", value: appointmentsCount }, { label: "Услуги", value: servicesCount }, { label: "Клиенты", value: clientsCount },]; return (<header className="neutral-app-header whatsapp-mobile-header sticky top-0 z-30 md:hidden" style={{ background: "var(--surface)", backgroundColor: "var(--surface)", backgroundImage: "none", color: "var(--textPrimary)" }}> <div className="px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)]"> <div className="flex items-center justify-between gap-3"> <div className="min-w-0"> <p className="app-main-header-title whatsapp-header-title truncate text-navigationTitle">{headerTitle}</p> <p className="truncate text-tabLabel text-surface/75">{activeTab?.label || "Кабинет"}</p> </div> <div className="flex shrink-0 items-center gap-1.5"> <button type="button" onClick={() => setSection("Страница записи")} className="whatsapp-header-icon" aria-label="Страница записи" title="Страница записи"> <NavIcon name="bookingPage"/></button> </div> </div> <div className="mt-3 flex min-h-11 items-center gap-2 rounded-full bg-surface/15 px-3 text-messageInput text-surface/85"> <MagnifyingGlass className="h-4 w-4 shrink-0" weight="bold" aria-hidden="true"/> <span className="truncate">Поиск по записям, услугам и клиентам</span> </div> <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"> {mobileWhatsAppTabs.map((item) => { const active = section === item.section; return (<button key={item.section} type="button" onClick={() => setSection(item.section)} className={`whatsapp-tab-chip ${active ? "whatsapp-tab-chip-active" : ""}`}> <NavIcon name={item.icon} active={active}/> <span>{item.label}</span></button>); })} </div> <div className="mt-2 grid grid-cols-3 gap-2"> {stats.map((item) => (<div key={item.label} className="rounded-lg bg-surface/10 px-2 py-1.5 text-surface"> <p className="text-conversationName leading-none">{item.value}</p> <p className="mt-0.5 truncate text-messageMetadata text-surface/70">{item.label}</p> </div>))} </div> </div> </header>); }
type IconName = "home" | "services" | "calendar" | "clients" | "bookingPage" | "more" | "chart" | "wallet" | "settings" | "logout";
function NavIcon({ active = false, name }: {
    active?: boolean;
    name: IconName;
}) {
    const weight = active ? "fill" : "regular";
    const props = { className: `mobile-nav-icon mobile-nav-icon-${name} h-5 w-5`, weight, "aria-hidden": true } as const;
    if (name === "home")
        return <House {...props}/>;
    if (name === "services")
        return <ListChecks {...props}/>;
    if (name === "calendar")
        return <CalendarBlank {...props}/>;
    if (name === "clients")
        return <Users {...props}/>;
    if (name === "bookingPage")
        return <Note {...props}/>;
    if (name === "more")
        return <DotsThree {...props} weight="bold"/>;
    if (name === "chart")
        return <AnalyticsColumnsNavIcon className={props.className}/>;
    if (name === "wallet")
        return <Wallet {...props}/>;
    if (name === "settings")
        return <GearSix {...props}/>;
    return <SignOut {...props}/>;
}
function AnalyticsColumnsNavIcon({ className }: {
    className: string;
}) {
    return (<svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"> <rect x="3" y="12.5" width="3.5" height="7.5" rx="1.75" fill="currentColor" opacity="0.32"/> <rect x="8.5" y="8.5" width="3.5" height="11.5" rx="1.75" fill="currentColor" opacity="0.55"/> <rect x="14" y="5" width="3.5" height="15" rx="1.75" fill="currentColor" opacity="0.78"/> <rect x="19.5" y="2.5" width="3.5" height="17.5" rx="1.75" fill="currentColor"/> </svg>);
}
function ChevronIcon({ open }: {
    open: boolean;
}) { return <CaretDown className={`h-5 w-5 transition-transform duration-300 ease-out ${open ? "rotate-180" : ""}`} weight="bold" aria-hidden="true"/>; }
function PeriodModeIcon() { return <ChartLineUp className="h-5 w-5" weight="bold" aria-hidden="true"/>; }
function ActionIcon({ name }: {
    name: "collapseCards" | "edit" | "expandCards" | "eye" | "filter" | "phone" | "plus" | "status" | "trash";
}) { const iconClass = `action-icon action-icon-${name} h-5 w-5`; const props = { className: iconClass, weight: "bold", "aria-hidden": true } as const; if (name === "collapseCards")
    return <CaretDown {...props} className={`${iconClass} rotate-180`}/>; if (name === "expandCards")
    return <CaretDown {...props}/>; if (name === "filter")
    return <FunnelSimple {...props}/>; if (name === "plus")
    return <Plus {...props}/>; if (name === "phone")
    return <Phone {...props}/>; if (name === "status")
    return <Clock {...props}/>; if (name === "eye")
    return <Eye {...props}/>; if (name === "edit")
    return <PencilSimple {...props}/>; return <Trash {...props}/>; }
function BackArrowIcon({ className = "h-5 w-5" }: {
    className?: string;
}) { return <ArrowLeft className={className} weight="light" aria-hidden="true"/>; }
function HomeSection(props: {
    activeServices: number;
    appointments: Appointment[];
    appointmentForm: typeof emptyAppointment;
    blockedTimes: BlockedTime[];
    calendarAppointments: Appointment[];
    calendarBlockedTimes: BlockedTime[];
    calendarExpanded: boolean;
    calendarWeekDate: string;
    clients: Client[];
    compactAppointments: boolean;
    deleteAppointment: (id: string) => void;
    updateAppointment: (appointment: Appointment, patch: Partial<Appointment> & {
        statusCode?: string;
    }) => Promise<void>;
    syncAppointmentClientNote: (appointment: Appointment, notes: string) => Promise<void>;
    formatSelectedDate: string;
    bookingUrl: string;
    monthDate: Date;
    monthDays: Array<Date | null>;
    onEditSelectedWorkHours: () => void;
    onToggleNotifications: () => void;
    selectedDate: string;
    selectedDateWorkSchedule: DaySchedule;
    selectedWeekDays: Date[];
    services: Service[];
    setSection: React.Dispatch<React.SetStateAction<Section>>;
    setStoryCreatorOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setAppointmentForm: React.Dispatch<React.SetStateAction<typeof emptyAppointment>>;
    setCalendarExpanded: React.Dispatch<React.SetStateAction<boolean>>;
    setCompactAppointments: React.Dispatch<React.SetStateAction<boolean>>;
    setSelectedDate: (date: string) => void;
    setShowAppointmentForm: React.Dispatch<React.SetStateAction<boolean>>;
    showAppointmentForm: boolean;
    showFilters: boolean;
    showToast: (message: string) => void;
    storyCreatorOpen: boolean;
    storyDateLabel: string;
    todayFreeSlots: FreeSlot[];
    timeSlots: string[];
    addAppointment: (event: React.FormEvent) => void;
    changeWeek: (direction: -1 | 1) => void;
    changeMonth: (direction: -1 | 1) => void;
    selectToday: () => void;
    setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
    unreadNotificationsCount: number;
}) { const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null); const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null); const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false); const [rescheduleDraft, setRescheduleDraft] = useState({ date: "", time: "" }); const [noteModalOpen, setNoteModalOpen] = useState(false); const [noteDraft, setNoteDraft] = useState(""); const [expandedCompactAppointmentId, setExpandedCompactAppointmentId] = useState<string | null>(null); const openSettings = () => props.setSection("Настройки"); const calendarSwipeStart = useRef<{
    captured: boolean;
    x: number;
    y: number;
    time: number;
    pointerId?: number;
} | null>(null); const calendarWeekTrackRef = useRef<HTMLDivElement | null>(null); const calendarMonthTrackRef = useRef<HTMLDivElement | null>(null); const calendarDragFrame = useRef<number | null>(null); const calendarPendingDelta = useRef(0); const calendarCommitTimer = useRef<number | null>(null); const calendarCommitInProgress = useRef(false); const calendarSwipeSuppressClickUntil = useRef(0); const [calendarWeekRoll, setCalendarWeekRoll] = useState<{
    direction: -1 | 1;
    nonce: number;
} | null>(null); const [calendarMonthRoll, setCalendarMonthRoll] = useState<{
    direction: -1 | 1;
    nonce: number;
} | null>(null); const [statusNow, setStatusNow] = useState(() => Date.now()); const [appointmentDrag, setAppointmentDrag] = useState<{
    active: boolean;
    id: string;
    settling: boolean;
    scale: number;
    x: number;
} | null>(null); const appointmentDragStartRef = useRef<{
    id: string;
    moved: boolean;
    pointerId: number;
    startX: number;
    startY: number;
} | null>(null); const appointmentDragResetRef = useRef<number | null>(null); const appointmentDragSuppressClickRef = useRef<string | null>(null); const todayKey = formatDateKey(new Date()); const todayDate = parseDateKey(todayKey); const awayFromToday = props.selectedDate !== todayKey; const awayFromCurrentMonth = props.monthDate.getFullYear() !== todayDate.getFullYear() || props.monthDate.getMonth() !== todayDate.getMonth(); const currentWeekStartKey = formatDateKey(getSelectedWeekDays(new Date())[0]); const visibleWeekStartKey = formatDateKey(getSelectedWeekDays(parseDateKey(props.calendarWeekDate))[0]); const awayFromCurrentWeek = visibleWeekStartKey !== currentWeekStartKey; const showTodayAction = awayFromToday || awayFromCurrentWeek || awayFromCurrentMonth; const selectedWorkMinutes = getScheduleWorkMinutes(props.selectedDateWorkSchedule); const selectedWorkScheduleLabel = formatWorkScheduleLabel(props.selectedDateWorkSchedule); const visibleCalendarAppointments = useMemo(() => props.calendarAppointments.filter((item) => !isArchivedAppointment(item)), [props.calendarAppointments]); const nextAppointment = useMemo(() => { const now = new Date(statusNow); return [...visibleCalendarAppointments].filter((appointment) => { const startDate = parseDateKey(appointment.date); const startMinutes = timeToMinutes(appointment.time); if (!Number.isFinite(startMinutes))
    return false; startDate.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0); return startDate.getTime() >= now.getTime(); }).sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`))[0]; }, [statusNow, visibleCalendarAppointments]); const totalBookedMinutes = useMemo(() => props.appointments.filter(isLoadBearingAppointment).reduce((total, appointment) => total + getAppointmentDuration(appointment, props.services), 0), [props.appointments, props.services]); const selectedDateRevenue = useMemo(() => props.appointments.reduce((sum, appointment) => sum + getAppointmentPrice(appointment, props.services), 0), [props.appointments, props.services]); const dayLoad = getAppointmentLoadPercent(props.appointments, props.services, selectedWorkMinutes); const selectedAppointment = useMemo(() => (selectedAppointmentId ? props.calendarAppointments.find((item) => item.id === selectedAppointmentId) || props.appointments.find((item) => item.id === selectedAppointmentId) || null : null), [props.appointments, props.calendarAppointments, selectedAppointmentId]); const selectedAppointmentServices = useMemo(() => (selectedAppointment ? getAppointmentServices(selectedAppointment, props.services) : []), [props.services, selectedAppointment]); const selectedAppointmentDuration = selectedAppointment ? getAppointmentDuration(selectedAppointment, props.services) : 0; const selectedAppointmentPrice = selectedAppointment ? getAppointmentPrice(selectedAppointment, props.services) : 0; const selectedAppointmentServiceTitle = selectedAppointment ? getAppointmentServiceTitle(selectedAppointment, props.services) : ""; const selectedAppointmentDateLabel = selectedAppointment ? formatLongDate(parseDateKey(selectedAppointment.date)) : ""; const selectedAppointmentNoShow = selectedAppointment ? isNoShowAppointment(selectedAppointment) : false; const selectedAppointmentTimelineStatus = selectedAppointment ? getAppointmentTimelineStatus(selectedAppointment, selectedAppointmentDuration || 60, statusNow) : "future"; const selectedAppointmentBadgeStatus = selectedAppointmentNoShow ? selectedAppointment?.status || "" : selectedAppointmentTimelineStatus === "past" ? "done" : selectedAppointment?.status || ""; const selectedAppointmentBadgeLabel = selectedAppointmentTimelineStatus === "past" && !selectedAppointmentNoShow ? "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0430" : undefined; const selectedAppointmentCallHref = selectedAppointment ? getCallHref(selectedAppointment.phone) : ""; const selectedAppointmentMessageHref = selectedAppointment ? getMessageHref(selectedAppointment.phone) : ""; const selectedAppointmentPreparedMessage = selectedAppointment ? getPreparedMessageText(selectedAppointment.client) : ""; const selectedAppointmentWhatsAppHref = selectedAppointment ? getWhatsAppHref(selectedAppointment.phone, selectedAppointmentPreparedMessage) : ""; const selectedAppointmentTelegramHref = selectedAppointment ? getTelegramHref(selectedAppointment.phone, selectedAppointmentPreparedMessage) : ""; const selectedAppointmentMaxHref = selectedAppointment ? getMaxShareHref(selectedAppointmentPreparedMessage) : ""; const selectedAppointmentClient = useMemo(() => { if (!selectedAppointment)
    return null; const normalizedPhone = selectedAppointment.phone.replace(/\D/g, ""); const normalizedName = selectedAppointment.client.trim().toLowerCase(); return (props.clients.find((client) => { const clientPhone = client.phone.replace(/\D/g, ""); if (normalizedPhone)
    return clientPhone === normalizedPhone; return normalizedName ? client.name.trim().toLowerCase() === normalizedName : false; }) || null); }, [props.clients, selectedAppointment]); const selectedAppointmentVisibleNotes = (selectedAppointmentClient ? selectedAppointmentClient.notes : selectedAppointment?.notes || "").trim(); const selectedAppointmentClientHistory = useMemo(() => { if (!selectedAppointment)
    return []; const normalizedPhone = selectedAppointment.phone.replace(/\D/g, ""); const normalizedName = selectedAppointment.client.trim().toLowerCase(); return props.calendarAppointments.filter((appointment) => { const phone = appointment.phone.replace(/\D/g, ""); if (normalizedPhone)
    return phone === normalizedPhone; return normalizedName ? appointment.client.trim().toLowerCase() === normalizedName : false; }).sort((left, right) => `${right.date} ${right.time}`.localeCompare(`${left.date} ${left.time}`)).slice(0, 6); }, [props.calendarAppointments, selectedAppointment]); const selectedAppointmentClientTotalSpent = selectedAppointmentClient ? selectedAppointmentClient.totalSpent : selectedAppointmentClientHistory.reduce((sum, appointment) => sum + getAppointmentPrice(appointment, props.services), 0); const appointmentCountByDate = useMemo(() => { return visibleCalendarAppointments.reduce<Record<string, number>>((counts, item) => { counts[item.date] = (counts[item.date] || 0) + 1; return counts; }, {}); }, [visibleCalendarAppointments]); const eventCountByDate = useMemo(() => { return props.calendarBlockedTimes.reduce<Record<string, number>>((counts, item) => { counts[item.date] = (counts[item.date] || 0) + 1; return counts; }, {}); }, [props.calendarBlockedTimes]); useEffect(() => { const openAppointmentFromNotification = (event: Event) => { const detail = (event as CustomEvent<{ id?: string; date?: string }>).detail; if (!detail?.id) return; if (detail.date) props.setSelectedDate(detail.date); setSelectedAppointmentId(detail.id); }; window.addEventListener("dashboard-open-appointment", openAppointmentFromNotification); return () => window.removeEventListener("dashboard-open-appointment", openAppointmentFromNotification); }, [props.setSelectedDate]); useEffect(() => { if (!props.compactAppointments)
    setExpandedCompactAppointmentId(null); }, [props.compactAppointments]); useEffect(() => { if (selectedAppointmentId && !selectedAppointment)
    setSelectedAppointmentId(null); }, [selectedAppointment, selectedAppointmentId]); useEffect(() => { if (!selectedAppointment) {
    setRescheduleModalOpen(false);
    setNoteModalOpen(false);
    return;
} if (!rescheduleModalOpen) {
    setRescheduleDraft({ date: selectedAppointment.date, time: selectedAppointment.time });
} }, [rescheduleModalOpen, selectedAppointment]); useEffect(() => { if (!selectedAppointment)
    return; if (!noteModalOpen)
    setNoteDraft(""); }, [noteModalOpen, selectedAppointment]); useEffect(() => { const interval = window.setInterval(() => setStatusNow(Date.now()), 30000); return () => window.clearInterval(interval); }, []); useEffect(() => { return () => { if (appointmentDragResetRef.current !== null)
    window.clearTimeout(appointmentDragResetRef.current); if (calendarCommitTimer.current !== null)
    window.clearTimeout(calendarCommitTimer.current); if (calendarDragFrame.current !== null)
    window.cancelAnimationFrame(calendarDragFrame.current); }; }, []); const startAppointmentDrag = (event: PointerEvent<HTMLElement>, id: string) => { if (event.button !== 0 && event.pointerType === "mouse")
    return; const target = event.target as HTMLElement; const interactiveTarget = target.closest("button,a,input,select,textarea"); if (interactiveTarget && interactiveTarget !== event.currentTarget)
    return; if (appointmentDragResetRef.current !== null)
    window.clearTimeout(appointmentDragResetRef.current); appointmentDragStartRef.current = { id, moved: false, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, }; event.currentTarget.setPointerCapture(event.pointerId); setAppointmentDrag({ active: true, id, settling: false, scale: 1, x: 0 }); }; const moveAppointmentDrag = (event: PointerEvent<HTMLElement>) => { const dragStart = appointmentDragStartRef.current; if (!dragStart || dragStart.pointerId !== event.pointerId)
    return; const deltaX = event.clientX - dragStart.startX; const deltaY = event.clientY - dragStart.startY; if (Math.abs(deltaY) > Math.abs(deltaX) && !dragStart.moved)
    return; if (deltaX <= 0) {
    setAppointmentDrag({ active: true, id: dragStart.id, settling: false, scale: 1, x: 0 });
    return;
} const distance = Math.abs(deltaX); const rubberDistance = Math.min(92, Math.pow(distance, 0.82) * 1.45); const x = rubberDistance; const scale = 1 + Math.min(distance / 1800, 0.045); if (distance > 4)
    dragStart.moved = true; if (dragStart.moved)
    event.preventDefault(); setAppointmentDrag({ active: true, id: dragStart.id, settling: false, scale, x }); }; const finishAppointmentDrag = (event: PointerEvent<HTMLElement>) => { const dragStart = appointmentDragStartRef.current; if (!dragStart || dragStart.pointerId !== event.pointerId)
    return; if (dragStart.moved)
    appointmentDragSuppressClickRef.current = dragStart.id; appointmentDragStartRef.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId))
    event.currentTarget.releasePointerCapture(event.pointerId); setAppointmentDrag((current) => (current?.id === dragStart.id ? { ...current, active: false, settling: true, scale: 1, x: 0 } : current)); appointmentDragResetRef.current = window.setTimeout(() => { setAppointmentDrag((current) => (current?.id === dragStart.id && current.settling ? null : current)); }, 560); }; const cancelAppointmentDrag = (event: PointerEvent<HTMLElement>) => { const dragStart = appointmentDragStartRef.current; if (!dragStart || dragStart.pointerId !== event.pointerId)
    return; appointmentDragStartRef.current = null; setAppointmentDrag((current) => (current?.id === dragStart.id ? { ...current, active: false, settling: true, scale: 1, x: 0 } : current)); }; const captureAppointmentClick = (event: React.MouseEvent<HTMLElement>, id: string) => { if (appointmentDragSuppressClickRef.current !== id)
    return; appointmentDragSuppressClickRef.current = null; event.preventDefault(); event.stopPropagation(); }; const getAppointmentDragProps = (id: string) => { const drag = appointmentDrag?.id === id ? appointmentDrag : null; return { className: `${drag?.active ? "appointment-card-dragging" : ""} ${drag?.settling ? "appointment-card-settling" : ""} ${drag && drag.x > 8 ? "appointment-card-reveal-image" : ""}`, onClickCapture: (event: React.MouseEvent<HTMLElement>) => captureAppointmentClick(event, id), onPointerCancel: cancelAppointmentDrag, onPointerDown: (event: PointerEvent<HTMLElement>) => startAppointmentDrag(event, id), onPointerMove: moveAppointmentDrag, onPointerUp: finishAppointmentDrag, style: { "--appointment-drag-scale": drag ? drag.scale.toFixed(3) : "1", "--appointment-drag-x": `${drag?.x || 0}px`, transformOrigin: drag?.x ? (drag.x < 0 ? "right center" : "left center") : "center", } as CSSProperties, }; }; const openRescheduleModal = () => { if (!selectedAppointment)
    return; setRescheduleDraft({ date: selectedAppointment.date, time: selectedAppointment.time }); setRescheduleModalOpen(true); }; const saveRescheduledAppointment = async () => { if (!selectedAppointment || !rescheduleDraft.date || !rescheduleDraft.time)
    return; await props.updateAppointment(selectedAppointment, { date: rescheduleDraft.date, time: rescheduleDraft.time }); setRescheduleModalOpen(false); }; const markSelectedAppointmentNoShow = async () => { if (!selectedAppointment)
    return; if (selectedAppointmentNoShow) {
    await props.updateAppointment(selectedAppointment, { status: "Активна", statusCode: "active", archived: false });
    return;
} await props.updateAppointment(selectedAppointment, { status: "Не пришёл", statusCode: "no_show", archived: false }); }; const openAppointmentNoteModal = () => { if (!selectedAppointment)
    return; setNoteDraft(""); setNoteModalOpen(true); }; const saveAppointmentNote = async () => { if (!selectedAppointment)
    return; const notes = noteDraft.trim(); if (!notes) {
    setNoteModalOpen(false);
    return;
} await props.updateAppointment(selectedAppointment, { notes: appendNoteText(selectedAppointmentVisibleNotes, notes) }); await props.syncAppointmentClientNote(selectedAppointment, notes); setNoteModalOpen(false); }; const getActiveCalendarTrack = () => props.calendarExpanded ? calendarMonthTrackRef.current : calendarWeekTrackRef.current; const setCalendarTrackDrag = (deltaX: number, transition = false) => { const track = getActiveCalendarTrack(); if (!track)
    return; const width = Math.max(1, track.getBoundingClientRect().width || window.innerWidth); const offset = Math.max(-width, Math.min(width, deltaX)); track.style.setProperty("--calendar-track-offset", `${offset}px`); track.style.setProperty("--calendar-track-transition", transition ? "transform .24s cubic-bezier(.22, 1, .36, 1)" : "none"); }; const requestCalendarSwipeFrame = (deltaX: number) => { calendarPendingDelta.current = deltaX; if (calendarDragFrame.current !== null)
    return; calendarDragFrame.current = window.requestAnimationFrame(() => { calendarDragFrame.current = null; setCalendarTrackDrag(calendarPendingDelta.current); }); }; const resetCalendarTrackMotion = (transition = true) => { if (calendarDragFrame.current !== null) {
    window.cancelAnimationFrame(calendarDragFrame.current);
    calendarDragFrame.current = null;
} calendarCommitInProgress.current = false; [calendarWeekTrackRef.current, calendarMonthTrackRef.current].forEach((track) => { if (!track)
    return; track.style.setProperty("--calendar-track-offset", "0px"); track.style.setProperty("--calendar-track-transition", transition ? "transform .22s ease" : "none"); }); }; useEffect(() => { calendarSwipeStart.current = null; resetCalendarTrackMotion(false); }, [props.calendarExpanded]); const commitCalendarSwipe = (direction: -1 | 1) => { const track = getActiveCalendarTrack(); if (!track) {
    props.calendarExpanded ? props.changeMonth(direction) : props.changeWeek(direction);
    return;
} if (calendarCommitInProgress.current)
    return; calendarCommitInProgress.current = true; if (calendarDragFrame.current !== null) {
    window.cancelAnimationFrame(calendarDragFrame.current);
    calendarDragFrame.current = null;
} const width = Math.max(1, track.getBoundingClientRect().width || window.innerWidth); const finishCommit = () => { if (calendarCommitTimer.current !== null)
    window.clearTimeout(calendarCommitTimer.current); calendarCommitTimer.current = null; track.removeEventListener("transitionend", handleTransitionEnd); props.calendarExpanded ? props.changeMonth(direction) : props.changeWeek(direction); resetCalendarTrackMotion(false); }; const handleTransitionEnd = (event: TransitionEvent) => { if (event.propertyName === "transform")
    finishCommit(); }; track.addEventListener("transitionend", handleTransitionEnd); track.style.setProperty("--calendar-track-offset", `${direction > 0 ? -width : width}px`); track.style.setProperty("--calendar-track-transition", "transform .24s cubic-bezier(.22, 1, .36, 1)"); if (calendarCommitTimer.current !== null)
    window.clearTimeout(calendarCommitTimer.current); calendarCommitTimer.current = window.setTimeout(finishCommit, 320); }; const finishCalendarSwipe = (clientX: number, clientY: number) => { const start = calendarSwipeStart.current; calendarSwipeStart.current = null; if (!start)
    return false; if (calendarCommitInProgress.current)
    return true; const deltaX = clientX - start.x; const deltaY = clientY - start.y; const elapsed = Math.max(1, Date.now() - start.time); const velocity = Math.abs(deltaX) / elapsed; const horizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.02; if (horizontal && (Math.abs(deltaX) >= 34 || (Math.abs(deltaX) >= 18 && velocity > 0.45))) {
    calendarSwipeSuppressClickUntil.current = Date.now() + 450;
    commitCalendarSwipe(deltaX < 0 ? 1 : -1);
    return true;
} if (!horizontal && Math.abs(deltaY) > 42)
    props.setCalendarExpanded(deltaY > 0); resetCalendarTrackMotion(true); return start.captured; }; const handleCalendarTouchStart = (event: TouchEvent<HTMLDivElement>) => { const touch = event.touches[0]; if (!touch)
    return; if (calendarCommitInProgress.current)
    return; calendarSwipeStart.current = { captured: false, x: touch.clientX, y: touch.clientY, time: Date.now() }; }; const handleCalendarTouchMove = (event: TouchEvent<HTMLDivElement>) => { const start = calendarSwipeStart.current; const touch = event.touches[0]; if (!start || !touch || calendarCommitInProgress.current)
    return; const deltaX = touch.clientX - start.x; const deltaY = touch.clientY - start.y; if (Math.abs(deltaX) < 3 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.04)
    return; start.captured = true; requestCalendarSwipeFrame(deltaX); event.preventDefault(); event.stopPropagation(); }; const handleCalendarTouchEnd = (event: TouchEvent<HTMLDivElement>) => { const touch = event.changedTouches[0]; if (!touch)
    return; const captured = finishCalendarSwipe(touch.clientX, touch.clientY); if (captured)
    event.stopPropagation(); }; const handleCalendarPointerDown = (event: PointerEvent<HTMLDivElement>) => { if (event.pointerType === "touch")
    return; if (calendarCommitInProgress.current)
    return; if (event.pointerType === "mouse" && event.button !== 0)
    return; calendarSwipeStart.current = { captured: false, x: event.clientX, y: event.clientY, pointerId: event.pointerId, time: Date.now() }; event.currentTarget.setPointerCapture(event.pointerId); }; const handleCalendarPointerMove = (event: PointerEvent<HTMLDivElement>) => { if (event.pointerType === "touch")
    return; const start = calendarSwipeStart.current; if (!start || start.pointerId !== event.pointerId || calendarCommitInProgress.current)
    return; const deltaX = event.clientX - start.x; const deltaY = event.clientY - start.y; if (Math.abs(deltaX) < 3 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.04)
    return; start.captured = true; requestCalendarSwipeFrame(deltaX); event.preventDefault(); event.stopPropagation(); }; const handleCalendarPointerUp = (event: PointerEvent<HTMLDivElement>) => { if (event.pointerType === "touch")
    return; const start = calendarSwipeStart.current; if (!start || start.pointerId !== event.pointerId)
    return; if (event.currentTarget.hasPointerCapture(event.pointerId))
    event.currentTarget.releasePointerCapture(event.pointerId); const captured = finishCalendarSwipe(event.clientX, event.clientY); if (captured)
    event.stopPropagation(); }; const handleCalendarPointerCancel = (event: PointerEvent<HTMLDivElement>) => { if (event.pointerType === "touch")
    return; if (event.currentTarget.hasPointerCapture(event.pointerId))
    event.currentTarget.releasePointerCapture(event.pointerId); calendarSwipeStart.current = null; resetCalendarTrackMotion(true); }; const handleCalendarClickCapture = (event: MouseEvent<HTMLDivElement>) => { if (Date.now() > calendarSwipeSuppressClickUntil.current)
    return; event.preventDefault(); event.stopPropagation(); }; const startCalendarWeekRoll = (direction: -1 | 1) => { if (calendarWeekRoll)
    return; setCalendarWeekRoll({ direction, nonce: Date.now() }); commitCalendarSwipe(direction); window.setTimeout(() => setCalendarWeekRoll(null), 320); }; const startCalendarMonthRoll = (direction: -1 | 1) => { if (calendarMonthRoll)
    return; setCalendarMonthRoll({ direction, nonce: Date.now() }); commitCalendarSwipe(direction); window.setTimeout(() => setCalendarMonthRoll(null), 320); }; const renderCalendarDay = (day: Date, mode: "week" | "month" = "month") => { const dateKey = formatDateKey(day); const selected = props.selectedDate === dateKey; const today = todayKey === dateKey; const appointmentCount = appointmentCountByDate[dateKey] || 0; const eventCount = eventCountByDate[dateKey] || 0; const hasActivity = appointmentCount > 0 || eventCount > 0; return (<button key={dateKey} type="button" onClick={() => props.setSelectedDate(dateKey)} className={`calendar-day group relative flex w-full min-w-0 max-w-full flex-col items-center justify-center overflow-hidden rounded-lg text-center transition duration-200 ease-out md:rounded-xl ${mode === "week" ? "h-14" : "aspect-square"} ${selected ? "calendar-day-selected bg-surface text-primary" : today ? "calendar-day-today bg-surface text-primary hover:bg-primarySurface" : "bg-surface text-textPrimary hover:bg-primarySurface"}`} aria-label={`${day.getDate()} ${formatMonth(day)}${appointmentCount ? `, записей: ${appointmentCount}` : ""}${eventCount ? `, событий: ${eventCount}` : ""}`}> {mode === "week" && (<span className={`mb-1 text-tabLabel ${selected ? "text-primary" : "text-textSecondary"}`}> {weekDays[(day.getDay() + 6) % 7]} </span>)} <span className="text-dateChip">{day.getDate()}</span> <span className="mt-1.5 flex h-px items-center justify-center gap-1"> {appointmentCount > 0 && (<span className={`h-px rounded-full bg-primary ${appointmentCount > 1 ? "w-4" : "w-2"}`} aria-hidden="true"/>)} {eventCount > 0 && (<span className={`h-px rounded-full bg-textDisabled ${eventCount > 1 ? "w-3" : "w-2"}`} aria-hidden="true"/>)} </span> {hasActivity && mode === "month" && (<span className={`mt-0.5 text-messageMetadata ${selected ? "text-surface/85" : "text-textSecondary"}`}> {appointmentCount + eventCount} </span>)}</button>); }; const renderCalendarMonthPage = (monthDate: Date, pageKey: string) => (<div key={pageKey} className="calendar-week-page calendar-month-page grid grid-cols-7 gap-1 p-2 md:gap-2 md:p-3"> {weekDays.map((day) => (<span key={day} className="py-1 text-center text-sectionLabel text-textSecondary"> {day} </span>))} {getMonthDays(monthDate).map((day, index) => (day ? renderCalendarDay(day) : <span key={`empty-${pageKey}-${index}`} className="aspect-square rounded-xl"/>))} </div>); return (<div className="home-dashboard space-y-4 md:space-y-5"> {selectedAppointment && (<div className="appointment-detail-modal fixed inset-0 z-[75]" role="dialog" aria-modal="true"> <button type="button" className="appointment-detail-backdrop absolute inset-0" onClick={() => setSelectedAppointmentId(null)} aria-label="Закрыть информацию о записи"/> {rescheduleModalOpen && (<div className="appointment-reschedule-modal absolute inset-0 z-[3]" role="dialog" aria-modal="true"> <button type="button" className="appointment-reschedule-backdrop absolute inset-0" onClick={() => setRescheduleModalOpen(false)} aria-label="Закрыть перенос записи"/> <section className="appointment-reschedule-panel relative" onClick={(event) => event.stopPropagation()}> <div className="appointment-reschedule-topbar"> <button type="button" className="appointment-detail-icon-button" onClick={() => setRescheduleModalOpen(false)} aria-label="Назад" title="Назад"> <ArrowLeft className="h-5 w-5" weight="light" aria-hidden="true"/></button> <h3>Перенести запись</h3> <button type="button" className="appointment-detail-icon-button" onClick={() => setRescheduleModalOpen(false)} aria-label="Закрыть" title="Закрыть"> <X className="h-5 w-5" aria-hidden="true"/></button> </div> <div className="appointment-reschedule-content"> <div className="appointment-reschedule-summary"> <span>Сейчас</span> <strong>{selectedAppointmentDateLabel} · {selectedAppointment.time}</strong> <p>{selectedAppointment.client} · {selectedAppointmentServiceTitle}</p> </div> <label className="appointment-reschedule-date"> <span>Новая дата</span> <input type="date" value={rescheduleDraft.date} onChange={(event) => setRescheduleDraft((current) => ({ ...current, date: event.target.value }))}/> </label> <TimeWheelPicker className="appointment-reschedule-time" label="Новое время" value={rescheduleDraft.time || selectedAppointment.time} onChange={(time) => setRescheduleDraft((current) => ({ ...current, time }))}/> <div className="appointment-reschedule-actions"> <button type="button" onClick={() => void saveRescheduledAppointment()} disabled={!rescheduleDraft.date || !rescheduleDraft.time}> Сохранить перенос</button> <button type="button" onClick={() => setRescheduleModalOpen(false)}> Отмена</button> </div> </div> </section> </div>)} {noteModalOpen && (<div className="appointment-note-modal absolute inset-0 z-[3]" role="dialog" aria-modal="true"> <button type="button" className="appointment-reschedule-backdrop absolute inset-0" onClick={() => setNoteModalOpen(false)} aria-label="Закрыть заметки"/> <section className="appointment-note-panel relative" onClick={(event) => event.stopPropagation()}> <div className="appointment-reschedule-topbar"> <button type="button" className="appointment-detail-icon-button" onClick={() => setNoteModalOpen(false)} aria-label="Назад" title="Назад"> <ArrowLeft className="h-5 w-5" weight="light" aria-hidden="true"/></button> <h3>Заметки</h3> <button type="button" className="appointment-detail-icon-button" onClick={() => setNoteModalOpen(false)} aria-label="Закрыть" title="Закрыть"> <X className="h-5 w-5" aria-hidden="true"/></button> </div> <div className="appointment-note-content"> <label className="appointment-note-field"> <span>Заметка к записи и клиенту</span> <textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Например: предпочитает утро, чувствительная кожа, не любит звонки"/> </label> <div className="appointment-reschedule-actions"> <button type="button" onClick={() => void saveAppointmentNote()}> Сохранить заметку</button> <button type="button" onClick={() => setNoteModalOpen(false)}> Отмена</button> </div> </div> </section> </div>)} <section className="appointment-detail-panel relative w-full" onClick={(event) => event.stopPropagation()}> <div className="appointment-detail-topbar"> <button type="button" className="appointment-detail-icon-button" onClick={() => setSelectedAppointmentId(null)} aria-label="Назад" title="Назад"> <ArrowLeft className="h-5 w-5" weight="light" aria-hidden="true"/></button> <h2 className="truncate">Запись</h2> <button type="button" className="appointment-detail-icon-button" onClick={() => setSelectedAppointmentId(null)} aria-label="Закрыть" title="Закрыть"> <X className="h-5 w-5" aria-hidden="true"/></button> </div> <div className="appointment-detail-content"> <section className="appointment-detail-hero"> <div className="appointment-detail-time"> <span>{selectedAppointmentDateLabel}</span> <strong>{selectedAppointment.time}</strong> </div> <StatusBadge className="appointment-detail-status" label={selectedAppointmentBadgeLabel} status={selectedAppointmentBadgeStatus}/> </section> <section className="appointment-detail-card appointment-detail-client-card"> <User weight="bold" aria-hidden="true"/> <div className="appointment-detail-client-info"> <span>Клиент</span> <strong>{selectedAppointment.client || "Без имени"}</strong> <p>{selectedAppointment.phone || "Телефон не указан"}</p> </div> {(selectedAppointmentCallHref || selectedAppointmentMessageHref) && (<div className="appointment-detail-contact-actions"> {selectedAppointmentMessageHref && (<details className="appointment-detail-message-menu"> <summary className="appointment-detail-contact-button appointment-detail-message-button" aria-label={`Написать клиенту ${selectedAppointment.client || selectedAppointment.phone}`} title="Написать"> <ChatText weight="bold" aria-hidden="true"/> <span>Написать</span> </summary> <div className="appointment-detail-message-options"> <a href={selectedAppointmentMessageHref}>SMS</a> {selectedAppointmentWhatsAppHref && <a href={selectedAppointmentWhatsAppHref}>WhatsApp</a>} <a href={selectedAppointmentTelegramHref}>Telegram</a> <a href={selectedAppointmentMaxHref}>MAX</a> </div> </details>)} {selectedAppointmentCallHref && (<a className="appointment-detail-contact-button" href={selectedAppointmentCallHref} aria-label={`Позвонить клиенту ${selectedAppointment.client || selectedAppointment.phone}`} title="Позвонить"> <Phone weight="bold" aria-hidden="true"/> <span>Позвонить</span> </a>)} </div>)} </section> <section className="appointment-detail-card"> <ListChecks weight="bold" aria-hidden="true"/> <div> <span>{selectedAppointmentServices.length > 1 ? "Услуги" : "Услуга"}</span> <strong>{selectedAppointmentServices.length ? selectedAppointmentServiceTitle : "Услуга удалена"}</strong> {selectedAppointmentServices.length > 1 && (<ul> {selectedAppointmentServices.map((service) => (<li key={service.id}>{service.title}</li>))} </ul>)} </div> </section> <section className="appointment-detail-grid"> <div> <Clock weight="bold" aria-hidden="true"/> <span>Длительность</span> <strong>{selectedAppointmentDuration || 60} мин</strong> </div> <div> <CurrencyRub weight="bold" aria-hidden="true"/> <span>Стоимость</span> <strong>{selectedAppointmentPrice.toLocaleString("ru-RU")} ₽</strong> </div> </section> {selectedAppointmentVisibleNotes && (<section className="appointment-detail-card"> <Note weight="bold" aria-hidden="true"/> <div> <span>Заметка</span> <p>{selectedAppointmentVisibleNotes}</p> </div> </section>)} <div className="appointment-detail-actions"> <button type="button" className="appointment-detail-reschedule" onClick={openRescheduleModal}> <CalendarBlank weight="bold" aria-hidden="true"/> Перенести запись</button> <button type="button" className="appointment-detail-note-action" onClick={openAppointmentNoteModal}> <Note weight="bold" aria-hidden="true"/> Заметки</button> <button type="button" className="appointment-detail-no-show" onClick={() => void markSelectedAppointmentNoShow()}> {selectedAppointmentNoShow ? <Check weight="bold" aria-hidden="true"/> : <XCircle weight="bold" aria-hidden="true"/>} {selectedAppointmentNoShow ? "Пришёл" : "Не пришёл"}</button> <button type="button" className="appointment-detail-delete" onClick={() => { props.deleteAppointment(selectedAppointment.id); setSelectedAppointmentId(null); setDeleteTarget(null); }}> <Trash weight="bold" aria-hidden="true"/> Удалить запись</button> <div className="appointment-detail-total-row"> <span>Общая сумма</span> <strong>{selectedAppointmentClientTotalSpent.toLocaleString("ru-RU")} ₽</strong> </div> </div> <section className="appointment-detail-history"> <div className="appointment-detail-section-title"> <h3>История посещений</h3> <span>{selectedAppointmentClientHistory.length}</span> </div> {selectedAppointmentClientHistory.length === 0 ? (<p className="appointment-detail-empty">История появится после первой записи клиента.</p>) : (<div className="appointment-detail-history-list"> {selectedAppointmentClientHistory.map((appointment) => { const price = getAppointmentPrice(appointment, props.services); const duration = getAppointmentDuration(appointment, props.services); const serviceTitle = getAppointmentServiceTitle(appointment, props.services); const current = appointment.id === selectedAppointment.id; const noShow = isNoShowAppointment(appointment); return (<article key={appointment.id} className="appointment-detail-history-item"> <div> <strong>{formatLongDate(parseDateKey(appointment.date))}</strong> <p>{appointment.time} · {serviceTitle}</p> </div> <span> {duration} мин · {noShow ? <b className="appointment-detail-history-no-show">не пришёл</b> : `${price.toLocaleString("ru-RU")} ₽`}{current ? " · текущая" : ""} </span> </article>); })} </div>)} </section> </div> </section> </div>)} <section className="home-hero home-hero-actions-only overflow-hidden rounded-[24px] px-4 py-2 transition-all duration-200 md:px-5 md:py-3"> <div className="flex items-center justify-between gap-3"> <span className="min-w-0 truncate text-navigationTitle text-textPrimary">Beauty Time</span> <div className="flex shrink-0 gap-1.5"> <button type="button" onClick={() => props.setStoryCreatorOpen((current) => !current)} className={`home-header-action relative flex h-10 w-10 items-center justify-center rounded-xl bg-background text-textPrimary transition hover:bg-background ${props.storyCreatorOpen ? "ring-2 ring-inset ring-primary" : ""}`} aria-label="Окна на сегодня" title="Окна на сегодня"> <StoryIcon /></button> <button type="button" onClick={props.onToggleNotifications} className="home-header-action relative flex h-10 w-10 items-center justify-center rounded-xl bg-background text-textPrimary transition hover:bg-background" aria-label="Уведомления" title="Уведомления"> <BellIcon /> {props.unreadNotificationsCount > 0 && (<span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-badge text-surface"> {props.unreadNotificationsCount > 9 ? "9+" : props.unreadNotificationsCount} </span>)}</button> <button type="button" onClick={openSettings} className="home-header-action relative flex h-10 w-10 items-center justify-center rounded-xl bg-background text-textPrimary transition hover:bg-background" aria-label="Настройки" title="Настройки"> <NavIcon name="settings"/></button> </div> </div> </section> <section className="home-calendar-shell saas-card overflow-hidden rounded-2xl bg-surface p-3 md:p-4" data-dashboard-swipe-ignore="true" onClickCapture={handleCalendarClickCapture} onPointerCancel={handleCalendarPointerCancel} onPointerDown={handleCalendarPointerDown} onPointerMove={handleCalendarPointerMove} onPointerUp={handleCalendarPointerUp} onTouchCancel={() => { calendarSwipeStart.current = null; resetCalendarTrackMotion(true); }} onTouchEnd={handleCalendarTouchEnd} onTouchMove={handleCalendarTouchMove} onTouchStart={handleCalendarTouchStart}> <div className="hidden"> {showTodayAction && (<button type="button" onClick={props.selectToday} className="h-9 min-h-0 shrink-0 rounded-lg bg-primarySurface px-3 text-buttonLabel text-primary hover:bg-primarySurface/80 md:h-10 md:px-4"> Сегодня</button>)} </div> <div className="calendar-header flex items-center justify-between gap-2"> <div className="calendar-header-title calendar-header-title-inline min-w-0"> <p className="text-sectionLabel text-textSecondary">Расписание</p> <p className="truncate text-left text-navigationTitle capitalize text-textPrimary">{props.formatSelectedDate}</p> </div> <div className="flex shrink-0 items-center gap-1.5"> <button type="button" onClick={props.selectToday} disabled={!showTodayAction} className={`calendar-header-action flex h-8 min-h-0 w-8 items-center justify-center rounded-lg text-primary ring-1 ring-inset ring-primarySurface transition ${showTodayAction ? "bg-surface hover:bg-primarySurface" : "pointer-events-none opacity-0"}`} aria-label="Перейти к сегодняшнему дню" title="Сегодня"> <TodayIcon /></button> <button type="button" onClick={() => props.setCalendarExpanded((value) => !value)} className={`calendar-header-action flex h-8 min-h-0 w-8 items-center justify-center rounded-lg ${props.calendarExpanded ? "bg-background text-primary" : "bg-background text-textPrimary hover:bg-primarySurface"}`} aria-label={props.calendarExpanded ? "Скрыть календарь" : "Раскрыть календарь"} aria-expanded={props.calendarExpanded} title={props.calendarExpanded ? "Скрыть" : "Раскрыть"}> <ChevronIcon open={props.calendarExpanded}/></button> </div> </div> <div className={`calendar-month-controls grid transition-all duration-300 ease-out ${props.calendarExpanded ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}> <div className="min-h-0 overflow-hidden"> <div className="calendar-month-controls-row grid grid-cols-[44px_1fr_44px] items-center gap-2"> <button type="button" onClick={() => startCalendarMonthRoll(-1)} className="calendar-month-button flex h-11 min-h-0 items-center justify-center rounded-xl bg-background text-screenTitle text-textPrimary hover:bg-primarySurface" aria-label="Предыдущий месяц" title="Предыдущий месяц"> <CaretLeft className="h-5 w-5" weight="bold" aria-hidden="true"/></button> <div className="calendar-month-label overflow-hidden rounded-xl bg-background px-4 py-3 text-center"> <p className="truncate text-buttonLabel capitalize text-textPrimary">{formatMonth(props.monthDate)}</p> </div> <button type="button" onClick={() => startCalendarMonthRoll(1)} className="calendar-month-button flex h-11 min-h-0 items-center justify-center rounded-xl bg-background text-screenTitle text-textPrimary hover:bg-primarySurface" aria-label="Следующий месяц" title="Следующий месяц"> <CaretRight className="h-5 w-5" weight="bold" aria-hidden="true"/></button> </div> </div> </div> <div className="calendar-view-stage mt-3 rounded-2xl bg-surface"> <div ref={calendarWeekTrackRef} className="calendar-week-track calendar-week-static calendar-track-follow calendar-view-panel calendar-view-week rounded-2xl bg-surface" aria-hidden={props.calendarExpanded}> <div className="calendar-week-roller"> {[props.selectedWeekDays.map((day) => addDays(day, -7)), props.selectedWeekDays, props.selectedWeekDays.map((day) => addDays(day, 7))].map((week, weekIndex) => (<div key={`${weekIndex}-${week[0]?.toISOString()}`} className="calendar-week-page grid grid-cols-7 gap-1 p-2 md:gap-2 md:p-3"> {week.map((day) => renderCalendarDay(day, "week"))} </div>))} </div> </div> <div ref={calendarMonthTrackRef} className="calendar-week-track calendar-month-track calendar-track-follow calendar-view-panel calendar-view-month rounded-2xl bg-surface" aria-hidden={!props.calendarExpanded}> <div className="calendar-week-roller"> {[new Date(props.monthDate.getFullYear(), props.monthDate.getMonth() - 1, 1), props.monthDate, new Date(props.monthDate.getFullYear(), props.monthDate.getMonth() + 1, 1)].map((month, monthIndex) => renderCalendarMonthPage(month, `${monthIndex}-${month.getFullYear()}-${month.getMonth()}`))} </div> </div> </div> </section> <section className="home-agenda-section"> <div className="agenda-header flex items-start justify-between gap-3"> <div className={`agenda-toggle-strip ${props.compactAppointments ? "" : "is-expanded"}`}> <span className="agenda-count-title text-conversationName text-textPrimary"><span>Записей: {props.appointments.length}</span><span>Выручка: {selectedDateRevenue.toLocaleString("ru-RU")} ₽</span><span>Загрузка: {dayLoad}%</span><button type="button" onClick={props.onEditSelectedWorkHours} className="agenda-work-hours-button" aria-label={`Редактировать рабочие часы на ${props.formatSelectedDate}`} title="Редактировать рабочие часы"><Clock className="agenda-work-hours-icon" weight="bold" aria-hidden="true"/><span>{selectedWorkScheduleLabel}</span></button></span> </div> <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); props.setCompactAppointments((value) => !value); }} className={`agenda-collapse-button ${props.compactAppointments ? "" : "is-expanded"}`} aria-expanded={!props.compactAppointments} aria-label={props.compactAppointments ? "Показать записи подробно" : "Свернуть записи компактно"} title={props.compactAppointments ? "Подробно" : "Компактно"}> <CaretDown className="agenda-toggle-strip-icon" weight="bold" aria-hidden="true"/></button> <div className="flex shrink-0 items-center gap-2"> <button type="button" onClick={() => props.setShowFilters((value) => !value)} className={`hidden h-10 min-h-0 w-10 items-center justify-center rounded-full border text-textPrimary transition hover:bg-background md:h-11 md:w-11 ${props.showFilters ? "border-textPrimary bg-background" : "border-border bg-surface"}`} aria-label="Фильтры записей" title="Фильтры"> <ActionIcon name="filter"/></button> </div> </div> <div className="hidden"> <div className="min-h-0 overflow-hidden"> <div className="saas-card space-y-2 p-2.5 md:p-3"> <p className="text-sectionLabel text-textPrimary">Что показать?</p> <div className="flex flex-wrap gap-1.5"> {([] as const).map((status) => (<button key={status} type="button" onClick={() => undefined} className="h-8 min-h-0 rounded-md border border-border bg-surface px-2.5 text-messageMetadata text-textPrimary"> {status}</button>))} </div> </div> </div> </div> <div className="hidden"> <div className="min-h-0 overflow-hidden"> <form onSubmit={props.addAppointment} className="home-appointment-form saas-card grid gap-3 rounded-2xl p-4 md:grid-cols-5 md:p-5"> <div className="md:col-span-5"> <p className="text-conversationName text-textPrimary">Новая запись</p> <p className="mt-1 text-settingsRowDescription text-textSecondary">Заполните основные данные клиента.</p> </div> <TimeWheelPicker label="Время" value={props.appointmentForm.time} onChange={(time) => props.setAppointmentForm((current) => ({ ...current, time }))}/> <ClientPicker clients={props.clients} valueName={props.appointmentForm.client} valuePhone={props.appointmentForm.phone} onSelect={(client) => props.setAppointmentForm((current) => ({ ...current, client: client.name, phone: client.phone }))}/> <input value={props.appointmentForm.client} onChange={(event) => props.setAppointmentForm((current) => ({ ...current, client: event.target.value }))} className="rounded-xl border border-border px-3 py-3" placeholder="Имя клиента"/> <input value={props.appointmentForm.phone} onChange={(event) => props.setAppointmentForm((current) => ({ ...current, phone: event.target.value }))} className="rounded-xl border border-border px-3 py-3" placeholder="Телефон"/> <ServicePicker services={props.services} value={props.appointmentForm.serviceIds.length ? props.appointmentForm.serviceIds : props.appointmentForm.serviceId ? [props.appointmentForm.serviceId] : []} onChange={(serviceIds) => props.setAppointmentForm((current) => ({ ...current, serviceId: serviceIds[0] || "", serviceIds }))}/> <div className="grid grid-cols-2 gap-2 md:flex md:flex-row"> <button type="submit" className="w-full rounded-lg bg-primary px-3 py-3 text-settingsRowTitle text-surface md:flex-1"> Готово</button> <button type="button" onClick={() => props.setShowAppointmentForm(false)} className="w-full rounded-lg border border-border px-3 py-3 text-settingsRowTitle md:w-auto"> Не сейчас</button> </div> </form> </div> </div> <div className="next-appointment-strip mt-2 flex min-w-0 items-center gap-2 px-0.5 text-messageMetadata text-textSecondary"> <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-background text-textPrimary"> <Clock className="h-3.5 w-3.5" weight="bold" aria-hidden="true"/> </span> <span className="next-appointment-marquee min-w-0 flex-1"> <span> {nextAppointment ? `Ближайшая: ${nextAppointment.time} · ${nextAppointment.client} · ${getAppointmentServiceTitle(nextAppointment, props.services)}` : "Ближайших записей нет"} </span> </span> <span className="shrink-0 text-buttonLabel text-textPrimary">{Math.floor(totalBookedMinutes / 60)} ч {totalBookedMinutes % 60} мин</span> </div> <div key={props.selectedDate} className="calendar-list-transition mt-2 space-y-2"> {props.blockedTimes.map((item) => (<article key={item.id} className="saas-card grid gap-2 bg-background p-3 md:grid-cols-[96px_1fr] md:items-center"> <div> <p className="text-navigationTitle text-textPrimary">{item.start}-{item.end}</p> <p className="text-settingsRowDescription text-textSecondary">закрыто</p> </div> <div> <p className="text-settingsRowTitle">Время недоступно для записи</p> <p className="text-settingsRowDescription text-textSecondary">{item.reason}</p> </div> </article>))} {props.appointments.length === 0 ? (<article className="home-empty-state" aria-hidden="true"/>) : (props.appointments.map((item, index) => { const appointmentServices = getAppointmentServices(item, props.services); const serviceTitle = getAppointmentServiceTitle(item, props.services); const serviceDuration = appointmentServices.reduce((sum, service) => sum + service.duration, 0); const servicePrice = appointmentServices.reduce((sum, service) => sum + service.price, 0); const appointmentServiceColor = getAppointmentServiceColor(item, props.services); const appointmentTimelineStatus = getAppointmentTimelineStatus(item, serviceDuration || 60, statusNow); const appointmentNoShow = isNoShowAppointment(item); const appointmentCompleted = appointmentTimelineStatus === "past" && !appointmentNoShow; const appointmentBadgeStatus = appointmentNoShow ? item.status : appointmentTimelineStatus === "past" ? "done" : item.status; const appointmentBadgeLabel = undefined; const appointmentDragProps = getAppointmentDragProps(item.id); if (props.compactAppointments && expandedCompactAppointmentId !== item.id) {
    return (<button key={item.id} type="button" {...appointmentDragProps} onClick={() => setSelectedAppointmentId(item.id)} className={`appointment-card appointment-card-reference appointment-card-${appointmentTimelineStatus} appointment-card-compact appointment-card-elastic pressable-surface saas-card relative w-full overflow-hidden text-left hover:bg-background ${appointmentDragProps.className}`} style={{ ...appointmentDragProps.style, "--appointment-service-color": appointmentServiceColor } as CSSProperties}> <span className="appointment-card-reveal-layer" aria-hidden="true"/> <span className="appointment-service-color-stripe" aria-hidden="true"/> <div className="master-booking-card master-booking-card-compact"> <div className="master-booking-time"> <p>{item.time}</p> </div> <div className="master-booking-details"> <p className="master-booking-service truncate">{appointmentServices.length ? serviceTitle : "Услуга удалена"}</p> <p className="master-booking-meta"> <User className="master-booking-meta-icon" aria-hidden="true"/> <span className="truncate">{item.client}</span> </p> {appointmentCompleted ? (<span className="master-booking-complete-check" aria-label="Выполнено" title="Выполнено"> <Check weight="bold" aria-hidden="true"/> </span>) : (<StatusBadge className="appointment-detail-status master-booking-inline-status" label={appointmentBadgeLabel} status={appointmentBadgeStatus}/>)} <p className="master-booking-meta master-booking-phone-status"> <Phone className="master-booking-meta-icon" aria-hidden="true"/> <span className="truncate">{item.phone || "Без телефона"}</span> </p> <p className="master-booking-meta master-booking-duration-inline"> <Clock className="master-booking-meta-icon" weight="bold" aria-hidden="true"/> <span>{appointmentServices.length ? serviceDuration : 60} мин</span> <span className="master-booking-duration-price"> <CurrencyRub className="h-3.5 w-3.5" weight="bold" aria-hidden="true"/> <span>{servicePrice.toLocaleString("ru-RU")} ₽</span> </span> </p> </div> <div className="master-booking-actions"> <span className="master-booking-menu" aria-hidden="true"> <DotsThree className="h-5 w-5 rotate-90" weight="bold" aria-hidden="true"/> </span> </div> </div> <span className={`appointment-status-dot appointment-status-dot-${appointmentTimelineStatus}`} aria-hidden="true"/> <div className="grid grid-cols-[48px_minmax(0,0.85fr)_minmax(0,1fr)] items-center gap-2 px-3 py-2 md:grid-cols-[64px_minmax(0,0.85fr)_minmax(0,1fr)]"> <p className="whitespace-nowrap tabular-nums text-timestamp text-textPrimary">{item.time}</p> <p className="truncate text-conversationName text-textPrimary">{item.client}</p> <p className="text-conversationPreview text-textSecondary">{appointmentServices.length ? serviceTitle : "Услуга удалена"}</p> </div></button>);
} return (<article key={item.id} {...appointmentDragProps} onClick={() => setSelectedAppointmentId(item.id)} onKeyDown={(event) => { if (event.key !== "Enter" && event.key !== " ")
    return; event.preventDefault(); setSelectedAppointmentId(item.id); }} role="button" tabIndex={0} className={`appointment-card appointment-card-reference appointment-card-${appointmentTimelineStatus} appointment-card-elastic pressable-surface saas-card relative cursor-pointer overflow-hidden ${appointmentDragProps.className}`} style={{ ...appointmentDragProps.style, "--appointment-service-color": appointmentServiceColor } as CSSProperties}> <span className="appointment-card-reveal-layer" aria-hidden="true"/> <span className="appointment-service-color-stripe" aria-hidden="true"/> <div className="master-booking-card"> <div className="master-booking-time"> <p>{item.time}</p> </div> <div className="master-booking-details"> <p className="master-booking-service truncate">{appointmentServices.length ? serviceTitle : "Услуга удалена"}</p> <p className="master-booking-meta"> <User className="master-booking-meta-icon" aria-hidden="true"/> <span className="truncate">{item.client}</span> </p> {appointmentCompleted ? (<span className="master-booking-complete-check" aria-label="Выполнено" title="Выполнено"> <Check weight="bold" aria-hidden="true"/> </span>) : (<StatusBadge className="appointment-detail-status master-booking-inline-status" label={appointmentBadgeLabel} status={appointmentBadgeStatus}/>)} <p className="master-booking-meta master-booking-phone-status"> <Phone className="master-booking-meta-icon" aria-hidden="true"/> <span className="truncate">{item.phone || "Без телефона"}</span> </p> <p className="master-booking-meta master-booking-duration-inline"> <Clock className="master-booking-meta-icon" weight="bold" aria-hidden="true"/> <span>{appointmentServices.length ? serviceDuration : 60} мин</span> <span className="master-booking-duration-price"> <CurrencyRub className="h-3.5 w-3.5" weight="bold" aria-hidden="true"/> <span>{servicePrice.toLocaleString("ru-RU")} ₽</span> </span> </p> </div> <div className="master-booking-actions"> <button type="button" onClick={(event) => { event.stopPropagation(); setDeleteTarget((current) => (current?.id === item.id ? null : item)); }} className="master-booking-menu" aria-label="Действия записи" title="Действия"> <DotsThree className="h-5 w-5 rotate-90" weight="bold" aria-hidden="true"/></button> </div> </div> <span className={`appointment-status-dot appointment-status-dot-${appointmentTimelineStatus}`} aria-hidden="true"/> <div className="appointment-card-main appointment-card-main-featured grid gap-2 p-3 md:p-3.5"> <div className="appointment-card-row appointment-card-row-top grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"> <div className="appointment-client-row min-w-0"> <p className="appointment-client-name truncate"> {item.client} </p> </div> <div className="appointment-actions flex w-9 items-center justify-end"> <button type="button" onClick={(event) => { event.stopPropagation(); setDeleteTarget((current) => (current?.id === item.id ? null : item)); }} className="flex h-8 min-h-0 w-8 items-center justify-center rounded-full border border-transparent bg-transparent text-textPrimary hover:bg-transparent" aria-label="Удалить запись" title="Удалить"> <ActionIcon name="trash"/></button> </div> </div> <div className="appointment-card-row appointment-card-row-bottom flex min-w-0 flex-wrap items-center gap-1.5"> <span className="appointment-time-pill tabular-nums">{item.time}</span> {appointmentCompleted ? (<span className="master-booking-complete-check" aria-label="Выполнено" title="Выполнено"> <Check weight="bold" aria-hidden="true"/> </span>) : (<StatusBadge className="max-w-[10rem]" label={appointmentBadgeLabel} status={appointmentBadgeStatus}/>)} <span className="appointment-phone-pill"> <span className="appointment-phone-icon" aria-hidden="true"> <ActionIcon name="phone"/> </span> <span className="truncate">{item.phone || "Без телефона"}</span> </span> <div className="appointment-service-row flex min-w-0 flex-wrap items-center gap-1.5 text-settingsRowDescription"> <span className="appointment-chip appointment-service-chip"> <span className="truncate">{appointmentServices.length ? serviceTitle : "Услуга удалена"}</span> </span> {appointmentServices.length ? (<> <span className="appointment-chip">{serviceDuration} мин</span> <span className="appointment-chip appointment-price-chip">{servicePrice.toLocaleString("ru-RU")} ₽</span> </>) : (<span className="appointment-chip">нет деталей</span>)} </div> </div> </div> <div className={`appointment-confirm grid transition-all duration-300 ${deleteTarget?.id === item.id ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}> <div className="min-h-0 overflow-hidden"> <div className="flex flex-col gap-3 bg-background p-3 md:flex-row md:items-center md:justify-between" role="alert" onClick={(event) => event.stopPropagation()}> <div className="flex items-center gap-2"> <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-transparent text-textPrimary"> <ActionIcon name="trash"/> </span> <p className="text-settingsRowTitle text-textPrimary">Точно убираем эту запись?</p> </div> <div className="grid grid-cols-2 gap-2 md:w-[260px]"> <button type="button" onClick={() => { props.deleteAppointment(item.id); setDeleteTarget(null); }} className="min-h-0 rounded-lg bg-textPrimary px-3 py-2 text-settingsRowTitle text-surface hover:opacity-90"> Ага</button> <button type="button" onClick={() => setDeleteTarget(null)} className="min-h-0 rounded-lg border border-border bg-surface px-3 py-2 text-settingsRowTitle text-textPrimary hover:bg-background"> Нет</button> </div> </div> </div> </div> </article>); }))} </div> </section> </div>); }
function ServicesSection(props: {
    addService: (event: React.FormEvent) => void;
    appointments: Appointment[];
    cancelServiceEdit: () => void;
    deleteService: (id: string) => void;
    editService: (service: Service) => void;
    editingServiceId: string | null;
    serviceForm: typeof emptyService;
    serviceFormOpen: boolean;
    serviceSaving: boolean;
    services: Service[];
    previewServiceColor: (serviceId: string, color: string) => void;
    setServiceForm: React.Dispatch<React.SetStateAction<typeof emptyService>>;
    setServiceOverlayOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setServiceFormOpen: React.Dispatch<React.SetStateAction<boolean>>;
    toggleService: (id: string) => void;
}) { const [deleteTarget, setDeleteTarget] = useState<Service | null>(null); const [openServiceMenuId, setOpenServiceMenuId] = useState<string | null>(null); const [closingServiceMenuId, setClosingServiceMenuId] = useState<string | null>(null); const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null); const [servicePhotoUploading, setServicePhotoUploading] = useState(false); const [serviceSearch, setServiceSearch] = useState(""); const [serviceStatusFilter, setServiceStatusFilter] = useState<"all" | "active" | "archive">("all"); const [serviceCategoryFilter, setServiceCategoryFilter] = useState("all"); const serviceFiltersRef = useRef<HTMLDivElement | null>(null); const serviceListRef = useRef<HTMLDivElement | null>(null); const serviceMenuCloseTimer = useRef<number | null>(null); const serviceMenuPointerToggleId = useRef<string | null>(null); const serviceFilterDragFrame = useRef<number | null>(null); const serviceFilterPendingDelta = useRef(0); const serviceFilterCommitTimer = useRef<number | null>(null); const serviceFilterSwipeStart = useRef<{
    captured: boolean;
    x: number;
    y: number;
    pointerId?: number;
    time: number;
} | null>(null); const serviceFilterSwipeSuppressClickUntil = useRef(0); const serviceFormRef = useRef<HTMLDivElement | null>(null); const servicePhotoInputRef = useRef<HTMLInputElement | null>(null); const serviceStatusFilters = useMemo(() => [["all", "Все"], ["active", "Активные"], ["archive", "Архив"],] as const, []); const newServiceFormOpen = props.serviceFormOpen && !props.editingServiceId; const services = useMemo(() => uniqueById(props.services), [props.services]); const serviceCategories = useMemo(() => { const categories = services.map((service) => service.category?.trim()).filter((category): category is string => Boolean(category)); return Array.from(new Set(categories)); }, [services]); const filteredServices = useMemo(() => { const normalizedSearch = serviceSearch.trim().toLocaleLowerCase("ru-RU"); return services.filter((service) => { const matchesStatus = serviceStatusFilter === "all" || (serviceStatusFilter === "active" && service.active) || (serviceStatusFilter === "archive" && !service.active); const matchesCategory = serviceCategoryFilter === "all" || service.category === serviceCategoryFilter; const haystack = `${service.title} ${service.category} ${service.description} ${service.preparation}`.toLocaleLowerCase("ru-RU"); return matchesStatus && matchesCategory && (!normalizedSearch || haystack.includes(normalizedSearch)); }); }, [services, serviceCategoryFilter, serviceSearch, serviceStatusFilter]); const filterServicesByStatus = (filter: "all" | "active" | "archive") => { const normalizedSearch = serviceSearch.trim().toLocaleLowerCase("ru-RU"); return services.filter((service) => { const matchesStatus = filter === "all" || (filter === "active" && service.active) || (filter === "archive" && !service.active); const matchesCategory = serviceCategoryFilter === "all" || service.category === serviceCategoryFilter; const haystack = `${service.title} ${service.category} ${service.description} ${service.preparation}`.toLocaleLowerCase("ru-RU"); return matchesStatus && matchesCategory && (!normalizedSearch || haystack.includes(normalizedSearch)); }); }; const serviceFilterIndex = serviceStatusFilters.findIndex(([value]) => value === serviceStatusFilter); const previousServiceFilter = serviceStatusFilters[serviceFilterIndex - 1]?.[0] || null; const nextServiceFilter = serviceStatusFilters[serviceFilterIndex + 1]?.[0] || null; const servicePreviewPanels = [previousServiceFilter ? { direction: "prev" as const, filter: previousServiceFilter, services: filterServicesByStatus(previousServiceFilter) } : null, nextServiceFilter ? { direction: "next" as const, filter: nextServiceFilter, services: filterServicesByStatus(nextServiceFilter) } : null,].filter((item): item is {
    direction: "next" | "prev";
    filter: "all" | "active" | "archive";
    services: Service[];
} => Boolean(item)); const popularSummary = serviceCategories.slice(0, 3).join(", ") || "Добавьте категории"; const selectedService = useMemo(() => services.find((service) => service.id === selectedServiceId) || null, [services, selectedServiceId]); const selectedServiceStats = useMemo(() => { if (!selectedService)
    return { count: 0, revenue: 0 }; const matchingAppointments = props.appointments.filter((appointment) => getAppointmentServiceIds(appointment).includes(selectedService.id)); return { count: matchingAppointments.length, revenue: matchingAppointments.reduce((sum, appointment) => sum + getAppointmentPrice(appointment, [selectedService]), 0), }; }, [props.appointments, selectedService]); const getServiceIncludedItems = (service: Service) => { return deriveServiceIncludedItems(service); }; const setServiceFilterUnderlinePosition = (index: number, transition = true) => { const tabList = serviceFiltersRef.current; const buttons = tabList ? Array.from(tabList.querySelectorAll<HTMLButtonElement>("button")) : []; const button = buttons[index]; if (!tabList || !button)
    return; const listRect = tabList.getBoundingClientRect(); const buttonRect = button.getBoundingClientRect(); tabList.style.setProperty("--service-filter-underline-left", `${buttonRect.left - listRect.left + 13.6}px`); tabList.style.setProperty("--service-filter-underline-width", `${Math.max(16, buttonRect.width - 27.2)}px`); tabList.style.setProperty("--service-filter-underline-transition", transition ? "transform .24s ease, width .24s ease" : "none"); }; const resetServiceFilterUnderlinePosition = (transition = true) => { const currentIndex = serviceStatusFilters.findIndex(([value]) => value === serviceStatusFilter); setServiceFilterUnderlinePosition(currentIndex, transition); }; const setServiceFilterListDrag = (deltaX: number, transition = false) => { const list = serviceListRef.current; if (!list)
    return; const maxOffset = Math.max(1, Math.min(window.innerWidth, list.getBoundingClientRect().width || window.innerWidth)); const offset = Math.max(-maxOffset, Math.min(maxOffset, deltaX)); list.style.setProperty("--service-filter-track-offset", `${offset}px`); list.style.setProperty("--service-filter-list-opacity", "1"); list.style.setProperty("--service-filter-list-transition", transition ? "transform .24s cubic-bezier(.22, 1, .36, 1), opacity .24s ease" : "none"); }; const resetServiceFilterListDrag = (transition = true) => { const list = serviceListRef.current; if (!list)
    return; list.style.setProperty("--service-filter-track-offset", "0px"); list.style.setProperty("--service-filter-list-opacity", "1"); list.style.setProperty("--service-filter-list-transition", transition ? "transform .22s ease, opacity .22s ease" : "none"); }; const applyServiceFilterSwipeFrame = (deltaX: number) => { const currentIndex = serviceStatusFilters.findIndex(([value]) => value === serviceStatusFilter); const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1; const tabList = serviceFiltersRef.current; const buttons = tabList ? Array.from(tabList.querySelectorAll<HTMLButtonElement>("button")) : []; const currentButton = buttons[currentIndex]; const nextButton = buttons[nextIndex]; if (!tabList || !currentButton || !nextButton)
    return; const listRect = tabList.getBoundingClientRect(); const currentRect = currentButton.getBoundingClientRect(); const nextRect = nextButton.getBoundingClientRect(); const progress = Math.min(1, Math.abs(deltaX) / Math.min(160, Math.max(96, window.innerWidth * 0.38))); const currentLeft = currentRect.left - listRect.left + 13.6; const nextLeft = nextRect.left - listRect.left + 13.6; const currentWidth = Math.max(16, currentRect.width - 27.2); const nextWidth = Math.max(16, nextRect.width - 27.2); tabList.style.setProperty("--service-filter-underline-left", `${currentLeft + (nextLeft - currentLeft) * progress}px`); tabList.style.setProperty("--service-filter-underline-width", `${currentWidth + (nextWidth - currentWidth) * progress}px`); tabList.style.setProperty("--service-filter-underline-transition", "none"); setServiceFilterListDrag(deltaX); }; const requestServiceFilterSwipeFrame = (deltaX: number) => { serviceFilterPendingDelta.current = deltaX; if (serviceFilterDragFrame.current !== null)
    return; serviceFilterDragFrame.current = window.requestAnimationFrame(() => { serviceFilterDragFrame.current = null; applyServiceFilterSwipeFrame(serviceFilterPendingDelta.current); }); }; const resetServiceFilterMotion = (transition = true) => { if (serviceFilterDragFrame.current !== null) {
    window.cancelAnimationFrame(serviceFilterDragFrame.current);
    serviceFilterDragFrame.current = null;
} resetServiceFilterUnderlinePosition(transition); resetServiceFilterListDrag(transition); }; const selectServiceStatusFilter = (nextFilter: "all" | "active" | "archive") => { if (nextFilter === serviceStatusFilter)
    return; setServiceStatusFilter(nextFilter); }; const commitServiceFilterSwipe = (nextFilter: "all" | "active" | "archive", direction: "next" | "prev") => { const track = serviceListRef.current; const targetIndex = serviceStatusFilters.findIndex(([value]) => value === nextFilter); setServiceFilterUnderlinePosition(targetIndex, true); if (!track) {
    setServiceStatusFilter(nextFilter);
    return;
} if (serviceFilterDragFrame.current !== null) {
    window.cancelAnimationFrame(serviceFilterDragFrame.current);
    serviceFilterDragFrame.current = null;
} track.style.setProperty("--service-filter-track-offset", direction === "next" ? "-100%" : "100%"); track.style.setProperty("--service-filter-list-opacity", "1"); track.style.setProperty("--service-filter-list-transition", "transform .24s cubic-bezier(.22, 1, .36, 1), opacity .24s ease"); const finishCommit = () => { if (serviceFilterCommitTimer.current !== null)
    window.clearTimeout(serviceFilterCommitTimer.current); serviceFilterCommitTimer.current = null; track.removeEventListener("transitionend", handleTransitionEnd); setServiceStatusFilter(nextFilter); }; const handleTransitionEnd = (event: TransitionEvent) => { if (event.target === track && event.propertyName === "transform")
    finishCommit(); }; track.addEventListener("transitionend", handleTransitionEnd); if (serviceFilterCommitTimer.current !== null)
    window.clearTimeout(serviceFilterCommitTimer.current); serviceFilterCommitTimer.current = window.setTimeout(() => { finishCommit(); }, 320); }; useLayoutEffect(() => { resetServiceFilterMotion(false); const handleResize = () => resetServiceFilterUnderlinePosition(false); window.addEventListener("resize", handleResize); return () => { if (serviceFilterDragFrame.current !== null)
    window.cancelAnimationFrame(serviceFilterDragFrame.current); if (serviceFilterCommitTimer.current !== null)
    window.clearTimeout(serviceFilterCommitTimer.current); window.removeEventListener("resize", handleResize); }; }, [serviceStatusFilter]); const getServiceFilterSwipeTarget = (deltaX: number) => { const currentIndex = serviceStatusFilters.findIndex(([value]) => value === serviceStatusFilter); const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1; return serviceStatusFilters[nextIndex]?.[0] || null; }; const prepareServiceFilterPreview = (deltaX: number) => { return Boolean(getServiceFilterSwipeTarget(deltaX)); }; const finishServiceFilterSwipe = (clientX: number, clientY: number) => { const start = serviceFilterSwipeStart.current; serviceFilterSwipeStart.current = null; if (!start)
    return false; const deltaX = clientX - start.x; const deltaY = clientY - start.y; const isLocalSwipe = Math.abs(deltaX) >= 32 && (start.captured || Math.abs(deltaX) > Math.abs(deltaY) * 1.02); if (!isLocalSwipe)
    return false; const nextFilter = getServiceFilterSwipeTarget(deltaX); if (!nextFilter || nextFilter === serviceStatusFilter)
    return false; serviceFilterSwipeSuppressClickUntil.current = Date.now() + 500; commitServiceFilterSwipe(nextFilter, deltaX < 0 ? "next" : "prev"); return true; }; const shouldIgnoreServiceSwipeTarget = (target: EventTarget | null) => target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable='true'], .service-reference-menu, .service-reference-actions, [data-dashboard-swipe-ignore='true']")); const handleServiceFilterPointerDown = (event: PointerEvent<HTMLDivElement>) => { if (event.pointerType === "touch")
    return; if (event.pointerType === "mouse" && event.button !== 0)
    return; if (shouldIgnoreServiceSwipeTarget(event.target))
    return; serviceFilterSwipeStart.current = { captured: false, x: event.clientX, y: event.clientY, pointerId: event.pointerId, time: Date.now() }; event.currentTarget.setPointerCapture(event.pointerId); }; const handleServiceFilterPointerMove = (event: PointerEvent<HTMLDivElement>) => { if (event.pointerType === "touch")
    return; const start = serviceFilterSwipeStart.current; if (!start || start.pointerId !== event.pointerId)
    return; const deltaX = event.clientX - start.x; const deltaY = event.clientY - start.y; if (Math.abs(deltaX) < 3 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.04)
    return; if (!prepareServiceFilterPreview(deltaX))
    return; start.captured = true; requestServiceFilterSwipeFrame(deltaX); event.preventDefault(); event.stopPropagation(); }; const handleServiceFilterPointerUp = (event: PointerEvent<HTMLDivElement>) => { if (event.pointerType === "touch")
    return; const start = serviceFilterSwipeStart.current; if (!start || start.pointerId !== event.pointerId)
    return; if (event.currentTarget.hasPointerCapture(event.pointerId))
    event.currentTarget.releasePointerCapture(event.pointerId); const switched = finishServiceFilterSwipe(event.clientX, event.clientY); if (!switched)
    resetServiceFilterMotion(true); if (start.captured || switched)
    event.stopPropagation(); }; const handleServiceFilterPointerCancel = (event: PointerEvent<HTMLDivElement>) => { if (event.pointerType === "touch")
    return; if (event.currentTarget.hasPointerCapture(event.pointerId))
    event.currentTarget.releasePointerCapture(event.pointerId); serviceFilterSwipeStart.current = null; resetServiceFilterMotion(true); }; const handleServiceFilterTouchStart = (event: TouchEvent<HTMLDivElement>) => { const touch = event.touches[0]; if (!touch)
    return; if (shouldIgnoreServiceSwipeTarget(event.target))
    return; serviceFilterSwipeStart.current = { captured: false, x: touch.clientX, y: touch.clientY, time: Date.now() }; }; const handleServiceFilterTouchMove = (event: TouchEvent<HTMLDivElement>) => { const start = serviceFilterSwipeStart.current; const touch = event.touches[0]; if (!start || !touch)
    return; const deltaX = touch.clientX - start.x; const deltaY = touch.clientY - start.y; if (Math.abs(deltaX) < 3 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.04)
    return; if (!prepareServiceFilterPreview(deltaX))
    return; start.captured = true; requestServiceFilterSwipeFrame(deltaX); event.preventDefault(); event.stopPropagation(); }; const handleServiceFilterTouchEnd = (event: TouchEvent<HTMLDivElement>) => { const start = serviceFilterSwipeStart.current; const touch = event.changedTouches[0]; if (!touch)
    return; const switched = finishServiceFilterSwipe(touch.clientX, touch.clientY); if (!switched)
    resetServiceFilterMotion(true); if (start?.captured || switched)
    event.stopPropagation(); }; const handleServiceSwipeClickCapture = (event: MouseEvent<HTMLDivElement>) => { if (Date.now() > serviceFilterSwipeSuppressClickUntil.current)
    return; event.preventDefault(); event.stopPropagation(); }; const updateIncludedItem = (index: number, value: string) => { props.setServiceForm((current) => { const items = [...current.includedItems]; items[index] = value; return { ...current, includedItems: items }; }); }; const removeIncludedItem = (index: number) => { props.setServiceForm((current) => ({ ...current, includedItems: current.includedItems.filter((_, itemIndex) => itemIndex !== index) })); }; const addIncludedItem = () => { props.setServiceForm((current) => ({ ...current, includedItems: [...current.includedItems, ""] })); }; const closeSelectedService = () => { props.setServiceOverlayOpen(false); setSelectedServiceId(null); setOpenServiceMenuId(null); setClosingServiceMenuId(null); props.cancelServiceEdit(); }; const toggleServiceMenu = (serviceId: string) => { if (serviceMenuCloseTimer.current) { window.clearTimeout(serviceMenuCloseTimer.current); serviceMenuCloseTimer.current = null; } if (openServiceMenuId === serviceId) { setClosingServiceMenuId(serviceId); setOpenServiceMenuId(null); serviceMenuCloseTimer.current = window.setTimeout(() => { setClosingServiceMenuId((current) => (current === serviceId ? null : current)); serviceMenuCloseTimer.current = null; }, 190); return; } setClosingServiceMenuId(null); setOpenServiceMenuId(serviceId); }; const handleServiceMenuPointerDown = (event: PointerEvent<HTMLButtonElement>, serviceId: string) => { if (event.pointerType === "mouse")
    return; serviceMenuPointerToggleId.current = serviceId; event.preventDefault(); event.stopPropagation(); toggleServiceMenu(serviceId); }; const handleServiceMenuClick = (event: MouseEvent<HTMLButtonElement>, serviceId: string) => { event.stopPropagation(); if (serviceMenuPointerToggleId.current === serviceId) { serviceMenuPointerToggleId.current = null; event.preventDefault(); return; } toggleServiceMenu(serviceId); }; const handleServicePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file)
    return; if (!file.type.startsWith("image/")) {
    event.target.value = "";
    return;
} const previewUrl = URL.createObjectURL(file); props.setServiceForm((current) => ({ ...current, photoUrl: previewUrl })); setServicePhotoUploading(true); void compressServicePhoto(file).then((uploadFile) => { const form = new FormData(); form.append("file", uploadFile); if (props.editingServiceId) {
    form.append("serviceId", props.editingServiceId);
} if (props.serviceForm.photoUrl && props.serviceForm.photoUrl.startsWith("/uploads/")) {
    form.append("previousUrl", props.serviceForm.photoUrl);
} return fetch("/api/services/images", { method: "POST", body: form }); }).then(async (response) => { const data = (await response.json()) as {
    success: boolean;
    url?: string;
    error?: string;
}; if (!response.ok || !data.success || !data.url)
    throw new Error(data.error || "Не удалось загрузить фото"); props.setServiceForm((current) => ({ ...current, photoUrl: data.url || "" })); }).catch(() => { props.setServiceForm((current) => ({ ...current, photoUrl: current.photoUrl === previewUrl ? "" : current.photoUrl })); }).finally(() => { URL.revokeObjectURL(previewUrl); setServicePhotoUploading(false); }); event.target.value = ""; }; const splitDuration = (duration: number | string) => { const total = Math.max(0, Number(duration) || 0); return { hours: Math.floor(total / 60), minutes: total % 60, }; }; const setDurationParts = (part: "hours" | "minutes", rawValue: string) => { const current = splitDuration(props.serviceForm.duration); const cleanValue = Math.max(0, Number(rawValue) || 0); const nextHours = part === "hours" ? cleanValue : current.hours; const nextMinutes = part === "minutes" ? Math.min(55, cleanValue) : current.minutes; props.setServiceForm((currentForm) => ({ ...currentForm, duration: String(nextHours * 60 + nextMinutes) })); }; useEffect(() => { if (!newServiceFormOpen)
    return; window.requestAnimationFrame(() => { serviceFormRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }); }); }, [newServiceFormOpen]); useEffect(() => { props.setServiceOverlayOpen(Boolean(selectedService)); return () => props.setServiceOverlayOpen(false); }, [props.setServiceOverlayOpen, selectedService]); const newServiceFormPanel = (<div ref={serviceFormRef} className={`service-create-panel grid scroll-mt-0 transition-all duration-300 ${props.serviceFormOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}> <div className="min-h-0 overflow-hidden"> <form onSubmit={props.addService} className="service-phone-form"> <div className="service-form-topbar"> <button type="button" onClick={props.cancelServiceEdit} className="service-form-icon-button" aria-label="Назад" title="Назад"> <ArrowLeft className="h-5 w-5" weight="light" aria-hidden="true"/></button> <h1>{props.editingServiceId ? "Редактировать услугу" : "Новая услуга"}</h1> <button type="submit" disabled={props.serviceSaving || servicePhotoUploading} className="service-form-save-link"> {servicePhotoUploading ? "Загрузка..." : props.serviceSaving ? "Сохраняем..." : "Сохранить"}</button> </div> <label className="service-form-field"> <span>Название услуги <b>*</b></span> <input value={props.serviceForm.title} onChange={(event) => props.setServiceForm((current) => ({ ...current, title: event.target.value }))} placeholder="Введите название"/> </label> <label className="service-form-field"> <span>Категория <b>*</b></span> <input value={props.serviceForm.category} onChange={(event) => props.setServiceForm((current) => ({ ...current, category: event.target.value }))} placeholder="Выберите или введите категорию"/> </label> <div className="service-form-field service-duration-field"> <span>Длительность <b>*</b></span> <div className="service-duration-control"> <button type="button" onClick={() => props.setServiceForm((current) => ({ ...current, duration: String(Math.max(5, Number(current.duration || 0) - 5)) }))} aria-label="Уменьшить длительность"> -</button> <label> <input type="number" min="0" value={splitDuration(props.serviceForm.duration).hours} onChange={(event) => setDurationParts("hours", event.target.value)}/> <span>ч</span> </label> <label> <input type="number" min="0" max="55" step="5" value={splitDuration(props.serviceForm.duration).minutes} onChange={(event) => setDurationParts("minutes", event.target.value)}/> <span>мин</span> </label> <button type="button" onClick={() => props.setServiceForm((current) => ({ ...current, duration: String((Number(current.duration) || 0) + 5) }))} aria-label="Увеличить длительность"> +</button> </div> </div> <label className="service-form-field service-price-field"> <span>Цена <b>*</b></span> <input type="number" min="0" value={props.serviceForm.price} onChange={(event) => props.setServiceForm((current) => ({ ...current, price: event.target.value }))} placeholder="Стоимость услуги"/> <button type="button" className={`service-price-from-toggle ${normalizeBoolean(props.serviceForm.priceFrom) ? "is-active" : ""}`} onClick={() => props.setServiceForm((current) => ({ ...current, priceFrom: !normalizeBoolean(current.priceFrom) }))} aria-pressed={normalizeBoolean(props.serviceForm.priceFrom)}>от</button> <CurrencyRub className="h-4 w-4" aria-hidden="true"/> </label> <label className="service-form-field service-textarea-field"> <span>Описание</span> <textarea value={props.serviceForm.description} onChange={(event) => props.setServiceForm((current) => ({ ...current, description: event.target.value }))} maxLength={300} placeholder="Кратко опишите услугу"/> <small>{props.serviceForm.description.length}/300</small> </label> <div className="service-form-field service-included-field"> <span>Что входит</span> <div className="service-included-editor"> {props.serviceForm.includedItems.map((item, index) => (<label key={index} className="service-included-row"> <ListChecks className="h-4 w-4" aria-hidden="true"/> <input value={item} onChange={(event) => updateIncludedItem(index, event.target.value)} placeholder="Пункт услуги"/> <button type="button" onClick={() => removeIncludedItem(index)} aria-label="Удалить пункт"> <X className="h-3.5 w-3.5" aria-hidden="true"/></button> </label>))} <button type="button" onClick={addIncludedItem} className="service-add-included-button"> <Plus className="h-4 w-4" aria-hidden="true"/> Добавить пункт</button> </div> </div> <label className="service-form-field"> <span>Подготовка клиента (необязательно)</span> <textarea value={props.serviceForm.preparation} onChange={(event) => props.setServiceForm((current) => ({ ...current, preparation: event.target.value }))} placeholder="Что нужно сделать клиенту перед услугой"/> </label> <label className="service-form-field"> <span>Материалы / себестоимость (необязательно)</span> <div className="service-material-row"> <input value={props.serviceForm.materialName} onChange={(event) => props.setServiceForm((current) => ({ ...current, materialName: event.target.value }))} placeholder="Расходные материалы"/> <input type="number" min="0" value={props.serviceForm.materialCost} onChange={(event) => props.setServiceForm((current) => ({ ...current, materialCost: event.target.value }))} placeholder="0"/> <CurrencyRub className="h-4 w-4" aria-hidden="true"/> </div> </label> <div className="service-photo-dropzone"> <span>Фото услуги (необязательно)</span> <input ref={servicePhotoInputRef} type="file" accept="image/*" onChange={handleServicePhotoChange} className="sr-only"/> {props.serviceForm.photoUrl && (<img src={props.serviceForm.photoUrl} alt="Фото услуги"/>)} <div> <button type="button" onClick={() => servicePhotoInputRef.current?.click()} disabled={servicePhotoUploading}> <Plus className="h-4 w-4" aria-hidden="true"/> {servicePhotoUploading ? "Загружаем..." : props.serviceForm.photoUrl ? "Заменить фото" : "Добавить фото"}</button> {props.serviceForm.photoUrl && (<button type="button" onClick={() => props.setServiceForm((current) => ({ ...current, photoUrl: "" }))}> Удалить</button>)} </div> <small>{props.serviceForm.photoUrl ? "1/5" : "0/5"}</small> </div> <div className="service-toggle-list"> <div> <span>Онлайн-запись доступна</span> <button type="button" className={`service-switch ${props.serviceForm.onlineBookingEnabled ? "service-switch-on" : ""}`} onClick={() => props.setServiceForm((current) => ({ ...current, onlineBookingEnabled: !current.onlineBookingEnabled }))} aria-pressed={props.serviceForm.onlineBookingEnabled} aria-label="Онлайн-запись доступна"/> </div> <div> <span>Активна</span> <button type="button" className={`service-switch ${props.serviceForm.active ? "service-switch-on" : ""}`} onClick={() => props.setServiceForm((current) => ({ ...current, active: !current.active }))} aria-pressed={props.serviceForm.active} aria-label="Активна"/> </div> </div> <div className="service-calendar-colors" aria-label="Цвет в календаре"> {["#0f766e", "#db2777", "#ef4444", "#f59e0b", "#65a30d", "#0891b2", "#2563eb", "#7c3aed", "#9ca3af"].map((color) => (<button key={color} type="button" className={props.serviceForm.calendarColor === color ? "is-selected" : ""} style={{ backgroundColor: color }} onClick={() => { props.setServiceForm((current) => ({ ...current, calendarColor: color })); if (props.editingServiceId)
    props.previewServiceColor(props.editingServiceId, color); }} aria-label={`Выбрать цвет ${color}`} aria-pressed={props.serviceForm.calendarColor === color}/>))} </div> <button type="submit" disabled={props.serviceSaving || servicePhotoUploading} className="service-form-primary"> {servicePhotoUploading ? "Загружаем фото..." : props.serviceSaving ? "Сохраняем..." : props.editingServiceId ? "Сохранить изменения" : "Сохранить услугу"}</button> <button type="button" onClick={props.cancelServiceEdit} className="service-form-cancel"> Не сейчас</button> </form> </div> </div>); if (selectedService) {
    const includedItems = getServiceIncludedItems(selectedService);
    const isEditingSelectedService = props.editingServiceId === selectedService.id;
    if (isEditingSelectedService) {
        return (<div className="service-detail-screen service-edit-screen"> {newServiceFormPanel} </div>);
    }
    return (<div className="service-detail-screen"> <div className="service-detail-topbar"> <button type="button" onClick={closeSelectedService} className="service-form-icon-button" aria-label="Назад" title="Назад"> <ArrowLeft className="h-5 w-5" weight="light" aria-hidden="true"/></button> <h1>{selectedService.title}</h1> <button type="button" onClick={() => toggleServiceMenu(selectedService.id)} className="service-form-icon-button" aria-label="Действия" title="Действия"> <DotsThree className="h-5 w-5" weight="bold" aria-hidden="true"/></button> {(openServiceMenuId === selectedService.id || closingServiceMenuId === selectedService.id) && (<div className="service-detail-menu" data-state={closingServiceMenuId === selectedService.id ? "closing" : "open"} role="menu" aria-label="Действия услуги"> <button type="button" onClick={() => { setOpenServiceMenuId(null); setClosingServiceMenuId(null); props.editService(selectedService); }} role="menuitem"> Редактировать</button> <button type="button" onClick={() => { setOpenServiceMenuId(null); setClosingServiceMenuId(null); props.toggleService(selectedService.id); }} role="menuitem"> {selectedService.active ? "Скрыть" : "Показать"}</button> <button type="button" onClick={() => { setOpenServiceMenuId(null); setClosingServiceMenuId(null); if (!window.confirm("Удалить эту услугу?"))
        return; props.deleteService(selectedService.id); closeSelectedService(); }} role="menuitem"> Удалить</button> </div>)} </div> <section className="service-detail-hero"> <div className="service-detail-photo" aria-hidden={!selectedService.photoUrl}> {selectedService.photoUrl ? (<img src={selectedService.photoUrl} alt={selectedService.title}/>) : (<span>{selectedService.title.trim().slice(0, 1).toLocaleUpperCase("ru-RU") || "У"}</span>)} </div> <div className="service-detail-facts"> <div> <Folder className="h-5 w-5" aria-hidden="true"/> <span>Категория</span> <strong>{selectedService.category || "Без категории"}</strong> </div> <div> <Clock className="h-5 w-5" aria-hidden="true"/> <span>Длительность</span> <strong>{selectedService.duration} мин</strong> </div> <div> <Tag className="h-5 w-5" aria-hidden="true"/> <span>Цена</span> <strong>{formatServicePrice(selectedService)}</strong> </div> </div> <div className="service-detail-hero-footer"> <span className={`service-detail-pill ${selectedService.active ? "is-active" : "is-hidden"}`}> {selectedService.active ? "Активна" : "Неактивна"} </span> <span>Цвет в календаре</span> <i aria-hidden="true" style={{ backgroundColor: selectedService.calendarColor || "#0f766e" }}/> </div> </section> <section className="service-detail-card"> <Note className="h-5 w-5" aria-hidden="true"/> <div> <h2>Описание</h2> <p>{selectedService.description || "Описание пока не добавлено."}</p> </div> </section> <section className="service-detail-card service-detail-list-card"> <ListChecks className="h-5 w-5" aria-hidden="true"/> <div> <h2>Что входит</h2> <ul> {includedItems.map((item) => (<li key={item}>{item}</li>))} </ul> </div> </section> <section className="service-detail-card"> <User className="h-5 w-5" aria-hidden="true"/> <div> <h2>Подготовка клиента</h2> <p>{selectedService.preparation || "Особая подготовка не указана."}</p> </div> </section> <section className="service-detail-card service-detail-cost-card"> <Receipt className="h-5 w-5" aria-hidden="true"/> <div> <h2>Материалы / себестоимость</h2> <p><span>{selectedService.materialName || "Расходные материалы"}</span><strong>≈ {(selectedService.materialCost || 0).toLocaleString("ru-RU")} ₽</strong></p> <p><span>Итого себестоимость</span><strong>≈ {(selectedService.materialCost || 0).toLocaleString("ru-RU")} ₽</strong></p> </div> </section> <section className="service-detail-card service-detail-row-card"> <Globe className="h-5 w-5" aria-hidden="true"/> <div> <h2>Онлайн-запись</h2> <p>Доступна для клиентов</p> </div> <strong>{selectedService.onlineBookingEnabled ? "Включена" : "Выключена"}</strong> </section> <section className="service-detail-card service-detail-stats-card"> <ChartLineUp className="h-5 w-5" aria-hidden="true"/> <div> <h2>Статистика</h2> <div> <span>Записей <strong>{selectedServiceStats.count}</strong></span> <span>Средняя длительность <strong>{selectedService.duration} мин</strong></span> <span>Выручка <strong>{selectedServiceStats.revenue.toLocaleString("ru-RU")} ₽</strong></span> </div> </div> </section> <div className="service-detail-actions"> <button type="button" onClick={() => props.editService(selectedService)} className="service-detail-primary"> <PencilSimple className="h-5 w-5" aria-hidden="true"/> Редактировать</button> <button type="button" onClick={() => props.toggleService(selectedService.id)} className="service-detail-secondary"> <Eye className="h-5 w-5" aria-hidden="true"/> {selectedService.active ? "Скрыть" : "Показать"}</button> </div> </div>);
} if (newServiceFormOpen) {
    return (<div className="service-create-screen"> {newServiceFormPanel} </div>);
} return (<div className="services-phone-section space-y-4" onClickCapture={handleServiceSwipeClickCapture} onPointerCancel={handleServiceFilterPointerCancel} onPointerDown={handleServiceFilterPointerDown} onPointerMove={handleServiceFilterPointerMove} onPointerUp={handleServiceFilterPointerUp} onTouchCancel={() => { serviceFilterSwipeStart.current = null; resetServiceFilterMotion(true); }} onTouchEnd={handleServiceFilterTouchEnd} onTouchMove={handleServiceFilterTouchMove} onTouchStart={handleServiceFilterTouchStart}> <label className="services-search-field"> <MagnifyingGlass className="h-5 w-5 shrink-0" aria-hidden="true"/> <input value={serviceSearch} onChange={(event) => setServiceSearch(event.target.value)} placeholder="Поиск услуги"/> </label> <div ref={serviceFiltersRef} className="services-filter-row" aria-label="Фильтры услуг"> {serviceStatusFilters.map(([value, label]) => (<button key={value} type="button" data-service-status-filter={value} onClick={() => selectServiceStatusFilter(value as "all" | "active" | "archive")} className={serviceStatusFilter === value ? "is-active" : ""}> {label}</button>))} <span className="services-filter-underline" aria-hidden="true"/> <select value={serviceCategoryFilter} onChange={(event) => setServiceCategoryFilter(event.target.value)} aria-label="Категории"> <option value="all">Категории</option> {serviceCategories.map((category) => (<option key={category} value={category}> {category} </option>))} </select> </div> <div className="services-list-viewport"> <div ref={serviceListRef} className="services-list-track"> <section className="services-list services-phone-list services-list-panel services-list-current grid"> {services.length === 0 ? (<article className="saas-card p-5 text-center md:p-8 lg:col-span-2"> <p className="text-screenTitle">Пока здесь пусто</p> <p className="mt-2 text-textSecondary">Добавьте первую услугу, и клиенты смогут выбрать её при записи.</p> </article>) : filteredServices.length === 0 ? (<article className="saas-card p-5 text-center md:p-8 lg:col-span-2"> <p className="text-screenTitle">Ничего не найдено</p> <p className="mt-2 text-textSecondary">Попробуйте другой поиск или фильтр.</p> </article>) : (filteredServices.map((service) => { return (<article key={service.id} className={`service-reference-card ${service.active ? "service-reference-card-active" : "service-reference-card-hidden"}`} onClick={() => { props.setServiceOverlayOpen(true); setSelectedServiceId(service.id); }} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    props.setServiceOverlayOpen(true);
    setSelectedServiceId(service.id);
} }}> <div className="service-reference-main"> <div className="service-reference-thumb" aria-hidden={!service.photoUrl}> {service.photoUrl ? (<img src={service.photoUrl} alt={service.title}/>) : (<span>{service.title.trim().slice(0, 1).toLocaleUpperCase("ru-RU") || "У"}</span>)} </div> <div className="service-reference-details"> <div className="service-reference-copy"> <div className="min-w-0"> <h2 className="service-reference-title settings-menu-title-copy" style={settingsMenuTitleStyle}>{service.title}</h2> <p className="service-reference-category"> <span aria-hidden="true" style={{ backgroundColor: service.calendarColor || "#0f766e" }}/> {service.category || "Без категории"} </p> </div> <div className="service-reference-meta"> <span className="service-reference-duration"> <Clock className="h-3.5 w-3.5" aria-hidden="true"/> {service.duration} мин </span> <span className="service-reference-price"> <CurrencyRub className="h-3.5 w-3.5" aria-hidden="true"/> {formatServicePrice(service)} </span> </div> </div> </div> <div className="service-reference-actions" onClick={(event) => event.stopPropagation()}> <span className={`service-reference-status service-reference-status-${service.active ? "active" : "hidden"}`}> <span>{service.active ? "Активна" : "Неактивна"}</span> </span> <button type="button" className="service-reference-menu-button" onPointerDown={(event) => handleServiceMenuPointerDown(event, service.id)} onClick={(event) => handleServiceMenuClick(event, service.id)} aria-label={`Действия для услуги ${service.title}`} aria-expanded={openServiceMenuId === service.id} title="Действия"> <DotsThree className="h-5 w-5" weight="bold" aria-hidden="true"/></button> {(openServiceMenuId === service.id || closingServiceMenuId === service.id) && (<div className="service-reference-menu" data-state={closingServiceMenuId === service.id ? "closing" : "open"} role="menu" aria-label="Действия услуги"> <button type="button" onClick={() => { setOpenServiceMenuId(null); setClosingServiceMenuId(null); props.editService(service); }} role="menuitem"> Редактировать</button> <button type="button" onClick={() => { setOpenServiceMenuId(null); setClosingServiceMenuId(null); props.toggleService(service.id); }} role="menuitem"> {service.active ? "Скрыть" : "Показать"}</button> <button type="button" onClick={() => { setOpenServiceMenuId(null); setClosingServiceMenuId(null); setDeleteTarget((current) => (current?.id === service.id ? null : service)); }} role="menuitem"> Удалить</button> </div>)} </div> </div> <section data-open={props.editingServiceId === service.id} className={`service-edit-panel grid ${props.editingServiceId === service.id ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}> <div className="min-h-0 overflow-hidden"> <form onSubmit={props.addService} onClick={(event) => event.stopPropagation()} className="grid gap-2 border-t border-border bg-background p-3 md:grid-cols-[1.3fr_0.6fr_0.7fr_auto]"> <label className="space-y-1"> <span className="text-sectionLabel text-textSecondary">{"\u041a\u0430\u043a \u043d\u0430\u0437\u043e\u0432\u0451\u043c \u0443\u0441\u043b\u0443\u0433\u0443?"}</span> <input value={props.serviceForm.title} onChange={(event) => props.setServiceForm((current) => ({ ...current, title: event.target.value }))} className="min-h-0 w-full rounded-lg border border-border px-3 py-2 text-settingsRowDescription" placeholder="Название"/> </label> <label className="space-y-1"> <span className="text-sectionLabel text-textSecondary">{"\u0421\u043a\u043e\u043b\u044c\u043a\u043e \u0432\u0440\u0435\u043c\u0435\u043d\u0438?"}</span> <input type="number" min="5" step="5" value={props.serviceForm.duration} onChange={(event) => props.setServiceForm((current) => ({ ...current, duration: event.target.value }))} className="min-h-0 w-full rounded-lg border border-border px-3 py-2 text-settingsRowDescription" placeholder="Мин"/> </label> <label className="space-y-1"> <span className="text-sectionLabel text-textSecondary">{"\u0421\u043a\u043e\u043b\u044c\u043a\u043e \u0441\u0442\u043e\u0438\u0442?"}</span> <input type="number" min="0" value={props.serviceForm.price} onChange={(event) => props.setServiceForm((current) => ({ ...current, price: event.target.value }))} className="min-h-0 w-full rounded-lg border border-border px-3 py-2 text-settingsRowDescription" placeholder="Цена"/> </label> <div className="order-last grid grid-cols-2 gap-2 self-end md:col-span-4 md:flex"> <button type="submit" disabled={props.serviceSaving} className="min-h-0 rounded-lg bg-textPrimary px-3 py-2 text-settingsRowTitle text-surface hover:opacity-90 disabled:cursor-not-allowed disabled:bg-disabledBg disabled:text-disabledText"> {props.serviceSaving ? "Сохраняем..." : "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c"}</button> <button type="button" onClick={props.cancelServiceEdit} className="min-h-0 rounded-lg border border-border bg-surface px-3 py-2 text-settingsRowTitle text-textPrimary hover:bg-background"> {"\u041e\u0442\u043c\u0435\u043d\u0430"}</button> </div> <label className="space-y-1 md:col-span-4"> <span className="text-sectionLabel text-textSecondary">{"\u0427\u0442\u043e \u043a\u043b\u0438\u0435\u043d\u0442\u0443 \u0432\u0430\u0436\u043d\u043e \u0437\u043d\u0430\u0442\u044c?"}</span> <textarea value={props.serviceForm.description} onChange={(event) => props.setServiceForm((current) => ({ ...current, description: event.target.value }))} className="min-h-16 w-full rounded-lg border border-border px-3 py-2 text-settingsRowDescription" placeholder="Описание"/> </label> </form> </div> </section> {deleteTarget?.id === service.id && (<div className="grid"> <div className="min-h-0 overflow-hidden"> <div className="flex flex-col gap-3 bg-background p-3 md:flex-row md:items-center md:justify-between" role="alert" onClick={(event) => event.stopPropagation()}> <div className="flex items-center gap-2 [&>p:last-child]:hidden"> <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-textSecondary"> <ActionIcon name="trash"/> </span> <p className="text-settingsRowTitle text-textPrimary">{"\u0422\u043e\u0447\u043d\u043e \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u044d\u0442\u0443 \u0443\u0441\u043b\u0443\u0433\u0443?"}</p> <p className="text-settingsRowTitle text-textPrimary">Точно удалить эту услугу?</p> </div> <div className="grid grid-cols-2 gap-2 md:w-[260px]"> <button type="button" onClick={() => { props.deleteService(service.id); setDeleteTarget(null); }} className="min-h-0 rounded-lg bg-textPrimary px-3 py-2 text-buttonLabel text-surface hover:opacity-90 [&>span]:text-settingsRowDescription"> <span>{"\u0414\u0430"}</span> Ага</button> <button type="button" onClick={() => setDeleteTarget(null)} className="min-h-0 rounded-lg border border-border bg-surface px-3 py-2 text-buttonLabel text-textPrimary hover:bg-background [&>span]:text-settingsRowDescription"> <span>{"\u041d\u0435\u0442"}</span> Нет</button> </div> </div> </div> </div>)} </article>); }))} </section> {servicePreviewPanels.map((panel) => (<section key={`service-preview-${panel.direction}-${panel.filter}`} className={`services-list services-phone-list services-list-panel services-list-preview services-list-preview-${panel.direction} grid`} aria-hidden="true"> {services.length === 0 ? (<article className="saas-card p-5 text-center md:p-8 lg:col-span-2"> <p className="text-screenTitle">{"\u041f\u043e\u043a\u0430 \u0437\u0434\u0435\u0441\u044c \u043f\u0443\u0441\u0442\u043e"}</p> <p className="mt-2 text-textSecondary">{"\u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u043f\u0435\u0440\u0432\u0443\u044e \u0443\u0441\u043b\u0443\u0433\u0443, \u0438 \u043a\u043b\u0438\u0435\u043d\u0442\u044b \u0441\u043c\u043e\u0433\u0443\u0442 \u0432\u044b\u0431\u0440\u0430\u0442\u044c \u0435\u0435 \u043f\u0440\u0438 \u0437\u0430\u043f\u0438\u0441\u0438."}</p> </article>) : panel.services.length === 0 ? (<article className="saas-card p-5 text-center md:p-8 lg:col-span-2"> <p className="text-screenTitle">{"\u041d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e"}</p> <p className="mt-2 text-textSecondary">{"\u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0434\u0440\u0443\u0433\u043e\u0439 \u043f\u043e\u0438\u0441\u043a \u0438\u043b\u0438 \u0444\u0438\u043b\u044c\u0442\u0440."}</p> </article>) : (panel.services.map((service) => (<article key={`service-preview-${panel.filter}-${service.id}`} className={`service-reference-card ${service.active ? "service-reference-card-active" : "service-reference-card-hidden"}`}> <div className="service-reference-main"> <div className="service-reference-thumb" aria-hidden={!service.photoUrl}> {service.photoUrl ? (<img src={service.photoUrl} alt=""/>) : (<span>{service.title.trim().slice(0, 1).toLocaleUpperCase("ru-RU") || "\u0423"}</span>)} </div> <div className="service-reference-details"> <div className="service-reference-copy"> <div className="min-w-0"> <h2 className="service-reference-title settings-menu-title-copy" style={settingsMenuTitleStyle}>{service.title}</h2> <p className="service-reference-category"> <span aria-hidden="true" style={{ backgroundColor: service.calendarColor || "#0f766e" }}/> {service.category || "\u0411\u0435\u0437 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438"} </p> </div> <div className="service-reference-meta"> <span className="service-reference-duration"> <Clock className="h-3.5 w-3.5" aria-hidden="true"/> {service.duration} {"\u043c\u0438\u043d"} </span> <span className="service-reference-price"> <CurrencyRub className="h-3.5 w-3.5" aria-hidden="true"/> {formatServicePrice(service)} </span> </div> </div> </div> <div className="service-reference-actions"> <span className={`service-reference-status service-reference-status-${service.active ? "active" : "hidden"}`}> <span>{service.active ? "\u0410\u043a\u0442\u0438\u0432\u043d\u0430" : "\u041d\u0435\u0430\u043a\u0442\u0438\u0432\u043d\u0430"}</span> </span> <button type="button" className="service-reference-menu-button" tabIndex={-1} aria-hidden="true"> <DotsThree className="h-5 w-5" weight="bold" aria-hidden="true"/></button> </div> </div> </article>)))} </section>))} </div> </div> <button type="button" className="services-popular-card" onClick={() => setServiceStatusFilter("all")}> <span className="services-popular-icon" aria-hidden="true"> <ChartLineUp className="h-5 w-5"/> </span> <span className="min-w-0"> <strong>Популярные услуги</strong> <small>{popularSummary}</small> </span> <CaretRight className="h-5 w-5" aria-hidden="true"/></button> <p className="services-total-count">Всего услуг: {props.services.length}</p> </div>); }
function ScheduleSection(props: {
    addBlockedTime: (event: React.FormEvent) => void;
    autoTimeSnap: boolean;
    blockForm: typeof emptyBlock;
    blockedTimes: BlockedTime[];
    bookingEnabled: boolean;
    bookingPageSettings: BookingPageSettings;
    bufferMin: number;
    deleteBlockedTime: (id: string) => void;
    openIndividualWorkHoursEditor: boolean;
    openWeekdayEditor: string | null;
    selectedWorkHoursDate: string | null;
    onCloseSelectedWorkHours: () => void;
    saveBookingPageSettings: (settingsOverride?: BookingPageSettings) => Promise<void>;
    saveSchedule: (overrides?: {
        autoTimeSnap?: boolean;
        weeklySchedule?: WeeklySchedule;
        scheduleMode?: ScheduleMode;
        individualPlan?: StoredIndividualSchedulePlan;
    }) => void;
    setAutoTimeSnap: React.Dispatch<React.SetStateAction<boolean>>;
    setBookingPageSettings: React.Dispatch<React.SetStateAction<BookingPageSettings>>;
    setBlockForm: React.Dispatch<React.SetStateAction<typeof emptyBlock>>;
    setBufferMin: React.Dispatch<React.SetStateAction<number>>;
    setBookingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    setOpenWeekdayEditor: React.Dispatch<React.SetStateAction<string | null>>;
    setSchedulePanel: React.Dispatch<React.SetStateAction<SchedulePanel>>;
    setSlotStepMin: React.Dispatch<React.SetStateAction<number>>;
    setWeeklySchedule: React.Dispatch<React.SetStateAction<WeeklySchedule>>;
    setWorkEnd: React.Dispatch<React.SetStateAction<string>>;
    setWorkStart: React.Dispatch<React.SetStateAction<string>>;
    showToast: (message: string) => void;
    schedulePanel: SchedulePanel;
    slotStepMin: number;
    weeklySchedule: WeeklySchedule;
    workEnd: string;
    workStart: string;
}) {
    const [exceptionsOpen, setExceptionsOpen] = useState(false);
    const [bookingWindowOpen, setBookingWindowOpen] = useState(false);
    const [bookingWindowDraft, setBookingWindowDraft] = useState(() => String(props.bookingPageSettings.maxBookingDaysAhead || 14));
    const [deleteBlockedTimeTarget, setDeleteBlockedTimeTarget] = useState<BlockedTime | null>(null);
    const [selectedScheduleMode, setSelectedScheduleMode] = useState<ScheduleMode>(() => getStoredScheduleMode(props.weeklySchedule));
    const savedIndividualPlan = getStoredIndividualPlan(props.weeklySchedule);
    const [cyclePreset, setCyclePreset] = useState<CyclePreset>(savedIndividualPlan?.cyclePreset || "weekdays");
    const [customWorkDays, setCustomWorkDays] = useState(savedIndividualPlan?.customWorkDays || 2);
    const [customOffDays, setCustomOffDays] = useState(savedIndividualPlan?.customOffDays || 2);
    const [individualStartDate, setIndividualStartDate] = useState(() => savedIndividualPlan?.startDate || formatDateKey(new Date()));
    const getIndividualScheduleDraft = () => {
        const cycleSource = scheduleDays.map((day) => props.weeklySchedule[String(day.index)]).find(Boolean);
        const enabledSource = scheduleDays.map((day) => props.weeklySchedule[String(day.index)]).find((value) => value?.enabled);
        const source = withSyncedBreakFields({ ...(cycleSource || enabledSource || defaultScheduleDayRule), enabled: true, start: (cycleSource || enabledSource)?.start || props.workStart || "09:00", end: (cycleSource || enabledSource)?.end || props.workEnd || "18:00" } as DaySchedule);
        return source;
    };
    const [individualWorkSchedule, setIndividualWorkSchedule] = useState<DaySchedule>(() => getIndividualScheduleDraft());
    const [individualWorkHoursOpen, setIndividualWorkHoursOpen] = useState(false);
    const [individualWorkDraft, setIndividualWorkDraft] = useState<DaySchedule>(() => getIndividualScheduleDraft());
    const [breakEditorMode, setBreakEditorMode] = useState<"weekday" | "individual" | null>(null);
    const [breakDraft, setBreakDraft] = useState<BreakPeriod>(() => createBreakPeriod());
    const [breakSheetOffset, setBreakSheetOffset] = useState(0);
    const [breakSheetPhase, setBreakSheetPhase] = useState<"open" | "dragging" | "settling" | "closing">("open");
    const breakSheetSwipeRef = useRef<{ pointerId?: number; startX: number; startY: number; startedAt: number; dragging: boolean } | null>(null);
    const breakSheetElementRef = useRef<HTMLElement | null>(null);
    const breakSheetCloseTimerRef = useRef<number | null>(null);
    const individualEndDate = formatDateKey(addDays(parseDateKey(individualStartDate), 90));
    const individualPlan = useMemo<SchedulePlan>(() => ({
        mode: "cycle",
        startDate: individualStartDate,
        endDate: individualEndDate,
        selectedWeekdays: [],
        cyclePreset,
        customWorkDays,
        customOffDays,
        dayRule: { ...defaultScheduleDayRule, ...individualWorkSchedule },
        dateOverrides: Object.fromEntries(Object.entries(getStoredDateOverrides(props.weeklySchedule)).map(([date, rule]) => [date, { ...defaultScheduleDayRule, ...rule }])),
    }), [cyclePreset, customOffDays, customWorkDays, individualEndDate, individualStartDate, individualWorkSchedule, props.weeklySchedule]);
    const individualCalendarMonths = useMemo(() => buildScheduleMonths(individualPlan, 3), [individualPlan]);
    const activeWeekdayIndex = Number(props.openWeekdayEditor ?? 1);
    const activeWeekday = scheduleDays.find((day) => day.index === activeWeekdayIndex) || scheduleDays[0];
    const activeWeekdayValue = props.weeklySchedule[String(activeWeekday.index)] || defaultWeeklySchedule[String(activeWeekday.index)];
    const selectedWorkHoursSchedule = useMemo(() => props.selectedWorkHoursDate ? getScheduleForDate(parseDateKey(props.selectedWorkHoursDate), props.weeklySchedule, props.workStart, props.workEnd) : null, [props.selectedWorkHoursDate, props.weeklySchedule, props.workEnd, props.workStart]);
    const selectedWorkHoursDateLabel = props.selectedWorkHoursDate ? formatLongDate(parseDateKey(props.selectedWorkHoursDate)) : "";
    const workHoursEditorOpen = individualWorkHoursOpen || Boolean(props.selectedWorkHoursDate);
    const workHoursDraft = props.selectedWorkHoursDate && !individualWorkHoursOpen ? withSyncedBreakFields(selectedWorkHoursSchedule || individualWorkSchedule) : individualWorkDraft;
    const activeWeekdayBreaks = getDayBreaks(activeWeekdayValue);
    const individualWorkBreaks = getDayBreaks(individualWorkSchedule);
    const individualWorkDraftBreaks = getDayBreaks(workHoursDraft);

    useEffect(() => {
        setSelectedScheduleMode(getStoredScheduleMode(props.weeklySchedule));
    }, [props.weeklySchedule]);
    useEffect(() => {
        if (props.schedulePanel !== "individual") {
            setIndividualWorkSchedule(getIndividualScheduleDraft());
        }
    }, [props.schedulePanel, props.weeklySchedule, props.workEnd, props.workStart]);
    useEffect(() => {
        if (props.schedulePanel !== "individual" || !props.openIndividualWorkHoursEditor)
            return;
        setIndividualWorkDraft(withSyncedBreakFields(selectedWorkHoursSchedule || individualWorkSchedule));
        setIndividualWorkHoursOpen(true);
    }, [individualWorkSchedule, props.openIndividualWorkHoursEditor, props.schedulePanel, selectedWorkHoursSchedule]);
    useEffect(() => {
        setBookingWindowDraft(String(props.bookingPageSettings.maxBookingDaysAhead || 14));
    }, [props.bookingPageSettings.maxBookingDaysAhead]);
    const normalizeBookingWindowDays = (value: string | number) => Math.min(365, Math.max(1, Math.round(Number(value)) || 1));
    const bookingWindowDraftNumber = bookingWindowDraft.trim() ? normalizeBookingWindowDays(bookingWindowDraft) : null;
    const updateBookingWindowDraft = (value: string) => {
        const digits = value.replace(/\D/g, "");
        if (!digits) {
            setBookingWindowDraft("");
            return;
        }
        setBookingWindowDraft(String(Math.min(365, Number(digits))));
    };
    const openBookingWindow = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setBookingWindowDraft(String(props.bookingPageSettings.maxBookingDaysAhead || 14));
        window.setTimeout(() => setBookingWindowOpen(true), 0);
    };

    const updateDay = (dayIndex: number, patch: Partial<DaySchedule>) => {
        props.setWeeklySchedule((current) => ({
            ...current,
            [String(dayIndex)]: withSyncedBreakFields({ ...(current[String(dayIndex)] || defaultWeeklySchedule[String(dayIndex)]), ...patch } as DaySchedule),
        }));
    };
    const removeBreak = (dayIndex: number, value: DaySchedule, breakId: string) => {
        const nextBreaks = getDayBreaks(value).filter((item) => item.id !== breakId);
        updateDay(dayIndex, { breaks: nextBreaks, breakEnabled: nextBreaks.length > 0, breakStart: nextBreaks[0]?.start || "13:00", breakEnd: nextBreaks[0]?.end || "14:00" });
    };
    const updateIndividualWorkDraft = (patch: Partial<DaySchedule>) => {
        if (props.selectedWorkHoursDate && !individualWorkHoursOpen) {
            setIndividualWorkHoursOpen(true);
            setIndividualWorkDraft(withSyncedBreakFields({ ...workHoursDraft, ...patch }));
            return;
        }
        setIndividualWorkDraft((current) => withSyncedBreakFields({ ...current, ...patch }));
    };
    useEffect(() => () => {
        if (breakSheetCloseTimerRef.current)
            window.clearTimeout(breakSheetCloseTimerRef.current);
        cleanupBreakSheetWindowListeners();
    }, []);
    const cleanupBreakSheetWindowListeners = () => {
        window.removeEventListener("pointermove", handleBreakSheetWindowPointerMove);
        window.removeEventListener("pointerup", handleBreakSheetWindowPointerUp);
        window.removeEventListener("pointercancel", handleBreakSheetWindowPointerCancel);
        window.removeEventListener("mousemove", handleBreakSheetWindowMouseMove);
        window.removeEventListener("mouseup", handleBreakSheetWindowMouseUp);
        window.removeEventListener("touchmove", handleBreakSheetWindowTouchMove);
        window.removeEventListener("touchend", handleBreakSheetWindowTouchEnd);
        window.removeEventListener("touchcancel", handleBreakSheetWindowTouchCancel);
    };
    const listenBreakSheetWindowGesture = () => {
        cleanupBreakSheetWindowListeners();
        window.addEventListener("pointermove", handleBreakSheetWindowPointerMove, { passive: false });
        window.addEventListener("pointerup", handleBreakSheetWindowPointerUp);
        window.addEventListener("pointercancel", handleBreakSheetWindowPointerCancel);
        window.addEventListener("mousemove", handleBreakSheetWindowMouseMove, { passive: false });
        window.addEventListener("mouseup", handleBreakSheetWindowMouseUp);
        window.addEventListener("touchmove", handleBreakSheetWindowTouchMove, { passive: false });
        window.addEventListener("touchend", handleBreakSheetWindowTouchEnd);
        window.addEventListener("touchcancel", handleBreakSheetWindowTouchCancel);
    };
    const shouldIgnoreBreakSheetSwipe = (target: EventTarget | null) => target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, button, a, .time-wheel-field, .time-wheel-shell, .time-wheel-list, [contenteditable='true']"));
    const openBreakEditor = (mode: "weekday" | "individual", draft: BreakPeriod) => {
        if (breakSheetCloseTimerRef.current) {
            window.clearTimeout(breakSheetCloseTimerRef.current);
            breakSheetCloseTimerRef.current = null;
        }
        setBreakDraft(draft);
        setBreakSheetOffset(0);
        setBreakSheetPhase("open");
        setBreakEditorMode(mode);
    };
    const closeBreakEditor = () => {
        breakSheetSwipeRef.current = null;
        cleanupBreakSheetWindowListeners();
        if (breakSheetCloseTimerRef.current)
            window.clearTimeout(breakSheetCloseTimerRef.current);
        setBreakEditorMode(null);
        setBreakSheetOffset(0);
        setBreakSheetPhase("open");
        breakSheetCloseTimerRef.current = null;
    };
    const openWeekdayBreakEditor = (event?: MouseEvent<HTMLButtonElement>) => {
        event?.preventDefault();
        event?.stopPropagation();
        openBreakEditor("weekday", createBreakPeriod(activeWeekdayBreaks.length));
    };
    const openIndividualBreakEditor = (event?: MouseEvent<HTMLButtonElement>) => {
        event?.preventDefault();
        event?.stopPropagation();
        if (props.selectedWorkHoursDate && !individualWorkHoursOpen) {
            setIndividualWorkHoursOpen(true);
            setIndividualWorkDraft(withSyncedBreakFields(workHoursDraft));
        }
        openBreakEditor("individual", createBreakPeriod(individualWorkDraftBreaks.length));
    };
    const moveBreakSheetSwipe = (clientX: number, clientY: number, sheet: HTMLElement, cancelDefault: () => void) => {
        const swipe = breakSheetSwipeRef.current;
        if (!swipe)
            return;
        const deltaX = clientX - swipe.startX;
        const deltaY = clientY - swipe.startY;
        if (!swipe.dragging && (deltaY < 10 || Math.abs(deltaY) < Math.abs(deltaX) * 1.25))
            return;
        if (deltaY <= 0)
            return;
        if (!swipe.dragging && sheet.scrollTop > 0)
            return;
        swipe.dragging = true;
        cancelDefault();
        setBreakSheetPhase("dragging");
        const maxOffset = Math.max(window.innerHeight, sheet.getBoundingClientRect().height);
        setBreakSheetOffset(Math.min(deltaY, maxOffset));
    };
    const finishBreakSheetSwipe = (clientY: number, cancelDefault: () => void) => {
        const swipe = breakSheetSwipeRef.current;
        if (!swipe)
            return;
        breakSheetSwipeRef.current = null;
        cleanupBreakSheetWindowListeners();
        const deltaY = clientY - swipe.startY;
        const elapsed = Math.max(1, Date.now() - swipe.startedAt);
        const velocity = deltaY / elapsed;
        if (swipe.dragging)
            cancelDefault();
        if (deltaY > 92 || (deltaY > 52 && velocity > 0.45)) {
            closeBreakEditor();
            return;
        }
        setBreakSheetPhase("settling");
        setBreakSheetOffset(0);
        window.setTimeout(() => {
            setBreakSheetPhase((current) => current === "settling" ? "open" : current);
        }, 180);
    };
    function handleBreakSheetWindowPointerMove(event: globalThis.PointerEvent) {
        const swipe = breakSheetSwipeRef.current;
        const sheet = breakSheetElementRef.current;
        if (!swipe || !sheet || swipe.pointerId !== event.pointerId)
            return;
        moveBreakSheetSwipe(event.clientX, event.clientY, sheet, () => { event.preventDefault(); event.stopPropagation(); });
    }
    function handleBreakSheetWindowPointerUp(event: globalThis.PointerEvent) {
        const swipe = breakSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== event.pointerId)
            return;
        finishBreakSheetSwipe(event.clientY, () => { event.preventDefault(); event.stopPropagation(); });
    }
    function handleBreakSheetWindowPointerCancel(event: globalThis.PointerEvent) {
        const swipe = breakSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== event.pointerId)
            return;
        breakSheetSwipeRef.current = null;
        cleanupBreakSheetWindowListeners();
        setBreakSheetPhase("settling");
        setBreakSheetOffset(0);
    }
    function handleBreakSheetWindowMouseMove(event: globalThis.MouseEvent) {
        const swipe = breakSheetSwipeRef.current;
        const sheet = breakSheetElementRef.current;
        if (!swipe || !sheet || swipe.pointerId !== undefined)
            return;
        moveBreakSheetSwipe(event.clientX, event.clientY, sheet, () => { event.preventDefault(); event.stopPropagation(); });
    }
    function handleBreakSheetWindowMouseUp(event: globalThis.MouseEvent) {
        const swipe = breakSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== undefined)
            return;
        finishBreakSheetSwipe(event.clientY, () => { event.preventDefault(); event.stopPropagation(); });
    }
    function handleBreakSheetWindowTouchMove(event: globalThis.TouchEvent) {
        const touch = event.touches[0];
        const sheet = breakSheetElementRef.current;
        if (!touch || !sheet)
            return;
        moveBreakSheetSwipe(touch.clientX, touch.clientY, sheet, () => { event.preventDefault(); event.stopPropagation(); });
    }
    function handleBreakSheetWindowTouchEnd(event: globalThis.TouchEvent) {
        const touch = event.changedTouches[0];
        if (!touch)
            return;
        finishBreakSheetSwipe(touch.clientY, () => { event.preventDefault(); event.stopPropagation(); });
    }
    function handleBreakSheetWindowTouchCancel() {
        breakSheetSwipeRef.current = null;
        cleanupBreakSheetWindowListeners();
        setBreakSheetPhase("settling");
        setBreakSheetOffset(0);
    }
    const beginBreakSheetPointerSwipe = (event: PointerEvent<HTMLElement>) => {
        event.stopPropagation();
        if (shouldIgnoreBreakSheetSwipe(event.target))
            return;
        breakSheetSwipeRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startedAt: Date.now(), dragging: false };
        event.currentTarget.setPointerCapture(event.pointerId);
        breakSheetElementRef.current = event.currentTarget;
        listenBreakSheetWindowGesture();
    };
    const beginBreakSheetMouseSwipe = (event: MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        if (event.button !== 0 || shouldIgnoreBreakSheetSwipe(event.target))
            return;
        if (breakSheetSwipeRef.current?.pointerId !== undefined)
            return;
        breakSheetSwipeRef.current = { startX: event.clientX, startY: event.clientY, startedAt: Date.now(), dragging: false };
        breakSheetElementRef.current = event.currentTarget;
        listenBreakSheetWindowGesture();
    };
    const handleBreakSheetPointerMove = (event: PointerEvent<HTMLElement>) => {
        event.stopPropagation();
        const swipe = breakSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== event.pointerId)
            return;
        moveBreakSheetSwipe(event.clientX, event.clientY, event.currentTarget, () => { event.preventDefault(); });
    };
    const handleBreakSheetPointerUp = (event: PointerEvent<HTMLElement>) => {
        event.stopPropagation();
        const swipe = breakSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== event.pointerId)
            return;
        event.currentTarget.releasePointerCapture(event.pointerId);
        finishBreakSheetSwipe(event.clientY, () => { event.preventDefault(); });
    };
    const cancelBreakSheetPointerSwipe = (event: PointerEvent<HTMLElement>) => {
        const swipe = breakSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== event.pointerId)
            return;
        breakSheetSwipeRef.current = null;
        cleanupBreakSheetWindowListeners();
        setBreakSheetPhase("settling");
        setBreakSheetOffset(0);
    };
    const handleBreakSheetMouseMove = (event: MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        const swipe = breakSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== undefined)
            return;
        moveBreakSheetSwipe(event.clientX, event.clientY, event.currentTarget, () => { event.preventDefault(); });
    };
    const handleBreakSheetMouseUp = (event: MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        const swipe = breakSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== undefined)
            return;
        finishBreakSheetSwipe(event.clientY, () => { event.preventDefault(); });
    };
    const handleBreakSheetTouchStart = (event: TouchEvent<HTMLElement>) => {
        event.stopPropagation();
        const touch = event.touches[0];
        if (!touch || shouldIgnoreBreakSheetSwipe(event.target))
            return;
        breakSheetSwipeRef.current = { startX: touch.clientX, startY: touch.clientY, startedAt: Date.now(), dragging: false };
        breakSheetElementRef.current = event.currentTarget;
        listenBreakSheetWindowGesture();
    };
    const handleBreakSheetTouchMove = (event: TouchEvent<HTMLElement>) => {
        event.stopPropagation();
        const touch = event.touches[0];
        if (!touch)
            return;
        moveBreakSheetSwipe(touch.clientX, touch.clientY, event.currentTarget, () => { event.preventDefault(); });
    };
    const handleBreakSheetTouchEnd = (event: TouchEvent<HTMLElement>) => {
        event.stopPropagation();
        const touch = event.changedTouches[0];
        if (!touch)
            return;
        finishBreakSheetSwipe(touch.clientY, () => { event.preventDefault(); });
    };
    const breakSheetDragStyle = breakSheetPhase === "open" && breakSheetOffset === 0 ? undefined : {
        transform: breakSheetPhase === "closing" ? "translateY(100%)" : breakSheetOffset > 0 ? `translateY(${breakSheetOffset}px)` : "translateY(0)",
        transition: breakSheetPhase === "dragging" ? "none" : "transform .22s cubic-bezier(.22, 1, .36, 1)",
        animation: "none",
        willChange: "transform",
    } as CSSProperties;
    const breakBackdropOpacity = breakSheetPhase === "closing" ? 0 : Math.max(0.08, 0.36 - Math.min(breakSheetOffset, 260) / 260 * 0.22);
    const breakSheetScreenStyle = {
        background: `rgba(17, 27, 33, ${breakBackdropOpacity.toFixed(3)})`,
        transition: breakSheetPhase === "dragging" ? "none" : "background .22s ease-out",
    } as CSSProperties;
    const saveBreakEditor = () => {
        if (!isBreakPeriodValid(breakDraft)) {
            props.showToast("Конец перерыва должен быть позже начала");
            return;
        }
        if (breakEditorMode === "weekday") {
            const currentBreaks = getDayBreaks(activeWeekdayValue);
            if (hasOverlappingBreakPeriod(currentBreaks, breakDraft)) {
                props.showToast("Перерывы не должны пересекаться");
                return;
            }
            const nextBreaks = [...currentBreaks, breakDraft];
            updateDay(activeWeekday.index, { breaks: nextBreaks, breakEnabled: true, breakStart: nextBreaks[0].start, breakEnd: nextBreaks[0].end });
        }
        if (breakEditorMode === "individual") {
            if (hasOverlappingBreakPeriod(individualWorkDraftBreaks, breakDraft)) {
                props.showToast("Перерывы не должны пересекаться");
                return;
            }
            if (props.selectedWorkHoursDate && !individualWorkHoursOpen) {
                const nextBreaks = [...getDayBreaks(workHoursDraft), breakDraft];
                setIndividualWorkHoursOpen(true);
                setIndividualWorkDraft(withSyncedBreakFields({ ...workHoursDraft, breaks: nextBreaks, breakEnabled: true, breakStart: nextBreaks[0].start, breakEnd: nextBreaks[0].end }));
                closeBreakEditor();
                return;
            }
            setIndividualWorkDraft((current) => {
                const nextBreaks = [...getDayBreaks(current), breakDraft];
                return withSyncedBreakFields({ ...current, breaks: nextBreaks, breakEnabled: true, breakStart: nextBreaks[0].start, breakEnd: nextBreaks[0].end });
            });
        }
        closeBreakEditor();
    };
    const removeIndividualBreak = (breakId: string) => {
        if (props.selectedWorkHoursDate && !individualWorkHoursOpen) {
            const nextBreaks = getDayBreaks(workHoursDraft).filter((item) => item.id !== breakId);
            setIndividualWorkHoursOpen(true);
            setIndividualWorkDraft(withSyncedBreakFields({ ...workHoursDraft, breaks: nextBreaks, breakEnabled: nextBreaks.length > 0, breakStart: nextBreaks[0]?.start || "13:00", breakEnd: nextBreaks[0]?.end || "14:00" }));
            return;
        }
        setIndividualWorkDraft((current) => {
            const nextBreaks = getDayBreaks(current).filter((item) => item.id !== breakId);
            return withSyncedBreakFields({ ...current, breaks: nextBreaks, breakEnabled: nextBreaks.length > 0, breakStart: nextBreaks[0]?.start || "13:00", breakEnd: nextBreaks[0]?.end || "14:00" });
        });
    };
    const openIndividualWorkHours = () => {
        setIndividualWorkDraft(withSyncedBreakFields(individualWorkSchedule));
        setIndividualWorkHoursOpen(true);
    };
    const closeIndividualWorkHours = () => {
        if (props.selectedWorkHoursDate) {
            props.onCloseSelectedWorkHours();
            return;
        }
        setIndividualWorkHoursOpen(false);
    };
    const saveIndividualWorkHours = () => {
        const draftToSave = withSyncedBreakFields(workHoursDraft);
        if (props.selectedWorkHoursDate) {
            const nextSchedule = {
                ...props.weeklySchedule,
                __dateOverrides: {
                    ...getStoredDateOverrides(props.weeklySchedule),
                    [props.selectedWorkHoursDate]: draftToSave,
                },
            } as unknown as WeeklySchedule;
            props.saveSchedule({ weeklySchedule: nextSchedule });
            props.onCloseSelectedWorkHours();
            return;
        }
        setIndividualWorkSchedule(draftToSave);
        setIndividualWorkHoursOpen(false);
    };
    const saveWeekdaySchedule = () => {
        props.saveSchedule({ scheduleMode: "weekdays" });
        setSelectedScheduleMode("weekdays");
        props.setSchedulePanel(null);
        props.setOpenWeekdayEditor(null);
    };
    const saveIndividualSchedule = () => {
        const storedPlan: StoredIndividualSchedulePlan = { startDate: individualStartDate, endDate: individualEndDate, cyclePreset, customWorkDays, customOffDays };
        const normalizedIndividualSchedule = withSyncedBreakFields(individualWorkSchedule);
        const individualWeeklySchedule = scheduleDays.reduce<WeeklySchedule>((schedule, day) => {
            const current = props.weeklySchedule[String(day.index)] || defaultWeeklySchedule[String(day.index)];
            schedule[String(day.index)] = withSyncedBreakFields({ ...current, enabled: true, start: normalizedIndividualSchedule.start, end: normalizedIndividualSchedule.end, breakEnabled: normalizedIndividualSchedule.breakEnabled, breakStart: normalizedIndividualSchedule.breakStart, breakEnd: normalizedIndividualSchedule.breakEnd, breaks: normalizedIndividualSchedule.breaks || [] });
            return schedule;
        }, {});
        const dateOverrides = getStoredDateOverrides(props.weeklySchedule);
        if (Object.keys(dateOverrides).length)
            (individualWeeklySchedule as WeeklySchedule & StoredWeeklyScheduleMetadata).__dateOverrides = dateOverrides;
        props.saveSchedule({ weeklySchedule: individualWeeklySchedule, scheduleMode: "cycle", individualPlan: storedPlan });
        setSelectedScheduleMode("cycle");
        props.setSchedulePanel(null);
    };
    const saveBookingWindow = (days: string | number) => {
        const normalizedDays = normalizeBookingWindowDays(days);
        const next = { ...props.bookingPageSettings, maxBookingDaysAhead: normalizedDays };
        setBookingWindowDraft(String(normalizedDays));
        props.setBookingPageSettings(next);
        void props.saveBookingPageSettings(next);
    };

    return (<div className={`schedule-settings-home max-w-5xl space-y-3 ${props.selectedWorkHoursDate ? "date-work-hours-overlay-only" : ""}`}> 
        {!props.selectedWorkHoursDate && (<div className="schedule-setup-grid">
            <div className="schedule-setup-card-shell">
                <button type="button" onClick={() => { props.setOpenWeekdayEditor(null); props.setSchedulePanel("weekdays"); }} className={`schedule-setup-card schedule-setup-card-weekdays ${selectedScheduleMode === "weekdays" ? "schedule-setup-card-selected" : ""}`} aria-pressed={selectedScheduleMode === "weekdays"}>
                    <span className="schedule-setup-art" aria-hidden="true"><span className="schedule-week-art">{weekDays.map((day, index) => <span key={day} className={index < 5 ? "is-workday" : ""}>{day}</span>)}</span></span>
                    <span className="schedule-setup-card-copy"><span className="schedule-setup-title-line"><span>По дням недели</span>{selectedScheduleMode === "weekdays" && <span className="schedule-selected-badge">Выбрано</span>}</span><CaretRight className="schedule-setup-card-chevron" weight="bold" aria-hidden="true"/></span>
                </button>
            </div>
            <div className="schedule-setup-card-shell individual-schedule-panel">
                <button type="button" onClick={() => props.setSchedulePanel("individual")} className={`schedule-setup-card schedule-setup-card-individual ${selectedScheduleMode === "cycle" ? "schedule-setup-card-selected" : ""}`} aria-pressed={selectedScheduleMode === "cycle"}>
                    <span className="schedule-setup-art" aria-hidden="true"><span className="schedule-cycle-art"><span className="schedule-cycle-track"/><span className="schedule-cycle-node schedule-cycle-node-a"/><span className="schedule-cycle-node schedule-cycle-node-b"/><span className="schedule-cycle-node schedule-cycle-node-c"/><span className="schedule-cycle-card"><span/><strong>{customWorkDays}/{customOffDays}</strong></span></span></span>
                    <span className="schedule-setup-card-copy"><span className="schedule-setup-title-line"><span>Индивидуальный график</span>{selectedScheduleMode === "cycle" && <span className="schedule-selected-badge">Выбрано</span>}</span><CaretRight className="schedule-setup-card-chevron" weight="bold" aria-hidden="true"/></span>
                </button>
            </div>
        </div>)}

        {!props.selectedWorkHoursDate && props.schedulePanel === "weekdays" && (<div className="weekday-settings-screen weekday-booksy fixed inset-0 z-50 overflow-y-auto bg-surface">
            <div className="weekday-booksy-shell">
                {props.openWeekdayEditor ? (<>
                    <header className="weekday-booksy-editor-header"><button type="button" onClick={() => props.setOpenWeekdayEditor(null)} className="weekday-booksy-back" aria-label="Назад" title="Назад"><BackArrowIcon /></button><div className="weekday-booksy-title"><h1>{activeWeekday.label}</h1><p>Рабочее время и перерывы</p></div><button type="button" onClick={() => updateDay(activeWeekday.index, { enabled: !activeWeekdayValue.enabled })} className="weekday-booksy-toggle" aria-pressed={activeWeekdayValue.enabled}><SettingsSwitch checked={activeWeekdayValue.enabled}/><span>{activeWeekdayValue.enabled ? "Открыто" : "Выходной"}</span></button></header>
                    <section className="weekday-booksy-time"><TimeRangeWheelPicker className="weekday-booksy-wheel" start={activeWeekdayValue.start} end={activeWeekdayValue.end} startLabel="" endLabel="" onStartChange={(start) => updateDay(activeWeekday.index, { start })} onEndChange={(end) => updateDay(activeWeekday.index, { end })}/></section>
                    <section className="weekday-booksy-breaks"><h2>Перерывы</h2><div className="weekday-booksy-break-list">{activeWeekdayBreaks.map((item) => (<div key={item.id} className="weekday-booksy-break-row"><div className="weekday-booksy-break-summary-bar"><span className="weekday-booksy-break-summary"><span>Перерыв</span><strong>{item.start} - {item.end}</strong></span><button type="button" onClick={() => removeBreak(activeWeekday.index, activeWeekdayValue, item.id)} className="weekday-booksy-break-delete" aria-label="Удалить перерыв" title="Удалить"><Trash weight="bold" aria-hidden="true"/></button></div></div>))}<button type="button" onClick={openWeekdayBreakEditor} className="weekday-booksy-add-break" aria-haspopup="dialog" aria-expanded={breakEditorMode === "weekday"}><span aria-hidden="true">+</span><strong>Добавить перерыв</strong></button></div></section>
                    <div className="weekday-booksy-footer"><button type="button" onClick={() => { props.setSchedulePanel(null); props.setOpenWeekdayEditor(null); }} className="individual-schedule-footer-cancel">Отмена</button><button type="button" onClick={saveWeekdaySchedule}>Сохранить и использовать этот график</button></div>
                </>) : (<>
                    <header className="weekday-booksy-header"><button type="button" onClick={() => props.setSchedulePanel(null)} className="weekday-booksy-back" aria-label="Назад" title="Назад"><BackArrowIcon /></button><div className="weekday-booksy-title"><h1>По дням недели</h1><p>Рабочие часы для каждого дня</p></div></header>
                    <section className="weekday-booksy-list">{scheduleDays.map((day) => { const value = props.weeklySchedule[String(day.index)] || defaultWeeklySchedule[String(day.index)]; return (<button key={day.index} type="button" onClick={() => props.setOpenWeekdayEditor(String(day.index))} className="weekday-booksy-row"><span>{day.label}</span><strong>{value.enabled ? `${value.start} - ${value.end}` : "Выходной"}</strong><CaretRight aria-hidden="true"/></button>); })}</section>
                    <div className="weekday-booksy-footer"><button type="button" onClick={() => props.setSchedulePanel(null)} className="individual-schedule-footer-cancel">Отмена</button><button type="button" onClick={saveWeekdaySchedule}>Сохранить и использовать этот график</button></div>
                </>)}
            </div>
        </div>)}

        {props.schedulePanel === "individual" && (<div className={`individual-schedule-screen fixed inset-0 z-50 overflow-y-auto bg-surface ${workHoursEditorOpen ? "individual-work-hours-screen weekday-booksy" : ""}`} data-dashboard-swipe-ignore="true">
            {workHoursEditorOpen ? (<>
                <div className="individual-schedule-content w-full bg-surface px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+0.25rem)] md:px-8 md:pb-8 md:pt-4">
                    <div className="individual-schedule-header grid grid-cols-[2.5rem_1fr] items-start gap-2"><button type="button" onClick={closeIndividualWorkHours} className="individual-schedule-back flex h-10 w-10 min-h-0 items-center justify-center rounded-full bg-surface text-textPrimary" aria-label="Назад" title="Назад"><BackArrowIcon className="h-6 w-6"/></button><div className="min-w-0"><h2 className="text-navigationTitle text-textPrimary">Установить часы работы</h2><p className="mt-1 text-settingsRowDescription text-textSecondary">{props.selectedWorkHoursDate ? `Только на ${selectedWorkHoursDateLabel}. Другие даты не изменятся.` : "Эти часы и перерывы будут применяться ко всем рабочим дням индивидуального графика."}</p></div></div>
                    <article className="individual-schedule-card mt-7 space-y-4"><section className="weekday-booksy-time"><TimeRangeWheelPicker className="weekday-booksy-wheel" start={workHoursDraft.start} end={workHoursDraft.end} startLabel="" endLabel="" onStartChange={(start) => updateIndividualWorkDraft({ start })} onEndChange={(end) => updateIndividualWorkDraft({ end })}/></section><section className="weekday-booksy-breaks"><h2>Перерывы</h2><div className="weekday-booksy-break-list">{individualWorkDraftBreaks.map((item) => (<div key={item.id} className="weekday-booksy-break-row"><div className="weekday-booksy-break-summary-bar"><span className="weekday-booksy-break-summary"><span>Перерыв</span><strong>{item.start} - {item.end}</strong></span><button type="button" onClick={() => removeIndividualBreak(item.id)} className="weekday-booksy-break-delete" aria-label="Удалить перерыв" title="Удалить"><Trash weight="bold" aria-hidden="true"/></button></div></div>))}<button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={openIndividualBreakEditor} className="weekday-booksy-add-break" aria-haspopup="dialog" aria-expanded={breakEditorMode === "individual"}><span aria-hidden="true">+</span><strong>Добавить перерыв</strong></button></div></section></article>
                    <div className="individual-work-hours-footer mt-3 grid gap-2"><button type="button" onClick={closeIndividualWorkHours} className="individual-schedule-footer-cancel">Отмена</button><button type="button" onClick={saveIndividualWorkHours} className="flex h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-conversationName leading-none text-surface">Сохранить</button></div>
                </div>
            </>) : (<>
                <div className="individual-schedule-content w-full bg-surface px-3 pb-[calc(env(safe-area-inset-bottom)+5.75rem)] pt-[calc(env(safe-area-inset-top)+0.25rem)] md:px-8 md:pb-28 md:pt-4">
                    <div className="individual-schedule-header grid grid-cols-[2.5rem_1fr] items-start gap-2"><button type="button" onClick={() => props.setSchedulePanel(null)} className="individual-schedule-back flex h-10 w-10 min-h-0 items-center justify-center rounded-full bg-surface text-textPrimary" aria-label="Назад" title="Назад"><BackArrowIcon className="h-6 w-6"/></button><div className="min-w-0"><h2 className="text-navigationTitle text-textPrimary">Индивидуальный график</h2></div></div>
                    <article className="individual-schedule-card mt-7 space-y-4">
                        <div className="individual-preset-list grid gap-2">
                            {[["all", "Все дни"], ["weekdays", "Будни"], ["odd", "Нечетные"], ["even", "Четные"], ["custom", "Своя схема"]].map(([value, label]) => (
                                <button key={value} type="button" onClick={() => setCyclePreset(value as CyclePreset)} className={`individual-preset-button ${cyclePreset === value ? "individual-preset-button-active" : ""}`}>{label}</button>
                            ))}
                        </div>
                        <section className={`individual-custom-schedule grid gap-4 ${cyclePreset === "custom" ? "" : "individual-custom-schedule-preview"}`}>
                            {cyclePreset === "custom" && (
                                <div className="grid gap-2 rounded-2xl bg-background p-3 md:grid-cols-2">
                                    <NumberField label="Рабочих дней" value={customWorkDays} onChange={setCustomWorkDays}/>
                                    <NumberField label="Нерабочих дней" value={customOffDays} onChange={setCustomOffDays}/>
                                    <p className="text-settingsRowDescription text-textSecondary md:col-span-2">Схема: {customWorkDays} рабочих / {customOffDays} выходных. Нажмите на дату в календаре, чтобы сделать ее первым рабочим днем.</p>
                                </div>
                            )}
                            <button type="button" onClick={openIndividualWorkHours} className="schedule-menu-row saas-card flex w-full items-center justify-between gap-3 p-3 text-left md:p-4">
                                <span className="settings-menu-copy min-w-0 flex-1 text-left">
                                    <span className="schedule-title-settings-copy settings-menu-title-copy block text-textPrimary" style={settingsMenuTitleStyle}>Установить часы работы</span>
                                    <span className="schedule-subtitle-settings-copy settings-menu-subtitle-copy block text-textSecondary">{individualWorkSchedule.start} - {individualWorkSchedule.end}{individualWorkBreaks.length ? ` · перерывов: ${individualWorkBreaks.length}` : " · без перерывов"}</span>
                                </span>
                                <CaretRight className="settings-menu-chevron h-5 w-5 shrink-0 text-textDisabled" weight="bold" aria-hidden="true"/>
                            </button>
                            {cyclePreset === "custom" && <p className="individual-start-date-hint text-settingsRowTitle text-textPrimary">Нажмите на дату с которой начать отчёт</p>}
                            <div className="individual-calendar-grid grid gap-3 xl:grid-cols-3">
                                {individualCalendarMonths.map((month) => (
                                    <section key={month.key} className="individual-calendar-month rounded-2xl bg-background p-3">
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <h4 className="text-conversationName capitalize text-textPrimary">{month.title}</h4>
                                            <span className="text-messageMetadata text-textSecondary">{month.workingDays} / {month.totalDays}</span>
                                        </div>
                                        <div className="grid grid-cols-7 gap-1 text-center text-messageMetadata text-textSecondary">{weekDays.map((day) => <span key={day}>{day}</span>)}</div>
                                        <div className="mt-1 grid grid-cols-7 gap-1">
                                            {month.cells.map((cell) => {
                                                const isStart = cyclePreset === "custom" && cell.date === individualStartDate;
                                                return (<button key={cell.date} type="button" onClick={() => setIndividualStartDate(cell.date)} className={`individual-calendar-day ${cell.rule.enabled ? "individual-calendar-day-work" : ""} ${isStart ? "individual-calendar-day-start" : ""} ${cell.inMonth ? "" : "individual-calendar-day-muted"}`} aria-pressed={isStart}><span>{cell.day}</span></button>);
                                            })}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        </section>
                    </article>
                </div>
                <div className="individual-schedule-footer fixed inset-x-0 bottom-0 z-[60] bg-surface px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 md:px-8"><button type="button" onClick={() => props.setSchedulePanel(null)} className="individual-schedule-footer-cancel">Отмена</button><button type="button" onClick={saveIndividualSchedule} className="flex h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-conversationName leading-none text-surface">Сохранить и использовать этот график</button></div>
            </>)}
        </div>)}

        {breakEditorMode && typeof document !== "undefined" && createPortal((
            <div className="master-workspace">
                <DraggableBottomSheetFrame screenClassName="schedule-exception-time-modal weekday-break-time-modal" panelClassName="schedule-exception-time-panel weekday-booksy weekday-break-time-panel" labelledBy="weekday-break-title" onClose={closeBreakEditor}>
                    <div className="schedule-exception-time-content weekday-break-editor grid gap-3">
                        <div className="client-bottom-sheet-header">
                            <div className="min-w-0">
                                <p id="weekday-break-title" className="text-conversationName text-textPrimary">Добавить перерыв</p>
                                <p className="mt-1 text-settingsRowDescription text-textSecondary">Выберите время начала и окончания перерыва.</p>
                            </div>
                            <button type="button" onClick={closeBreakEditor} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background text-textPrimary hover:bg-background" aria-label="Закрыть" title="Закрыть">
                                <CloseIcon />
                            </button>
                        </div>
                        <section className="weekday-booksy-time">
                            <TimeRangeWheelPicker className="weekday-booksy-wheel" start={breakDraft.start} end={breakDraft.end} startLabel="" endLabel="" onStartChange={(start) => setBreakDraft((current) => ({ ...current, start }))} onEndChange={(end) => setBreakDraft((current) => ({ ...current, end }))}/>
                        </section>
                        <div className="weekday-break-actions grid grid-cols-2 gap-2 md:flex md:flex-row">
                            <button type="button" onClick={closeBreakEditor} className="weekday-break-cancel w-full rounded-xl px-4 py-3 text-buttonLabel">Отмена</button>
                            <button type="button" onClick={saveBreakEditor} className="schedule-exception-close-time-button weekday-break-submit w-full rounded-xl px-4 py-3 text-buttonLabel text-surface"><span>Добавить</span></button>
                        </div>
                    </div>
                </DraggableBottomSheetFrame>
            </div>
        ), document.body)}

        <div className="schedule-secondary-spacer" aria-hidden="true"/>
        <section className="schedule-secondary-menu">
            <button type="button" onClick={() => setExceptionsOpen(true)} className="schedule-menu-row saas-card flex w-full items-center justify-between p-3 text-left md:p-4"><span className="settings-menu-icon settings-menu-icon-exceptions"><SettingsGlyph name="exceptions"/></span><span className="settings-menu-copy min-w-0 flex-1 text-left"><span className="schedule-title-settings-copy settings-menu-title-copy block text-textPrimary" style={settingsMenuTitleStyle}>Исключения графика</span><span className="schedule-subtitle-settings-copy settings-menu-subtitle-copy block text-textSecondary">Отпуск, выходной, личные часы или разовый перерыв.</span></span><span className="schedule-block-count rounded-full bg-background px-3 py-1 text-settingsRowDescription text-textSecondary">{props.blockedTimes.length} блок.</span><CaretRight className="settings-menu-chevron h-5 w-5 shrink-0 text-textDisabled" weight="bold" aria-hidden="true"/></button>
            <button type="button" role="switch" aria-checked={props.autoTimeSnap} onClick={() => { props.setAutoTimeSnap((value) => !value); props.saveSchedule({ autoTimeSnap: !props.autoTimeSnap }); }} className="schedule-menu-row schedule-toggle-row saas-card flex w-full items-center justify-between gap-3 p-3 text-left transition md:p-4"><span className="settings-menu-icon settings-menu-icon-time-snap"><SettingsGlyph name="time-snap"/></span><span className="settings-menu-copy min-w-0 flex-1 text-left"><span className="schedule-title-settings-copy settings-menu-title-copy block text-textPrimary" style={settingsMenuTitleStyle}>Автоприлипание времени</span><span className="schedule-subtitle-settings-copy settings-menu-subtitle-copy block text-textSecondary">Клиенты видят свободные слоты дня</span></span><SettingsSwitch checked={props.autoTimeSnap}/></button>
            <button type="button" onClick={() => props.setBookingEnabled((value) => !value)} className="schedule-menu-row schedule-toggle-row saas-card flex w-full items-center justify-between gap-3 p-3 text-left transition md:p-4"><span className="settings-menu-icon settings-menu-icon-online"><SettingsGlyph name="online"/></span><span className="settings-menu-copy min-w-0 flex-1 text-left"><span className="schedule-title-settings-copy settings-menu-title-copy block text-textPrimary" style={settingsMenuTitleStyle}>Онлайн-запись</span><span className="schedule-subtitle-settings-copy settings-menu-subtitle-copy block text-textSecondary">{props.bookingEnabled ? "Клиенты могут записываться сами" : "Запись с клиентской страницы закрыта"}</span></span><SettingsSwitch checked={props.bookingEnabled}/></button>
            <button type="button" onClick={openBookingWindow} className="schedule-menu-row saas-card flex w-full items-center justify-between gap-3 p-3 text-left md:p-4" aria-haspopup="dialog" aria-expanded={bookingWindowOpen}><span className="settings-menu-icon settings-menu-icon-calendar"><SettingsGlyph name="calendar"/></span><span className="settings-menu-copy min-w-0 flex-1 text-left"><span className="schedule-title-settings-copy settings-menu-title-copy block text-textPrimary" style={settingsMenuTitleStyle}>Запись на дни вперёд</span><span className="schedule-subtitle-settings-copy settings-menu-subtitle-copy block text-textSecondary">Клиенты могут выбрать дату на {props.bookingPageSettings.maxBookingDaysAhead || 14} дн. вперёд</span></span><CaretRight className="settings-menu-chevron h-5 w-5 shrink-0 text-textDisabled" weight="bold" aria-hidden="true"/></button>
        </section>
        {bookingWindowOpen && typeof document !== "undefined" && createPortal((
            <div className="master-workspace">
                <DraggableBottomSheetFrame screenClassName="address-bottom-sheet-screen booking-window-bottom-sheet-screen" panelClassName="address-bottom-sheet booking-window-bottom-sheet" labelledBy="booking-window-title" onClose={() => setBookingWindowOpen(false)}>
                        <div className="grid gap-3">
                            <header className="client-bottom-sheet-header">
                                <div className="min-w-0">
                                    <p id="booking-window-title" className="text-conversationName text-textPrimary">Запись на дни вперёд</p>
                                    <p className="mt-1 text-settingsRowDescription text-textSecondary">Сколько дней в календаре доступно клиентам для онлайн-записи.</p>
                                </div>
                                <button type="button" onClick={() => setBookingWindowOpen(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background text-textPrimary hover:bg-background" aria-label="Закрыть" title="Закрыть">
                                    <CloseIcon />
                                </button>
                            </header>
                            <div className="booking-window-presets grid grid-cols-2 gap-2">
                                {[7, 14, 30, 60].map((days) => (<button key={days} type="button" onClick={() => setBookingWindowDraft(String(days))} className={`booking-window-step rounded-xl px-4 py-3 text-buttonLabel ${bookingWindowDraftNumber === days ? "individual-preset-button-active" : ""}`} aria-pressed={bookingWindowDraftNumber === days}>{days} дн.</button>))}
                            </div>
                            <label className="booking-window-field block space-y-2">
                                <span className="text-settingsRowTitle text-textPrimary">Свое значение</span>
                                <input type="number" min="1" max="365" inputMode="numeric" value={bookingWindowDraft} onChange={(event) => updateBookingWindowDraft(event.target.value)} onBlur={() => bookingWindowDraftNumber === null ? undefined : setBookingWindowDraft(String(bookingWindowDraftNumber))} className="settings-input min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-messageInput text-textPrimary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" />
                                <span className="block text-settingsRowDescription text-textSecondary">Можно указать от 1 до 365 дней.</span>
                            </label>
                            <div className="booking-window-summary rounded-xl border border-border bg-surface p-3.5 text-center">
                                <p className="text-settingsRowDescription text-textSecondary">Сейчас клиенты видят даты на</p>
                                <strong className="mt-1 block text-navigationTitle text-textPrimary">{bookingWindowDraftNumber === null ? "укажите значение" : `${bookingWindowDraftNumber} дн. вперёд`}</strong>
                            </div>
                            <footer className="client-bottom-sheet-actions grid gap-2">
                                <button type="button" onClick={() => setBookingWindowOpen(false)} className="address-form-cancel w-full rounded-xl px-4 py-3 text-buttonLabel shadow-none">Отмена</button>
                                <button type="button" disabled={bookingWindowDraftNumber === null} onClick={() => { if (bookingWindowDraftNumber === null) return; saveBookingWindow(bookingWindowDraftNumber); setBookingWindowOpen(false); }} className="address-form-submit w-full rounded-xl px-4 py-3 text-buttonLabel">
                                    Сохранить
                                </button>
                            </footer>
                        </div>
                </DraggableBottomSheetFrame>
            </div>
        ), document.body)}
        {exceptionsOpen && (<div className="exceptions-screen fixed inset-0 z-50 overflow-y-auto bg-surface"><div className="exceptions-screen-content w-full bg-surface px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+0.25rem)] md:px-8 md:pb-8 md:pt-4"><div className="exceptions-screen-title grid grid-cols-[2.5rem_1fr] items-center gap-2"><button type="button" onClick={() => setExceptionsOpen(false)} className="flex h-10 w-10 min-h-0 items-center justify-center rounded-full bg-surface text-textPrimary" aria-label="Назад" title="Назад"><BackArrowIcon className="h-6 w-6"/></button><h2 className="min-w-0 truncate text-navigationTitle text-textPrimary">Исключения графика</h2></div><div className="exceptions-screen-body"><ScheduleExceptionEditor addBlockedTime={props.addBlockedTime} blockForm={props.blockForm} blockedTimes={props.blockedTimes} setBlockForm={props.setBlockForm}/><section className="exceptions-blocked-list grid gap-2">{props.blockedTimes.map((item) => { const confirming = deleteBlockedTimeTarget?.id === item.id; return (<article key={item.id} className={`exceptions-blocked-card ${confirming ? "exceptions-blocked-card-confirming" : ""}`}><div className="min-w-0 flex-1"><p className="truncate text-conversationName text-textPrimary">{formatLongDate(parseDateKey(item.date))}</p><span className="exceptions-blocked-time">{item.start}-{item.end}</span> <span className="exceptions-blocked-reason min-w-0 truncate text-messageMetadata">{item.reason}</span>{confirming && (<div className="exceptions-delete-confirm" role="alert"><p>Удалить это исключение графика?</p><div><button type="button" onClick={() => { props.deleteBlockedTime(item.id); setDeleteBlockedTimeTarget(null); }}>Удалить</button><button type="button" onClick={() => setDeleteBlockedTimeTarget(null)}>Отмена</button></div></div>)}</div><button type="button" onClick={() => setDeleteBlockedTimeTarget(item)} className="exceptions-blocked-delete" aria-label="Удалить исключение" title="Удалить"><ActionIcon name="trash"/></button></article>); })}</section></div></div></div>)}
    </div>);
}
function ScheduleExceptionEditor({ addBlockedTime, blockForm, blockedTimes, setBlockForm, }: {
    addBlockedTime: (event: React.FormEvent) => void;
    blockForm: typeof emptyBlock;
    blockedTimes: BlockedTime[];
    setBlockForm: React.Dispatch<React.SetStateAction<typeof emptyBlock>>;
}) { const [timePickerOpen, setTimePickerOpen] = useState(false); const selectedDate = parseDateKey(blockForm.date); const [visibleMonth, setVisibleMonth] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)); useEffect(() => { setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)); }, [blockForm.date, selectedDate.getFullYear(), selectedDate.getMonth()]); const calendarCells = useMemo(() => { const year = visibleMonth.getFullYear(); const month = visibleMonth.getMonth(); const firstDay = new Date(year, month, 1); const lastDay = new Date(year, month + 1, 0); const leadingDays = (firstDay.getDay() + 6) % 7; const cells: Array<{
    date: Date;
    inMonth: boolean;
}> = []; for (let index = 0; index < leadingDays; index += 1) {
    cells.push({ date: addDays(firstDay, index - leadingDays), inMonth: false });
} for (let day = 1; day <= lastDay.getDate(); day += 1) {
    cells.push({ date: new Date(year, month, day), inMonth: true });
} while (cells.length % 7 !== 0) {
    cells.push({ date: addDays(lastDay, cells.length - leadingDays - lastDay.getDate() + 1), inMonth: false });
} return cells; }, [visibleMonth]); const blockedDates = useMemo(() => { const dates = new Map<string, number>(); blockedTimes.forEach((item) => dates.set(item.date, (dates.get(item.date) || 0) + 1)); return dates; }, [blockedTimes]); const selectDate = (date: Date) => { setBlockForm((current) => ({ ...current, date: formatDateKey(date) })); }; const changeVisibleMonth = (offset: number) => { setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1)); }; const submitBlockedTime = (event: React.FormEvent) => { if (blockForm.start < blockForm.end)
    setTimePickerOpen(false); addBlockedTime(event); }; return (<form onSubmit={submitBlockedTime} className="schedule-exception-editor grid gap-4"> <section className="schedule-exception-calendar rounded-2xl bg-background p-3"> <div className="mb-3 grid grid-cols-[44px_1fr_44px] items-center gap-2"> <button type="button" onClick={() => changeVisibleMonth(-1)} className="flex h-11 min-h-0 items-center justify-center rounded-xl bg-surface text-screenTitle text-textPrimary" aria-label="Предыдущий месяц" title="Предыдущий месяц"> <CaretLeft className="h-5 w-5" weight="bold" aria-hidden="true"/></button> <div className="min-w-0 rounded-xl bg-surface px-3 py-2 text-center"> <p className="truncate text-conversationName text-textPrimary">{formatMonth(visibleMonth)}</p> <p className="truncate text-messageMetadata text-textSecondary">{formatLongDate(selectedDate)}</p> </div> <button type="button" onClick={() => changeVisibleMonth(1)} className="flex h-11 min-h-0 items-center justify-center rounded-xl bg-surface text-screenTitle text-textPrimary" aria-label="Следующий месяц" title="Следующий месяц"> <CaretRight className="h-5 w-5" weight="bold" aria-hidden="true"/></button> </div> <div className="grid grid-cols-7 gap-1 text-center"> {weekDays.map((day) => (<span key={day} className="py-1 text-messageMetadata text-textSecondary"> {day} </span>))} {calendarCells.map((cell) => { const dateKey = formatDateKey(cell.date); const selected = dateKey === blockForm.date; const today = dateKey === formatDateKey(new Date()); const blockedCount = blockedDates.get(dateKey) || 0; return (<button key={dateKey} type="button" onClick={() => selectDate(cell.date)} className={`schedule-exception-day relative flex aspect-square min-h-0 items-center justify-center rounded-xl text-buttonLabel transition ${selected ? "schedule-exception-day-selected text-surface" : cell.inMonth ? "bg-surface text-textPrimary" : "bg-surface/60 text-textSecondary"}`} aria-pressed={selected}> <span>{cell.date.getDate()}</span> {blockedCount > 0 && (<span className={`schedule-exception-day-marker ${selected ? "schedule-exception-day-marker-selected" : ""}`} aria-label={`Исключений: ${blockedCount}`}> {blockedCount} </span>)} {today && !selected && !blockedCount && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" aria-hidden="true"/>}</button>); })} </div> </section> <button type="button" onClick={() => setTimePickerOpen(true)} className="schedule-exception-time-button w-full truncate rounded-xl px-4 py-3 text-center text-buttonLabel"> Задать время на {formatLongDate(selectedDate)}</button> {timePickerOpen && (<DraggableBottomSheetFrame screenClassName="schedule-exception-time-modal" panelClassName="schedule-exception-time-panel weekday-booksy" onClose={() => setTimePickerOpen(false)}> <div className="schedule-exception-time-content grid gap-3"> <div className="flex items-start justify-between gap-3"> <div className="min-w-0"> <p className="truncate text-conversationName text-textPrimary">Время исключения</p> <p className="truncate text-settingsRowDescription text-textSecondary">{formatLongDate(selectedDate)}</p> </div> <button type="button" onClick={() => setTimePickerOpen(false)} className="flex h-9 w-9 min-h-0 shrink-0 items-center justify-center rounded-full bg-background text-textPrimary" aria-label="Закрыть" title="Закрыть"> <CloseIcon /></button> </div> <section className="weekday-booksy-time"> <TimeRangeWheelPicker className="weekday-booksy-wheel" start={blockForm.start} end={blockForm.end} startLabel="" endLabel="" onStartChange={(start) => setBlockForm((current) => ({ ...current, start }))} onEndChange={(end) => setBlockForm((current) => ({ ...current, end }))}/> </section> <textarea value={blockForm.reason} onChange={(event) => setBlockForm((current) => ({ ...current, reason: event.target.value }))} className="mb-3 min-h-12 w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-settingsRowDescription" placeholder="Например: перерыв, отпуск, личные дела"/> <button type="submit" className="schedule-exception-close-time-button w-full rounded-xl px-4 py-3 text-buttonLabel text-surface"> <span>Закрыть это время</span> <span className="schedule-exception-close-time-x" aria-hidden="true"> <Check weight="bold"/> </span></button> </div> </DraggableBottomSheetFrame>)} </form>); }
function NumberField({ label, onChange, onFocus, value }: {
    label: string;
    onChange: (value: number) => void;
    value: number;
    onFocus?: () => void;
}) { return (<label className="space-y-1"> <span className="text-sectionLabel text-textSecondary">{label}</span> <input type="number" min="0" value={value} onFocus={(event) => { onFocus?.(); event.currentTarget.select(); }} onChange={(event) => { onFocus?.(); onChange(Math.max(0, Number(event.target.value) || 0)); }} className="w-full rounded-lg border border-border px-3 py-2 text-settingsRowDescription"/> </label>); }
function AnalyticsSection({ appointments, activeServices, blockedTimes, compact = false, services, weeklySchedule = defaultWeeklySchedule, workEnd = "20:00", workStart = "09:00", }: {
    appointments: Appointment[];
    activeServices: number;
    blockedTimes: BlockedTime[];
    compact?: boolean;
    services: Service[];
    weeklySchedule?: WeeklySchedule;
    workEnd?: string;
    workStart?: string;
}) {
    const todayKey = formatDateKey(new Date());
    const [periodMode, setPeriodMode] = useState<"day" | "week" | "month" | "year">("week");
    const [selectedDate, setSelectedDate] = useState(todayKey);
    const [selectedChartKey, setSelectedChartKey] = useState<string | null>(null);
    const [selectedPeakDayKey, setSelectedPeakDayKey] = useState(todayKey);
    const [selectedPeakHour, setSelectedPeakHour] = useState<number | null>(null);
    const [popularServicesExpanded, setPopularServicesExpanded] = useState(false);
    const [analyticsWindow, setAnalyticsWindow] = useState({ dayBefore: 30, monthBefore: 24, weekBefore: 20, yearBefore: 10 });
    const [analyticsScrollNonce, setAnalyticsScrollNonce] = useState(0);
    const analyticsChartRef = useRef<HTMLDivElement | null>(null);
    const analyticsExtendingRef = useRef(false);
    const analyticsPendingScrollShiftRef = useRef(0);
    const analyticsUserScrollRef = useRef(false);
    const getWeekStart = (date: Date) => addDays(date, -((date.getDay() + 6) % 7));
    const getPeriodRange = (dateKey: string, mode: "day" | "week" | "month" | "year") => { const date = parseDateKey(dateKey); if (mode === "day")
        return { start: date, end: date }; if (mode === "week") {
        const start = getWeekStart(date);
        return { start, end: addDays(start, 6) };
    } if (mode === "month") {
        const start = new Date(date.getFullYear(), date.getMonth(), 1);
        return { start, end: new Date(date.getFullYear(), date.getMonth() + 1, 0) };
    } return { start: new Date(date.getFullYear(), 0, 1), end: new Date(date.getFullYear(), 11, 31) }; };
    const getPreviousPeriodRange = (range: {
        start: Date;
        end: Date;
    }, mode: "day" | "week" | "month" | "year") => { if (mode === "month") {
        const start = new Date(range.start.getFullYear(), range.start.getMonth() - 1, 1);
        return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 0) };
    } if (mode === "year") {
        const year = range.start.getFullYear() - 1;
        return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };
    } const days = Math.round((range.end.getTime() - range.start.getTime()) / 86400000) + 1; return { start: addDays(range.start, -days), end: addDays(range.start, -1) }; };
    const periodRange = getPeriodRange(selectedDate, periodMode);
    const previousPeriodRange = getPreviousPeriodRange(periodRange, periodMode);
    const periodStartDate = periodRange.start;
    const referenceEndDate = periodRange.end;
    const previousPeriodStartDate = previousPeriodRange.start;
    const previousPeriodEndDate = previousPeriodRange.end;
    const periodStartKey = formatDateKey(periodStartDate);
    const periodEndKey = formatDateKey(referenceEndDate);
    const previousPeriodStartKey = formatDateKey(previousPeriodStartDate);
    const previousPeriodEndKey = formatDateKey(previousPeriodEndDate);
    const periodAppointments = appointments.filter((item) => item.date >= periodStartKey && item.date <= periodEndKey);
    const previousPeriodAppointments = appointments.filter((item) => item.date >= previousPeriodStartKey && item.date <= previousPeriodEndKey);
    const periodBlockedTimes = blockedTimes.filter((item) => item.date >= periodStartKey && item.date <= periodEndKey);
    const previousPeriodBlockedTimes = blockedTimes.filter((item) => item.date >= previousPeriodStartKey && item.date <= previousPeriodEndKey);
    const getClientKey = (appointment: Appointment) => (appointment.phone || appointment.client || "").trim();
    const clientAppointmentCounts = appointments.reduce<Record<string, number>>((counts, appointment) => { const key = getClientKey(appointment); if (!key)
        return counts; counts[key] = (counts[key] || 0) + 1; return counts; }, {});
    const periodClientKeys = Array.from(new Set(periodAppointments.map(getClientKey).filter(Boolean)));
    const previousPeriodClientKeys = Array.from(new Set(previousPeriodAppointments.map(getClientKey).filter(Boolean)));
    const newClients = periodClientKeys.filter((key) => clientAppointmentCounts[key] === 1).length;
    const previousNewClients = previousPeriodClientKeys.filter((key) => clientAppointmentCounts[key] === 1).length;
    const returningClients = periodClientKeys.filter((key) => clientAppointmentCounts[key] > 1).length;
    const previousReturningClients = previousPeriodClientKeys.filter((key) => clientAppointmentCounts[key] > 1).length;
    const returningPercent = periodClientKeys.length ? Math.round((returningClients / periodClientKeys.length) * 100) : 0;
    const previousReturningPercent = previousPeriodClientKeys.length ? Math.round((previousReturningClients / previousPeriodClientKeys.length) * 100) : 0;
    const newPercent = periodClientKeys.length ? Math.round((newClients / periodClientKeys.length) * 100) : 0;
    const getAverageCheck = (items: Appointment[]) => { const billableAppointments = items.filter((item) => getAppointmentPrice(item, services) > 0); return billableAppointments.length ? Math.round(billableAppointments.reduce((sum, appointment) => sum + getAppointmentPrice(appointment, services), 0) / billableAppointments.length) : 0; };
    const averageCheck = getAverageCheck(periodAppointments);
    const previousAverageCheck = getAverageCheck(previousPeriodAppointments);
    const cancellations = periodAppointments.filter((item) => isNoShowAppointment(item)).length;
    const previousCancellations = previousPeriodAppointments.filter((item) => isNoShowAppointment(item)).length;
    const getAppointmentSource = (appointment: Appointment) => { const item = appointment as Appointment & {
        source?: string;
        bookingSource?: string;
        booking_source?: string;
        channel?: string;
    }; return String(item.source || item.bookingSource || item.booking_source || item.channel || "").trim().toLowerCase(); };
    const onlineBookings = periodAppointments.filter((item) => getAppointmentSource(item).includes("online") || getAppointmentSource(item).includes("онлайн")).length;
    const previousOnlineBookings = previousPeriodAppointments.filter((item) => getAppointmentSource(item).includes("online") || getAppointmentSource(item).includes("онлайн")).length;
    const onlineBookingPercent = periodAppointments.length ? Math.round((onlineBookings / periodAppointments.length) * 100) : 0;
    const previousOnlineBookingPercent = previousPeriodAppointments.length ? Math.round((previousOnlineBookings / previousPeriodAppointments.length) * 100) : 0;
    const loadPercent = getRangeLoadPercent(periodStartDate, referenceEndDate, periodAppointments, services, weeklySchedule, workStart, workEnd);
    const previousLoadPercent = getRangeLoadPercent(previousPeriodStartDate, previousPeriodEndDate, previousPeriodAppointments, services, weeklySchedule, workStart, workEnd);
    const averageDuration = periodAppointments.length ? Math.round(periodAppointments.reduce((sum, appointment) => sum + getAppointmentDuration(appointment, services), 0) / periodAppointments.length) : 0;
    const previousAverageDuration = previousPeriodAppointments.length ? Math.round(previousPeriodAppointments.reduce((sum, appointment) => sum + getAppointmentDuration(appointment, services), 0) / previousPeriodAppointments.length) : 0;
    const formatNumberDelta = (current: number, previous: number, suffix = "") => { const diff = current - previous; const previousLabel = periodMode === "day" ? "вчера" : periodMode === "week" ? "к прошлой неделе" : periodMode === "month" ? "к прошлому месяцу" : "к прошлому году"; if (diff === 0)
        return `0${suffix} ${previousLabel}`; return `${diff > 0 ? "+" : ""}${diff}${suffix} ${previousLabel} ${diff > 0 ? "^" : "v"}`; };
    const formatPercentDelta = (current: number, previous: number) => formatNumberDelta(current, previous, " п.п.");
    const formatMoneyDelta = (current: number, previous: number) => formatNumberDelta(current - previous, 0, " ₽");
    const hourLabels = Array.from({ length: 13 }, (_, index) => index + 8);
    const countAppointmentsInRange = (startKey: string, endKey: string) => appointments.filter((item) => item.date >= startKey && item.date <= endKey).length;
    const getChartItemAppointments = (key: string) => { if (periodMode === "day")
        return appointments.filter((appointment) => appointment.date === key); if (periodMode === "week") {
        const weekStart = parseDateKey(key);
        const weekEndKey = formatDateKey(addDays(weekStart, 6));
        return appointments.filter((appointment) => appointment.date >= key && appointment.date <= weekEndKey);
    } if (periodMode === "month") {
        const monthStart = parseDateKey(key);
        const monthEndKey = formatDateKey(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0));
        return appointments.filter((appointment) => appointment.date >= key && appointment.date <= monthEndKey);
    } const year = parseDateKey(key).getFullYear(); const yearStartKey = formatDateKey(new Date(year, 0, 1)); const yearEndKey = formatDateKey(new Date(year, 11, 31)); return appointments.filter((appointment) => appointment.date >= yearStartKey && appointment.date <= yearEndKey); };
    const currentChartRange = getPeriodRange(todayKey, periodMode);
    const currentChartStartKey = formatDateKey(currentChartRange.start);
    const futureBarCount = 10;
    const chartData = periodMode === "day" ? Array.from({ length: analyticsWindow.dayBefore + futureBarCount + 1 }, (_, index) => { const date = addDays(parseDateKey(todayKey), index - analyticsWindow.dayBefore); const key = formatDateKey(date); return { key, dateKey: key, label: date.toLocaleDateString("ru-RU", { weekday: "short" }).replace(".", ""), dateLabel: date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }).replace(".", ""), value: countAppointmentsInRange(key, key), isActive: key === todayKey, }; }) : periodMode === "week" ? Array.from({ length: analyticsWindow.weekBefore + futureBarCount + 1 }, (_, index) => { const weekStart = addDays(getWeekStart(parseDateKey(todayKey)), (index - analyticsWindow.weekBefore) * 7); const weekEnd = addDays(weekStart, 6); const key = formatDateKey(weekStart); const startMonth = weekStart.toLocaleDateString("ru-RU", { month: "short" }).replace(".", ""); const endMonth = weekEnd.toLocaleDateString("ru-RU", { month: "short" }).replace(".", ""); return { key, dateKey: key, label: `${weekStart.getDate()}-${weekEnd.getDate()}`, dateLabel: startMonth === endMonth ? startMonth : `${startMonth}-...`, value: countAppointmentsInRange(key, formatDateKey(weekEnd)), isActive: key === currentChartStartKey, }; }) : periodMode === "month" ? Array.from({ length: analyticsWindow.monthBefore + futureBarCount + 1 }, (_, index) => { const anchor = parseDateKey(todayKey); const monthStart = new Date(anchor.getFullYear(), anchor.getMonth() - analyticsWindow.monthBefore + index, 1); const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0); const key = formatDateKey(monthStart); return { key, dateKey: key, label: monthStart.toLocaleDateString("ru-RU", { month: "short" }).replace(".", ""), dateLabel: String(monthStart.getFullYear()), value: countAppointmentsInRange(key, formatDateKey(monthEnd)), isActive: key === currentChartStartKey, }; }) : Array.from({ length: analyticsWindow.yearBefore + futureBarCount + 1 }, (_, index) => { const anchor = parseDateKey(todayKey); const year = anchor.getFullYear() - analyticsWindow.yearBefore + index; const yearStart = new Date(year, 0, 1); const yearEnd = new Date(year, 11, 31); const key = formatDateKey(yearStart); return { key, dateKey: key, label: String(year), dateLabel: "год", value: countAppointmentsInRange(key, formatDateKey(yearEnd)), isActive: key === currentChartStartKey, }; });
    const maxDailyAppointments = Math.max(...chartData.map((item) => item.value), 1);
    const chartScaleMax = Math.max(5, Math.ceil(maxDailyAppointments / 5) * 5);
    const detailAppointments = selectedChartKey ? getChartItemAppointments(selectedChartKey) : periodAppointments;
    const detailRange = selectedChartKey ? getPeriodRange(selectedChartKey, periodMode) : periodRange;
    const previousDetailRange = getPreviousPeriodRange(detailRange, periodMode);
    const detailStartKey = formatDateKey(detailRange.start);
    const detailEndKey = formatDateKey(detailRange.end);
    const previousDetailStartKey = formatDateKey(previousDetailRange.start);
    const previousDetailEndKey = formatDateKey(previousDetailRange.end);
    const previousDetailAppointments = appointments.filter((item) => item.date >= previousDetailStartKey && item.date <= previousDetailEndKey);
    const detailBlockedTimes = blockedTimes.filter((item) => item.date >= detailStartKey && item.date <= detailEndKey);
    const previousDetailBlockedTimes = blockedTimes.filter((item) => item.date >= previousDetailStartKey && item.date <= previousDetailEndKey);
    const detailClientKeys = Array.from(new Set(detailAppointments.map(getClientKey).filter(Boolean)));
    const previousDetailClientKeys = Array.from(new Set(previousDetailAppointments.map(getClientKey).filter(Boolean)));
    const detailNewClients = detailClientKeys.filter((key) => clientAppointmentCounts[key] === 1).length;
    const previousDetailNewClients = previousDetailClientKeys.filter((key) => clientAppointmentCounts[key] === 1).length;
    const detailReturningClients = detailClientKeys.filter((key) => clientAppointmentCounts[key] > 1).length;
    const previousDetailReturningClients = previousDetailClientKeys.filter((key) => clientAppointmentCounts[key] > 1).length;
    const detailReturningPercent = detailClientKeys.length ? Math.round((detailReturningClients / detailClientKeys.length) * 100) : 0;
    const previousDetailReturningPercent = previousDetailClientKeys.length ? Math.round((previousDetailReturningClients / previousDetailClientKeys.length) * 100) : 0;
    const detailNewPercent = detailClientKeys.length ? Math.round((detailNewClients / detailClientKeys.length) * 100) : 0;
    const detailAverageCheck = getAverageCheck(detailAppointments);
    const previousDetailAverageCheck = getAverageCheck(previousDetailAppointments);
    const detailCancellations = detailAppointments.filter((item) => isNoShowAppointment(item)).length;
    const previousDetailCancellations = previousDetailAppointments.filter((item) => isNoShowAppointment(item)).length;
    const detailOnlineBookings = detailAppointments.filter((item) => getAppointmentSource(item).includes("online") || getAppointmentSource(item).includes("онлайн")).length;
    const previousDetailOnlineBookings = previousDetailAppointments.filter((item) => getAppointmentSource(item).includes("online") || getAppointmentSource(item).includes("онлайн")).length;
    const detailOnlineBookingPercent = detailAppointments.length ? Math.round((detailOnlineBookings / detailAppointments.length) * 100) : 0;
    const previousDetailOnlineBookingPercent = previousDetailAppointments.length ? Math.round((previousDetailOnlineBookings / previousDetailAppointments.length) * 100) : 0;
    const detailLoadPercent = getRangeLoadPercent(detailRange.start, detailRange.end, detailAppointments, services, weeklySchedule, workStart, workEnd);
    const previousDetailLoadPercent = getRangeLoadPercent(previousDetailRange.start, previousDetailRange.end, previousDetailAppointments, services, weeklySchedule, workStart, workEnd);
    const detailAverageDuration = detailAppointments.length ? Math.round(detailAppointments.reduce((sum, appointment) => sum + getAppointmentDuration(appointment, services), 0) / detailAppointments.length) : 0;
    const previousDetailAverageDuration = previousDetailAppointments.length ? Math.round(previousDetailAppointments.reduce((sum, appointment) => sum + getAppointmentDuration(appointment, services), 0) / previousDetailAppointments.length) : 0;
    const serviceStats = services.map((service) => ({ id: service.id, title: service.title, count: detailAppointments.filter((item) => getAppointmentServiceIds(item).includes(service.id)).length, })).filter((item) => item.count > 0).sort((a, b) => b.count - a.count);
    const serviceRows = serviceStats.map((item, index, rows) => { const total = rows.reduce((sum, row) => sum + row.count, 0) || 1; return { ...item, percent: Math.round((item.count / total) * 100), tone: ["violet", "rose", "pink", "sand"][index] || "violet" }; });
    const topServiceCount = Math.max(...serviceRows.map((item) => item.count), 1);
    const peakDays = Array.from({ length: 7 }, (_, index) => { const date = addDays(detailRange.start, index); return { key: formatDateKey(date), label: weekDays[(date.getDay() + 6) % 7], }; });
    const selectedPeakDayAppointments = detailAppointments.filter((item) => item.date === selectedPeakDayKey);
    const peakBars = hourLabels.map((hour) => selectedPeakDayAppointments.filter((item) => timeToMinutes(item.time) >= hour * 60 && timeToMinutes(item.time) < (hour + 1) * 60).length);
    const maxPeakCount = Math.max(...peakBars, 1);
    const naturalPeakHourIndex = peakBars.findIndex((value) => value === maxPeakCount && value > 0);
    const activePeakHour = selectedPeakHour ?? (naturalPeakHourIndex >= 0 ? hourLabels[naturalPeakHourIndex] : null);
    const activePeakHourIndex = activePeakHour === null ? -1 : hourLabels.indexOf(activePeakHour);
    const peakHourLabel = activePeakHour !== null ? `${String(activePeakHour).padStart(2, "0")}:00 - ${String(activePeakHour + 1).padStart(2, "0")}:00` : "Нет данных";
    const activePeakCount = activePeakHourIndex >= 0 ? peakBars[activePeakHourIndex] : 0;
    const bookedTimeEntries = Object.entries(detailAppointments.reduce<Record<string, number>>((counts, appointment) => {
        counts[appointment.time] = (counts[appointment.time] || 0) + 1;
        return counts;
    }, {})).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
    const mostBookedTime = bookedTimeEntries[0];
    const mostBookedTimeText = mostBookedTime ? `За выбранный период клиенты чаще всего записывались на ${mostBookedTime[0]}${mostBookedTime[1] > 1 ? ` (${mostBookedTime[1]} записей)` : ""}.` : "За выбранный период записей пока нет.";
    const periodOptions = [{ mode: "day" as const, label: "День" }, { mode: "week" as const, label: "Неделя" }, { mode: "month" as const, label: "Месяц" }, { mode: "year" as const, label: "Год" },];
    const activeChartKey = periodMode === "day" ? todayKey : currentChartStartKey;
    const showAnalyticsDetails = selectedChartKey !== null;
    const selectPeriodMode = (mode: "day" | "week" | "month" | "year") => { setPeriodMode(mode); const nextRange = getPeriodRange(todayKey, mode); setSelectedChartKey(null); setSelectedPeakDayKey(formatDateKey(nextRange.start)); setSelectedPeakHour(null); setPopularServicesExpanded(false); analyticsUserScrollRef.current = false; setAnalyticsScrollNonce((current) => current + 1); };
    const selectChartItem = (item: {
        key: string;
        dateKey?: string;
    }) => { setSelectedChartKey(item.key); if (item.dateKey)
        setSelectedPeakDayKey(item.dateKey); setSelectedPeakHour(null); setPopularServicesExpanded(false); };
    const markAnalyticsChartScroll = () => { analyticsUserScrollRef.current = true; };
    const handleAnalyticsInfiniteScroll = () => { const chart = analyticsChartRef.current; if (!chart || analyticsExtendingRef.current || !analyticsUserScrollRef.current)
        return; const leftEdge = chart.scrollLeft; if (leftEdge > 260)
        return; const columns = Array.from(chart.querySelectorAll<HTMLElement>(".finance-chart-column[data-date-key]")); const first = columns[0]; const second = columns[1]; const step = first && second ? second.offsetLeft - first.offsetLeft : first ? first.offsetWidth + 8 : 56; const chunk = periodMode === "day" ? 60 : periodMode === "week" ? 52 : periodMode === "month" ? 24 : 10; analyticsExtendingRef.current = true; analyticsPendingScrollShiftRef.current += step * chunk; setAnalyticsWindow((current) => periodMode === "day" ? { ...current, dayBefore: current.dayBefore + chunk } : periodMode === "week" ? { ...current, weekBefore: current.weekBefore + chunk } : periodMode === "month" ? { ...current, monthBefore: current.monthBefore + chunk } : { ...current, yearBefore: current.yearBefore + chunk }); };
    useLayoutEffect(() => { const chart = analyticsChartRef.current; if (!chart)
        return; const selectedColumn = chart.querySelector<HTMLElement>(`.analytics-reference-chart-column[data-date-key="${activeChartKey}"]`); selectedColumn?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }); }, [activeChartKey, analyticsScrollNonce, periodMode]);
    useEffect(() => { const chart = analyticsChartRef.current; if (!chart)
        return; if (analyticsPendingScrollShiftRef.current) {
        const previousScrollBehavior = chart.style.scrollBehavior;
        chart.style.scrollBehavior = "auto";
        chart.scrollLeft += analyticsPendingScrollShiftRef.current;
        chart.style.scrollBehavior = previousScrollBehavior;
        analyticsPendingScrollShiftRef.current = 0;
    } analyticsExtendingRef.current = false; }, [analyticsWindow]);
    return (<div className={compact ? "analytics-reference-screen analytics-reference-compact" : "analytics-reference-screen"}> <div className="analytics-reference-periods" role="tablist" aria-label="Период" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}> {periodOptions.map((period) => (<button key={period.mode} type="button" className={periodMode === period.mode ? "is-active" : ""} onClick={() => selectPeriodMode(period.mode)} role="tab" aria-selected={periodMode === period.mode}> {period.label}</button>))} </div> <section className="analytics-reference-kpi-grid"> <AnalyticsMetric icon={<CalendarBlank weight="regular"/>} tone="violet" label="Записи" value={detailAppointments.length.toString()} delta={formatNumberDelta(detailAppointments.length, previousDetailAppointments.length)}/> <AnalyticsMetric icon={<User weight="regular"/>} tone="blue" label="Новые клиенты" value={detailNewClients.toString()} delta={formatNumberDelta(detailNewClients, previousDetailNewClients)}/> <AnalyticsMetric icon={<ChartLineUp weight="regular"/>} tone="green" label="Повторные" value={detailReturningClients.toString()} delta={formatNumberDelta(detailReturningClients, previousDetailReturningClients)}/> <AnalyticsMetric icon={<Gauge weight="regular"/>} tone="orange" label="Загрузка" value={`${detailLoadPercent}%`} delta={formatPercentDelta(detailLoadPercent, previousDetailLoadPercent)}/> </section> <article className="analytics-reference-card analytics-reference-chart-card finance-reference-chart-card"> <div className="analytics-reference-card-header"> <h2>Динамика записей</h2> </div> <div className="analytics-reference-bar-chart finance-chart-frame" data-dashboard-swipe-ignore="true"> <div ref={analyticsChartRef} className={`analytics-reference-chart-bars insights-chart finance-chart finance-chart-peek-window finance-chart-peek-${periodMode}`} onScroll={handleAnalyticsInfiniteScroll} onPointerDown={markAnalyticsChartScroll} onTouchStart={markAnalyticsChartScroll} onWheel={markAnalyticsChartScroll}> {chartData.map((item) => (<button key={item.key} type="button" className="analytics-reference-chart-column insights-chart-column finance-chart-column" data-date-key={item.key} data-empty={item.value === 0} data-active={item.isActive ? "true" : undefined} data-selected={selectedChartKey === item.key ? "true" : undefined} onClick={() => selectChartItem(item)} aria-label={`${item.label}: ${item.value} записей`}> <div className="insights-chart-bar-wrap" style={{ "--finance-bar-height": `${Math.max(item.value ? 10 : 3, (item.value / chartScaleMax) * 100)}%` } as CSSProperties}> <span>{item.value ? item.value.toString() : ""}</span> <div className="insights-chart-bar" style={{ height: "var(--finance-bar-height)" }}/> </div> <small className="finance-chart-date"><span>{item.label}</span> {item.dateLabel && <em>{item.dateLabel}</em>}</small></button>))} </div> </div> </article> {showAnalyticsDetails && (<> <section className="analytics-reference-kpi-grid analytics-reference-kpi-grid-secondary"> <AnalyticsMetric icon={<Wallet weight="regular"/>} tone="violet" label="Средний чек" value={`${detailAverageCheck.toLocaleString("ru-RU")} ₽`} delta={formatMoneyDelta(detailAverageCheck, previousDetailAverageCheck)}/> <AnalyticsMetric icon={<ChartLineUp weight="regular"/>} tone="blue" label="Конверсия онлайн-записи" value={`${detailOnlineBookingPercent}%`} delta={formatPercentDelta(detailOnlineBookingPercent, previousDetailOnlineBookingPercent)}/> <AnalyticsMetric icon={<XCircle weight="regular"/>} tone="rose" label="Отмены" value={detailCancellations.toString()} delta={formatNumberDelta(detailCancellations, previousDetailCancellations)}/> <AnalyticsMetric icon={<Clock weight="regular"/>} tone="green" label="Среднее время услуги" value={`${detailAverageDuration} мин`} delta={formatNumberDelta(detailAverageDuration, previousDetailAverageDuration, " мин")}/> </section> <article className="analytics-reference-card analytics-reference-services"> <div className="analytics-reference-card-header"> <h2>Популярные услуги</h2> {serviceRows.length > 3 && (<button type="button" className="analytics-reference-link" onClick={() => setPopularServicesExpanded((current) => !current)} aria-expanded={popularServicesExpanded}>{popularServicesExpanded ? "Свернуть" : "Смотреть все"}</button>)} </div> <div className="analytics-reference-service-list"> {serviceRows.length === 0 ? (<p className="analytics-reference-empty">Нет записей с услугами за выбранный период.</p>) : serviceRows.map((item, index) => (<div key={item.id} className="analytics-reference-service-row" data-collapsed={!popularServicesExpanded && index >= 3 ? "true" : undefined}> <span className={`analytics-reference-service-icon tone-${item.tone}`} aria-hidden="true">{item.title.slice(0, 1)}</span> <p>{item.title}</p> <div><span style={{ width: `${Math.max(14, (item.count / topServiceCount) * 100)}%` }}/></div> <strong>{item.count} записей</strong> <em>{item.percent}%</em> </div>))} </div> </article> <section className="analytics-reference-small-grid"> <article className="analytics-reference-card analytics-reference-clients"> <h2><Users className="h-4 w-4" weight="regular" aria-hidden="true"/> Клиенты</h2> <div className="analytics-reference-client-ring"> <div><span>Новые</span><strong>{detailNewPercent}%</strong><em>{detailNewClients} клиентов</em></div> <span className="analytics-reference-donut" style={{ "--returning": `${detailReturningPercent}%` } as CSSProperties} aria-hidden="true"/> <div><span>Постоянные</span><strong>{detailReturningPercent}%</strong><em>{detailReturningClients} клиента</em></div> </div> </article> <article className="analytics-reference-card analytics-reference-return"> <h2><ChartLineUp className="h-4 w-4" weight="regular" aria-hidden="true"/> Возвращаемость</h2> <strong>{detailReturningPercent}%</strong> <p>клиентов выбранного периода уже были в базе ранее</p> </article> </section> <article className="analytics-reference-card analytics-reference-booking-time"><span className="analytics-reference-booking-time-icon" aria-hidden="true"><CalendarCheck weight="regular"/></span><p>{mostBookedTimeText}</p></article> </>)} </div>);
}
function AnalyticsMetric({ icon, label, tone, value }: {
    delta: string;
    icon: ReactNode;
    label: string;
    tone: string;
    value: string;
}) {
    return (<article className="analytics-reference-metric"> <span className={`analytics-reference-metric-icon tone-${tone}`}>{icon}</span> <p>{label}</p> <strong>{value}</strong> </article>);
}
function ClientsSection(props: {
    appointments: Appointment[];
    cancelClientEdit: () => void;
    clientForm: typeof emptyClient;
    clientFormOpen: boolean;
    compactClients: boolean;
    clients: Client[];
    deleteClient: (id: string) => void;
    editClient: (client: Client) => void;
    editingClientId: string | null;
    saveClient: (event?: React.FormEvent) => void;
    services: Service[];
    setCompactClients: React.Dispatch<React.SetStateAction<boolean>>;
    setClientForm: React.Dispatch<React.SetStateAction<typeof emptyClient>>;
    setClientFormOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
    const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
    const [expandedCompactClientId, setExpandedCompactClientId] = useState<string | null>(null);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [clientProfileEditMode, setClientProfileEditMode] = useState<"identity" | "notes" | null>(null);
    const [clientFilter, setClientFilter] = useState<"all" | "regular" | "new">("all");
    const clientFiltersRef = useRef<HTMLDivElement | null>(null);
    const clientListRef = useRef<HTMLDivElement | null>(null);
    const clientFilterDragFrame = useRef<number | null>(null);
    const clientFilterPendingDelta = useRef(0);
    const clientFilterCommitTimer = useRef<number | null>(null);
    const clientFilterSwipeStart = useRef<{
        captured: boolean;
        x: number;
        y: number;
        pointerId?: number;
        time: number;
    } | null>(null);
    const clientFilterSwipeSuppressClickUntil = useRef(0);
    const clientCardOpenSuppressUntil = useRef(0);
    const clientFilters = useMemo(() => [["all", "Все"], ["regular", "Постоянные"], ["new", "Новые"],] as const, []);
    const setClientFilterUnderlinePosition = (index: number, transition = true) => { const tabList = clientFiltersRef.current; const buttons = tabList ? Array.from(tabList.querySelectorAll<HTMLButtonElement>("button")) : []; const button = buttons[index]; if (!tabList || !button)
        return; const listRect = tabList.getBoundingClientRect(); const buttonRect = button.getBoundingClientRect(); tabList.style.setProperty("--client-filter-underline-left", `${buttonRect.left - listRect.left + 13.6}px`); tabList.style.setProperty("--client-filter-underline-width", `${Math.max(16, buttonRect.width - 27.2)}px`); tabList.style.setProperty("--client-filter-underline-transition", transition ? "transform .24s ease, width .24s ease" : "none"); };
    const resetClientFilterUnderlinePosition = (transition = true) => { const currentIndex = clientFilters.findIndex(([value]) => value === clientFilter); setClientFilterUnderlinePosition(currentIndex, transition); };
    const setClientFilterListDrag = (deltaX: number, transition = false) => { const list = clientListRef.current; if (!list)
        return; const maxOffset = Math.max(1, Math.min(window.innerWidth, list.getBoundingClientRect().width || window.innerWidth)); const offset = Math.max(-maxOffset, Math.min(maxOffset, deltaX)); const opacity = 1; list.style.setProperty("--client-filter-track-offset", `${offset}px`); list.style.setProperty("--client-filter-list-opacity", `${opacity}`); list.style.setProperty("--client-filter-list-transition", transition ? "transform .24s cubic-bezier(.22, 1, .36, 1), opacity .24s ease" : "none"); };
    const resetClientFilterListDrag = (transition = true) => { const list = clientListRef.current; if (!list)
        return; list.style.setProperty("--client-filter-track-offset", "0px"); list.style.setProperty("--client-filter-list-opacity", "1"); list.style.setProperty("--client-filter-list-transition", transition ? "transform .22s ease, opacity .22s ease" : "none"); };
    const applyClientFilterSwipeFrame = (deltaX: number) => { const currentIndex = clientFilters.findIndex(([value]) => value === clientFilter); const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1; const tabList = clientFiltersRef.current; const buttons = tabList ? Array.from(tabList.querySelectorAll<HTMLButtonElement>("button")) : []; const currentButton = buttons[currentIndex]; const nextButton = buttons[nextIndex]; if (!tabList || !currentButton || !nextButton)
        return; const listRect = tabList.getBoundingClientRect(); const currentRect = currentButton.getBoundingClientRect(); const nextRect = nextButton.getBoundingClientRect(); const progress = Math.min(1, Math.abs(deltaX) / Math.min(160, Math.max(96, window.innerWidth * 0.38))); const currentLeft = currentRect.left - listRect.left + 13.6; const nextLeft = nextRect.left - listRect.left + 13.6; const currentWidth = Math.max(16, currentRect.width - 27.2); const nextWidth = Math.max(16, nextRect.width - 27.2); tabList.style.setProperty("--client-filter-underline-left", `${currentLeft + (nextLeft - currentLeft) * progress}px`); tabList.style.setProperty("--client-filter-underline-width", `${currentWidth + (nextWidth - currentWidth) * progress}px`); tabList.style.setProperty("--client-filter-underline-transition", "none"); setClientFilterListDrag(deltaX); };
    const requestClientFilterSwipeFrame = (deltaX: number) => { clientFilterPendingDelta.current = deltaX; if (clientFilterDragFrame.current !== null)
        return; clientFilterDragFrame.current = window.requestAnimationFrame(() => { clientFilterDragFrame.current = null; applyClientFilterSwipeFrame(clientFilterPendingDelta.current); }); };
    const resetClientFilterMotion = (transition = true) => { if (clientFilterDragFrame.current !== null) {
        window.cancelAnimationFrame(clientFilterDragFrame.current);
        clientFilterDragFrame.current = null;
    } resetClientFilterUnderlinePosition(transition); resetClientFilterListDrag(transition); };
    const selectClientFilter = (nextFilter: "all" | "regular" | "new") => { if (nextFilter === clientFilter)
        return; setClientFilter(nextFilter); };
    const commitClientFilterSwipe = (nextFilter: "all" | "regular" | "new", direction: "next" | "prev") => { const track = clientListRef.current; const targetIndex = clientFilters.findIndex(([value]) => value === nextFilter); setClientFilterUnderlinePosition(targetIndex, true); if (!track) {
        setClientFilter(nextFilter);
        return;
    } if (clientFilterDragFrame.current !== null) {
        window.cancelAnimationFrame(clientFilterDragFrame.current);
        clientFilterDragFrame.current = null;
    } track.style.setProperty("--client-filter-track-offset", direction === "next" ? "-100%" : "100%"); track.style.setProperty("--client-filter-list-opacity", "1"); track.style.setProperty("--client-filter-list-transition", "transform .24s cubic-bezier(.22, 1, .36, 1), opacity .24s ease"); const finishCommit = () => { if (clientFilterCommitTimer.current !== null)
        window.clearTimeout(clientFilterCommitTimer.current); clientFilterCommitTimer.current = null; track.removeEventListener("transitionend", handleTransitionEnd); setClientFilter(nextFilter); }; const handleTransitionEnd = (event: TransitionEvent) => { if (event.target === track && event.propertyName === "transform")
        finishCommit(); }; track.addEventListener("transitionend", handleTransitionEnd); if (clientFilterCommitTimer.current !== null)
        window.clearTimeout(clientFilterCommitTimer.current); clientFilterCommitTimer.current = window.setTimeout(() => { finishCommit(); }, 320); };
    useLayoutEffect(() => { resetClientFilterMotion(false); const handleResize = () => resetClientFilterUnderlinePosition(false); window.addEventListener("resize", handleResize); return () => { if (clientFilterDragFrame.current !== null)
        window.cancelAnimationFrame(clientFilterDragFrame.current); if (clientFilterCommitTimer.current !== null)
        window.clearTimeout(clientFilterCommitTimer.current); window.removeEventListener("resize", handleResize); }; }, [clientFilter]);
    useEffect(() => { if (!props.compactClients)
        setExpandedCompactClientId(null); }, [props.compactClients]);
    const clientFormPanelOpen = props.clientFormOpen;
    const isClientEditing = Boolean(props.editingClientId);
    const [query, setQuery] = useState("");
    const normalizedQuery = query.trim().toLowerCase();
    const filteredClients = useMemo(() => { return props.clients.filter((client) => { const matchesQuery = !normalizedQuery || `${client.name} ${client.phone} ${client.notes}`.toLowerCase().includes(normalizedQuery); const matchesFilter = clientFilter === "all" || (clientFilter === "regular" && client.visits > 1) || (clientFilter === "new" && client.visits <= 1); return matchesQuery && matchesFilter; }); }, [clientFilter, normalizedQuery, props.clients]);
    const filterClientsByStatus = (filter: "all" | "regular" | "new") => props.clients.filter((client) => { const matchesQuery = !normalizedQuery || `${client.name} ${client.phone} ${client.notes}`.toLowerCase().includes(normalizedQuery); const matchesFilter = filter === "all" || (filter === "regular" && client.visits > 1) || (filter === "new" && client.visits <= 1); return matchesQuery && matchesFilter; });
    const clientFilterCounts = useMemo(() => ({ all: filterClientsByStatus("all").length, regular: filterClientsByStatus("regular").length, new: filterClientsByStatus("new").length }), [normalizedQuery, props.clients]);
    const clientFilterIndex = clientFilters.findIndex(([value]) => value === clientFilter);
    const previousClientFilter = clientFilters[clientFilterIndex - 1]?.[0] || null;
    const nextClientFilter = clientFilters[clientFilterIndex + 1]?.[0] || null;
    const clientPreviewPanels = [previousClientFilter ? { direction: "prev" as const, filter: previousClientFilter, clients: filterClientsByStatus(previousClientFilter) } : null, nextClientFilter ? { direction: "next" as const, filter: nextClientFilter, clients: filterClientsByStatus(nextClientFilter) } : null,].filter((item): item is {
        direction: "next" | "prev";
        filter: "all" | "regular" | "new";
        clients: Client[];
    } => Boolean(item));
    const activeClient = selectedClient ? props.clients.find((client) => client.id === selectedClient.id) || selectedClient : null;
    const activeClientEditing = Boolean(activeClient && props.editingClientId === activeClient.id && clientProfileEditMode);
    const activeClientIdentityEditing = activeClientEditing && clientProfileEditMode === "identity";
    const activeClientNotesEditing = activeClientEditing && clientProfileEditMode === "notes";
    const getClientFilterSwipeTarget = (deltaX: number) => { const currentIndex = clientFilters.findIndex(([value]) => value === clientFilter); const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1; return clientFilters[nextIndex]?.[0] || null; };
    const prepareClientFilterPreview = (deltaX: number) => { return Boolean(getClientFilterSwipeTarget(deltaX)); };
    const finishClientFilterSwipe = (clientX: number, clientY: number) => { const start = clientFilterSwipeStart.current; clientFilterSwipeStart.current = null; if (!start)
        return false; const deltaX = clientX - start.x; const deltaY = clientY - start.y; const elapsed = Date.now() - start.time; const isLocalSwipe = Math.abs(deltaX) >= 44 && Math.abs(deltaX) > Math.abs(deltaY) * 1.08 && elapsed <= 900; if (!isLocalSwipe)
        return false; const nextFilter = getClientFilterSwipeTarget(deltaX); if (!nextFilter || nextFilter === clientFilter)
        return false; clientFilterSwipeSuppressClickUntil.current = Date.now() + 500; commitClientFilterSwipe(nextFilter, deltaX < 0 ? "next" : "prev"); return true; };
    const shouldIgnoreClientSwipeTarget = (target: EventTarget | null) => target instanceof HTMLElement && Boolean(target.closest("button, input, textarea, select, [contenteditable='true'], .client-reference-modal, [data-dashboard-swipe-ignore='true']"));
    const handleClientFilterPointerDown = (event: PointerEvent<HTMLDivElement>) => { if (event.pointerType === "touch")
        return; if (event.pointerType === "mouse" && event.button !== 0)
        return; if (shouldIgnoreClientSwipeTarget(event.target))
        return; clientFilterSwipeStart.current = { captured: false, x: event.clientX, y: event.clientY, pointerId: event.pointerId, time: Date.now() }; event.currentTarget.setPointerCapture(event.pointerId); };
    const handleClientFilterPointerMove = (event: PointerEvent<HTMLDivElement>) => { if (event.pointerType === "touch")
        return; const start = clientFilterSwipeStart.current; if (!start || start.pointerId !== event.pointerId)
        return; const deltaX = event.clientX - start.x; const deltaY = event.clientY - start.y; if (Math.abs(deltaX) < 3 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.04)
        return; if (!prepareClientFilterPreview(deltaX))
        return; start.captured = true; requestClientFilterSwipeFrame(deltaX); event.preventDefault(); event.stopPropagation(); };
    const handleClientFilterPointerUp = (event: PointerEvent<HTMLDivElement>) => { if (event.pointerType === "touch")
        return; const start = clientFilterSwipeStart.current; if (!start || start.pointerId !== event.pointerId)
        return; if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId); const switched = finishClientFilterSwipe(event.clientX, event.clientY); if (!switched)
        resetClientFilterMotion(true); if (start.captured || switched)
        event.stopPropagation(); };
    const handleClientFilterPointerCancel = (event: PointerEvent<HTMLDivElement>) => { if (event.pointerType === "touch")
        return; if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId); clientFilterSwipeStart.current = null; resetClientFilterMotion(true); };
    const handleClientFilterTouchStart = (event: TouchEvent<HTMLDivElement>) => { const touch = event.touches[0]; if (!touch)
        return; if (shouldIgnoreClientSwipeTarget(event.target))
        return; clientFilterSwipeStart.current = { captured: false, x: touch.clientX, y: touch.clientY, time: Date.now() }; };
    const handleClientFilterTouchMove = (event: TouchEvent<HTMLDivElement>) => { const start = clientFilterSwipeStart.current; const touch = event.touches[0]; if (!start || !touch)
        return; const deltaX = touch.clientX - start.x; const deltaY = touch.clientY - start.y; if (Math.abs(deltaX) < 3 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.04)
        return; if (!prepareClientFilterPreview(deltaX))
        return; start.captured = true; requestClientFilterSwipeFrame(deltaX); event.preventDefault(); event.stopPropagation(); };
    const handleClientFilterTouchEnd = (event: TouchEvent<HTMLDivElement>) => { const start = clientFilterSwipeStart.current; const touch = event.changedTouches[0]; if (!touch)
        return; const switched = finishClientFilterSwipe(touch.clientX, touch.clientY); if (!switched)
        resetClientFilterMotion(true); if (start?.captured || switched)
        event.stopPropagation(); };
    const handleClientSwipeClickCapture = (event: MouseEvent<HTMLDivElement>) => { if (Date.now() > clientFilterSwipeSuppressClickUntil.current && Date.now() > clientCardOpenSuppressUntil.current)
        return; event.preventDefault(); event.stopPropagation(); };
    const selectedClientHistory = useMemo(() => { if (!activeClient)
        return []; const normalizedPhone = activeClient.phone.replace(/\D/g, ""); return props.appointments.filter((appointment) => { const appointmentPhone = appointment.phone.replace(/\D/g, ""); return normalizedPhone ? appointmentPhone === normalizedPhone : appointment.client === activeClient.name; }).sort((left, right) => `${right.date} ${right.time}`.localeCompare(`${left.date} ${left.time}`)).map((appointment) => ({ appointment, serviceTitle: getAppointmentServiceTitle(appointment, props.services), price: getAppointmentPrice(appointment, props.services), duration: getAppointmentDuration(appointment, props.services), noShow: isNoShowAppointment(appointment), })); }, [activeClient, props.appointments, props.services]);
    const closeActiveClient = () => { if (activeClientEditing)
        props.cancelClientEdit(); setClientProfileEditMode(null); setSelectedClient(null); };
    const getClientInitials = (client: Client) => { const parts = client.name.trim().split(/\s+/).filter(Boolean); if (parts.length >= 2)
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase(); return (client.name.trim() || client.phone || "?").slice(0, 2).toUpperCase(); };
    const getClientTags = (client: Client) => { const tags = []; if (client.visits > 1)
        tags.push("Постоянный клиент"); if (client.visits <= 1)
        tags.push("Новый"); if (client.telegramConnected)
        tags.push("Telegram"); return tags; };
    useEffect(() => { document.body.classList.toggle("client-bottom-sheet-lock", clientFormPanelOpen); return () => { document.body.classList.remove("client-bottom-sheet-lock"); }; }, [clientFormPanelOpen]);
    useEffect(() => { document.body.classList.toggle("client-profile-lock", Boolean(activeClient)); return () => { document.body.classList.remove("client-profile-lock"); }; }, [activeClient]);
    const closeClientFormPanel = () => { clientCardOpenSuppressUntil.current = Date.now() + 700; if (isClientEditing) {
        props.cancelClientEdit();
        return;
    } props.setClientFormOpen(false); props.setClientForm(emptyClient); };
    const startClientProfileEdit = (client: Client, mode: "identity" | "notes") => { setClientProfileEditMode(mode); props.editClient(client); };
    const cancelClientProfileEdit = () => { setClientProfileEditMode(null); props.cancelClientEdit(); };
    const saveClientProfileEdit = () => { props.saveClient(); if (!props.clientForm.name.trim() || !props.clientForm.phone.trim())
        return; setClientProfileEditMode(null); };
    const clientFormPanel = (<DraggableBottomSheetFrame screenClassName="client-form-bottom-sheet-screen" panelClassName="client-form-bottom-sheet" onClose={closeClientFormPanel}> <form onSubmit={props.saveClient} className="grid gap-3"> <div className="client-bottom-sheet-header"> <div className="min-w-0"> <p className="text-conversationName text-textPrimary">{isClientEditing ? "Редактировать клиента" : "Новый клиент"}</p> <p className="mt-1 text-settingsRowDescription text-textSecondary">{isClientEditing ? "Измените имя, телефон и заметки." : "Заполните имя, телефон и заметки."}</p> </div> <button type="button" onClick={closeClientFormPanel} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background text-textPrimary hover:bg-background" aria-label="Закрыть" title="Закрыть"> <CloseIcon /></button> </div> <label className="space-y-2"> <span className="text-settingsRowTitle text-textPrimary">Имя</span> <input value={props.clientForm.name} onChange={(event) => props.setClientForm((current) => ({ ...current, name: event.target.value }))} className="settings-input min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-messageInput text-textPrimary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" placeholder="Имя клиента"/> </label> <label className="space-y-2"> <span className="text-settingsRowTitle text-textPrimary">Телефон</span> <input value={props.clientForm.phone} onChange={(event) => props.setClientForm((current) => ({ ...current, phone: event.target.value }))} className="settings-input min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-messageInput text-textPrimary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" placeholder="+7 ..."/> </label> <label className="space-y-2"> <span className="text-settingsRowTitle text-textPrimary">Заметки</span> <textarea value={props.clientForm.notes} onChange={(event) => props.setClientForm((current) => ({ ...current, notes: event.target.value }))} className="settings-input min-h-24 w-full resize-none rounded-xl border border-border bg-surface px-3.5 py-2 text-messageInput text-textPrimary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" placeholder="Предпочтения, нюансы, важные детали" rows={5}/> </label> <div className="client-bottom-sheet-actions grid grid-cols-2 gap-2 md:flex md:flex-row"> <button type="submit" className="client-bottom-sheet-submit w-full rounded-lg bg-primary px-3 py-3 text-settingsRowTitle text-surface md:w-auto"> {isClientEditing ? "Сохранить" : "Добавить"}</button> <button type="button" onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); closeClientFormPanel(); }} onPointerDown={(event) => { event.stopPropagation(); closeClientFormPanel(); }} onPointerUp={(event) => event.stopPropagation()} onTouchStart={(event) => { event.preventDefault(); event.stopPropagation(); closeClientFormPanel(); }} onTouchEnd={(event) => event.stopPropagation()} onClick={(event) => { event.preventDefault(); event.stopPropagation(); closeClientFormPanel(); }} className="client-bottom-sheet-cancel w-full rounded-lg border border-border px-3 py-3 text-settingsRowTitle md:w-auto"> {isClientEditing ? "Отмена" : "Не сейчас"}</button> </div> </form> </DraggableBottomSheetFrame>);
    const clientFormPanelPortalTarget = typeof document === "undefined" ? null : document.body;
    const clientFormPanelPortal = clientFormPanelOpen && clientFormPanelPortalTarget ? createPortal(<div className="master-workspace">{clientFormPanel}</div>, clientFormPanelPortalTarget) : null;
    return (<div className={`client-filter-swipe-shell space-y-3 ${clientFormPanelOpen ? "client-sheet-active" : ""} ${activeClient ? "client-profile-active" : ""}`} onClickCapture={handleClientSwipeClickCapture} onPointerCancel={handleClientFilterPointerCancel} onPointerDown={handleClientFilterPointerDown} onPointerMove={handleClientFilterPointerMove} onPointerUp={handleClientFilterPointerUp} onTouchCancel={() => { clientFilterSwipeStart.current = null; resetClientFilterMotion(true); }} onTouchEnd={handleClientFilterTouchEnd} onTouchMove={handleClientFilterTouchMove} onTouchStart={handleClientFilterTouchStart}> {clientFormPanelPortal} {activeClient && (<div className="client-profile-modal client-reference-modal fixed inset-0 z-[75]" role="region"> <button type="button" className="client-profile-backdrop absolute inset-0" onClick={closeActiveClient} aria-label="Закрыть профиль клиента"/> <section className="client-reference-profile relative w-full" onClick={(event) => event.stopPropagation()}> <div className="client-reference-topbar"> <button type="button" className="client-profile-close" onClick={closeActiveClient} aria-label="Назад" title="Назад"> <BackArrowIcon /></button> <h2 className="truncate">{activeClient.name}</h2> <button type="button" className="client-reference-icon-button" aria-label="Ещё" title="Ещё"> <DotsThree weight="bold" aria-hidden="true"/></button> </div> <div className="client-reference-content"> <div className="client-reference-edit-form"> <section className="client-reference-hero"> <div className="client-reference-avatar" aria-hidden="true">{getClientInitials(activeClient)}</div> <div className="client-reference-main-person"> <div className="client-reference-identity"> {activeClientIdentityEditing ? (<> <input value={props.clientForm.name} onChange={(event) => props.setClientForm((current) => ({ ...current, name: event.target.value }))} placeholder="Имя клиента"/> <input value={props.clientForm.phone} onChange={(event) => props.setClientForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+7 ..."/> </>) : (<> <h1 className="truncate">{activeClient.name}</h1> <p>{activeClient.phone || "Телефон не указан"}</p> </>)} </div> {activeClientIdentityEditing ? (<button type="button" className="client-reference-main-edit client-reference-save-identity" onClick={saveClientProfileEdit} aria-label="Сохранить имя и телефон" title="Сохранить"> <Check weight="bold" aria-hidden="true"/></button>) : (<button type="button" className="client-reference-main-edit client-reference-pencil-edit" onClick={() => startClientProfileEdit(activeClient, "identity")} aria-label="Редактировать имя и телефон" title="Редактировать"> <PencilSimple weight="light" aria-hidden="true"/></button>)} </div> <div className="client-reference-actions"> <button type="button" title="Позвонить"> <Phone weight="bold" aria-hidden="true"/> <span>Позвонить</span></button> <button type="button" title="Написать"> <WhatsappLogo weight="bold" aria-hidden="true"/> <span>Написать</span></button> <button type="button" title="Запись"> <CalendarBlank weight="bold" aria-hidden="true"/> <span>Запись</span></button> <button type="button" className="client-reference-delete-action" title="Удалить" onClick={() => setDeleteTarget(activeClient)}> <Trash weight="bold" aria-hidden="true"/> <span>Удалить</span></button> </div> </section> {deleteTarget?.id === activeClient.id && (<section className="client-reference-delete-confirm" role="alert"> <p>Удалить клиента из базы? Записи в календаре останутся.</p> <div> <button type="button" onClick={() => { props.deleteClient(activeClient.id); setDeleteTarget(null); setSelectedClient(null); }}> Удалить</button> <button type="button" onClick={() => setDeleteTarget(null)}> Отмена</button> </div> </section>)} <section className="client-reference-info-card"> <div><span>Последний визит</span><strong>{activeClient.lastVisit ? formatClientVisitDate(parseDateKey(activeClient.lastVisit)) : "Пока нет"}</strong></div> <div><span>Всего записей</span><strong>{activeClient.visits}</strong></div> <div><span>Общая сумма</span><strong>{activeClient.totalSpent ? `${activeClient.totalSpent.toLocaleString("ru-RU")} ₽` : "0 ₽"}</strong></div> <div><span>Telegram</span><strong>{activeClient.telegramConnected ? `Подключен${activeClient.telegramUsername ? ` · @${activeClient.telegramUsername}` : ""}` : "Не подключен"}</strong></div> <div className="client-reference-tags-row"> <span>Теги</span> <p>{getClientTags(activeClient).map((tag) => <b key={tag}>{tag}</b>)}</p> </div> </section> <section className="client-reference-notes-card"> <div className="client-reference-notes-title"> <h3>Заметки</h3> {!activeClientNotesEditing && (<button type="button" className="client-reference-pencil-edit" onClick={() => startClientProfileEdit(activeClient, "notes")} aria-label="Редактировать заметки" title="Редактировать"> <PencilSimple weight="light" aria-hidden="true"/></button>)} </div> {activeClientNotesEditing ? (<textarea value={props.clientForm.notes} onChange={(event) => props.setClientForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Предпочтения, нюансы, важные детали" rows={4}/>) : (<p>{activeClient.notes.trim() || "Заметок пока нет"}</p>)} </section> {activeClientNotesEditing && (<div className="client-reference-edit-actions"> <button type="button" onClick={saveClientProfileEdit}>Сохранить заметку</button> <button type="button" onClick={cancelClientProfileEdit}>Отмена</button> </div>)} </div> <section className="client-reference-history"> <div className="client-reference-section-title"> <h3>История посещений</h3> </div> {selectedClientHistory.length === 0 ? (<p className="client-reference-empty">История появится после первой записи клиента.</p>) : (<div className="client-reference-history-list"> {selectedClientHistory.map(({ appointment, duration, noShow, price, serviceTitle }) => (<article key={appointment.id} className="client-reference-history-item"> <span>{formatClientVisitDate(parseDateKey(appointment.date))}</span> <div className="min-w-0"> <p className="client-profile-history-service truncate">{serviceTitle}</p> <p className="client-profile-history-meta">{appointment.time} · {duration} мин</p> </div> <strong> {noShow && <span className="client-reference-history-no-show">не пришёл</span>} {price ? `${price.toLocaleString("ru-RU")} ₽` : "0 ₽"} </strong> </article>))} </div>)} </section> </div> </section> </div>)} <div className="client-reference-screen"> <header className="client-reference-header"> <div className="client-reference-title-row"> <h1>Клиенты</h1> <button type="button" onClick={() => { props.cancelClientEdit(); props.setClientForm(emptyClient); props.setClientFormOpen(true); }} className="client-reference-add" aria-label="Добавить клиента" title="Добавить клиента"> <Plus weight="bold" aria-hidden="true"/></button> </div> <label className="services-search-field client-reference-search"> <MagnifyingGlass className="h-5 w-5 shrink-0" aria-hidden="true"/> <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по имени или телефону"/> </label> <div ref={clientFiltersRef} className="client-reference-filters" role="tablist" aria-label="Фильтр клиентов"> {clientFilters.map(([value, label]) => (<button key={value} type="button" onClick={() => selectClientFilter(value as "all" | "regular" | "new")} className={clientFilter === value ? "client-reference-filter-active" : ""} role="tab" aria-selected={clientFilter === value}> <span>{label}</span><span className="client-reference-filter-count">{clientFilterCounts[value]}</span></button>))} <span className="client-reference-filters-underline" aria-hidden="true"/> </div> </header> {!props.editingClientId && (<div className="hidden"> <button type="button" onClick={() => props.setClientFormOpen((open) => !open)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-settingsRowTitle text-textPrimary hover:bg-background" aria-expanded={props.clientFormOpen}> <span className="flex min-w-0 items-center gap-2"> <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-primary ring-1 ring-inset ring-primary"> <ActionIcon name="plus"/> </span> <span className="truncate">Добавить клиента</span> </span> <ChevronIcon open={props.clientFormOpen}/></button> <div className={`grid transition-all duration-300 ${props.clientFormOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}> <div className="min-h-0 overflow-hidden"> <form onSubmit={props.saveClient} className="grid gap-2 border-t border-border p-3 md:grid-cols-[1fr_1fr_2fr_auto] md:items-end"> <label className="space-y-2"> <span className="text-sectionLabel text-textSecondary">Имя</span> <input value={props.clientForm.name} onChange={(event) => props.setClientForm((current) => ({ ...current, name: event.target.value }))} className="h-10 w-full rounded-lg border border-border px-3 text-settingsRowDescription" placeholder="Имя клиента"/> </label> <label className="space-y-2"> <span className="text-sectionLabel text-textSecondary">Телефон</span> <input value={props.clientForm.phone} onChange={(event) => props.setClientForm((current) => ({ ...current, phone: event.target.value }))} className="h-10 w-full rounded-lg border border-border px-3 text-settingsRowDescription" placeholder="+7 ..."/> </label> <label className="space-y-2"> <span className="text-sectionLabel text-textSecondary">Заметки</span> <input value={props.clientForm.notes} onChange={(event) => props.setClientForm((current) => ({ ...current, notes: event.target.value }))} className="h-10 w-full rounded-lg border border-border px-3 text-settingsRowDescription" placeholder="Предпочтения, нюансы, важные детали"/> </label> <div> <button type="submit" className="h-10 w-full rounded-lg bg-primary px-4 text-settingsRowTitle text-surface md:w-auto"> Добавить</button> </div> </form> </div> </div> </div>)} <div className="client-reference-list-viewport"> <div ref={clientListRef} className="client-reference-list-track"> <section className="client-list client-reference-list client-reference-list-panel client-reference-list-current"> {filteredClients.length === 0 ? (<article className="saas-card p-4 text-center text-settingsRowDescription text-textSecondary"> {props.clients.length === 0 ? "Клиенты появятся здесь после первой записи или ручного добавления." : "По этому запросу клиентов не найдено."} </article>) : (filteredClients.map((client) => { const isEditing = props.editingClientId === client.id; const expanded = isEditing || deleteTarget?.id === client.id; if (false && props.compactClients && expandedCompactClientId !== client.id) {
        return (<button key={client.id} type="button" onClick={() => setExpandedCompactClientId(client.id)} className="saas-card w-full overflow-hidden text-left hover:bg-background"> <div className="grid grid-cols-[minmax(0,1fr)_76px_88px] items-center gap-2 px-3 py-2 md:grid-cols-[minmax(0,1fr)_minmax(120px,0.6fr)_76px_104px]"> <div className="min-w-0"> <p className="client-name-settings-copy settings-menu-title-copy truncate text-textPrimary" style={settingsMenuTitleStyle}>{client.name}</p> <p className="truncate text-messageMetadata leading-tight text-textSecondary"> {client.phone} · Telegram {client.telegramConnected ? "подключен" : "не подключен"} </p> </div> <p className="hidden text-conversationPreview text-textSecondary md:block">{client.lastVisit ? formatClientVisitDate(parseDateKey(client.lastVisit)) : "Пока нет"}</p> <p className="whitespace-nowrap text-right text-messageMetadata text-textSecondary">{client.visits} виз.</p> <p className="whitespace-nowrap text-right text-badge text-textPrimary">{client.totalSpent ? `${client.totalSpent.toLocaleString("ru-RU")} ₽` : "0 ₽"}</p> </div></button>);
    } return (<article key={client.id} onClick={() => setSelectedClient(client)} className="client-card client-reference-card relative cursor-pointer overflow-hidden"> <div className="client-reference-card-inner"> <span className="client-reference-avatar client-reference-list-avatar" aria-hidden="true">{getClientInitials(client)}</span> <div className="client-reference-card-body"> <div className="client-reference-card-main"> <p className="client-name-settings-copy settings-menu-title-copy truncate text-textPrimary" style={settingsMenuTitleStyle}>{client.name}</p> <p>{client.phone || "Телефон не указан"}</p> <p>Последний визит: {client.lastVisit ? formatClientVisitDate(parseDateKey(client.lastVisit)) : "пока нет"}</p> <p>{client.visits} {client.visits === 1 ? "запись" : "записей"} · {client.totalSpent ? `${client.totalSpent.toLocaleString("ru-RU")} ₽` : "0 ₽"}</p> <div className="client-reference-card-tags"> {getClientTags(client).map((tag) => <span key={tag}>{tag}</span>)} </div> {client.notes.trim() && <p className="client-reference-card-note">{client.notes}</p>} </div> <CaretRight className="client-reference-chevron" weight="bold" aria-hidden="true"/> <div className={`client-card-actions flex shrink-0 gap-1.5 ${expanded ? "" : "hidden"}`}> <button type="button" onClick={(event) => { event.stopPropagation(); isEditing ? props.cancelClientEdit() : props.editClient(client); }} className={`flex h-8 min-h-0 w-8 items-center justify-center rounded-full border text-textPrimary hover:bg-background ${isEditing ? "border-textPrimary bg-background" : "border-border bg-surface"}`} aria-label="Редактировать клиента" title="Редактировать"> <ActionIcon name="edit"/></button> <button type="button" onClick={(event) => { event.stopPropagation(); setDeleteTarget((current) => (current?.id === client.id ? null : client)); }} className="flex h-8 min-h-0 w-8 items-center justify-center rounded-full border border-border bg-surface text-textSecondary hover:bg-background" aria-label="Удалить клиента" title="Удалить"> <ActionIcon name="trash"/></button> </div> </div> {expanded && (<div className="client-card-details grid min-h-0 min-w-0 gap-2 overflow-hidden"> <p className={`client-card-telegram text-messageMetadata ${client.telegramConnected ? "text-success" : "text-textSecondary"}`}> Telegram: {client.telegramConnected ? `Подключен${client.telegramUsername ? ` · @${client.telegramUsername}` : ""}` : "Не подключен"} </p> <div className="grid grid-cols-3 gap-2"> <div className="client-detail-tile min-w-0 rounded-lg bg-background px-2 py-2 md:px-3"> <p className="text-messageMetadata text-textSecondary">Визитов</p> <p className="mt-0.5 text-badge text-textPrimary">{client.visits}</p> </div> <div className="client-detail-tile min-w-0 rounded-lg bg-background px-2 py-2 md:px-3"> <p className="text-messageMetadata text-textSecondary">Последний визит</p> <p className="mt-0.5 truncate text-badge text-textPrimary">{client.lastVisit ? formatClientVisitDate(parseDateKey(client.lastVisit)) : "Пока нет"}</p> </div> <div className="client-detail-tile min-w-0 rounded-lg bg-background px-2 py-2 md:px-3"> <p className="text-messageMetadata text-textSecondary">Сумма</p> <p className="mt-0.5 truncate text-badge text-textPrimary">{client.totalSpent ? `${client.totalSpent.toLocaleString("ru-RU")} ₽` : "Без оплат"}</p> </div> </div> {client.notes.trim() && (<div className="client-notes-tile min-w-0 rounded-lg bg-surface px-3 py-2 ring-1 ring-inset ring-border"> <p className="text-messageMetadata text-textSecondary">Заметки</p> <p className="mt-0.5 text-messageBody text-textPrimary">{client.notes}</p> </div>)} </div>)} </div> {false && isEditing && (<div className="min-h-0 overflow-hidden"> <form onSubmit={props.saveClient} onClick={(event) => event.stopPropagation()} className="grid gap-2 border-t border-border bg-background p-3 md:grid-cols-[1fr_1fr_2fr_auto] md:items-end"> <label className="space-y-1"> <span className="text-sectionLabel text-textSecondary">Имя</span> <input value={props.clientForm.name} onChange={(event) => props.setClientForm((current) => ({ ...current, name: event.target.value }))} className="h-10 w-full rounded-lg border border-border px-3 text-settingsRowDescription" placeholder="Имя клиента"/> </label> <label className="space-y-1"> <span className="text-sectionLabel text-textSecondary">Телефон</span> <input value={props.clientForm.phone} onChange={(event) => props.setClientForm((current) => ({ ...current, phone: event.target.value }))} className="h-10 w-full rounded-lg border border-border px-3 text-settingsRowDescription" placeholder="+7 ..."/> </label> <label className="space-y-1"> <span className="text-sectionLabel text-textSecondary">Заметки</span> <input value={props.clientForm.notes} onChange={(event) => props.setClientForm((current) => ({ ...current, notes: event.target.value }))} className="h-10 w-full rounded-lg border border-border px-3 text-settingsRowDescription" placeholder="Предпочтения, нюансы, важные детали"/> </label> <div className="grid grid-cols-2 gap-2 md:flex"> <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-settingsRowTitle text-surface"> Сохранить</button> <button type="button" onClick={props.cancelClientEdit} className="h-10 rounded-lg border border-border bg-surface px-4 text-settingsRowTitle"> Отмена</button> </div> </form> </div>)} {deleteTarget?.id === client.id && (<div className="min-h-0 overflow-hidden"> <div className="flex flex-col gap-3 bg-background p-3 md:flex-row md:items-center md:justify-between" role="alert" onClick={(event) => event.stopPropagation()}> <p className="text-settingsRowTitle text-textPrimary">Удалить клиента из базы? Записи в календаре останутся.</p> <div className="grid grid-cols-2 gap-2 md:w-[260px]"> <button type="button" onClick={() => { props.deleteClient(client.id); setDeleteTarget(null); }} className="min-h-0 rounded-lg bg-textPrimary px-3 py-2 text-settingsRowTitle text-surface hover:opacity-90"> Удалить</button> <button type="button" onClick={() => setDeleteTarget(null)} className="min-h-0 rounded-lg border border-border bg-surface px-3 py-2 text-settingsRowTitle text-textPrimary hover:bg-background"> Отмена</button> </div> </div> </div>)} </article>); }))} </section> {clientPreviewPanels.map((panel) => (<section key={`preview-${panel.direction}-${panel.filter}`} className={`client-list client-reference-list client-reference-list-panel client-reference-list-preview client-reference-list-preview-${panel.direction}`} aria-hidden="true"> {panel.clients.length === 0 ? (<article className="saas-card p-4 text-center text-settingsRowDescription text-textSecondary"> {props.clients.length === 0 ? "Клиенты появятся здесь после первой записи или ручного добавления." : "По этому запросу клиентов не найдено."} </article>) : (panel.clients.map((client) => (<article key={`preview-${panel.filter}-${client.id}`} className="client-card client-reference-card relative overflow-hidden"> <div className="client-reference-card-inner"> <span className="client-reference-avatar client-reference-list-avatar" aria-hidden="true">{getClientInitials(client)}</span> <div className="client-reference-card-body"> <div className="client-reference-card-main"> <p className="client-name-settings-copy settings-menu-title-copy truncate text-textPrimary" style={settingsMenuTitleStyle}>{client.name}</p> <p>{client.phone || "Телефон не указан"}</p> <p>Последний визит: {client.lastVisit ? formatClientVisitDate(parseDateKey(client.lastVisit)) : "пока нет"}</p> <p>{client.visits} {client.visits === 1 ? "запись" : "записей"} · {client.totalSpent ? `${client.totalSpent.toLocaleString("ru-RU")} ₽` : "0 ₽"}</p> <div className="client-reference-card-tags"> {getClientTags(client).map((tag) => <span key={tag}>{tag}</span>)} </div> {client.notes.trim() && <p className="client-reference-card-note">{client.notes}</p>} </div> <CaretRight className="client-reference-chevron" weight="bold" aria-hidden="true"/> </div> </div> </article>)))} </section>))} </div> </div> </div> </div>);
}
const maxFutureFinanceChartDays = 10;

function FinanceSection({ appointments, compact = false, services, totalRevenue }: {
    appointments: Appointment[];
    compact?: boolean;
    services: Service[];
    totalRevenue: number;
}) {
    const getTodayKey = () => formatDateKey(new Date());
    const [periodMode, setPeriodMode] = useState<"day" | "week" | "month" | "year">("day");
    const [selectedDate, setSelectedDate] = useState(getTodayKey);
    const [monthAnchorDate, setMonthAnchorDate] = useState(getTodayKey);
    const [selectedChartKey, setSelectedChartKey] = useState<string | null>(null);
    const [pressedChartKey, setPressedChartKey] = useState<string | null>(null);
    const [financeWindow, setFinanceWindow] = useState({ monthAfter: 12, monthBefore: 12, weekAfter: 10, weekBefore: 10 });
    const [financeScrollNonce, setFinanceScrollNonce] = useState(0);
    const financeChartRef = useRef<HTMLDivElement | null>(null);
    const financeExtendingRef = useRef(false);
    const financePendingScrollShiftRef = useRef(0);
    const financeUserScrollRef = useRef(false);
    const paidAppointments = useMemo(() => appointments.filter((item) => isBillableAppointment(item) && getAppointmentServices(item, services).length > 0), [appointments, services]);
    const totalMaterialCost = useMemo(() => paidAppointments.reduce((sum, item) => sum + getAppointmentMaterialCost(item, services), 0), [paidAppointments, services]);
    const totalGrossProfit = totalRevenue - totalMaterialCost;
    const totalMargin = totalRevenue ? Math.round((totalGrossProfit / totalRevenue) * 100) : 0;
    const averageCheck = paidAppointments.length ? Math.round(totalRevenue / paidAppointments.length) : 0;
    const { revenueByDate, revenuePrefix, revenuePrefixDates } = useMemo(() => { const map = new Map<string, number>(); paidAppointments.forEach((appointment) => { map.set(appointment.date, (map.get(appointment.date) || 0) + getAppointmentPrice(appointment, services)); }); const dates = Array.from(map.keys()).sort(); let runningTotal = 0; const prefix = dates.map((date) => { runningTotal += map.get(date) || 0; return runningTotal; }); return { revenueByDate: map, revenuePrefix: prefix, revenuePrefixDates: dates }; }, [paidAppointments, services]);
    const getDateRevenue = useCallback((dateKey: string) => revenueByDate.get(dateKey) || 0, [revenueByDate]);
    const getRangeRevenue = useCallback((startKey: string, endKey: string) => { const lowerBound = (target: string) => { let low = 0; let high = revenuePrefixDates.length; while (low < high) {
        const middle = (low + high) >> 1;
        if (revenuePrefixDates[middle] < target)
            low = middle + 1;
        else
            high = middle;
    } return low; }; const startIndex = lowerBound(startKey); const endIndex = lowerBound(endKey > "9999-99-98" ? endKey : `${endKey}\u0000`) - 1; if (startIndex > endIndex || startIndex >= revenuePrefix.length)
        return 0; return revenuePrefix[endIndex] - (startIndex > 0 ? revenuePrefix[startIndex - 1] : 0); }, [revenuePrefix, revenuePrefixDates]);
    const getPeriodRange = (dateKey: string, mode: "day" | "week" | "month" | "year") => { const date = parseDateKey(dateKey); if (mode === "day")
        return { start: date, end: date }; if (mode === "week") {
        const mondayOffset = (date.getDay() + 6) % 7;
        const start = addDays(date, -mondayOffset);
        return { start, end: addDays(start, 6) };
    } if (mode === "year") {
        return { start: new Date(date.getFullYear(), 0, 1), end: new Date(date.getFullYear(), 11, 31), };
    } return { start: new Date(date.getFullYear(), date.getMonth(), 1), end: new Date(date.getFullYear(), date.getMonth() + 1, 0), }; };
    const getChartItemAppointments = (item: {
        key: string;
    }) => { if (periodMode === "day") {
        return paidAppointments.filter((appointment) => appointment.date === item.key);
    } if (periodMode === "week") {
        const weekStart = parseDateKey(item.key);
        const weekEndKey = formatDateKey(addDays(weekStart, 6));
        return paidAppointments.filter((appointment) => isInsideRange(appointment.date, item.key, weekEndKey));
    } if (periodMode === "month") {
        const monthStart = parseDateKey(item.key);
        const monthEndKey = formatDateKey(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0));
        return paidAppointments.filter((appointment) => isInsideRange(appointment.date, item.key, monthEndKey));
    } const year = parseDateKey(item.key).getFullYear(); const yearStartKey = formatDateKey(new Date(year, 0, 1)); const yearEndKey = formatDateKey(new Date(year, 11, 31)); return paidAppointments.filter((appointment) => isInsideRange(appointment.date, yearStartKey, yearEndKey)); };
    const activeFinanceDate = periodMode === "month" ? monthAnchorDate : selectedDate;
    const currentRange = getPeriodRange(activeFinanceDate, periodMode);
    const periodLength = Math.round((currentRange.end.getTime() - currentRange.start.getTime()) / 86400000) + 1;
    const previousRange = { start: addDays(currentRange.start, -periodLength), end: addDays(currentRange.end, -periodLength), };
    const currentStartKey = formatDateKey(currentRange.start);
    const currentEndKey = formatDateKey(currentRange.end);
    const previousStartKey = formatDateKey(previousRange.start);
    const previousEndKey = formatDateKey(previousRange.end);
    const isInsideRange = (date: string, start: string, end: string) => date >= start && date <= end;
    const getAppointmentRevenue = (appointment: Appointment) => getAppointmentPrice(appointment, services);
    const getWeekStart = (date: Date) => addDays(date, -((date.getDay() + 6) % 7));
    const formatWeekColumn = (start: Date) => { const end = addDays(start, 6); const startMonth = start.toLocaleDateString("ru-RU", { month: "short" }).replace(".", ""); const endMonth = end.toLocaleDateString("ru-RU", { month: "short" }).replace(".", ""); return { label: `${start.getDate()}-${end.getDate()}`, dateLabel: startMonth === endMonth ? startMonth : `${startMonth}-${endMonth}`, }; };
    const buildChartData = useCallback((rangeStart: Date, length: number, mode: "day" | "month") => Array.from({ length }, (_, index) => { const date = addDays(rangeStart, index); const key = formatDateKey(date); const value = getDateRevenue(key); const label = mode === "month" ? date.toLocaleDateString("ru-RU", { day: "numeric" }) : date.toLocaleDateString("ru-RU", { weekday: "short" }).replace(".", ""); const dateLabel = mode === "month" ? date.toLocaleDateString("ru-RU", { weekday: "short" }).replace(".", "") : date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }).replace(".", ""); return { key, label, dateLabel, value, isActive: key === activeFinanceDate }; }), [activeFinanceDate, getDateRevenue]);
    const periodAppointments = paidAppointments.filter((item) => isInsideRange(item.date, currentStartKey, currentEndKey));
    const selectedColumnAppointments = selectedChartKey ? getChartItemAppointments({ key: selectedChartKey }) : null;
    const summaryAppointments = selectedColumnAppointments || periodAppointments;
    const previousPeriodRevenue = getRangeRevenue(previousStartKey, previousEndKey);
    const periodRevenue = summaryAppointments.reduce((sum, item) => sum + getAppointmentRevenue(item), 0);
    const periodMaterialCost = summaryAppointments.reduce((sum, item) => sum + getAppointmentMaterialCost(item, services), 0);
    const periodProfit = periodRevenue - periodMaterialCost;
    const periodAverageCheck = summaryAppointments.length ? Math.round(periodRevenue / summaryAppointments.length) : 0;
    const revenueDelta = periodRevenue - previousPeriodRevenue;
    const revenueDeltaPercent = previousPeriodRevenue ? Math.round((revenueDelta / previousPeriodRevenue) * 100) : periodRevenue ? 100 : 0;
    const revenueByService = services.map((service) => { const matchingAppointments = summaryAppointments.filter((item) => getAppointmentServiceIds(item).includes(service.id)); const revenue = matchingAppointments.reduce((sum, appointment) => sum + getAppointmentPrice(appointment, [service]), 0); const profit = revenue - matchingAppointments.reduce((sum) => sum + (service.materialCost || 0), 0); return { id: service.id, title: service.title, count: matchingAppointments.length, revenue, profit }; }).sort((a, b) => b.revenue - a.revenue || a.title.localeCompare(b.title, "ru-RU"));
    const maxRevenue = Math.max(...revenueByService.map((item) => item.revenue), 1);
    const selectedCaption = selectedChartKey ? "выбранная колонка" : "выбранный период";
    const activeChartKey = periodMode === "day" ? activeFinanceDate : currentStartKey;
    const periodOptions: Array<{
        mode: "day" | "week" | "month" | "year";
        label: string;
    }> = [{ mode: "day", label: "День" }, { mode: "week", label: "Неделя" }, { mode: "month", label: "Месяц" }, { mode: "year", label: "Год" },];
    const currentRangeStartTime = currentRange.start.getTime();
    const chartData = useMemo(() => periodMode === "day" ? Array.from({ length: financeWindow.weekBefore + maxFutureFinanceChartDays + 1 }, (_, index) => { const date = addDays(parseDateKey(selectedDate), index - financeWindow.weekBefore); const key = formatDateKey(date); const value = getDateRevenue(key); return { key, label: date.toLocaleDateString("ru-RU", { weekday: "short" }).replace(".", ""), dateLabel: date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }).replace(".", ""), value, isActive: key === selectedDate, }; }) : periodMode === "week" ? Array.from({ length: financeWindow.weekBefore + financeWindow.weekAfter + 1 }, (_, index) => { const activeWeekStart = getWeekStart(parseDateKey(selectedDate)); const date = addDays(activeWeekStart, (index - financeWindow.weekBefore) * 7); const key = formatDateKey(date); const weekEndKey = formatDateKey(addDays(date, 6)); const value = getRangeRevenue(key, weekEndKey); const { label, dateLabel } = formatWeekColumn(date); return { key, label, dateLabel, value, isActive: key === currentStartKey, }; }) : periodMode === "year" ? Array.from({ length: 11 }, (_, index) => { const year = currentRange.start.getFullYear() - 5 + index; const yearStartKey = formatDateKey(new Date(year, 0, 1)); const yearEndKey = formatDateKey(new Date(year, 11, 31)); const value = getRangeRevenue(yearStartKey, yearEndKey); return { key: yearStartKey, label: String(year), dateLabel: "год", isActive: year === currentRange.start.getFullYear(), value, }; }) : periodMode === "month" ? Array.from({ length: financeWindow.monthBefore + financeWindow.monthAfter + 1 }, (_, index) => { const monthBefore = financeWindow.monthBefore; const date = new Date(currentRange.start.getFullYear(), currentRange.start.getMonth() - monthBefore + index, 1); const monthStartKey = formatDateKey(date); const monthEndKey = formatDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0)); const value = getRangeRevenue(monthStartKey, monthEndKey); return { key: monthStartKey, label: date.toLocaleDateString("ru-RU", { month: "short" }).replace(".", ""), dateLabel: String(date.getFullYear()), isActive: monthStartKey === currentStartKey, value, }; }) : buildChartData(currentRange.start, periodLength, periodMode), [buildChartData, currentRangeStartTime, currentStartKey, financeWindow, periodLength, periodMode, selectedDate, getDateRevenue, getRangeRevenue]);
    const maxChartRevenue = Math.max(...chartData.map((item) => item.value), 1);
    const shiftPeriod = (direction: -1 | 1) => { setSelectedChartKey(null); setPressedChartKey(null); if (periodMode === "month") {
        const base = parseDateKey(monthAnchorDate);
        const next = new Date(base.getFullYear(), base.getMonth() + direction, 1);
        const nextKey = formatDateKey(next);
        setMonthAnchorDate(nextKey);
        setSelectedDate(nextKey);
        return;
    } const base = parseDateKey(selectedDate); const next = periodMode === "year" ? new Date(base.getFullYear() + direction, base.getMonth(), Math.min(base.getDate(), 28)) : addDays(base, direction * periodLength); const nextKey = formatDateKey(next); setSelectedDate(nextKey); };
    const selectPeriodMode = (mode: "day" | "week" | "month" | "year") => { setPeriodMode(mode); setSelectedChartKey(null); setPressedChartKey(null); financeUserScrollRef.current = false; if (mode === "month") {
        const todayKey = getTodayKey();
        setMonthAnchorDate(todayKey);
        setSelectedDate(todayKey);
        setFinanceWindow((current) => ({ ...current, monthAfter: 12, monthBefore: 12 }));
        setFinanceScrollNonce((current) => current + 1);
    } };
    const changeFinanceDate = (dateKey: string) => { const nextKey = dateKey || getTodayKey(); financeUserScrollRef.current = false; setSelectedChartKey(null); setPressedChartKey(null); setSelectedDate(nextKey); if (periodMode === "month") {
        setMonthAnchorDate(nextKey);
    } };
    const selectChartItem = (item: {
        key: string;
    }) => { setPressedChartKey(item.key); startTransition(() => { setSelectedChartKey(item.key); }); };
    const markFinanceChartScroll = () => { financeUserScrollRef.current = true; };
    const handleFinanceInfiniteScroll = () => { const chart = financeChartRef.current; if (!chart || financeExtendingRef.current || periodMode === "year")
        return; if (periodMode === "month")
        return; if (!financeUserScrollRef.current)
        return; const leftEdge = chart.scrollLeft; const rightEdge = chart.scrollWidth - chart.clientWidth - chart.scrollLeft; const nearEdge = 260; if (leftEdge > nearEdge && rightEdge > nearEdge)
        return; const columns = Array.from(chart.querySelectorAll<HTMLElement>(".finance-chart-column[data-date-key]")); const first = columns[0]; const second = columns[1]; const step = first && second ? second.offsetLeft - first.offsetLeft : first ? first.offsetWidth + 8 : 56; const chunk = 60; financeExtendingRef.current = true; if (leftEdge <= nearEdge) {
        financePendingScrollShiftRef.current += step * chunk;
        setFinanceWindow((current) => ({ ...current, weekBefore: current.weekBefore + chunk }));
        return;
    } if (periodMode === "day" && financeWindow.weekAfter >= maxFutureFinanceChartDays) {
        financeExtendingRef.current = false;
        return;
    } setFinanceWindow((current) => ({ ...current, weekAfter: current.weekAfter + chunk })); };
    useEffect(() => { const chart = financeChartRef.current; if (!chart)
        return; const scrollActiveColumn = () => { const active = chart.querySelector<HTMLElement>('.finance-chart-column[data-active="true"]'); if (!active)
        return; const nextLeft = active.offsetLeft - chart.clientWidth / 2 + active.offsetWidth / 2; chart.scrollTo({ left: Math.max(0, nextLeft), behavior: "auto", }); }; const frame = window.requestAnimationFrame(scrollActiveColumn); return () => { window.cancelAnimationFrame(frame); }; }, [periodMode, activeFinanceDate, financeScrollNonce]);
    useEffect(() => { const chart = financeChartRef.current; if (!chart)
        return; if (financePendingScrollShiftRef.current) {
        const previousScrollBehavior = chart.style.scrollBehavior;
        chart.style.scrollBehavior = "auto";
        chart.scrollLeft += financePendingScrollShiftRef.current;
        chart.style.scrollBehavior = previousScrollBehavior;
        financePendingScrollShiftRef.current = 0;
    } financeExtendingRef.current = false; }, [financeWindow]);
    const metricCards = [{ tone: "emerald" as const, label: "Выручка", value: `${totalRevenue.toLocaleString("ru-RU")} ₽`, detail: "по всем записям" }, { tone: "violet" as const, label: "Прибыль", value: `${totalGrossProfit.toLocaleString("ru-RU")} ₽`, detail: `${totalMargin}% маржа` }, { tone: "emerald" as const, label: "Записи", value: String(summaryAppointments.length), detail: `${periodAverageCheck.toLocaleString("ru-RU")} ₽ средний` }, { tone: "amber" as const, label: "Средний чек", value: `${averageCheck.toLocaleString("ru-RU")} ₽`, detail: `${paidAppointments.length} оплачиваемых` },];
    return (<div className={compact ? "finance-section-root finance-reference-screen insights-dashboard w-full max-w-4xl space-y-3" : "finance-section-root finance-reference-screen insights-dashboard space-y-5"}> {!compact && (<header className="finance-section-header hidden md:block"> <h1 className="text-screenTitle">Финансы</h1> <p className="mt-2 max-w-2xl text-profileDescription text-textSecondary">Выручка, средний чек и услуги, которые зарабатывают больше.</p> </header>)} <section className="finance-reference-periods" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}> <div className="finance-period-tabs" role="tablist" aria-label="Период графика"> {periodOptions.map((item) => (<button key={item.mode} type="button" className={periodMode === item.mode ? "is-active" : ""} onClick={() => selectPeriodMode(item.mode)} role="tab" aria-selected={periodMode === item.mode}> {item.label}</button>))} </div> </section> <section className="finance-reference-stack"> <article className={`finance-dynamics finance-dynamics-primary finance-reference-chart-card ${compact ? "saas-card p-3 md:p-4" : "saas-card p-4 md:p-6"}`}> <div className="finance-dynamics-header"> <div className="finance-reference-summary"> <div className="finance-reference-summary-item"> <p className="finance-reference-label">Выручка</p> <h2>{periodRevenue.toLocaleString("ru-RU")} ₽</h2> </div> <div className="finance-reference-summary-item"> <p className="finance-reference-label">Записи</p> <h2>{summaryAppointments.length}</h2> </div> <div className="finance-reference-summary-item"> <p className="finance-reference-label">Средний чек</p> <h2>{periodAverageCheck.toLocaleString("ru-RU")} ₽</h2> </div> </div> </div> <div className="finance-chart-frame" data-dashboard-swipe-ignore="true"> <div ref={financeChartRef} className={`${compact ? "insights-chart finance-chart mt-3 h-36" : "insights-chart finance-chart mt-5 h-56"} finance-chart-peek-window finance-chart-peek-${periodMode}`} onScroll={handleFinanceInfiniteScroll} onPointerDown={markFinanceChartScroll} onTouchStart={markFinanceChartScroll} onWheel={markFinanceChartScroll}> {chartData.map((item) => (<div key={item.key} data-date-key={item.key} data-active={(selectedChartKey ? item.key === selectedChartKey : item.isActive) ? "true" : undefined} data-selected={selectedChartKey === item.key ? "true" : undefined} className="insights-chart-column finance-chart-column" title={`${item.label}: ${item.value.toLocaleString("ru-RU")} ₽`} role="button" tabIndex={0} onClick={() => selectChartItem(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectChartItem(item);
    } }}> <div className="insights-chart-bar-wrap" style={{ "--finance-bar-height": `${Math.max(item.value ? 10 : 3, (item.value / maxChartRevenue) * 100)}%` } as CSSProperties}> <span>{item.value ? item.value.toLocaleString("ru-RU") : ""}</span> <div className="insights-chart-bar" style={{ height: "var(--finance-bar-height)" }}/> </div> <small className="finance-chart-date"> <span>{item.label}</span> {item.dateLabel && <em>{item.dateLabel}</em>} </small> </div>))} </div> </div> </article> <article className={compact ? "finance-service-card finance-reference-picture saas-card p-3 md:p-4" : "finance-service-card finance-reference-picture saas-card p-4 md:p-6"}> <div className="finance-reference-picture-header"> <div className="min-w-0"> <h2 className={compact ? "text-conversationName md:text-navigationTitle" : "text-screenTitle"}>Топ услуг</h2> </div> </div> <div className={compact ? "finance-reference-service-list mt-3 space-y-2.5" : "finance-reference-service-list mt-6 space-y-4"}> {revenueByService.length === 0 ? (<p className="finance-empty-state">Пока нечего считать. Добавьте записи с услугами, и цифры появятся здесь.</p>) : (revenueByService.map((item, index) => (<div key={item.id} className="finance-reference-service-row"> <span className={`finance-reference-rank finance-reference-rank-${index + 1}`}> {index === 0 ? <FinanceCrownIcon /> : index + 1} </span> <div className="min-w-0 flex-1"> <div className="finance-reference-service-top"> <div className="min-w-0"> <p>{item.title}</p> <span>{item.count} записей</span> </div> <strong>{item.revenue.toLocaleString("ru-RU")} ₽</strong> </div> <div className="finance-reference-progress"> <span style={{ width: `${(item.revenue / maxRevenue) * 100}%` }}/> </div> <p className="finance-service-meta"> <span /> <span>{item.profit.toLocaleString("ru-RU")} ₽ прибыль</span> </p> </div> </div>)))} </div> </article> </section> </div>);
}
function FinanceCrownIcon() {
    return (<svg className="finance-reference-crown" viewBox="0 0 32 24" aria-hidden="true"> <path d="M5.3 18.35h21.4l1.02-8.7-6.52 3.38L16 5.7l-5.2 7.33-6.52-3.38 1.02 8.7Z"/> <path d="M7.15 20.45h17.7"/> <circle cx="4.2" cy="8.65" r="1.55"/> <circle cx="16" cy="4.45" r="1.55"/> <circle cx="27.8" cy="8.65" r="1.55"/> <text x="16" y="16.5" textAnchor="middle">1</text> </svg>);
}
function MetricCard({ compact = false, detail, label, tone = "sky", value }: {
    compact?: boolean;
    detail?: string;
    label: string;
    tone?: "sky" | "violet" | "emerald" | "amber";
    value: string;
}) {
    const paths: Record<"sky" | "violet" | "emerald" | "amber", string> = { sky: "M2 30 C12 30 16 25 25 25 C36 25 38 32 48 31 C60 30 60 15 72 13 C85 11 84 30 96 31 C108 32 116 30 128 30 C139 30 142 15 153 13 C164 11 167 21 176 28", violet: "M2 28 C12 16 20 14 28 27 C36 40 48 37 57 30 C68 21 75 18 86 17 C99 16 100 28 113 29 C126 30 132 33 142 25 C151 18 155 7 166 12 C173 15 177 23 182 29", emerald: "M2 31 C13 25 20 18 29 14 C43 8 44 30 55 33 C66 36 77 32 88 29 C101 24 110 24 122 29 C133 34 141 20 154 20 C166 20 171 27 180 24", amber: "M2 30 C12 31 18 31 25 30 C35 28 36 12 48 11 C60 10 60 31 72 32 C84 33 88 13 101 12 C113 11 116 24 128 25 C141 27 148 36 160 30 C169 25 170 18 181 19", };
    return (<article className={`insight-metric insight-metric-${tone} ${compact ? "p-3" : "p-5"}`}> <p className={compact ? "text-sectionLabel text-textSecondary" : "text-settingsRowTitle text-textSecondary"}>{label}</p> <p className={compact ? "mt-1 break-words text-screenTitle leading-tight" : "mt-2 break-words text-displayLarge"}>{value}</p> {detail && <p className="mt-1 text-messageMetadata text-textSecondary">{detail}</p>} <svg className="finance-metric-sparkline" viewBox="0 0 184 42" preserveAspectRatio="none" aria-hidden="true"> <path className="finance-metric-sparkline-fill" d={`${paths[tone]} L182 41 L2 41 Z`}/> <path className="finance-metric-sparkline-line" d={paths[tone]}/> </svg> </article>);
}
function BookingPageSettingsSection(props: {
    bookingPageSaving: boolean;
    bookingPageSettings: BookingPageSettings;
    bookingUrl: string;
    deleteBookingImage: (type: "cover" | "avatar") => Promise<void>;
    masterName: string;
    onBack: () => void;
    saveBookingPageSettings: (settingsOverride?: BookingPageSettings) => Promise<void>;
    services: Service[];
    setBookingPageSettings: React.Dispatch<React.SetStateAction<BookingPageSettings>>;
    uploadBookingImage: (type: "cover" | "avatar", file: File) => Promise<void>;
}) {
    const settings = props.bookingPageSettings;
    const [accentPickerOpen, setAccentPickerOpen] = useState(false);
    const [accentSheetOffset, setAccentSheetOffset] = useState(0);
    const [accentSheetPhase, setAccentSheetPhase] = useState<"open" | "dragging" | "settling" | "closing">("open");
    const accentSheetSwipeRef = useRef<{ pointerId?: number; startX: number; startY: number; startedAt: number; dragging: boolean } | null>(null);
    const accentSheetElementRef = useRef<HTMLElement | null>(null);
    const accentSheetCloseTimerRef = useRef<number | null>(null);
    const [headingPickerOpen, setHeadingPickerOpen] = useState(false);
    const [headingSheetOffset, setHeadingSheetOffset] = useState(0);
    const [headingSheetPhase, setHeadingSheetPhase] = useState<"open" | "dragging" | "settling" | "closing">("open");
    const headingSheetSwipeRef = useRef<{ pointerId?: number; startX: number; startY: number; startedAt: number; dragging: boolean } | null>(null);
    const headingSheetElementRef = useRef<HTMLElement | null>(null);
    const headingSheetCloseTimerRef = useRef<number | null>(null);
    const [serviceDisplayPickerOpen, setServiceDisplayPickerOpen] = useState(false);
    const [dateDisplayPickerOpen, setDateDisplayPickerOpen] = useState(false);
    const [customAccentDraft, setCustomAccentDraft] = useState(settings.primaryColor || "#0F766E");
    const [addressFormOpen, setAddressFormOpen] = useState(false);
    const [addressSheetOffset, setAddressSheetOffset] = useState(0);
    const [addressSheetPhase, setAddressSheetPhase] = useState<"open" | "dragging" | "settling" | "closing">("open");
    const addressSheetSwipeRef = useRef<{ pointerId?: number; startX: number; startY: number; startedAt: number; dragging: boolean } | null>(null);
    const addressSheetElementRef = useRef<HTMLElement | null>(null);
    const addressSheetCloseTimerRef = useRef<number | null>(null);
    useEffect(() => {
        const locked = accentPickerOpen || headingPickerOpen || addressFormOpen || serviceDisplayPickerOpen || dateDisplayPickerOpen;
        document.body.classList.toggle("client-bottom-sheet-lock", locked);
        return () => {
            document.body.classList.remove("client-bottom-sheet-lock");
        };
    }, [accentPickerOpen, addressFormOpen, dateDisplayPickerOpen, headingPickerOpen, serviceDisplayPickerOpen]);
    const [addressDraft, setAddressDraft] = useState({ city: settings.city || "", address: settings.address || "", cabinet: "", guide: "", isOnline: settings.isOnline === true });
    type BookingHeadingMode = "friendly" | "classic" | "minimal";
    type BookingServiceCardStyle = "stack" | "spotlight" | "wheel" | "grid" | "feature";
    type BookingDateDisplayMode = "standard" | "wheel" | "calendar";
    const serviceDisplayPreviewBase = "/images/service-display-previews";
    const serviceCardStyles: Array<{ id: BookingServiceCardStyle; title: string; subtitle: string; previewUrl: string }> = [
        { id: "stack", title: "Стопка карточек", subtitle: "Большая карточка спереди, соседние варианты видны позади", previewUrl: `${serviceDisplayPreviewBase}/stack.png` },
        { id: "spotlight", title: "Центральная витрина", subtitle: "Главная услуга по центру, соседние варианты видны по бокам", previewUrl: `${serviceDisplayPreviewBase}/spotlight.png` },
        { id: "wheel", title: "Горизонтальная лента", subtitle: "Прокручиваемый выбор услуг в одну линию", previewUrl: `${serviceDisplayPreviewBase}/wheel.png` },
        { id: "grid", title: "Плитка 2 колонки", subtitle: "Компактные карточки с фото, временем и ценой", previewUrl: `${serviceDisplayPreviewBase}/grid.png` },
        { id: "feature", title: "Акцентная лента", subtitle: "Широкие карточки с фото, бейджем и заметной кнопкой", previewUrl: `${serviceDisplayPreviewBase}/feature.png` },
    ];
    const headingModes: Array<{ id: BookingHeadingMode; title: string; subtitle: string; preview: string }> = [
        { id: "friendly", title: "Дружелюбно", subtitle: "Тепло и естественно для клиента", preview: "Что хотите сделать?" },
        { id: "classic", title: "Классически", subtitle: "Прямо и привычно, как в форме записи", preview: "Выберите услугу" },
        { id: "minimal", title: "Лаконично", subtitle: "Короткие заголовки без лишнего текста", preview: "Услуга" },
    ];
    const dateDisplayModes: Array<{ id: BookingDateDisplayMode; title: string; subtitle: string }> = [
        { id: "standard", title: "Обычная лента", subtitle: "Компактный ряд ближайших дат без крупного выбора." },
        { id: "wheel", title: "Колесо выбора даты", subtitle: "Горизонтальное колесо с акцентом на выбранный день." },
        { id: "calendar", title: "Календарь выбора даты", subtitle: "Полный календарь месяца для выбора доступного дня." },
    ];
    type BookingAccentMode = "default" | "current" | "black" | "rose" | "blue" | "violet";
    const colorThemes: Array<{ id: BookingAccentMode; title: string; subtitle: string; primary: string; button: string; surface: string }> = [
        { id: "default", title: "По умолчанию", subtitle: "Как было до цветовых настроек", primary: "#111111", button: "#111111", surface: "#FFFFFF" },
        { id: "current", title: "Фирменный зеленый", subtitle: "Исходная зеленая гамма страницы", primary: "#0F766E", button: "#0F766E", surface: "#CCFBF1" },
        { id: "black", title: "Графит", subtitle: "Сдержанно и универсально", primary: "#111827", button: "#111827", surface: "#F3F4F6" },
        { id: "rose", title: "Роза", subtitle: "Мягкий beauty-акцент", primary: "#DB2777", button: "#DB2777", surface: "#FCE7F3" },
        { id: "blue", title: "Синий", subtitle: "Чисто и современно", primary: "#2563EB", button: "#2563EB", surface: "#DBEAFE" },
        { id: "violet", title: "Фиолетовый", subtitle: "Ярко, но аккуратно", primary: "#7C3AED", button: "#7C3AED", surface: "#EDE9FE" },
    ];
    const resolveHeadingMode = (value: unknown): BookingHeadingMode => value === "classic" || value === "minimal" || value === "friendly" ? value : "friendly";
    const headingMode = resolveHeadingMode(settings.visibleSections.headingMode);
    const selectedHeadingMode = headingModes.find((mode) => mode.id === headingMode) || headingModes[0];
    const resolveServiceCardStyle = (value: unknown): BookingServiceCardStyle => value === "spotlight" || value === "wheel" || value === "grid" || value === "feature" ? value : "stack";
    const selectedServiceCardStyle = resolveServiceCardStyle(settings.visibleSections.serviceCardStyle);
    const selectedServiceDisplayId: BookingServiceCardStyle | "standard" = settings.visibleSections.serviceCards === true ? selectedServiceCardStyle : "standard";
    const [serviceDisplayDraft, setServiceDisplayDraft] = useState<BookingServiceCardStyle | "standard">(selectedServiceDisplayId);
    const selectedServiceDisplayStyle = settings.visibleSections.serviceCards === true ? serviceCardStyles.find((style) => style.id === selectedServiceCardStyle) || serviceCardStyles[0] : null;
    const selectedDateDisplayId: BookingDateDisplayMode = settings.visibleSections.dateCalendar === true ? "calendar" : settings.visibleSections.dateWheel === true ? "wheel" : "standard";
    const [dateDisplayDraft, setDateDisplayDraft] = useState<BookingDateDisplayMode>(selectedDateDisplayId);
    const dateDisplayDraftRef = useRef<BookingDateDisplayMode>(selectedDateDisplayId);
    const selectedDateDisplayStyle = dateDisplayModes.find((mode) => mode.id === selectedDateDisplayId) || dateDisplayModes[0];
    const defaultBookingFlowEnabled = settings.visibleSections.serviceImages !== true && settings.visibleSections.serviceCards !== true && settings.visibleSections.dateWheel !== true && settings.visibleSections.dateCalendar !== true && headingMode === "friendly";
    const resolveAccentMode = (value: unknown): BookingAccentMode | "custom" => value === "default" || value === "current" || value === "black" || value === "rose" || value === "blue" || value === "violet" ? value : "custom";
    const selectedColorTheme = resolveAccentMode(settings.visibleSections.accentMode) !== "custom" ? resolveAccentMode(settings.visibleSections.accentMode) : colorThemes.find((theme) => theme.primary.toLowerCase() === settings.primaryColor.toLowerCase() && theme.button.toLowerCase() === settings.buttonColor.toLowerCase())?.id || "custom";
    const selectedAccent = colorThemes.find((theme) => theme.id === selectedColorTheme);
    const currentAccentTitle = selectedAccent?.title || "Свой цвет";
    const currentAccentSubtitle = selectedAccent?.subtitle || settings.primaryColor.toUpperCase();
    const normalizeHexColor = (value: string, fallback = settings.primaryColor || "#0F766E") => /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim().toUpperCase() : fallback.toUpperCase();
    useEffect(() => () => {
        if (accentSheetCloseTimerRef.current)
            window.clearTimeout(accentSheetCloseTimerRef.current);
        cleanupAccentSheetWindowListeners();
    }, []);
    const cleanupAccentSheetWindowListeners = () => {
        window.removeEventListener("pointermove", handleAccentSheetWindowPointerMove);
        window.removeEventListener("pointerup", handleAccentSheetWindowPointerUp);
        window.removeEventListener("pointercancel", handleAccentSheetWindowPointerCancel);
        window.removeEventListener("mousemove", handleAccentSheetWindowMouseMove);
        window.removeEventListener("mouseup", handleAccentSheetWindowMouseUp);
        window.removeEventListener("touchmove", handleAccentSheetWindowTouchMove);
        window.removeEventListener("touchend", handleAccentSheetWindowTouchEnd);
        window.removeEventListener("touchcancel", handleAccentSheetWindowTouchCancel);
    };
    const listenAccentSheetWindowGesture = () => {
        cleanupAccentSheetWindowListeners();
        window.addEventListener("pointermove", handleAccentSheetWindowPointerMove, { passive: false });
        window.addEventListener("pointerup", handleAccentSheetWindowPointerUp);
        window.addEventListener("pointercancel", handleAccentSheetWindowPointerCancel);
        window.addEventListener("mousemove", handleAccentSheetWindowMouseMove, { passive: false });
        window.addEventListener("mouseup", handleAccentSheetWindowMouseUp);
        window.addEventListener("touchmove", handleAccentSheetWindowTouchMove, { passive: false });
        window.addEventListener("touchend", handleAccentSheetWindowTouchEnd);
        window.addEventListener("touchcancel", handleAccentSheetWindowTouchCancel);
    };
    const closeAccentPicker = () => {
        accentSheetSwipeRef.current = null;
        cleanupAccentSheetWindowListeners();
        if (accentSheetCloseTimerRef.current)
            window.clearTimeout(accentSheetCloseTimerRef.current);
        setAccentSheetPhase("closing");
        accentSheetCloseTimerRef.current = window.setTimeout(() => {
            setAccentPickerOpen(false);
            setAccentSheetOffset(0);
            setAccentSheetPhase("open");
            accentSheetCloseTimerRef.current = null;
        }, 220);
    };
    const openAccentPicker = () => {
        if (accentSheetCloseTimerRef.current) {
            window.clearTimeout(accentSheetCloseTimerRef.current);
            accentSheetCloseTimerRef.current = null;
        }
        setCustomAccentDraft(normalizeHexColor(settings.primaryColor || "#0F766E", "#0F766E"));
        setAccentSheetOffset(0);
        setAccentSheetPhase("open");
        setAccentPickerOpen(true);
    };
    const shouldIgnoreAccentSheetSwipe = (target: EventTarget | null, allowFormControls = false) => target instanceof HTMLElement && Boolean(target.closest(allowFormControls ? "select, [contenteditable='true']" : "input, textarea, select, button, [contenteditable='true']"));
    const beginAccentSheetPointerSwipe = (event: PointerEvent<HTMLElement>) => {
        event.stopPropagation();
        if (shouldIgnoreAccentSheetSwipe(event.target, event.pointerType === "touch"))
            return;
        accentSheetSwipeRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startedAt: Date.now(), dragging: false };
        event.currentTarget.setPointerCapture(event.pointerId);
        accentSheetElementRef.current = event.currentTarget;
        listenAccentSheetWindowGesture();
    };
    const beginAccentSheetMouseSwipe = (event: MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        if (event.button !== 0 || shouldIgnoreAccentSheetSwipe(event.target))
            return;
        if (accentSheetSwipeRef.current?.pointerId !== undefined)
            return;
        accentSheetSwipeRef.current = { startX: event.clientX, startY: event.clientY, startedAt: Date.now(), dragging: false };
        accentSheetElementRef.current = event.currentTarget;
        listenAccentSheetWindowGesture();
    };
    const moveAccentSheetSwipe = (clientX: number, clientY: number, sheet: HTMLElement, cancelDefault: () => void) => {
        const swipe = accentSheetSwipeRef.current;
        if (!swipe)
            return;
        const deltaX = clientX - swipe.startX;
        const deltaY = clientY - swipe.startY;
        if (!swipe.dragging && (deltaY < 10 || Math.abs(deltaY) < Math.abs(deltaX) * 1.25))
            return;
        if (deltaY <= 0)
            return;
        if (!swipe.dragging && sheet.scrollTop > 0)
            return;
        swipe.dragging = true;
        cancelDefault();
        setAccentSheetPhase("dragging");
        const maxOffset = Math.max(window.innerHeight, sheet.getBoundingClientRect().height);
        setAccentSheetOffset(Math.min(deltaY, maxOffset));
    };
    const finishAccentSheetSwipe = (clientY: number, cancelDefault: () => void) => {
        const swipe = accentSheetSwipeRef.current;
        if (!swipe)
            return;
        accentSheetSwipeRef.current = null;
        cleanupAccentSheetWindowListeners();
        const deltaY = clientY - swipe.startY;
        const elapsed = Math.max(1, Date.now() - swipe.startedAt);
        const velocity = deltaY / elapsed;
        if (swipe.dragging)
            cancelDefault();
        if (deltaY > 92 || (deltaY > 52 && velocity > 0.45)) {
            closeAccentPicker();
            return;
        }
        setAccentSheetPhase("settling");
        setAccentSheetOffset(0);
        window.setTimeout(() => {
            setAccentSheetPhase((current) => current === "settling" ? "open" : current);
        }, 180);
    };
    const handleAccentSheetWindowPointerMove = (event: globalThis.PointerEvent) => {
        const swipe = accentSheetSwipeRef.current;
        const sheet = accentSheetElementRef.current;
        if (!swipe || !sheet || swipe.pointerId !== event.pointerId)
            return;
        moveAccentSheetSwipe(event.clientX, event.clientY, sheet, () => {
            event.preventDefault();
            event.stopPropagation();
        });
    };
    const handleAccentSheetWindowPointerUp = (event: globalThis.PointerEvent) => {
        const swipe = accentSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== event.pointerId)
            return;
        finishAccentSheetSwipe(event.clientY, () => {
            event.preventDefault();
            event.stopPropagation();
        });
    };
    const handleAccentSheetWindowPointerCancel = (event: globalThis.PointerEvent) => {
        const swipe = accentSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== event.pointerId)
            return;
        accentSheetSwipeRef.current = null;
        cleanupAccentSheetWindowListeners();
        setAccentSheetPhase("settling");
        setAccentSheetOffset(0);
    };
    const handleAccentSheetWindowMouseMove = (event: globalThis.MouseEvent) => {
        const swipe = accentSheetSwipeRef.current;
        const sheet = accentSheetElementRef.current;
        if (!swipe || !sheet || swipe.pointerId !== undefined)
            return;
        moveAccentSheetSwipe(event.clientX, event.clientY, sheet, () => {
            event.preventDefault();
            event.stopPropagation();
        });
    };
    const handleAccentSheetWindowMouseUp = (event: globalThis.MouseEvent) => {
        const swipe = accentSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== undefined)
            return;
        finishAccentSheetSwipe(event.clientY, () => {
            event.preventDefault();
            event.stopPropagation();
        });
    };
    const handleAccentSheetWindowTouchMove = (event: globalThis.TouchEvent) => {
        const touch = event.touches[0];
        const sheet = accentSheetElementRef.current;
        if (!touch || !sheet)
            return;
        moveAccentSheetSwipe(touch.clientX, touch.clientY, sheet, () => {
            event.preventDefault();
            event.stopPropagation();
        });
    };
    const handleAccentSheetWindowTouchEnd = (event: globalThis.TouchEvent) => {
        const touch = event.changedTouches[0];
        if (!touch)
            return;
        finishAccentSheetSwipe(touch.clientY, () => {
            event.preventDefault();
            event.stopPropagation();
        });
    };
    const handleAccentSheetWindowTouchCancel = () => {
        accentSheetSwipeRef.current = null;
        cleanupAccentSheetWindowListeners();
        setAccentSheetPhase("settling");
        setAccentSheetOffset(0);
    };
    const handleAccentSheetPointerMove = (event: PointerEvent<HTMLElement>) => {
        event.stopPropagation();
        const swipe = accentSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== event.pointerId)
            return;
        moveAccentSheetSwipe(event.clientX, event.clientY, event.currentTarget, () => {
            event.preventDefault();
        });
    };
    const handleAccentSheetPointerUp = (event: PointerEvent<HTMLElement>) => {
        event.stopPropagation();
        const swipe = accentSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== event.pointerId)
            return;
        event.currentTarget.releasePointerCapture(event.pointerId);
        finishAccentSheetSwipe(event.clientY, () => {
            event.preventDefault();
        });
    };
    const handleAccentSheetMouseMove = (event: MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        const swipe = accentSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== undefined)
            return;
        moveAccentSheetSwipe(event.clientX, event.clientY, event.currentTarget, () => {
            event.preventDefault();
        });
    };
    const handleAccentSheetMouseUp = (event: MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        const swipe = accentSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== undefined)
            return;
        finishAccentSheetSwipe(event.clientY, () => {
            event.preventDefault();
        });
    };
    const cancelAccentSheetPointerSwipe = (event: PointerEvent<HTMLElement>) => {
        const swipe = accentSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== event.pointerId)
            return;
        accentSheetSwipeRef.current = null;
        cleanupAccentSheetWindowListeners();
        setAccentSheetPhase("settling");
        setAccentSheetOffset(0);
    };
    const handleAccentSheetTouchStart = (event: TouchEvent<HTMLElement>) => {
        event.stopPropagation();
        const touch = event.touches[0];
        if (!touch || shouldIgnoreAccentSheetSwipe(event.target, true))
            return;
        accentSheetSwipeRef.current = { startX: touch.clientX, startY: touch.clientY, startedAt: Date.now(), dragging: false };
        accentSheetElementRef.current = event.currentTarget;
        listenAccentSheetWindowGesture();
    };
    const handleAccentSheetTouchMove = (event: TouchEvent<HTMLElement>) => {
        event.stopPropagation();
        const touch = event.touches[0];
        if (!touch)
            return;
        moveAccentSheetSwipe(touch.clientX, touch.clientY, event.currentTarget, () => {
            event.preventDefault();
        });
    };
    const handleAccentSheetTouchEnd = (event: TouchEvent<HTMLElement>) => {
        event.stopPropagation();
        const touch = event.changedTouches[0];
        if (!touch)
            return;
        finishAccentSheetSwipe(touch.clientY, () => {
            event.preventDefault();
        });
    };
    const accentSheetDragStyle = accentSheetPhase === "open" && accentSheetOffset === 0 ? undefined : {
        transform: accentSheetPhase === "closing" ? "translateY(100%)" : accentSheetOffset > 0 ? `translateY(${accentSheetOffset}px)` : "translateY(0)",
        transition: accentSheetPhase === "dragging" ? "none" : "transform .22s cubic-bezier(.22, 1, .36, 1)",
        animation: "none",
        willChange: "transform",
    } as CSSProperties;
    const accentBackdropOpacity = accentSheetPhase === "closing" ? 0 : Math.max(0.08, 0.36 - Math.min(accentSheetOffset, 260) / 260 * 0.22);
    const accentSheetScreenStyle = {
        background: `rgba(17, 27, 33, ${accentBackdropOpacity.toFixed(3)})`,
        transition: accentSheetPhase === "dragging" ? "none" : "background .22s ease-out",
    } as CSSProperties;
    const openServiceDisplayPicker = () => {
        setServiceDisplayDraft(selectedServiceDisplayId);
        setServiceDisplayPickerOpen(true);
    };
    const openDateDisplayPicker = () => {
        dateDisplayDraftRef.current = selectedDateDisplayId;
        setDateDisplayDraft(selectedDateDisplayId);
        setDateDisplayPickerOpen(true);
    };
    useEffect(() => {
        if (dateDisplayPickerOpen) return;
        dateDisplayDraftRef.current = selectedDateDisplayId;
        setDateDisplayDraft(selectedDateDisplayId);
    }, [dateDisplayPickerOpen, selectedDateDisplayId]);
    const updateDateDisplayDraft = (mode: BookingDateDisplayMode) => {
        dateDisplayDraftRef.current = mode;
        setDateDisplayDraft(mode);
    };
    useEffect(() => () => {
        if (headingSheetCloseTimerRef.current)
            window.clearTimeout(headingSheetCloseTimerRef.current);
        cleanupHeadingSheetWindowListeners();
    }, []);
    const cleanupHeadingSheetWindowListeners = () => {
        window.removeEventListener("pointermove", handleHeadingSheetWindowPointerMove);
        window.removeEventListener("pointerup", handleHeadingSheetWindowPointerUp);
        window.removeEventListener("pointercancel", handleHeadingSheetWindowPointerCancel);
        window.removeEventListener("mousemove", handleHeadingSheetWindowMouseMove);
        window.removeEventListener("mouseup", handleHeadingSheetWindowMouseUp);
        window.removeEventListener("touchmove", handleHeadingSheetWindowTouchMove);
        window.removeEventListener("touchend", handleHeadingSheetWindowTouchEnd);
        window.removeEventListener("touchcancel", handleHeadingSheetWindowTouchCancel);
    };
    const listenHeadingSheetWindowGesture = () => {
        cleanupHeadingSheetWindowListeners();
        window.addEventListener("pointermove", handleHeadingSheetWindowPointerMove, { passive: false });
        window.addEventListener("pointerup", handleHeadingSheetWindowPointerUp);
        window.addEventListener("pointercancel", handleHeadingSheetWindowPointerCancel);
        window.addEventListener("mousemove", handleHeadingSheetWindowMouseMove, { passive: false });
        window.addEventListener("mouseup", handleHeadingSheetWindowMouseUp);
        window.addEventListener("touchmove", handleHeadingSheetWindowTouchMove, { passive: false });
        window.addEventListener("touchend", handleHeadingSheetWindowTouchEnd);
        window.addEventListener("touchcancel", handleHeadingSheetWindowTouchCancel);
    };
    const closeHeadingPicker = () => {
        headingSheetSwipeRef.current = null;
        cleanupHeadingSheetWindowListeners();
        if (headingSheetCloseTimerRef.current)
            window.clearTimeout(headingSheetCloseTimerRef.current);
        setHeadingSheetPhase("closing");
        headingSheetCloseTimerRef.current = window.setTimeout(() => {
            setHeadingPickerOpen(false);
            setHeadingSheetOffset(0);
            setHeadingSheetPhase("open");
            headingSheetCloseTimerRef.current = null;
        }, 220);
    };
    const openHeadingPicker = () => {
        if (headingSheetCloseTimerRef.current) {
            window.clearTimeout(headingSheetCloseTimerRef.current);
            headingSheetCloseTimerRef.current = null;
        }
        setHeadingSheetOffset(0);
        setHeadingSheetPhase("open");
        setHeadingPickerOpen(true);
    };
    const shouldIgnoreHeadingSheetSwipe = (target: EventTarget | null, allowButtons = false) => target instanceof HTMLElement && Boolean(target.closest(allowButtons ? "select, [contenteditable='true']" : "input, textarea, select, button, [contenteditable='true']"));
    const beginHeadingSheetPointerSwipe = (event: PointerEvent<HTMLElement>) => {
        event.stopPropagation();
        if (shouldIgnoreHeadingSheetSwipe(event.target, event.pointerType === "touch"))
            return;
        headingSheetSwipeRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startedAt: Date.now(), dragging: false };
        event.currentTarget.setPointerCapture(event.pointerId);
        headingSheetElementRef.current = event.currentTarget;
        listenHeadingSheetWindowGesture();
    };
    const beginHeadingSheetMouseSwipe = (event: MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        if (event.button !== 0 || shouldIgnoreHeadingSheetSwipe(event.target))
            return;
        if (headingSheetSwipeRef.current?.pointerId !== undefined)
            return;
        headingSheetSwipeRef.current = { startX: event.clientX, startY: event.clientY, startedAt: Date.now(), dragging: false };
        headingSheetElementRef.current = event.currentTarget;
        listenHeadingSheetWindowGesture();
    };
    const moveHeadingSheetSwipe = (clientX: number, clientY: number, sheet: HTMLElement, cancelDefault: () => void) => {
        const swipe = headingSheetSwipeRef.current;
        if (!swipe)
            return;
        const deltaX = clientX - swipe.startX;
        const deltaY = clientY - swipe.startY;
        if (!swipe.dragging && (deltaY < 10 || Math.abs(deltaY) < Math.abs(deltaX) * 1.25))
            return;
        if (deltaY <= 0)
            return;
        if (!swipe.dragging && sheet.scrollTop > 0)
            return;
        swipe.dragging = true;
        cancelDefault();
        setHeadingSheetPhase("dragging");
        const maxOffset = Math.max(window.innerHeight, sheet.getBoundingClientRect().height);
        setHeadingSheetOffset(Math.min(deltaY, maxOffset));
    };
    const finishHeadingSheetSwipe = (clientY: number, cancelDefault: () => void) => {
        const swipe = headingSheetSwipeRef.current;
        if (!swipe)
            return;
        headingSheetSwipeRef.current = null;
        cleanupHeadingSheetWindowListeners();
        const deltaY = clientY - swipe.startY;
        const elapsed = Math.max(1, Date.now() - swipe.startedAt);
        const velocity = deltaY / elapsed;
        if (swipe.dragging)
            cancelDefault();
        if (deltaY > 92 || (deltaY > 52 && velocity > 0.45)) {
            closeHeadingPicker();
            return;
        }
        setHeadingSheetPhase("settling");
        setHeadingSheetOffset(0);
        window.setTimeout(() => {
            setHeadingSheetPhase((current) => current === "settling" ? "open" : current);
        }, 180);
    };
    const handleHeadingSheetWindowPointerMove = (event: globalThis.PointerEvent) => {
        const swipe = headingSheetSwipeRef.current;
        const sheet = headingSheetElementRef.current;
        if (!swipe || !sheet || swipe.pointerId !== event.pointerId)
            return;
        moveHeadingSheetSwipe(event.clientX, event.clientY, sheet, () => {
            event.preventDefault();
            event.stopPropagation();
        });
    };
    const handleHeadingSheetWindowPointerUp = (event: globalThis.PointerEvent) => {
        const swipe = headingSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== event.pointerId)
            return;
        finishHeadingSheetSwipe(event.clientY, () => {
            event.preventDefault();
            event.stopPropagation();
        });
    };
    const handleHeadingSheetWindowPointerCancel = (event: globalThis.PointerEvent) => {
        const swipe = headingSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== event.pointerId)
            return;
        headingSheetSwipeRef.current = null;
        cleanupHeadingSheetWindowListeners();
        setHeadingSheetPhase("settling");
        setHeadingSheetOffset(0);
    };
    const handleHeadingSheetWindowMouseMove = (event: globalThis.MouseEvent) => {
        const swipe = headingSheetSwipeRef.current;
        const sheet = headingSheetElementRef.current;
        if (!swipe || !sheet || swipe.pointerId !== undefined)
            return;
        moveHeadingSheetSwipe(event.clientX, event.clientY, sheet, () => {
            event.preventDefault();
            event.stopPropagation();
        });
    };
    const handleHeadingSheetWindowMouseUp = (event: globalThis.MouseEvent) => {
        const swipe = headingSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== undefined)
            return;
        finishHeadingSheetSwipe(event.clientY, () => {
            event.preventDefault();
            event.stopPropagation();
        });
    };
    const handleHeadingSheetWindowTouchMove = (event: globalThis.TouchEvent) => {
        const touch = event.touches[0];
        const sheet = headingSheetElementRef.current;
        if (!touch || !sheet)
            return;
        moveHeadingSheetSwipe(touch.clientX, touch.clientY, sheet, () => {
            event.preventDefault();
            event.stopPropagation();
        });
    };
    const handleHeadingSheetWindowTouchEnd = (event: globalThis.TouchEvent) => {
        const touch = event.changedTouches[0];
        if (!touch)
            return;
        finishHeadingSheetSwipe(touch.clientY, () => {
            event.preventDefault();
            event.stopPropagation();
        });
    };
    const handleHeadingSheetWindowTouchCancel = () => {
        headingSheetSwipeRef.current = null;
        cleanupHeadingSheetWindowListeners();
        setHeadingSheetPhase("settling");
        setHeadingSheetOffset(0);
    };
    const handleHeadingSheetPointerMove = (event: PointerEvent<HTMLElement>) => {
        event.stopPropagation();
        const swipe = headingSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== event.pointerId)
            return;
        moveHeadingSheetSwipe(event.clientX, event.clientY, event.currentTarget, () => {
            event.preventDefault();
        });
    };
    const handleHeadingSheetPointerUp = (event: PointerEvent<HTMLElement>) => {
        event.stopPropagation();
        const swipe = headingSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== event.pointerId)
            return;
        event.currentTarget.releasePointerCapture(event.pointerId);
        finishHeadingSheetSwipe(event.clientY, () => {
            event.preventDefault();
        });
    };
    const handleHeadingSheetMouseMove = (event: MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        const swipe = headingSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== undefined)
            return;
        moveHeadingSheetSwipe(event.clientX, event.clientY, event.currentTarget, () => {
            event.preventDefault();
        });
    };
    const handleHeadingSheetMouseUp = (event: MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        const swipe = headingSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== undefined)
            return;
        finishHeadingSheetSwipe(event.clientY, () => {
            event.preventDefault();
        });
    };
    const cancelHeadingSheetPointerSwipe = (event: PointerEvent<HTMLElement>) => {
        const swipe = headingSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== event.pointerId)
            return;
        headingSheetSwipeRef.current = null;
        cleanupHeadingSheetWindowListeners();
        setHeadingSheetPhase("settling");
        setHeadingSheetOffset(0);
    };
    const handleHeadingSheetTouchStart = (event: TouchEvent<HTMLElement>) => {
        event.stopPropagation();
        const touch = event.touches[0];
        if (!touch || shouldIgnoreHeadingSheetSwipe(event.target, true))
            return;
        headingSheetSwipeRef.current = { startX: touch.clientX, startY: touch.clientY, startedAt: Date.now(), dragging: false };
        headingSheetElementRef.current = event.currentTarget;
        listenHeadingSheetWindowGesture();
    };
    const handleHeadingSheetTouchMove = (event: TouchEvent<HTMLElement>) => {
        event.stopPropagation();
        const touch = event.touches[0];
        if (!touch)
            return;
        moveHeadingSheetSwipe(touch.clientX, touch.clientY, event.currentTarget, () => {
            event.preventDefault();
        });
    };
    const handleHeadingSheetTouchEnd = (event: TouchEvent<HTMLElement>) => {
        event.stopPropagation();
        const touch = event.changedTouches[0];
        if (!touch)
            return;
        finishHeadingSheetSwipe(touch.clientY, () => {
            event.preventDefault();
        });
    };
    const headingSheetDragStyle = headingSheetPhase === "open" && headingSheetOffset === 0 ? undefined : {
        transform: headingSheetPhase === "closing" ? "translateY(100%)" : headingSheetOffset > 0 ? `translateY(${headingSheetOffset}px)` : "translateY(0)",
        transition: headingSheetPhase === "dragging" ? "none" : "transform .22s cubic-bezier(.22, 1, .36, 1)",
        animation: "none",
        willChange: "transform",
    } as CSSProperties;
    const headingBackdropOpacity = headingSheetPhase === "closing" ? 0 : Math.max(0.08, 0.36 - Math.min(headingSheetOffset, 260) / 260 * 0.22);
    const headingSheetScreenStyle = {
        background: `rgba(17, 27, 33, ${headingBackdropOpacity.toFixed(3)})`,
        transition: headingSheetPhase === "dragging" ? "none" : "background .22s ease-out",
    } as CSSProperties;
    useEffect(() => () => {
        if (addressSheetCloseTimerRef.current)
            window.clearTimeout(addressSheetCloseTimerRef.current);
        cleanupAddressSheetWindowListeners();
    }, []);
    const cleanupAddressSheetWindowListeners = () => {
        window.removeEventListener("pointermove", handleAddressSheetWindowPointerMove);
        window.removeEventListener("pointerup", handleAddressSheetWindowPointerUp);
        window.removeEventListener("pointercancel", handleAddressSheetWindowPointerCancel);
        window.removeEventListener("mousemove", handleAddressSheetWindowMouseMove);
        window.removeEventListener("mouseup", handleAddressSheetWindowMouseUp);
        window.removeEventListener("touchmove", handleAddressSheetWindowTouchMove);
        window.removeEventListener("touchend", handleAddressSheetWindowTouchEnd);
        window.removeEventListener("touchcancel", handleAddressSheetWindowTouchCancel);
    };
    const listenAddressSheetWindowGesture = () => {
        cleanupAddressSheetWindowListeners();
        window.addEventListener("pointermove", handleAddressSheetWindowPointerMove, { passive: false });
        window.addEventListener("pointerup", handleAddressSheetWindowPointerUp);
        window.addEventListener("pointercancel", handleAddressSheetWindowPointerCancel);
        window.addEventListener("mousemove", handleAddressSheetWindowMouseMove, { passive: false });
        window.addEventListener("mouseup", handleAddressSheetWindowMouseUp);
        window.addEventListener("touchmove", handleAddressSheetWindowTouchMove, { passive: false });
        window.addEventListener("touchend", handleAddressSheetWindowTouchEnd);
        window.addEventListener("touchcancel", handleAddressSheetWindowTouchCancel);
    };
    const closeAddressForm = () => {
        addressSheetSwipeRef.current = null;
        cleanupAddressSheetWindowListeners();
        if (addressSheetCloseTimerRef.current)
            window.clearTimeout(addressSheetCloseTimerRef.current);
        setAddressSheetPhase("closing");
        addressSheetCloseTimerRef.current = window.setTimeout(() => {
            setAddressFormOpen(false);
            setAddressSheetOffset(0);
            setAddressSheetPhase("open");
            addressSheetCloseTimerRef.current = null;
        }, 220);
    };
    const openAddressForm = () => {
        if (addressSheetCloseTimerRef.current) {
            window.clearTimeout(addressSheetCloseTimerRef.current);
            addressSheetCloseTimerRef.current = null;
        }
        setAddressDraft({ city: settings.city || "", address: settings.address || "", cabinet: "", guide: "", isOnline: settings.isOnline === true });
        setAddressSheetOffset(0);
        setAddressSheetPhase("open");
        setAddressFormOpen(true);
    };
    const updateSettings = (patch: Partial<BookingPageSettings>) => props.setBookingPageSettings((current) => ({ ...current, ...patch }));
    const updateAddressDraft = (patch: Partial<typeof addressDraft>) => setAddressDraft((current) => ({ ...current, ...patch }));
    const saveAddressForm = () => {
        const address = [addressDraft.address.trim(), addressDraft.cabinet.trim(), addressDraft.guide.trim()].filter(Boolean).join(", ");
        const next = {
            ...settings,
            city: addressDraft.city.trim(),
            address,
            isOnline: addressDraft.isOnline,
        };
        props.setBookingPageSettings(next);
        void props.saveBookingPageSettings(next);
        closeAddressForm();
    };
    const shouldIgnoreAddressSheetSwipe = (target: EventTarget | null, allowFormControls = false) => target instanceof HTMLElement && Boolean(target.closest(allowFormControls ? "select, [contenteditable='true']" : "input, textarea, select, button, [contenteditable='true']"));
    const beginAddressSheetPointerSwipe = (event: PointerEvent<HTMLElement>) => {
        event.stopPropagation();
        if (shouldIgnoreAddressSheetSwipe(event.target, event.pointerType === "touch"))
            return;
        addressSheetSwipeRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startedAt: Date.now(), dragging: false };
        event.currentTarget.setPointerCapture(event.pointerId);
        addressSheetElementRef.current = event.currentTarget;
        listenAddressSheetWindowGesture();
    };
    const beginAddressSheetMouseSwipe = (event: MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        if (event.button !== 0 || shouldIgnoreAddressSheetSwipe(event.target))
            return;
        if (addressSheetSwipeRef.current?.pointerId !== undefined)
            return;
        addressSheetSwipeRef.current = { startX: event.clientX, startY: event.clientY, startedAt: Date.now(), dragging: false };
        addressSheetElementRef.current = event.currentTarget;
        listenAddressSheetWindowGesture();
    };
    const moveAddressSheetSwipe = (clientX: number, clientY: number, sheet: HTMLElement, cancelDefault: () => void) => {
        const swipe = addressSheetSwipeRef.current;
        if (!swipe)
            return;
        const deltaX = clientX - swipe.startX;
        const deltaY = clientY - swipe.startY;
        if (!swipe.dragging && (deltaY < 10 || Math.abs(deltaY) < Math.abs(deltaX) * 1.25))
            return;
        if (deltaY <= 0)
            return;
        if (!swipe.dragging && sheet.scrollTop > 0)
            return;
        swipe.dragging = true;
        cancelDefault();
        setAddressSheetPhase("dragging");
        const maxOffset = Math.max(window.innerHeight, sheet.getBoundingClientRect().height);
        setAddressSheetOffset(Math.min(deltaY, maxOffset));
    };
    const finishAddressSheetSwipe = (clientY: number, cancelDefault: () => void) => {
        const swipe = addressSheetSwipeRef.current;
        if (!swipe)
            return;
        addressSheetSwipeRef.current = null;
        cleanupAddressSheetWindowListeners();
        const deltaY = clientY - swipe.startY;
        const elapsed = Math.max(1, Date.now() - swipe.startedAt);
        const velocity = deltaY / elapsed;
        if (swipe.dragging)
            cancelDefault();
        if (deltaY > 92 || (deltaY > 52 && velocity > 0.45)) {
            closeAddressForm();
            return;
        }
        setAddressSheetPhase("settling");
        setAddressSheetOffset(0);
        window.setTimeout(() => {
            setAddressSheetPhase((current) => current === "settling" ? "open" : current);
        }, 180);
    };
    const handleAddressSheetWindowPointerMove = (event: globalThis.PointerEvent) => {
        const swipe = addressSheetSwipeRef.current;
        const sheet = addressSheetElementRef.current;
        if (!swipe || !sheet || swipe.pointerId !== event.pointerId)
            return;
        moveAddressSheetSwipe(event.clientX, event.clientY, sheet, () => {
            event.preventDefault();
            event.stopPropagation();
        });
    };
    const handleAddressSheetWindowPointerUp = (event: globalThis.PointerEvent) => {
        const swipe = addressSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== event.pointerId)
            return;
        finishAddressSheetSwipe(event.clientY, () => {
            event.preventDefault();
            event.stopPropagation();
        });
    };
    const handleAddressSheetWindowPointerCancel = (event: globalThis.PointerEvent) => {
        const swipe = addressSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== event.pointerId)
            return;
        addressSheetSwipeRef.current = null;
        cleanupAddressSheetWindowListeners();
        setAddressSheetPhase("settling");
        setAddressSheetOffset(0);
    };
    const handleAddressSheetWindowMouseMove = (event: globalThis.MouseEvent) => {
        const swipe = addressSheetSwipeRef.current;
        const sheet = addressSheetElementRef.current;
        if (!swipe || !sheet || swipe.pointerId !== undefined)
            return;
        moveAddressSheetSwipe(event.clientX, event.clientY, sheet, () => {
            event.preventDefault();
            event.stopPropagation();
        });
    };
    const handleAddressSheetWindowMouseUp = (event: globalThis.MouseEvent) => {
        const swipe = addressSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== undefined)
            return;
        finishAddressSheetSwipe(event.clientY, () => {
            event.preventDefault();
            event.stopPropagation();
        });
    };
    const handleAddressSheetWindowTouchMove = (event: globalThis.TouchEvent) => {
        const touch = event.touches[0];
        const sheet = addressSheetElementRef.current;
        if (!touch || !sheet)
            return;
        moveAddressSheetSwipe(touch.clientX, touch.clientY, sheet, () => {
            event.preventDefault();
            event.stopPropagation();
        });
    };
    const handleAddressSheetWindowTouchEnd = (event: globalThis.TouchEvent) => {
        const touch = event.changedTouches[0];
        if (!touch)
            return;
        finishAddressSheetSwipe(touch.clientY, () => {
            event.preventDefault();
            event.stopPropagation();
        });
    };
    const handleAddressSheetWindowTouchCancel = () => {
        addressSheetSwipeRef.current = null;
        cleanupAddressSheetWindowListeners();
        setAddressSheetPhase("settling");
        setAddressSheetOffset(0);
    };
    const handleAddressSheetPointerMove = (event: PointerEvent<HTMLElement>) => {
        event.stopPropagation();
        const swipe = addressSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== event.pointerId)
            return;
        moveAddressSheetSwipe(event.clientX, event.clientY, event.currentTarget, () => {
            event.preventDefault();
        });
    };
    const handleAddressSheetPointerUp = (event: PointerEvent<HTMLElement>) => {
        event.stopPropagation();
        const swipe = addressSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== event.pointerId)
            return;
        event.currentTarget.releasePointerCapture(event.pointerId);
        finishAddressSheetSwipe(event.clientY, () => {
            event.preventDefault();
        });
    };
    const handleAddressSheetMouseMove = (event: MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        const swipe = addressSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== undefined)
            return;
        moveAddressSheetSwipe(event.clientX, event.clientY, event.currentTarget, () => {
            event.preventDefault();
        });
    };
    const handleAddressSheetMouseUp = (event: MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        const swipe = addressSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== undefined)
            return;
        finishAddressSheetSwipe(event.clientY, () => {
            event.preventDefault();
        });
    };
    const cancelAddressSheetPointerSwipe = (event: PointerEvent<HTMLElement>) => {
        const swipe = addressSheetSwipeRef.current;
        if (!swipe || swipe.pointerId !== event.pointerId)
            return;
        addressSheetSwipeRef.current = null;
        cleanupAddressSheetWindowListeners();
        setAddressSheetPhase("settling");
        setAddressSheetOffset(0);
    };
    const handleAddressSheetTouchStart = (event: TouchEvent<HTMLElement>) => {
        event.stopPropagation();
        const touch = event.touches[0];
        if (!touch || shouldIgnoreAddressSheetSwipe(event.target, true))
            return;
        addressSheetSwipeRef.current = { startX: touch.clientX, startY: touch.clientY, startedAt: Date.now(), dragging: false };
        addressSheetElementRef.current = event.currentTarget;
        listenAddressSheetWindowGesture();
    };
    const handleAddressSheetTouchMove = (event: TouchEvent<HTMLElement>) => {
        event.stopPropagation();
        const touch = event.touches[0];
        if (!touch)
            return;
        moveAddressSheetSwipe(touch.clientX, touch.clientY, event.currentTarget, () => {
            event.preventDefault();
        });
    };
    const handleAddressSheetTouchEnd = (event: TouchEvent<HTMLElement>) => {
        event.stopPropagation();
        const touch = event.changedTouches[0];
        if (!touch)
            return;
        finishAddressSheetSwipe(touch.clientY, () => {
            event.preventDefault();
        });
    };
    const addressSheetDragStyle = addressSheetPhase === "open" && addressSheetOffset === 0 ? undefined : {
        transform: addressSheetPhase === "closing" ? "translateY(100%)" : addressSheetOffset > 0 ? `translateY(${addressSheetOffset}px)` : "translateY(0)",
        transition: addressSheetPhase === "dragging" ? "none" : "transform .22s cubic-bezier(.22, 1, .36, 1)",
        animation: "none",
        willChange: "transform",
    } as CSSProperties;
    const addressBackdropOpacity = addressSheetPhase === "closing" ? 0 : Math.max(0.08, 0.36 - Math.min(addressSheetOffset, 260) / 260 * 0.22);
    const addressSheetScreenStyle = {
        background: `rgba(17, 27, 33, ${addressBackdropOpacity.toFixed(3)})`,
        transition: addressSheetPhase === "dragging" ? "none" : "background .22s ease-out",
    } as CSSProperties;
    const toggleAddressVisibility = () => {
        props.setBookingPageSettings((current) => {
            const next = {
                ...current,
                visibleSections: {
                    ...current.visibleSections,
                    address: current.visibleSections.address === false,
                },
            };
            void props.saveBookingPageSettings(next);
            return next;
        });
    };
    const toggleServiceImages = () => {
        props.setBookingPageSettings((current) => {
            const next = {
                ...current,
                visibleSections: {
                    ...current.visibleSections,
                    serviceImages: current.visibleSections.serviceImages !== true,
                },
            };
            void props.saveBookingPageSettings(next);
            return next;
        });
    };
    const updateHeadingMode = (mode: BookingHeadingMode) => {
        props.setBookingPageSettings((current) => {
            const next = {
                ...current,
                visibleSections: {
                    ...current.visibleSections,
                    headingMode: mode,
                },
            };
            void props.saveBookingPageSettings(next);
            return next;
        });
    };
    const resetBookingFlowToDefault = () => {
        props.setBookingPageSettings((current) => {
            const next = {
                ...current,
                visibleSections: {
                    ...current.visibleSections,
                    serviceImages: false,
                    serviceCards: false,
                    dateWheel: false,
                    dateCalendar: false,
                    serviceCardStyle: "stack",
                    headingMode: "friendly",
                },
            };
            void props.saveBookingPageSettings(next);
            return next;
        });
    };
    const updateServiceCardStyle = (style: BookingServiceCardStyle) => {
        setServiceDisplayDraft(style);
    };
    const useStandardServiceDisplay = () => {
        setServiceDisplayDraft("standard");
    };
    const applyServiceDisplayDraft = () => {
        props.setBookingPageSettings((current) => {
            const next = {
                ...current,
                visibleSections: {
                    ...current.visibleSections,
                    serviceCards: serviceDisplayDraft !== "standard",
                    serviceCardStyle: serviceDisplayDraft === "standard" ? current.visibleSections.serviceCardStyle : serviceDisplayDraft,
                },
            };
            void props.saveBookingPageSettings(next);
            return next;
        });
        setServiceDisplayPickerOpen(false);
    };
    const applyDateDisplayDraft = () => {
        const nextDateDisplay = dateDisplayDraftRef.current;
        props.setBookingPageSettings((current) => {
            const next = {
                ...current,
                visibleSections: {
                    ...current.visibleSections,
                    dateWheel: nextDateDisplay === "wheel",
                    dateCalendar: nextDateDisplay === "calendar",
                },
            };
            void props.saveBookingPageSettings(next);
            return next;
        });
        setDateDisplayPickerOpen(false);
    };
    const updateColorTheme = (theme: { id: BookingAccentMode; primary: string; button: string }) => {
        props.setBookingPageSettings((current) => {
            const next = { ...current, primaryColor: theme.primary, buttonColor: theme.button, visibleSections: { ...current.visibleSections, accentMode: theme.id } };
            void props.saveBookingPageSettings(next);
            return next;
        });
        setCustomAccentDraft(theme.primary);
        closeAccentPicker();
    };
    const applyCustomAccentColor = () => {
        const color = normalizeHexColor(customAccentDraft, settings.primaryColor || "#0F766E");
        props.setBookingPageSettings((current) => {
            const next = { ...current, primaryColor: color, buttonColor: color, visibleSections: { ...current.visibleSections, accentMode: "custom" } };
            void props.saveBookingPageSettings(next);
            return next;
        });
        setCustomAccentDraft(color);
        closeAccentPicker();
    };
    const toggleShowPrice = () => {
        props.setBookingPageSettings((current) => {
            const next = { ...current, showPrice: current.showPrice === false };
            void props.saveBookingPageSettings(next);
            return next;
        });
    };
    const updateCtaText = (value: string, save = false) => {
        const text = value.slice(0, 80);
        props.setBookingPageSettings((current) => {
            const next = { ...current, ctaText: text };
            if (save)
                void props.saveBookingPageSettings({ ...next, ctaText: text.trim() || "Записаться" });
            return next;
        });
    };
    return (
        <div className="booking-settings-page space-y-4">
            <a href={props.bookingUrl} target="_blank" rel="noreferrer" className="booking-open-page-button rounded-xl border border-border px-4 py-3 text-center text-settingsRowTitle text-textPrimary hover:bg-background">Открыть страницу</a>
            <BookingPageTopPreview masterName={props.masterName} onDelete={props.deleteBookingImage} onUpload={props.uploadBookingImage} settings={settings}/>
            <section className="booking-page-controls saas-card space-y-4 p-4 md:p-5">
                <article className="booking-page-control-section">
                    <button type="button" onClick={resetBookingFlowToDefault} className="settings-toggle-row flex w-full items-center justify-between gap-4 rounded-xl px-0 py-1 text-left" aria-pressed={defaultBookingFlowEnabled}>
                        <span className="flex min-w-0 items-center gap-3">
                            <span className="settings-menu-icon settings-menu-icon-booking" aria-hidden="true">
                                <SettingsGlyph name="booking"/>
                            </span>
                            <span className="min-w-0">
                                <span className="block text-settingsRowTitle text-textPrimary">Стандартная форма записи</span>
                                <span className="mt-0.5 block text-settingsRowDescription text-textSecondary">Классический список услуг без фото и карточек, заголовки шагов - дружелюбные.</span>
                            </span>
                        </span>
                        <SettingsSwitch checked={defaultBookingFlowEnabled}/>
                   </button>
                </article>
                <article className="booking-page-control-section space-y-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="settings-menu-icon settings-menu-icon-address" aria-hidden="true">
                                <SettingsGlyph name="address"/>
                            </span>
                            <div className="min-w-0">
                                <h2 className="text-navigationTitle text-textPrimary">Мой рабочий адрес</h2>
                            </div>
                        </div>
                        <button type="button" onClick={toggleAddressVisibility} className="settings-toggle-row inline-flex shrink-0 items-center gap-3 rounded-xl border border-border px-3 py-2 text-settingsRowTitle text-textPrimary" aria-pressed={settings.visibleSections.address !== false}>
                            <span>{settings.visibleSections.address !== false ? "Скрыть адрес" : "Показать адрес"}</span>
                            <SettingsSwitch checked={settings.visibleSections.address !== false}/>
                       </button>
                    </div>
                    <button type="button" onClick={openAddressForm} className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-left transition hover:bg-background" aria-haspopup="dialog" aria-expanded={addressFormOpen}>
                        <span className="min-w-0">
                            <span className="block truncate text-settingsRowTitle text-textPrimary">
                                {settings.isOnline ? "Онлайн-приём" : settings.address || settings.city || "Заполнить адрес"}
                            </span>
                            <span className="mt-0.5 block truncate text-settingsRowDescription text-textSecondary">
                                {settings.isOnline ? "Адрес не показывается клиентам" : [settings.city, settings.address].filter(Boolean).join(", ") || "Город, улица, дом, кабинет и ориентир"}
                            </span>
                        </span>
                        <CaretRight className="h-5 w-5 shrink-0 text-textSecondary" weight="bold" aria-hidden="true"/>
                    </button>
                </article>
                <article className="booking-page-control-section">
                    <button type="button" onClick={toggleServiceImages} className="settings-toggle-row flex w-full items-center justify-between gap-4 rounded-xl px-0 py-1 text-left" aria-pressed={settings.visibleSections.serviceImages === true}>
                        <span className="flex min-w-0 items-center gap-3">
                            <span className="settings-menu-icon settings-menu-icon-services" aria-hidden="true">
                                <SettingsGlyph name="services"/>
                            </span>
                            <span className="min-w-0">
                                <span className="block text-settingsRowTitle text-textPrimary">Фото услуг</span>
                                <span className="mt-0.5 block text-settingsRowDescription text-textSecondary">Показывает актуальные изображения услуг на публичной странице записи.</span>
                            </span>
                        </span>
                        <SettingsSwitch checked={settings.visibleSections.serviceImages === true}/>
                   </button>
                </article>
                <article className="booking-page-control-section">
                    <button type="button" onClick={openServiceDisplayPicker} className="settings-toggle-row flex w-full items-center justify-between gap-4 rounded-xl px-0 py-1 text-left" aria-haspopup="dialog" aria-expanded={serviceDisplayPickerOpen}>
                        <span className="flex min-w-0 items-center gap-3">
                            <span className="settings-menu-icon settings-menu-icon-services" aria-hidden="true">
                                <SettingsGlyph name="services"/>
                            </span>
                            <span className="min-w-0">
                                <span className="block text-settingsRowTitle text-textPrimary">Виды отображения услуг</span>
                                <span className="mt-0.5 block text-settingsRowDescription text-textSecondary">
                                    Выбрано: {selectedServiceDisplayStyle ? selectedServiceDisplayStyle.title : "Стандартный список"}
                                </span>
                            </span>
                        </span>
                        <CaretRight className="h-5 w-5 shrink-0 text-textSecondary" weight="bold" aria-hidden="true"/>
                   </button>
                </article>
                <article className="booking-page-control-section">
                    <button type="button" onClick={openDateDisplayPicker} className="settings-toggle-row flex w-full items-center justify-between gap-4 rounded-xl px-0 py-1 text-left" aria-haspopup="dialog" aria-expanded={dateDisplayPickerOpen}>
                        <span className="flex min-w-0 items-center gap-3">
                            <span className="settings-menu-icon settings-menu-icon-calendar" aria-hidden="true">
                                <SettingsGlyph name="calendar"/>
                            </span>
                            <span className="min-w-0">
                                <span className="block text-settingsRowTitle text-textPrimary">Вид выбора даты</span>
                                <span className="mt-0.5 block text-settingsRowDescription text-textSecondary">Выбрано: {selectedDateDisplayStyle.title}</span>
                            </span>
                        </span>
                        <CaretRight className="h-5 w-5 shrink-0 text-textSecondary" weight="bold" aria-hidden="true"/>
                   </button>
                </article>
                <article className="booking-page-control-section">
                    <button type="button" onClick={openHeadingPicker} className="settings-toggle-row flex w-full items-center justify-between gap-4 rounded-xl px-0 py-1 text-left" aria-haspopup="dialog" aria-expanded={headingPickerOpen}>
                        <span className="flex min-w-0 items-center gap-3">
                            <span className="settings-menu-icon settings-menu-icon-booking" aria-hidden="true">
                                <SettingsGlyph name="booking"/>
                            </span>
                            <span className="min-w-0">
                                <span className="block text-settingsRowTitle text-textPrimary">Заголовки шагов</span>
                                <span className="mt-0.5 block text-settingsRowDescription text-textSecondary">Выбрано: {selectedHeadingMode.title}</span>
                            </span>
                        </span>
                        <CaretRight className="h-5 w-5 shrink-0 text-textSecondary" weight="bold" aria-hidden="true"/>
                   </button>
                </article>
                <article className="booking-page-control-section">
                    <button type="button" onClick={openAccentPicker} className="settings-toggle-row flex w-full items-center justify-between gap-4 rounded-xl px-0 py-1 text-left">
                        <span className="flex min-w-0 items-center gap-3">
                            <span className="settings-menu-icon settings-menu-icon-appearance" aria-hidden="true">
                                <SettingsGlyph name="appearance"/>
                            </span>
                            <span className="min-w-0">
                                <span className="block text-settingsRowTitle text-textPrimary">Акцент страницы</span>
                                <span className="mt-0.5 block text-settingsRowDescription text-textSecondary">{currentAccentTitle} · {currentAccentSubtitle}</span>
                            </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface" aria-hidden="true">
                                <span className="h-7 w-7 rounded-full shadow-sm" style={{ backgroundColor: settings.primaryColor }}/>
                            </span>
                            <CaretRight className="h-5 w-5 text-textSecondary" weight="bold" aria-hidden="true"/>
                        </span>
                   </button>
                </article>
                <article className="booking-page-control-section">
                    <button type="button" onClick={toggleShowPrice} className="settings-toggle-row flex w-full items-center justify-between gap-4 rounded-xl px-0 py-1 text-left" aria-pressed={settings.showPrice !== false}>
                        <span className="flex min-w-0 items-center gap-3">
                            <span className="settings-menu-icon settings-menu-icon-finance" aria-hidden="true">
                                <SettingsGlyph name="finance"/>
                            </span>
                            <span className="min-w-0">
                                <span className="block text-settingsRowTitle text-textPrimary">Показывать цены</span>
                                <span className="mt-0.5 block text-settingsRowDescription text-textSecondary">Если выключить, вместо стоимости на публичной странице будет “по запросу”.</span>
                            </span>
                        </span>
                        <SettingsSwitch checked={settings.showPrice !== false}/>
                   </button>
                </article>
                <article className="booking-page-control-section space-y-3">
                    <div className="flex items-start gap-3">
                        <span className="settings-menu-icon settings-menu-icon-booking" aria-hidden="true">
                            <SettingsGlyph name="booking"/>
                        </span>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-navigationTitle text-textPrimary">Кнопка записи</h2>
                            <p className="mt-0.5 text-settingsRowDescription text-textSecondary">Текст основной кнопки на публичной странице.</p>
                        </div>
                    </div>
                    <input value={settings.ctaText} onChange={(event) => updateCtaText(event.target.value)} onBlur={(event) => updateCtaText(event.currentTarget.value, true)} className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-messageInput text-textPrimary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" placeholder="Записаться"/>
                </article>
            </section>
            {addressFormOpen && typeof document !== "undefined" && createPortal((
                <div className="master-workspace">
                    <div className="client-bottom-sheet-screen client-bottom-sheet-screen-open address-bottom-sheet-screen" data-dashboard-swipe-ignore="true" role="dialog" aria-modal="true" aria-labelledby="address-form-title" style={addressSheetScreenStyle} onClick={closeAddressForm} onPointerDown={(event) => event.stopPropagation()} onPointerMove={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()} onTouchStart={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) event.preventDefault(); }} onTouchMove={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) event.preventDefault(); }} onTouchEnd={(event) => event.stopPropagation()}>
                    <div className="client-bottom-sheet-spacer" aria-hidden="true"/>
                        <section className="client-bottom-sheet address-bottom-sheet" data-dashboard-swipe-ignore="true" style={addressSheetDragStyle} onClick={(event) => event.stopPropagation()} onPointerDown={beginAddressSheetPointerSwipe} onPointerMove={handleAddressSheetPointerMove} onPointerUp={handleAddressSheetPointerUp} onPointerCancel={cancelAddressSheetPointerSwipe} onMouseDown={beginAddressSheetMouseSwipe} onMouseMove={handleAddressSheetMouseMove} onMouseUp={handleAddressSheetMouseUp} onTouchStart={handleAddressSheetTouchStart} onTouchMove={handleAddressSheetTouchMove} onTouchEnd={handleAddressSheetTouchEnd} onTouchCancel={() => { addressSheetSwipeRef.current = null; cleanupAddressSheetWindowListeners(); setAddressSheetPhase("settling"); setAddressSheetOffset(0); }}>
                            <div className="grid gap-3">
                            <header className="client-bottom-sheet-header">
                                <div className="min-w-0">
                                    <p id="address-form-title" className="text-conversationName text-textPrimary">Рабочий адрес</p>
                                    <p className="mt-1 text-settingsRowDescription text-textSecondary">Данные будут показаны клиентам на странице записи.</p>
                                </div>
                                <button type="button" onClick={closeAddressForm} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background text-textPrimary hover:bg-background" aria-label="Закрыть" title="Закрыть">
                                    <CloseIcon />
                                </button>
                            </header>
                            <div className="grid gap-3">
                                <button type="button" onClick={() => updateAddressDraft({ isOnline: !addressDraft.isOnline })} className="settings-toggle-row flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-background px-3.5 py-3 text-left" aria-pressed={addressDraft.isOnline}>
                                    <span className="min-w-0">
                                        <span className="block text-settingsRowTitle text-textPrimary">Онлайн-приём</span>
                                        <span className="mt-0.5 block text-settingsRowDescription text-textSecondary">Включите, если клиенту не нужно приходить по адресу.</span>
                                    </span>
                                    <SettingsSwitch checked={addressDraft.isOnline}/>
                                </button>
                                <label className="space-y-2">
                                    <span className="text-settingsRowTitle text-textPrimary">Город</span>
                                    <input value={addressDraft.city} onChange={(event) => updateAddressDraft({ city: event.target.value })} className="settings-input min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-messageInput text-textPrimary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" placeholder="Например, Москва"/>
                                </label>
                                <label className="space-y-2">
                                    <span className="text-settingsRowTitle text-textPrimary">Улица и дом</span>
                                    <input value={addressDraft.address} onChange={(event) => updateAddressDraft({ address: event.target.value })} className="settings-input min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-messageInput text-textPrimary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" placeholder="Улица, дом"/>
                                </label>
                                <label className="space-y-2">
                                    <span className="text-settingsRowTitle text-textPrimary">Кабинет, этаж, подъезд</span>
                                    <input value={addressDraft.cabinet} onChange={(event) => updateAddressDraft({ cabinet: event.target.value })} className="settings-input min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-messageInput text-textPrimary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" placeholder="Например, 2 этаж, кабинет 14"/>
                                </label>
                                <label className="space-y-2">
                                    <span className="text-settingsRowTitle text-textPrimary">Ориентир или как найти</span>
                                    <textarea value={addressDraft.guide} onChange={(event) => updateAddressDraft({ guide: event.target.value })} className="settings-input min-h-24 w-full resize-none rounded-xl border border-border bg-surface px-3.5 py-2 text-messageInput text-textPrimary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" placeholder="Например, вход со двора, домофон 25, студия справа"/>
                                </label>
                            </div>
                            <footer className="address-bottom-sheet-actions grid gap-2">
                                <button type="button" onClick={closeAddressForm} className="address-form-cancel w-full rounded-xl px-4 py-3 text-buttonLabel shadow-none">Отмена</button>
                                <button type="button" onClick={saveAddressForm} disabled={props.bookingPageSaving} className="address-form-submit w-full rounded-xl px-4 py-3 text-buttonLabel disabled:opacity-60">
                                    {props.bookingPageSaving ? "Сохраняем..." : "Сохранить адрес"}
                                </button>
                            </footer>
                            </div>
                        </section>
                    </div>
                </div>
            ), document.body)}
            {serviceDisplayPickerOpen && typeof document !== "undefined" && createPortal((
                <div className="master-workspace">
                    <DraggableBottomSheetFrame screenClassName="service-display-page-screen" panelClassName="service-display-page" labelledBy="service-display-picker-title" onClose={() => setServiceDisplayPickerOpen(false)} showSpacer={false}>
                        <div className="service-display-page-content grid gap-3">
                            <div className="client-bottom-sheet-header service-display-page-header">
                                <div className="min-w-0">
                                    <p id="service-display-picker-title" className="text-conversationName text-textPrimary">Виды отображения услуг</p>
                                    <p className="mt-1 text-settingsRowDescription text-textSecondary">Выберите, как услуги будут выглядеть на публичной странице записи.</p>
                                </div>
                                <button type="button" onClick={() => setServiceDisplayPickerOpen(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background text-textPrimary hover:bg-background" aria-label="Закрыть" title="Закрыть">
                                    <CloseIcon />
                               </button>
                            </div>
                            <div className="service-display-page-list grid gap-2">
                                <button type="button" onClick={useStandardServiceDisplay} className={`service-display-option rounded-lg border px-3 py-3 text-left text-settingsRowDescription transition ${serviceDisplayDraft === "standard" ? "service-display-option-selected bg-background text-textPrimary shadow-sm" : "bg-surface text-textPrimary hover:bg-background"}`} aria-pressed={serviceDisplayDraft === "standard"}>
                                    <span className="service-display-option-content grid gap-3">
                                        <span className="service-display-preview service-display-preview-image service-display-preview-standard" aria-hidden="true">
                                            <img src={`${serviceDisplayPreviewBase}/standard.png`} alt="" loading="lazy" decoding="async"/>
                                        </span>
                                        <span className="service-display-option-footer grid grid-cols-[minmax(0,1fr)_24px] items-start gap-3">
                                            <span className="min-w-0">
                                                <span className="block text-settingsRowTitle">Стандартный список</span>
                                                <span className="mt-0.5 block text-settingsRowDescription text-textSecondary">Обычный компактный список услуг без больших карточек.</span>
                                            </span>
                                            <span className="flex h-5 w-5 items-center justify-center" aria-hidden="true">
                                                {serviceDisplayDraft === "standard" && <Check className="h-5 w-5 text-textPrimary" weight="bold"/>}
                                            </span>
                                        </span>
                                    </span>
                               </button>
                                {serviceCardStyles.map((style) => {
                                    const selected = serviceDisplayDraft === style.id;
                                    return (
                                        <button key={style.id} type="button" onClick={() => updateServiceCardStyle(style.id)} className={`service-display-option rounded-lg border px-3 py-3 text-left text-settingsRowDescription transition ${selected ? "service-display-option-selected bg-background text-textPrimary shadow-sm" : "bg-surface text-textPrimary hover:bg-background"}`} aria-pressed={selected}>
                                            <span className="service-display-option-content grid gap-3">
                                                <span className={`service-display-preview service-display-preview-image service-display-preview-${style.id}`} aria-hidden="true">
                                                    <img src={style.previewUrl} alt="" loading="lazy" decoding="async"/>
                                                </span>
                                                <span className="service-display-option-footer grid grid-cols-[minmax(0,1fr)_24px] items-start gap-3">
                                                    <span className="min-w-0">
                                                        <span className="block text-settingsRowTitle">{style.title}</span>
                                                        <span className="mt-0.5 block text-settingsRowDescription text-textSecondary">{style.subtitle}</span>
                                                    </span>
                                                    <span className="flex h-5 w-5 items-center justify-center" aria-hidden="true">
                                                        {selected && <Check className="h-5 w-5 text-textPrimary" weight="bold"/>}
                                                    </span>
                                                </span>
                                            </span>
                                       </button>
                                    );
                                })}
                            </div>
                            <div className="client-bottom-sheet-actions service-display-page-actions grid grid-cols-2 gap-2 md:flex md:flex-row">
                                <button type="button" onClick={applyServiceDisplayDraft} className="client-bottom-sheet-submit w-full rounded-lg bg-primary px-3 py-3 text-settingsRowTitle text-surface md:w-auto">
                                    Готово
                               </button>
                                <button type="button" onClick={() => setServiceDisplayPickerOpen(false)} className="client-bottom-sheet-cancel w-full rounded-lg border border-border px-3 py-3 text-settingsRowTitle md:w-auto">
                                    Не сейчас
                               </button>
                            </div>
                        </div>
                    </DraggableBottomSheetFrame>
                </div>
            ), document.body)}
            {dateDisplayPickerOpen && typeof document !== "undefined" && createPortal((
                <div className="master-workspace">
                    <DraggableBottomSheetFrame screenClassName="service-display-page-screen" panelClassName="service-display-page" labelledBy="date-display-picker-title" onClose={() => setDateDisplayPickerOpen(false)} showSpacer={false}>
                        <div className="service-display-page-content grid gap-3">
                            <div className="client-bottom-sheet-header service-display-page-header">
                                <div className="min-w-0">
                                    <p id="date-display-picker-title" className="text-conversationName text-textPrimary">Вид выбора даты</p>
                                    <p className="mt-1 text-settingsRowDescription text-textSecondary">Выберите, как клиент будет выбирать дату на публичной странице записи.</p>
                                </div>
                                <button type="button" onClick={() => setDateDisplayPickerOpen(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background text-textPrimary hover:bg-background" aria-label="Закрыть" title="Закрыть">
                                    <CloseIcon />
                               </button>
                            </div>
                            <div className="service-display-page-list grid gap-2">
                                {dateDisplayModes.map((mode) => {
                                    const selected = dateDisplayDraft === mode.id;
                                    return (
                                        <button key={mode.id} type="button" onClick={() => updateDateDisplayDraft(mode.id)} className={`service-display-option rounded-lg border px-3 py-3 text-left text-settingsRowDescription transition ${selected ? "service-display-option-selected bg-background text-textPrimary shadow-sm" : "bg-surface text-textPrimary hover:bg-background"}`} aria-pressed={selected}>
                                            <span className="service-display-option-content grid gap-3">
                                                <span className={`service-display-preview date-display-preview date-display-preview-${mode.id}`} aria-hidden="true">
                                                    {Array.from({ length: 35 }, (_, index) => <span key={index}/>)}
                                                </span>
                                                <span className="service-display-option-footer grid grid-cols-[minmax(0,1fr)_24px] items-start gap-3">
                                                    <span className="min-w-0">
                                                        <span className="block text-settingsRowTitle">{mode.title}</span>
                                                        <span className="mt-0.5 block text-settingsRowDescription text-textSecondary">{mode.subtitle}</span>
                                                    </span>
                                                    <span className="flex h-5 w-5 items-center justify-center" aria-hidden="true">
                                                        {selected && <Check className="h-5 w-5 text-textPrimary" weight="bold"/>}
                                                    </span>
                                                </span>
                                            </span>
                                       </button>
                                    );
                                })}
                            </div>
                            <div className="client-bottom-sheet-actions service-display-page-actions grid grid-cols-2 gap-2 md:flex md:flex-row">
                                <button type="button" onClick={applyDateDisplayDraft} className="client-bottom-sheet-submit w-full rounded-lg bg-primary px-3 py-3 text-settingsRowTitle text-surface md:w-auto">
                                    Готово
                               </button>
                                <button type="button" onClick={() => setDateDisplayPickerOpen(false)} className="client-bottom-sheet-cancel w-full rounded-lg border border-border px-3 py-3 text-settingsRowTitle md:w-auto">
                                    Не сейчас
                               </button>
                            </div>
                        </div>
                    </DraggableBottomSheetFrame>
                </div>
            ), document.body)}
            {headingPickerOpen && typeof document !== "undefined" && createPortal((
                <div className="master-workspace">
                    <div className="client-bottom-sheet-screen client-bottom-sheet-screen-open heading-bottom-sheet-screen" data-dashboard-swipe-ignore="true" role="dialog" aria-modal="true" aria-labelledby="heading-picker-title" style={headingSheetScreenStyle} onClick={closeHeadingPicker} onPointerDown={(event) => event.stopPropagation()} onPointerMove={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()} onTouchStart={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) event.preventDefault(); }} onTouchMove={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) event.preventDefault(); }} onTouchEnd={(event) => event.stopPropagation()}>
                    <div className="client-bottom-sheet-spacer" aria-hidden="true"/>
                    <div className="client-bottom-sheet" data-dashboard-swipe-ignore="true" style={headingSheetDragStyle} onClick={(event) => event.stopPropagation()} onPointerDown={beginHeadingSheetPointerSwipe} onPointerMove={handleHeadingSheetPointerMove} onPointerUp={handleHeadingSheetPointerUp} onPointerCancel={cancelHeadingSheetPointerSwipe} onMouseDown={beginHeadingSheetMouseSwipe} onMouseMove={handleHeadingSheetMouseMove} onMouseUp={handleHeadingSheetMouseUp} onTouchStart={handleHeadingSheetTouchStart} onTouchMove={handleHeadingSheetTouchMove} onTouchEnd={handleHeadingSheetTouchEnd} onTouchCancel={() => { headingSheetSwipeRef.current = null; cleanupHeadingSheetWindowListeners(); setHeadingSheetPhase("settling"); setHeadingSheetOffset(0); }}>
                        <div className="grid gap-3">
                            <div className="client-bottom-sheet-header">
                            <div className="min-w-0">
                                <p id="heading-picker-title" className="text-conversationName text-textPrimary">Заголовки шагов</p>
                                <p className="mt-1 text-settingsRowDescription text-textSecondary">Выберите тон заголовков на публичной странице записи.</p>
                            </div>
                            <button type="button" onClick={closeHeadingPicker} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background text-textPrimary hover:bg-background" aria-label="Закрыть" title="Закрыть">
                                <CloseIcon />
                           </button>
                            </div>
                            <div className="grid gap-2">
                                {headingModes.map((mode) => {
                                    const selected = headingMode === mode.id;
                                    return (
                                        <button key={mode.id} type="button" onClick={() => updateHeadingMode(mode.id)} className={`heading-mode-option rounded-lg border px-3 py-3 text-left text-settingsRowDescription transition ${selected ? "heading-mode-option-selected bg-background text-textPrimary shadow-sm" : "bg-surface text-textPrimary hover:bg-background"}`} aria-pressed={selected}>
                                            <span className="grid grid-cols-[minmax(0,1fr)_auto_24px] items-start gap-3">
                                                <span className="min-w-0">
                                                    <span className="block text-settingsRowTitle">{mode.title}</span>
                                                    <span className="mt-0.5 block text-settingsRowDescription text-textSecondary">{mode.subtitle}</span>
                                                </span>
                                                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-messageMetadata ${selected ? "border-textPrimary/30 text-textPrimary" : "border-current/20 text-textPrimary"}`}>{mode.preview}</span>
                                                <span className="mt-0.5 flex h-5 w-5 items-center justify-center" aria-hidden="true">
                                                    {selected && <Check className="h-5 w-5 text-textPrimary" weight="bold"/>}
                                                </span>
                                            </span>
                                       </button>
                                    );
                                })}
                            </div>
                            <div className="client-bottom-sheet-actions grid grid-cols-2 gap-2 md:flex md:flex-row">
                                <button type="button" onClick={closeHeadingPicker} className="client-bottom-sheet-submit w-full rounded-lg bg-primary px-3 py-3 text-settingsRowTitle text-surface md:w-auto">
                                    Готово
                               </button>
                                <button type="button" onClick={closeHeadingPicker} className="client-bottom-sheet-cancel w-full rounded-lg border border-border px-3 py-3 text-settingsRowTitle md:w-auto">
                                    Не сейчас
                               </button>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            ), document.body)}
            {accentPickerOpen && typeof document !== "undefined" && createPortal((
                <div className="master-workspace">
                    <div className="client-bottom-sheet-screen client-bottom-sheet-screen-open accent-bottom-sheet-screen" data-dashboard-swipe-ignore="true" role="dialog" aria-modal="true" aria-labelledby="accent-picker-title" style={accentSheetScreenStyle} onClick={closeAccentPicker} onPointerDown={(event) => event.stopPropagation()} onPointerMove={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()} onTouchStart={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) event.preventDefault(); }} onTouchMove={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) event.preventDefault(); }} onTouchEnd={(event) => event.stopPropagation()}>
                    <div className="client-bottom-sheet-spacer" aria-hidden="true"/>
                    <div className="client-bottom-sheet" data-dashboard-swipe-ignore="true" style={accentSheetDragStyle} onClick={(event) => event.stopPropagation()} onPointerDown={beginAccentSheetPointerSwipe} onPointerMove={handleAccentSheetPointerMove} onPointerUp={handleAccentSheetPointerUp} onPointerCancel={cancelAccentSheetPointerSwipe} onMouseDown={beginAccentSheetMouseSwipe} onMouseMove={handleAccentSheetMouseMove} onMouseUp={handleAccentSheetMouseUp} onTouchStart={handleAccentSheetTouchStart} onTouchMove={handleAccentSheetTouchMove} onTouchEnd={handleAccentSheetTouchEnd} onTouchCancel={() => { accentSheetSwipeRef.current = null; cleanupAccentSheetWindowListeners(); setAccentSheetPhase("settling"); setAccentSheetOffset(0); }}>
                        <div className="grid gap-3">
                            <div className="client-bottom-sheet-header">
                                <div className="min-w-0">
                                    <p id="accent-picker-title" className="text-conversationName text-textPrimary">Акцент страницы</p>
                                    <p className="mt-1 text-settingsRowDescription text-textSecondary">Цвет кнопок, выбранных дат и важных элементов.</p>
                                </div>
                                <button type="button" onClick={closeAccentPicker} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background text-textPrimary hover:bg-background" aria-label="Закрыть" title="Закрыть">
                                    <CloseIcon />
                               </button>
                            </div>
                            <div className="grid gap-2">
                                {colorThemes.map((theme) => {
                                    const selected = selectedColorTheme === theme.id;
                                    return (
                                        <button key={theme.id} type="button" onClick={() => updateColorTheme(theme)} className={`accent-mode-option rounded-lg border px-3 py-3 text-left text-settingsRowDescription transition ${selected ? "accent-mode-option-selected bg-background text-textPrimary shadow-sm" : "bg-surface text-textPrimary hover:bg-background"}`} aria-pressed={selected}>
                                            <span className="grid grid-cols-[44px_minmax(0,1fr)_24px] items-center gap-3">
                                                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface" aria-hidden="true">
                                                    <span className="h-7 w-7 rounded-full shadow-sm" style={{ backgroundColor: theme.primary }}/>
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block text-settingsRowTitle">{theme.title}</span>
                                                    <span className="mt-0.5 block text-settingsRowDescription text-textSecondary">{theme.subtitle}</span>
                                                </span>
                                                <span className="flex h-5 w-5 items-center justify-center" aria-hidden="true">
                                                    {selected && <Check className="h-5 w-5 text-textPrimary" weight="bold"/>}
                                                </span>
                                            </span>
                                       </button>
                                    );
                                })}
                            </div>
                            <div className={`accent-mode-custom rounded-lg border p-3 ${selectedColorTheme === "custom" ? "accent-mode-option-selected" : ""}`}>
                                <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-3">
                                    <label className="relative flex h-12 w-12 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-border bg-surface" aria-label="Выбрать свой цвет">
                                        <span className="h-8 w-8 rounded-full shadow-sm" style={{ backgroundColor: normalizeHexColor(customAccentDraft, settings.primaryColor || "#0F766E") }} aria-hidden="true"/>
                                        <input type="color" value={normalizeHexColor(customAccentDraft, settings.primaryColor || "#0F766E")} onChange={(event) => setCustomAccentDraft(event.target.value.toUpperCase())} className="absolute inset-0 h-full w-full cursor-pointer opacity-0"/>
                                    </label>
                                    <div className="min-w-0">
                                        <p className="text-settingsRowTitle text-textPrimary">Свой цвет</p>
                                        <p className="mt-0.5 text-settingsRowDescription text-textSecondary">Любой оттенок для публичной страницы.</p>
                                    </div>
                                </div>
                                <div className="mt-3 grid grid-cols-[minmax(0,1fr)_112px] gap-2">
                                    <input value={customAccentDraft} onChange={(event) => setCustomAccentDraft(event.target.value)} onBlur={(event) => setCustomAccentDraft(normalizeHexColor(event.currentTarget.value, settings.primaryColor || "#0F766E"))} className="h-11 min-w-0 rounded-lg border border-border bg-surface px-3 text-settingsRowTitle uppercase text-textPrimary outline-none transition focus:border-textPrimary" placeholder="#0F766E" maxLength={7}/>
                                    <button type="button" onClick={applyCustomAccentColor} className="client-bottom-sheet-submit h-11 rounded-lg px-3 text-buttonLabel">
                                        Применить
                                   </button>
                                </div>
                            </div>
                            <div className="client-bottom-sheet-actions grid grid-cols-2 gap-2 md:flex md:flex-row">
                                <button type="button" onClick={closeAccentPicker} className="client-bottom-sheet-submit w-full rounded-lg bg-primary px-3 py-3 text-settingsRowTitle text-surface md:w-auto">
                                    Готово
                               </button>
                                <button type="button" onClick={closeAccentPicker} className="client-bottom-sheet-cancel w-full rounded-lg border border-border px-3 py-3 text-settingsRowTitle md:w-auto">
                                    Не сейчас
                               </button>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            ), document.body)}
        </div>
    );
}
function BookingPageTopPreview({ masterName, onDelete, onUpload, settings, }: {
    masterName: string;
    onDelete: (type: "cover" | "avatar") => Promise<void>;
    onUpload: (type: "cover" | "avatar", file: File) => Promise<void>;
    settings: BookingPageSettings;
}) {
    const primaryColor = settings.primaryColor || "#0F766E";
    const coverPosition = `${settings.coverPositionX}% ${settings.coverPositionY}%`;
    return (<article className="booking-top-preview booking-top-listing-preview overflow-hidden rounded-[28px] border border-border bg-surface shadow-sm"> <div className="booking-top-cover" style={{ backgroundColor: settings.coverImageUrl ? undefined : `${primaryColor}14` }}> {settings.coverImageUrl ? (<img src={settings.coverImageUrl} alt="" draggable={false} style={{ objectPosition: coverPosition }}/>) : (<label className="booking-top-cover-add"> <Plus size={22} weight="bold" aria-hidden="true"/> <span>Добавить обложку</span> <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onUpload("cover", file); event.currentTarget.value = ""; }}/> </label>)} {settings.coverImageUrl && (<div className="booking-top-cover-actions"> <label>Заменить<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onUpload("cover", file); event.currentTarget.value = ""; }}/></label> <button type="button" onClick={() => void onDelete("cover")}>Удалить</button> </div>)} </div> </article>);
}
function TextField({ label, onChange, placeholder, value }: {
    label: string;
    onChange: (value: string) => void;
    placeholder?: string;
    value: string;
}) { return (<label className="space-y-1.5"> <span className="text-sectionLabel text-textSecondary">{label}</span> <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-border px-3 py-2 text-settingsRowDescription" placeholder={placeholder}/> </label>); }
function TextareaField({ label, onBlur, onChange, placeholder, value }: {
    label: string;
    onBlur?: () => void;
    onChange: (value: string) => void;
    placeholder?: string;
    value: string;
}) { return (<label className="space-y-1.5"> <span className="text-sectionLabel text-textSecondary">{label}</span> <textarea value={value} onBlur={onBlur} onChange={(event) => onChange(event.target.value)} className="min-h-28 w-full resize-y rounded-xl border border-border px-3 py-2 text-settingsRowDescription" placeholder={placeholder}/> </label>); }
function BookingNumberField({ label, min, onChange, value }: {
    label: string;
    min: number;
    onChange: (value: number) => void;
    value: number;
}) { return (<label className="space-y-1.5"> <span className="text-sectionLabel text-textSecondary">{label}</span> <input type="number" min={min} value={value} onChange={(event) => onChange(Number(event.target.value) || min)} className="w-full rounded-xl border border-border px-3 py-2 text-settingsRowDescription"/> </label>); }
function ColorField({ label, onChange, value }: {
    label: string;
    onChange: (value: string) => void;
    value: string;
}) { return (<label className="space-y-1.5"> <span className="text-sectionLabel text-textSecondary">{label}</span> <span className="flex gap-2"> <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-14 rounded-xl border border-border p-1"/> <input value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-border px-3 py-2 text-settingsRowDescription"/> </span> </label>); }
function ToggleRow({ checked, label, onChange }: {
    checked: boolean;
    label: string;
    onChange: (value: boolean) => void;
}) { return (<label className={`booking-check-row ${checked ? "booking-check-row-on" : ""}`}> <span className="booking-check-label">{label}</span> <span className="booking-check-control" aria-hidden="true"> <Check className="booking-check-icon" weight="bold"/> </span> <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="sr-only"/> </label>); }
function CoverImageUploader({ label, onDelete, onPositionChange, onUpload, positionX, positionY, url, }: {
    label: string;
    onDelete: (type: "cover" | "avatar") => Promise<void>;
    onPositionChange: (positionX: number, positionY: number) => void;
    onUpload: (type: "cover" | "avatar", file: File) => Promise<void>;
    positionX: number;
    positionY: number;
    url: string;
}) { const frameRef = useRef<HTMLDivElement | null>(null); const dragRef = useRef<{
    startX: number;
    startY: number;
    positionX: number;
    positionY: number;
} | null>(null); const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => { if (!url)
    return; dragRef.current = { startX: event.clientX, startY: event.clientY, positionX, positionY }; event.currentTarget.setPointerCapture(event.pointerId); }; const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => { if (!dragRef.current || !frameRef.current)
    return; const bounds = frameRef.current.getBoundingClientRect(); const deltaX = ((event.clientX - dragRef.current.startX) / Math.max(bounds.width, 1)) * 100; const deltaY = ((event.clientY - dragRef.current.startY) / Math.max(bounds.height, 1)) * 100; onPositionChange(clampImagePosition(dragRef.current.positionX - deltaX), clampImagePosition(dragRef.current.positionY - deltaY)); }; const handlePointerEnd = () => { dragRef.current = null; }; return (<div className="space-y-2"> <p className="text-settingsRowTitle">{label}</p> <div ref={frameRef} className={`flex aspect-[16/9] select-none items-center justify-center overflow-hidden rounded-2xl border border-border bg-background ${url ? "cursor-grab touch-none active:cursor-grabbing" : ""}`} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerEnd} onPointerCancel={handlePointerEnd} onPointerLeave={handlePointerEnd}> {url ? (<img src={url} alt="" className="h-full w-full object-cover" draggable={false} style={{ objectPosition: `${positionX}% ${positionY}%` }}/>) : (<span className="text-settingsRowDescription text-textSecondary">Нет изображения</span>)} </div> <div className="flex flex-wrap gap-2"> <label className="inline-flex min-h-10 cursor-pointer items-center rounded-xl border border-border px-3 py-2 text-settingsRowTitle hover:bg-background"> Загрузить <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file)
    void onUpload("cover", file); event.currentTarget.value = ""; }}/> </label> {url && (<button type="button" onClick={() => void onDelete("cover")} className="rounded-xl border border-border px-3 py-2 text-settingsRowTitle hover:bg-background"> Удалить</button>)} </div> <p className="text-messageMetadata text-textSecondary">Перетащите изображение, чтобы выбрать видимую область. JPG, PNG или WebP до 5 МБ.</p> </div>); }
function ImageUploader({ label, onDelete, onPositionChange, onUpload, positionX = 50, positionY = 50, type, url, }: {
    label: string;
    onDelete: (type: "cover" | "avatar") => Promise<void>;
    onPositionChange?: (positionX: number, positionY: number) => void;
    onUpload: (type: "cover" | "avatar", file: File) => Promise<void>;
    positionX?: number;
    positionY?: number;
    type: "cover" | "avatar";
    url: string;
}) { const frameRef = useRef<HTMLDivElement | null>(null); const dragRef = useRef<{
    startX: number;
    startY: number;
    positionX: number;
    positionY: number;
} | null>(null); const canReposition = type === "cover" && Boolean(url) && Boolean(onPositionChange); const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => { if (!canReposition)
    return; dragRef.current = { startX: event.clientX, startY: event.clientY, positionX, positionY }; event.currentTarget.setPointerCapture(event.pointerId); }; const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => { if (!dragRef.current || !frameRef.current || !onPositionChange)
    return; const bounds = frameRef.current.getBoundingClientRect(); const deltaX = ((event.clientX - dragRef.current.startX) / Math.max(bounds.width, 1)) * 100; const deltaY = ((event.clientY - dragRef.current.startY) / Math.max(bounds.height, 1)) * 100; onPositionChange(clampImagePosition(dragRef.current.positionX - deltaX), clampImagePosition(dragRef.current.positionY - deltaY)); }; const handlePointerEnd = () => { dragRef.current = null; }; return (<div className="space-y-2"> <p className="text-settingsRowTitle">{label}</p> <div ref={frameRef} className={`flex select-none items-center justify-center overflow-hidden rounded-2xl border border-border bg-background ${type === "cover" ? "aspect-[16/9]" : "aspect-square max-w-[180px]"} ${canReposition ? "cursor-grab touch-none active:cursor-grabbing" : ""}`} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerEnd} onPointerCancel={handlePointerEnd} onPointerLeave={handlePointerEnd}> {url ? <img src={url} alt="" className="h-full w-full object-cover"/> : <span className="text-settingsRowDescription text-textSecondary">Нет изображения</span>} </div> <div className="flex flex-wrap gap-2"> <label className="inline-flex min-h-10 cursor-pointer items-center rounded-xl border border-border px-3 py-2 text-settingsRowTitle hover:bg-background"> Загрузить <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file)
    void onUpload(type, file); event.currentTarget.value = ""; }}/> </label> {url && (<button type="button" onClick={() => void onDelete(type)} className="rounded-xl border border-border px-3 py-2 text-settingsRowTitle hover:bg-background"> Удалить</button>)} </div> <p className="text-messageMetadata text-textSecondary">JPG, PNG или WebP до 5 МБ</p> </div>); }
function StatisticsSection({ appointments, activeServices, blockedTimes, services, totalRevenue, weeklySchedule, workEnd, workStart, }: {
    appointments: Appointment[];
    activeServices: number;
    blockedTimes: BlockedTime[];
    services: Service[];
    totalRevenue: number;
    weeklySchedule: WeeklySchedule;
    workEnd: string;
    workStart: string;
}) {
    const [activeTab, setActiveTab] = useState<"analytics" | "finance">("finance");
    const statisticsTabsRef = useRef<HTMLDivElement | null>(null);
    const statisticsTrackRef = useRef<HTMLDivElement | null>(null);
    const statisticsDragFrame = useRef<number | null>(null);
    const statisticsPendingDelta = useRef(0);
    const statisticsCommitTimer = useRef<number | null>(null);
    const statisticsSwipeStart = useRef<{
        captured: boolean;
        x: number;
        y: number;
        pointerId?: number;
        time: number;
    } | null>(null);
    const statisticsSwipeSuppressClickUntil = useRef(0);
    const tabs = useMemo(() => [["finance", "Финансы"], ["analytics", "Аналитика"],] as const, []);
    const setStatisticsPreviewVisible = (visible: boolean) => { const track = statisticsTrackRef.current; if (!track)
        return; track.classList.toggle("statistics-preview-visible", visible); track.classList.toggle("statistics-preview-hidden", !visible); };
    const getTabIndex = (tab: "analytics" | "finance") => tabs.findIndex(([value]) => value === tab);
    const setStatisticsTrackOffset = (offset: string, transition = false) => { const track = statisticsTrackRef.current; if (!track)
        return; track.parentElement?.scrollTo({ left: 0 }); track.style.setProperty("--statistics-track-offset", offset); track.style.setProperty("--statistics-track-transition", transition ? "transform .24s cubic-bezier(.22, 1, .36, 1)" : "none"); };
    const resetStatisticsTrack = (transition = false) => { setStatisticsTrackOffset(`${-getTabIndex(activeTab) * 100}%`, transition); };
    const selectTab = (nextTab: "analytics" | "finance") => { if (nextTab === activeTab)
        return; commitStatisticsTab(nextTab); };
    const setTabUnderlinePosition = (index: number, transition = true) => { const tabList = statisticsTabsRef.current; const buttons = tabList ? Array.from(tabList.querySelectorAll<HTMLButtonElement>("button")) : []; const button = buttons[index]; if (!tabList || !button)
        return; const listRect = tabList.getBoundingClientRect(); const buttonRect = button.getBoundingClientRect(); tabList.style.setProperty("--statistics-tab-underline-left", `${Math.round(buttonRect.left - listRect.left + 13.6)}px`); tabList.style.setProperty("--statistics-tab-underline-width", `${Math.round(Math.max(16, buttonRect.width - 27.2))}px`); tabList.style.setProperty("--statistics-tab-underline-transition", transition ? "transform .24s ease, width .24s ease" : "none"); };
    const resetTabUnderlinePosition = (transition = true) => { const currentIndex = tabs.findIndex(([value]) => value === activeTab); setTabUnderlinePosition(currentIndex, transition); };
    const applyStatisticsSwipeFrame = (deltaX: number) => { const currentIndex = tabs.findIndex(([value]) => value === activeTab); const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1; const tabList = statisticsTabsRef.current; const buttons = tabList ? Array.from(tabList.querySelectorAll<HTMLButtonElement>("button")) : []; const currentButton = buttons[currentIndex]; const nextButton = buttons[nextIndex]; if (!tabList || !currentButton || !nextButton)
        return; const listRect = tabList.getBoundingClientRect(); const currentRect = currentButton.getBoundingClientRect(); const nextRect = nextButton.getBoundingClientRect(); const progress = Math.min(1, Math.abs(deltaX) / Math.min(180, Math.max(90, window.innerWidth * 0.42))); const currentLeft = Math.round(currentRect.left - listRect.left + 13.6); const nextLeft = Math.round(nextRect.left - listRect.left + 13.6); const currentWidth = Math.round(Math.max(16, currentRect.width - 27.2)); const nextWidth = Math.round(Math.max(16, nextRect.width - 27.2)); tabList.style.setProperty("--statistics-tab-underline-left", `${Math.round(currentLeft + (nextLeft - currentLeft) * progress)}px`); tabList.style.setProperty("--statistics-tab-underline-width", `${Math.round(currentWidth + (nextWidth - currentWidth) * progress)}px`); tabList.style.setProperty("--statistics-tab-underline-transition", "none"); setStatisticsTrackOffset(`calc(${-currentIndex * 100}% + ${deltaX}px)`); };
    const requestStatisticsSwipeFrame = (deltaX: number) => { setStatisticsPreviewVisible(true); statisticsPendingDelta.current = deltaX; if (statisticsDragFrame.current !== null)
        return; statisticsDragFrame.current = window.requestAnimationFrame(() => { statisticsDragFrame.current = null; applyStatisticsSwipeFrame(statisticsPendingDelta.current); }); };
    const resetStatisticsMotion = (transition = true) => { if (statisticsDragFrame.current !== null) {
        window.cancelAnimationFrame(statisticsDragFrame.current);
        statisticsDragFrame.current = null;
    } resetTabUnderlinePosition(transition); resetStatisticsTrack(transition); setStatisticsPreviewVisible(false); };
    const commitStatisticsTab = (nextTab: "analytics" | "finance") => { setStatisticsPreviewVisible(true); const targetIndex = getTabIndex(nextTab); const track = statisticsTrackRef.current; setTabUnderlinePosition(targetIndex, true); if (!track) {
        setActiveTab(nextTab);
        return;
    } if (statisticsDragFrame.current !== null) {
        window.cancelAnimationFrame(statisticsDragFrame.current);
        statisticsDragFrame.current = null;
    } setStatisticsTrackOffset(`${-targetIndex * 100}%`, true); const finishCommit = () => { if (statisticsCommitTimer.current !== null)
        window.clearTimeout(statisticsCommitTimer.current); statisticsCommitTimer.current = null; track.removeEventListener("transitionend", handleTransitionEnd); setActiveTab(nextTab); }; const handleTransitionEnd = (event: TransitionEvent) => { if (event.target === track && event.propertyName === "transform")
        finishCommit(); }; track.addEventListener("transitionend", handleTransitionEnd); if (statisticsCommitTimer.current !== null)
        window.clearTimeout(statisticsCommitTimer.current); statisticsCommitTimer.current = window.setTimeout(() => { finishCommit(); }, 320); };
    useLayoutEffect(() => { resetStatisticsMotion(false); const handleResize = () => resetTabUnderlinePosition(false); window.addEventListener("resize", handleResize); return () => { if (statisticsDragFrame.current !== null)
        window.cancelAnimationFrame(statisticsDragFrame.current); if (statisticsCommitTimer.current !== null)
        window.clearTimeout(statisticsCommitTimer.current); window.removeEventListener("resize", handleResize); }; }, [activeTab]);
    const getSwipeTarget = (deltaX: number) => { const currentIndex = tabs.findIndex(([value]) => value === activeTab); const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1; return tabs[nextIndex]?.[0] || null; };
    const finishSwipe = (clientX: number, clientY: number) => { const start = statisticsSwipeStart.current; statisticsSwipeStart.current = null; if (!start)
        return false; const deltaX = clientX - start.x; const deltaY = clientY - start.y; const elapsed = Date.now() - start.time; const isLocalSwipe = Math.abs(deltaX) >= 32 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2 && elapsed <= 900; if (!isLocalSwipe)
        return false; const nextTab = getSwipeTarget(deltaX); if (!nextTab || nextTab === activeTab)
        return false; statisticsSwipeSuppressClickUntil.current = Date.now() + 500; commitStatisticsTab(nextTab); return true; };
    const shouldIgnoreSwipeTarget = (target: EventTarget | null) => target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, button, [contenteditable='true'], [data-dashboard-swipe-ignore='true']"));
    const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => { if (event.pointerType === "touch")
        return; if (event.pointerType === "mouse" && event.button !== 0)
        return; if (shouldIgnoreSwipeTarget(event.target))
        return; statisticsSwipeStart.current = { captured: false, x: event.clientX, y: event.clientY, pointerId: event.pointerId, time: Date.now() }; event.currentTarget.setPointerCapture(event.pointerId); };
    const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => { if (event.pointerType === "touch")
        return; const start = statisticsSwipeStart.current; if (!start || start.pointerId !== event.pointerId)
        return; const deltaX = event.clientX - start.x; const deltaY = event.clientY - start.y; if (Math.abs(deltaX) < 3 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.04)
        return; if (!getSwipeTarget(deltaX))
        return; start.captured = true; requestStatisticsSwipeFrame(deltaX); event.preventDefault(); event.stopPropagation(); };
    const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => { if (event.pointerType === "touch")
        return; const start = statisticsSwipeStart.current; if (!start || start.pointerId !== event.pointerId)
        return; if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId); const switched = finishSwipe(event.clientX, event.clientY); if (!switched)
        resetStatisticsMotion(true); if (start.captured || switched)
        event.stopPropagation(); };
    const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => { if (event.pointerType === "touch")
        return; if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId); statisticsSwipeStart.current = null; resetStatisticsMotion(true); };
    const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => { const touch = event.touches[0]; if (!touch)
        return; if (shouldIgnoreSwipeTarget(event.target))
        return; statisticsSwipeStart.current = { captured: false, x: touch.clientX, y: touch.clientY, time: Date.now() }; };
    const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => { const start = statisticsSwipeStart.current; const touch = event.touches[0]; if (!start || !touch)
        return; const deltaX = touch.clientX - start.x; const deltaY = touch.clientY - start.y; if (Math.abs(deltaX) < 3 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.04)
        return; if (!getSwipeTarget(deltaX))
        return; start.captured = true; requestStatisticsSwipeFrame(deltaX); event.stopPropagation(); };
    const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => { const start = statisticsSwipeStart.current; const touch = event.changedTouches[0]; if (!touch)
        return; const switched = finishSwipe(touch.clientX, touch.clientY); if (!switched)
        resetStatisticsMotion(true); if (start?.captured || switched)
        event.stopPropagation(); };
    const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => { if (Date.now() > statisticsSwipeSuppressClickUntil.current)
        return; event.preventDefault(); event.stopPropagation(); };
    return (<div className="statistics-tabs-screen"> <div className="statistics-tabs-header"> <div ref={statisticsTabsRef} className="statistics-section-tabs" role="tablist" aria-label="Разделы статистики"> {tabs.map(([value, label]) => (<button key={value} type="button" onClick={() => selectTab(value)} className={activeTab === value ? "statistics-section-tab-active" : ""} role="tab" aria-selected={activeTab === value}> <span className={`statistics-tab-icon statistics-tab-icon-${value}`} aria-hidden="true"> {value === "finance" ? (<span className="statistics-tab-finance-ruble">{"\u20bd"}</span>) : (<> <span className="statistics-tab-analytics-bars"> <span /> <span /> <span /> </span> <span className="statistics-tab-analytics-line"/> </>)} </span> <span>{label}</span></button>))} <span className="statistics-section-tabs-underline" aria-hidden="true"/> </div> </div> <div className="statistics-tabs-content" onClickCapture={handleClickCapture} onPointerCancel={handlePointerCancel} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onTouchCancel={() => { statisticsSwipeStart.current = null; resetStatisticsMotion(true); }} onTouchEnd={handleTouchEnd} onTouchMove={handleTouchMove} onTouchStart={handleTouchStart}> <div ref={statisticsTrackRef} className="statistics-tabs-track statistics-preview-hidden"> <div className={`statistics-tab-panel statistics-tab-panel-finance ${activeTab === "finance" ? "statistics-tab-panel-active" : ""}`}> <FinanceSection appointments={appointments} compact services={services} totalRevenue={totalRevenue}/> </div> <div className={`statistics-tab-panel statistics-tab-panel-analytics ${activeTab === "analytics" ? "statistics-tab-panel-active" : ""}`}> <AnalyticsSection appointments={appointments} activeServices={activeServices} blockedTimes={blockedTimes} compact services={services} weeklySchedule={weeklySchedule} workEnd={workEnd} workStart={workStart}/> </div> </div> </div> </div>);
}
function SettingsSection(props: {
    activeServices: number;
    accountSaving: boolean;
    appointments: Appointment[];
    blockedTimes: BlockedTime[];
    bookingPageSaving: boolean;
    bookingPageSettings: BookingPageSettings;
    darkTheme: boolean;
    email: string;
    mobileCompact: boolean;
    bookingUrl: string;
    copyLink: () => void;
    logout: () => void;
    masterProfile: MasterProfile;
    saveBookingPageSettings: (settingsOverride?: BookingPageSettings) => Promise<void>;
    saveMasterProfile: (profile: MasterProfile) => Promise<void>;
    selectedSettingsPanel: SettingsPanel;
    services: Service[];
    setBookingPageSettings: React.Dispatch<React.SetStateAction<BookingPageSettings>>;
    setSelectedSettingsPanel: React.Dispatch<React.SetStateAction<SettingsPanel>>;
    setSection: React.Dispatch<React.SetStateAction<Section>>;
    setMasterProfile: React.Dispatch<React.SetStateAction<MasterProfile>>;
    setDarkTheme: React.Dispatch<React.SetStateAction<boolean>>;
    setMobileCompact: React.Dispatch<React.SetStateAction<boolean>>;
    subscription: SubscriptionInfo | null;
    subscriptionLoading: boolean;
    subscriptionPayments: SubscriptionPayment[];
    subscriptionPlans: SubscriptionPlan[];
    reloadSubscription: () => Promise<void>;
    totalRevenue: number;
    weeklySchedule: WeeklySchedule;
    workEnd: string;
    workStart: string;
}) { const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=12&data=${encodeURIComponent(props.bookingUrl)}`; const masterLabel = props.masterProfile.displayName.trim() || props.masterProfile.slug || "Мастер"; const updateSlug = (value: string) => { const slug = normalizeSlug(value); if (!slug) {
    props.setMasterProfile((current) => ({ ...current, slug: "" }));
    return;
} props.setMasterProfile((current) => ({ ...current, slug })); }; const fillEmptySlug = () => { props.setMasterProfile((current) => { const next = { ...current, slug: current.slug || normalizeEmailSlug(props.email), }; void props.saveMasterProfile(next); return next; }); }; const toggleShowOnBookingPage = () => { props.setMasterProfile((current) => { const next = { ...current, showOnBookingPage: !current.showOnBookingPage }; void props.saveMasterProfile(next); return next; }); }; const updateWorkAddress = (value: string) => { props.setBookingPageSettings((current) => ({ ...current, address: value })); }; const toggleWorkAddress = () => { props.setBookingPageSettings((current) => { const next = { ...current, visibleSections: { ...current.visibleSections, address: current.visibleSections.address === false, }, }; void props.saveBookingPageSettings(next); return next; }); }; const updateMasterComment = (value: string) => { props.setBookingPageSettings((current) => ({ ...current, notes: value })); }; const toggleMasterComment = () => { props.setBookingPageSettings((current) => { const next = { ...current, visibleSections: { ...current.visibleSections, masterComment: current.visibleSections.masterComment === false, }, }; void props.saveBookingPageSettings(next); return next; }); }; const saveMasterComment = () => { void props.saveBookingPageSettings(props.bookingPageSettings); }; const savePublicProfile = async () => { await props.saveMasterProfile(props.masterProfile); await props.saveBookingPageSettings(props.bookingPageSettings); }; const panelTitles: Record<Exclude<SettingsPanel, null>, string> = { account: "Аккаунт", interface: "Интерфейс", analytics: "Аналитика", finance: "Финансы", subscription: "Подписка", }; return (<div className={props.selectedSettingsPanel ? `settings-screen settings-panel-screen fixed inset-0 z-50 overflow-y-auto bg-bg ${props.selectedSettingsPanel === "finance" ? "settings-panel-finance" : ""}` : "settings-screen settings-screen-root space-y-4"}> {props.selectedSettingsPanel && (<header className="app-panel-header app-panel-header-raised sticky top-0 z-10 px-4 pb-2 pt-[env(safe-area-inset-top)] md:px-6 md:py-4" style={{ background: "var(--surface)", backgroundColor: "var(--surface)", backgroundImage: "none", color: "var(--textPrimary)" }}> <div className="mx-auto flex max-w-4xl items-start gap-3"> <button type="button" onClick={() => props.setSelectedSettingsPanel(null)} className="settings-panel-back -mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full" aria-label="Назад к настройкам"> <BackArrowIcon /></button> <div className="min-w-0"> <h1 className="whatsapp-header-title truncate text-navigationTitle"> {panelTitles[props.selectedSettingsPanel]} </h1> </div> </div> </header>)} <div className={props.selectedSettingsPanel ? "settings-panel-content mx-auto w-full max-w-4xl space-y-4 px-3 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-3 md:px-6 md:py-6" : "contents"}> {!props.selectedSettingsPanel && (<div className="mx-auto w-full max-w-4xl"> <section className="settings-list settings-whatsapp-list"> <SettingsMenuRow icon="profile" title="Аккаунт" subtitle="Профиль, ссылка для записи и видимость" onClick={() => props.setSelectedSettingsPanel("account")}/> <SettingsMenuRow icon="booking" title="Страница записи" subtitle="Оформление и параметры онлайн-записи" onClick={() => props.setSection("Страница записи")}/> <SettingsMenuRow icon="appearance" title="Интерфейс" subtitle={props.darkTheme ? "Тёмная тема" : "Светлая тема"} onClick={() => props.setSelectedSettingsPanel("interface")}/> <SettingsMenuRow icon="subscription" title="Подписка" subtitle={props.subscription?.hasAccess ? `Активна, осталось ${props.subscription.daysLeft} дн.` : "Статус, тарифы и история платежей"} onClick={() => props.setSelectedSettingsPanel("subscription")}/> <SettingsMenuRow danger icon="logout" title="Выйти из аккаунта" subtitle="Завершить текущую сессию" onClick={props.logout} showChevron={false}/> </section> <article className="settings-master-comment-card saas-card mt-4 space-y-4 rounded-2xl p-4 md:p-5"> <div className="flex items-start justify-between gap-3"> <div className="min-w-0"> <h2 className="text-navigationTitle text-textPrimary">Комментарий мастера</h2> <p className="mt-1 text-settingsRowDescription text-textSecondary">Текст отображается на публичной странице записи.</p> </div> <button type="button" onClick={toggleMasterComment} className="settings-toggle-row inline-flex shrink-0 items-center gap-3 rounded-xl border border-border px-3 py-2 text-settingsRowTitle text-textPrimary" aria-pressed={props.bookingPageSettings.visibleSections.masterComment !== false}> <span>{props.bookingPageSettings.visibleSections.masterComment !== false ? "Скрыть" : "Показать"}</span> <SettingsSwitch checked={props.bookingPageSettings.visibleSections.masterComment !== false}/></button> </div> <TextareaField label="Текст комментария" value={props.bookingPageSettings.notes} onChange={updateMasterComment} onBlur={saveMasterComment} placeholder="Например: приходите на 5 минут раньше"/> <button type="button" onClick={saveMasterComment} disabled={props.bookingPageSaving} className="w-full rounded-xl bg-primary px-4 py-3 text-buttonLabel text-surface transition hover:bg-primaryPressed disabled:bg-disabledBg disabled:text-disabledText md:w-auto"> {props.bookingPageSaving ? "Сохраняем..." : "Сохранить комментарий"}</button> </article> </div>)} {props.selectedSettingsPanel === "interface" && (<article className="saas-card w-full overflow-hidden rounded-2xl"> <div className="border-b border-border px-4 py-4 md:px-5"> <h2 className="text-navigationTitle text-textPrimary">Внешний вид</h2> <p className="mt-1 text-settingsRowDescription text-textSecondary">Настройки применяются только на этом устройстве.</p> </div> <div className="divide-y divide-[var(--border)]"> <SettingsToggleRow checked={props.darkTheme} icon="appearance" title="Тёмная тема" subtitle={props.darkTheme ? "Включена" : "Сейчас используется светлая тема"} onChange={() => props.setDarkTheme((value) => !value)}/> <SettingsToggleRow checked={props.mobileCompact} icon="scale" title="Компактный режим" subtitle={props.mobileCompact ? "Больше информации помещается на экране" : "Стандартный размер элементов"} onChange={() => props.setMobileCompact((value) => !value)}/> </div> </article>)} {props.selectedSettingsPanel === "account" && (<> <article className="account-beauty-card account-profile-card saas-card w-full space-y-5 rounded-2xl p-4 md:p-5"> <div className="grid gap-4 md:grid-cols-2"> <label className="space-y-2"> <span className="text-settingsRowTitle text-textPrimary">Имя мастера</span> <input value={props.masterProfile.displayName} onChange={(event) => props.setMasterProfile((current) => ({ ...current, displayName: event.target.value }))} onBlur={(event) => void props.saveMasterProfile({ ...props.masterProfile, displayName: event.currentTarget.value })} className="settings-input min-h-11 w-full rounded-xl border border-border px-3.5 py-2 text-messageInput outline-none transition" placeholder="Например, Анна Смирнова"/> </label> <label className="space-y-2"> <span className="text-settingsRowTitle text-textPrimary">Адрес страницы</span> <span className="settings-slug-field flex h-11 items-center rounded-xl border border-border bg-surface px-3.5 transition"> <span className="shrink-0 text-messageMetadata text-textSecondary">/m/</span> <input value={props.masterProfile.slug} onChange={(event) => updateSlug(event.target.value)} onBlur={fillEmptySlug} pattern="[a-z0-9-]+" className="h-full w-full border-0 bg-transparent pl-0.5 text-messageInput outline-none" placeholder="anna-smirnova"/> </span> <span className="block text-settingsRowDescription text-textSecondary">Только латинские буквы, цифры и дефис.</span> </label> <label className="space-y-2 md:col-span-2"> <span className="text-settingsRowTitle text-textPrimary">Рабочий адрес</span> <input value={props.bookingPageSettings.address} onChange={(event) => updateWorkAddress(event.target.value)} onBlur={(event) => void props.saveBookingPageSettings({ ...props.bookingPageSettings, address: event.currentTarget.value })} className="settings-input min-h-11 w-full rounded-xl border border-border px-3.5 py-2 text-messageInput outline-none transition" placeholder="Например, Москва, ул. Ленина, 10"/> </label> </div> <button type="button" onClick={toggleShowOnBookingPage} className="settings-toggle-row flex w-full items-center justify-between gap-4 rounded-xl border border-border px-3.5 py-3 text-left" aria-pressed={props.masterProfile.showOnBookingPage}> <span className="account-toggle-icon settings-menu-icon settings-menu-icon-profile" aria-hidden="true"><SettingsGlyph name="profile"/></span> <span className="account-toggle-copy"> <span className="block text-settingsRowTitle text-textPrimary">Показывать имя клиентам</span> <span className="mt-0.5 block text-settingsRowDescription text-textSecondary">{props.masterProfile.showOnBookingPage ? "Имя отображается на странице записи" : "Имя скрыто на странице записи"}</span> </span> <SettingsSwitch checked={props.masterProfile.showOnBookingPage}/></button> <button type="button" onClick={toggleWorkAddress} className="settings-toggle-row flex w-full items-center justify-between gap-4 rounded-xl border border-border px-3.5 py-3 text-left" aria-pressed={props.bookingPageSettings.visibleSections.address !== false}> <span className="account-toggle-icon settings-menu-icon settings-menu-icon-address" aria-hidden="true"><SettingsGlyph name="address"/></span> <span className="account-toggle-copy"> <span className="block text-settingsRowTitle text-textPrimary">Показывать рабочий адрес</span> <span className="mt-0.5 block text-settingsRowDescription text-textSecondary"> {props.bookingPageSettings.visibleSections.address !== false ? "Адрес отображается на странице записи" : "Адрес скрыт на странице записи"} </span> </span> <SettingsSwitch checked={props.bookingPageSettings.visibleSections.address !== false}/></button> <button type="button" onClick={() => void savePublicProfile()} disabled={props.accountSaving || props.bookingPageSaving} className="w-full rounded-xl bg-primary px-5 py-3 text-buttonLabel text-surface transition hover:bg-primaryPressed disabled:cursor-not-allowed disabled:bg-disabledBg disabled:text-disabledText md:w-auto"> {props.accountSaving || props.bookingPageSaving ? "Сохраняем..." : "Сохранить"}</button> </article> <article className="account-beauty-card account-link-card saas-card w-full space-y-4 rounded-2xl p-4 md:p-5"> <div className="grid gap-4 md:grid-cols-[1fr_176px] md:items-start"> <div className="space-y-2.5"> <div> <h2 className="text-navigationTitle">Ваша ссылка для записи</h2> <p className="mt-1 text-settingsRowDescription text-textSecondary">Отправьте её клиенту или покажите QR-код. Он ведёт прямо на вашу страницу записи.</p> </div> <p className="break-all rounded-xl bg-primarySurface px-3.5 py-3 text-messageMetadata text-primary">{props.bookingUrl}</p> <button type="button" onClick={props.copyLink} className="w-full rounded-xl bg-primary px-4 py-3 text-buttonLabel text-surface transition hover:bg-primaryPressed md:w-auto"> Скопировать ссылку</button> </div> <div className="mx-auto w-full max-w-[176px] rounded-xl border border-border bg-surface p-3 md:mx-0"> <div className="mx-auto flex aspect-square w-full items-center justify-center rounded-lg bg-surface"> <img src={qrCodeUrl} alt={`QR-код для записи к мастеру ${masterLabel}`} className="h-full w-full"/> </div> <p className="mt-2 truncate text-center text-messageMetadata text-textPrimary">{masterLabel}</p> <a href={qrCodeUrl} download={`qr-${props.masterProfile.slug || "master"}.png`} className="mt-2 block rounded-lg border border-border px-3 py-2 text-center text-messageMetadata text-textPrimary hover:bg-background"> Скачать QR-код </a> </div> </div> </article> </>)} {props.selectedSettingsPanel === "analytics" && (<AnalyticsSection appointments={props.appointments} activeServices={props.activeServices} blockedTimes={props.blockedTimes} compact services={props.services} weeklySchedule={props.weeklySchedule} workEnd={props.workEnd} workStart={props.workStart}/>)} {props.selectedSettingsPanel === "finance" && (<DeferredFinanceSection appointments={props.appointments} services={props.services} totalRevenue={props.totalRevenue}/>)} {props.selectedSettingsPanel === "subscription" && (<SubscriptionSettingsPanel loading={props.subscriptionLoading} payments={props.subscriptionPayments} plans={props.subscriptionPlans} reload={props.reloadSubscription} subscription={props.subscription}/>)} </div> </div>); }
function DeferredFinanceSection({ appointments, services, totalRevenue }: {
    appointments: Appointment[];
    services: Service[];
    totalRevenue: number;
}) { const [ready, setReady] = useState(false); useEffect(() => { const frame = window.requestAnimationFrame(() => setReady(true)); return () => window.cancelAnimationFrame(frame); }, []); if (!ready) {
    return <div className="finance-section-root insights-dashboard w-full max-w-4xl space-y-3" aria-hidden="true"/>;
} return <FinanceSection appointments={appointments} compact services={services} totalRevenue={totalRevenue}/>; }
function SubscriptionSettingsPanel({ loading, payments, plans, reload, subscription, }: {
    loading: boolean;
    payments: SubscriptionPayment[];
    plans: SubscriptionPlan[];
    reload: () => Promise<void>;
    subscription: SubscriptionInfo | null;
}) { const [selectedPlanId, setSelectedPlanId] = useState(""); const [checkoutLoading, setCheckoutLoading] = useState(false); const [error, setError] = useState(""); const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) || plans[0] || null; useEffect(() => { if (!selectedPlanId && plans[0])
    setSelectedPlanId(plans[0].id); }, [plans, selectedPlanId]); const formatMoney = (kopecks: number, currency = "RUB") => new Intl.NumberFormat("ru-RU", { style: "currency", currency, maximumFractionDigits: 0 }).format(kopecks / 100); const formatDate = (value: string | null) => (value ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(value)) : "—"); const startCheckout = async () => { if (!selectedPlan)
    return; if (!window.confirm(`Подтвердите оплату тарифа "${selectedPlan.name}" на сумму ${formatMoney(selectedPlan.price, selectedPlan.currency)}.`))
    return; setCheckoutLoading(true); setError(""); try {
    const response = await fetch("/api/subscription/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: selectedPlan.id, returnUrl: window.location.origin }), });
    const data = (await response.json()) as {
        success: boolean;
        error?: string;
        order?: {
            paymentUrl?: string;
        };
    };
    if (!response.ok || !data.success || !data.order?.paymentUrl)
        throw new Error(data.error || "Не удалось создать платеж.");
    window.location.href = data.order.paymentUrl;
}
catch (checkoutError) {
    setError(checkoutError instanceof Error ? checkoutError.message : "Не удалось создать платеж.");
}
finally {
    setCheckoutLoading(false);
} }; const toggleAutoRenew = async () => { if (!subscription)
    return; setError(""); const endpoint = subscription.autoRenew ? "/api/subscription/auto-renew/disable" : "/api/subscription/auto-renew/enable"; const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: selectedPlan?.id }), }); const data = (await response.json()) as {
    success: boolean;
    error?: string;
}; if (!response.ok || !data.success)
    setError(data.error || "Не удалось изменить автопродление."); await reload(); }; const retryPayment = async (orderId: string) => { setCheckoutLoading(true); setError(""); try {
    const response = await fetch(`/api/subscription/payments/${encodeURIComponent(orderId)}/retry`, { method: "POST" });
    const data = (await response.json()) as {
        success: boolean;
        error?: string;
        order?: {
            payment_url?: string;
            paymentUrl?: string;
        };
    };
    const paymentUrl = data.order?.paymentUrl || data.order?.payment_url;
    if (!response.ok || !data.success || !paymentUrl)
        throw new Error(data.error || "Не удалось повторить оплату.");
    window.location.href = paymentUrl;
}
catch (retryError) {
    setError(retryError instanceof Error ? retryError.message : "Не удалось повторить оплату.");
}
finally {
    setCheckoutLoading(false);
} }; return (<section className="w-full space-y-4"> <article className="saas-card rounded-2xl p-4 md:p-5"> <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"> <div> <h2 className="text-screenTitle text-textPrimary">Подписка</h2> <p className="mt-1 text-settingsRowDescription text-textSecondary">Текущий статус и продление доступа к платным функциям.</p> </div> <button type="button" onClick={() => void reload()} className="rounded-xl border border-border px-4 py-2 text-conversationName text-textPrimary hover:bg-background"> Обновить</button> </div> {loading && <p className="mt-4 text-settingsRowDescription text-textSecondary">Загружаем данные подписки...</p>} {error && <p className="mt-4 rounded-xl bg-danger/10 px-3 py-2 text-settingsRowDescription text-danger">{error}</p>} {subscription && (<div className="mt-4 grid gap-3 md:grid-cols-2"> <SubscriptionInfoTile label="Статус" value={<StatusBadge status={subscription.status} label={subscriptionStatusLabels[subscription.status] || subscription.status}/>}/> <SubscriptionInfoTile label="Текущий тариф" value={subscription.planName}/> <SubscriptionInfoTile label="Начало подписки" value={formatDate(subscription.currentPeriodStartedAt)}/> <SubscriptionInfoTile label="Окончание подписки" value={formatDate(subscription.currentPeriodEndsAt)}/> <SubscriptionInfoTile label="Осталось дней" value={String(subscription.daysLeft)}/> <SubscriptionInfoTile label="Бесплатный период" value={`${formatDate(subscription.trialStartedAt)} — ${formatDate(subscription.trialEndsAt)}`}/> <SubscriptionInfoTile label="Автопродление" value={subscription.autoRenew ? "Включено" : "Отключено"}/> <SubscriptionInfoTile label="Следующее списание" value={subscription.autoRenew ? `${formatDate(subscription.nextChargeAt)} · ${subscription.nextChargeAmount ? formatMoney(subscription.nextChargeAmount, subscription.nextChargeCurrency) : "—"}` : "—"}/> </div>)} </article> <article className="saas-card rounded-2xl p-4 md:p-5"> <h3 className="text-navigationTitle text-textPrimary">Выбор периода оплаты</h3> <div className="mt-4 rounded-2xl border border-border bg-background p-4"> <div className="flex items-start gap-3"> <span className="mt-0.5 inline-flex h-9 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-settingsRowDescription text-textPrimary"> **** </span> <div className="min-w-0"> <p className="text-conversationName text-textPrimary">Банковская карта</p> <p className="mt-1 text-settingsRowDescription text-textSecondary"> Карта добавляется во время оплаты на защищенной странице платежного провайдера. В локальном режиме без ключей оплаты будет использована тестовая карта. </p> </div> </div> </div> {plans.length === 0 && !loading ? (<p className="mt-3 text-settingsRowDescription text-textSecondary">Нет доступных тарифов.</p>) : (<div className="mt-4 grid gap-3 md:grid-cols-2"> {plans.map((plan) => { const selected = plan.id === selectedPlanId; return (<button key={plan.id} type="button" onClick={() => setSelectedPlanId(plan.id)} className={`rounded-2xl border p-4 text-left transition ${selected ? "border-primary bg-primarySurface ring-2 ring-primary/10" : "border-border bg-surface hover:bg-background"}`}> <span className="block text-conversationName text-textPrimary">{plan.name}</span> <span className="mt-2 block text-buttonLabel text-textPrimary">{formatMoney(plan.price, plan.currency)}</span> <span className="mt-1 block text-settingsRowDescription text-textSecondary">{formatMoney(Math.round(plan.price / plan.duration_months), plan.currency)} в месяц</span> {plan.discount_percent > 0 && <span className="mt-2 inline-flex rounded-full bg-surface px-2.5 py-1 text-messageMetadata text-textSecondary">Скидка {plan.discount_percent}%</span>}</button>); })} </div>)} <div className="mt-4 flex flex-col gap-2 md:flex-row"> <button type="button" disabled={!selectedPlan || checkoutLoading} onClick={() => void startCheckout()} className="rounded-xl bg-primary px-5 py-3 text-buttonLabel text-surface hover:bg-primaryPressed disabled:bg-disabledBg disabled:text-disabledText"> {checkoutLoading ? "Создаем платеж..." : subscription?.hasAccess ? "Продлить" : "Оплатить"}</button> <button type="button" disabled={!subscription || checkoutLoading} onClick={() => void toggleAutoRenew()} className="rounded-xl border border-border px-5 py-3 text-conversationName text-textPrimary hover:bg-background disabled:opacity-50"> {subscription?.autoRenew ? "Отключить автопродление" : "Включить автопродление"}</button> </div> {!subscription?.autoRenewEnabled && <p className="mt-3 text-messageMetadata text-textSecondary">Автопродление подготовлено архитектурно, но отключено флагом SUBSCRIPTION_AUTO_RENEW_ENABLED до настройки сохраненных способов оплаты у провайдера.</p>} </article> <article className="saas-card rounded-2xl p-4 md:p-5"> <h3 className="text-navigationTitle text-textPrimary">История платежей</h3> {payments.length === 0 ? (<p className="mt-3 text-settingsRowDescription text-textSecondary">Платежей пока нет.</p>) : (<div className="mt-3 divide-y divide-border"> {payments.map((payment) => (<div key={payment.id} className="grid gap-2 py-3 text-settingsRowDescription md:grid-cols-[1.1fr_.8fr_.8fr_.8fr_auto] md:items-center"> <span className=" text-textPrimary">{formatDate(payment.created_at)}</span> <span>{formatMoney(payment.amount, payment.currency)}</span> <span>{payment.duration_months} мес.</span> <span><StatusBadge status={payment.status}/></span> <span className="flex flex-wrap gap-2"> {payment.receipt_url && <a href={payment.receipt_url} className="text-primary underline">Чек</a>} {["failed", "cancelled"].includes(payment.status) && (<button type="button" onClick={() => void retryPayment(payment.id)} className="text-primary underline"> Повторить</button>)} </span> {payment.payment_method_title && <span className="text-messageMetadata text-textSecondary md:col-span-5">{payment.payment_method_title}</span>} {payment.failure_message && <span className="text-messageMetadata text-danger md:col-span-5">{payment.failure_message}</span>} </div>))} </div>)} </article> </section>); }
function SubscriptionInfoTile({ label, value }: {
    label: string;
    value: ReactNode;
}) { return (<div className="rounded-2xl border border-border bg-background px-3.5 py-3"> <p className="text-sectionLabel text-textSecondary">{label}</p> <p className="mt-1 break-words text-conversationName text-textPrimary">{value}</p> </div>); }
type SettingsGlyphName = "profile" | "services" | "booking" | "appearance" | "analytics" | "finance" | "subscription" | "logout" | "scale" | "calendar" | "exceptions" | "time-snap" | "online" | "address";
function SettingsMenuRow({ danger = false, icon, onClick, showChevron = true, subtitle, title, }: {
    danger?: boolean;
    icon: SettingsGlyphName;
    onClick: () => void;
    showChevron?: boolean;
    subtitle: string;
    title: string;
}) { return (<button type="button" onClick={onClick} className={`settings-menu-row ${danger ? "settings-menu-row-danger" : ""}`}> <span className={`settings-menu-icon settings-menu-icon-${icon}`}> <SettingsGlyph name={icon}/> </span> <span className="settings-menu-copy min-w-0 flex-1 text-left"> <span className="settings-menu-title-copy block text-textPrimary" style={settingsMenuTitleStyle}>{title}</span> <span className="settings-menu-subtitle-copy block text-textSecondary">{subtitle}</span> </span> {showChevron && (<CaretRight className="settings-menu-chevron h-5 w-5 shrink-0 text-textDisabled" weight="bold" aria-hidden="true"/>)}</button>); }
function SettingsToggleRow({ checked, icon, onChange, subtitle, title }: {
    checked: boolean;
    icon: SettingsGlyphName;
    onChange: () => void;
    subtitle: string;
    title: string;
}) { return (<button type="button" onClick={onChange} className="settings-toggle-row flex w-full items-center gap-3 px-4 py-4 text-left md:px-5" aria-pressed={checked}> <span className={`settings-menu-icon settings-menu-icon-${icon}`}> <SettingsGlyph name={icon}/> </span> <span className="min-w-0 flex-1"> <span className="block text-conversationName text-textPrimary">{title}</span> <span className="mt-0.5 block text-settingsRowDescription text-textSecondary">{subtitle}</span> </span> <SettingsSwitch checked={checked}/></button>); }
function SettingsSwitch({ checked }: {
    checked: boolean;
}) { return (<span className={`settings-switch ${checked ? "settings-switch-on" : ""}`} aria-hidden="true"> <span /> </span>); }
function SettingsGlyph({ name }: {
    name: SettingsGlyphName;
}) {
    const props = { className: "h-5 w-5", weight: "regular", "aria-hidden": true } as const;
    if (name === "profile")
        return <Users {...props}/>;
    if (name === "services")
        return <ListChecks {...props}/>;
    if (name === "booking")
        return <CalendarCheck {...props}/>;
    if (name === "appearance")
        return <Palette {...props}/>;
    if (name === "analytics")
        return <ChartLineUp {...props}/>;
    if (name === "finance")
        return <Wallet {...props}/>;
    if (name === "subscription")
        return <Receipt {...props}/>;
    if (name === "logout")
        return <SignOut {...props}/>;
    if (name === "calendar")
        return <CalendarBlank {...props}/>;
    if (name === "exceptions")
        return <CalendarCheck {...props}/>;
    if (name === "time-snap")
        return <Gauge {...props}/>;
    if (name === "online")
        return <Globe {...props}/>;
    if (name === "address")
        return <MapPin {...props}/>;
    return <TextAa {...props}/>;
}
