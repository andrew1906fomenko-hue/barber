import { cookies } from "next/headers";
import { Pool } from "pg";
import { LocalPool } from "./local-db";

const globalForPg = globalThis as typeof globalThis & {
  pgPool?: Pool;
  localPool?: LocalPool;
};

const databaseUrl = process.env.DATABASE_URL;
const useLocalDb = process.env.USE_LOCAL_DB === "1" || !databaseUrl;
const allowLocalDbFallback = process.env.ALLOW_LOCAL_DB_FALLBACK === "1";
const needsSsl =
  databaseUrl?.includes("supabase.co") || databaseUrl?.includes("pooler.supabase.com") || databaseUrl?.includes("sslmode=require");
const poolConfig = {
  connectionString: databaseUrl,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
};

const localPool = globalForPg.localPool ?? new LocalPool();
const pgPool = !useLocalDb ? (globalForPg.pgPool ?? new Pool(poolConfig as ConstructorParameters<typeof Pool>[0])) : null;

const isConnectionError = (error: unknown) => {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
  return ["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT"].includes(code);
};

export const pool = {
  async query<T = unknown>(sql: string, params: unknown[] = []) {
    if (useLocalDb || !pgPool) {
      return localPool.query<T>(sql, params);
    }

    try {
      return await pgPool.query<T>(sql, params);
    } catch (error) {
      if (!isConnectionError(error)) throw error;
      if (!allowLocalDbFallback) throw error;
      console.warn("Remote database is unavailable, falling back to local JSON database because ALLOW_LOCAL_DB_FALLBACK=1.");
      return localPool.query<T>(sql, params);
    }
  },
};

if (process.env.NODE_ENV !== "production") {
  globalForPg.localPool = localPool;
  if (pgPool) globalForPg.pgPool = pgPool;
}

let initPromise: Promise<void> | null = null;

export type UserRow = {
  id: string;
  email: string;
  password: string;
  name: string;
  created_at: string;
};

export type MasterRow = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  notes: string;
  profession: string;
  description: string;
  city: string;
  address: string;
  is_online: boolean;
  phone: string;
  contact_link: string;
  social_links: Record<string, string>;
  cover_image_url: string;
  avatar_url: string;
  cover_position_x: number;
  cover_position_y: number;
  timezone: string;
  primary_color: string;
  button_color: string;
  cta_text: string;
  visible_sections: Record<string, boolean>;
  required_fields: Record<string, boolean>;
  work_start: string;
  work_end: string;
  slot_step_min: number;
  buffer_min: number;
  work_days: number[];
  booking_enabled: boolean;
  auto_time_snap: boolean;
  weekly_schedule: Record<string, unknown>;
  show_price: boolean;
  max_booking_days_ahead: number;
  created_at: string;
  updated_at: string;
};

export const normalizeClientPhone = (value: string) => value.replace(/\D/g, "");

