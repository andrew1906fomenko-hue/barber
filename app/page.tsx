import Link from "next/link";

const features = [
  "Без регистрации для клиента",
  "Запись за 1–2 минуты",
  "Одна ссылка для Instagram и Telegram",
  "Уведомления о новых записях",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-section">
      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-2 md:items-center">
        <div>
          <span className="inline-flex rounded-full border border-border bg-accentSoft px-4 py-2 text-sm font-medium text-accent">
            Онлайн-запись для мастеров
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-tight text-text md:text-6xl">
            Запись клиентов без переписок в директе
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted md:text-xl">
            Создайте услуги, настройте расписание и дайте клиентам одну красивую ссылку для записи.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-2xl bg-accent px-6 py-3 text-base font-semibold text-white saas-hover">
              Создать страницу записи
            </Link>
            <Link href="/booking" className="rounded-2xl border border-border bg-white px-6 py-3 text-base font-semibold text-text saas-hover">
              Посмотреть пример
            </Link>
            <Link href="/admin" className="rounded-2xl border border-border bg-white px-6 py-3 text-base font-semibold text-text saas-hover">
              Админ-панель
            </Link>
          </div>
        </div>

        <div className="saas-card p-6">
          <div className="rounded-2xl border border-border bg-white p-5">
            <p className="text-center text-2xl font-semibold">Давай подберём тебе удобное время</p>
            <p className="mt-2 text-center text-muted">Это займёт меньше минуты</p>
            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl border border-accent bg-accentSoft p-4">
                <p className="font-semibold">Маникюр</p>
                <p className="text-sm text-muted">1 ч 30 мин • 1 500 ₽</p>
              </div>
              <div className="rounded-2xl border border-border p-4"><p>Покрытие гель-лак</p></div>
              <div className="rounded-2xl border border-border p-4"><p>Укрепление ногтей</p></div>
            </div>
            <button className="mt-6 w-full rounded-2xl bg-accent px-4 py-3 font-semibold text-white">
              Записаться на 13 мая в 16:00
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-4 md:grid-cols-4">
          {features.map((feature) => (
            <article key={feature} className="saas-card saas-hover p-6">
              <p className="text-base font-medium text-text">{feature}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
