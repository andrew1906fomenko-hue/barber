"use client";

import { useEffect, useMemo, useState } from "react";

type Service = { id: string; title: string; duration: string; price: string };

type SavedService = {
  id: string;
  title: string;
  duration: number;
  price: number;
  active: boolean;
};

type SavedAppointment = {
  id: string;
  date: string;
  time: string;
  client: string;
  phone: string;
  serviceId: string;
  status: "Активна";
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

const times = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "short" });

export default function BookingExperience({ title = "Давай подберём тебе удобное время" }: { title?: string }) {
  const availableDays = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      return date;
    });
  }, []);

  const [serviceId, setServiceId] = useState("s1");
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<SavedAppointment[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [masterProfile, setMasterProfile] = useState<MasterProfile | null>(null);
  const [day, setDay] = useState(() => formatDateKey(availableDays[0]));
  const [time, setTime] = useState("16:00");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const savedServices = window.localStorage.getItem("barber-services");
    const savedAppointments = window.localStorage.getItem("barber-appointments");
    const savedBlockedTimes = window.localStorage.getItem("barber-blocked-times");
    const savedMasterProfile = window.localStorage.getItem("barber-master-profile");

    if (savedAppointments) {
      setAppointments(JSON.parse(savedAppointments));
    }

    if (savedBlockedTimes) {
      setBlockedTimes(JSON.parse(savedBlockedTimes));
    }

    if (savedMasterProfile) {
      setMasterProfile(JSON.parse(savedMasterProfile));
    }

    if (!savedServices) {
      setServices([]);
      setServiceId("");
      return;
    }

    const parsedServices = JSON.parse(savedServices) as SavedService[];
    const activeServices = parsedServices
      .filter((service) => service.active)
      .map((service) => ({
        id: service.id,
        title: service.title,
        duration: `${service.duration} мин`,
        price: `${service.price.toLocaleString("ru-RU")} ₽`,
      }));

    setServices(activeServices);
    setServiceId(activeServices[0]?.id || "");
  }, []);

  const selectedService = services.find((item) => item.id === serviceId);
  const selectedDate = availableDays.find((item) => formatDateKey(item) === day) || availableDays[0];
  const bookingDateText = formatDateLabel(selectedDate);
  const cta = useMemo(() => `Записаться на ${bookingDateText} в ${time}`, [bookingDateText, time]);
  const unavailableTimes = useMemo(
    () =>
      new Set([
        ...appointments.filter((item) => item.date === day).map((item) => item.time),
        ...times.filter((slot) => blockedTimes.some((block) => block.date === day && slot >= block.start && slot < block.end)),
      ]),
    [appointments, blockedTimes, day],
  );

  useEffect(() => {
    if (!unavailableTimes.has(time)) return;
    const nextAvailableTime = times.find((slot) => !unavailableTimes.has(slot));
    setTime(nextAvailableTime || "");
  }, [time, unavailableTimes]);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedService) {
      alert("Сейчас нет доступных услуг для записи");
      return;
    }
    if (!time) {
      alert("На выбранную дату нет свободного времени");
      return;
    }
    if (!name.trim() || !phone.trim()) {
      alert("Пожалуйста, укажите имя и телефон");
      return;
    }
    if (unavailableTimes.has(time)) {
      alert("Это время уже недоступно. Выберите другое время");
      return;
    }

    const savedAppointments = window.localStorage.getItem("barber-appointments");
    const currentAppointments = savedAppointments ? (JSON.parse(savedAppointments) as SavedAppointment[]) : [];
    const appointment: SavedAppointment = {
      id: crypto.randomUUID(),
      date: day,
      time,
      client: name.trim(),
      phone: phone.trim(),
      serviceId: selectedService.id,
      status: "Активна",
    };

    const nextAppointments = [...currentAppointments, appointment];
    window.localStorage.setItem("barber-appointments", JSON.stringify(nextAppointments));
    setAppointments(nextAppointments);
    window.dispatchEvent(new Event("barber-appointments-updated"));
    setSubmitted(true);
  };

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 md:px-6">
      <section className="saas-card space-y-5 p-5 md:p-8">
        <header className="space-y-2 text-center">
          {masterProfile?.showOnBookingPage && masterProfile.displayName.trim() && (
            <p className="text-lg font-semibold text-accent">{masterProfile.displayName}</p>
          )}
          <h1 className="text-3xl font-semibold md:text-5xl">{title}</h1>
          <p className="text-lg text-muted">Выберите услугу, дату и время визита</p>
        </header>

        {submitted && selectedService && (
          <div className="rounded-2xl border border-accent bg-accentSoft p-4">
            <p className="text-xl font-semibold text-accent">Вы записаны на {bookingDateText} в {time}</p>
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
                <div className="rounded-2xl border border-border bg-section p-4 text-center text-muted">
                  У мастера пока нет активных услуг для онлайн-записи.
                </div>
              ) : (
                services.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => setServiceId(service.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${serviceId === service.id ? "border-accent bg-accentSoft" : "border-border bg-white hover:bg-section"}`}
                  >
                    <p className="text-xl font-semibold">{service.title}</p>
                    <p className="mt-1 text-muted">{service.duration} • {service.price}</p>
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
                    onClick={() => setDay(key)}
                    className={`rounded-2xl border px-3 py-3 text-sm transition ${day === key ? "border-accent bg-accentSoft text-accent" : "border-border hover:bg-section"}`}
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
                  onClick={() => setTime(slot)}
                  className={`rounded-2xl border px-4 py-3 text-lg transition disabled:cursor-not-allowed disabled:bg-section disabled:text-muted disabled:opacity-50 ${
                    time === slot ? "border-accent bg-accentSoft text-accent" : "border-border hover:bg-section"
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
                className="w-full rounded-2xl border border-border px-4 py-3 text-lg"
                placeholder="Как к вам обращаться?"
              />
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-2xl border border-border px-4 py-3 text-lg"
                placeholder="Номер телефона"
              />
            </div>
          </Step>

          <p className="text-center text-sm text-muted">Данные используются только для подтверждения записи</p>
          <button
            type="submit"
            disabled={services.length === 0 || !time}
            className="w-full rounded-2xl bg-accent px-6 py-4 text-xl font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">{number}</span>
        {title}
      </h2>
      <p className="mt-1 text-muted">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}
