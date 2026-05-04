"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const normalizeEmail = (value: string) => value.trim().toLowerCase();

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      setError("Введите email и пароль.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        setError(data.error || "Не удалось войти.");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Не удалось подключиться к серверу.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-section px-4 py-8 text-text">
      <section className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1fr_0.9fr] md:items-center">
        <div>
          <Link href="/" className="text-sm font-semibold text-accent">
            Beauty Time
          </Link>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">Вход в кабинет</h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Откройте личный кабинет мастера по email и продолжайте работу со своими записями.
          </p>
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

          <button type="submit" disabled={isLoading} className="w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-white disabled:opacity-60">
            {isLoading ? "Входим..." : "Войти"}
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
