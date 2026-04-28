"use client";

import { useMemo, useState } from "react";

const services = [
  { id: "s1", title: "Маникюр", duration: "1 ч 30 мин", price: "1 500 ₽" },
  { id: "s2", title: "Покрытие гель-лак", duration: "1 ч 30 мин", price: "1 800 ₽" },
  { id: "s3", title: "Укрепление ногтей", duration: "1 ч", price: "1 200 ₽" },
];

const times = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];
const days = ["Сегодня", "Завтра", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function BookingPage() {
  const [serviceId, setServiceId] = useState("s1");
  const [day, setDay] = useState("Завтра");
  const [time, setTime] = useState("16:00");

  const cta = useMemo(() => `Записаться на 13 мая в ${time}`, [time]);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 md:px-6">
      <section className="saas-card space-y-5 p-5 md:p-8">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold md:text-5xl">Давай подберём тебе удобное время</h1>
          <p className="text-lg text-muted">Это займёт меньше минуты</p>
        </header>

        <Step title="Что будем делать?" subtitle="Выбор услуги" number={1}>
          <div className="space-y-3">
            {services.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() => setServiceId(service.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${serviceId === service.id ? "border-accent bg-accentSoft" : "border-border bg-white hover:bg-section"}`}
              >
                <p className="text-xl font-semibold">{service.title}</p>
                <p className="mt-1 text-muted">{service.duration} • {service.price}</p>
              </button>
            ))}
          </div>
        </Step>

        <Step title="Когда тебе удобно?" subtitle="Выбери дату" number={2}>
          <div className="grid grid-cols-3 gap-2 md:grid-cols-7">
            {days.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setDay(item)}
                className={`rounded-2xl border px-3 py-3 text-sm transition ${day === item ? "border-accent bg-accentSoft text-accent" : "border-border hover:bg-section"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </Step>

        <Step title="Во сколько тебя ждём?" subtitle="Выбери время" number={3}>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {times.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => setTime(slot)}
                className={`rounded-2xl border px-4 py-3 text-lg transition ${time === slot ? "border-accent bg-accentSoft text-accent" : "border-border hover:bg-section"}`}
              >
                {slot}
              </button>
            ))}
          </div>
        </Step>

        <Step title="Куда прислать подтверждение?" subtitle="Оставь имя и телефон" number={4}>
          <div className="space-y-3">
            <input className="w-full rounded-2xl border border-border px-4 py-3 text-lg" placeholder="Как к тебе обращаться?" />
            <input className="w-full rounded-2xl border border-border px-4 py-3 text-lg" placeholder="Твой номер телефона" />
          </div>
        </Step>

        <p className="text-center text-sm text-muted">Твои данные в безопасности и не передаются третьим лицам</p>
        <button className="w-full rounded-2xl bg-accent px-6 py-4 text-xl font-semibold text-white transition hover:opacity-90">{cta}</button>
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
