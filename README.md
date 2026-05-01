# FastBook SaaS UI (Next.js + Tailwind)

Новая версия интерфейса выполнена в стиле premium SaaS (Railway/Linear/Vercel):
- светлая минималистичная тема,
- крупная типографика,
- мягкие карточки и тени,
- акцентный розово-коралловый цвет,
- mobile-first адаптация.

## Экраны
- `/` — Landing page
- `/booking` — Client booking page
- `/m/[slug]` — публичная страница записи мастера (например `/m/anna-nails`)
- `/dashboard` — Master dashboard (разделы: Главная, Записи, Клиенты, Услуги, Расписание, Ссылка для записи, Настройки)

## Запуск UI
```bash
npm install
npm run dev
```
Открыть: `http://localhost:3000`

## Production build
```bash
npm run build
npm start
```

## Backend
Старый Express API сохранён в `server.js` (для будущего подключения данных):
```bash
npm run api
```

## Стек
- Next.js (App Router)
- React
- Tailwind CSS
- TypeScript
