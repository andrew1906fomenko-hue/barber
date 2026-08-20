CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS masters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  notes TEXT DEFAULT '',
  profession TEXT DEFAULT '',
  description TEXT DEFAULT '',
  city TEXT DEFAULT '',
  address TEXT DEFAULT '',
  is_online BOOLEAN DEFAULT FALSE,
  phone TEXT DEFAULT '',
  contact_link TEXT DEFAULT '',
  social_links JSONB DEFAULT '{}'::jsonb,
  cover_image_url TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  cover_position_x INTEGER DEFAULT 50,
  cover_position_y INTEGER DEFAULT 50,
  timezone TEXT DEFAULT 'Europe/Moscow',
  primary_color TEXT DEFAULT '#0EA5E9',
  button_color TEXT DEFAULT '#0EA5E9',
  cta_text TEXT DEFAULT 'Записаться',
  visible_sections JSONB DEFAULT '{"cover":true,"avatar":true,"description":true,"masterComment":true,"contacts":true,"socials":true,"services":true,"serviceImages":false,"serviceCards":false,"serviceCardStyle":"stack"}'::jsonb,
  required_fields JSONB DEFAULT '{"name":true,"phone":true,"email":false,"telegram":false}'::jsonb,
  work_start TEXT DEFAULT '10:00',
  work_end TEXT DEFAULT '20:00',
  slot_step_min INTEGER DEFAULT 30,
  buffer_min INTEGER DEFAULT 0,
  work_days JSONB DEFAULT '[1,2,3,4,5]'::jsonb,
  booking_enabled BOOLEAN DEFAULT TRUE,
  auto_time_snap BOOLEAN DEFAULT TRUE,
  weekly_schedule JSONB DEFAULT '{}'::jsonb,
  show_price BOOLEAN DEFAULT TRUE,
  min_booking_notice_min INTEGER DEFAULT 0,
  max_booking_days_ahead INTEGER DEFAULT 14,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  price INTEGER NOT NULL,
  duration_min INTEGER NOT NULL,
  notes TEXT DEFAULT '',
  description TEXT DEFAULT '',
  category TEXT DEFAULT '',
  included_items JSONB DEFAULT '[]'::jsonb,
  material_name TEXT DEFAULT '',
  material_cost INTEGER DEFAULT 0,
  price_from BOOLEAN DEFAULT FALSE,
  photo_url TEXT DEFAULT '',
  calendar_color TEXT DEFAULT '#0f766e',
  sort_order INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
  service_id UUID,
  service_ids JSONB DEFAULT '[]'::jsonb,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT DEFAULT '',
  client_telegram TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  notes TEXT DEFAULT '',
  cancel_token TEXT DEFAULT gen_random_uuid()::text,
  reschedule_token TEXT DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  normalized_phone TEXT NOT NULL,
  notes TEXT DEFAULT '',
  telegram_chat_id TEXT DEFAULT '',
  telegram_username TEXT DEFAULT '',
  telegram_connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(master_id, normalized_phone)
);

CREATE TABLE IF NOT EXISTS telegram_connect_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS telegram_connect_tokens_token_idx
ON telegram_connect_tokens (token);

CREATE TABLE IF NOT EXISTS telegram_chats (
  chat_id TEXT PRIMARY KEY,
  username TEXT DEFAULT '',
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS telegram_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(appointment_id, reminder_type)
);

CREATE TABLE IF NOT EXISTS off_days (
  master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  PRIMARY KEY(master_id, day)
);

CREATE TABLE IF NOT EXISTS blocked_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  reason TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  duration_months INTEGER NOT NULL CHECK (duration_months > 0),
  price INTEGER NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'RUB',
  discount_percent INTEGER NOT NULL DEFAULT 0 CHECK (discount_percent >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID UNIQUE REFERENCES masters(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'trial',
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  current_period_started_at TIMESTAMPTZ,
  current_period_ends_at TIMESTAMPTZ,
  auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
  auto_renew_plan_id UUID REFERENCES subscription_plans(id),
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  payment_method_token TEXT,
  provider_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'RUB',
  duration_months INTEGER NOT NULL CHECK (duration_months > 0),
  status TEXT NOT NULL DEFAULT 'pending',
  idempotency_key TEXT UNIQUE NOT NULL,
  provider_payment_id TEXT UNIQUE,
  payment_url TEXT,
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_code TEXT,
  failure_message TEXT,
  payment_method_title TEXT,
  receipt_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  external_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  unique_key TEXT UNIQUE NOT NULL
);

CREATE INDEX IF NOT EXISTS subscriptions_master_idx ON subscriptions (master_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions (status);
CREATE INDEX IF NOT EXISTS subscriptions_period_ends_idx ON subscriptions (current_period_ends_at);
CREATE INDEX IF NOT EXISTS subscription_orders_master_idx ON subscription_orders (master_id);
CREATE INDEX IF NOT EXISTS subscription_orders_status_idx ON subscription_orders (status);
