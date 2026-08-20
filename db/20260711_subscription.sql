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

INSERT INTO subscription_plans (code, name, duration_months, price, currency, discount_percent, is_active, sort_order)
VALUES
  ('month_1', '1 месяц', 1, 490, 'RUB', 0, TRUE, 10),
  ('month_2', '2 месяца', 2, 980, 'RUB', 0, TRUE, 20),
  ('month_3', '3 месяца', 3, 1470, 'RUB', 0, TRUE, 30),
  ('month_6', '6 месяцев', 6, 2940, 'RUB', 0, TRUE, 40),
  ('month_12', '12 месяцев', 12, 5880, 'RUB', 0, TRUE, 50)
ON CONFLICT (code) DO NOTHING;

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
