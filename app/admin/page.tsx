"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type MasterAccount = {
  email: string;
  name: string;
  password: string;
  slug: string;
  createdAt: string;
};

type MasterProfile = {
  displayName: string;
  slug: string;
  showOnBookingPage: boolean;
};

type Service = {
  id: string;
  title: string;
  category: string;
  duration: number;
  price: number;
  active: boolean;
};

type Appointment = {
  id: string;
  date: string;
  time: string;
  client: string;
  phone: string;
  serviceId: string;
  status: string;
};

const accountsKey = "barber-master-accounts";
const sessionKey = "barber-master-session";
const adminSessionKey = "barber-admin-session";
const adminPassword = "admin";

const getMasterStorageKey = (email: string, key: string) => `barber-master:${email}:${key}`;

const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "master";

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  window.localStorage.setItem(key, JSON.stringify(value));
};

const getAccounts = () => readJson<MasterAccount[]>(accountsKey, []);

const getProfile = (account: MasterAccount) =>
  readJson<MasterProfile>(getMasterStorageKey(account.email, "master-profile"), {
    displayName: account.name,
    slug: account.slug,
    showOnBookingPage: true,
  });

const getServices = (email: string) => readJson<Service[]>(getMasterStorageKey(email, "services"), []);
const getAppointments = (email: string) => readJson<Appointment[]>(getMasterStorageKey(email, "appointments"), []);

