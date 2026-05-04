"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Section = "Р“Р»Р°РІРЅР°СЏ" | "РЈСЃР»СѓРіРё" | "Р“СЂР°С„РёРє СЂР°Р±РѕС‚С‹" | "РђРЅР°Р»РёС‚РёРєР°" | "Р¤РёРЅР°РЅСЃС‹" | "РќР°СЃС‚СЂРѕР№РєРё";
type AppointmentStatus = "РђРєС‚РёРІРЅР°" | "РџРѕРґС‚РІРµСЂР¶РґРµРЅР°" | "Р—Р°РІРµСЂС€РµРЅР°";

type Service = {
  id: string;
  title: string;
  category: string;
  duration: number;
  price: number;
  description: string;
  preparation: string;
  active: boolean;
};

type Appointment = {
  id: string;
  date: string;
  time: string;
  client: string;
  phone: string;
  serviceId: string;
  status: AppointmentStatus;
};

type BlockedTime = {
  id: string;
  date: string;
  start: string;
  end: string;
  reason: string;
};

type MasterProfile = {
  displayName: string;
  slug: string;
  showOnBookingPage: boolean;
};

type AuthSession = {
  id: string;
  email: string;
  name: string;
  slug: string;
};

const nav: Section[] = ["Р“Р»Р°РІРЅР°СЏ", "РЈСЃР»СѓРіРё", "Р“СЂР°С„РёРє СЂР°Р±РѕС‚С‹", "РђРЅР°Р»РёС‚РёРєР°", "Р¤РёРЅР°РЅСЃС‹", "РќР°СЃС‚СЂРѕР№РєРё"];
const weekDays = ["РџРЅ", "Р’С‚", "РЎСЂ", "Р§С‚", "РџС‚", "РЎР±", "Р’СЃ"];
const timeSlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];
const ruMonths = ["РЇРЅРІР°СЂСЊ", "Р¤РµРІСЂР°Р»СЊ", "РњР°СЂС‚", "РђРїСЂРµР»СЊ", "РњР°Р№", "РСЋРЅСЊ", "РСЋР»СЊ", "РђРІРіСѓСЃС‚", "РЎРµРЅС‚СЏР±СЂСЊ", "РћРєС‚СЏР±СЂСЊ", "РќРѕСЏР±СЂСЊ", "Р”РµРєР°Р±СЂСЊ"];

const emptyService = {
  title: "",
  category: "",
  duration: "60",
  price: "",
  description: "",
  preparation: "",
};

const emptyAppointment = {
  time: "10:00",
  client: "",
  phone: "",
  serviceId: "",
};

const emptyBlock = {
  date: "",
  start: "10:00",
  end: "12:00",
  reason: "",
};

const defaultMasterProfile: MasterProfile = {
  displayName: "",
  slug: "anna-nails",
  showOnBookingPage: true,
};

const normalizeEmailSlug = (email: string) =>
  email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "master";

const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeSlugOrFallback = (value: string, fallback = "master") => normalizeSlug(value) || fallback;

const resolveLatinSlug = (value: string, fallback: string) => {
  const hasLatinOrDigit = /[a-z0-9]/i.test(value);
  return hasLatinOrDigit ? normalizeSlug(value) : normalizeSlugOrFallback(fallback);
};

const getDateParts = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
};

const buildDateKey = (year: number, month: number, day: number) => {
  const maxDay = new Date(year, month, 0).getDate();
  const normalizedDay = Math.min(day, maxDay);
  return `${year}-${String(month).padStart(2, "0")}-${String(normalizedDay).padStart(2, "0")}`;
};

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const intervalsOverlap = (startA: number, endA: number, startB: number, endB: number) =>
  startA < endB && startB < endA;

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatLongDate = (date: Date) =>
  date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "long" });

const formatMonth = (date: Date) =>
  date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

const getMonthDays = (monthDate: Date) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const leading = (first.getDay() + 6) % 7;
  const days: Array<Date | null> = Array.from({ length: leading }, () => null);

  for (let day = 1; day <= last.getDate(); day += 1) {
    days.push(new Date(year, month, day));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
};

const getSelectedWeekDays = (date: Date) => {
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return day;
  });
};

