"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const normalizeEmail = (value: string) => value.trim().toLowerCase();

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  const register = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = normalizeEmail(email);
    const normalizedName = name.trim();

    if (!normalizedName || !normalizedEmail || password.length < 6) {
      setError("Введите имя мастера, email и пароль от 6 символов.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          name: normalizedName,
          password,
        }),
      });

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        setError(data.error || "Не удалось создать аккаунт.");
        return;
      }

      router.replace("/dashboard");
    } catch {
      setError("Не удалось подключиться к серверу.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-transparent px-4 py-6 text-textPrimary md:py-8">
      <section className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1fr_0.9fr] md:items-center">
        <div>
          <Link href="/" className="text-buttonLabel text-primary">
            Beauty Time
          </Link>
          <h1 className="mt-5 text-screenTitle">Регистрация мастера</h1>
          <p className="mt-4 max-w-xl text-profileDescription text-textSecondary">
            Создайте личный кабинет по email. Аккаунт будет храниться на сервере и работать на разных устройствах.
          </p>
        </div>

        <form onSubmit={register} className="saas-card space-y-4 p-4 sm:p-6">
          <label className="space-y-2">
            <span className="text-sectionLabel text-textSecondary">Имя мастера</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-border px-4 py-3 text-messageInput text-textPrimary"
              placeholder="Анна Смирнова"
              required
            />
          </label>
          <label className="space-y-2">
            <span className="text-sectionLabel text-textSecondary">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-border px-4 py-3 text-messageInput text-textPrimary"
              placeholder="anna@mail.com"
              required
            />
          </label>
          <label className="space-y-2">
            <span className="text-sectionLabel text-textSecondary">Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-border px-4 py-3 text-messageInput text-textPrimary"
              minLength={6}
              required
            />
          </label>

          {error && <p className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-systemMessage text-danger">{error}</p>}

          <button type="submit" disabled={isLoading} className="w-full rounded-2xl bg-primary px-5 py-3 text-buttonLabel text-surface disabled:opacity-60">
            {isLoading ? "Создаём..." : "Создать кабинет"}
          </button>
          <p className="text-systemMessage text-textSecondary">
            Уже есть кабинет?{" "}
            <Link href="/login" className="text-buttonLabel text-primary">
              Войти
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