export async function initDb() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!useLocalDb && !process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }

    await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    await pool.query(`
      DO $$
      DECLARE
        current_user_id_type TEXT;
      BEGIN
        SELECT data_type INTO current_user_id_type
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'id';

        IF current_user_id_type IS NOT NULL AND current_user_id_type <> 'uuid' THEN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables WHERE table_name = 'users_legacy_serial'
          ) THEN
            ALTER TABLE users RENAME TO users_legacy_serial;
          ELSE
            RAISE EXCEPTION 'users.id must be UUID, and users_legacy_serial already exists';
          END IF;
        END IF;
      END $$;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash'
        ) THEN
          EXECUTE 'UPDATE users SET password = password_hash WHERE password IS NULL';
          EXECUTE 'ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL';
        END IF;
      END $$;
      UPDATE users SET password = '' WHERE password IS NULL;
      UPDATE users SET name = split_part(email, '@', 1) WHERE name IS NULL OR name = '';
      ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();
      ALTER TABLE users ALTER COLUMN password SET NOT NULL;
      ALTER TABLE users ALTER COLUMN name SET NOT NULL;
    `);
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users_legacy_serial') THEN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns WHERE table_name = 'users_legacy_serial' AND column_name = 'password_hash'
          ) THEN
            EXECUTE '
              INSERT INTO users (email, password, name, created_at)
              SELECT email, COALESCE(password_hash, ''''), COALESCE(NULLIF(name, ''''), split_part(email, ''@'', 1)), created_at
              FROM users_legacy_serial
              ON CONFLICT (email) DO NOTHING
            ';
          ELSE
            EXECUTE '
              INSERT INTO users (email, password, name, created_at)
              SELECT email, COALESCE(password, ''''), COALESCE(NULLIF(name, ''''), split_part(email, ''@'', 1)), created_at
              FROM users_legacy_serial
              ON CONFLICT (email) DO NOTHING
            ';
          END IF;
        END IF;
      END $$;
    `);
    await pool.query(`
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
        visible_sections JSONB DEFAULT '{"cover":true,"avatar":true,"description":true,"masterComment":true,"contacts":true,"socials":true,"services":true}'::jsonb,
        required_fields JSONB DEFAULT '{"name":true,"phone":true,"email":false,"telegram":false}'::jsonb,
        work_start TEXT DEFAULT '10:00',
        work_end TEXT DEFAULT '20:00',
        slot_step_min INTEGER DEFAULT 30,
        buffer_min INTEGER DEFAULT 0,
        auto_time_snap BOOLEAN DEFAULT TRUE,
        work_days JSONB DEFAULT '[1,2,3,4,5]'::jsonb,
        show_price BOOLEAN DEFAULT TRUE,
        max_booking_days_ahead INTEGER DEFAULT 14,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await pool.query(`ALTER TABLE masters ALTER COLUMN id SET DEFAULT gen_random_uuid();`);
    await pool.query(`ALTER TABLE masters ADD COLUMN IF NOT EXISTS booking_enabled BOOLEAN DEFAULT TRUE;`);
    await pool.query(`ALTER TABLE masters ADD COLUMN IF NOT EXISTS auto_time_snap BOOLEAN DEFAULT TRUE;`);
    await pool.query(`ALTER TABLE masters ADD COLUMN IF NOT EXISTS weekly_schedule JSONB DEFAULT '{}'::jsonb;`);
    await pool.query(`ALTER TABLE masters ADD COLUMN IF NOT EXISTS profession TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE masters ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE masters ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE masters ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE masters ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;`);
    await pool.query(`ALTER TABLE masters ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE masters ADD COLUMN IF NOT EXISTS contact_link TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE masters ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;`);
    await pool.query(`ALTER TABLE masters ADD COLUMN IF NOT EXISTS cover_image_url TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE masters ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE masters ADD COLUMN IF NOT EXISTS cover_position_x INTEGER DEFAULT 50;`);
    await pool.query(`ALTER TABLE masters ADD COLUMN IF NOT EXISTS cover_position_y INTEGER DEFAULT 50;`);
    await pool.query(`ALTER TABLE masters ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Moscow';`);
    await pool.query(`ALTER TABLE masters ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#0EA5E9';`);
    await pool.query(`ALTER TABLE masters ADD COLUMN IF NOT EXISTS button_color TEXT DEFAULT '#0EA5E9';`);
    await pool.query(`ALTER TABLE masters ADD COLUMN IF NOT EXISTS cta_text TEXT DEFAULT 'Записаться';`);
    await pool.query(`ALTER TABLE masters ADD COLUMN IF NOT EXISTS visible_sections JSONB DEFAULT '{"cover":true,"avatar":true,"description":true,"masterComment":true,"contacts":true,"socials":true,"services":true}'::jsonb;`);
    await pool.query(`ALTER TABLE masters ADD COLUMN IF NOT EXISTS required_fields JSONB DEFAULT '{"name":true,"phone":true,"email":false,"telegram":false}'::jsonb;`);
    await pool.query(`ALTER TABLE masters ADD COLUMN IF NOT EXISTS max_booking_days_ahead INTEGER DEFAULT 14;`);
    await pool.query(`
      INSERT INTO masters (user_id, name, slug)
      SELECT users.id, users.name, regexp_replace(lower(split_part(users.email, '@', 1)), '[^a-z0-9]+', '-', 'g')
      FROM users
      WHERE NOT EXISTS (SELECT 1 FROM masters WHERE masters.user_id = users.id)
      ON CONFLICT DO NOTHING;
    `);
    await pool.query(`
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
    `);
    await pool.query(`ALTER TABLE services ALTER COLUMN id SET DEFAULT gen_random_uuid();`);
    await pool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS included_items JSONB DEFAULT '[]'::jsonb;`);
    await pool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS material_name TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS material_cost INTEGER DEFAULT 0;`);
    await pool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS price_from BOOLEAN DEFAULT FALSE;`);
    await pool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS calendar_color TEXT DEFAULT '#0f766e';`);
    await pool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;`);
    await pool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;`);
    await pool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;`);
    await pool.query(`
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
    `);
    await pool.query(`ALTER TABLE appointments ALTER COLUMN id SET DEFAULT gen_random_uuid();`);
    await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_ids JSONB DEFAULT '[]'::jsonb;`);
    await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS client_email TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS client_telegram TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';`);
    await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancel_token TEXT DEFAULT gen_random_uuid()::text;`);
    await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reschedule_token TEXT DEFAULT gen_random_uuid()::text;`);
    await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`);
    await pool.query(`
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
    `);
    await pool.query(`ALTER TABLE clients ALTER COLUMN id SET DEFAULT gen_random_uuid();`);
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS master_id UUID REFERENCES masters(id) ON DELETE CASCADE;`);
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS name TEXT;`);
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone TEXT;`);
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS normalized_phone TEXT;`);
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS telegram_username TEXT DEFAULT '';`);
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS telegram_connected_at TIMESTAMPTZ;`);
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`);
    await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();`);
    await pool.query(`
      UPDATE clients
      SET
        name = COALESCE(NULLIF(name, ''), 'Клиент'),
        phone = COALESCE(phone, ''),
        normalized_phone = COALESCE(NULLIF(normalized_phone, ''), regexp_replace(COALESCE(phone, ''), '\\D', '', 'g')),
        notes = COALESCE(notes, ''),
        created_at = COALESCE(created_at, NOW()),
        updated_at = COALESCE(updated_at, NOW());
    `);
    await pool.query(`
      WITH duplicates AS (
        SELECT
          ctid,
          ROW_NUMBER() OVER (
            PARTITION BY master_id, normalized_phone
            ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
          ) AS row_number
        FROM clients
      )
      DELETE FROM clients
      WHERE ctid IN (SELECT ctid FROM duplicates WHERE row_number > 1);
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS clients_master_normalized_phone_idx
      ON clients (master_id, normalized_phone)
      ;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS telegram_connect_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await pool.query(`ALTER TABLE telegram_connect_tokens ALTER COLUMN id SET DEFAULT gen_random_uuid();`);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS telegram_connect_tokens_token_idx
      ON telegram_connect_tokens (token)
      ;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS telegram_chats (
        chat_id TEXT PRIMARY KEY,
        username TEXT DEFAULT '',
        first_name TEXT DEFAULT '',
        last_name TEXT DEFAULT '',
        last_seen_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS telegram_reminders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
        reminder_type TEXT NOT NULL,
        sent_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(appointment_id, reminder_type)
      );
    `);
    await pool.query(`ALTER TABLE telegram_reminders ALTER COLUMN id SET DEFAULT gen_random_uuid();`);
    await pool.query(`
      INSERT INTO clients (master_id, name, phone, normalized_phone)
      SELECT DISTINCT ON (master_id, regexp_replace(client_phone, '\\D', '', 'g'))
        master_id,
        client_name,
        client_phone,
        regexp_replace(client_phone, '\\D', '', 'g')
      FROM appointments
      WHERE regexp_replace(client_phone, '\\D', '', 'g') <> ''
      ORDER BY master_id, regexp_replace(client_phone, '\\D', '', 'g'), date DESC, start_time DESC
      ON CONFLICT (master_id, normalized_phone) DO NOTHING;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS off_days (
        master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
        day DATE NOT NULL,
        PRIMARY KEY(master_id, day)
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blocked_times (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        reason TEXT DEFAULT ''
      );
    `);
    await pool.query(`ALTER TABLE blocked_times ALTER COLUMN id SET DEFAULT gen_random_uuid();`);
  })().catch((error) => {
    initPromise = null;
    throw error;
  });

  return initPromise;
}

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export async function upsertClient(masterId: string, name: string, phone: string) {
  const clientName = name.trim();
  const clientPhone = phone.trim();
  const normalizedPhone = normalizeClientPhone(clientPhone);
  if (!clientName || !normalizedPhone) return null;

  const result = await pool.query<{ id: string }>(
    `
      INSERT INTO clients (master_id, name, phone, normalized_phone)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (master_id, normalized_phone) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        updated_at = NOW()
      RETURNING id
    `,
    [masterId, clientName, clientPhone, normalizedPhone],
  );

  return result.rows[0]?.id || null;
}

export const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const makeSlugBase = (email: string, name: string) => {
  const fromName = normalizeSlug(name);
  if (fromName) return fromName;
  return normalizeSlug(email.split("@")[0]) || "master";
};

export async function createUniqueSlug(email: string, name: string) {
  const base = makeSlugBase(email, name);
  let slug = base;
  let index = 2;

  while (true) {
    const existing = await pool.query("SELECT 1 FROM masters WHERE slug = $1", [slug]);
    if (!existing.rowCount) return slug;
    slug = `${base}-${index}`;
    index += 1;
  }
}

export async function getCurrentUserAndMaster() {
  await initDb();
  const email = normalizeEmail((await cookies()).get("user_email")?.value || "");
  if (!email) return null;

  const result = await pool.query<UserRow & MasterRow & { user_id: string; user_name: string; master_id: string }>(
    `
      SELECT
        users.id,
        users.email,
        users.password,
        users.name AS user_name,
        users.created_at,
        masters.id AS master_id,
        masters.user_id,
        masters.name,
        masters.slug,
        masters.notes,
        masters.profession,
        masters.description,
        masters.city,
        masters.address,
        masters.is_online,
        masters.phone,
        masters.contact_link,
        masters.social_links,
        masters.cover_image_url,
        masters.avatar_url,
        masters.cover_position_x,
        masters.cover_position_y,
        masters.timezone,
        masters.primary_color,
        masters.button_color,
        masters.cta_text,
        masters.visible_sections,
        masters.required_fields,
        masters.work_start,
        masters.work_end,
        masters.slot_step_min,
        masters.buffer_min,
        masters.work_days,
        masters.booking_enabled,
        masters.auto_time_snap,
        masters.weekly_schedule,
        masters.show_price,
        masters.max_booking_days_ahead,
        masters.updated_at
      FROM users
      JOIN masters ON masters.user_id = users.id
      WHERE users.email = $1
      LIMIT 1
    `,
    [email],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    user: {
      id: row.id,
      email: row.email,
      name: row.user_name,
      password: row.password,
      createdAt: row.created_at,
    },
    master: {
      id: row.master_id,
      userId: row.user_id,
      name: row.name,
      slug: row.slug,
      notes: row.notes || "",
      profession: row.profession || "",
      description: row.description || "",
      city: row.city || "",
      address: row.address || "",
      isOnline: row.is_online,
      phone: row.phone || "",
      contactLink: row.contact_link || "",
      socialLinks: row.social_links || {},
      coverImageUrl: row.cover_image_url || "",
      avatarUrl: row.avatar_url || "",
      coverPositionX: row.cover_position_x ?? 50,
      coverPositionY: row.cover_position_y ?? 50,
      timezone: row.timezone || "Europe/Moscow",
      primaryColor: row.primary_color || "#0EA5E9",
      buttonColor: row.button_color || "#0EA5E9",
      ctaText: row.cta_text || "Записаться",
      visibleSections: row.visible_sections || {},
      requiredFields: row.required_fields || {},
      workStart: row.work_start,
      workEnd: row.work_end,
      slotStepMin: row.slot_step_min,
      bufferMin: row.buffer_min,
      workDays: row.work_days,
      bookingEnabled: row.booking_enabled,
      autoTimeSnap: row.auto_time_snap !== false,
      weeklySchedule: row.weekly_schedule || {},
      showPrice: row.show_price,
      maxBookingDaysAhead: row.max_booking_days_ahead,
      updatedAt: row.updated_at,
    },
  };
}

export function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
