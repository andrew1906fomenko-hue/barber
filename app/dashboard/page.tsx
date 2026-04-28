"use client";

import { useState } from "react";

const nav = ["Главная", "Записи", "Клиенты", "Услуги", "Расписание", "Ссылка для записи", "Настройки"];
const stats = [
  { label: "Записей сегодня", value: "8" },
  { label: "Ближайшая запись", value: "12:30" },
  { label: "Клиентов за месяц", value: "42" },
  { label: "Заполненность недели", value: "78%" },
];

export default function DashboardPage() {
  const [section, setSection] = useState("Главная");
  const [toast, setToast] = useState(false);

  const copyLink = async () => {
    await navigator.clipboard.writeText("https://fastbook.app/m/anna-nails");
    setToast(true);
    setTimeout(() => setToast(false), 1800);
  };

  return (
    <main className="min-h-screen bg-section pb-20 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[250px_1fr]">
        <aside className="saas-card hidden h-fit p-3 md:block">
          <p className="px-3 py-2 text-sm font-semibold text-muted">FastBook</p>
          <nav className="space-y-1">
            {nav.map((item) => (
              <button key={item} onClick={() => setSection(item)} className={`w-full rounded-xl px-3 py-2 text-left transition ${section === item ? "bg-accentSoft text-accent" : "hover:bg-section"}`}>
                {item}
              </button>
            ))}
          </nav>
        </aside>

        <section className="space-y-5">
          <header>
            <h1 className="text-3xl font-semibold md:text-4xl">{section}</h1>
            <p className="mt-1 text-muted">Премиальный SaaS-интерфейс для управления записью</p>
          </header>

          {section === "Главная" && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((card) => (
                  <article key={card.label} className="saas-card saas-hover p-5">
                    <p className="text-sm text-muted">{card.label}</p>
                    <p className="mt-2 text-3xl font-semibold">{card.value}</p>
                  </article>
                ))}
              </div>

              <article className="saas-card p-5">
                <h2 className="text-xl font-semibold">Ближайшие записи</h2>
                <ul className="mt-4 space-y-2">
                  {["12:30 · Алина · Маникюр", "14:00 · Мария · Укрепление", "16:00 · София · Покрытие"].map((item) => (
                    <li key={item} className="rounded-xl border border-border bg-white px-4 py-3">{item}</li>
                  ))}
                </ul>
              </article>

              <article className="saas-card p-5">
                <h2 className="text-xl font-semibold">Быстрые действия</h2>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button className="rounded-2xl border border-border bg-white px-4 py-2 hover:bg-section">Добавить услугу</button>
                  <button className="rounded-2xl border border-border bg-white px-4 py-2 hover:bg-section">Настроить расписание</button>
                  <button onClick={copyLink} className="rounded-2xl bg-accent px-4 py-2 text-white hover:opacity-90">Скопировать ссылку записи</button>
                </div>
              </article>
            </>
          )}

          {section === "Услуги" && (
            <article className="saas-card p-5">
              <h2 className="text-xl font-semibold">Услуги</h2>
              <div className="mt-4 space-y-3">
                {[
                  ["Маникюр", "1 ч 30 мин", "1 500 ₽", true],
                  ["Покрытие гель-лак", "1 ч 30 мин", "1 800 ₽", true],
                  ["Дизайн", "30 мин", "700 ₽", false],
                ].map(([name, duration, price, active]) => (
                  <div key={String(name)} className="flex items-center justify-between rounded-xl border border-border bg-white p-4">
                    <div>
                      <p className="font-semibold">{name}</p>
                      <p className="text-sm text-muted">{duration} · {price}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-sm ${active ? "bg-accentSoft text-accent" : "bg-section text-muted"}`}>
                      {active ? "Активна" : "Неактивна"}
                    </span>
                  </div>
                ))}
              </div>
              <button className="mt-4 rounded-2xl bg-accent px-4 py-2 text-white">Добавить услугу</button>
            </article>
          )}

          {section === "Расписание" && (
            <article className="saas-card p-5">
              <h2 className="text-xl font-semibold">Расписание</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Card title="Рабочие дни" desc="Пн–Сб" />
                <Card title="Время работы" desc="10:00 — 20:00" />
                <Card title="Перерывы" desc="13:30 — 14:00" />
                <Card title="Выходные" desc="Вс + 18 мая" />
              </div>
            </article>
          )}

          {section === "Клиенты" && (
            <article className="saas-card p-5">
              <h2 className="text-xl font-semibold">Клиенты</h2>
              <div className="mt-4 space-y-2">
                {[
                  ["Алина", "+7 900 000-00-01", "4 записи", "13 мая"],
                  ["Мария", "+7 900 000-00-02", "2 записи", "12 мая"],
                ].map(([name, phone, count, last]) => (
                  <div key={String(name)} className="rounded-xl border border-border bg-white p-4">
                    <p className="font-semibold">{name}</p>
                    <p className="text-sm text-muted">{phone} · {count} · Последняя запись: {last}</p>
                  </div>
                ))}
              </div>
            </article>
          )}

          {section === "Ссылка для записи" && (
            <article className="saas-card p-5">
              <h2 className="text-xl font-semibold">Ссылка для записи</h2>
              <div className="mt-4 rounded-2xl border border-border bg-white p-4">
                <p className="break-all text-accent">https://fastbook.app/m/anna-nails</p>
                <button onClick={copyLink} className="mt-4 rounded-xl bg-accent px-4 py-2 text-white">Скопировать ссылку</button>
                <p className="mt-3 text-sm text-muted">Добавьте эту ссылку в Instagram bio, Telegram или отправляйте клиентам напрямую</p>
              </div>
            </article>
          )}
        </section>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-white p-2 md:hidden">
        <div className="mx-auto flex max-w-4xl justify-between gap-2">
          {nav.slice(0, 5).map((item) => (
            <button key={item} onClick={() => setSection(item)} className={`rounded-xl px-2 py-2 text-xs ${section === item ? "bg-accentSoft text-accent" : "text-muted"}`}>
              {item}
            </button>
          ))}
        </div>
      </nav>

      {toast && <div className="fixed right-4 top-4 rounded-xl bg-text px-4 py-2 text-sm text-white">Ссылка скопирована</div>}
    </main>
  );
}

function Card({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="text-sm text-muted">{title}</p>
      <p className="mt-1 font-semibold">{desc}</p>
    </div>
  );
}
