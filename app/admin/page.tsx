"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "../../components/StatusBadge";

type MasterAccount = {
  masterId: string;
  email: string;
  name: string;
  password: string;
  slug: string;
  servicesCount: number;
  appointmentsCount: number;
  revenue: number;
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

type TelegramAdminStatus = {
  config: {
    tokenConfigured: boolean;
    username: string;
    pollingEnabled: boolean;
    botUrl: string;
  };
  stats: {
    connectedClients: number;
    knownChats: number;
    pendingTokens: number;
    sentReminders: number;
  };
  recentClients: {
    name: string;
    phone: string;
    telegramUsername: string;
    telegramConnectedAt: string;
    masterName: string;
  }[];
};

type AdminSubscriptionPlan = {
  id: string;
  code: string;
  name: string;
  duration_months: number;
  price: number;
  currency: string;
  discount_percent: number;
  is_active: boolean;
  sort_order: number;
};

type AdminSubscription = {
  id: string;
  master_id: string;
  plan_id: string | null;
  status: string;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  auto_renew: boolean;
  auto_renew_plan_id: string | null;
  cancel_at_period_end: boolean;
};

type AdminSubscriptionPayment = {
  id: string;
  amount: number;
  currency: string;
  duration_months: number;
  status: string;
  payment_method_title: string | null;
  created_at: string;
  paid_at: string | null;
};

type AdminSubscriptionState = {
  subscription: AdminSubscription | null;
  plans: AdminSubscriptionPlan[];
  payments: AdminSubscriptionPayment[];
};

const adminPassword = "admin";

const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "master";

const getProfile = (account: MasterAccount) =>
  ({
    displayName: account.name,
    slug: account.slug,
    showOnBookingPage: true,
  }) as MasterProfile;

export default function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [accounts, setAccounts] = useState<MasterAccount[]>([]);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedAppointments, setSelectedAppointments] = useState<Appointment[]>([]);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [databaseError, setDatabaseError] = useState("");
  const [origin, setOrigin] = useState("");
  const [telegramAdmin, setTelegramAdmin] = useState<TelegramAdminStatus | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [subscriptionAdmin, setSubscriptionAdmin] = useState<AdminSubscriptionState | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  const selectedAccount = accounts.find((account) => account.email === selectedEmail) || accounts[0] || null;
  const selectedProfile = selectedAccount ? getProfile(selectedAccount) : null;

  const totals = useMemo(() => {
    return accounts.reduce(
      (sum, account) => {
        return {
          services: sum.services + account.servicesCount,
          appointments: sum.appointments + account.appointmentsCount,
          revenue: sum.revenue + account.revenue,
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

  const refresh = async () => {
    try {
      const response = await fetch("/api/users");
      const data = (await response.json()) as { success: boolean; users?: MasterAccount[]; error?: string };

      if (!response.ok || !data.success || !data.users) {
        const message = data.error || "Не удалось загрузить мастеров";
        setDatabaseError(message);
        showToast(message);
        return;
      }

      setDatabaseError("");
      setAccounts(data.users);
      setSelectedEmail((current) => (current && data.users!.some((account) => account.email === current) ? current : data.users![0]?.email || ""));
    } catch {
      const message = "Не удалось подключиться к серверу";
      setDatabaseError(message);
      showToast(message);
    }
  };

  const refreshTelegramAdmin = async () => {
    setTelegramLoading(true);
    try {
      const response = await fetch("/api/telegram/admin");
      const data = (await response.json()) as ({ success: boolean; error?: string } & TelegramAdminStatus);
      if (!response.ok || !data.success) throw new Error(data.error || "Не удалось загрузить Telegram");
      setTelegramAdmin({ config: data.config, stats: data.stats, recentClients: data.recentClients || [] });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Не удалось загрузить Telegram");
    } finally {
      setTelegramLoading(false);
    }
  };

  const refreshSubscriptionAdmin = async (masterId = selectedAccount?.masterId) => {
    if (!masterId) {
      setSubscriptionAdmin(null);
      return;
    }

    setSubscriptionLoading(true);
    try {
      const response = await fetch(`/api/admin/subscriptions?masterId=${encodeURIComponent(masterId)}`);
      const data = (await response.json()) as { success: boolean; error?: string } & AdminSubscriptionState;
      if (!response.ok || !data.success) throw new Error(data.error || "Не удалось загрузить подписку");
      setSubscriptionAdmin({ subscription: data.subscription, plans: data.plans || [], payments: data.payments || [] });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Не удалось загрузить подписку");
      setSubscriptionAdmin(null);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  };

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      void refresh();
      void refreshTelegramAdmin();
    }
  }, [isAuthorized]);

  useEffect(() => {
    const loadSelectedMasterData = async () => {
      if (!selectedProfile) {
        setSelectedServices([]);
        setSelectedAppointments([]);
        return;
      }

      const response = await fetch(`/api/masters/${encodeURIComponent(selectedProfile.slug)}`);
      const data = (await response.json()) as {
        success: boolean;
        services?: Service[];
        appointments?: Appointment[];
      };

      setSelectedServices(data.success ? data.services || [] : []);
      setSelectedAppointments(data.success ? data.appointments || [] : []);
    };

    void loadSelectedMasterData();
  }, [selectedProfile?.slug]);

  useEffect(() => {
    if (selectedAccount?.masterId) void refreshSubscriptionAdmin(selectedAccount.masterId);
  }, [selectedAccount?.masterId]);

  const login = (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== adminPassword) {
      showToast("Неверный пароль администратора");
      return;
    }

    setIsAuthorized(true);
  };

  const logoutAdmin = () => {
    setIsAuthorized(false);
  };

  const updateAccount = async (field: "name" | "slug" | "password", value: string) => {
    if (!selectedAccount) return;

    const normalizedValue = field === "slug" ? normalizeSlug(value) : value;
    if (field === "slug") {
      showToast("Такая ссылка уже занята");
      return;
    }

    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: selectedAccount.email, [field]: normalizedValue }),
    });
    await refresh();
    showToast("Данные сохранены");
  };

  const toggleBookingName = () => {
    showToast("Имя мастера берется из PostgreSQL.");
  };

  const enterMasterCabinet = async () => {
    if (!selectedAccount) return;
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: selectedAccount.email, password: selectedAccount.password }),
    });

    if (response.ok) {
      window.location.href = "/dashboard";
    } else {
      showToast("Не удалось открыть кабинет мастера.");
    }
  };

  const deleteMaster = async () => {
    if (!selectedAccount) return;
    const approved = window.confirm(`Удалить мастера ${selectedAccount.email} и все его данные?`);
    if (!approved) return;

    await fetch(`/api/users?email=${encodeURIComponent(selectedAccount.email)}`, { method: "DELETE" });
    await refresh();
    showToast("Мастер удален");
  };

  const saveSubscriptionAdmin = async (subscription: AdminSubscription) => {
    if (!selectedAccount) return;
    const response = await fetch("/api/admin/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "subscription",
        masterId: selectedAccount.masterId,
        subscription: {
          status: subscription.status,
          planId: subscription.plan_id,
          trialEndsAt: subscription.trial_ends_at,
          currentPeriodEndsAt: subscription.current_period_ends_at,
          autoRenew: subscription.auto_renew,
          autoRenewPlanId: subscription.auto_renew_plan_id,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      }),
    });
    const data = (await response.json()) as { success: boolean; error?: string };
    if (!response.ok || !data.success) {
      showToast(data.error || "Не удалось сохранить подписку");
      return;
    }
    await refreshSubscriptionAdmin(selectedAccount.masterId);
    showToast("Подписка сохранена");
  };

  const saveSubscriptionPlan = async (plan: AdminSubscriptionPlan) => {
    const response = await fetch("/api/admin/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "plan",
        planId: plan.id,
        plan: {
          name: plan.name,
          durationMonths: plan.duration_months,
          priceRub: plan.price / 100,
          discountPercent: plan.discount_percent,
          isActive: plan.is_active,
          sortOrder: plan.sort_order,
        },
      }),
    });
    const data = (await response.json()) as { success: boolean; error?: string };
    if (!response.ok || !data.success) {
      showToast(data.error || "Не удалось сохранить тариф");
      return;
    }
    await refreshSubscriptionAdmin();
    showToast("Тариф сохранен");
  };

  const runTelegramReminders = async () => {
    setTelegramLoading(true);
    try {
      const response = await fetch("/api/telegram/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run-reminders" }),
      });
      const data = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !data.success) throw new Error(data.error || "Не удалось запустить проверку");
      await refreshTelegramAdmin();
      showToast("Проверка Telegram-напоминаний запущена");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Не удалось запустить Telegram");
    } finally {
      setTelegramLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <main className="min-h-screen bg-transparent px-4 py-6 text-textPrimary md:py-8">
        <section className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1fr_0.85fr] md:items-center">
          <div>
            <Link href="/" className="text-buttonLabel text-primary">
              Beauty Time
            </Link>
            <h1 className="mt-5 text-displayLarge text-textPrimary">Админ-панель</h1>
            <p className="mt-4 max-w-xl text-profileDescription text-textSecondary">Управление мастерами, кабинетами, записями, услугами и публичными ссылками.</p>
          </div>

          <form onSubmit={login} className="saas-card space-y-4 p-6">
            <label className="space-y-2">
              <span className="text-sectionLabel text-textSecondary">Пароль администратора</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-border px-4 py-3 text-messageInput text-textPrimary"
                placeholder="admin"
              />
            </label>
            <button type="submit" className="w-full rounded-2xl bg-primary px-5 py-3 text-buttonLabel text-surface">
              Войти
            </button>
          </form>
        </section>
        {toast && <div className="fixed left-4 right-4 top-4 z-30 rounded-xl bg-textPrimary px-4 py-2 text-systemMessage text-surface md:left-auto md:right-4">{toast}</div>}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent pb-10 text-textPrimary">
      <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-4 md:py-6">
        <header className="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center">
          <div>
            <Link href="/" className="text-buttonLabel text-primary">
              Beauty Time
            </Link>
            <h1 className="mt-2 text-screenTitle text-textPrimary">Админ-панель</h1>
          </div>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <button type="button" onClick={refresh} className="rounded-xl border border-border bg-surface px-4 py-3 text-buttonLabel text-textPrimary md:py-2">
              Обновить
            </button>
            <button type="button" onClick={logoutAdmin} className="rounded-xl border border-border bg-surface px-4 py-3 text-buttonLabel text-textPrimary md:py-2">
              Выйти
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Мастеров" value={accounts.length.toString()} />
          <Metric label="Услуг" value={totals.services.toString()} />
          <Metric label="Записей" value={totals.appointments.toString()} />
          <Metric label="Выручка" value={`${totals.revenue.toLocaleString("ru-RU")} руб.`} />
        </section>

        {databaseError && (
          <section className="rounded-2xl border border-danger/20 bg-danger/10 p-4 text-danger">
            <p className="text-conversationName">База данных сейчас недоступна</p>
            <p className="mt-1 text-settingsRowDescription">{databaseError}</p>
            <p className="mt-2 text-settingsRowDescription">Данные не удалены. Приложение не смогло подключиться к основной базе и больше не подменяет её пустой локальной копией.</p>
          </section>
        )}

        <TelegramAdminPanel
          status={telegramAdmin}
          loading={telegramLoading}
          onRefresh={refreshTelegramAdmin}
          onRunReminders={runTelegramReminders}
        />

        <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <aside className="saas-card h-fit space-y-4 p-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-xl border border-border px-4 py-3 text-messageInput text-textPrimary"
              placeholder="Поиск по email, имени или ссылке"
            />

            <div className="space-y-2">
              {filteredAccounts.length === 0 ? (
                <p className="rounded-xl bg-surface p-4 text-settingsRowDescription text-textSecondary">Мастеров пока нет.</p>
              ) : (
                filteredAccounts.map((account) => {
                  const profile = getProfile(account);
                  return (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => setSelectedEmail(account.email)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        selectedAccount?.email === account.email ? "border-primary bg-primarySurface" : "border-border bg-surface hover:bg-background"
                      }`}
                    >
                      <p className="text-conversationName text-textPrimary">{profile.displayName || account.name}</p>
                      <p className="break-all text-messageMetadata text-textSecondary">{account.email}</p>
                      <p className="mt-1 text-messageMetadata text-primary">/m/{profile.slug} · {account.appointmentsCount} записей</p>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {selectedAccount && selectedProfile ? (
            <section className="space-y-5">
              <article className="saas-card space-y-4 p-4 md:p-6">
                <div className="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <h2 className="text-navigationTitle text-textPrimary">{selectedProfile.displayName || selectedAccount.name}</h2>
                    <p className="break-all text-settingsRowDescription text-textSecondary">{selectedAccount.email}</p>
                  </div>
                  <div className="grid gap-2 sm:flex sm:flex-wrap">
                    <button type="button" onClick={enterMasterCabinet} className="rounded-xl bg-primary px-4 py-3 text-buttonLabel text-surface md:py-2">
                      Войти как мастер
                    </button>
                    <button type="button" onClick={deleteMaster} className="rounded-xl border border-danger/20 bg-surface px-4 py-3 text-buttonLabel text-danger md:py-2">
                      Удалить
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <label className="space-y-2">
                    <span className="text-sectionLabel text-textSecondary">Имя мастера</span>
                    <input
                      key={`name-${selectedAccount.email}`}
                      defaultValue={selectedProfile.displayName || selectedAccount.name}
                      onBlur={(event) => updateAccount("name", event.target.value)}
                      className="w-full rounded-xl border border-border px-4 py-3 text-messageInput text-textPrimary"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sectionLabel text-textSecondary">Ссылка</span>
                    <input
                      key={`slug-${selectedAccount.email}`}
                      defaultValue={selectedProfile.slug}
                      onBlur={(event) => updateAccount("slug", event.target.value)}
                      pattern="[a-z0-9-]+"
                      className="w-full rounded-xl border border-border px-4 py-3 text-messageInput text-textPrimary"
                    />
                    <span className="block text-messageMetadata text-textSecondary">Только латиница, цифры и дефис.</span>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sectionLabel text-textSecondary">Новый пароль</span>
                    <input
                      key={`password-${selectedAccount.email}`}
                      defaultValue={selectedAccount.password}
                      onBlur={(event) => updateAccount("password", event.target.value)}
                      className="w-full rounded-xl border border-border px-4 py-3 text-messageInput text-textPrimary"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
                  <button
                    type="button"
                    onClick={toggleBookingName}
                    className={`rounded-xl px-4 py-2 text-buttonLabel ${
                      selectedProfile.showOnBookingPage ? "bg-primary text-surface" : "border border-border bg-surface text-textPrimary"
                    }`}
                  >
                    {selectedProfile.showOnBookingPage ? "Имя видно клиентам" : "Имя скрыто"}
                  </button>
                  <Link href={`/m/${selectedProfile.slug}`} target="_blank" className="break-all text-buttonLabel text-primary">
                    {origin ? `${origin}/m/${selectedProfile.slug}` : `/m/${selectedProfile.slug}`}
                  </Link>
                </div>
              </article>

              <AdminSubscriptionPanel
                loading={subscriptionLoading}
                state={subscriptionAdmin}
                onRefresh={() => void refreshSubscriptionAdmin(selectedAccount.masterId)}
                onSavePlan={saveSubscriptionPlan}
                onSaveSubscription={saveSubscriptionAdmin}
              />

              <section className="grid gap-5 lg:grid-cols-2">
                <DataList title="Услуги" empty="Услуг пока нет">
                  {selectedServices.map((service) => (
                    <article key={service.id} className="rounded-xl border border-border bg-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-conversationName text-textPrimary">{service.title}</p>
                          <p className="text-settingsRowDescription text-textSecondary">{service.category || "Без категории"}</p>
                        </div>
                        <StatusBadge status={service.active ? "active" : "hidden"} label={service.active ? "Активна" : "Скрыта"} />
                      </div>
                      <p className="mt-2 text-settingsRowDescription text-textSecondary">{service.duration} мин · {service.price.toLocaleString("ru-RU")} руб.</p>
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
                        <article key={appointment.id} className="rounded-xl border border-border bg-surface p-4">
                          <p className="text-conversationName text-textPrimary">{appointment.date} · {appointment.time}</p>
                          <p className="text-settingsRowDescription text-textSecondary">{appointment.client} · {appointment.phone}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-2 text-messageMetadata text-textSecondary">
                            <span>{service?.title || "Услуга удалена"}</span>
                            <StatusBadge status={appointment.status} />
                          </p>
                        </article>
                      );
                    })}
                </DataList>
              </section>
            </section>
          ) : (
            <article className="saas-card p-6 text-settingsRowDescription text-textSecondary">Зарегистрируйте первого мастера, чтобы здесь появились данные.</article>
          )}
        </section>
      </div>

      {toast && <div className="fixed left-4 right-4 top-4 z-30 rounded-xl bg-textPrimary px-4 py-2 text-systemMessage text-surface md:left-auto md:right-4">{toast}</div>}
    </main>
  );
}

const subscriptionStatuses = ["trial", "active", "ending_soon", "pending_payment", "payment_processing", "payment_failed", "expired", "cancelled", "blocked", "refunded"];
const toDateInputValue = (value: string | null) => (value ? new Date(value).toISOString().slice(0, 10) : "");
const fromDateInputValue = (value: string) => (value ? new Date(`${value}T23:59:59`).toISOString() : null);
const formatAdminMoney = (kopecks: number, currency = "RUB") =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency, maximumFractionDigits: 0 }).format(kopecks / 100);
const formatAdminDate = (value: string | null) => (value ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(value)) : "—");

function AdminSubscriptionPanel({
  loading,
  onRefresh,
  onSavePlan,
  onSaveSubscription,
  state,
}: {
  loading: boolean;
  onRefresh: () => void;
  onSavePlan: (plan: AdminSubscriptionPlan) => void;
  onSaveSubscription: (subscription: AdminSubscription) => void;
  state: AdminSubscriptionState | null;
}) {
  const [draftSubscription, setDraftSubscription] = useState<AdminSubscription | null>(null);
  const [draftPlans, setDraftPlans] = useState<AdminSubscriptionPlan[]>([]);

  useEffect(() => {
    setDraftSubscription(state?.subscription || null);
    setDraftPlans(state?.plans || []);
  }, [state]);

  const updatePlan = (planId: string, patch: Partial<AdminSubscriptionPlan>) => {
    setDraftPlans((plans) => plans.map((plan) => (plan.id === planId ? { ...plan, ...patch } : plan)));
  };

  return (
    <article className="saas-card space-y-5 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sectionLabel text-textSecondary">Подписка</p>
          <h2 className="mt-1 text-navigationTitle text-textPrimary">Управление доступом и тарифами</h2>
          <p className="mt-1 text-settingsRowDescription text-textSecondary">Статус, период действия, автопродление, тарифы и история платежей выбранного мастера.</p>
        </div>
        <button type="button" onClick={onRefresh} disabled={loading} className="rounded-xl border border-border bg-surface px-4 py-2 text-buttonLabel text-textPrimary disabled:opacity-60">
          Обновить
        </button>
      </div>

      {draftSubscription ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="text-navigationTitle text-textPrimary">Подписка мастера</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sectionLabel text-textSecondary">Статус</span>
                <select value={draftSubscription.status} onChange={(event) => setDraftSubscription({ ...draftSubscription, status: event.target.value })} className="w-full rounded-xl border border-border px-3 py-2 text-messageInput text-textPrimary">
                  {subscriptionStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sectionLabel text-textSecondary">Тариф</span>
                <select value={draftSubscription.plan_id || ""} onChange={(event) => setDraftSubscription({ ...draftSubscription, plan_id: event.target.value || null })} className="w-full rounded-xl border border-border px-3 py-2 text-messageInput text-textPrimary">
                  <option value="">Без тарифа</option>
                  {draftPlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sectionLabel text-textSecondary">Конец trial</span>
                <input type="date" value={toDateInputValue(draftSubscription.trial_ends_at)} onChange={(event) => setDraftSubscription({ ...draftSubscription, trial_ends_at: fromDateInputValue(event.target.value) })} className="w-full rounded-xl border border-border px-3 py-2 text-messageInput text-textPrimary" />
              </label>
              <label className="space-y-2">
                <span className="text-sectionLabel text-textSecondary">Оплачено до</span>
                <input type="date" value={toDateInputValue(draftSubscription.current_period_ends_at)} onChange={(event) => setDraftSubscription({ ...draftSubscription, current_period_ends_at: fromDateInputValue(event.target.value) })} className="w-full rounded-xl border border-border px-3 py-2 text-messageInput text-textPrimary" />
              </label>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-settingsRowTitle text-textPrimary">
                <input type="checkbox" checked={draftSubscription.auto_renew} onChange={(event) => setDraftSubscription({ ...draftSubscription, auto_renew: event.target.checked })} />
                Автопродление
              </label>
              <label className="flex items-center gap-2 text-settingsRowTitle text-textPrimary">
                <input type="checkbox" checked={draftSubscription.cancel_at_period_end} onChange={(event) => setDraftSubscription({ ...draftSubscription, cancel_at_period_end: event.target.checked })} />
                Отменить в конце периода
              </label>
            </div>
            <button type="button" onClick={() => onSaveSubscription(draftSubscription)} className="mt-4 rounded-xl bg-primary px-4 py-2 text-buttonLabel text-surface">
              Сохранить подписку
            </button>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="text-navigationTitle text-textPrimary">История платежей</h3>
            <div className="mt-3 divide-y divide-border">
              {state?.payments.length ? state.payments.map((payment) => (
                <div key={payment.id} className="grid gap-1 py-3 text-settingsRowDescription md:grid-cols-[1fr_auto_auto] md:items-center">
                  <span className="text-conversationName">{formatAdminDate(payment.created_at)}</span>
                  <span>{formatAdminMoney(payment.amount, payment.currency)}</span>
                  <span><StatusBadge status={payment.status} /></span>
                  <span className="text-messageMetadata text-textSecondary md:col-span-3">{payment.duration_months} мес. {payment.payment_method_title ? `· ${payment.payment_method_title}` : ""}</span>
                </div>
              )) : <p className="text-settingsRowDescription text-textSecondary">Платежей пока нет.</p>}
            </div>
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-surface p-4 text-settingsRowDescription text-textSecondary">{loading ? "Загружаем подписку..." : "Подписка не загружена."}</p>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {draftPlans.map((plan) => (
          <div key={plan.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 sm:col-span-2">
                <span className="text-sectionLabel text-textSecondary">Название тарифа</span>
                <input value={plan.name} onChange={(event) => updatePlan(plan.id, { name: event.target.value })} className="w-full rounded-xl border border-border px-3 py-2 text-messageInput text-textPrimary" />
              </label>
              <label className="space-y-2">
                <span className="text-sectionLabel text-textSecondary">Месяцев</span>
                <input type="number" min="1" value={plan.duration_months} onChange={(event) => updatePlan(plan.id, { duration_months: Number(event.target.value) })} className="w-full rounded-xl border border-border px-3 py-2 text-messageInput text-textPrimary" />
              </label>
              <label className="space-y-2">
                <span className="text-sectionLabel text-textSecondary">Цена, руб.</span>
                <input type="number" min="0" value={plan.price / 100} onChange={(event) => updatePlan(plan.id, { price: Math.round(Number(event.target.value) * 100) })} className="w-full rounded-xl border border-border px-3 py-2 text-messageInput text-textPrimary" />
              </label>
              <label className="space-y-2">
                <span className="text-sectionLabel text-textSecondary">Скидка, %</span>
                <input type="number" min="0" value={plan.discount_percent} onChange={(event) => updatePlan(plan.id, { discount_percent: Number(event.target.value) })} className="w-full rounded-xl border border-border px-3 py-2 text-messageInput text-textPrimary" />
              </label>
              <label className="space-y-2">
                <span className="text-sectionLabel text-textSecondary">Порядок</span>
                <input type="number" value={plan.sort_order} onChange={(event) => updatePlan(plan.id, { sort_order: Number(event.target.value) })} className="w-full rounded-xl border border-border px-3 py-2 text-messageInput text-textPrimary" />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-settingsRowTitle text-textPrimary">
                <input type="checkbox" checked={plan.is_active} onChange={(event) => updatePlan(plan.id, { is_active: event.target.checked })} />
                Активен
              </label>
              <button type="button" onClick={() => onSavePlan(plan)} className="rounded-xl border border-border px-4 py-2 text-buttonLabel text-textPrimary hover:bg-background">
                Сохранить тариф
              </button>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function TelegramAdminPanel({
  loading,
  onRefresh,
  onRunReminders,
  status,
}: {
  loading: boolean;
  onRefresh: () => void;
  onRunReminders: () => void;
  status: TelegramAdminStatus | null;
}) {
  return (
    <article className="saas-card space-y-4 p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sectionLabel text-textSecondary">Telegram bot</p>
          <h2 className="mt-1 text-navigationTitle text-textPrimary">Управление напоминаниями</h2>
          <p className="mt-1 text-settingsRowDescription text-textSecondary">
            Polling работает локально, webhook не используется. Токен в панели не показывается.
          </p>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-xl border border-border bg-surface px-4 py-2 text-buttonLabel text-textPrimary disabled:opacity-60"
          >
            Обновить Telegram
          </button>
          <button
            type="button"
            onClick={onRunReminders}
            disabled={loading}
            className="rounded-xl bg-primary px-4 py-2 text-buttonLabel text-surface disabled:opacity-60"
          >
            Запустить проверку
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Токен" value={status?.config.tokenConfigured ? "Настроен" : "Нет"} />
        <Metric label="Polling" value={status?.config.pollingEnabled ? "Включен" : "Выключен"} />
        <Metric label="Клиентов в Telegram" value={String(status?.stats.connectedClients ?? 0)} />
        <Metric label="Напоминаний отправлено" value={String(status?.stats.sentReminders ?? 0)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-conversationName text-textPrimary">Бот</p>
          <p className="mt-1 text-settingsRowDescription text-textSecondary">@{status?.config.username || "не указан"}</p>
          {status?.config.botUrl ? (
            <a href={status.config.botUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-xl border border-border px-3 py-2 text-buttonLabel text-primary">
              Открыть бота
            </a>
          ) : (
            <p className="mt-3 text-settingsRowDescription text-textSecondary">TELEGRAM_BOT_USERNAME не настроен.</p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-background p-3">
              <p className="text-messageMetadata text-textSecondary">Чатов известно</p>
              <p className="mt-1 text-badge text-textPrimary">{status?.stats.knownChats ?? 0}</p>
            </div>
            <div className="rounded-lg bg-background p-3">
              <p className="text-messageMetadata text-textSecondary">Токенов ожидают</p>
              <p className="mt-1 text-badge text-textPrimary">{status?.stats.pendingTokens ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-conversationName text-textPrimary">Последние подключения</p>
          <div className="mt-3 space-y-2">
            {status?.recentClients.length ? (
              status.recentClients.map((client) => (
                <div key={`${client.masterName}-${client.phone}`} className="grid gap-1 rounded-lg bg-background p-3 text-settingsRowDescription md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-conversationName text-textPrimary">{client.name}</p>
                    <p className="truncate text-textSecondary">{client.masterName} · {client.phone}</p>
                  </div>
                  <p className="truncate text-textSecondary">{client.telegramUsername ? `@${client.telegramUsername}` : "без username"}</p>
                </div>
              ))
            ) : (
              <p className="text-settingsRowDescription text-textSecondary">Пока нет подключённых Telegram-клиентов.</p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="saas-card p-5">
      <p className="text-sectionLabel text-textSecondary">{label}</p>
      <p className="mt-2 break-words text-displayLarge text-textPrimary">{value}</p>
    </article>
  );
}

function DataList({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <article className="saas-card p-5">
      <h3 className="text-navigationTitle text-textPrimary">{title}</h3>
      <div className="mt-4 space-y-3">{hasItems ? children : <p className="text-settingsRowDescription text-textSecondary">{empty}</p>}</div>
    </article>
  );
}


