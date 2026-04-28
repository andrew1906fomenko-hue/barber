import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FastBook SaaS",
  description: "Онлайн-запись для мастеров бьюти-сферы",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
