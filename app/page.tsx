import Link from "next/link";

const features = [
  "Без регистрации для клиента",
  "Запись за 1–2 минуты",
  "Одна ссылка для Instagram и Telegram",
  "Уведомления о новых записях",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-transparent">
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 md:items-center md:gap-12 md:py-16">
        <div>
          <span className="inline-flex rounded-full border border-border bg-primarySurface px-4 py-2 text-badge text-primary">
            Онлайн-запись для мастеров
          </span>
          <h1 className="mt-6 text-displayLarge text-textPrimary">
            Запись клиентов без переписок в директе
          </h1>
          <p className="mt-5 max-w-xl text-profileDescription text-textSecondary">
            Создайте услуги, настройте расписание и дайте клиентам одну красивую ссылку для записи.
          </p>
          <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
            <Link href="/register" className="rounded-2xl bg-primary px-6 py-3 text-center text-buttonLabel text-surface saas-hover">
              Создать страницу записи
            </Link>
            <Link href="/booking" className="rounded-2xl border border-border bg-surface px-6 py-3 text-center text-buttonLabel text-textPrimary saas-hover">
              Посмотреть пример
            </Link>
            <Link href="/admin" className="rounded-2xl border border-border bg-surface px-6 py-3 text-center text-buttonLabel text-textPrimary saas-hover">
              Админ-панель
            </Link>
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          <div className="w-full max-w-[420px] rounded-[10px] border border-[#eef2f1] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
            <div className="grid min-h-[88px] grid-cols-[104px_minmax(0,1fr)_32px]">
              <div className="flex flex-col items-start justify-center border-r border-[#edf1f0] px-4">
                <p className="text-badge text-[#111827]">16:25</p>
                <span className="mt-2 whitespace-nowrap rounded-[6px] bg-[#d8f8e8] px-2 py-1 text-badge text-[#1d9b70]">Подтверждена</span>
              </div>

              <div className="min-w-0 px-4 py-4">
                <p className="text-conversationName truncate text-[#111827]">Стрижка котов</p>
                <div className="mt-2 grid gap-1.5 text-messageMetadata text-[#5f6f6d]">
                  <p className="flex min-w-0 items-center gap-2">
                    <svg className="h-4 w-4 shrink-0 text-[#8a9a98]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 7a6 6 0 0 1 12 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    <span className="truncate">Андрей Ф</span>
                  </p>
                  <p className="flex min-w-0 items-center gap-2">
                    <svg className="h-4 w-4 shrink-0 text-[#8a9a98]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M7.3 5.5 9 4.7a1.4 1.4 0 0 1 1.8.7l.8 1.9a1.4 1.4 0 0 1-.3 1.5l-.9.9a9 9 0 0 0 3.9 3.9l.9-.9a1.4 1.4 0 0 1 1.5-.3l1.9.8a1.4 1.4 0 0 1 .7 1.8l-.8 1.7c-.3.7-1 1.1-1.8 1A14 14 0 0 1 6.2 7.3c-.1-.8.4-1.5 1.1-1.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="truncate">8 966 985-57-57</span>
                  </p>
                </div>
              </div>

              <button type="button" className="flex h-9 w-8 items-center justify-center rounded-tr-[10px] text-[#5f6f6d] transition hover:bg-[#f6faf9] hover:text-[#111827]" aria-label="Действия записи">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="12" cy="5" r="1.6" />
                  <circle cx="12" cy="12" r="1.6" />
                  <circle cx="12" cy="19" r="1.6" />
                </svg>
              </button>
            </div>

            <div className="flex min-h-[42px] items-center justify-between border-t border-[#edf1f0] px-4 text-sectionLabel">
              <div className="flex items-center gap-2 text-[#5f6f6d]">
                <svg className="h-4 w-4 shrink-0 text-[#111827]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>60 мин</span>
              </div>
              <div className="flex items-center gap-2 text-buttonLabel text-[#087866]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d9fbef] text-badge" aria-hidden="true">₽</span>
                <span>1 700 ₽</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 md:pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <article key={feature} className="saas-card saas-hover p-6">
              <p className="text-conversationName text-textPrimary">{feature}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
