"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, CalendarBlank, CaretDown, CaretLeft, CaretRight, Check, CheckCircle, Clock, Heart, Info, MapPin, Star, Tag, X } from "@phosphor-icons/react";

type DaySchedule = {
  enabled?: boolean;
  start?: string;
  end?: string;
  breakEnabled?: boolean;
  breakStart?: string;
  breakEnd?: string;
  breaks?: { id?: string; start?: string; end?: string }[];
};

type CyclePreset = "all" | "weekdays" | "odd" | "even" | "custom";

type StoredIndividualSchedulePlan = {
  startDate: string;
  endDate?: string;
  cyclePreset: CyclePreset;
  customWorkDays: number;
  customOffDays: number;
};

type StoredWeeklySchedule = Record<string, DaySchedule> & {
  __scheduleMode?: "weekdays" | "cycle";
  __individualPlan?: StoredIndividualSchedulePlan;
  __dateOverrides?: Record<string, DaySchedule>;
};

type PublicService = {
  id: string;
  title: string;
  category?: string;
  duration?: number;
  durationMinutes?: number;
  price: number;
  priceFrom?: boolean;
  description?: string;
  photoUrl?: string;
};

type SavedAppointment = {
  id: string;
  date: string;
  time: string;
  start?: string;
  end?: string;
  serviceId: string;
  serviceIds?: string[];
  rescheduleToken?: string;
};

type ConfirmedBooking = {
  serviceTitle: string;
  dateLabel: string;
  time: string;
  duration: number;
  price: number;
  priceFrom: boolean;
  clientName: string;
  clientPhone: string;
};

type TelegramConnectState = {
  connected: boolean;
  username: string;
  url: string;
  loading: boolean;
  sending: boolean;
  error: string;
};

type BlockedTime = {
  id: string;
  date: string;
  start: string;
  end: string;
  reason: string;
};

type PublicMaster = {
  name: string;
  slug: string;
  notes?: string;
  profession?: string;
  description?: string;
  city?: string;
  address?: string;
  isOnline?: boolean;
  phone?: string;
  contactLink?: string;
  socialLinks?: Record<string, string>;
  coverImageUrl?: string;
  avatarUrl?: string;
  coverPositionX?: number;
  coverPositionY?: number;
  timezone?: string;
  primaryColor?: string;
  buttonColor?: string;
  ctaText?: string;
  visibleSections?: Record<string, boolean | string>;
  requiredFields?: Record<string, boolean>;
  bookingEnabled?: boolean;
  autoTimeSnap?: boolean;
  bufferMin?: number;
  showPrice?: boolean;
  slotStepMin?: number;
  weeklySchedule?: StoredWeeklySchedule;
  workDays?: number[];
  workEnd?: string;
  workStart?: string;
  maxBookingDaysAhead?: number;
};

function BackArrowIcon({ className = "h-5 w-5" }: { className?: string }) {
  return <ArrowLeft className={className} weight="light" aria-hidden="true" />;
}

const fallbackServices: PublicService[] = [
  { id: "s1", title: "Стрижка", durationMinutes: 45, price: 1500 },
  { id: "s2", title: "Коррекция бороды", durationMinutes: 30, price: 900 },
  { id: "s3", title: "Стрижка и борода", durationMinutes: 75, price: 2200 },
];

const defaultRequiredFields = { name: true, phone: true, email: false, telegram: false };
const defaultVisibleSections = { cover: true, avatar: true, description: true, masterComment: true, address: true, contacts: true, socials: true, services: true, serviceImages: false, serviceCards: false, dateWheel: false, dateCalendar: false, serviceCardStyle: "stack", headingMode: "friendly", accentMode: "default" };
const headingModes = {
  friendly: {
    serviceEyebrow: "Начнем с услуги",
    serviceTitle: "Что хотите сделать?",
    serviceSubtitle: "Выберите одну или несколько услуг, а мы покажем удобные окошки.",
    timeEyebrow: "Теперь выберем время",
    timeTitle: "Когда вам удобно?",
    timeSubtitlePrefix: "займет около",
    confirmEyebrow: "Остался последний шаг",
    confirmTitle: "Проверим детали",
    confirmSubtitle: "Оставьте контакты, чтобы мастер смог подтвердить запись.",
    progressLabels: ["Что делаем", "Окошко", "Контакты"],
  },
  classic: {
    serviceEyebrow: "Шаг 1 из 3",
    serviceTitle: "Выберите услугу",
    serviceSubtitle: "Выберите услугу, на которую хотите записаться.",
    timeEyebrow: "Шаг 2 из 3",
    timeTitle: "Выберите дату и время",
    timeSubtitlePrefix: "длительность",
    confirmEyebrow: "Шаг 3 из 3",
    confirmTitle: "Подтвердите запись",
    confirmSubtitle: "Проверьте детали и укажите контактные данные.",
    progressLabels: ["Услуга", "Время", "Подтверждение"],
  },
  minimal: {
    serviceEyebrow: "1 / 3",
    serviceTitle: "Услуга",
    serviceSubtitle: "Выберите нужные услуги.",
    timeEyebrow: "2 / 3",
    timeTitle: "Дата и время",
    timeSubtitlePrefix: "около",
    confirmEyebrow: "3 / 3",
    confirmTitle: "Контакты",
    confirmSubtitle: "Проверьте запись и оставьте данные.",
    progressLabels: ["Услуга", "Время", "Контакты"],
  },
} as const;
type HeadingMode = keyof typeof headingModes;
const resolveHeadingMode = (value: unknown): HeadingMode =>
  value === "classic" || value === "minimal" || value === "friendly" ? value : "friendly";
const accentSurfaceByColor: Record<string, string> = {
  "#0F766E": "#CCFBF1",
  "#111827": "#F3F4F6",
  "#DB2777": "#FCE7F3",
  "#2563EB": "#DBEAFE",
  "#7C3AED": "#EDE9FE",
};
const resolveAccentSurface = (color: string) =>
  accentSurfaceByColor[color.toUpperCase()] || `color-mix(in srgb, ${color} 12%, #ffffff)`;

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", weekday: "short" });

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const intervalsOverlap = (startA: number, endA: number, startB: number, endB: number) =>
  startA < endB && startB < endA;

