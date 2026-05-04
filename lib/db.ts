import { cookies } from "next/headers";
import { Pool } from "pg";

const globalForPg = globalThis as typeof globalThis & {
  pgPool?: Pool;
};

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
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
  work_start: string;
  work_end: string;
  slot_step_min: number;
  buffer_min: number;
  work_days: number[];
  show_price: boolean;
  created_at: string;
  updated_at: string;
};

export async function initDb() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!process.env.DATABASE_URL) {
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
        work_start TEXT DEFAULT '10:00',
        work_end TEXT DEFAULT '20:00',
        slot_step_min INTEGER DEFAULT 30,
        buffer_min INTEGER DEFAULT 0,
        work_days JSONB DEFAULT '[1,2,3,4,5]'::jsonb,
        show_price BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await pool.query(`ALTER TABLE masters ALTER COLUMN id SET DEFAULT gen_random_uuid();`);
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
        notes TEXT DEFAULT ''
      );
    `);
    await pool.query(`ALTER TABLE services ALTER COLUMN id SET DEFAULT gen_random_uuid();`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
        service_id UUID,
        date DATE NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        client_name TEXT NOT NULL,
        client_phone TEXT NOT NULL
      );
    `);
    await pool.query(`ALTER TABLE appointments ALTER COLUMN id SET DEFAULT gen_random_uuid();`);
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
  })();

  return initPromise;
}

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const makeSlugBase = (email: string, name: string) => {
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
        masters.work_start,
        masters.work_end,
        masters.slot_step_min,
        masters.buffer_min,
        masters.work_days,
        masters.show_price,
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
      workStart: row.work_start,
      workEnd: row.work_end,
      slotStepMin: row.slot_step_min,
      bufferMin: row.buffer_min,
      workDays: row.work_days,
      showPrice: row.show_price,
      updatedAt: row.updated_at,
    },
  };
}

export function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