export default function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [accounts, setAccounts] = useState<MasterAccount[]>([]);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");

  const selectedAccount = accounts.find((account) => account.email === selectedEmail) || accounts[0] || null;
  const selectedProfile = selectedAccount ? getProfile(selectedAccount) : null;
  const selectedServices = selectedAccount ? getServices(selectedAccount.email) : [];
  const selectedAppointments = selectedAccount ? getAppointments(selectedAccount.email) : [];

  const totals = useMemo(() => {
    return accounts.reduce(
      (sum, account) => {
        const services = getServices(account.email);
        const appointments = getAppointments(account.email);
        const revenue = appointments.reduce((total, appointment) => {
          const service = services.find((item) => item.id === appointment.serviceId);
          return total + (service?.price || 0);
        }, 0);

        return {
          services: sum.services + services.length,
          appointments: sum.appointments + appointments.length,
          revenue: sum.revenue + revenue,
        };
      },
      { services: 0, appointments: 0, revenue: 0 },
    );
  }, [accounts]);

  const filteredAccounts = accounts.filter((account) => {
    const profile = getProfile(account);
    const text = `${account.email} ${account.name} ${profile.displayName} ${profile.slug}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  });

  const refresh = () => {
    const nextAccounts = getAccounts();
    setAccounts(nextAccounts);
    setSelectedEmail((current) => (current && nextAccounts.some((account) => account.email === current) ? current : nextAccounts[0]?.email || ""));
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  };

  useEffect(() => {
    const savedAdminSession = window.localStorage.getItem(adminSessionKey);
    if (savedAdminSession === "active") {
      setIsAuthorized(true);
      refresh();
    }
  }, []);

  const login = (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== adminPassword) {
      showToast("Неверный пароль администратора");
      return;
    }

    window.localStorage.setItem(adminSessionKey, "active");
    setIsAuthorized(true);
    refresh();
  };

  const logoutAdmin = () => {
    window.localStorage.removeItem(adminSessionKey);
    setIsAuthorized(false);
  };

  const updateAccount = (field: "name" | "slug" | "password", value: string) => {
    if (!selectedAccount) return;

    const normalizedValue = field === "slug" ? normalizeSlug(value) : value;
    if (field === "slug" && accounts.some((account) => account.email !== selectedAccount.email && account.slug === normalizedValue)) {
      showToast("Такая ссылка уже занята");
      return;
    }

    const nextAccounts = accounts.map((account) =>
      account.email === selectedAccount.email ? { ...account, [field]: normalizedValue } : account,
    );
    const nextProfile = {
      ...getProfile(selectedAccount),
      ...(field === "name" ? { displayName: normalizedValue } : {}),
      ...(field === "slug" ? { slug: normalizedValue } : {}),
    };

    writeJson(accountsKey, nextAccounts);
    writeJson(getMasterStorageKey(selectedAccount.email, "master-profile"), nextProfile);
    setAccounts(nextAccounts);
    showToast("Данные сохранены");
  };

  const toggleBookingName = () => {
    if (!selectedAccount) return;
    const profile = getProfile(selectedAccount);
    writeJson(getMasterStorageKey(selectedAccount.email, "master-profile"), {
      ...profile,
      showOnBookingPage: !profile.showOnBookingPage,
    });
    refresh();
  };

  const enterMasterCabinet = () => {
    if (!selectedAccount) return;
    writeJson(sessionKey, { email: selectedAccount.email });
    window.location.href = "/dashboard";
  };

  const deleteMaster = () => {
    if (!selectedAccount) return;
    const approved = window.confirm(`Удалить мастера ${selectedAccount.email} и все его данные?`);
    if (!approved) return;

    const nextAccounts = accounts.filter((account) => account.email !== selectedAccount.email);
    writeJson(accountsKey, nextAccounts);
    ["services", "appointments", "blocked-times", "master-profile"].forEach((key) => {
      window.localStorage.removeItem(getMasterStorageKey(selectedAccount.email, key));
    });
    refresh();
    showToast("Мастер удален");
  };

  if (!isAuthorized) {
    return (
      <main className="min-h-screen bg-section px-4 py-8 text-text">
        <section className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1fr_0.85fr] md:items-center">
          <div>
            <Link href="/" className="text-sm font-semibold text-accent">
              Beauty Time
            </Link>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">Админ-панель</h1>
            <p className="mt-4 max-w-xl text-lg text-muted">Управление мастерами, кабинетами, записями, услугами и публичными ссылками.</p>
          </div>

          <form onSubmit={login} className="saas-card space-y-4 p-6">
            <label className="space-y-2">
              <span className="text-sm font-medium text-muted">Пароль администратора</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-border px-4 py-3"
                placeholder="admin"
              />
            </label>
            <button type="submit" className="w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-white">
              Войти
            </button>
          </form>
        </section>
        {toast && <div className="fixed right-4 top-4 z-30 rounded-xl bg-text px-4 py-2 text-sm text-white">{toast}</div>}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-section pb-10 text-text">
      <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/" className="text-sm font-semibold text-accent">
              Beauty Time
            </Link>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Админ-панель</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={refresh} className="rounded-xl border border-border bg-white px-4 py-2 font-semibold text-text">
              Обновить
            </button>
            <button type="button" onClick={logoutAdmin} className="rounded-xl border border-border bg-white px-4 py-2 font-semibold text-text">
              Выйти
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Мастеров" value={accounts.length.toString()} />
          <Metric label="Услуг" value={totals.services.toString()} />
          <Metric label="Записей" value={totals.appointments.toString()} />
          <Metric label="Выручка" value={`${totals.revenue.toLocaleString("ru-RU")} руб.`} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <aside className="saas-card h-fit space-y-4 p-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-xl border border-border px-4 py-3"
              placeholder="Поиск по email, имени или ссылке"
            />

            <div className="space-y-2">
              {filteredAccounts.length === 0 ? (
                <p className="rounded-xl bg-white p-4 text-muted">Мастеров пока нет.</p>
              ) : (
                filteredAccounts.map((account) => {
                  const profile = getProfile(account);
                  const appointmentsCount = getAppointments(account.email).length;
                  return (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => setSelectedEmail(account.email)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        selectedAccount?.email === account.email ? "border-accent bg-accentSoft" : "border-border bg-white hover:bg-section"
                      }`}
                    >
                      <p className="font-semibold">{profile.displayName || account.name}</p>
                      <p className="break-all text-sm text-muted">{account.email}</p>
                      <p className="mt-1 text-sm text-accent">/m/{profile.slug} · {appointmentsCount} записей</p>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {selectedAccount && selectedProfile ? (
            <section className="space-y-5">
              <article className="saas-card space-y-4 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold">{selectedProfile.displayName || selectedAccount.name}</h2>
                    <p className="break-all text-muted">{selectedAccount.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={enterMasterCabinet} className="rounded-xl bg-accent px-4 py-2 font-semibold text-white">
                      Войти как мастер
                    </button>
                    <button type="button" onClick={deleteMaster} className="rounded-xl border border-red-200 bg-white px-4 py-2 font-semibold text-red-700">
                      Удалить
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-muted">Имя мастера</span>
                    <input
                      key={`name-${selectedAccount.email}`}
                      defaultValue={selectedProfile.displayName || selectedAccount.name}
                      onBlur={(event) => updateAccount("name", event.target.value)}
                      className="w-full rounded-xl border border-border px-4 py-3"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-muted">Ссылка</span>
                    <input
                      key={`slug-${selectedAccount.email}`}
                      defaultValue={selectedProfile.slug}
                      onBlur={(event) => updateAccount("slug", event.target.value)}
                      pattern="[a-z0-9-]+"
                      className="w-full rounded-xl border border-border px-4 py-3"
                    />
                    <span className="block text-xs text-muted">Только латиница, цифры и дефис.</span>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-muted">Новый пароль</span>
                    <input
                      key={`password-${selectedAccount.email}`}
                      defaultValue={selectedAccount.password}
                      onBlur={(event) => updateAccount("password", event.target.value)}
                      className="w-full rounded-xl border border-border px-4 py-3"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleBookingName}
                    className={`rounded-xl px-4 py-2 font-semibold ${
                      selectedProfile.showOnBookingPage ? "bg-accent text-white" : "border border-border bg-white text-text"
                    }`}
                  >
                    {selectedProfile.showOnBookingPage ? "Имя видно клиентам" : "Имя скрыто"}
                  </button>
                  <Link href={`/m/${selectedProfile.slug}`} target="_blank" className="break-all text-sm font-semibold text-accent">
                    {typeof window === "undefined" ? `/m/${selectedProfile.slug}` : `${window.location.origin}/m/${selectedProfile.slug}`}
                  </Link>
                </div>
              </article>

              <section className="grid gap-5 lg:grid-cols-2">
                <DataList title="Услуги" empty="Услуг пока нет">
                  {selectedServices.map((service) => (
                    <article key={service.id} className="rounded-xl border border-border bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold">{service.title}</p>
                          <p className="text-sm text-muted">{service.category || "Без категории"}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${service.active ? "bg-accentSoft text-accent" : "bg-section text-muted"}`}>
                          {service.active ? "Активна" : "Скрыта"}
                        </span>
                      </div>
                      <p className="mt-2 text-muted">{service.duration} мин · {service.price.toLocaleString("ru-RU")} руб.</p>
                    </article>
                  ))}
                </DataList>

                <DataList title="Записи" empty="Записей пока нет">
                  {selectedAppointments
                    .slice()
                    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
                    .map((appointment) => {
                      const service = selectedServices.find((item) => item.id === appointment.serviceId);
                      return (
                        <article key={appointment.id} className="rounded-xl border border-border bg-white p-4">
                          <p className="text-lg font-semibold">{appointment.date} · {appointment.time}</p>
                          <p className="text-muted">{appointment.client} · {appointment.phone}</p>
                          <p className="mt-1 text-sm text-muted">{service?.title || "Услуга удалена"} · {appointment.status}</p>
                        </article>
                      );
                    })}
                </DataList>
              </section>
            </section>
          ) : (
            <article className="saas-card p-6 text-muted">Зарегистрируйте первого мастера, чтобы здесь появились данные.</article>
          )}
        </section>
      </div>

      {toast && <div className="fixed right-4 top-4 z-30 rounded-xl bg-text px-4 py-2 text-sm text-white">{toast}</div>}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="saas-card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 break-words text-3xl font-semibold">{value}</p>
    </article>
  );
}

function DataList({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <article className="saas-card p-5">
      <h3 className="text-2xl font-semibold">{title}</h3>
      <div className="mt-4 space-y-3">{hasItems ? children : <p className="text-muted">{empty}</p>}</div>
    </article>
  );
}
