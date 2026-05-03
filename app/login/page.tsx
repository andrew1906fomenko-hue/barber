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

const getStoredAccounts = () => {
  try {
    return JSON.parse(window.localStorage.getItem(accountsKey) || "[]") as MasterAccount[];
  } catch {
    return [];
  }
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = normalizeEmail(email);
    const account = getStoredAccounts().find((item) => item.email === normalizedEmail && item.password === password);

    if (!account) {
      setError("Неверный email или пароль.");
      return;
    }

    window.localStorage.setItem(sessionKey, JSON.stringify({ email: account.email }));
    router.replace("/dashboard");
  };

  return (
    <main className="min-h-screen bg-section px-4 py-8 text-text">
      <section className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1fr_0.9fr] md:items-center">
        <div>
          <Link href="/" className="text-sm font-semibold text-accent">
            Beauty Time
          </Link>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">Вход в кабинет</h1>
          <p className="mt-4 max-w-xl text-lg text-muted">Откройте личный кабинет мастера по email и продолжайте работу со своими записями.</p>
        </div>

        <form onSubmit={login} className="saas-card space-y-4 p-6">
          <label className="space-y-2">
            <span className="text-sm font-medium text-muted">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-border px-4 py-3"
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
              required
            />
          </label>

          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          <button type="submit" className="w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-white">
            Войти
          </button>
          <p className="text-center text-sm text-muted">
            Нет кабинета?{" "}
            <Link href="/register" className="font-semibold text-accent">
              Зарегистрироваться
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
