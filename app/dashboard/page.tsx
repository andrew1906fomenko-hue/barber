"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Section = "Главная" | "Услуги" | "График работы" | "Аналитика" | "Финансы" | "Настройки";
type AppointmentStatus = "Активна" | "Подтверждена" | "Завершена";

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
  email: string;
  name: string;
  slug: string;
};

const nav: Section[] = ["Главная", "Услуги", "График работы", "Аналитика", "Финансы", "Настройки"];
const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const timeSlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];
const ruMonths = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

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

const getMasterStorageKey = (email: string, key: string) => `barber-master:${email}:${key}`;

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
  const [section, setSection] = useState<Section>("Главная");
  const [toast, setToast] = useState("");
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [monthDate, setMonthDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => formatDateKey(today));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"Все" | AppointmentStatus>("Все");
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

  const loadStoredData = (session = authSession) => {
    const email = session?.email;
    if (!email) return;
    const savedServices = window.localStorage.getItem(getMasterStorageKey(email, "services"));
    const savedAppointments = window.localStorage.getItem(getMasterStorageKey(email, "appointments"));
    const savedBlockedTimes = window.localStorage.getItem(getMasterStorageKey(email, "blocked-times"));

    if (savedServices) {
      setServices(JSON.parse(savedServices));
    } else {
      setServices([]);
    }

    if (savedAppointments) {
      setAppointments(JSON.parse(savedAppointments));
    } else {
      setAppointments([]);
    }

    if (savedBlockedTimes) {
      setBlockedTimes(JSON.parse(savedBlockedTimes));
    } else {
      setBlockedTimes([]);
    }

    setMasterProfile({
      ...defaultMasterProfile,
      displayName: session.name,
      slug: resolveLatinSlug(session.slug, normalizeEmailSlug(email)),
    });
  };

  useEffect(() => {
    let currentSession: AuthSession | null = null;

    const loadSession = async () => {
      try {
        const response = await fetch("/api/me");
        const data = (await response.json()) as {
          success: boolean;
          user?: AuthSession;
        };

        if (!response.ok || !data.success || !data.user) {
          router.replace("/register");
          return;
        }

        currentSession = data.user;
        setAuthSession(data.user);
        loadStoredData(data.user);
        setStorageReady(true);
      } catch {
        router.replace("/register");
      }
    };

    const refreshData = () => {
      if (currentSession) {
        loadStoredData(currentSession);
      }
    };

    void loadSession();

    window.addEventListener("storage", refreshData);
    window.addEventListener("focus", refreshData);
    window.addEventListener("barber-appointments-updated", refreshData);

    return () => {
      window.removeEventListener("storage", refreshData);
      window.removeEventListener("focus", refreshData);
      window.removeEventListener("barber-appointments-updated", refreshData);
    };
  }, [router]);

  useEffect(() => {
    if (!storageReady || !authSession) return;
    window.localStorage.setItem(getMasterStorageKey(authSession.email, "services"), JSON.stringify(services));
  }, [authSession, services, storageReady]);

  useEffect(() => {
    if (!storageReady || !authSession) return;
    window.localStorage.setItem(getMasterStorageKey(authSession.email, "appointments"), JSON.stringify(appointments));
  }, [appointments, authSession, storageReady]);

  useEffect(() => {
    if (!storageReady || !authSession) return;
    window.localStorage.setItem(getMasterStorageKey(authSession.email, "blocked-times"), JSON.stringify(blockedTimes));
  }, [authSession, blockedTimes, storageReady]);

  const selectedDateObject = useMemo(() => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [selectedDate]);

  const monthDays = useMemo(() => getMonthDays(monthDate), [monthDate]);
  const selectedWeekDays = useMemo(() => getSelectedWeekDays(selectedDateObject), [selectedDateObject]);
  const selectedAppointments = appointments
    .filter((item) => item.date === selectedDate)
    .filter((item) => statusFilter === "Все" || item.status === statusFilter)
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
      showToast("Ссылка скопирована");
    } catch {
      showToast("Не удалось скопировать ссылку");
    }
  };

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
  };

  const selectToday = () => {
    setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(formatDateKey(today));
  };

  const changeMonth = (direction: -1 | 1) => {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  };

  const addService = (event: React.FormEvent) => {
    event.preventDefault();
    if (!serviceForm.title.trim() || !serviceForm.price.trim()) {
      showToast("Заполните название и цену услуги");
      return;
    }

    setServices((current) => [
      {
        id: crypto.randomUUID(),
        title: serviceForm.title.trim(),
        category: serviceForm.category.trim() || "Основные услуги",
        duration: Number(serviceForm.duration) || 60,
        price: Number(serviceForm.price) || 0,
        description: serviceForm.description.trim(),
        preparation: serviceForm.preparation.trim(),
        active: true,
      },
      ...current,
    ]);
    setServiceForm(emptyService);
    setServiceFormOpen(false);
    showToast("Услуга добавлена");
  };

  const addAppointment = (event: React.FormEvent) => {
    event.preventDefault();
    if (!appointmentForm.client.trim() || !appointmentForm.phone.trim()) {
      showToast("Заполните имя и телефон клиента");
      return;
    }

    const serviceId = appointmentForm.serviceId || services[0]?.id;
    if (!serviceId) {
      showToast("Сначала добавьте услугу");
      setSection("Услуги");
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
      showToast("Это время заблокировано мастером");
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
      showToast("Это время пересекается с другой записью");
      return;
    }

    setAppointments((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        date: selectedDate,
        time: appointmentForm.time,
        client: appointmentForm.client.trim(),
        phone: appointmentForm.phone.trim(),
        serviceId,
        status: "Активна",
      },
    ]);
    setAppointmentForm(emptyAppointment);
    setShowAppointmentForm(false);
    showToast("Запись добавлена");
  };

  const updateAppointmentStatus = (id: string) => {
    const order: AppointmentStatus[] = ["Активна", "Подтверждена", "Завершена"];
    setAppointments((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const next = order[(order.indexOf(item.status) + 1) % order.length];
        return { ...item, status: next };
      }),
    );
  };

  const deleteAppointment = (id: string) => {
    setAppointments((current) => current.filter((item) => item.id !== id));
    showToast("Запись удалена");
  };

  const toggleService = (id: string) => {
    setServices((current) => current.map((item) => (item.id === id ? { ...item, active: !item.active } : item)));
  };

  const deleteService = (id: string) => {
    setServices((current) => current.filter((item) => item.id !== id));
    setAppointments((current) => current.filter((item) => item.serviceId !== id));
    showToast("Услуга удалена");
  };

  const addBlockedTime = (event: React.FormEvent) => {
    event.preventDefault();
    if (blockForm.start >= blockForm.end) {
      showToast("Время окончания должно быть позже начала");
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
      showToast("Блокировка пересекается с существующей записью");
      return;
    }

    const blockOverlapsBlock = blockedTimes.some(
      (item) => item.date === blockForm.date && intervalsOverlap(blockStart, blockEnd, timeToMinutes(item.start), timeToMinutes(item.end)),
    );
    if (blockOverlapsBlock) {
      showToast("Такая блокировка пересекается с другой");
      return;
    }

    setBlockedTimes((current) => [
      {
        id: crypto.randomUUID(),
        date: blockForm.date,
        start: blockForm.start,
        end: blockForm.end,
        reason: blockForm.reason.trim() || "Недоступно",
      },
      ...current,
    ]);
    setBlockForm((current) => ({ ...emptyBlock, date: current.date }));
    showToast("Время заблокировано");
  };

  const deleteBlockedTime = (id: string) => {
    setBlockedTimes((current) => current.filter((item) => item.id !== id));
    showToast("Блокировка удалена");
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
            Выйти
          </button>
        </aside>

        <section className="space-y-5">
          {section === "Главная" && (
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

          {section === "Услуги" && (
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

          {section === "График работы" && (
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

          {section === "Аналитика" && (
            <AnalyticsSection appointments={appointments} activeServices={activeServices.length} blockedTimes={blockedTimes} services={services} />
          )}

          {section === "Финансы" && (
            <FinanceSection appointments={appointments} services={services} totalRevenue={totalRevenue} />
          )}

          {section === "Настройки" && (
            <SettingsSection
              email={authSession?.email || ""}
              bookingUrl={bookingUrl}
              copyLink={copyLink}
              logout={logout}
              masterProfile={masterProfile}
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
            Выйти
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
  statusFilter: "Все" | AppointmentStatus;
  timeSlots: string[];
  selectedDateRevenue: number;
  addAppointment: (event: React.FormEvent) => void;
  changeMonth: (direction: -1 | 1) => void;
  selectToday: () => void;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
  setStatusFilter: React.Dispatch<React.SetStateAction<"Все" | AppointmentStatus>>;
  updateAppointmentStatus: (id: string) => void;
}) {
  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Привет{props.masterName.trim() ? `, ${props.masterName}` : ""}!</h1>
          <p className="mt-2 text-lg text-muted">Вот что происходит в вашем салоне сегодня.</p>
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
            {props.calendarExpanded ? "Свернуть календарь ▴" : "Развернуть календарь ▾"}
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
              Назад
            </button>
            <button type="button" onClick={props.selectToday} className="rounded-xl border border-border bg-white px-4 py-2 hover:bg-section">
              Сегодня
            </button>
            <button type="button" onClick={() => props.changeMonth(1)} className="rounded-xl border border-border bg-white px-4 py-2 hover:bg-section">
              Вперёд
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
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Записи на {props.formatSelectedDate}</h2>
            <p className="mt-1 text-sm text-muted">Записей: {props.appointments.length}</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => props.setShowFilters((value) => !value)}
              className="rounded-2xl border border-border bg-white px-4 py-2 text-muted hover:bg-section"
            >
              Фильтры
            </button>
            <button type="button" onClick={() => props.setShowAppointmentForm(true)} className="rounded-2xl bg-accent px-4 py-2 text-white hover:opacity-90">
              Добавить запись
            </button>
          </div>
        </div>

        {props.showFilters && (
          <div className="saas-card flex flex-wrap gap-2 p-4">
            {(["Все", "Активна", "Подтверждена", "Завершена"] as const).map((status) => (
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
              placeholder="Имя клиента"
            />
            <input
              value={props.appointmentForm.phone}
              onChange={(event) => props.setAppointmentForm((current) => ({ ...current, phone: event.target.value }))}
              className="rounded-xl border border-border px-3 py-3"
              placeholder="Телефон"
            />
            <select
              value={props.appointmentForm.serviceId}
              onChange={(event) => props.setAppointmentForm((current) => ({ ...current, serviceId: event.target.value }))}
              className="rounded-xl border border-border px-3 py-3"
            >
              <option value="">Выберите услугу</option>
              {props.services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.title}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 rounded-xl bg-accent px-3 py-3 font-semibold text-white">
                Сохранить
              </button>
              <button type="button" onClick={() => props.setShowAppointmentForm(false)} className="rounded-xl border border-border px-3 py-3">
                Отмена
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {props.blockedTimes.map((item) => (
            <article key={item.id} className="saas-card grid gap-3 border-accentSoft bg-accentSoft p-4 md:grid-cols-[120px_1fr] md:items-center">
              <div>
                <p className="text-2xl font-semibold text-accent">{item.start}-{item.end}</p>
                <p className="text-muted">закрыто</p>
              </div>
              <div>
                <p className="text-2xl font-medium">Время недоступно для записи</p>
                <p className="text-muted">{item.reason}</p>
              </div>
            </article>
          ))}

          {props.appointments.length === 0 ? (
            <article className="saas-card p-8 text-center">
              <p className="text-2xl font-semibold">На выбранную дату записей нет</p>
              <p className="mt-2 text-muted">Нажмите «Добавить запись», чтобы создать первую реальную запись.</p>
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
                    <p className="text-xl font-medium">{service?.title || "Услуга удалена"}</p>
                    <p className="text-muted">{service ? `${service.duration} мин • ${service.price.toLocaleString("ru-RU")} ₽` : "нет деталей"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => props.updateAppointmentStatus(item.id)} className="rounded-xl border border-border px-3 py-2 hover:bg-section">
                      Статус
                    </button>
                    <button type="button" onClick={() => props.deleteAppointment(item.id)} className="rounded-xl border border-border px-3 py-2 text-muted hover:bg-section">
                      Удалить
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
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Услуги</h1>
          <p className="mt-2 text-lg text-muted">Добавляйте услуги со стоимостью, длительностью и описанием для клиентов.</p>
        </div>
        <button
          type="button"
          onClick={() => props.setServiceFormOpen((value) => !value)}
          className="rounded-2xl bg-accent px-5 py-3 font-semibold text-white hover:opacity-90"
        >
          {props.serviceFormOpen ? "Свернуть" : "Добавить услугу"}
        </button>
      </header>

      <section className={`grid transition-all duration-300 ${props.serviceFormOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <form onSubmit={props.addService} className="saas-card grid gap-4 p-5 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-muted">Название</span>
              <input
                value={props.serviceForm.title}
                onChange={(event) => props.setServiceForm((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-xl border border-border px-4 py-3"
                placeholder="Например, мужская стрижка"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-muted">Категория</span>
              <input
                value={props.serviceForm.category}
                onChange={(event) => props.setServiceForm((current) => ({ ...current, category: event.target.value }))}
                className="w-full rounded-xl border border-border px-4 py-3"
                placeholder="Стрижки, окрашивание, уход"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-muted">Длительность, минут</span>
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
              <span className="text-sm font-medium text-muted">Цена, ₽</span>
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
              <span className="text-sm font-medium text-muted">Описание</span>
              <textarea
                value={props.serviceForm.description}
                onChange={(event) => props.setServiceForm((current) => ({ ...current, description: event.target.value }))}
                className="min-h-24 w-full rounded-xl border border-border px-4 py-3"
                placeholder="Что входит в услугу, кому подходит, какой результат получит клиент"
              />
            </label>
            <label className="space-y-2 lg:col-span-2">
              <span className="text-sm font-medium text-muted">Подготовка клиента</span>
              <textarea
                value={props.serviceForm.preparation}
                onChange={(event) => props.setServiceForm((current) => ({ ...current, preparation: event.target.value }))}
                className="min-h-20 w-full rounded-xl border border-border px-4 py-3"
                placeholder="Что нужно знать клиенту до визита"
              />
            </label>
            <div className="flex flex-wrap gap-3 lg:col-span-2">
              <button type="submit" className="rounded-2xl bg-accent px-5 py-3 font-semibold text-white hover:opacity-90">
                Сохранить услугу
              </button>
              <button
                type="button"
                onClick={() => props.setServiceFormOpen(false)}
                className="rounded-2xl border border-border bg-white px-5 py-3 font-semibold text-muted hover:bg-section"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {props.services.length === 0 ? (
          <article className="saas-card p-8 text-center lg:col-span-2">
            <p className="text-2xl font-semibold">Услуг пока нет</p>
            <p className="mt-2 text-muted">Заполните форму ниже, чтобы добавить первую услугу.</p>
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
                  {service.active ? "Активна" : "Скрыта"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-section p-3">
                  <p className="text-sm text-muted">Длительность</p>
                  <p className="text-xl font-semibold">{service.duration} мин</p>
                </div>
                <div className="rounded-xl bg-section p-3">
                  <p className="text-sm text-muted">Цена</p>
                  <p className="text-xl font-semibold">{service.price.toLocaleString("ru-RU")} ₽</p>
                </div>
              </div>
              {service.description && <p className="text-muted">{service.description}</p>}
              {service.preparation && <p className="rounded-xl border border-border p-3 text-sm text-muted">{service.preparation}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => props.toggleService(service.id)} className="rounded-xl border border-border px-3 py-2 hover:bg-section">
                  {service.active ? "Скрыть" : "Показать"}
                </button>
                <button type="button" onClick={() => props.deleteService(service.id)} className="rounded-xl border border-border px-3 py-2 text-muted hover:bg-section">
                  Удалить
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
        <h1 className="text-3xl font-semibold">График работы</h1>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-muted">Начало дня</span>
            <select value={props.workStart} onChange={(event) => props.setWorkStart(event.target.value)} className="w-full rounded-xl border border-border px-4 py-3">
              {timeSlots.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-muted">Конец дня</span>
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
          {props.bookingEnabled ? "Онлайн-запись включена" : "Онлайн-запись выключена"}
        </button>
      </article>

      <article className="saas-card max-w-4xl space-y-5 p-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Заблокировать время</h2>
          <p className="mt-1 text-muted">Закройте день или несколько часов, если мастер не принимает клиентов.</p>
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
            placeholder="Причина: дела, отпуск, больничный"
          />
          <button type="submit" className="rounded-xl bg-accent px-4 py-3 font-semibold text-white">
            Заблокировать
          </button>
        </form>
      </article>

      <section className="grid max-w-4xl gap-3">
        {props.blockedTimes.length === 0 ? (
          <article className="saas-card p-6 text-muted">Заблокированного времени пока нет.</article>
        ) : (
          props.blockedTimes.map((item) => (
            <article key={item.id} className="saas-card flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <p className="text-2xl font-semibold">{item.date} · {item.start}-{item.end}</p>
                <p className="text-muted">{item.reason}</p>
              </div>
              <button type="button" onClick={() => props.deleteBlockedTime(item.id)} className="rounded-xl border border-border px-3 py-2 text-muted hover:bg-section">
                Удалить
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
  const completed = appointments.filter((item) => item.status === "Завершена").length;
  const confirmed = appointments.filter((item) => item.status === "Подтверждена").length;
  const active = appointments.filter((item) => item.status === "Активна").length;
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
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Аналитика</h1>
        <p className="mt-2 text-lg text-muted">Динамика записей, статусы и популярность услуг.</p>
      </header>

      <section className="grid gap-4 xl:grid-cols-4">
        <MetricCard label="Всего записей" value={appointments.length.toString()} />
        <MetricCard label="Подтверждено" value={confirmed.toString()} />
        <MetricCard label="Активных услуг" value={activeServices.toString()} />
        <MetricCard label="Блокировок времени" value={blockedTimes.length.toString()} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="saas-card p-6">
          <h2 className="text-2xl font-semibold">Статусы записей</h2>
          <div className="mt-6 space-y-4">
            {[
              ["Активна", active],
              ["Подтверждена", confirmed],
              ["Завершена", completed],
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
          <h2 className="text-2xl font-semibold">Популярные услуги</h2>
          <div className="mt-6 space-y-4">
            {serviceStats.length === 0 ? (
              <p className="text-muted">Данных пока нет.</p>
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
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Финансы</h1>
        <p className="mt-2 text-lg text-muted">Выручка, средний чек и вклад услуг.</p>
      </header>

      <section className="grid gap-4 xl:grid-cols-3">
        <MetricCard label="Выручка" value={`${totalRevenue.toLocaleString("ru-RU")} ₽`} />
        <MetricCard label="Средний чек" value={`${averageCheck.toLocaleString("ru-RU")} ₽`} />
        <MetricCard label="Прогноз" value={`${projectedRevenue.toLocaleString("ru-RU")} ₽`} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <article className="saas-card p-6">
          <h2 className="text-2xl font-semibold">Выручка по услугам</h2>
          <div className="mt-6 space-y-4">
            {revenueByService.length === 0 ? (
              <p className="text-muted">Пока нет оплачиваемых записей.</p>
            ) : (
              revenueByService.map((item) => (
                <div key={item.title}>
                  <div className="mb-2 flex justify-between text-sm text-muted">
                    <span>{item.title}</span>
                    <span>{item.revenue.toLocaleString("ru-RU")} ₽</span>
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
          <h2 className="text-2xl font-semibold">Финансовая картина</h2>
          <div className="mt-6 flex h-56 items-end gap-3 rounded-2xl bg-section p-4">
            {[35, 58, 44, 72, 64, 86, Math.min(100, totalRevenue ? 92 : 24)].map((height, index) => (
              <div key={index} className="flex flex-1 items-end">
                <div className="w-full rounded-t-xl bg-accent" style={{ height: `${height}%`, opacity: 0.35 + index * 0.08 }} />
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">Мини-график показывает условную динамику и станет точнее после подключения серверной аналитики.</p>
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
  setMasterProfile: React.Dispatch<React.SetStateAction<MasterProfile>>;
}) {
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=12&data=${encodeURIComponent(props.bookingUrl)}`;
  const masterLabel = props.masterProfile.displayName.trim() || props.masterProfile.slug || "Мастер";
  const updateSlug = (value: string) => {
    const slug = normalizeSlug(value);
    if (!slug) {
      props.setMasterProfile((current) => ({ ...current, slug: "" }));
      return;
    }

    props.setMasterProfile((current) => ({ ...current, slug }));
  };
  const fillEmptySlug = () => {
    props.setMasterProfile((current) => ({
      ...current,
      slug: current.slug || normalizeEmailSlug(props.email),
    }));
  };

  return (
    <div className="space-y-5">
      <article className="saas-card max-w-4xl space-y-5 p-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Настройки мастера</h1>
          <p className="mt-2 text-muted">Личный кабинет: {props.email}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-muted">Имя или ник мастера</span>
            <input
              value={props.masterProfile.displayName}
              onChange={(event) => props.setMasterProfile((current) => ({ ...current, displayName: event.target.value }))}
              className="w-full rounded-xl border border-border px-4 py-3"
              placeholder="Например, Анна Смирнова"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-muted">Ник для ссылки</span>
            <input
              value={props.masterProfile.slug}
              onChange={(event) => updateSlug(event.target.value)}
              onBlur={fillEmptySlug}
              pattern="[a-z0-9-]+"
              className="w-full rounded-xl border border-border px-4 py-3"
              placeholder="anna-smirnova"
            />
            <span className="block text-xs text-muted">Только латинские буквы, цифры и дефис.</span>
          </label>
        </div>

        <button
          type="button"
          onClick={() => props.setMasterProfile((current) => ({ ...current, showOnBookingPage: !current.showOnBookingPage }))}
          className={`rounded-2xl px-5 py-3 font-semibold ${
            props.masterProfile.showOnBookingPage ? "bg-accent text-white" : "border border-border bg-white text-text"
          }`}
        >
          {props.masterProfile.showOnBookingPage ? "Имя отображается на странице записи" : "Имя скрыто на странице записи"}
        </button>

        <button type="button" onClick={props.logout} className="rounded-2xl border border-border bg-white px-5 py-3 font-semibold text-text">
          Выйти из кабинета
        </button>
      </article>

      <article className="saas-card max-w-4xl space-y-3 p-6">
        <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-start">
          <div className="space-y-3">
            <div>
              <h2 className="text-2xl font-semibold">Ссылка для записи</h2>
              <p className="mt-1 text-muted">QR-код создается отдельно для каждого мастера по его личной ссылке.</p>
            </div>
            <p className="break-all text-accent">{props.bookingUrl}</p>
            <button type="button" onClick={props.copyLink} className="rounded-xl bg-accent px-4 py-2 font-semibold text-white">
              Скопировать ссылку
            </button>
          </div>

          <div className="w-full rounded-2xl border border-border bg-white p-4 md:w-[276px]">
            <div className="mx-auto flex h-[244px] w-[244px] items-center justify-center rounded-xl bg-white">
              <img
                src={qrCodeUrl}
                alt={`QR-код для записи к мастеру ${masterLabel}`}
                className="h-[240px] w-[240px]"
              />
            </div>
            <p className="mt-3 text-center text-sm font-medium text-text">{masterLabel}</p>
            <a
              href={qrCodeUrl}
              download={`qr-${props.masterProfile.slug || "master"}.png`}
              className="mt-3 block rounded-xl border border-border px-4 py-2 text-center font-semibold text-text hover:bg-section"
            >
              Скачать QR-код
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
