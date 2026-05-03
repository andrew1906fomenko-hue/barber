"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type MasterAccount = {
  email: string;
  name: string;
  password: string;
  slug: string;
  createdAt: string;
};

const accountsKey = "barber-master-accounts";
const sessionKey = "barber-master-session";

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "master";

const getStoredAccounts = () => {
  try {
    return JSON.parse(window.localStorage.getItem(accountsKey) || "[]") as MasterAccount[];
  } catch {
    return [];
  }
};

const getMasterStorageKey = (email: string, key: string) => `barber-master:${email}:${key}`;

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const register = (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = normalizeEmail(email);
    const normalizedName = name.trim();
    const slug = normalizeSlug(normalizedEmail.split("@")[0]);

    if (!normalizedName || !normalizedEmail || password.length < 6) {
      setError("Введите имя мастера, email и пароль от 6 символов.");
      return;
    }

    const accounts = getStoredAccounts();
    if (accounts.some((account) => account.email === normalizedEmail)) {
      setError("Аккаунт с таким email уже существует.");
      return;
    }

    const uniqueSlug = accounts.some((account) => account.slug === slug) ? `${slug}-${Date.now().toString().slice(-4)}` : slug;
    const account: MasterAccount = {
      email: normalizedEmail,
      name: normalizedName,
      password,
      slug: uniqueSlug,
      createdAt: new Date().toISOString(),
    };

    window.localStorage.setItem(accountsKey, JSON.stringify([...accounts, account]));
    window.localStorage.setItem(sessionKey, JSON.stringify({ email: normalizedEmail }));
    window.localStorage.setItem(
      getMasterStorageKey(normalizedEmail, "master-profile"),
      JSON.stringify({ displayName: normalizedName, slug: uniqueSlug, showOnBookingPage: true }),
    );
    router.replace("/dashboard");
  };

  return (
    <main className="min-h-screen bg-section px-4 py-8 text-text">
      <section className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1fr_0.9fr] md:items-center">
        <div>
          <Link href="/" className="text-sm font-semibold text-accent">
            Beauty Time
          </Link>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">Регистрация мастера</h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Создайте личный кабинет по email. У каждого мастера будут свои услуги, записи, ссылка и QR-код.
          </p>
        </div>

        <form onSubmit={register} className="saas-card space-y-4 p-6">
          <label className="space-y-2">
            <span className="text-sm font-medium text-muted">Имя мастера</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-border px-4 py-3"
              placeholder="Анна Смирнова"
              required
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-muted">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-border px-4 py-3"
              placeholder="anna@mail.com"
              required
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-muted">Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-border px-4 py-3"
              minLength={6}
              required
            />
          </label>

          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          <button type="submit" className="w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-white">
            Создать кабинет
          </button>
          <p className="text-center text-sm text-muted">
            Уже есть кабинет?{" "}
            <Link href="/login" className="font-semibold text-accent">
              Войти
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
