export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  const { ensureTelegramRuntimeStarted } = await import("./lib/telegram-runtime");
  ensureTelegramRuntimeStarted();
}
