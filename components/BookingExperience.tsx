"use client";

import { useEffect, useMemo, useState } from "react";

type Service = { id: string; title: string; duration: string; durationMinutes: number; price: string };

type ApiService = {
  id: string;
  title: string;
  duration?: number;
  durationMinutes?: number;
  price: number;
};

type SavedAppointment = {
  id: string;
  date: string;
  time: string;
  start?: string;
  end?: string;
  serviceId: string;
};

type BlockedTime = {
  id: string;
  date: string;
  start: string;
  end: string;
  reason: string;
};

type MasterProfile = {
  name: string;
  slug: string;
  showPrice?: boolean;
};

const fallbackServices: Service[] = [
  { id: "s1", title: "Стрижка", duration: "45 мин", durationMinutes: 45, price: "1 500 руб." },
  { id: "s2", title: "Коррекция бороды", duration: "30 мин", durationMinutes: 30, price: "900 руб." },
  { id: "s3", title: "Стрижка и борода", duration: "75 мин", durationMinutes: 75, price: "2 200 руб." },
];

const times = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "short" });

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const intervalsOverlap = (startA: number, endA: number, startB: number, endB: number) =>
  startA < endB && startB < endA;

const mapService = (service: ApiService, showPrice = true): Service => {
  const duration = service.durationMinutes ?? service.duration ?? 60;
  return {
    id: service.id,
    title: service.title,
    duration: `${duration} мин`,
    durationMinutes: duration,
    price: showPrice ? `${Number(service.price || 0).toLocaleString("ru-RU")} руб.` : "Цена по запросу",
  };
};