const addMinutesToTime = (value: string, minutes: number) => {
  const total = timeToMinutes(value) + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const buildSlots = (start: string, end: string, step: number) => {
  const slots: string[] = [];
  for (let minutes = timeToMinutes(start); minutes <= timeToMinutes(end); minutes += step) {
    slots.push(addMinutesToTime("00:00", minutes));
  }
  return slots;
};

const getScheduleBreaks = (schedule?: DaySchedule) => {
  if (!schedule) return [];
  if (Array.isArray(schedule.breaks)) {
    return schedule.breaks
      .map((item) => ({
        start: item.start || schedule.breakStart || "13:00",
        end: item.end || schedule.breakEnd || "14:00",
      }))
      .filter((item) => timeToMinutes(item.start) < timeToMinutes(item.end));
  }
  const fallbackBreak = { start: schedule.breakStart || "13:00", end: schedule.breakEnd || "14:00" };
  return schedule.breakEnabled && timeToMinutes(fallbackBreak.start) < timeToMinutes(fallbackBreak.end) ? [fallbackBreak] : [];
};

const getCycleEnabled = (date: Date, plan?: StoredIndividualSchedulePlan) => {
  if (!plan) return true;
  if (plan.cyclePreset === "all") return true;
  if (plan.cyclePreset === "weekdays") return date.getDay() > 0 && date.getDay() < 6;
  if (plan.cyclePreset === "odd") return date.getDate() % 2 === 1;
  if (plan.cyclePreset === "even") return date.getDate() % 2 === 0;
  const workDays = Math.max(0, plan.customWorkDays || 0);
  const offDays = Math.max(0, plan.customOffDays || 0);
  const cycleLength = Math.max(1, workDays + offDays);
  const start = parseDateKeyLocal(plan.startDate || formatDateKey(date));
  const current = parseDateKeyLocal(formatDateKey(date));
  const diffDays = Math.floor((current.getTime() - start.getTime()) / 86400000);
  const cycleIndex = ((diffDays % cycleLength) + cycleLength) % cycleLength;
  return workDays > 0 && cycleIndex < workDays;
};

const getScheduleForDate = (date: Date, masterProfile?: PublicMaster | null) => {
  const weeklySchedule = masterProfile?.weeklySchedule;
  const base = weeklySchedule?.[String(date.getDay())];
  const override = weeklySchedule?.__dateOverrides?.[formatDateKey(date)];
  if (override) {
    return {
      ...(base || {}),
      ...override,
      start: override.start || base?.start || masterProfile?.workStart || "09:00",
      end: override.end || base?.end || masterProfile?.workEnd || "20:00",
    };
  }
  if (weeklySchedule?.__scheduleMode !== "cycle") return base;
  const enabled = getCycleEnabled(date, weeklySchedule.__individualPlan);
  return {
    ...(base || {}),
    enabled,
    start: base?.start || masterProfile?.workStart || "09:00",
    end: base?.end || masterProfile?.workEnd || "20:00",
  };
};

const serviceDuration = (service?: PublicService) => service?.durationMinutes ?? service?.duration ?? 60;
const servicesDuration = (items: PublicService[]) => items.reduce((total, service) => total + serviceDuration(service), 0);
const formatServicePrice = (service: PublicService, showPrice = true) =>
  showPrice ? `${service.priceFrom ? "от " : ""}${Number(service.price || 0).toLocaleString("ru-RU")} ₽` : "по запросу";
const formatBookingPrice = (price: number, priceFrom: boolean, showPrice = true) =>
  showPrice ? `${priceFrom ? "от " : ""}${price.toLocaleString("ru-RU")} ₽` : "по запросу";

const keepNearestSlotsToAppointments = (
  slots: string[],
  dayAppointments: SavedAppointment[],
  slotDuration: number,
  bufferMin: number,
) => {
  if (slots.length === 0 || dayAppointments.length === 0) return slots;

  const slotIntervals = slots.map((slot) => {
    const start = timeToMinutes(slot);
    return { slot, start, end: start + slotDuration + bufferMin };
  });
  const nearestSlots = new Set<string>();

  dayAppointments.forEach((appointment) => {
    const appointmentStart = timeToMinutes(appointment.start || appointment.time);
    const appointmentEnd = appointment.end ? timeToMinutes(appointment.end) : appointmentStart + slotDuration;
    let nearestDistance = Number.POSITIVE_INFINITY;

    slotIntervals.forEach((slot) => {
      const distance = Math.min(Math.abs(slot.end - appointmentStart), Math.abs(slot.start - appointmentEnd));
      if (distance < nearestDistance) nearestDistance = distance;
    });
    slotIntervals.forEach((slot) => {
      const distance = Math.min(Math.abs(slot.end - appointmentStart), Math.abs(slot.start - appointmentEnd));
      if (distance === nearestDistance) nearestSlots.add(slot.slot);
    });
  });

  return slots.filter((slot) => nearestSlots.has(slot));
};

export default function BookingExperience({
  masterSlug,
  title = "Онлайн-запись",
}: {
  masterSlug?: string;
  title?: string;
}) {
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [services, setServices] = useState<PublicService[]>(masterSlug ? [] : fallbackServices);
  const [appointments, setAppointments] = useState<SavedAppointment[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [masterProfile, setMasterProfile] = useState<PublicMaster | null>(null);
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingStarted, setBookingStarted] = useState(false);
  const [bookingTransitioning, setBookingTransitioning] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<ConfirmedBooking | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<{ id: string; token: string } | null>(null);
  const [telegram, setTelegram] = useState<TelegramConnectState>({
    connected: false,
    username: "",
    url: "",
    loading: false,
    sending: false,
    error: "",
  });
  const [loading, setLoading] = useState(Boolean(masterSlug));
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityLoaded, setAvailabilityLoaded] = useState(!masterSlug);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadMaster = async () => {
      if (!masterSlug) return;
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/masters/${encodeURIComponent(masterSlug)}`);
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("Страница записи временно недоступна. Попробуйте обновить страницу.");
        }

        let data: {
          success: boolean;
          error?: string;
          master?: PublicMaster;
          services?: PublicService[];
          appointments?: SavedAppointment[];
          blockedTimes?: BlockedTime[];
        };

        try {
          data = (await response.json()) as typeof data;
        } catch {
          throw new Error("Не удалось прочитать данные страницы записи. Попробуйте обновить страницу.");
        }

        if (!response.ok || !data.success || !data.master) {
          throw new Error(data.error || "Страница записи не найдена");
        }

        setMasterProfile(data.master);
        setServices(data.services || []);
        setSelectedServiceIds([]);
        setAppointments(data.appointments || []);
        setBlockedTimes(data.blockedTimes || []);
        setAvailabilityLoaded(Boolean(data.appointments?.length || data.blockedTimes?.length));
      } catch (loadError) {
        setServices([]);
        setSelectedServiceIds([]);
        setAppointments([]);
        setBlockedTimes([]);
        setMasterProfile(null);
        setAvailabilityLoaded(false);
        setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить страницу записи");
      } finally {
        setLoading(false);
      }
    };

    void loadMaster();
  }, [masterSlug]);

  useEffect(() => {
    const loadAvailability = async () => {
      if (!masterSlug || !bookingStarted || availabilityLoaded || availabilityLoading) return;
      setAvailabilityLoading(true);
      try {
        const response = await fetch(`/api/masters/${encodeURIComponent(masterSlug)}?availability=1`);
        const data = (await response.json()) as {
          success: boolean;
          appointments?: SavedAppointment[];
          blockedTimes?: BlockedTime[];
        };
        if (response.ok && data.success) {
          setAppointments(data.appointments || []);
          setBlockedTimes(data.blockedTimes || []);
          setAvailabilityLoaded(true);
        }
      } catch {
        // Server-side appointment validation remains the source of truth if this prefetch fails.
      } finally {
        setAvailabilityLoading(false);
      }
    };

    void loadAvailability();
  }, [availabilityLoaded, availabilityLoading, bookingStarted, masterSlug]);

  const requiredFields = { ...defaultRequiredFields, ...(masterProfile?.requiredFields || {}) };
  const visibleSections = { ...defaultVisibleSections, ...(masterProfile?.visibleSections || {}), services: true };
  const serviceImagesEnabled = visibleSections.serviceImages === true;
  const serviceCardsEnabled = visibleSections.serviceCards === true;
  const dateWheelEnabled = visibleSections.dateWheel === true;
  const dateCalendarEnabled = visibleSections.dateCalendar === true;
  const serviceCardStyle =
    visibleSections.serviceCardStyle === "spotlight" || visibleSections.serviceCardStyle === "wheel" || visibleSections.serviceCardStyle === "grid" || visibleSections.serviceCardStyle === "feature"
      ? visibleSections.serviceCardStyle
      : "stack";
  const headingCopy = headingModes[resolveHeadingMode(visibleSections.headingMode)];
  const defaultAccentEnabled = visibleSections.accentMode === "default";
  const primaryColor = masterProfile?.primaryColor || "#0F766E";
  const buttonColor = masterProfile?.buttonColor || primaryColor;
  const maxDays = Math.max(1, Number(masterProfile?.maxBookingDaysAhead) || 14);
  const selectedServices = selectedServiceIds
    .map((id) => services.find((item) => item.id === id))
    .filter((item): item is PublicService => Boolean(item));
  const selectedDuration = servicesDuration(selectedServices);
  const selectedPrice = selectedServices.reduce((total, service) => total + Number(service.price || 0), 0);
  const selectedPriceFrom = selectedServices.some((service) => service.priceFrom);
  const selectedServiceTitle = selectedServices.map((service) => service.title).join(", ");

  const availableDays = useMemo(() => {
    const today = new Date();
    return Array.from({ length: maxDays }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      return date;
    });
  }, [maxDays]);

  const availableSlotsByDay = useMemo(() => {
    const result = new Map<string, string[]>();

    if (selectedServices.length === 0) return result;

    availableDays.forEach((date) => {
      const dateKey = formatDateKey(date);
      const schedule = getScheduleForDate(date, masterProfile);
      const enabled =
        masterProfile?.bookingEnabled !== false &&
        (schedule?.enabled ?? masterProfile?.workDays?.includes(date.getDay()) ?? true);

      if (!enabled) return;

      const start = schedule?.start || masterProfile?.workStart || "09:00";
      const end = schedule?.end || masterProfile?.workEnd || "20:00";
      const freeSlots = buildSlots(start, end, masterProfile?.slotStepMin || 60).filter((slot) => {
        const slotStart = timeToMinutes(slot);
        const slotEnd = slotStart + selectedDuration + (masterProfile?.bufferMin || 0);
        const outsideWorkHours = slotEnd > timeToMinutes(end);
        const overlapsBreak = getScheduleBreaks(schedule).some((item) =>
          intervalsOverlap(slotStart, slotEnd, timeToMinutes(item.start), timeToMinutes(item.end)),
        );
        const overlapsAppointment = appointments.some((item) => {
          if (item.id === editingAppointment?.id) return false;
          if (item.date !== dateKey) return false;
          const appointmentServices = (item.serviceIds?.length ? item.serviceIds : [item.serviceId])
            .map((id) => services.find((entry) => entry.id === id))
            .filter((entry): entry is PublicService => Boolean(entry));
          const itemStart = timeToMinutes(item.start || item.time);
          const appointmentDuration = appointmentServices.length ? servicesDuration(appointmentServices) : serviceDuration();
          const itemEnd = item.end ? timeToMinutes(item.end) : itemStart + appointmentDuration;
          return intervalsOverlap(slotStart, slotEnd, itemStart, itemEnd);
        });
        const overlapsBlock = blockedTimes.some(
          (block) => block.date === dateKey && intervalsOverlap(slotStart, slotEnd, timeToMinutes(block.start), timeToMinutes(block.end)),
        );
        return !outsideWorkHours && !overlapsBreak && !overlapsAppointment && !overlapsBlock;
      });
      const dayAppointments = appointments.filter((item) => item.date === dateKey && item.id !== editingAppointment?.id);
      const slots = masterProfile?.autoTimeSnap
        ? keepNearestSlotsToAppointments(
            freeSlots,
            dayAppointments,
            selectedDuration,
            masterProfile?.bufferMin || 0,
          )
        : freeSlots;

      if (slots.length > 0) result.set(dateKey, slots);
    });

    return result;
  }, [appointments, availableDays, blockedTimes, editingAppointment?.id, masterProfile, selectedDuration, selectedServices.length, services]);

  const availableBookingDays = useMemo(
    () => availableDays.filter((item) => availableSlotsByDay.has(formatDateKey(item))),
    [availableDays, availableSlotsByDay],
  );

  const selectedDate = day ? availableBookingDays.find((item) => formatDateKey(item) === day) : undefined;
  const selectedDateKey = selectedDate ? formatDateKey(selectedDate) : "";
  const daySlots = selectedDateKey ? availableSlotsByDay.get(selectedDateKey) || [] : [];
  const bookingDateText = selectedDate ? formatDateLabel(selectedDate) : "";
  const masterComment = visibleSections.masterComment !== false ? masterProfile?.notes?.trim() || "" : "";
  const addressParts = [masterProfile?.city, masterProfile?.address].filter(Boolean);
  const showAddress = visibleSections.address !== false && !masterProfile?.isOnline && addressParts.length > 0;

  useEffect(() => {
    if (!bookingStarted) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [bookingStarted]);

  useEffect(() => {
    if (!bookingTransitioning) return;
    const transitionTimer = window.setTimeout(() => {
      setBookingStarted(true);
      setBookingTransitioning(false);
    }, 420);
    return () => window.clearTimeout(transitionTimer);
  }, [bookingTransitioning]);

  const startBooking = () => {
    if (bookingTransitioning) return;
    setBookingTransitioning(true);
  };

  useEffect(() => {
    if (time && !daySlots.includes(time)) setTime("");
  }, [daySlots, time]);

  useEffect(() => {
    if (!dateWheelEnabled || day || availableBookingDays.length === 0) return;
    setDay(formatDateKey(availableBookingDays[0]));
    setTime("");
    setSubmitted(false);
  }, [availableBookingDays, dateWheelEnabled, day]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateKeyboardInset = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardInset(inset > 120 ? inset : 0);
    };

    updateKeyboardInset();
    viewport.addEventListener("resize", updateKeyboardInset);
    viewport.addEventListener("scroll", updateKeyboardInset);
    return () => {
      viewport.removeEventListener("resize", updateKeyboardInset);
      viewport.removeEventListener("scroll", updateKeyboardInset);
    };
  }, []);

  const refreshTelegramStatus = async () => {
    if (!editingAppointment?.id || (!editingAppointment.token && !phone.trim())) return;
    const response = await fetch(
      `/api/telegram/status?appointmentId=${encodeURIComponent(editingAppointment.id)}&rescheduleToken=${encodeURIComponent(editingAppointment.token)}&clientPhone=${encodeURIComponent(phone.trim())}`,
    );
    const data = (await response.json()) as { success: boolean; connected?: boolean; username?: string; error?: string };
    if (!response.ok || !data.success) throw new Error(data.error || "Не удалось проверить Telegram");
    setTelegram((current) => ({
      ...current,
      connected: Boolean(data.connected),
      username: data.username || "",
      error: "",
    }));
  };

  useEffect(() => {
    if (!submitted || !editingAppointment?.id || (!editingAppointment.token && !phone.trim())) return;
    void refreshTelegramStatus().catch(() => undefined);
  }, [submitted, editingAppointment?.id, editingAppointment?.token, phone]);

  const connectTelegram = async () => {
    if (!editingAppointment?.id || (!editingAppointment.token && !phone.trim())) return;
    setTelegram((current) => ({ ...current, loading: true, error: "" }));
    try {
      const response = await fetch("/api/telegram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: editingAppointment.id,
          rescheduleToken: editingAppointment.token,
          clientPhone: phone.trim(),
        }),
      });
      const data = (await response.json()) as {
        success: boolean;
        connected?: boolean;
        username?: string;
        url?: string;
        error?: string;
      };
      if (!response.ok || !data.success || !data.url) throw new Error(data.error || "Не удалось создать ссылку Telegram");
      setTelegram((current) => ({
        ...current,
        connected: Boolean(data.connected),
        username: data.username || "",
        url: data.url || "",
        error: "",
      }));
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (connectError) {
      setTelegram((current) => ({
        ...current,
        error: connectError instanceof Error ? connectError.message : "Не удалось подключить Telegram",
      }));
    } finally {
      setTelegram((current) => ({ ...current, loading: false }));
    }
  };

  const sendTelegramTest = async () => {
    if (!editingAppointment?.id || (!editingAppointment.token && !phone.trim())) return;
    setTelegram((current) => ({ ...current, sending: true, error: "" }));
    try {
      const response = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: editingAppointment.id,
          rescheduleToken: editingAppointment.token,
          clientPhone: phone.trim(),
        }),
      });
      const data = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !data.success) throw new Error(data.error || "Не удалось отправить тест");
    } catch (sendError) {
      setTelegram((current) => ({
        ...current,
        error: sendError instanceof Error ? sendError.message : "Не удалось отправить тест",
      }));
    } finally {
      setTelegram((current) => ({ ...current, sending: false }));
    }
  };

  const serviceGroups = useMemo(() => {
    const groups = new Map<string, PublicService[]>();
    services.forEach((service) => {
      const category = service.category?.trim() || "Услуги";
      groups.set(category, [...(groups.get(category) || []), service]);
    });
    return [...groups.entries()];
  }, [services]);

  const canSubmit =
    Boolean(selectedServices.length > 0 && time && name.trim()) &&
    (!requiredFields.phone || Boolean(phone.trim()));

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedServices.length === 0 || !time || !canSubmit || !daySlots.includes(time)) return;

    setError("");
    let data: { success: boolean; appointment?: SavedAppointment; error?: string };

    try {
      const response = await fetch("/api/appointments", {
        method: editingAppointment ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingAppointment?.id,
          rescheduleToken: editingAppointment?.token,
          masterSlug,
          date: day,
          time,
          end: addMinutesToTime(time, selectedDuration),
          clientName: name.trim(),
          clientPhone: phone.trim(),
          serviceId: selectedServices[0].id,
          serviceIds: selectedServiceIds,
        }),
      });
      data = (await response.json()) as { success: boolean; appointment?: SavedAppointment; error?: string };
      if (!response.ok || !data.success || !data.appointment) {
        setError(data.error || "Не удалось отправить заявку");
        return;
      }
    } catch {
      setError("Не удалось подключиться к серверу. Попробуйте ещё раз.");
      return;
    }

    setConfirmedBooking({
      serviceTitle: selectedServiceTitle,
      dateLabel: bookingDateText,
      time,
      duration: selectedDuration,
      price: selectedPrice,
      priceFrom: selectedPriceFrom,
      clientName: name.trim(),
      clientPhone: phone.trim(),
    });
    setAppointments((current) =>
      editingAppointment
        ? current.map((item) => (item.id === data.appointment!.id ? data.appointment! : item))
        : [...current, data.appointment!],
    );
    setEditingAppointment({
      id: data.appointment.id,
      token: data.appointment.rescheduleToken || editingAppointment?.token || "",
    });
    setBookingStep(3);
    setSubmitted(true);
  };

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-none items-center justify-center px-4 text-textPrimary">
        <div className="w-full animate-pulse space-y-4">
          <div className="h-56 rounded-3xl bg-background" />
          <div className="h-32 rounded-3xl bg-background" />
          <div className="grid gap-3 md:grid-cols-3">
            <div className="h-28 rounded-2xl bg-background" />
            <div className="h-28 rounded-2xl bg-background" />
            <div className="h-28 rounded-2xl bg-background" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`airbnb-page booking-wide-page mx-auto min-h-screen w-full max-w-none overflow-x-hidden px-0 pb-10 pt-0 text-textPrimary ${defaultAccentEnabled ? "booking-default-accent" : ""} ${bookingStarted ? "booking-flow-active" : ""} ${bookingTransitioning ? "booking-flow-transitioning" : ""}`}
      style={
        {
          "--listing-accent": buttonColor,
          "--primary": primaryColor,
          "--primarySurface": resolveAccentSurface(primaryColor),
        } as React.CSSProperties
      }
    >
      {!bookingStarted && (
      <section id="listing" className={`airbnb-listing-shell w-full overflow-hidden rounded-none border-y border-border bg-surface sm:border ${bookingTransitioning ? "booking-listing-exit" : ""}`}>
        {visibleSections.cover && masterProfile?.coverImageUrl ? (
          <div className="airbnb-cover relative overflow-hidden" style={{ backgroundColor: `${primaryColor}14` }}>
            <img
              src={masterProfile.coverImageUrl}
              alt=""
              draggable={false}
              className="airbnb-cover-image block w-full"
              style={{
                objectPosition: `${masterProfile.coverPositionX ?? 50}% ${masterProfile.coverPositionY ?? 50}%`,
              }}
            />
            <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-textPrimary/45 to-transparent" />
          </div>
        ) : (
          <div className="airbnb-cover airbnb-cover-fallback relative h-52 overflow-hidden md:h-64" style={{ background: `linear-gradient(135deg, ${primaryColor}22, ${buttonColor}44)` }}>
          </div>
        )}
        <div className="airbnb-profile relative -mt-32 space-y-3 p-3 pt-0 md:-mt-40 md:p-4 md:pt-0">
          <header className="flex flex-col gap-2">
            <div className="flex flex-col gap-2">
              <div className="p-1 text-surface drop-shadow-[0_2px_8px_rgb(var(--color-text-primary)_/_0.55)] md:p-2">
                <p className="text-sectionLabel text-surface/85">{masterProfile?.profession || "Мастер"}</p>
                <div className="booking-master-line flex items-center gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="online-status-dot" aria-hidden="true" />
                    <h1 className="text-profileName">{masterProfile?.name || title}</h1>
                  </div>
                  {showAddress && (
                    <p className="booking-inline-address text-messageMetadata text-surface/90">
                      <MapPin className="booking-inline-address-icon" weight="fill" aria-hidden="true" />
                      {addressParts.join(", ")}
                    </p>
                  )}
                </div>
                {masterProfile?.isOnline && (
                  <p className="mt-1 text-messageMetadata text-surface/85">
                    Онлайн
                  </p>
                )}
              </div>
            </div>
          </header>

          {error && <div className="rounded-xl border border-info/20 bg-info/10 p-3 text-systemMessage text-info">{error}</div>}

          {visibleSections.description && masterProfile?.description && (
            <p className="w-full max-w-none text-profileDescription text-textSecondary">{masterProfile.description}</p>
          )}

          <button
            type="button"
            onClick={startBooking}
            disabled={bookingTransitioning}
            className="booking-start-button w-full rounded-2xl px-4 py-3.5 text-buttonLabel text-surface transition"
            style={{ backgroundColor: buttonColor }}
          >
            {masterProfile?.ctaText || "Записаться"}
          </button>

          {(visibleSections.contacts || visibleSections.socials) && (
            <div className="flex flex-wrap gap-1.5 text-messageMetadata">
              {visibleSections.contacts && masterProfile?.phone && <span className="rounded-full border border-border px-2.5 py-1.5">{masterProfile.phone}</span>}
              {visibleSections.contacts && masterProfile?.contactLink && (
                <a href={masterProfile.contactLink} className="rounded-full border border-border px-2.5 py-1.5" target="_blank" rel="noreferrer">
                  Контакт
                </a>
              )}
              {visibleSections.socials &&
                Object.entries(masterProfile?.socialLinks || {})
                  .filter(([, value]) => value)
                  .map(([key, value]) => (
                    <a key={key} href={value} className="rounded-full border border-border px-2.5 py-1.5" target="_blank" rel="noreferrer">
                      {key}
                    </a>
                  ))}
            </div>
          )}

          {masterComment && <MasterComment text={masterComment} />}
        </div>
      </section>
      )}

      {bookingStarted && (
      <section id="booking" className={`booksy-booking-shell airbnb-booking-shell mx-0 mt-6 w-full max-w-none ${serviceCardsEnabled && bookingStep === 1 ? "booking-showcase-mode" : ""}`}>
        <form className="w-full min-w-0 space-y-4" onSubmit={onSubmit}>
          {!submitted && error && (
            <div role="alert" className="rounded-xl border border-info/20 bg-info/10 px-4 py-3 text-systemMessage text-info">
              {error}
            </div>
          )}

          <BookingProgress labels={headingCopy.progressLabels} step={bookingStep} />

          {bookingStep === 1 && visibleSections.services && (
            <BooksyPanel animateText eyebrow={headingCopy.serviceEyebrow} title={headingCopy.serviceTitle} subtitle={headingCopy.serviceSubtitle}>
              {services.length === 0 ? (
                <div className="rounded-xl border border-border p-3 text-systemMessage text-textSecondary">Пока нет услуг для онлайн-записи. Загляните чуть позже.</div>
              ) : (
                <div className={`space-y-4 ${selectedServices.length > 0 ? "booking-services-has-selection" : ""}`}>
                  {serviceCardsEnabled ? (
                    <BookingShowcaseServices
                      masterProfile={masterProfile}
                      selectedServiceIds={selectedServiceIds}
                      services={services}
                      serviceDuration={serviceDuration}
                      setSelectedServiceIds={setSelectedServiceIds}
                      setSubmitted={setSubmitted}
                      variant={serviceCardStyle}
                    />
                  ) : serviceGroups.map(([category, items]) => (
                    <div key={category} className="booksy-service-group overflow-hidden rounded-2xl border border-border bg-surface">
                      <h3 className="booksy-service-category border-b border-border bg-background px-3.5 py-2 text-sectionLabel text-textSecondary">
                        <TypewriterText delay={9} startDelay={620} text={category} />
                      </h3>
                      <div>
                        {items.map((service, index) => {
                          const active = selectedServiceIds.includes(service.id);
                          return (
                            <button
                              key={service.id}
                              type="button"
                              onClick={() => {
                                setSelectedServiceIds((current) => {
                                  const exists = current.includes(service.id);
                                  const next = exists ? current.filter((id) => id !== service.id) : [...current, service.id];
                                  return next;
                                });
                                setSubmitted(false);
                              }}
                              className={`booksy-service-card group w-full px-3.5 py-3 text-left transition ${active ? "is-selected" : ""} ${index > 0 ? "border-t border-border" : ""}`}
                              style={{ backgroundColor: active ? "var(--primarySurface)" : "var(--surface)" }}
                            >
                              <div className={`grid items-center gap-3 ${serviceImagesEnabled ? "grid-cols-[64px_minmax(0,1fr)_auto]" : "grid-cols-[minmax(0,1fr)_auto]"}`}>
                                {serviceImagesEnabled && (
                                  <span className="booksy-service-photo" aria-hidden={!service.photoUrl}>
                                    <ServicePhoto service={service} />
                                  </span>
                                )}
                                <div className="min-w-0">
                                  <p className="text-conversationName truncate text-textPrimary">{service.title}</p>
                                  <div className="mt-1 flex items-center gap-2 text-messageMetadata text-textSecondary">
                                    <span>{serviceDuration(service)} мин</span>
                                    {service.description && <span className="hidden truncate sm:inline">· {service.description}</span>}
                                  </div>
                                </div>
                                <div className="flex min-w-0 shrink items-center justify-end gap-1.5">
                                  <span className="whitespace-nowrap text-badge text-textPrimary">
                                    {formatServicePrice(service, masterProfile?.showPrice !== false)}
                                  </span>
                                  <span className="booksy-checkmark" aria-hidden="true">
                                    {active ? <Check weight="bold" /> : null}
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </BooksyPanel>
          )}

          {bookingStep === 2 && (
            <BooksyPanel
              animateText
              eyebrow={headingCopy.timeEyebrow}
              title={headingCopy.timeTitle}
              subtitle={selectedServices.length ? `${selectedServiceTitle} · ${headingCopy.timeSubtitlePrefix} ${selectedDuration} мин` : ""}
              onBack={() => setBookingStep(1)}
            >
            {dateCalendarEnabled ? (
              <BookingDateCalendar
                dates={availableBookingDays}
                value={day}
                accentColor={primaryColor}
                onChange={(key) => {
                  setDay(key);
                  setTime("");
                  setSubmitted(false);
                }}
              />
            ) : dateWheelEnabled ? (
              <BookingDateWheel
                dates={availableBookingDays}
                value={day}
                accentColor={primaryColor}
                onChange={(key) => {
                  setDay(key);
                  setTime("");
                  setSubmitted(false);
                }}
              />
            ) : (
              <div className="booksy-date-strip grid w-full grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-10 xl:grid-cols-[repeat(14,minmax(0,1fr))]">
                {availableBookingDays.map((item) => {
                  const key = formatDateKey(item);
                  const active = day === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setDay(key);
                        setTime("");
                        setSubmitted(false);
                      }}
                      className={`w-full rounded-xl border px-2 py-3 text-dateChip transition ${active ? "is-selected" : ""}`}
                      style={{ borderColor: active ? primaryColor : "var(--border)", backgroundColor: active ? primaryColor : "var(--surface)", color: active ? "var(--surface)" : "inherit" }}
                    >
                      {formatDateLabel(item)}
                    </button>
                  );
                })}
              </div>
            )}
              {availableBookingDays.length === 0 && <p className="col-span-full rounded-xl border border-border p-3 text-systemMessage text-textSecondary">Свободных дат сейчас нет. Попробуйте вернуться позже.</p>}
            {selectedDate ? (
            <>
            <div className="mt-6 border-t border-border pt-5">
              <h3 className="text-navigationTitle text-textPrimary">{bookingDateText}</h3>
              <p className="mt-1 text-sectionLabel text-textSecondary">Свободные окошки</p>
            </div>
            <div className="mt-3 w-full">
              {daySlots.length > 0 && (
                <div className="booksy-time-strip grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {daySlots.map((slot) => {
                    const active = time === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        className={`rounded-xl border px-2 py-3 text-buttonLabel transition ${active ? "is-selected" : ""}`}
                        style={{ borderColor: active ? primaryColor : "var(--border)", backgroundColor: active ? primaryColor : "var(--surface)", color: active ? "var(--surface)" : "inherit" }}
                        onClick={() => {
                          setTime(slot);
                          setSubmitted(false);
                          setBookingStep(3);
                        }}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}
              {daySlots.length === 0 && <p className="rounded-xl border border-border p-3 text-systemMessage text-textSecondary">На этот день свободных окошек пока нет.</p>}
            </div>
            </>
            ) : (
              <p className="mt-6 rounded-xl border border-border bg-background p-3 text-systemMessage text-textSecondary">Нажмите на дату, и ниже появятся свободные окошки.</p>
            )}
            </BooksyPanel>
          )}

          {bookingStep === 3 && !submitted && (
            <BooksyPanel
              animateText
              eyebrow={headingCopy.confirmEyebrow}
              title={headingCopy.confirmTitle}
              subtitle={headingCopy.confirmSubtitle}
              onBack={() => setBookingStep(2)}
            >
            <BookingSummary
              date={bookingDateText}
              duration={selectedDuration}
              price={selectedPrice}
              priceFrom={selectedPriceFrom}
              service={selectedServiceTitle}
              showPrice={masterProfile?.showPrice !== false}
              time={time}
            />
            {masterComment && <MasterComment text={masterComment} compact />}
            <h3 className="mt-6 text-navigationTitle text-textPrimary">Как с вами связаться?</h3>
            <div className="grid w-full gap-2">
              <ContactInput label="Имя" required value={name} onChange={setName} placeholder="Как к вам обращаться?" />
              <ContactInput label="Телефон" required={requiredFields.phone} value={phone} onChange={setPhone} placeholder="+7 ..." inputMode="tel" />
            </div>

            <div
              className={`booksy-submit-bar mt-5 ${keyboardInset > 0 ? "booksy-submit-bar-keyboard" : ""}`}
              style={keyboardInset > 0 ? { bottom: `${keyboardInset}px` } : undefined}
            >
              <button
                type="submit"
                disabled={services.length === 0 || !time || !canSubmit}
                className="w-full rounded-xl px-4 py-3.5 text-buttonLabel text-surface transition disabled:cursor-not-allowed disabled:bg-disabledBg disabled:text-disabledText"
                style={{ backgroundColor: services.length === 0 || !time || !canSubmit ? undefined : buttonColor }}
              >
                {editingAppointment ? `Сохранить новое время: ${bookingDateText}, ${time}` : `Записаться на ${bookingDateText}, ${time}`}
              </button>
            </div>
            <p className="mt-3 text-systemMessage text-textSecondary">Проверьте данные перед отправкой. После записи мастер увидит вашу заявку.</p>
            </BooksyPanel>
          )}

          {bookingStep === 3 && submitted && confirmedBooking && (
            <BookingConfirmation
              booking={confirmedBooking}
              onConnectTelegram={connectTelegram}
              masterName={masterProfile?.name}
              showPrice={masterProfile?.showPrice !== false}
              telegram={telegram}
              onRefreshTelegram={() => void refreshTelegramStatus().catch((statusError) => {
                setTelegram((current) => ({
                  ...current,
                  error: statusError instanceof Error ? statusError.message : "Не удалось проверить Telegram",
                }));
              })}
              onEdit={() => {
                setSubmitted(false);
                setBookingStep(1);
              }}
              onNewBooking={() => {
                setSubmitted(false);
                setConfirmedBooking(null);
                setEditingAppointment(null);
                setTelegram({ connected: false, username: "", url: "", loading: false, sending: false, error: "" });
                setBookingStep(1);
                setBookingStarted(false);
                setBookingTransitioning(false);
                setSelectedServiceIds([]);
              }}
              onSendTelegramTest={sendTelegramTest}
            />
          )}
        </form>
      </section>
      )}
      {bookingStarted && bookingStep === 1 && selectedServices.length > 0 && (
        <div className="booking-service-next">
          {serviceCardStyle !== "grid" && serviceCardStyle !== "feature" && (
          <section className="booking-selected-services booking-selected-services-next" aria-live="polite">
            <p>Вы выбрали</p>
            <div>
              {selectedServices.map((service) => (
                <span key={service.id}>
                  {service.title}
                  <button
                    type="button"
                    className="booking-selected-service-remove"
                    onClick={() => {
                      setSelectedServiceIds((current) => current.filter((id) => id !== service.id));
                      setSubmitted(false);
                    }}
                    aria-label={`Убрать услугу ${service.title}`}
                  >
                    <X weight="bold" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          </section>
          )}
          <button
            type="button"
            onClick={() => {
              if (availabilityLoading) return;
              setSubmitted(false);
              setDay("");
              setTime("");
              setBookingStep(2);
            }}
            disabled={availabilityLoading}
            className="w-full rounded-xl px-4 py-3.5 text-buttonLabel text-surface transition disabled:opacity-70"
            style={{ backgroundColor: buttonColor }}
          >
            {availabilityLoading ? "Готовим время..." : selectedServices.length > 1 ? `Подобрать время для ${selectedServices.length} услуг` : "Подобрать время"}
          </button>
          <p className="mt-2 text-center text-systemMessage text-textSecondary">
            {selectedDuration} мин · {formatBookingPrice(selectedPrice, selectedPriceFrom, masterProfile?.showPrice !== false)}
          </p>
        </div>
      )}
    </main>
  );
}

function MasterComment({ compact = false, text }: { compact?: boolean; text: string }) {
  return (
    <div className={`master-comment-card rounded-2xl border border-border bg-background p-3 text-messageBody text-textPrimary md:p-4 ${compact ? "mt-4" : ""}`}>
      <p className="master-comment-card-label text-sectionLabel text-textSecondary">Пара слов от мастера</p>
      <p className="mt-1 whitespace-pre-wrap">{text}</p>
    </div>
  );
}

const DATE_WHEEL_ITEM_WIDTH = 88;

const monthTitleFormatter = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" });
const calendarWeekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const parseDateKeyLocal = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const getMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

function BookingDateCalendar({
  accentColor,
  dates,
  onChange,
  value,
}: {
  accentColor: string;
  dates: Date[];
  onChange: (value: string) => void;
  value: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const availableKeys = useMemo(() => new Set(dates.map(formatDateKey)), [dates]);
  const availableMonthKeys = useMemo(() => Array.from(new Set(dates.map(getMonthKey))).sort(), [dates]);
  const selectedMonthKey = value && availableKeys.has(value) ? getMonthKey(parseDateKeyLocal(value)) : "";
  const selectedDateLabel = value && availableKeys.has(value) ? formatDateLabel(parseDateKeyLocal(value)) : "";
  const firstDate = dates[0];
  const [visibleMonthKey, setVisibleMonthKey] = useState(() => selectedMonthKey || getMonthKey(firstDate || new Date()));

  useEffect(() => {
    if (selectedMonthKey) {
      setVisibleMonthKey(selectedMonthKey);
      return;
    }
    if (firstDate) setVisibleMonthKey(getMonthKey(firstDate));
  }, [firstDate, selectedMonthKey]);

  useEffect(() => {
    if (!value) {
      setCollapsed(false);
    }
  }, [value]);

  if (dates.length === 0) return null;

  const visibleMonth = parseDateKeyLocal(`${visibleMonthKey}-01`);
  const visibleMonthIndex = availableMonthKeys.indexOf(visibleMonthKey);
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(monthStart.getDate() - ((monthStart.getDay() + 6) % 7));
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    return date;
  });

  const changeMonth = (direction: -1 | 1) => {
    const nextKey = availableMonthKeys[visibleMonthIndex + direction];
    if (nextKey) setVisibleMonthKey(nextKey);
  };
  const calendarCollapsed = collapsed && Boolean(selectedDateLabel);

  return (
    <div className={`booksy-date-calendar ${calendarCollapsed ? "is-collapsed" : "is-expanded"}`} style={{ "--date-calendar-accent": accentColor } as React.CSSProperties}>
      <div className="booksy-date-calendar-summary-wrap" aria-hidden={!calendarCollapsed}>
        <button
          type="button"
          className="booksy-date-calendar-summary"
          onClick={() => setCollapsed(false)}
          aria-expanded={!calendarCollapsed}
          tabIndex={calendarCollapsed ? 0 : -1}
        >
          <span>
            <CalendarBlank weight="regular" aria-hidden="true" />
            <span>{selectedDateLabel}</span>
          </span>
          <CaretDown weight="bold" aria-hidden="true" />
        </button>
      </div>
      <div className="booksy-date-calendar-panel" aria-hidden={calendarCollapsed}>
      <div className="booksy-date-calendar-header">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          disabled={calendarCollapsed || visibleMonthIndex <= 0}
          aria-label="Предыдущий месяц"
        >
          <CaretLeft weight="bold" aria-hidden="true" />
        </button>
        <div className="booksy-date-calendar-title">
          <CalendarBlank weight="regular" aria-hidden="true" />
          <span>{monthTitleFormatter.format(visibleMonth)}</span>
        </div>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          disabled={calendarCollapsed || visibleMonthIndex === -1 || visibleMonthIndex >= availableMonthKeys.length - 1}
          aria-label="Следующий месяц"
        >
          <CaretRight weight="bold" aria-hidden="true" />
        </button>
      </div>
      <div className="booksy-date-calendar-weekdays" aria-hidden="true">
        {calendarWeekdays.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>
      <div className="booksy-date-calendar-grid" role="grid" aria-label="Выбор даты">
        {cells.map((date) => {
          const key = formatDateKey(date);
          const inMonth = date.getMonth() === visibleMonth.getMonth();
          const available = availableKeys.has(key);
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              disabled={calendarCollapsed || !available}
              onClick={() => {
                onChange(key);
                setCollapsed(true);
              }}
              className={`${active ? "is-selected" : ""} ${inMonth ? "" : "is-outside"}`}
              aria-pressed={active}
              aria-label={date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "long" })}
            >
              <span>{date.getDate()}</span>
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}

function BookingDateWheel({
  accentColor,
  dates,
  onChange,
  value,
}: {
  accentColor: string;
  dates: Date[];
  onChange: (value: string) => void;
  value: string;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userScrollRef = useRef(false);
  const options = useMemo(
    () => dates.map((date) => ({ key: formatDateKey(date), label: formatDateLabel(date), date })),
    [dates],
  );
  const selectedIndex = Math.max(0, options.findIndex((item) => item.key === value));
  const [visualIndex, setVisualIndex] = useState(selectedIndex);
  const spacerWidth = `calc(50% - ${DATE_WHEEL_ITEM_WIDTH / 2}px)`;

  useEffect(() => {
    setVisualIndex(selectedIndex);
  }, [selectedIndex]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || options.length === 0) return;
    list.scrollTo({ left: selectedIndex * DATE_WHEEL_ITEM_WIDTH, behavior: "smooth" });
  }, [options.length, selectedIndex]);

  const selectIndex = (index: number) => {
    const clampedIndex = Math.min(Math.max(index, 0), Math.max(options.length - 1, 0));
    const next = options[clampedIndex]?.key;
    if (next && next !== value) onChange(next);
  };

  const handleScroll = () => {
    if (!userScrollRef.current) return;
    const list = listRef.current;
    if (!list) return;
    const nextIndex = Math.min(
      Math.max(
        Math.round(list.scrollLeft / DATE_WHEEL_ITEM_WIDTH),
        0,
      ),
      Math.max(options.length - 1, 0),
    );
    setVisualIndex(nextIndex);
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      selectIndex(nextIndex);
      userScrollRef.current = false;
    }, 90);
  };

  const markUserScroll = () => {
    userScrollRef.current = true;
  };

  if (options.length === 0) return null;

  return (
    <div className="booksy-date-wheel" style={{ "--date-wheel-accent": accentColor } as React.CSSProperties}>
      <button
        type="button"
        className="booksy-date-wheel-nudge"
        onClick={() => selectIndex(visualIndex - 1)}
        disabled={visualIndex === 0}
        aria-label="Предыдущая дата"
      >
        <CaretLeft weight="bold" aria-hidden="true" />
      </button>
      <div
        ref={listRef}
        className="booksy-date-wheel-list"
        onScroll={handleScroll}
        onPointerDown={markUserScroll}
        onTouchStart={markUserScroll}
        onWheel={markUserScroll}
        role="listbox"
        aria-label="Выбор даты"
      >
        <div style={{ width: spacerWidth, flex: "0 0 auto" }} aria-hidden="true" />
        {options.map((item, index) => {
          const active = index === visualIndex;
          const distance = Math.abs(index - visualIndex);
          return (
            <button
              key={item.key}
              type="button"
              className={`booksy-date-wheel-option ${active ? "is-selected" : ""}`}
              onClick={() => selectIndex(index)}
              role="option"
              aria-selected={active}
              style={{ width: DATE_WHEEL_ITEM_WIDTH, opacity: active ? 1 : distance === 1 ? 0.64 : 0.34 }}
            >
              <span>{item.label}</span>
            </button>
          );
        })}
        <div style={{ width: spacerWidth, flex: "0 0 auto" }} aria-hidden="true" />
      </div>
      <span className="booksy-date-wheel-selection" aria-hidden="true" />
      <button
        type="button"
        className="booksy-date-wheel-nudge"
        onClick={() => selectIndex(visualIndex + 1)}
        disabled={visualIndex === options.length - 1}
        aria-label="Следующая дата"
      >
        <CaretRight weight="bold" aria-hidden="true" />
      </button>
    </div>
  );
}

function BookingProgress({ labels, step }: { labels: readonly string[]; step: number }) {
  return (
    <div className="booksy-progress rounded-2xl border border-border bg-surface px-3 py-3 sm:px-5 sm:py-4">
      <div className="booksy-progress-track grid grid-cols-3">
        {labels.map((label, index) => {
          const number = index + 1;
          const active = number === step;
          const completed = number < step;
          return (
            <div
              key={label}
              className={`booksy-progress-step relative flex flex-col items-center text-center ${active ? "is-active" : ""} ${completed ? "is-complete" : ""}`}
            >
              <span className="booksy-progress-dot relative z-[2] flex h-8 w-8 items-center justify-center rounded-full text-badge">
                {completed ? (
                  <Check className="h-4 w-4" weight="bold" aria-hidden="true" />
                ) : number}
              </span>
              <span className="mt-1.5 block max-w-full truncate px-1 text-tabLabel">{label}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-systemMessage text-textSecondary">Шаг {step} из 3</p>
    </div>
  );
}

function TypewriterText({
  delay = 22,
  disabled = false,
  startDelay = 0,
  text,
}: {
  delay?: number;
  disabled?: boolean;
  startDelay?: number;
  text: string;
}) {
  const [visibleText, setVisibleText] = useState(text);
  const [done, setDone] = useState(true);

  useEffect(() => {
    if (disabled) {
      setVisibleText(text);
      setDone(true);
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setVisibleText(text);
      setDone(true);
      return;
    }

    let index = 0;
    let tickTimer = 0;
    setVisibleText("");
    setDone(false);

    const startTimer = window.setTimeout(() => {
      const tick = () => {
        index += 1;
        setVisibleText(text.slice(0, index));

        if (index >= text.length) {
          setDone(true);
          return;
        }

        tickTimer = window.setTimeout(tick, delay);
      };

      tick();
    }, startDelay);

    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(tickTimer);
    };
  }, [delay, disabled, startDelay, text]);

  return (
    <span className={`typewriter-text ${done ? "is-done" : ""}`}>
      {visibleText}
      <span className="typewriter-cursor" aria-hidden="true" />
    </span>
  );
}

function ServicePhoto({
  alt = "",
  className,
  fetchPriority,
  loading = "lazy",
  service,
}: {
  alt?: string;
  className?: string;
  fetchPriority?: "high" | "low" | "auto";
  loading?: "eager" | "lazy";
  service: PublicService;
}) {
  const [failed, setFailed] = useState(false);
  const fallback = service.title.trim().slice(0, 1).toLocaleUpperCase("ru-RU") || "У";

  useEffect(() => {
    setFailed(false);
  }, [service.photoUrl]);

  if (!service.photoUrl || failed) {
    return <span className={className}>{fallback}</span>;
  }

  return (
    <img
      className={className}
      src={service.photoUrl}
      alt={alt}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
      onError={() => setFailed(true)}
    />
  );
}

function BookingShowcaseServices({
  masterProfile,
  selectedServiceIds,
  services,
  serviceDuration,
  setSelectedServiceIds,
  setSubmitted,
  variant,
}: {
  masterProfile: PublicMaster | null;
  selectedServiceIds: string[];
  services: PublicService[];
  serviceDuration: (service: PublicService) => number;
  setSelectedServiceIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSubmitted: React.Dispatch<React.SetStateAction<boolean>>;
  variant: "stack" | "spotlight" | "wheel" | "grid" | "feature";
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [wheelInfoService, setWheelInfoService] = useState<PublicService | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const wheelListRef = useRef<HTMLDivElement | null>(null);
  const wheelScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelProgrammaticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelProgrammaticScrollRef = useRef(false);
  const wheelUserScrollRef = useRef(false);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const suppressClickRef = useRef(false);
  const swipeThreshold = variant === "spotlight" ? 14 : 20;
  const serviceWheelItemWidth = 148;
  const serviceWheelItemGap = 12;

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(services.length - 1, 0)));
  }, [services.length]);

  const toggleService = (serviceId: string) => {
    if (suppressClickRef.current) return;
    setSelectedServiceIds((current) => {
      const exists = current.includes(serviceId);
      return exists ? current.filter((id) => id !== serviceId) : [...current, serviceId];
    });
    setSubmitted(false);
  };

  const scrollWheelToIndex = (index: number, behavior: ScrollBehavior = "smooth") => {
    const list = wheelListRef.current;
    if (!list) return;
    wheelProgrammaticScrollRef.current = true;
    list.scrollTo({ left: index * (serviceWheelItemWidth + serviceWheelItemGap), behavior });
    if (wheelProgrammaticTimerRef.current) clearTimeout(wheelProgrammaticTimerRef.current);
    wheelProgrammaticTimerRef.current = setTimeout(() => {
      wheelProgrammaticScrollRef.current = false;
    }, behavior === "smooth" ? 320 : 0);
  };

  const toggleWheelServiceAtIndex = (index: number) => {
    const clampedIndex = Math.min(Math.max(index, 0), Math.max(services.length - 1, 0));
    setActiveIndex(clampedIndex);
    const service = services[clampedIndex];
    if (!service) return;
    setSelectedServiceIds((current) => {
      const exists = current.includes(service.id);
      return exists ? current.filter((id) => id !== service.id) : [...current, service.id];
    });
    setSubmitted(false);
  };

  const selectWheelIndex = (index: number, scroll = true) => {
    const clampedIndex = Math.min(Math.max(index, 0), Math.max(services.length - 1, 0));
    toggleWheelServiceAtIndex(clampedIndex);
    if (scroll) scrollWheelToIndex(clampedIndex);
  };

  useEffect(() => {
    if (variant !== "wheel") return;
    const list = wheelListRef.current;
    if (!list || services.length === 0) return;
    const selectedIndex = services.findIndex((service) => selectedServiceIds.includes(service.id));
    const nextIndex = selectedIndex >= 0 ? selectedIndex : Math.min(activeIndex, services.length - 1);
    setActiveIndex(nextIndex);
    window.requestAnimationFrame(() => scrollWheelToIndex(nextIndex, "auto"));
  }, [services.length, variant]);

  const handleWheelScroll = () => {
    if (wheelProgrammaticScrollRef.current) return;
    if (!wheelUserScrollRef.current) return;
    const list = wheelListRef.current;
    if (!list) return;
    const nextIndex = Math.min(
      Math.max(Math.round(list.scrollLeft / (serviceWheelItemWidth + serviceWheelItemGap)), 0),
      Math.max(services.length - 1, 0),
    );
    setActiveIndex(nextIndex);
    if (wheelScrollTimerRef.current) clearTimeout(wheelScrollTimerRef.current);
    wheelScrollTimerRef.current = setTimeout(() => {
      wheelUserScrollRef.current = false;
    }, 90);
  };

  const markWheelUserScroll = () => {
    wheelUserScrollRef.current = true;
  };

  const handleCardVisualClick = (serviceId: string, position: number) => {
    if (suppressClickRef.current) return;
    if (position !== 0) {
      const nextIndex = services.findIndex((service) => service.id === serviceId);
      if (nextIndex >= 0) setActiveIndex(nextIndex);
      return;
    }
    toggleService(serviceId);
  };

  const moveActiveCard = (direction: 1 | -1) => {
    if (services.length < 2) return;
    setActiveIndex((current) => (current + direction + services.length) % services.length);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    setDragStartX(event.clientX);
    setDragOffset(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartX === null) return;
    setDragOffset(Math.max(-150, Math.min(150, event.clientX - dragStartX)));
  };

  const finishSwipe = () => {
    const swiped = Math.abs(dragOffset) > 8;
    suppressClickRef.current = swiped;
    if (dragOffset <= -swipeThreshold) moveActiveCard(1);
    if (dragOffset >= swipeThreshold) moveActiveCard(-1);
    setDragStartX(null);
    setDragOffset(0);
    if (swiped) window.setTimeout(() => { suppressClickRef.current = false; }, 0);
  };

  if (variant === "feature") {
    return (
      <div className="booking-showcase-services booking-showcase-feature" aria-label="Услуги">
        <div className="booking-service-feature-list" role="listbox" aria-label="Выбор услуги">
          {services.map((service, index) => {
            const selected = selectedServiceIds.includes(service.id);
            const duration = serviceDuration(service);
            return (
              <article
                key={service.id}
                className={`booking-service-feature-card ${selected ? "is-selected" : ""}`}
                role="option"
                aria-selected={selected}
              >
                <div className="booking-service-feature-photo" aria-hidden={!service.photoUrl}>
                  {service.photoUrl ? (
                    <ServicePhoto service={service} loading={index < 2 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "low"} />
                  ) : (
                    <ServicePhoto service={service} />
                  )}
                </div>
                <div className="booking-service-feature-body">
                  <h3>{service.title}</h3>
                  <div className="booking-service-feature-facts">
                    <span><Clock weight="regular" aria-hidden="true" />{duration} мин</span>
                    <span><Tag weight="regular" aria-hidden="true" />{formatServicePrice(service, masterProfile?.showPrice !== false)}</span>
                  </div>
                  {service.description && <p>{service.description}</p>}
                  <button type="button" className="booking-service-feature-select" onClick={() => toggleService(service.id)}>
                    {selected ? "Выбрано" : "Выбрать"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div className="booking-showcase-services booking-showcase-grid" aria-label="Услуги">
        <div className="booking-service-grid-list" role="listbox" aria-label="Выбор услуги">
          {services.map((service, index) => {
            const selected = selectedServiceIds.includes(service.id);
            const duration = serviceDuration(service);
            return (
              <button
                key={service.id}
                type="button"
                className={`booking-service-grid-card ${selected ? "is-selected" : ""}`}
                onClick={() => toggleService(service.id)}
                role="option"
                aria-selected={selected}
              >
                <span className="booking-service-grid-photo" aria-hidden={!service.photoUrl}>
                  {service.photoUrl ? (
                    <ServicePhoto service={service} loading={index < 4 ? "eager" : "lazy"} fetchPriority={index < 2 ? "high" : "low"} />
                  ) : (
                    <ServicePhoto service={service} />
                  )}
                </span>
                <span className="booking-service-grid-copy">
                  <span className="booking-service-grid-title">{service.title}</span>
                  <span className="booking-service-grid-duration">
                    <Clock weight="regular" aria-hidden="true" />
                    {duration} мин
                  </span>
                  <span className="booking-service-grid-price">
                    {formatServicePrice(service, masterProfile?.showPrice !== false)}
                  </span>
                </span>
                {selected && (
                  <span className="booking-service-grid-check" aria-hidden="true">
                    <Check weight="bold" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (variant === "wheel") {
    const spacerWidth = `calc(50% - ${serviceWheelItemWidth / 2}px - ${serviceWheelItemGap / 2}px)`;

    return (
      <div className="booking-showcase-services booking-showcase-wheel" aria-label="Услуги">
        <div
          ref={wheelListRef}
          className="booking-service-wheel-list"
          onScroll={handleWheelScroll}
          onPointerDown={markWheelUserScroll}
          onTouchStart={markWheelUserScroll}
          onWheel={markWheelUserScroll}
          role="listbox"
          aria-label="Выбор услуги"
        >
          <div style={{ width: spacerWidth, flex: "0 0 auto" }} aria-hidden="true" />
          {services.map((service, index) => {
            const selected = selectedServiceIds.includes(service.id);
            const duration = serviceDuration(service);
            return (
              <article
                key={service.id}
                className={`booking-service-wheel-option ${selected ? "is-selected" : ""}`}
                onClick={() => selectWheelIndex(index)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  selectWheelIndex(index);
                }}
                role="option"
                aria-selected={selected}
                tabIndex={0}
                style={{ width: serviceWheelItemWidth }}
              >
                <button
                  type="button"
                  className="booking-service-wheel-info"
                  onClick={(event) => {
                    event.stopPropagation();
                    setWheelInfoService(service);
                  }}
                  aria-label={`Подробнее: ${service.title}`}
                  title="Подробнее"
                >
                  <Info weight="bold" aria-hidden="true" />
                </button>
                <span className="booking-service-wheel-photo" aria-hidden={!service.photoUrl}>
                  {service.photoUrl ? (
                    <ServicePhoto service={service} loading={index === activeIndex ? "eager" : "lazy"} fetchPriority={index === activeIndex ? "high" : "low"} />
                  ) : (
                    <ServicePhoto service={service} />
                  )}
                </span>
                <span className="booking-service-wheel-title">{service.title}</span>
                <span className="booking-service-wheel-meta">{duration} мин</span>
                <span className="booking-service-wheel-price">{formatServicePrice(service, masterProfile?.showPrice !== false)}</span>
              </article>
            );
          })}
          <div style={{ width: spacerWidth, flex: "0 0 auto" }} aria-hidden="true" />
        </div>
        <span className="booking-service-wheel-selection" aria-hidden="true" />
        {portalReady && wheelInfoService && createPortal((
          <div className={`booking-service-info-overlay ${selectedServiceIds.length > 0 ? "booking-service-info-overlay-above-selection" : ""}`} role="dialog" aria-modal="true" aria-labelledby="booking-service-info-title" onClick={() => setWheelInfoService(null)}>
            <article className="booking-service-info-modal" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="booking-service-info-close" onClick={() => setWheelInfoService(null)} aria-label="Закрыть">
                <X weight="bold" aria-hidden="true" />
              </button>
              {wheelInfoService.photoUrl && (
                <ServicePhoto className="booking-service-info-photo" service={wheelInfoService} loading="eager" />
              )}
              <h3 id="booking-service-info-title">{wheelInfoService.title}</h3>
              <div className="booking-service-info-facts">
                <span><Clock weight="regular" aria-hidden="true" />{serviceDuration(wheelInfoService)} мин</span>
                <span><Tag weight="regular" aria-hidden="true" />{formatServicePrice(wheelInfoService, masterProfile?.showPrice !== false)}</span>
                {wheelInfoService.category && <span><Star weight="regular" aria-hidden="true" />{wheelInfoService.category}</span>}
              </div>
              <p>{wheelInfoService.description || "Описание услуги пока не добавлено."}</p>
            </article>
          </div>
        ), document.body)}
      </div>
    );
  }

  return (
    <div
      className={`booking-showcase-services booking-showcase-${variant} ${dragStartX !== null ? "is-dragging" : ""}`}
      aria-label="Услуги"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishSwipe}
      onPointerCancel={finishSwipe}
      style={{ "--booking-card-drag": `${dragOffset}px` } as React.CSSProperties}
    >
      <div className="booking-showcase-stage">
      {services.map((service, index) => {
        const active = selectedServiceIds.includes(service.id);
        const duration = serviceDuration(service);
        const forward = services.length ? (services.length + index - activeIndex) % services.length : 0;
        const backward = services.length ? (services.length + activeIndex - index) % services.length : 0;
        const spotlightPosition = forward === 0 ? 0 : forward <= backward ? forward : -backward;
        const position = variant === "spotlight" ? spotlightPosition : forward;
        const rank = variant === "spotlight" ? Math.abs(position) : forward;
        const visible = variant === "spotlight" ? rank < Math.min(2, services.length) : rank < Math.min(3, services.length);
        return (
          <article
            key={service.id}
            className={`booking-showcase-card ${active ? "is-selected" : ""} ${visible ? "" : "is-hidden"}`}
            aria-hidden={!visible}
            style={{ "--booking-card-rank": rank, "--booking-card-position": position } as React.CSSProperties}
          >
            <button type="button" onClick={() => toggleService(service.id)} className="booking-showcase-favorite" aria-label={active ? "Убрать услугу" : "Выбрать услугу"} tabIndex={visible ? 0 : -1}>
              {active ? <Check weight="bold" /> : variant === "spotlight" ? <Star weight="regular" /> : <Heart weight="fill" />}
            </button>
            <button type="button" onClick={() => handleCardVisualClick(service.id, position)} className="booking-showcase-image" aria-pressed={active} tabIndex={visible ? 0 : -1}>
              {service.photoUrl ? (
                <ServicePhoto service={service} loading={index === activeIndex ? "eager" : "lazy"} fetchPriority={index === activeIndex ? "high" : "low"} />
              ) : (
                <ServicePhoto service={service} />
              )}
            </button>
            <div className="booking-showcase-body">
              <h3>{service.title}</h3>
              {variant === "spotlight" ? (
                <div className="booking-showcase-meta">
                  <span><Clock weight="regular" aria-hidden="true" />{duration} мин</span>
                  <span><Tag weight="regular" aria-hidden="true" />{formatServicePrice(service, masterProfile?.showPrice !== false)}</span>
                </div>
              ) : (
                <>
                  <p className="booking-showcase-price">
                    {formatServicePrice(service, masterProfile?.showPrice !== false)}
                  </p>
                  <div className="booking-showcase-meta">
                    <span>{duration} мин</span>
                    {service.description && <span>Подробно</span>}
                  </div>
                </>
              )}
              {service.description && <p className="booking-showcase-description">{service.description}</p>}
              <button type="button" onClick={() => toggleService(service.id)} className="booking-showcase-select" tabIndex={visible ? 0 : -1}>
                {active ? "Выбрано" : "Выбрать"}
              </button>
            </div>
          </article>
        );
      })}
      </div>
      {services.length > 1 && (
        <div className="booking-showcase-dots" aria-hidden="true">
          {services.map((service, index) => (
            <span key={service.id} className={index === activeIndex ? "is-active" : ""} />
          ))}
        </div>
      )}
    </div>
  );
}

function BooksyPanel({
  children,
  animateText = true,
  eyebrow,
  onBack,
  subtitle,
  title,
}: {
  animateText?: boolean;
  children: React.ReactNode;
  eyebrow: string;
  onBack?: () => void;
  subtitle?: string;
  title: string;
}) {
  return (
    <section className="booksy-panel rounded-2xl border border-border bg-surface p-4 sm:p-6">
      <div className="booking-step-header flex items-start gap-3">
        {onBack && (
          <button type="button" onClick={onBack} className="booksy-back flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-textPrimary" aria-label="Назад">
            <BackArrowIcon className="h-6 w-6" />
          </button>
        )}
        <div className="booking-step-copy">
          <p className="text-sectionLabel text-primary"><TypewriterText disabled={!animateText} delay={18} text={eyebrow} /></p>
          <h2 className="mt-1 text-screenTitle text-textPrimary"><TypewriterText disabled={!animateText} delay={28} startDelay={130} text={title} /></h2>
          {subtitle && <p className="mt-2 text-settingsRowDescription text-textSecondary"><TypewriterText disabled={!animateText} delay={16} startDelay={420} text={subtitle} /></p>}
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function BookingSummary({
  date,
  duration,
  price,
  priceFrom,
  service,
  showPrice,
  time,
}: {
  date: string;
  duration: number;
  price: number;
  priceFrom: boolean;
  service: string;
  showPrice: boolean;
  time: string;
}) {
  return (
    <div className="booksy-summary rounded-2xl bg-background p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-conversationName text-textPrimary">{service}</p>
          <p className="mt-1 text-messageMetadata text-textSecondary">{duration} мин</p>
        </div>
        <p className="shrink-0 text-badge text-textPrimary">{formatBookingPrice(price, priceFrom, showPrice)}</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4">
        <div>
          <p className="text-messageMetadata text-textSecondary">День</p>
          <p className="mt-1 text-badge text-textPrimary">{date}</p>
        </div>
        <div>
          <p className="text-messageMetadata text-textSecondary">Окошко</p>
          <p className="mt-1 text-badge text-textPrimary">{time}</p>
        </div>
      </div>
    </div>
  );
}

function BookingConfirmation({
  booking,
  masterName,
  onConnectTelegram,
  onEdit,
  onNewBooking,
  onRefreshTelegram,
  onSendTelegramTest,
  showPrice,
  telegram,
}: {
  booking: ConfirmedBooking;
  masterName?: string;
  onConnectTelegram: () => void;
  onEdit: () => void;
  onNewBooking: () => void;
  onRefreshTelegram: () => void;
  onSendTelegramTest: () => void;
  showPrice: boolean;
  telegram: TelegramConnectState;
}) {
  return (
    <section
      className="booking-success booksy-panel w-full rounded-2xl border border-border bg-surface p-4 sm:p-6"
      role="status"
      aria-live="polite"
    >
      <div className="text-center">
        <div
          className="booking-success-check mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 ring-1 ring-success/20"
          aria-hidden="true"
        >
          <CheckCircle className="booking-success-tick h-10 w-10 text-success" weight="bold" />
        </div>
        <p className="mt-4 text-sectionLabel text-success">Все получилось</p>
        <p className="booking-success-title mt-1 text-screenTitle text-textPrimary">Вы записаны!</p>
        <p className="mx-auto mt-2 max-w-lg text-profileDescription text-textSecondary">
          Заявка ушла мастеру{masterName ? ` ${masterName}` : ""}. Детали записи ниже.
        </p>
      </div>

      <div className="booking-success-details mt-5 rounded-2xl border border-border bg-background p-3.5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-messageMetadata text-textSecondary">Что выбрали</p>
            <h2 className="mt-0.5 text-conversationName text-textPrimary">{booking.serviceTitle}</h2>
          </div>
          <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-badge text-textSecondary">Готово</span>
        </div>
        <dl className="mt-3 grid gap-1.5 sm:grid-cols-2">
          <ConfirmationItem label="День" value={booking.dateLabel} />
          <ConfirmationItem label="Окошко" value={booking.time} highlight />
          <ConfirmationItem label="По времени" value={`${booking.duration} мин`} />
          <ConfirmationItem label="Стоимость" value={formatBookingPrice(booking.price, booking.priceFrom, showPrice)} />
          <ConfirmationItem label="Имя" value={booking.clientName} />
          {booking.clientPhone && <ConfirmationItem label="Телефон" value={booking.clientPhone} />}
        </dl>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-conversationName text-textPrimary">
              Напоминания в Telegram: {telegram.connected ? "включены" : "не включены"}
            </p>
            <p className="mt-1 text-settingsRowDescription text-textSecondary">
              {telegram.connected
                ? telegram.username
                  ? `Пришлем напоминание в @${telegram.username}`
                  : "Пришлем напоминание в подключенный Telegram"
                : "Можно подключить Telegram, чтобы получить напоминания за 24 часа и за 2 часа до визита."}
            </p>
            {telegram.error && <p className="mt-1 text-settingsRowDescription text-info">{telegram.error}</p>}
          </div>
          <div className="grid gap-2 sm:min-w-[220px]">
            {telegram.connected ? (
              <button
                type="button"
                onClick={onSendTelegramTest}
                disabled={telegram.sending}
                className="w-full rounded-xl bg-success px-4 py-2.5 text-buttonLabel text-surface hover:bg-success/90 disabled:opacity-60"
              >
                {telegram.sending ? "Отправляем..." : "Проверить напоминание"}
              </button>
            ) : (
              <button
                type="button"
                onClick={onConnectTelegram}
                disabled={telegram.loading}
                className="w-full rounded-xl bg-info px-4 py-2.5 text-buttonLabel text-surface hover:opacity-90 disabled:opacity-60"
              >
                {telegram.loading ? "Готовим ссылку..." : "Включить напоминания"}
              </button>
            )}
            <button
              type="button"
              onClick={onRefreshTelegram}
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-buttonLabel text-textPrimary hover:bg-background"
            >
              Обновить
            </button>
          </div>
        </div>
      </div>

      <div className="pt-4">
        <p className="text-systemMessage text-textSecondary">Если нужно будет что-то уточнить, мастер свяжется с вами по указанному номеру.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onEdit}
            className="w-full rounded-2xl bg-success px-4 py-3 text-buttonLabel text-surface hover:bg-success/90"
          >
            Поменять детали
          </button>
          <button
            type="button"
            onClick={onNewBooking}
            className="w-full rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-buttonLabel text-success hover:bg-success/15"
          >
            Выбрать еще одну услугу
          </button>
        </div>
      </div>
    </section>
  );
}

function ConfirmationItem({ highlight, label, value }: { highlight?: boolean; label: string; value: string }) {
  return (
    <div className={`rounded-lg border border-border bg-surface px-2.5 py-2 ${highlight ? "ring-1 ring-border/60" : ""}`}>
      <dt className="text-messageMetadata text-textSecondary">{label}</dt>
      <dd className="mt-0.5 text-badge text-textPrimary">{value}</dd>
    </div>
  );
}

function ContactInput({
  inputMode,
  label,
  onChange,
  placeholder,
  required,
  value,
}: {
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-sectionLabel text-textSecondary">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-border px-3 py-2.5 text-messageInput"
        placeholder={placeholder}
        required={required}
        inputMode={inputMode}
      />
    </label>
  );
}
