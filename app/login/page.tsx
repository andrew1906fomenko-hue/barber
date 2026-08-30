"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const normalizeEmail = (value: string) => value.trim().toLowerCase();

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.body.classList.remove("dark-theme");
    window.localStorage.setItem("dashboard-theme", "light");
    router.prefetch("/dashboard");

    let active = true;
    void fetch("/api/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { success?: boolean } | null) => {
        if (active && data?.success) router.replace("/dashboard");
      })
      .catch(() => {
        // Keep the manual form available if the session check fails.
      });

    return () => {
      active = false;
    };
  }, [router]);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setStatus("");

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      setError("Введите email и пароль.");
      return;
    }

    setIsLoading(true);
    setStatus("Проверяем данные...");

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        credentials: "same-origin",
        signal: controller.signal,
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
        setError(data.error || "Не удалось войти. Проверьте email и пароль.");
        setStatus("");
        return;
      }

      setStatus("Вход выполнен. Открываем кабинет...");

      window.localStorage.setItem("dashboard-session-email", normalizedEmail);
      router.replace("/dashboard");
    } catch (loginError) {
      const message =
        loginError instanceof DOMException && loginError.name === "AbortError"
          ? "Сервер долго не отвечает. Проверьте подключение к базе данных и попробуйте еще раз."
          : "Не удалось подключиться к серверу. Попробуйте еще раз.";
      setError(message);
      setStatus("");
    } finally {
      window.clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen px-4 py-6 text-textPrimary md:py-8"
    >
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-6 md:grid-cols-[1fr_0.9fr] md:items-center">
        <div
          className="rounded-3xl p-5 backdrop-blur md:p-0"
          style={{
            background: "rgb(var(--color-surface) / 0.62)",
            boxShadow: "0 20px 60px rgb(var(--color-text-primary) / 0.08)",
          }}
        >
          <Link href="/" className="text-buttonLabel text-primary">
            Beauty Time
          </Link>
          <h1 className="mt-5 text-screenTitle">Вход в кабинет</h1>
          <p className="mt-4 max-w-xl text-profileDescription text-textSecondary">
            Откройте личный кабинет мастера по email и продолжайте работу со своими записями, услугами и страницей записи.
          </p>
        </div>

        <form
          onSubmit={login}
          className="rounded-3xl p-4 backdrop-blur sm:p-6"
          style={{
            background: "rgb(var(--color-surface) / 0.96)",
            border: "1px solid rgb(var(--color-surface) / 0.88)",
            boxShadow: "0 24px 70px rgb(var(--color-text-primary) / 0.14)",
          }}
        >
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sectionLabel text-textSecondary">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error) setError("");
                  if (status) setStatus("");
                }}
                className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-messageInput text-textPrimary"
                autoComplete="email"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sectionLabel text-textSecondary">Пароль</span>
              <input
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (error) setError("");
                  if (status) setStatus("");
                }}
                className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-messageInput text-textPrimary"
                autoComplete="current-password"
                required
              />
            </label>
          </div>

          {error && (
            <p className="mt-4 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-systemMessage text-danger" role="alert" aria-live="polite">
              {error}
            </p>
          )}

          {status && !error && (
            <p className="mt-4 rounded-2xl border border-info/20 bg-info/10 px-4 py-3 text-systemMessage text-info" role="status" aria-live="polite">
              {status}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-5 w-full rounded-2xl bg-primary px-5 py-3 text-buttonLabel text-surface shadow-[0_12px_28px_rgb(var(--color-primary)_/_0.24)] transition hover:bg-primaryPressed disabled:cursor-not-allowed disabled:bg-textDisabled disabled:opacity-70"
          >
            {isLoading ? "Входим..." : "Войти"}
          </button>

          <p className="mt-4 text-systemMessage text-textSecondary">
            Нет кабинета?{" "}
            <Link href="/register" className="text-buttonLabel text-primary">
              Зарегистрироваться
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
