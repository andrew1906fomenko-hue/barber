"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type MasterAccount = {
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
        showToast(data.error || "Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р В·Р В°Р С–РЎР‚РЎС“Р В·Р С‘РЎвЂљРЎРЉ Р СР В°РЎРѓРЎвЂљР ВµРЎР‚Р С•Р Р†");
        return;
      }

      setAccounts(data.users);
      setSelectedEmail((current) => (current && data.users!.some((account) => account.email === current) ? current : data.users![0]?.email || ""));
    } catch {
      showToast("Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р С—Р С•Р Т‘Р С”Р В»РЎР‹РЎвЂЎР С‘РЎвЂљРЎРЉРЎРѓРЎРЏ Р С” РЎРѓР ВµРЎР‚Р Р†Р ВµРЎР‚РЎС“");
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  };

  useEffect(() => {
    if (isAuthorized) {
      void refresh();
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

  const login = (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== adminPassword) {
      showToast("РќРµРІРµСЂРЅС‹Р№ РїР°СЂРѕР»СЊ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°");
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
      showToast("РўР°РєР°СЏ СЃСЃС‹Р»РєР° СѓР¶Рµ Р·Р°РЅСЏС‚Р°");
      return;
    }

    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: selectedAccount.email, [field]: normalizedValue }),
    });
    await refresh();
    showToast("Р”Р°РЅРЅС‹Рµ СЃРѕС…СЂР°РЅРµРЅС‹");
  };

  const toggleBookingName = () => {
    showToast("РРјСЏ РјР°СЃС‚РµСЂР° Р±РµСЂРµС‚СЃСЏ РёР· PostgreSQL.");
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
      showToast("РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РєСЂС‹С‚СЊ РєР°Р±РёРЅРµС‚ РјР°СЃС‚РµСЂР°.");
    }
  };

  const deleteMaster = async () => {
    if (!selectedAccount) return;
    const approved = window.confirm(`РЈРґР°Р»РёС‚СЊ РјР°СЃС‚РµСЂР° ${selectedAccount.email} Рё РІСЃРµ РµРіРѕ РґР°РЅРЅС‹Рµ?`);
    if (!approved) return;

    await fetch(`/api/users?email=${encodeURIComponent(selectedAccount.email)}`, { method: "DELETE" });
    await refresh();
    showToast("РњР°СЃС‚РµСЂ СѓРґР°Р»РµРЅ");
  };

  if (!isAuthorized) {
    return (
      <main className="min-h-screen bg-section px-4 py-8 text-text">
        <section className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1fr_0.85fr] md:items-center">
          <div>
            <Link href="/" className="text-sm font-semibold text-accent">
              Beauty Time
            </Link>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">РђРґРјРёРЅ-РїР°РЅРµР»СЊ</h1>
            <p className="mt-4 max-w-xl text-lg text-muted">РЈРїСЂР°РІР»РµРЅРёРµ РјР°СЃС‚РµСЂР°РјРё, РєР°Р±РёРЅРµС‚Р°РјРё, Р·Р°РїРёСЃСЏРјРё, СѓСЃР»СѓРіР°РјРё Рё РїСѓР±Р»РёС‡РЅС‹РјРё СЃСЃС‹Р»РєР°РјРё.</p>
          </div>

          <form onSubmit={login} className="saas-card space-y-4 p-6">
            <label className="space-y-2">
              <span className="text-sm font-medium text-muted">РџР°СЂРѕР»СЊ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-border px-4 py-3"
                placeholder="admin"
              />
            </label>
            <button type="submit" className="w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-white">
              Р’РѕР№С‚Рё
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
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">РђРґРјРёРЅ-РїР°РЅРµР»СЊ</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={refresh} className="rounded-xl border border-border bg-white px-4 py-2 font-semibold text-text">
              РћР±РЅРѕРІРёС‚СЊ
            </button>
            <button type="button" onClick={logoutAdmin} className="rounded-xl border border-border bg-white px-4 py-2 font-semibold text-text">
              Р’С‹Р№С‚Рё
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="РњР°СЃС‚РµСЂРѕРІ" value={accounts.length.toString()} />
          <Metric label="РЈСЃР»СѓРі" value={totals.services.toString()} />
          <Metric label="Р—Р°РїРёСЃРµР№" value={totals.appointments.toString()} />
          <Metric label="Р’С‹СЂСѓС‡РєР°" value={`${totals.revenue.toLocaleString("ru-RU")} СЂСѓР±.`} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <aside className="saas-card h-fit space-y-4 p-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-xl border border-border px-4 py-3"
              placeholder="РџРѕРёСЃРє РїРѕ email, РёРјРµРЅРё РёР»Рё СЃСЃС‹Р»РєРµ"
            />

            <div className="space-y-2">
              {filteredAccounts.length === 0 ? (
                <p className="rounded-xl bg-white p-4 text-muted">РњР°СЃС‚РµСЂРѕРІ РїРѕРєР° РЅРµС‚.</p>
              ) : (
                filteredAccounts.map((account) => {
                  const profile = getProfile(account);
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
                      <p className="mt-1 text-sm text-accent">/m/{profile.slug} В· {account.appointmentsCount} Р·Р°РїРёСЃРµР№</p>
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
                      Р’РѕР№С‚Рё РєР°Рє РјР°СЃС‚РµСЂ
                    </button>
                    <button type="button" onClick={deleteMaster} className="rounded-xl border border-red-200 bg-white px-4 py-2 font-semibold text-red-700">
                      РЈРґР°Р»РёС‚СЊ
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-muted">РРјСЏ РјР°СЃС‚РµСЂР°</span>
                    <input
                      key={`name-${selectedAccount.email}`}
                      defaultValue={selectedProfile.displayName || selectedAccount.name}
                      onBlur={(event) => updateAccount("name", event.target.value)}
                      className="w-full rounded-xl border border-border px-4 py-3"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-muted">РЎСЃС‹Р»РєР°</span>
                    <input
                      key={`slug-${selectedAccount.email}`}
                      defaultValue={selectedProfile.slug}
                      onBlur={(event) => updateAccount("slug", event.target.value)}
                      pattern="[a-z0-9-]+"
                      className="w-full rounded-xl border border-border px-4 py-3"
                    />
                    <span className="block text-xs text-muted">РўРѕР»СЊРєРѕ Р»Р°С‚РёРЅРёС†Р°, С†РёС„СЂС‹ Рё РґРµС„РёСЃ.</span>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-muted">РќРѕРІС‹Р№ РїР°СЂРѕР»СЊ</span>
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
                    {selectedProfile.showOnBookingPage ? "РРјСЏ РІРёРґРЅРѕ РєР»РёРµРЅС‚Р°Рј" : "РРјСЏ СЃРєСЂС‹С‚Рѕ"}
                  </button>
                  <Link href={`/m/${selectedProfile.slug}`} target="_blank" className="break-all text-sm font-semibold text-accent">
                    {typeof window === "undefined" ? `/m/${selectedProfile.slug}` : `${window.location.origin}/m/${selectedProfile.slug}`}
                  </Link>
                </div>
              </article>

              <section className="grid gap-5 lg:grid-cols-2">
                <DataList title="РЈСЃР»СѓРіРё" empty="РЈСЃР»СѓРі РїРѕРєР° РЅРµС‚">
                  {selectedServices.map((service) => (
                    <article key={service.id} className="rounded-xl border border-border bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold">{service.title}</p>
                          <p className="text-sm text-muted">{service.category || "Р‘РµР· РєР°С‚РµРіРѕСЂРёРё"}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${service.active ? "bg-accentSoft text-accent" : "bg-section text-muted"}`}>
                          {service.active ? "РђРєС‚РёРІРЅР°" : "РЎРєСЂС‹С‚Р°"}
                        </span>
                      </div>
                      <p className="mt-2 text-muted">{service.duration} РјРёРЅ В· {service.price.toLocaleString("ru-RU")} СЂСѓР±.</p>
                    </article>
                  ))}
                </DataList>

                <DataList title="Р—Р°РїРёСЃРё" empty="Р—Р°РїРёСЃРµР№ РїРѕРєР° РЅРµС‚">
                  {selectedAppointments
                    .slice()
                    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
                    .map((appointment) => {
                      const service = selectedServices.find((item) => item.id === appointment.serviceId);
                      return (
                        <article key={appointment.id} className="rounded-xl border border-border bg-white p-4">
                          <p className="text-lg font-semibold">{appointment.date} В· {appointment.time}</p>
                          <p className="text-muted">{appointment.client} В· {appointment.phone}</p>
                          <p className="mt-1 text-sm text-muted">{service?.title || "РЈСЃР»СѓРіР° СѓРґР°Р»РµРЅР°"} В· {appointment.status}</p>
                        </article>
                      );
                    })}
                </DataList>
              </section>
            </section>
          ) : (
            <article className="saas-card p-6 text-muted">Р—Р°СЂРµРіРёСЃС‚СЂРёСЂСѓР№С‚Рµ РїРµСЂРІРѕРіРѕ РјР°СЃС‚РµСЂР°, С‡С‚РѕР±С‹ Р·РґРµСЃСЊ РїРѕСЏРІРёР»РёСЃСЊ РґР°РЅРЅС‹Рµ.</article>
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