export default function BookingExperience({
  masterSlug,
  title = "Давай подберём тебе удобное время",
}: {
  masterSlug?: string;
  title?: string;
}) {
  const availableDays = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      return date;
    });
  }, []);

  const [serviceId, setServiceId] = useState(fallbackServices[0].id);
  const [services, setServices] = useState<Service[]>(masterSlug ? [] : fallbackServices);
  const [appointments, setAppointments] = useState<SavedAppointment[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [masterProfile, setMasterProfile] = useState<MasterProfile | null>(null);
  const [day, setDay] = useState(() => formatDateKey(availableDays[0]));
  const [time, setTime] = useState("16:00");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const loadMaster = async () => {
      if (!masterSlug) return;

      try {
        const response = await fetch(`/api/masters/${encodeURIComponent(masterSlug)}`);
        const data = (await response.json()) as {
          success: boolean;
          master?: MasterProfile;
          services?: ApiService[];
          appointments?: SavedAppointment[];
          blockedTimes?: BlockedTime[];
        };

        if (!response.ok || !data.success || !data.master) {
          setServices([]);
          setServiceId("");
          setAppointments([]);
          setBlockedTimes([]);
          setMasterProfile(null);
          return;
        }

        const nextServices = (data.services || []).map((service) => mapService(service, data.master?.showPrice !== false));
        setServices(nextServices);
        setServiceId(nextServices[0]?.id || "");
        setAppointments(data.appointments || []);
        setBlockedTimes(data.blockedTimes || []);
        setMasterProfile(data.master);
      } catch {
        setServices([]);
        setServiceId("");
        setAppointments([]);
        setBlockedTimes([]);
        setMasterProfile(null);
      }
    };

    void loadMaster();
  }, [masterSlug]);

  const selectedService = services.find((item) => item.id === serviceId);
  const selectedDate = availableDays.find((item) => formatDateKey(item) === day) || availableDays[0];
  const bookingDateText = formatDateLabel(selectedDate);
  const cta = useMemo(() => `Записаться на ${bookingDateText} в ${time}`, [bookingDateText, time]);
  const unavailableTimes = useMemo(
    () =>
      new Set(
        times.filter((slot) => {
          const slotStart = timeToMinutes(slot);
          const slotEnd = slotStart + (selectedService?.durationMinutes || 60);
          const overlapsAppointment = appointments.some((item) => {
            if (item.date !== day) return false;
            const service = services.find((entry) => entry.id === item.serviceId);
            const itemStart = timeToMinutes(item.start || item.time);
            const itemEnd = item.end ? timeToMinutes(item.end) : itemStart + (service?.durationMinutes || 60);
            return intervalsOverlap(slotStart, slotEnd, itemStart, itemEnd);
          });
          const overlapsBlock = blockedTimes.some(
            (block) => block.date === day && intervalsOverlap(slotStart, slotEnd, timeToMinutes(block.start), timeToMinutes(block.end)),
          );
          return overlapsAppointment || overlapsBlock;
        }),
      ),
    [appointments, blockedTimes, day, selectedService, services],
  );

  useEffect(() => {
    if (!unavailableTimes.has(time)) return;
    const nextAvailableTime = times.find((slot) => !unavailableTimes.has(slot));
    setTime(nextAvailableTime || "");
  }, [time, unavailableTimes]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedService || !time || !name.trim() || !phone.trim() || unavailableTimes.has(time)) return;

    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        masterSlug,
        date: day,
        time,
        client: name.trim(),
        phone: phone.trim(),
        serviceId: selectedService.id,
      }),
    });
    const data = (await response.json()) as { success: boolean; appointment?: SavedAppointment };
    if (!response.ok || !data.success || !data.appointment) return;

    setAppointments((current) => [...current, data.appointment!]);
    setSubmitted(true);
  };

  return (
    <main className="mx-auto min-h-screen max-w-4xl bg-softBg px-4 py-8 text-text md:px-6">
      <section className="saas-card space-y-5 p-5 md:p-8">
        <header className="space-y-2 text-center">
          {masterProfile?.name.trim() && <p className="text-lg font-semibold text-primaryActive">{masterProfile.name}</p>}
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
          <p className="text-lg text-muted">Выберите услугу, дату и время визита</p>
        </header>

        {submitted && selectedService && (
          <div className="rounded-2xl border border-primary/30 bg-softSurface p-4">
            <p className="text-xl font-semibold text-primaryActive">Вы записаны на {bookingDateText} в {time}</p>
            <ul className="mt-2 space-y-1 text-sm text-text">
              <li><strong>Услуга:</strong> {selectedService.title}</li>
              <li><strong>Дата:</strong> {bookingDateText}</li>
              <li><strong>Время:</strong> {time}</li>
              <li><strong>Имя:</strong> {name}</li>
              <li><strong>Телефон:</strong> {phone}</li>
            </ul>
          </div>
        )}

        <form className="space-y-5" onSubmit={onSubmit}>
          <Step title="Что будем делать?" subtitle="Выбор услуги" number={1}>
            <div className="space-y-3">
              {services.length === 0 ? (
                <div className="rounded-2xl border border-border bg-softSurface p-4 text-center text-muted">
                  У мастера пока нет активных услуг для онлайн-записи.
                </div>
              ) : (
                services.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => {
                      setServiceId(service.id);
                      setSubmitted(false);
                    }}
                    className={`w-full rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 ${
                      serviceId === service.id
                        ? "border-primary bg-softSurface text-text"
                        : "border-border bg-white hover:border-primary hover:bg-softBg active:border-primaryActive"
                    }`}
                  >
                    <p className="text-xl font-semibold">{service.title}</p>
                    <p className="mt-1 text-muted">{service.duration} · {service.price}</p>
                  </button>
                ))
              )}
            </div>
          </Step>

          <Step title="Когда удобно?" subtitle="Выберите дату" number={2}>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-7">
              {availableDays.map((item) => {
                const key = formatDateKey(item);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setDay(key);
                      setSubmitted(false);
                    }}
                    className={`rounded-2xl border px-3 py-3 text-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 ${
                      day === key
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-white hover:border-primary hover:bg-softSurface active:border-primaryActive"
                    }`}
                  >
                    {formatDateLabel(item)}
                  </button>
                );
              })}
            </div>
          </Step>

          <Step title="Во сколько ждать?" subtitle="Выберите время" number={3}>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {times.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  disabled={unavailableTimes.has(slot)}
                  onClick={() => {
                    setTime(slot);
                    setSubmitted(false);
                  }}
                  className={`rounded-2xl border px-4 py-3 text-lg transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:border-border disabled:bg-disabledBg disabled:text-disabledText ${
                    time === slot
                      ? "border-primary bg-primary text-white hover:bg-primaryHover active:bg-primaryActive"
                      : "border-border bg-white hover:border-primary hover:bg-softSurface active:border-primaryActive"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </Step>

          <Step title="Куда прислать подтверждение?" subtitle="Оставьте имя и телефон" number={4}>
            <div className="space-y-3">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-2xl border border-border px-4 py-3 text-lg focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                placeholder="Как к вам обращаться?"
              />
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-2xl border border-border px-4 py-3 text-lg focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                placeholder="Номер телефона"
              />
            </div>
          </Step>

          <p className="text-center text-sm text-muted">Данные используются только для подтверждения записи</p>
          <button
            type="submit"
            disabled={services.length === 0 || !time || !name.trim() || !phone.trim()}
            className="w-full rounded-2xl border border-primary bg-primary px-6 py-4 text-xl font-semibold text-white transition hover:border-primaryHover hover:bg-primaryHover active:border-primaryActive active:bg-primaryActive focus-visible:outline-none focus-visible:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:border-disabledBg disabled:bg-disabledBg disabled:text-disabledText"
          >
            {services.length === 0 ? "Нет доступных услуг" : time ? cta : "Нет свободного времени"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Step({ title, subtitle, number, children }: { title: string; subtitle: string; number: number; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-4 md:p-5">
      <h2 className="flex items-center gap-3 text-2xl font-semibold">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{number}</span>
        {title}
      </h2>
      <p className="mt-1 text-muted">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}