export default function DashboardPage() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [section, setSection] = useState<Section>("Р“Р»Р°РІРЅР°СЏ");
  const [toast, setToast] = useState("");
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [monthDate, setMonthDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => formatDateKey(today));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"Р’СЃРµ" | AppointmentStatus>("Р’СЃРµ");
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState(emptyAppointment);
  const [serviceForm, setServiceForm] = useState(emptyService);
  const [serviceFormOpen, setServiceFormOpen] = useState(false);
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("20:00");
  const [blockForm, setBlockForm] = useState(() => ({ ...emptyBlock, date: formatDateKey(today) }));
  const [masterProfile, setMasterProfile] = useState<MasterProfile>(defaultMasterProfile);
  const [bookingEnabled, setBookingEnabled] = useState(true);
  const bookingPath = `/m/${masterProfile.slug || "master"}`;
  const bookingUrl = typeof window === "undefined" ? bookingPath : `${window.location.origin}${bookingPath}`;

  const loadServerData = async () => {
    const [meResponse, servicesResponse, appointmentsResponse, blockedTimesResponse] = await Promise.all([
      fetch("/api/me"),
      fetch("/api/services"),
      fetch("/api/appointments"),
      fetch("/api/blocked_times"),
    ]);

    const meData = (await meResponse.json()) as {
      success: boolean;
      user?: AuthSession;
      master?: { name: string; slug: string; workStart: string; workEnd: string };
    };

    if (!meResponse.ok || !meData.success || !meData.user || !meData.master) {
      router.replace("/register");
      return;
    }

    const servicesData = (await servicesResponse.json()) as { success: boolean; services?: Service[] };
    const appointmentsData = (await appointmentsResponse.json()) as { success: boolean; appointments?: Appointment[] };
    const blockedTimesData = (await blockedTimesResponse.json()) as { success: boolean; blockedTimes?: BlockedTime[] };

    setAuthSession(meData.user);
    setServices(servicesData.success ? servicesData.services || [] : []);
    setAppointments(appointmentsData.success ? appointmentsData.appointments || [] : []);
    setBlockedTimes(blockedTimesData.success ? blockedTimesData.blockedTimes || [] : []);
    setWorkStart(meData.master.workStart || "10:00");
    setWorkEnd(meData.master.workEnd || "20:00");
    setMasterProfile({
      ...defaultMasterProfile,
      displayName: meData.master.name,
      slug: resolveLatinSlug(meData.master.slug, normalizeEmailSlug(meData.user.email)),
    });
  };

  useEffect(() => {
    const loadSession = async () => {
      try {
        await loadServerData();
      } catch {
        router.replace("/register");
      }
    };

    void loadSession();
  }, [router]);

  const selectedDateObject = useMemo(() => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [selectedDate]);

  const monthDays = useMemo(() => getMonthDays(monthDate), [monthDate]);
  const selectedWeekDays = useMemo(() => getSelectedWeekDays(selectedDateObject), [selectedDateObject]);
  const selectedAppointments = appointments
    .filter((item) => item.date === selectedDate)
    .filter((item) => statusFilter === "Р’СЃРµ" || item.status === statusFilter)
    .sort((a, b) => a.time.localeCompare(b.time));
  const selectedBlockedTimes = blockedTimes
    .filter((item) => item.date === selectedDate)
    .sort((a, b) => a.start.localeCompare(b.start));

  const activeServices = services.filter((service) => service.active);
  const totalRevenue = appointments.reduce((sum, item) => {
    const service = services.find((entry) => entry.id === item.serviceId);
    return sum + (service?.price || 0);
  }, 0);
  const selectedDateRevenue = selectedAppointments.reduce((sum, item) => {
    const service = services.find((entry) => entry.id === item.serviceId);
    return sum + (service?.price || 0);
  }, 0);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      showToast("РЎСЃС‹Р»РєР° СЃРєРѕРїРёСЂРѕРІР°РЅР°");
    } catch {
      showToast("РќРµ СѓРґР°Р»РѕСЃСЊ СЃРєРѕРїРёСЂРѕРІР°С‚СЊ СЃСЃС‹Р»РєСѓ");
    }
  };

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
  };

  const saveMasterProfile = async (profile: MasterProfile) => {
    if (!authSession) return;
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: authSession.email,
        name: profile.displayName || authSession.name,
        slug: profile.slug,
      }),
    });
  };

  const selectToday = () => {
    setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(formatDateKey(today));
  };

  const changeMonth = (direction: -1 | 1) => {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  };

  const addService = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!serviceForm.title.trim() || !serviceForm.price.trim()) {
      showToast("Р—Р°РїРѕР»РЅРёС‚Рµ РЅР°Р·РІР°РЅРёРµ Рё С†РµРЅСѓ СѓСЃР»СѓРіРё");
      return;
    }

    const response = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: serviceForm.title.trim(),
        price: Number(serviceForm.price) || 0,
        duration: Number(serviceForm.duration) || 60,
        description: serviceForm.description.trim(),
      }),
    });
    const data = (await response.json()) as { success: boolean; service?: Service; error?: string };
    if (!response.ok || !data.success || !data.service) {
      showToast(data.error || "Не удалось сохранить услугу");
      return;
    }

    setServices((current) => [data.service!, ...current]);
    setServiceForm(emptyService);
    setServiceFormOpen(false);
    showToast("РЈСЃР»СѓРіР° РґРѕР±Р°РІР»РµРЅР°");
  };

  const addAppointment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!appointmentForm.client.trim() || !appointmentForm.phone.trim()) {
      showToast("Р—Р°РїРѕР»РЅРёС‚Рµ РёРјСЏ Рё С‚РµР»РµС„РѕРЅ РєР»РёРµРЅС‚Р°");
      return;
    }

    const serviceId = appointmentForm.serviceId || services[0]?.id;
    if (!serviceId) {
      showToast("РЎРЅР°С‡Р°Р»Р° РґРѕР±Р°РІСЊС‚Рµ СѓСЃР»СѓРіСѓ");
      setSection("РЈСЃР»СѓРіРё");
      return;
    }

    const selectedService = services.find((service) => service.id === serviceId);
    const appointmentStart = timeToMinutes(appointmentForm.time);
    const appointmentEnd = appointmentStart + (selectedService?.duration || 60);
    const timeBlocked = blockedTimes.some(
      (block) =>
        block.date === selectedDate &&
        intervalsOverlap(appointmentStart, appointmentEnd, timeToMinutes(block.start), timeToMinutes(block.end)),
    );
    if (timeBlocked) {
      showToast("Р­С‚Рѕ РІСЂРµРјСЏ Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅРѕ РјР°СЃС‚РµСЂРѕРј");
      return;
    }

    const appointmentOverlaps = appointments.some((item) => {
      if (item.date !== selectedDate) return false;
      const service = services.find((entry) => entry.id === item.serviceId);
      const itemStart = timeToMinutes(item.time);
      const itemEnd = itemStart + (service?.duration || 60);
      return intervalsOverlap(appointmentStart, appointmentEnd, itemStart, itemEnd);
    });
    if (appointmentOverlaps) {
      showToast("Р­С‚Рѕ РІСЂРµРјСЏ РїРµСЂРµСЃРµРєР°РµС‚СЃСЏ СЃ РґСЂСѓРіРѕР№ Р·Р°РїРёСЃСЊСЋ");
      return;
    }

    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: selectedDate,
        time: appointmentForm.time,
        client: appointmentForm.client.trim(),
        phone: appointmentForm.phone.trim(),
        serviceId,
      }),
    });
    const data = (await response.json()) as { success: boolean; appointment?: Appointment; error?: string };
    if (!response.ok || !data.success || !data.appointment) {
      showToast(data.error || "Не удалось создать запись");
      return;
    }

    setAppointments((current) => [...current, data.appointment!]);
    setAppointmentForm(emptyAppointment);
    setShowAppointmentForm(false);
    showToast("Р—Р°РїРёСЃСЊ РґРѕР±Р°РІР»РµРЅР°");
  };

  const updateAppointmentStatus = (id: string) => {
    const order: AppointmentStatus[] = ["РђРєС‚РёРІРЅР°", "РџРѕРґС‚РІРµСЂР¶РґРµРЅР°", "Р—Р°РІРµСЂС€РµРЅР°"];
    setAppointments((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const next = order[(order.indexOf(item.status) + 1) % order.length];
        return { ...item, status: next };
      }),
    );
  };

  const deleteAppointment = async (id: string) => {
    await fetch(`/api/appointments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setAppointments((current) => current.filter((item) => item.id !== id));
    showToast("Р—Р°РїРёСЃСЊ СѓРґР°Р»РµРЅР°");
  };

  const toggleService = (id: string) => {
    setServices((current) => current.map((item) => (item.id === id ? { ...item, active: !item.active } : item)));
  };

  const deleteService = async (id: string) => {
    await fetch(`/api/services?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setServices((current) => current.filter((item) => item.id !== id));
    setAppointments((current) => current.filter((item) => item.serviceId !== id));
    showToast("РЈСЃР»СѓРіР° СѓРґР°Р»РµРЅР°");
  };

  const addBlockedTime = async (event: React.FormEvent) => {
    event.preventDefault();
    if (blockForm.start >= blockForm.end) {
      showToast("Р’СЂРµРјСЏ РѕРєРѕРЅС‡Р°РЅРёСЏ РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ РїРѕР·Р¶Рµ РЅР°С‡Р°Р»Р°");
      return;
    }

    const blockStart = timeToMinutes(blockForm.start);
    const blockEnd = timeToMinutes(blockForm.end);
    const blockOverlapsAppointment = appointments.some((item) => {
      if (item.date !== blockForm.date) return false;
      const service = services.find((entry) => entry.id === item.serviceId);
      const appointmentStart = timeToMinutes(item.time);
      const appointmentEnd = appointmentStart + (service?.duration || 60);
      return intervalsOverlap(blockStart, blockEnd, appointmentStart, appointmentEnd);
    });
    if (blockOverlapsAppointment) {
      showToast("Р‘Р»РѕРєРёСЂРѕРІРєР° РїРµСЂРµСЃРµРєР°РµС‚СЃСЏ СЃ СЃСѓС‰РµСЃС‚РІСѓСЋС‰РµР№ Р·Р°РїРёСЃСЊСЋ");
      return;
    }

    const blockOverlapsBlock = blockedTimes.some(
      (item) => item.date === blockForm.date && intervalsOverlap(blockStart, blockEnd, timeToMinutes(item.start), timeToMinutes(item.end)),
    );
    if (blockOverlapsBlock) {
      showToast("РўР°РєР°СЏ Р±Р»РѕРєРёСЂРѕРІРєР° РїРµСЂРµСЃРµРєР°РµС‚СЃСЏ СЃ РґСЂСѓРіРѕР№");
      return;
    }

    const response = await fetch("/api/blocked_times", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: blockForm.date,
        start: blockForm.start,
        end: blockForm.end,
        reason: blockForm.reason.trim() || "Недоступно",
      }),
    });
    const data = (await response.json()) as { success: boolean; blockedTime?: BlockedTime; error?: string };
    if (!response.ok || !data.success || !data.blockedTime) {
      showToast(data.error || "Не удалось создать блокировку");
      return;
    }

    setBlockedTimes((current) => [data.blockedTime!, ...current]);
    setBlockForm((current) => ({ ...emptyBlock, date: current.date }));
    showToast("Р’СЂРµРјСЏ Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅРѕ");
  };

  const deleteBlockedTime = async (id: string) => {
    await fetch(`/api/blocked_times?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setBlockedTimes((current) => current.filter((item) => item.id !== id));
    showToast("Р‘Р»РѕРєРёСЂРѕРІРєР° СѓРґР°Р»РµРЅР°");
  };

  return (
    <main className="min-h-screen bg-section pb-24 md:pb-0">
      <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-6 md:grid-cols-[300px_1fr]">
        <aside className="saas-card hidden h-fit p-4 md:block">
          <p className="px-3 py-4 text-2xl font-semibold tracking-tight text-text">Beauty Time</p>
          <nav className="space-y-1">
            {nav.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSection(item)}
                className={`w-full rounded-xl px-3 py-3 text-left text-lg transition ${
                  section === item ? "bg-accentSoft text-accent" : "text-muted hover:bg-section hover:text-text"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
          <button
            type="button"
            onClick={logout}
            className="mt-4 w-full rounded-xl border border-border bg-white px-3 py-3 text-left text-lg font-semibold text-text transition hover:bg-section"
          >
            Р’С‹Р№С‚Рё
          </button>
        </aside>

        <section className="space-y-5">
          {section === "Р“Р»Р°РІРЅР°СЏ" && (
            <HomeSection
              activeServices={activeServices.length}
              appointments={selectedAppointments}
              blockedTimes={selectedBlockedTimes}
              deleteAppointment={deleteAppointment}
              formatSelectedDate={formatLongDate(selectedDateObject)}
              monthDate={monthDate}
              monthDays={monthDays}
              selectedDate={selectedDate}
              selectedWeekDays={selectedWeekDays}
              services={services}
              setAppointmentForm={setAppointmentForm}
              setSelectedDate={setSelectedDate}
              setShowAppointmentForm={setShowAppointmentForm}
              showAppointmentForm={showAppointmentForm}
              showFilters={showFilters}
              statusFilter={statusFilter}
              timeSlots={timeSlots}
              selectedDateRevenue={selectedDateRevenue}
              masterName={masterProfile.displayName || masterProfile.slug}
              appointmentForm={appointmentForm}
              addAppointment={addAppointment}
              changeMonth={changeMonth}
              selectToday={selectToday}
              setCalendarExpanded={setCalendarExpanded}
              setShowFilters={setShowFilters}
              setStatusFilter={setStatusFilter}
              updateAppointmentStatus={updateAppointmentStatus}
              calendarExpanded={calendarExpanded}
            />
          )}

          {section === "РЈСЃР»СѓРіРё" && (
            <ServicesSection
              addService={addService}
              deleteService={deleteService}
              serviceForm={serviceForm}
              serviceFormOpen={serviceFormOpen}
              services={services}
              setServiceFormOpen={setServiceFormOpen}
              setServiceForm={setServiceForm}
              toggleService={toggleService}
            />
          )}

          {section === "Р“СЂР°С„РёРє СЂР°Р±РѕС‚С‹" && (
            <ScheduleSection
              addBlockedTime={addBlockedTime}
              blockForm={blockForm}
              blockedTimes={blockedTimes}
              bookingEnabled={bookingEnabled}
              deleteBlockedTime={deleteBlockedTime}
              setBlockForm={setBlockForm}
              setBookingEnabled={setBookingEnabled}
              setWorkEnd={setWorkEnd}
              setWorkStart={setWorkStart}
              workEnd={workEnd}
              workStart={workStart}
            />
          )}

          {section === "РђРЅР°Р»РёС‚РёРєР°" && (
            <AnalyticsSection appointments={appointments} activeServices={activeServices.length} blockedTimes={blockedTimes} services={services} />
          )}

          {section === "Р¤РёРЅР°РЅСЃС‹" && (
            <FinanceSection appointments={appointments} services={services} totalRevenue={totalRevenue} />
          )}

          {section === "РќР°СЃС‚СЂРѕР№РєРё" && (
            <SettingsSection
              email={authSession?.email || ""}
              bookingUrl={bookingUrl}
              copyLink={copyLink}
              logout={logout}
              masterProfile={masterProfile}
              saveMasterProfile={saveMasterProfile}
              setMasterProfile={setMasterProfile}
            />
          )}
        </section>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-white/95 p-2 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-4xl grid-cols-4 gap-2">
          {nav.slice(0, 3).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSection(item)}
              className={`rounded-xl px-2 py-2 text-xs ${section === item ? "bg-accentSoft text-accent" : "text-muted"}`}
            >
              {item}
            </button>
          ))}
          <button type="button" onClick={logout} className="rounded-xl px-2 py-2 text-xs font-semibold text-text">
            Р’С‹Р№С‚Рё
          </button>
        </div>
      </nav>

      {toast && <div className="fixed right-4 top-4 z-30 rounded-xl bg-text px-4 py-2 text-sm text-white">{toast}</div>}
    </main>
  );
}

function HomeSection(props: {
  activeServices: number;
  appointments: Appointment[];
  appointmentForm: typeof emptyAppointment;
  blockedTimes: BlockedTime[];
  calendarExpanded: boolean;
  deleteAppointment: (id: string) => void;
  formatSelectedDate: string;
  masterName: string;
  monthDate: Date;
  monthDays: Array<Date | null>;
  selectedDate: string;
  selectedWeekDays: Date[];
  services: Service[];
  setAppointmentForm: React.Dispatch<React.SetStateAction<typeof emptyAppointment>>;
  setCalendarExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedDate: (date: string) => void;
  setShowAppointmentForm: React.Dispatch<React.SetStateAction<boolean>>;
  showAppointmentForm: boolean;
  showFilters: boolean;
  statusFilter: "Р’СЃРµ" | AppointmentStatus;
  timeSlots: string[];
  selectedDateRevenue: number;
  addAppointment: (event: React.FormEvent) => void;
  changeMonth: (direction: -1 | 1) => void;
  selectToday: () => void;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
  setStatusFilter: React.Dispatch<React.SetStateAction<"Р’СЃРµ" | AppointmentStatus>>;
  updateAppointmentStatus: (id: string) => void;
}) {
  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">РџСЂРёРІРµС‚{props.masterName.trim() ? `, ${props.masterName}` : ""}!</h1>
          <p className="mt-2 text-lg text-muted">Р’РѕС‚ С‡С‚Рѕ РїСЂРѕРёСЃС…РѕРґРёС‚ РІ РІР°С€РµРј СЃР°Р»РѕРЅРµ СЃРµРіРѕРґРЅСЏ.</p>
        </div>
      </header>

      <section className="saas-card overflow-hidden">
        <button
          type="button"
          onClick={() => props.setCalendarExpanded((value) => !value)}
          className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 text-left transition hover:bg-accentSoft"
        >
          <div>
            <p className="text-2xl font-semibold capitalize tracking-tight md:text-3xl">{props.formatSelectedDate}</p>
            <p className="text-muted capitalize">{formatMonth(props.monthDate)}</p>
          </div>
          <div className="text-lg font-semibold text-accent">
            {props.calendarExpanded ? "РЎРІРµСЂРЅСѓС‚СЊ РєР°Р»РµРЅРґР°СЂСЊ в–ґ" : "Р Р°Р·РІРµСЂРЅСѓС‚СЊ РєР°Р»РµРЅРґР°СЂСЊ в–ѕ"}
          </div>
        </button>

        <div className="border-b border-border bg-section px-5 py-4">
          <div className="grid grid-cols-7 gap-2 text-center text-sm text-muted">
            {weekDays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {props.selectedWeekDays.map((day) => (
              <button
                key={formatDateKey(day)}
                type="button"
                onClick={() => props.setSelectedDate(formatDateKey(day))}
                className={`rounded-xl border bg-white px-2 py-3 text-center transition hover:bg-accentSoft ${
                  props.selectedDate === formatDateKey(day) ? "border-accent text-accent" : "border-border"
                }`}
              >
                <span className="text-sm font-semibold">{day.getDate()}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={`grid transition-all duration-300 ${props.calendarExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="overflow-hidden bg-section px-5 py-4">
            <div className="mb-4 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => props.changeMonth(-1)} className="rounded-xl border border-border bg-white px-4 py-2 hover:bg-section">
              РќР°Р·Р°Рґ
            </button>
            <button type="button" onClick={props.selectToday} className="rounded-xl border border-border bg-white px-4 py-2 hover:bg-section">
              РЎРµРіРѕРґРЅСЏ
            </button>
            <button type="button" onClick={() => props.changeMonth(1)} className="rounded-xl border border-border bg-white px-4 py-2 hover:bg-section">
              Р’РїРµСЂС‘Рґ
            </button>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-sm text-muted">
              {weekDays.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-2">
              {props.monthDays.map((day, index) =>
                day ? (
                  <button
                    key={formatDateKey(day)}
                    type="button"
                    onClick={() => props.setSelectedDate(formatDateKey(day))}
                    className={`min-h-16 rounded-xl border bg-white px-2 py-2 text-left transition hover:bg-accentSoft ${
                      props.selectedDate === formatDateKey(day) ? "border-accent text-accent" : "border-border"
                    }`}
                  >
                    <span className="text-sm font-semibold">{day.getDate()}</span>
                  </button>
                ) : (
                  <span key={`empty-${index}`} className="min-h-16 rounded-xl border border-transparent" />
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Р—Р°РїРёСЃРё РЅР° {props.formatSelectedDate}</h2>
            <p className="mt-1 text-sm text-muted">Р—Р°РїРёСЃРµР№: {props.appointments.length}</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => props.setShowFilters((value) => !value)}
              className="rounded-2xl border border-border bg-white px-4 py-2 text-muted hover:bg-section"
            >
              Р¤РёР»СЊС‚СЂС‹
            </button>
            <button type="button" onClick={() => props.setShowAppointmentForm(true)} className="rounded-2xl bg-accent px-4 py-2 text-white hover:opacity-90">
              Р”РѕР±Р°РІРёС‚СЊ Р·Р°РїРёСЃСЊ
            </button>
          </div>
        </div>

        {props.showFilters && (
          <div className="saas-card flex flex-wrap gap-2 p-4">
            {(["Р’СЃРµ", "РђРєС‚РёРІРЅР°", "РџРѕРґС‚РІРµСЂР¶РґРµРЅР°", "Р—Р°РІРµСЂС€РµРЅР°"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => props.setStatusFilter(status)}
                className={`rounded-xl border px-3 py-2 ${props.statusFilter === status ? "border-accent bg-accentSoft text-accent" : "border-border bg-white"}`}
              >
                {status}
              </button>
            ))}
          </div>
        )}

        {props.showAppointmentForm && (
          <form onSubmit={props.addAppointment} className="saas-card grid gap-3 p-4 md:grid-cols-5">
            <select
              value={props.appointmentForm.time}
              onChange={(event) => props.setAppointmentForm((current) => ({ ...current, time: event.target.value }))}
              className="rounded-xl border border-border px-3 py-3"
            >
              {props.timeSlots.map((time) => (
                <option key={time}>{time}</option>
              ))}
            </select>
            <input
              value={props.appointmentForm.client}
              onChange={(event) => props.setAppointmentForm((current) => ({ ...current, client: event.target.value }))}
              className="rounded-xl border border-border px-3 py-3"
              placeholder="РРјСЏ РєР»РёРµРЅС‚Р°"
            />
            <input
              value={props.appointmentForm.phone}
              onChange={(event) => props.setAppointmentForm((current) => ({ ...current, phone: event.target.value }))}
              className="rounded-xl border border-border px-3 py-3"
              placeholder="РўРµР»РµС„РѕРЅ"
            />
            <select
              value={props.appointmentForm.serviceId}
              onChange={(event) => props.setAppointmentForm((current) => ({ ...current, serviceId: event.target.value }))}
              className="rounded-xl border border-border px-3 py-3"
            >
              <option value="">Р’С‹Р±РµСЂРёС‚Рµ СѓСЃР»СѓРіСѓ</option>
              {props.services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.title}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 rounded-xl bg-accent px-3 py-3 font-semibold text-white">
                РЎРѕС…СЂР°РЅРёС‚СЊ
              </button>
              <button type="button" onClick={() => props.setShowAppointmentForm(false)} className="rounded-xl border border-border px-3 py-3">
                РћС‚РјРµРЅР°
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {props.blockedTimes.map((item) => (
            <article key={item.id} className="saas-card grid gap-3 border-accentSoft bg-accentSoft p-4 md:grid-cols-[120px_1fr] md:items-center">
              <div>
                <p className="text-2xl font-semibold text-accent">{item.start}-{item.end}</p>
                <p className="text-muted">Р·Р°РєСЂС‹С‚Рѕ</p>
              </div>
              <div>
                <p className="text-2xl font-medium">Р’СЂРµРјСЏ РЅРµРґРѕСЃС‚СѓРїРЅРѕ РґР»СЏ Р·Р°РїРёСЃРё</p>
                <p className="text-muted">{item.reason}</p>
              </div>
            </article>
          ))}

          {props.appointments.length === 0 ? (
            <article className="saas-card p-8 text-center">
              <p className="text-2xl font-semibold">РќР° РІС‹Р±СЂР°РЅРЅСѓСЋ РґР°С‚Сѓ Р·Р°РїРёСЃРµР№ РЅРµС‚</p>
              <p className="mt-2 text-muted">РќР°Р¶РјРёС‚Рµ В«Р”РѕР±Р°РІРёС‚СЊ Р·Р°РїРёСЃСЊВ», С‡С‚РѕР±С‹ СЃРѕР·РґР°С‚СЊ РїРµСЂРІСѓСЋ СЂРµР°Р»СЊРЅСѓСЋ Р·Р°РїРёСЃСЊ.</p>
            </article>
          ) : (
            props.appointments.map((item) => {
              const service = props.services.find((entry) => entry.id === item.serviceId);
              return (
                <article key={item.id} className="saas-card grid gap-3 p-4 md:grid-cols-[120px_1fr_1fr_220px] md:items-center">
                  <div>
                    <p className="text-3xl font-semibold text-accent">{item.time}</p>
                    <p className="text-muted">{item.status}</p>
                  </div>
                  <div>
                    <p className="text-xl font-medium">{item.client}</p>
                    <p className="text-muted">{item.phone}</p>
                  </div>
                  <div>
                    <p className="text-xl font-medium">{service?.title || "РЈСЃР»СѓРіР° СѓРґР°Р»РµРЅР°"}</p>
                    <p className="text-muted">{service ? `${service.duration} РјРёРЅ вЂў ${service.price.toLocaleString("ru-RU")} в‚Ѕ` : "РЅРµС‚ РґРµС‚Р°Р»РµР№"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => props.updateAppointmentStatus(item.id)} className="rounded-xl border border-border px-3 py-2 hover:bg-section">
                      РЎС‚Р°С‚СѓСЃ
                    </button>
                    <button type="button" onClick={() => props.deleteAppointment(item.id)} className="rounded-xl border border-border px-3 py-2 text-muted hover:bg-section">
                      РЈРґР°Р»РёС‚СЊ
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}

function ServicesSection(props: {
  addService: (event: React.FormEvent) => void;
  deleteService: (id: string) => void;
  serviceForm: typeof emptyService;
  serviceFormOpen: boolean;
  services: Service[];
  setServiceForm: React.Dispatch<React.SetStateAction<typeof emptyService>>;
  setServiceFormOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleService: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">РЈСЃР»СѓРіРё</h1>
          <p className="mt-2 text-lg text-muted">Р”РѕР±Р°РІР»СЏР№С‚Рµ СѓСЃР»СѓРіРё СЃРѕ СЃС‚РѕРёРјРѕСЃС‚СЊСЋ, РґР»РёС‚РµР»СЊРЅРѕСЃС‚СЊСЋ Рё РѕРїРёСЃР°РЅРёРµРј РґР»СЏ РєР»РёРµРЅС‚РѕРІ.</p>
        </div>
        <button
          type="button"
          onClick={() => props.setServiceFormOpen((value) => !value)}
          className="rounded-2xl bg-accent px-5 py-3 font-semibold text-white hover:opacity-90"
        >
          {props.serviceFormOpen ? "РЎРІРµСЂРЅСѓС‚СЊ" : "Р”РѕР±Р°РІРёС‚СЊ СѓСЃР»СѓРіСѓ"}
        </button>
      </header>

      <section className={`grid transition-all duration-300 ${props.serviceFormOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <form onSubmit={props.addService} className="saas-card grid gap-4 p-5 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-muted">РќР°Р·РІР°РЅРёРµ</span>
              <input
                value={props.serviceForm.title}
                onChange={(event) => props.setServiceForm((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-xl border border-border px-4 py-3"
                placeholder="РќР°РїСЂРёРјРµСЂ, РјСѓР¶СЃРєР°СЏ СЃС‚СЂРёР¶РєР°"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-muted">РљР°С‚РµРіРѕСЂРёСЏ</span>
              <input
                value={props.serviceForm.category}
                onChange={(event) => props.setServiceForm((current) => ({ ...current, category: event.target.value }))}
                className="w-full rounded-xl border border-border px-4 py-3"
                placeholder="РЎС‚СЂРёР¶РєРё, РѕРєСЂР°С€РёРІР°РЅРёРµ, СѓС…РѕРґ"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-muted">Р”Р»РёС‚РµР»СЊРЅРѕСЃС‚СЊ, РјРёРЅСѓС‚</span>
              <input
                type="number"
                min="5"
                step="5"
                value={props.serviceForm.duration}
                onChange={(event) => props.setServiceForm((current) => ({ ...current, duration: event.target.value }))}
                className="w-full rounded-xl border border-border px-4 py-3"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-muted">Р¦РµРЅР°, в‚Ѕ</span>
              <input
                type="number"
                min="0"
                value={props.serviceForm.price}
                onChange={(event) => props.setServiceForm((current) => ({ ...current, price: event.target.value }))}
                className="w-full rounded-xl border border-border px-4 py-3"
                placeholder="1500"
              />
            </label>
            <label className="space-y-2 lg:col-span-2">
              <span className="text-sm font-medium text-muted">РћРїРёСЃР°РЅРёРµ</span>
              <textarea
                value={props.serviceForm.description}
                onChange={(event) => props.setServiceForm((current) => ({ ...current, description: event.target.value }))}
                className="min-h-24 w-full rounded-xl border border-border px-4 py-3"
                placeholder="Р§С‚Рѕ РІС…РѕРґРёС‚ РІ СѓСЃР»СѓРіСѓ, РєРѕРјСѓ РїРѕРґС…РѕРґРёС‚, РєР°РєРѕР№ СЂРµР·СѓР»СЊС‚Р°С‚ РїРѕР»СѓС‡РёС‚ РєР»РёРµРЅС‚"
              />
            </label>
            <label className="space-y-2 lg:col-span-2">
              <span className="text-sm font-medium text-muted">РџРѕРґРіРѕС‚РѕРІРєР° РєР»РёРµРЅС‚Р°</span>
              <textarea
                value={props.serviceForm.preparation}
                onChange={(event) => props.setServiceForm((current) => ({ ...current, preparation: event.target.value }))}
                className="min-h-20 w-full rounded-xl border border-border px-4 py-3"
                placeholder="Р§С‚Рѕ РЅСѓР¶РЅРѕ Р·РЅР°С‚СЊ РєР»РёРµРЅС‚Сѓ РґРѕ РІРёР·РёС‚Р°"
              />
            </label>
            <div className="flex flex-wrap gap-3 lg:col-span-2">
              <button type="submit" className="rounded-2xl bg-accent px-5 py-3 font-semibold text-white hover:opacity-90">
                РЎРѕС…СЂР°РЅРёС‚СЊ СѓСЃР»СѓРіСѓ
              </button>
              <button
                type="button"
                onClick={() => props.setServiceFormOpen(false)}
                className="rounded-2xl border border-border bg-white px-5 py-3 font-semibold text-muted hover:bg-section"
              >
                РћС‚РјРµРЅР°
              </button>
            </div>
          </form>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {props.services.length === 0 ? (
          <article className="saas-card p-8 text-center lg:col-span-2">
            <p className="text-2xl font-semibold">РЈСЃР»СѓРі РїРѕРєР° РЅРµС‚</p>
            <p className="mt-2 text-muted">Р—Р°РїРѕР»РЅРёС‚Рµ С„РѕСЂРјСѓ РЅРёР¶Рµ, С‡С‚РѕР±С‹ РґРѕР±Р°РІРёС‚СЊ РїРµСЂРІСѓСЋ СѓСЃР»СѓРіСѓ.</p>
          </article>
        ) : (
          props.services.map((service) => (
            <article key={service.id} className="saas-card space-y-4 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted">{service.category}</p>
                  <h2 className="text-2xl font-semibold">{service.title}</h2>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm ${service.active ? "bg-accentSoft text-accent" : "bg-section text-muted"}`}>
                  {service.active ? "РђРєС‚РёРІРЅР°" : "РЎРєСЂС‹С‚Р°"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-section p-3">
                  <p className="text-sm text-muted">Р”Р»РёС‚РµР»СЊРЅРѕСЃС‚СЊ</p>
                  <p className="text-xl font-semibold">{service.duration} РјРёРЅ</p>
                </div>
                <div className="rounded-xl bg-section p-3">
                  <p className="text-sm text-muted">Р¦РµРЅР°</p>
                  <p className="text-xl font-semibold">{service.price.toLocaleString("ru-RU")} в‚Ѕ</p>
                </div>
              </div>
              {service.description && <p className="text-muted">{service.description}</p>}
              {service.preparation && <p className="rounded-xl border border-border p-3 text-sm text-muted">{service.preparation}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => props.toggleService(service.id)} className="rounded-xl border border-border px-3 py-2 hover:bg-section">
                  {service.active ? "РЎРєСЂС‹С‚СЊ" : "РџРѕРєР°Р·Р°С‚СЊ"}
                </button>
                <button type="button" onClick={() => props.deleteService(service.id)} className="rounded-xl border border-border px-3 py-2 text-muted hover:bg-section">
                  РЈРґР°Р»РёС‚СЊ
                </button>
              </div>
            </article>
          ))
        )}
      </div>

    </div>
  );
}

function ScheduleSection(props: {
  addBlockedTime: (event: React.FormEvent) => void;
  blockForm: typeof emptyBlock;
  blockedTimes: BlockedTime[];
  bookingEnabled: boolean;
  deleteBlockedTime: (id: string) => void;
  setBlockForm: React.Dispatch<React.SetStateAction<typeof emptyBlock>>;
  setBookingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setWorkEnd: React.Dispatch<React.SetStateAction<string>>;
  setWorkStart: React.Dispatch<React.SetStateAction<string>>;
  workEnd: string;
  workStart: string;
}) {
  const dateParts = getDateParts(props.blockForm.date);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 4 }, (_, index) => currentYear - 1 + index);
  const daysInMonth = new Date(dateParts.year, dateParts.month, 0).getDate();

  return (
    <div className="space-y-5">
      <article className="saas-card max-w-4xl space-y-5 p-6">
        <h1 className="text-3xl font-semibold">Р“СЂР°С„РёРє СЂР°Р±РѕС‚С‹</h1>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-muted">РќР°С‡Р°Р»Рѕ РґРЅСЏ</span>
            <select value={props.workStart} onChange={(event) => props.setWorkStart(event.target.value)} className="w-full rounded-xl border border-border px-4 py-3">
              {timeSlots.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-muted">РљРѕРЅРµС† РґРЅСЏ</span>
            <select value={props.workEnd} onChange={(event) => props.setWorkEnd(event.target.value)} className="w-full rounded-xl border border-border px-4 py-3">
              {timeSlots.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={() => props.setBookingEnabled((value) => !value)}
          className={`rounded-2xl px-5 py-3 font-semibold ${props.bookingEnabled ? "bg-accent text-white" : "border border-border bg-white text-text"}`}
        >
          {props.bookingEnabled ? "РћРЅР»Р°Р№РЅ-Р·Р°РїРёСЃСЊ РІРєР»СЋС‡РµРЅР°" : "РћРЅР»Р°Р№РЅ-Р·Р°РїРёСЃСЊ РІС‹РєР»СЋС‡РµРЅР°"}
        </button>
      </article>

      <article className="saas-card max-w-4xl space-y-5 p-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Р—Р°Р±Р»РѕРєРёСЂРѕРІР°С‚СЊ РІСЂРµРјСЏ</h2>
          <p className="mt-1 text-muted">Р—Р°РєСЂРѕР№С‚Рµ РґРµРЅСЊ РёР»Рё РЅРµСЃРєРѕР»СЊРєРѕ С‡Р°СЃРѕРІ, РµСЃР»Рё РјР°СЃС‚РµСЂ РЅРµ РїСЂРёРЅРёРјР°РµС‚ РєР»РёРµРЅС‚РѕРІ.</p>
        </div>

        <form onSubmit={props.addBlockedTime} className="grid gap-3 lg:grid-cols-[0.8fr_1.2fr_0.9fr_1fr_1fr_2fr_auto]">
          <select
            value={dateParts.day}
            onChange={(event) =>
              props.setBlockForm((current) => {
                const currentParts = getDateParts(current.date);
                return { ...current, date: buildDateKey(currentParts.year, currentParts.month, Number(event.target.value)) };
              })
            }
            className="rounded-xl border border-border px-4 py-3"
          >
            {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => (
              <option key={day} value={day}>
                {String(day).padStart(2, "0")}
              </option>
            ))}
          </select>
          <select
            value={dateParts.month}
            onChange={(event) =>
              props.setBlockForm((current) => {
                const currentParts = getDateParts(current.date);
                return { ...current, date: buildDateKey(currentParts.year, Number(event.target.value), currentParts.day) };
              })
            }
            className="rounded-xl border border-border px-4 py-3"
          >
            {ruMonths.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
          <select
            value={dateParts.year}
            onChange={(event) =>
              props.setBlockForm((current) => {
                const currentParts = getDateParts(current.date);
                return { ...current, date: buildDateKey(Number(event.target.value), currentParts.month, currentParts.day) };
              })
            }
            className="rounded-xl border border-border px-4 py-3"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <select
            value={props.blockForm.start}
            onChange={(event) => props.setBlockForm((current) => ({ ...current, start: event.target.value }))}
            className="rounded-xl border border-border px-4 py-3"
            required
          >
            {timeSlots.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
          <select
            value={props.blockForm.end}
            onChange={(event) => props.setBlockForm((current) => ({ ...current, end: event.target.value }))}
            className="rounded-xl border border-border px-4 py-3"
            required
          >
            {timeSlots.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
          <input
            value={props.blockForm.reason}
            onChange={(event) => props.setBlockForm((current) => ({ ...current, reason: event.target.value }))}
            className="rounded-xl border border-border px-4 py-3"
            placeholder="РџСЂРёС‡РёРЅР°: РґРµР»Р°, РѕС‚РїСѓСЃРє, Р±РѕР»СЊРЅРёС‡РЅС‹Р№"
          />
          <button type="submit" className="rounded-xl bg-accent px-4 py-3 font-semibold text-white">
            Р—Р°Р±Р»РѕРєРёСЂРѕРІР°С‚СЊ
          </button>
        </form>
      </article>

      <section className="grid max-w-4xl gap-3">
        {props.blockedTimes.length === 0 ? (
          <article className="saas-card p-6 text-muted">Р—Р°Р±Р»РѕРєРёСЂРѕРІР°РЅРЅРѕРіРѕ РІСЂРµРјРµРЅРё РїРѕРєР° РЅРµС‚.</article>
        ) : (
          props.blockedTimes.map((item) => (
            <article key={item.id} className="saas-card flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <p className="text-2xl font-semibold">{item.date} В· {item.start}-{item.end}</p>
                <p className="text-muted">{item.reason}</p>
              </div>
              <button type="button" onClick={() => props.deleteBlockedTime(item.id)} className="rounded-xl border border-border px-3 py-2 text-muted hover:bg-section">
                РЈРґР°Р»РёС‚СЊ
              </button>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

function AnalyticsSection({
  appointments,
  activeServices,
  blockedTimes,
  services,
}: {
  appointments: Appointment[];
  activeServices: number;
  blockedTimes: BlockedTime[];
  services: Service[];
}) {
  const completed = appointments.filter((item) => item.status === "Р—Р°РІРµСЂС€РµРЅР°").length;
  const confirmed = appointments.filter((item) => item.status === "РџРѕРґС‚РІРµСЂР¶РґРµРЅР°").length;
  const active = appointments.filter((item) => item.status === "РђРєС‚РёРІРЅР°").length;
  const maxStatus = Math.max(active, confirmed, completed, 1);
  const serviceStats = services
    .map((service) => ({
      title: service.title,
      count: appointments.filter((item) => item.serviceId === service.id).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxService = Math.max(...serviceStats.map((item) => item.count), 1);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">РђРЅР°Р»РёС‚РёРєР°</h1>
        <p className="mt-2 text-lg text-muted">Р”РёРЅР°РјРёРєР° Р·Р°РїРёСЃРµР№, СЃС‚Р°С‚СѓСЃС‹ Рё РїРѕРїСѓР»СЏСЂРЅРѕСЃС‚СЊ СѓСЃР»СѓРі.</p>
      </header>

      <section className="grid gap-4 xl:grid-cols-4">
        <MetricCard label="Р’СЃРµРіРѕ Р·Р°РїРёСЃРµР№" value={appointments.length.toString()} />
        <MetricCard label="РџРѕРґС‚РІРµСЂР¶РґРµРЅРѕ" value={confirmed.toString()} />
        <MetricCard label="РђРєС‚РёРІРЅС‹С… СѓСЃР»СѓРі" value={activeServices.toString()} />
        <MetricCard label="Р‘Р»РѕРєРёСЂРѕРІРѕРє РІСЂРµРјРµРЅРё" value={blockedTimes.length.toString()} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="saas-card p-6">
          <h2 className="text-2xl font-semibold">РЎС‚Р°С‚СѓСЃС‹ Р·Р°РїРёСЃРµР№</h2>
          <div className="mt-6 space-y-4">
            {[
              ["РђРєС‚РёРІРЅР°", active],
              ["РџРѕРґС‚РІРµСЂР¶РґРµРЅР°", confirmed],
              ["Р—Р°РІРµСЂС€РµРЅР°", completed],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="mb-2 flex justify-between text-sm text-muted">
                  <span>{label}</span>
                  <span>{value}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-section">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(Number(value) / maxStatus) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="saas-card p-6">
          <h2 className="text-2xl font-semibold">РџРѕРїСѓР»СЏСЂРЅС‹Рµ СѓСЃР»СѓРіРё</h2>
          <div className="mt-6 space-y-4">
            {serviceStats.length === 0 ? (
              <p className="text-muted">Р”Р°РЅРЅС‹С… РїРѕРєР° РЅРµС‚.</p>
            ) : (
              serviceStats.map((item) => (
                <div key={item.title}>
                  <div className="mb-2 flex justify-between text-sm text-muted">
                    <span>{item.title}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-section">
                    <div className="h-full rounded-full bg-text" style={{ width: `${(item.count / maxService) * 100}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

function FinanceSection({ appointments, services, totalRevenue }: { appointments: Appointment[]; services: Service[]; totalRevenue: number }) {
  const paidAppointments = appointments.filter((item) => services.some((service) => service.id === item.serviceId));
  const averageCheck = paidAppointments.length ? Math.round(totalRevenue / paidAppointments.length) : 0;
  const revenueByService = services
    .map((service) => {
      const count = appointments.filter((item) => item.serviceId === service.id).length;
      return { title: service.title, count, revenue: count * service.price };
    })
    .filter((item) => item.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const maxRevenue = Math.max(...revenueByService.map((item) => item.revenue), 1);
  const projectedRevenue = totalRevenue + averageCheck * Math.max(0, 10 - paidAppointments.length);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Р¤РёРЅР°РЅСЃС‹</h1>
        <p className="mt-2 text-lg text-muted">Р’С‹СЂСѓС‡РєР°, СЃСЂРµРґРЅРёР№ С‡РµРє Рё РІРєР»Р°Рґ СѓСЃР»СѓРі.</p>
      </header>

      <section className="grid gap-4 xl:grid-cols-3">
        <MetricCard label="Р’С‹СЂСѓС‡РєР°" value={`${totalRevenue.toLocaleString("ru-RU")} в‚Ѕ`} />
        <MetricCard label="РЎСЂРµРґРЅРёР№ С‡РµРє" value={`${averageCheck.toLocaleString("ru-RU")} в‚Ѕ`} />
        <MetricCard label="РџСЂРѕРіРЅРѕР·" value={`${projectedRevenue.toLocaleString("ru-RU")} в‚Ѕ`} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <article className="saas-card p-6">
          <h2 className="text-2xl font-semibold">Р’С‹СЂСѓС‡РєР° РїРѕ СѓСЃР»СѓРіР°Рј</h2>
          <div className="mt-6 space-y-4">
            {revenueByService.length === 0 ? (
              <p className="text-muted">РџРѕРєР° РЅРµС‚ РѕРїР»Р°С‡РёРІР°РµРјС‹С… Р·Р°РїРёСЃРµР№.</p>
            ) : (
              revenueByService.map((item) => (
                <div key={item.title}>
                  <div className="mb-2 flex justify-between text-sm text-muted">
                    <span>{item.title}</span>
                    <span>{item.revenue.toLocaleString("ru-RU")} в‚Ѕ</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-section">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(item.revenue / maxRevenue) * 100}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="saas-card p-6">
          <h2 className="text-2xl font-semibold">Р¤РёРЅР°РЅСЃРѕРІР°СЏ РєР°СЂС‚РёРЅР°</h2>
          <div className="mt-6 flex h-56 items-end gap-3 rounded-2xl bg-section p-4">
            {[35, 58, 44, 72, 64, 86, Math.min(100, totalRevenue ? 92 : 24)].map((height, index) => (
              <div key={index} className="flex flex-1 items-end">
                <div className="w-full rounded-t-xl bg-accent" style={{ height: `${height}%`, opacity: 0.35 + index * 0.08 }} />
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">РњРёРЅРё-РіСЂР°С„РёРє РїРѕРєР°Р·С‹РІР°РµС‚ СѓСЃР»РѕРІРЅСѓСЋ РґРёРЅР°РјРёРєСѓ Рё СЃС‚Р°РЅРµС‚ С‚РѕС‡РЅРµРµ РїРѕСЃР»Рµ РїРѕРґРєР»СЋС‡РµРЅРёСЏ СЃРµСЂРІРµСЂРЅРѕР№ Р°РЅР°Р»РёС‚РёРєРё.</p>
        </article>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="saas-card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-4xl font-semibold">{value}</p>
    </article>
  );
}

function SettingsSection(props: {
  email: string;
  bookingUrl: string;
  copyLink: () => void;
  logout: () => void;
  masterProfile: MasterProfile;
  saveMasterProfile: (profile: MasterProfile) => Promise<void>;
  setMasterProfile: React.Dispatch<React.SetStateAction<MasterProfile>>;
}) {
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=12&data=${encodeURIComponent(props.bookingUrl)}`;
  const masterLabel = props.masterProfile.displayName.trim() || props.masterProfile.slug || "РњР°СЃС‚РµСЂ";
  const updateSlug = (value: string) => {
    const slug = normalizeSlug(value);
    if (!slug) {
      props.setMasterProfile((current) => ({ ...current, slug: "" }));
      return;
    }

    props.setMasterProfile((current) => ({ ...current, slug }));
  };
  const fillEmptySlug = () => {
    props.setMasterProfile((current) => {
      const next = {
        ...current,
        slug: current.slug || normalizeEmailSlug(props.email),
      };
      void props.saveMasterProfile(next);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <article className="saas-card max-w-4xl space-y-5 p-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">РќР°СЃС‚СЂРѕР№РєРё РјР°СЃС‚РµСЂР°</h1>
          <p className="mt-2 text-muted">Р›РёС‡РЅС‹Р№ РєР°Р±РёРЅРµС‚: {props.email}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-muted">РРјСЏ РёР»Рё РЅРёРє РјР°СЃС‚РµСЂР°</span>
            <input
              value={props.masterProfile.displayName}
              onChange={(event) => props.setMasterProfile((current) => ({ ...current, displayName: event.target.value }))}
              onBlur={() => void props.saveMasterProfile(props.masterProfile)}
              className="w-full rounded-xl border border-border px-4 py-3"
              placeholder="РќР°РїСЂРёРјРµСЂ, РђРЅРЅР° РЎРјРёСЂРЅРѕРІР°"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-muted">РќРёРє РґР»СЏ СЃСЃС‹Р»РєРё</span>
            <input
              value={props.masterProfile.slug}
              onChange={(event) => updateSlug(event.target.value)}
              onBlur={fillEmptySlug}
              pattern="[a-z0-9-]+"
              className="w-full rounded-xl border border-border px-4 py-3"
              placeholder="anna-smirnova"
            />
            <span className="block text-xs text-muted">РўРѕР»СЊРєРѕ Р»Р°С‚РёРЅСЃРєРёРµ Р±СѓРєРІС‹, С†РёС„СЂС‹ Рё РґРµС„РёСЃ.</span>
          </label>
        </div>

        <button
          type="button"
          onClick={() => props.setMasterProfile((current) => ({ ...current, showOnBookingPage: !current.showOnBookingPage }))}
          className={`rounded-2xl px-5 py-3 font-semibold ${
            props.masterProfile.showOnBookingPage ? "bg-accent text-white" : "border border-border bg-white text-text"
          }`}
        >
          {props.masterProfile.showOnBookingPage ? "РРјСЏ РѕС‚РѕР±СЂР°Р¶Р°РµС‚СЃСЏ РЅР° СЃС‚СЂР°РЅРёС†Рµ Р·Р°РїРёСЃРё" : "РРјСЏ СЃРєСЂС‹С‚Рѕ РЅР° СЃС‚СЂР°РЅРёС†Рµ Р·Р°РїРёСЃРё"}
        </button>

        <button type="button" onClick={props.logout} className="rounded-2xl border border-border bg-white px-5 py-3 font-semibold text-text">
          Р’С‹Р№С‚Рё РёР· РєР°Р±РёРЅРµС‚Р°
        </button>
      </article>

      <article className="saas-card max-w-4xl space-y-3 p-6">
        <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-start">
          <div className="space-y-3">
            <div>
              <h2 className="text-2xl font-semibold">РЎСЃС‹Р»РєР° РґР»СЏ Р·Р°РїРёСЃРё</h2>
              <p className="mt-1 text-muted">QR-РєРѕРґ СЃРѕР·РґР°РµС‚СЃСЏ РѕС‚РґРµР»СЊРЅРѕ РґР»СЏ РєР°Р¶РґРѕРіРѕ РјР°СЃС‚РµСЂР° РїРѕ РµРіРѕ Р»РёС‡РЅРѕР№ СЃСЃС‹Р»РєРµ.</p>
            </div>
            <p className="break-all text-accent">{props.bookingUrl}</p>
            <button type="button" onClick={props.copyLink} className="rounded-xl bg-accent px-4 py-2 font-semibold text-white">
              РЎРєРѕРїРёСЂРѕРІР°С‚СЊ СЃСЃС‹Р»РєСѓ
            </button>
          </div>

          <div className="w-full rounded-2xl border border-border bg-white p-4 md:w-[276px]">
            <div className="mx-auto flex h-[244px] w-[244px] items-center justify-center rounded-xl bg-white">
              <img
                src={qrCodeUrl}
                alt={`QR-РєРѕРґ РґР»СЏ Р·Р°РїРёСЃРё Рє РјР°СЃС‚РµСЂСѓ ${masterLabel}`}
                className="h-[240px] w-[240px]"
              />
            </div>
            <p className="mt-3 text-center text-sm font-medium text-text">{masterLabel}</p>
            <a
              href={qrCodeUrl}
              download={`qr-${props.masterProfile.slug || "master"}.png`}
              className="mt-3 block rounded-xl border border-border px-4 py-2 text-center font-semibold text-text hover:bg-section"
            >
              РЎРєР°С‡Р°С‚СЊ QR-РєРѕРґ
            </a>
          </div>
        </div>
      </article>
    </div>
  );
}

function SimpleSection({ title, text }: { title: string; text: string }) {
  return (
    <article className="saas-card p-6">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted">{text}</p>
    </article>
  );
}

function StatCard({ title, value, extra }: { title: string; value: string; extra: string }) {
  return (
    <article className="saas-card p-5">
      <p className="break-words text-4xl font-semibold tracking-tight md:text-5xl">{value}</p>
      <p className="mt-1 text-xl font-medium">{title}</p>
      <p className="mt-1 text-muted">{extra}</p>
    </article>
  );
}





