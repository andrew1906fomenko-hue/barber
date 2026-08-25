import { randomUUID } from "crypto";
import { mkdir, readdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";

type User = {
  id: string;
  email: string;
  password: string;
  name: string;
  created_at: string;
};

type Master = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  notes: string;
  profession?: string;
  description?: string;
  city?: string;
  address?: string;
  is_online?: boolean;
  phone?: string;
  contact_link?: string;
  social_links?: Record<string, string>;
  cover_image_url?: string;
  avatar_url?: string;
  cover_position_x?: number;
  cover_position_y?: number;
  timezone?: string;
  primary_color?: string;
  button_color?: string;
  cta_text?: string;
  visible_sections?: Record<string, boolean | string>;
  required_fields?: Record<string, boolean>;
  work_start: string;
  work_end: string;
  slot_step_min: number;
  buffer_min: number;
  work_days: number[];
  booking_enabled: boolean;
  auto_time_snap?: boolean;
  weekly_schedule: Record<string, unknown>;
  show_price: boolean;
  max_booking_days_ahead?: number;
  created_at: string;
  updated_at: string;
};

type Service = {
  id: string;
  master_id: string;
  title: string;
  price: number;
  duration_min: number;
  notes: string;
  description?: string;
  category?: string;
  included_items?: string[];
  includedItems?: string[];
  material_name?: string;
  materialName?: string;
  material_cost?: number;
  materialCost?: number;
  price_from?: boolean;
  priceFrom?: boolean;
  photo_url?: string;
  calendar_color?: string;
  sort_order?: number;
  is_public?: boolean;
  is_active?: boolean;
};

type Appointment = {
  id: string;
  master_id: string;
  service_id: string | null;
  service_ids?: string[];
  date: string;
  start_time: string;
  end_time: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  client_telegram?: string;
  status?: string;
  notes?: string;
  cancel_token?: string;
  reschedule_token?: string;
  created_at?: string;
};

type Client = {
  id: string;
  master_id: string;
  name: string;
  phone: string;
  normalized_phone: string;
  notes: string;
  telegram_chat_id?: string;
  telegram_username?: string;
  telegram_connected_at?: string | null;
  created_at: string;
  updated_at: string;
};

type BlockedTime = {
  id: string;
  master_id: string;
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
};

type TelegramConnectToken = {
  id: string;
  master_id: string;
  client_id: string;
  token: string;
  expires_at: string;
  used_at?: string | null;
  created_at: string;
};

type TelegramChat = {
  chat_id: string;
  username: string;
  first_name: string;
  last_name: string;
  last_seen_at: string;
};

type TelegramReminder = {
  id: string;
  appointment_id: string;
  reminder_type: string;
  sent_at: string;
};

type SubscriptionPlan = {
  id: string;
  code: string;
  name: string;
  duration_months: number;
  price: number;
  currency: string;
  discount_percent: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type Subscription = {
  id: string;
  master_id: string;
  plan_id: string | null;
  status: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_started_at: string | null;
  current_period_ends_at: string | null;
  auto_renew: boolean;
  auto_renew_plan_id: string | null;
  cancel_at_period_end: boolean;
  payment_method_token: string | null;
  provider_customer_id: string | null;
  created_at: string;
  updated_at: string;
};

type SubscriptionOrder = {
  id: string;
  master_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  duration_months: number;
  status: string;
  idempotency_key: string;
  provider_payment_id: string | null;
  payment_url: string | null;
  paid_at: string | null;
  failed_at: string | null;
  failure_code: string | null;
  failure_message: string | null;
  payment_method_title: string | null;
  receipt_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type PaymentEvent = {
  id: string;
  provider: string;
  external_event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  processed_at: string | null;
  processing_status: string;
  error_message: string;
  created_at: string;
};

type SubscriptionNotification = {
  id: string;
  subscription_id: string;
  notification_type: string;
  scheduled_for: string;
  sent_at: string | null;
  status: string;
  unique_key: string;
};

type LocalDb = {
  users: User[];
  masters: Master[];
  services: Service[];
  appointments: Appointment[];
  clients: Client[];
  blocked_times: BlockedTime[];
  telegram_connect_tokens: TelegramConnectToken[];
  telegram_chats: TelegramChat[];
  telegram_reminders: TelegramReminder[];
  subscription_plans: SubscriptionPlan[];
  subscriptions: Subscription[];
  subscription_orders: SubscriptionOrder[];
  payment_events: PaymentEvent[];
  subscription_notifications: SubscriptionNotification[];
};

type QueryResult<T> = {
  rows: T[];
  rowCount: number;
};

const dbPath = path.join(process.cwd(), "data", "local-db.json");
const dataDir = path.dirname(dbPath);
const emptyDb = (): LocalDb => ({
  users: [],
  masters: [],
  services: [],
  appointments: [],
  clients: [],
  blocked_times: [],
  telegram_connect_tokens: [],
  telegram_chats: [],
  telegram_reminders: [],
  subscription_plans: [],
  subscriptions: [],
  subscription_orders: [],
  payment_events: [],
  subscription_notifications: [],
});

const now = () => new Date().toISOString();
const normalizeSql = (sql: string) => sql.replace(/\s+/g, " ").trim().toLowerCase();
const normalizePhone = (value: string) => value.replace(/\D/g, "");
const parseStoredList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).filter(Boolean) : [];
  } catch {
    return value
      .split(/\n|,|;|•/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }
};
const isStoredUploadUrl = (value: unknown) => typeof value === "string" && value.startsWith("/uploads/");
const firstStoredUploadUrl = (value: unknown) => parseStoredList(value).find(isStoredUploadUrl) || "";
const servicePhotoUrl = (service: Service) =>
  (typeof service.photo_url === "string" && service.photo_url.startsWith("/uploads/") ? service.photo_url : "") ||
  firstStoredUploadUrl(service.included_items) ||
  firstStoredUploadUrl(service.includedItems);
const serviceIncludedItems = (service: Service) =>
  parseStoredList(service.included_items ?? service.includedItems ?? (looksLikeStoredList(service.photo_url) ? service.photo_url : undefined)).filter(
    (item) => !isStoredUploadUrl(item),
  );
const looksLikeColor = (value: unknown) => typeof value === "string" && /^#(?:[0-9a-f]{3}){1,2}$/i.test(value.trim());
const normalizeBoolean = (value: unknown) => value === true || value === 1 || value === "1" || value === "true";
const looksLikeStoredList = (value: unknown) => {
  if (Array.isArray(value)) return true;
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.startsWith("[") || /[\n,;•]/.test(trimmed);
};
const getInsertColumns = (text: string, table: string) => {
  const match = text.match(new RegExp(`insert into ${table} \\(([^)]+)\\)`));
  return match ? match[1].split(",").map((column) => column.trim()) : [];
};
const getUpdateColumns = (text: string, table: string) => {
  const match = text.match(new RegExp(`update ${table} set (.+?) where `));
  return match ? match[1].split(",").map((part) => part.split("=")[0].trim()) : [];
};
const paramsByColumns = (columns: string[], params: unknown[]) => {
  const values = new Map<string, unknown>();
  columns.forEach((column, index) => values.set(column, params[index]));
  return values;
};
const result = <T>(rows: T[]): QueryResult<T> => ({ rows, rowCount: rows.length });
const defaultVisibleSections = {
  cover: true,
  avatar: true,
  description: true,
  masterComment: true,
  address: true,
  contacts: true,
  socials: true,
  services: true,
  serviceImages: false,
  serviceCards: false,
  dateWheel: false,
  dateCalendar: false,
  serviceCardStyle: "stack",
  headingMode: "friendly",
  accentMode: "default",
};
const defaultRequiredFields = { name: true, phone: true, email: false, telegram: false };
const normalizeVisibleSections = (sections?: Record<string, boolean | string>) =>
  ({
    ...defaultVisibleSections,
    ...Object.fromEntries(Object.entries(sections || {}).filter(([key]) => key in defaultVisibleSections)),
  });

const withMasterDefaults = (master: Master): Master => ({
  ...master,
  profession: master.profession || "",
  description: master.description || "",
  city: master.city || "",
  address: master.address || "",
  is_online: master.is_online || false,
  phone: master.phone || "",
  contact_link: master.contact_link || "",
  social_links: master.social_links || {},
  cover_image_url: master.cover_image_url || "",
  avatar_url: master.avatar_url || "",
  cover_position_x: master.cover_position_x ?? 50,
  cover_position_y: master.cover_position_y ?? 50,
  timezone: master.timezone || "Europe/Moscow",
  primary_color: master.primary_color || "#0EA5E9",
  button_color: master.button_color || "#0EA5E9",
  cta_text: master.cta_text || "Записаться",
  visible_sections: normalizeVisibleSections(master.visible_sections),
  required_fields: { ...defaultRequiredFields, ...(master.required_fields || {}) },
  max_booking_days_ahead: Number(master.max_booking_days_ahead) || 14,
});

const withServiceDefaults = (service: Service): Service => ({
  ...service,
  description: service.description ?? service.notes ?? "",
  category: service.category || "",
  included_items: serviceIncludedItems(service),
  includedItems: serviceIncludedItems(service),
  material_name: service.material_name || service.materialName || (!looksLikeColor(service.calendar_color) ? service.calendar_color || "" : ""),
  materialName: service.material_name || service.materialName || (!looksLikeColor(service.calendar_color) ? service.calendar_color || "" : ""),
  material_cost: Number(service.material_cost ?? service.materialCost ?? (!looksLikeColor(service.calendar_color) ? service.sort_order : 0)) || 0,
  materialCost: Number(service.material_cost ?? service.materialCost ?? (!looksLikeColor(service.calendar_color) ? service.sort_order : 0)) || 0,
  price_from: normalizeBoolean(service.price_from ?? service.priceFrom),
  priceFrom: normalizeBoolean(service.price_from ?? service.priceFrom),
  photo_url: servicePhotoUrl(service),
  calendar_color: looksLikeColor(service.calendar_color) ? service.calendar_color : "#0f766e",
  sort_order: Number(service.sort_order) || 0,
  is_public: service.is_public !== false,
  is_active: service.is_active !== false,
});

const dedupeById = <T extends { id: string }>(items: T[]) => {
  const map = new Map<string, T>();
  items.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
};

const normalizeDb = (input: Partial<LocalDb>): LocalDb => {
  const db = { ...emptyDb(), ...input } as LocalDb;
  db.masters = db.masters.map(withMasterDefaults);
  db.services = dedupeById(db.services.map(withServiceDefaults));
  db.telegram_connect_tokens = db.telegram_connect_tokens || [];
  db.telegram_chats = db.telegram_chats || [];
  db.telegram_reminders = db.telegram_reminders || [];
  db.subscription_plans = db.subscription_plans || [];
  db.subscriptions = db.subscriptions || [];
  db.subscription_orders = db.subscription_orders || [];
  db.payment_events = db.payment_events || [];
  db.subscription_notifications = db.subscription_notifications || [];
  return db;
};

const hasIdentityData = (db: LocalDb) => db.users.length > 0 && db.masters.length > 0;
const domainDataCount = (db: LocalDb) => db.services.length + db.appointments.length + db.clients.length + db.blocked_times.length;
const canResetLocalDb = () => process.env.ALLOW_LOCAL_DB_DATA_RESET === "1";
const sharesUserEmail = (left: LocalDb, right: LocalDb) => {
  const emails = new Set(left.users.map((user) => user.email));
  return right.users.some((user) => emails.has(user.email));
};
const backupTimestamp = () => now().replace(/\D/g, "").slice(0, 14);

let safetyBackupCreated = false;
let cachedDb: LocalDb | null = null;
let lastSavedDb: LocalDb | null = null;
let loadDbPromise: Promise<LocalDb> | null = null;
let saveDbPromise: Promise<void> = Promise.resolve();

async function loadBackupFiles() {
  try {
    return (await readdir(dataDir))
      .filter((file) => /^local-db\.before-.*\.json$/.test(file))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

async function loadBestBackup(predicate: (backup: LocalDb) => boolean) {
  const backups: Array<{ db: LocalDb; score: number }> = [];

  for (const file of await loadBackupFiles()) {
    try {
      const backup = normalizeDb(JSON.parse(await readFile(path.join(dataDir, file), "utf8")) as Partial<LocalDb>);
      if (predicate(backup)) backups.push({ db: backup, score: domainDataCount(backup) });
    } catch {
      // Ignore broken backup files and keep looking for the next usable one.
    }
  }

  backups.sort((a, b) => b.score - a.score);
  return backups[0]?.db || null;
}

const cloneDb = (db: LocalDb): LocalDb => normalizeDb(JSON.parse(JSON.stringify(db)) as Partial<LocalDb>);

async function loadDbFromDisk() {
  try {
    const raw = await readFile(dbPath, "utf8");
    const db = normalizeDb(JSON.parse(raw) as Partial<LocalDb>);
    if (!hasIdentityData(db)) {
      const backup = await loadBestBackup(hasIdentityData);
      if (backup) return backup;
    }
    if (domainDataCount(db) === 0) {
      const backup = await loadBestBackup((item) => hasIdentityData(item) && domainDataCount(item) > 0 && sharesUserEmail(db, item));
      if (backup) return backup;
    }
    return db;
  } catch {
    return (await loadBestBackup(hasIdentityData)) || emptyDb();
  }
}

async function loadDb() {
  if (cachedDb) return cachedDb;
  if (!loadDbPromise) {
    loadDbPromise = loadDbFromDisk().then((db) => {
      cachedDb = db;
      lastSavedDb = cloneDb(db);
      return db;
    });
  }

  return loadDbPromise;
}

async function createSafetyBackup(db: LocalDb) {
  if (safetyBackupCreated) return;
  if (!hasIdentityData(db) && domainDataCount(db) === 0) return;

  await mkdir(dataDir, { recursive: true });
  const backupPath = path.join(dataDir, `local-db.before-auto-${backupTimestamp()}.json`);
  await writeFile(backupPath, JSON.stringify(db, null, 2), "utf8");
  safetyBackupCreated = true;
}

function assertSafeSave(previous: LocalDb | null, next: LocalDb) {
  if (!previous || canResetLocalDb()) return;

  if (hasIdentityData(previous) && !hasIdentityData(next)) {
    throw new Error("Refusing to overwrite local database without users/masters. Set ALLOW_LOCAL_DB_DATA_RESET=1 to allow an intentional reset.");
  }

  if (domainDataCount(previous) > 0 && domainDataCount(next) === 0 && sharesUserEmail(previous, next)) {
    throw new Error("Refusing to overwrite local database with empty services/appointments/clients. Set ALLOW_LOCAL_DB_DATA_RESET=1 to allow an intentional reset.");
  }
}

async function saveDb(db: LocalDb) {
  const nextDb = normalizeDb(db);
  const previousDb = lastSavedDb;

  saveDbPromise = saveDbPromise.catch(() => undefined).then(async () => {
    if (previousDb) await createSafetyBackup(previousDb);
    assertSafeSave(previousDb, nextDb);

    await mkdir(dataDir, { recursive: true });
    const tempPath = `${dbPath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempPath, JSON.stringify(nextDb, null, 2), "utf8");
    await rename(tempPath, dbPath);

    cachedDb = nextDb;
    lastSavedDb = cloneDb(nextDb);
  });

  await saveDbPromise;
}

const masterPublicRow = (db: LocalDb, master: Master) => {
  const user = db.users.find((item) => item.id === master.user_id);
  return {
    ...withMasterDefaults(master),
    email: user?.email || "",
  };
};

const masterDataCount = (db: LocalDb, masterId: string) =>
  db.services.filter((item) => item.master_id === masterId).length +
  db.appointments.filter((item) => item.master_id === masterId).length +
  db.clients.filter((item) => item.master_id === masterId).length;

const resolveSessionMaster = (db: LocalDb, user: User) => {
  const ownMaster = db.masters.find((item) => item.user_id === user.id);
  if (!ownMaster || masterDataCount(db, ownMaster.id) > 0) return ownMaster;

  const mastersWithData = db.masters
    .map((master) => ({ master, dataCount: masterDataCount(db, master.id) }))
    .filter((item) => item.dataCount > 0)
    .sort((a, b) => b.dataCount - a.dataCount);

  return mastersWithData[0]?.master || ownMaster;
};

const sessionRow = (db: LocalDb, email: string) => {
  const user = db.users.find((item) => item.email === email);
  if (!user) return null;
  const master = resolveSessionMaster(db, user);
  if (!master) return null;
  const normalizedMaster = withMasterDefaults(master);
  return {
    ...normalizedMaster,
    id: user.id,
    email: user.email,
    password: user.password,
    created_at: user.created_at,
    user_name: user.name,
    master_id: normalizedMaster.id,
  };
};

const revenueForMaster = (db: LocalDb, masterId: string) =>
  db.appointments
    .filter((appointment) => appointment.master_id === masterId && !["no_show", "no_show_deleted"].includes(appointment.status || ""))
    .reduce((sum, appointment) => sum + (db.services.find((service) => service.id === appointment.service_id)?.price || 0), 0);

const listClients = (db: LocalDb, masterId: string) =>
  db.clients
    .filter((client) => client.master_id === masterId)
    .map((client) => {
      const visits = db.appointments.filter(
        (appointment) => appointment.master_id === masterId && normalizePhone(appointment.client_phone) === client.normalized_phone,
      );
      const total = visits.reduce(
        (sum, appointment) =>
          sum + (["no_show", "no_show_deleted"].includes(appointment.status || "") ? 0 : db.services.find((service) => service.id === appointment.service_id)?.price || 0),
        0,
      );
      return {
        ...client,
        telegram_chat_id: client.telegram_chat_id || "",
        telegram_username: client.telegram_username || "",
        telegram_connected_at: client.telegram_connected_at || null,
        visits: String(visits.length),
        last_visit: visits.map((visit) => visit.date).sort().at(-1) || null,
        total_spent: String(total),
      };
    })
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at) || a.name.localeCompare(b.name));

function ensureClient(db: LocalDb, masterId: string, name: string, phone: string) {
  const normalized = normalizePhone(phone);
  if (!name.trim() || !normalized) return null;

  const existing = db.clients.find((client) => client.master_id === masterId && client.normalized_phone === normalized);
  if (existing) {
    existing.name = name.trim();
    existing.phone = phone.trim();
    existing.updated_at = now();
    return existing.id;
  }

  const client: Client = {
    id: randomUUID(),
    master_id: masterId,
    name: name.trim(),
    phone: phone.trim(),
    normalized_phone: normalized,
    notes: "",
    telegram_chat_id: "",
    telegram_username: "",
    telegram_connected_at: null,
    created_at: now(),
    updated_at: now(),
  };
  db.clients.push(client);
  return client.id;
}

export class LocalPool {
  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    const text = normalizeSql(sql);
    const db = await loadDb();
    let changed = false;

    const finish = async <R>(rows: R[]) => {
      if (changed) await saveDb(db);
      return result(rows) as unknown as QueryResult<T>;
    };

    if (text.startsWith("create ") || text.startsWith("alter ") || text.startsWith("do $$") || text.startsWith("with duplicates")) {
      return finish([]);
    }

    if (text === "select 1 as ok") return finish([{ ok: 1 }]);

    if (text.includes("insert into subscription_plans")) {
      const [code, name, durationMonths, price, discountPercentOrSortOrder, maybeSortOrder] = params as [string, string, number, number, number, number?];
      const discountPercent = maybeSortOrder === undefined ? 0 : Number(discountPercentOrSortOrder) || 0;
      const sortOrder = maybeSortOrder === undefined ? Number(discountPercentOrSortOrder) || 0 : Number(maybeSortOrder) || 0;
      const existing = db.subscription_plans.find((plan) => plan.code === code);
      if (existing) {
        Object.assign(existing, {
          name,
          duration_months: Number(durationMonths),
          price: Number(price),
          currency: "RUB",
          discount_percent: discountPercent,
          is_active: true,
          sort_order: sortOrder,
          updated_at: now(),
        });
        changed = true;
      } else {
        const createdAt = now();
        db.subscription_plans.push({
          id: randomUUID(),
          code,
          name,
          duration_months: Number(durationMonths),
          price: Number(price),
          currency: "RUB",
          discount_percent: discountPercent,
          is_active: true,
          sort_order: sortOrder,
          created_at: createdAt,
          updated_at: createdAt,
        });
        changed = true;
      }
      return finish([]);
    }

    if (text.includes("from subscription_plans where id = $1 and is_active = true")) {
      return finish(db.subscription_plans.filter((plan) => plan.id === params[0] && plan.is_active));
    }

    if (text.includes("from subscription_plans where is_active = true")) {
      return finish(
        db.subscription_plans
          .filter((plan) => plan.is_active)
          .sort((a, b) => a.sort_order - b.sort_order || a.duration_months - b.duration_months),
      );
    }

    if (text.includes("from subscription_plans order by")) {
      return finish([...db.subscription_plans].sort((a, b) => a.sort_order - b.sort_order || a.duration_months - b.duration_months));
    }

    if (text.includes("from subscription_plans where id = $1 limit 1")) {
      return finish(db.subscription_plans.filter((plan) => plan.id === params[0]));
    }

    if (text.includes("select * from subscriptions where master_id = $1")) {
      return finish(db.subscriptions.filter((subscription) => subscription.master_id === params[0]));
    }

    if (text.includes("select * from subscriptions where current_period_ends_at is not null")) {
      return finish(
        db.subscriptions.filter(
          (subscription) =>
            Boolean(subscription.current_period_ends_at) && ["trial", "active", "ending_soon"].includes(subscription.status),
        ),
      );
    }

    if (text.includes("insert into subscriptions")) {
      const [masterId, planId, trialStartedAt, trialEndsAt] = params as [string, string | null, string, string];
      const existing = db.subscriptions.find((subscription) => subscription.master_id === masterId);
      if (existing) return finish([existing]);
      const createdAt = now();
      const subscription: Subscription = {
        id: randomUUID(),
        master_id: masterId,
        plan_id: planId,
        status: "trial",
        trial_started_at: trialStartedAt,
        trial_ends_at: trialEndsAt,
        current_period_started_at: trialStartedAt,
        current_period_ends_at: trialEndsAt,
        auto_renew: false,
        auto_renew_plan_id: null,
        cancel_at_period_end: false,
        payment_method_token: null,
        provider_customer_id: null,
        created_at: createdAt,
        updated_at: createdAt,
      };
      db.subscriptions.push(subscription);
      changed = true;
      return finish([subscription]);
    }

    if (text.includes("update subscriptions set status = $1")) {
      const [status, id] = params as [string, string];
      const subscription = db.subscriptions.find((item) => item.id === id);
      if (!subscription) return finish([]);
      subscription.status = status;
      subscription.updated_at = now();
      changed = true;
      return finish([subscription]);
    }

    if (text.includes("update subscriptions set status = 'payment_processing'")) {
      const [masterId] = params as [string];
      const subscription = db.subscriptions.find((item) => item.master_id === masterId);
      if (subscription) {
        subscription.status = "payment_processing";
        subscription.updated_at = now();
        changed = true;
      }
      return finish([]);
    }

    if (text.includes("update subscriptions set status = 'payment_failed'")) {
      const [masterId] = params as [string];
      const subscription = db.subscriptions.find((item) => item.master_id === masterId && item.status !== "active");
      if (subscription) {
        subscription.status = "payment_failed";
        subscription.updated_at = now();
        changed = true;
      }
      return finish([]);
    }

    if (text.includes("update subscriptions") && text.includes("set auto_renew = $1")) {
      const [autoRenew, autoRenewPlanId, cancelAtPeriodEnd, masterId] = params as [boolean, string | null, boolean, string];
      const subscription = db.subscriptions.find((item) => item.master_id === masterId);
      if (!subscription) return finish([]);
      subscription.auto_renew = Boolean(autoRenew);
      subscription.auto_renew_plan_id = autoRenewPlanId;
      subscription.cancel_at_period_end = Boolean(cancelAtPeriodEnd);
      subscription.updated_at = now();
      changed = true;
      return finish([subscription]);
    }

    if (text.includes("update subscriptions") && text.includes("trial_ends_at = $3")) {
      const [status, planId, trialEndsAt, currentPeriodEndsAt, autoRenew, autoRenewPlanId, cancelAtPeriodEnd, masterId] = params as [
        string,
        string | null,
        string | null,
        string | null,
        boolean,
        string | null,
        boolean,
        string,
      ];
      const subscription = db.subscriptions.find((item) => item.master_id === masterId);
      if (!subscription) return finish([]);
      subscription.status = status;
      subscription.plan_id = planId;
      subscription.trial_ends_at = trialEndsAt;
      subscription.current_period_ends_at = currentPeriodEndsAt;
      subscription.auto_renew = Boolean(autoRenew);
      subscription.auto_renew_plan_id = autoRenewPlanId;
      subscription.cancel_at_period_end = Boolean(cancelAtPeriodEnd);
      subscription.updated_at = now();
      changed = true;
      return finish([subscription]);
    }

    if (text.includes("update subscriptions") && text.includes("current_period_started_at = $2")) {
      const [planId, periodStartedAt, periodEndsAt, masterId] = params as [string, string, string, string];
      const subscription = db.subscriptions.find((item) => item.master_id === masterId);
      if (!subscription) return finish([]);
      subscription.plan_id = planId;
      subscription.status = "active";
      subscription.current_period_started_at = periodStartedAt;
      subscription.current_period_ends_at = periodEndsAt;
      subscription.updated_at = now();
      changed = true;
      return finish([subscription]);
    }

    if (text.includes("update subscription_plans") && text.includes("duration_months = $2")) {
      const [name, durationMonths, price, discountPercent, isActive, sortOrder, id] = params as [
        string,
        number,
        number,
        number,
        boolean,
        number,
        string,
      ];
      const plan = db.subscription_plans.find((item) => item.id === id);
      if (!plan) return finish([]);
      Object.assign(plan, {
        name,
        duration_months: Number(durationMonths),
        price: Number(price),
        discount_percent: Number(discountPercent),
        is_active: Boolean(isActive),
        sort_order: Number(sortOrder),
        updated_at: now(),
      });
      changed = true;
      return finish([plan]);
    }

    if (text.includes("insert into subscription_orders")) {
      const [masterId, planId, amount, currency, durationMonths, idempotencyKey, metadata] = params as [
        string,
        string,
        number,
        string,
        number,
        string,
        string,
      ];
      const createdAt = now();
      const order: SubscriptionOrder = {
        id: randomUUID(),
        master_id: masterId,
        plan_id: planId,
        amount: Number(amount),
        currency,
        duration_months: Number(durationMonths),
        status: "pending",
        idempotency_key: idempotencyKey,
        provider_payment_id: null,
        payment_url: null,
        paid_at: null,
        failed_at: null,
        failure_code: null,
        failure_message: null,
        payment_method_title: null,
        receipt_url: null,
        metadata: typeof metadata === "string" ? JSON.parse(metadata || "{}") : {},
        created_at: createdAt,
        updated_at: createdAt,
      };
      db.subscription_orders.push(order);
      changed = true;
      return finish([order]);
    }

    if (text.includes("update subscription_orders") && text.includes("provider_payment_id = $1")) {
      const [providerPaymentId, paymentUrl, status, metadata, id] = params as [string, string, string, string, string];
      const order = db.subscription_orders.find((item) => item.id === id);
      if (!order) return finish([]);
      order.provider_payment_id = providerPaymentId;
      order.payment_url = paymentUrl;
      order.status = status;
      order.metadata = JSON.parse(metadata || "{}");
      order.updated_at = now();
      changed = true;
      return finish([order]);
    }

    if (text.includes("select * from subscription_orders where master_id = $1 order by")) {
      const [masterId, limit, offset] = params as [string, number, number];
      return finish(
        db.subscription_orders
          .filter((order) => order.master_id === masterId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(Number(offset) || 0, (Number(offset) || 0) + (Number(limit) || 20)),
      );
    }

    if (text.includes("select * from subscription_orders where id = $1 and master_id = $2")) {
      return finish(db.subscription_orders.filter((order) => order.id === params[0] && order.master_id === params[1]));
    }

    if (text.includes("select * from subscription_orders where provider_payment_id = $1")) {
      return finish(db.subscription_orders.filter((order) => order.provider_payment_id === params[0]));
    }

    if (text.includes("update subscription_orders") && text.includes("status = 'paid'")) {
      const [paidAt, paymentMethodTitle, receiptUrl, metadata, id] = params as [string, string | null, string | null, string, string];
      const order = db.subscription_orders.find((item) => item.id === id && item.status !== "paid");
      if (!order) return finish([]);
      order.status = "paid";
      order.paid_at = paidAt;
      order.failure_code = null;
      order.failure_message = null;
      order.payment_method_title = paymentMethodTitle;
      order.receipt_url = receiptUrl;
      order.metadata = JSON.parse(metadata || "{}");
      order.updated_at = now();
      changed = true;
      return finish([order]);
    }

    if (text.includes("update subscription_orders") && text.includes("failed_at = now()")) {
      const [status, code, message, id] = params as [string, string, string, string];
      const order = db.subscription_orders.find((item) => item.id === id);
      if (!order) return finish([]);
      order.status = status;
      order.failed_at = now();
      order.failure_code = code;
      order.failure_message = message;
      order.updated_at = now();
      changed = true;
      return finish([order]);
    }

    if (text.includes("update subscription_orders set status = 'processing'")) {
      const [metadata, id] = params as [string, string];
      const order = db.subscription_orders.find((item) => item.id === id);
      if (!order) return finish([]);
      order.status = "processing";
      order.metadata = JSON.parse(metadata || "{}");
      order.updated_at = now();
      changed = true;
      return finish([]);
    }

    if (text.includes("insert into payment_events")) {
      const [provider, externalEventId, eventType, payload] = params as [string, string, string, string];
      if (db.payment_events.some((event) => event.external_event_id === externalEventId)) return finish([]);
      const event: PaymentEvent = {
        id: randomUUID(),
        provider,
        external_event_id: externalEventId,
        event_type: eventType,
        payload: JSON.parse(payload || "{}"),
        processed_at: null,
        processing_status: "pending",
        error_message: "",
        created_at: now(),
      };
      db.payment_events.push(event);
      changed = true;
      return finish([event]);
    }

    if (text.includes("update payment_events set processing_status = $1")) {
      const [status, errorMessage, externalEventId] = params as [string, string, string];
      const event = db.payment_events.find((item) => item.external_event_id === externalEventId);
      if (event) {
        event.processing_status = status;
        event.error_message = errorMessage;
        event.processed_at = now();
        changed = true;
      }
      return finish([]);
    }

    if (text.includes("insert into subscription_notifications")) {
      const [subscriptionId, notificationType, scheduledFor, uniqueKey] = params as [string, string, string, string];
      if (db.subscription_notifications.some((item) => item.unique_key === uniqueKey)) return finish([]);
      const notification: SubscriptionNotification = {
        id: randomUUID(),
        subscription_id: subscriptionId,
        notification_type: notificationType,
        scheduled_for: scheduledFor,
        sent_at: now(),
        status: "sent",
        unique_key: uniqueKey,
      };
      db.subscription_notifications.push(notification);
      changed = true;
      return finish([notification]);
    }

    if (text.includes("select 1 from masters where slug = $1")) {
      return finish(db.masters.some((master) => master.slug === params[0]) ? [{ "?column?": 1 }] : []);
    }

    if (text.includes("select id from users where email = $1")) {
      return finish(db.users.filter((user) => user.email === params[0]).map((user) => ({ id: user.id })));
    }

    if (text.includes("select email from users where email = $1 and password = $2")) {
      return finish(db.users.filter((user) => user.email === params[0] && user.password === params[1]).map((user) => ({ email: user.email })));
    }

    if (text.includes("select email, password from users where email = $1")) {
      return finish(
        db.users
          .filter((user) => user.email === params[0])
          .map((user) => ({ email: user.email, password: user.password })),
      );
    }

    if (text.includes("with new_user as") && text.includes("insert into users")) {
      const [email, name, password, slug] = params as string[];
      const createdAt = now();
      const user: User = { id: randomUUID(), email, name, password, created_at: createdAt };
      const master: Master = {
        id: randomUUID(),
        user_id: user.id,
        name,
        slug,
        notes: "",
        profession: "",
        description: "",
        city: "",
        address: "",
        is_online: false,
        phone: "",
        contact_link: "",
        social_links: {},
        cover_image_url: "",
        avatar_url: "",
        cover_position_x: 50,
        cover_position_y: 50,
        timezone: "Europe/Moscow",
        primary_color: "#0EA5E9",
        button_color: "#0EA5E9",
        cta_text: "Записаться",
        visible_sections: defaultVisibleSections,
        required_fields: defaultRequiredFields,
        work_start: "10:00",
        work_end: "20:00",
        slot_step_min: 30,
        buffer_min: 0,
        work_days: [1, 2, 3, 4, 5],
        booking_enabled: true,
        auto_time_snap: true,
        weekly_schedule: {},
        show_price: true,
        max_booking_days_ahead: 14,
        created_at: createdAt,
        updated_at: createdAt,
      };
      db.users.push(user);
      db.masters.push(master);
      changed = true;
      return finish([{ user_id: user.id, master_id: master.id }]);
    }

    if (text.includes("from users join masters on masters.user_id = users.id where users.email = $1")) {
      const row = sessionRow(db, String(params[0]));
      return finish(row ? [row] : []);
    }

    if (text.includes("from masters join users on users.id = masters.user_id where masters.slug = $1")) {
      const master = db.masters.find((item) => item.slug === params[0]);
      return finish(master ? [masterPublicRow(db, master)] : []);
    }

    if (text.includes("select id from masters where slug = $1")) {
      return finish(db.masters.filter((master) => master.slug === params[0]).map((master) => ({ id: master.id })));
    }

    if (text.includes("select id, required_fields from masters where slug = $1")) {
      return finish(
        db.masters
          .filter((master) => master.slug === params[0])
          .map((master) => ({ id: master.id, required_fields: withMasterDefaults(master).required_fields })),
      );
    }

    if (text.includes("select name, profession, description from masters where slug = $1")) {
      return finish(
        db.masters
          .filter((master) => master.slug === params[0])
          .map((master) => {
            const normalized = withMasterDefaults(master);
            return { name: normalized.name, profession: normalized.profession, description: normalized.description };
          }),
      );
    }

    if (text.includes("from services where master_id = $1")) {
      const publicOnly = text.includes("and is_public = true");
      const activeOnly = text.includes("and is_active = true");
      return finish(
        db.services
          .filter((service) => service.master_id === params[0])
          .filter((service) => !publicOnly || service.is_public !== false)
          .filter((service) => !activeOnly || service.is_active !== false)
          .map(withServiceDefaults)
          .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || a.title.localeCompare(b.title)),
      );
    }

    if (text.includes("insert into services")) {
      const values = paramsByColumns(getInsertColumns(text, "services"), params);
      const explicitId = values.get("id") as string | undefined;
      const master_id = values.get("master_id") as string;
      const title = values.get("title") as string;
      const price = values.get("price") as number;
      const duration_min = values.get("duration_min") as number;
      const notes = values.get("notes") as string | undefined;
      const description = values.get("description") as string | undefined;
      const category = values.get("category") as string | undefined;
      const included_items = values.get("included_items");
      const material_name = values.get("material_name") as string | undefined;
      const material_cost = values.get("material_cost") as number | undefined;
      const price_from = values.get("price_from") as boolean | undefined;
      const photo_url = values.get("photo_url") as string | undefined;
      const calendar_color = values.get("calendar_color") as string | undefined;
      const sort_order = values.get("sort_order") as number | undefined;
      const is_public = values.get("is_public") as boolean | undefined;
      const is_active = values.get("is_active") as boolean | undefined;
      const service: Service = {
        id: explicitId || randomUUID(),
        master_id,
        title,
        price,
        duration_min,
        notes: notes || "",
        description: description ?? notes ?? "",
        category: category || "",
        included_items: parseStoredList(included_items),
        includedItems: parseStoredList(included_items),
        material_name: material_name || "",
        materialName: material_name || "",
        material_cost: Number(material_cost) || 0,
        materialCost: Number(material_cost) || 0,
        price_from: normalizeBoolean(price_from),
        priceFrom: normalizeBoolean(price_from),
        photo_url: photo_url || "",
        calendar_color: calendar_color || "#0f766e",
        sort_order: Number(sort_order) || db.services.filter((item) => item.master_id === master_id).length,
        is_public: is_public !== false,
        is_active: is_active !== false,
      };
      db.services.push(service);
      changed = true;
      return finish([service]);
    }

    if (text.includes("update services set")) {
      const columns = getUpdateColumns(text, "services");
      const values = paramsByColumns(columns, params);
      const id = params[columns.length] as string;
      const masterId = params[columns.length + 1] as string;
      const matchingServices = db.services.filter((item) => item.id === id && item.master_id === masterId);
      const servicesToUpdate = matchingServices.length ? matchingServices : db.services.filter((item) => item.id === id);
      if (!servicesToUpdate.length) return finish([]);
      const currentService = withServiceDefaults(servicesToUpdate[servicesToUpdate.length - 1]);
      const title = (values.get("title") as string | undefined) ?? currentService.title;
      const price = (values.get("price") as number | undefined) ?? currentService.price;
      const duration_min = (values.get("duration_min") as number | undefined) ?? currentService.duration_min;
      const notes = (values.get("notes") as string | undefined) ?? currentService.notes;
      const description = (values.get("description") as string | undefined) ?? currentService.description;
      const category = (values.get("category") as string | undefined) ?? currentService.category;
      const included_items = values.has("included_items") ? values.get("included_items") : currentService.included_items;
      const material_name = (values.get("material_name") as string | undefined) ?? currentService.material_name;
      const material_cost = (values.get("material_cost") as number | undefined) ?? currentService.material_cost;
      const price_from = (values.get("price_from") as boolean | undefined) ?? currentService.price_from;
      const photo_url = (values.get("photo_url") as string | undefined) ?? currentService.photo_url;
      const calendar_color = (values.get("calendar_color") as string | undefined) ?? currentService.calendar_color;
      const sort_order = (values.get("sort_order") as number | undefined) ?? currentService.sort_order;
      const is_public = (values.get("is_public") as boolean | undefined) ?? currentService.is_public;
      const is_active = (values.get("is_active") as boolean | undefined) ?? currentService.is_active;
      const nextService = {
        title,
        price,
        duration_min,
        notes,
        description: description ?? notes,
        category: category || "",
        included_items: parseStoredList(included_items),
        includedItems: parseStoredList(included_items),
        material_name: material_name || "",
        materialName: material_name || "",
        material_cost: Number(material_cost) || 0,
        materialCost: Number(material_cost) || 0,
        price_from: normalizeBoolean(price_from),
        priceFrom: normalizeBoolean(price_from),
        photo_url: photo_url || "",
        calendar_color: calendar_color || "#0f766e",
        sort_order: Number(sort_order) || 0,
        is_public: is_public !== false,
        is_active: is_active !== false,
      };
      servicesToUpdate.forEach((service) => Object.assign(service, nextService));
      changed = true;
      return finish([servicesToUpdate[servicesToUpdate.length - 1]]);
    }

    if (text.includes("delete from services where id = $1 and master_id = $2")) {
      const before = db.services.length;
      db.services = db.services.filter((service) => !(service.id === params[0] && service.master_id === params[1]));
      changed = db.services.length !== before;
      return finish([]);
    }

    if (text.includes("select duration_min from services where id = $1 and master_id = $2")) {
      return finish(
        db.services
          .filter((service) => service.id === params[0] && service.master_id === params[1])
          .map((service) => ({ duration_min: service.duration_min })),
      );
    }

    if (text.includes("select id, master_id from appointments where id = $1 and reschedule_token = $2")) {
      return finish(
        db.appointments
          .filter((appointment) => appointment.id === params[0] && appointment.reschedule_token === params[1])
          .map((appointment) => ({ id: appointment.id, master_id: appointment.master_id })),
      );
    }

    if (text.includes("from appointments left join clients") && text.includes("where appointments.id = $1")) {
      const normalizedPhone = normalizePhone(String(params[2] || ""));
      return finish(
        db.appointments
          .filter(
            (appointment) =>
              appointment.id === params[0] &&
              (appointment.reschedule_token === params[1] ||
                (normalizedPhone !== "" && normalizePhone(appointment.client_phone) === normalizedPhone)),
          )
          .map((appointment) => {
            const client = db.clients.find(
              (item) => item.master_id === appointment.master_id && item.normalized_phone === normalizePhone(appointment.client_phone),
            );
            return {
              id: appointment.id,
              master_id: appointment.master_id,
              client_name: appointment.client_name,
              client_phone: appointment.client_phone,
              client_id: client?.id || null,
              telegram_chat_id: client?.telegram_chat_id || "",
              telegram_username: client?.telegram_username || "",
            };
          }),
      );
    }

    if (text.includes("insert into telegram_connect_tokens")) {
      const [master_id, client_id, token, expires_at] = params as [string, string, string, string];
      db.telegram_connect_tokens.push({
        id: randomUUID(),
        master_id,
        client_id,
        token,
        expires_at,
        used_at: null,
        created_at: now(),
      });
      changed = true;
      return finish([]);
    }

    if (text.includes("select clients.telegram_chat_id") && text.includes("where appointments.id = $1")) {
      const normalizedPhone = normalizePhone(String(params[2] || ""));
      return finish(
        db.appointments
          .filter(
            (appointment) =>
              appointment.id === params[0] &&
              (appointment.reschedule_token === params[1] ||
                (normalizedPhone !== "" && normalizePhone(appointment.client_phone) === normalizedPhone)),
          )
          .map((appointment) => {
            const client = db.clients.find(
              (item) => item.master_id === appointment.master_id && item.normalized_phone === normalizePhone(appointment.client_phone),
            );
            return {
              telegram_chat_id: client?.telegram_chat_id || "",
              telegram_username: client?.telegram_username || "",
              client_name: appointment.client_name,
            };
          })
          .filter((row) => row.telegram_chat_id || text.includes("appointments.client_name")),
      );
    }

    if (text.includes("insert into telegram_chats")) {
      const [chat_id, username, first_name, last_name] = params as [string, string, string, string];
      const existing = db.telegram_chats.find((chat) => chat.chat_id === chat_id);
      if (existing) {
        Object.assign(existing, { username, first_name, last_name, last_seen_at: now() });
      } else {
        db.telegram_chats.push({ chat_id, username, first_name, last_name, last_seen_at: now() });
      }
      changed = true;
      return finish([]);
    }

    if (text.includes("from telegram_connect_tokens") && text.includes("where token = $1 and used_at is null")) {
      return finish(
        db.telegram_connect_tokens.filter(
          (item) => item.token === params[0] && !item.used_at && new Date(item.expires_at).getTime() > Date.now(),
        ),
      );
    }

    if (text.includes("update clients set telegram_chat_id = $1")) {
      const [telegram_chat_id, telegram_username, id, master_id] = params as [string, string, string, string];
      const client = db.clients.find((item) => item.id === id && item.master_id === master_id);
      if (client) {
        Object.assign(client, {
          telegram_chat_id,
          telegram_username,
          telegram_connected_at: now(),
          updated_at: now(),
        });
        changed = true;
      }
      return finish([]);
    }

    if (text.includes("update telegram_connect_tokens set used_at = now() where token = $1")) {
      const token = db.telegram_connect_tokens.find((item) => item.token === params[0]);
      if (token) {
        token.used_at = now();
        changed = true;
      }
      return finish([]);
    }

    if (text.includes("select id from telegram_reminders where appointment_id = $1 and reminder_type = $2")) {
      return finish(
        db.telegram_reminders
          .filter((item) => item.appointment_id === params[0] && item.reminder_type === params[1])
          .map((item) => ({ id: item.id })),
      );
    }

    if (text.includes("insert into telegram_reminders")) {
      const [appointment_id, reminder_type] = params as [string, string];
      const existing = db.telegram_reminders.find(
        (item) => item.appointment_id === appointment_id && item.reminder_type === reminder_type,
      );
      if (existing) return finish([]);
      const reminder = { id: randomUUID(), appointment_id, reminder_type, sent_at: now() };
      db.telegram_reminders.push(reminder);
      changed = true;
      return finish([{ id: reminder.id }]);
    }

    if (text.includes("from appointments") && text.includes("join masters on masters.id = appointments.master_id") && text.includes("join clients")) {
      const start = new Date();
      const end = new Date(Date.now() + 2 * 86400000);
      return finish(
        db.appointments
          .filter((appointment) => (appointment.status || "active") !== "cancelled")
          .map((appointment) => {
            const date = new Date(`${appointment.date}T00:00:00`);
            const client = db.clients.find(
              (item) => item.master_id === appointment.master_id && item.normalized_phone === normalizePhone(appointment.client_phone),
            );
            if (!client?.telegram_chat_id || date < new Date(start.getFullYear(), start.getMonth(), start.getDate()) || date > end) return null;
            const service = db.services.find((item) => item.id === appointment.service_id);
            const master = db.masters.find((item) => item.id === appointment.master_id);
            return {
              id: appointment.id,
              date: appointment.date,
              start_time: appointment.start_time,
              client_name: appointment.client_name,
              telegram_chat_id: client.telegram_chat_id,
              service_title: service?.title || null,
              master_name: master?.name || null,
              address: master?.address || null,
              city: master?.city || null,
            };
          })
          .filter(Boolean),
      );
    }

    if (text.includes("from appointments where master_id = $1")) {
      const excludeCancelled = text.includes("coalesce(status, 'active') <> 'cancelled'");
      return finish(
        db.appointments
          .filter((appointment) => appointment.master_id === params[0])
          .filter((appointment) => !excludeCancelled || (appointment.status || "active") !== "cancelled")
          .sort((a, b) => `${b.date} ${b.start_time}`.localeCompare(`${a.date} ${a.start_time}`)),
      );
    }

    if (text.includes("insert into appointments")) {
      const [master_id, service_id, date, start_time, end_time, client_name, client_phone] = params as [
        string,
        string | null,
        string,
        string,
        string,
        string,
        string,
      ];
      const appointment: Appointment = {
        id: randomUUID(),
        master_id,
        service_id,
        service_ids: Array.isArray(params[9]) ? (params[9] as string[]) : typeof params[9] === "string" ? JSON.parse(params[9] || "[]") : [],
        date,
        start_time,
        end_time,
        client_name,
        client_phone,
        client_email: String(params[7] || ""),
        client_telegram: String(params[8] || ""),
        status: "active",
        notes: "",
        cancel_token: randomUUID(),
        reschedule_token: randomUUID(),
        created_at: now(),
      };
      db.appointments.push(appointment);
      changed = true;
      return finish([appointment]);
    }

    if (text.includes("update appointments set")) {
      const [service_id, date, start_time, end_time, client_name, client_phone, id, ownerKey] = params as [
        string | null,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ];
      const usesRescheduleToken = text.includes("reschedule_token = $8");
      const appointment = db.appointments.find(
        (item) => item.id === id && (usesRescheduleToken ? item.reschedule_token === ownerKey : item.master_id === ownerKey),
      );
      if (!appointment) return finish([]);
      Object.assign(appointment, {
        service_id,
        service_ids: Array.isArray(params[8]) ? (params[8] as string[]) : typeof params[8] === "string" ? JSON.parse(params[8] || "[]") : [],
        date,
        start_time,
        end_time,
        client_name,
        client_phone,
        status: typeof params[9] === "string" && params[9] ? (params[9] as string) : appointment.status,
        notes: params[10] === null || params[10] === undefined ? appointment.notes || "" : String(params[10]),
      });
      changed = true;
      return finish([appointment]);
    }

    if (text.includes("delete from appointments where id = $1 and master_id = $2")) {
      const before = db.appointments.length;
      db.appointments = db.appointments.filter((appointment) => !(appointment.id === params[0] && appointment.master_id === params[1]));
      changed = db.appointments.length !== before;
      return finish([]);
    }

    if (text.includes("select id, date::text, start_time, end_time, reason from blocked_times where master_id = $1")) {
      return finish(db.blocked_times.filter((item) => item.master_id === params[0]).sort((a, b) => `${b.date} ${a.start_time}`.localeCompare(`${a.date} ${b.start_time}`)));
    }

    if (text.includes("insert into blocked_times")) {
      const [master_id, date, start_time, end_time, reason] = params as [string, string, string, string, string];
      const blockedTime: BlockedTime = { id: randomUUID(), master_id, date, start_time, end_time, reason };
      db.blocked_times.push(blockedTime);
      changed = true;
      return finish([blockedTime]);
    }

    if (text.includes("delete from blocked_times where id = $1 and master_id = $2")) {
      const before = db.blocked_times.length;
      db.blocked_times = db.blocked_times.filter((item) => !(item.id === params[0] && item.master_id === params[1]));
      changed = db.blocked_times.length !== before;
      return finish([]);
    }

    if (text.includes("insert into clients") && !text.includes("values ($1")) {
      return finish([]);
    }

    if (text.includes("insert into clients")) {
      const [masterId, name, phone] = params as [string, string, string, string];
      const id = ensureClient(db, masterId, name, phone);
      changed = Boolean(id);
      return finish(id ? [{ id }] : []);
    }

    if (text.includes("from clients left join appointments")) {
      return finish(listClients(db, String(params[0])));
    }

    if (text.includes("update clients set notes = $1")) {
      const [notes, masterId, normalizedPhone] = params as [string, string, string];
      const client = db.clients.find((item) => item.master_id === masterId && item.normalized_phone === normalizedPhone);
      if (client) {
        client.notes = notes;
        client.updated_at = now();
        changed = true;
      }
      return finish([]);
    }

    if (text.includes("select id from clients where master_id = $1 and normalized_phone = $2 and id <> $3")) {
      return finish(
        db.clients
          .filter((client) => client.master_id === params[0] && client.normalized_phone === params[1] && client.id !== params[2])
          .map((client) => ({ id: client.id })),
      );
    }

    if (text.includes("update clients set name = $1, phone = $2, notes = $3")) {
      const [name, phone, notes, id, masterId] = params as [string, string, string, string, string];
      const client = db.clients.find((item) => item.id === id && item.master_id === masterId);
      if (!client) return finish([]);
      Object.assign(client, { name, phone, notes, normalized_phone: normalizePhone(phone), updated_at: now() });
      changed = true;
      return finish([]);
    }

    if (text.includes("update clients set name = $1, phone = $2, normalized_phone = $3")) {
      const [name, phone, normalized_phone, notes, id, masterId] = params as [string, string, string, string, string, string];
      const client = db.clients.find((item) => item.id === id && item.master_id === masterId);
      if (!client) return finish([]);
      Object.assign(client, { name, phone, normalized_phone, notes, updated_at: now() });
      changed = true;
      return finish([client]);
    }

    if (text.includes("delete from clients where id = $1 and master_id = $2")) {
      const before = db.clients.length;
      db.clients = db.clients.filter((client) => !(client.id === params[0] && client.master_id === params[1]));
      changed = db.clients.length !== before;
      return finish([]);
    }

    if (text.includes("select count(*)::text as total from clients where coalesce(telegram_chat_id")) {
      return finish([{ total: String(db.clients.filter((client) => client.telegram_chat_id).length) }]);
    }

    if (text.includes("select count(*)::text as total from telegram_chats")) {
      return finish([{ total: String(db.telegram_chats.length) }]);
    }

    if (text.includes("select count(*)::text as total from telegram_connect_tokens")) {
      return finish([
        {
          total: String(
            db.telegram_connect_tokens.filter((token) => !token.used_at && new Date(token.expires_at).getTime() > Date.now()).length,
          ),
        },
      ]);
    }

    if (text.includes("select count(*)::text as total from telegram_reminders")) {
      return finish([{ total: String(db.telegram_reminders.length) }]);
    }

    if (text.includes("select clients.name") && text.includes("clients.telegram_username") && text.includes("join masters on masters.id = clients.master_id")) {
      return finish(
        db.clients
          .filter((client) => client.telegram_chat_id)
          .map((client) => {
            const master = db.masters.find((item) => item.id === client.master_id);
            return {
              name: client.name,
              phone: client.phone,
              telegram_username: client.telegram_username || "",
              telegram_connected_at: client.telegram_connected_at || null,
              master_name: master?.name || "",
            };
          })
          .sort((a, b) => String(b.telegram_connected_at || "").localeCompare(String(a.telegram_connected_at || "")))
          .slice(0, 10),
      );
    }

    if (text.includes("update masters set booking_enabled = $1")) {
      const [
        booking_enabled,
        auto_time_snap,
        buffer_min,
        slot_step_min,
        weeklySchedule,
        workDays,
        work_end,
        work_start,
        max_booking_days_ahead,
        timezone,
        id,
      ] = params as [
        boolean,
        boolean,
        number,
        number,
        string,
        string,
        string,
        string,
        number | undefined,
        string | undefined,
        string,
      ];
      const master = text.includes("where user_id = $20")
        ? db.masters.find((item) => item.user_id === id)
        : db.masters.find((item) => item.id === id);
      if (master) {
        Object.assign(master, {
          booking_enabled,
          auto_time_snap,
          buffer_min,
          slot_step_min,
          weekly_schedule: JSON.parse(weeklySchedule || "{}"),
          work_days: JSON.parse(workDays || "[]"),
          work_end,
          work_start,
          max_booking_days_ahead: Number(max_booking_days_ahead) || 14,
          timezone: timezone || "Europe/Moscow",
          updated_at: now(),
        });
        changed = true;
      }
      return finish([]);
    }

    if (text.includes("update masters set notes = $1")) {
      const [
        notes,
        profession,
        description,
        city,
        address,
        isOnline,
        phone,
        contactLink,
        socialLinks,
        coverPositionX,
        coverPositionY,
        timezone,
        primaryColor,
        buttonColor,
        ctaText,
        visibleSections,
        requiredFields,
        showPrice,
        maxDays,
        id,
      ] = params as [
        string,
        string,
        string,
        string,
        string,
        boolean,
        string,
        string,
        string,
        number,
        number,
        string,
        string,
        string,
        string,
        string,
        string,
        boolean,
        number,
        string,
      ];
      const master = text.includes("where user_id = $20")
        ? db.masters.find((item) => item.user_id === id)
        : db.masters.find((item) => item.id === id);
      if (!master) return finish([]);
      Object.assign(master, {
        notes,
        profession,
        description,
        city,
        address,
        is_online: isOnline,
        phone,
        contact_link: contactLink,
        social_links: JSON.parse(socialLinks || "{}"),
        cover_position_x: coverPositionX,
        cover_position_y: coverPositionY,
        timezone,
        primary_color: primaryColor,
        button_color: buttonColor,
        cta_text: ctaText,
        visible_sections: JSON.parse(visibleSections || "{}"),
        required_fields: JSON.parse(requiredFields || "{}"),
        show_price: showPrice,
        max_booking_days_ahead: maxDays,
        updated_at: now(),
      });
      changed = true;
      return finish([master]);
    }

    if (text.includes("update masters set cover_image_url = $1")) {
      const [url, id] = params as [string, string];
      const master = db.masters.find((item) => item.id === id);
      if (!master) return finish([]);
      master.cover_image_url = url;
      master.updated_at = now();
      changed = true;
      return finish([master]);
    }

    if (text.includes("update masters set avatar_url = $1")) {
      const [url, id] = params as [string, string];
      const master = db.masters.find((item) => item.id === id);
      if (!master) return finish([]);
      master.avatar_url = url;
      master.updated_at = now();
      changed = true;
      return finish([master]);
    }

    if (text.includes("update users set name = $1 where email = $2")) {
      const [name, email] = params as [string, string];
      const user = db.users.find((item) => item.email === email);
      const master = user ? db.masters.find((item) => item.user_id === user.id) : null;
      if (user) user.name = name;
      if (master) {
        master.name = name;
        master.updated_at = now();
      }
      changed = Boolean(user);
      return finish([]);
    }

    if (text.includes("update masters set slug = $1")) {
      const [slug, email] = params as [string, string];
      const user = db.users.find((item) => item.email === email);
      const master = user ? db.masters.find((item) => item.user_id === user.id) : null;
      if (!master) return finish([]);
      master.slug = slug;
      master.updated_at = now();
      changed = true;
      return finish([{ id: master.id }]);
    }

    if (text.includes("update users set password = $1 where email = $2")) {
      const [password, email] = params as [string, string];
      const user = db.users.find((item) => item.email === email);
      if (user) {
        user.password = password;
        changed = true;
      }
      return finish([]);
    }

    if (text.includes("delete from users where email = $1")) {
      const user = db.users.find((item) => item.email === params[0]);
      if (user) {
        const masterIds = db.masters.filter((master) => master.user_id === user.id).map((master) => master.id);
        db.users = db.users.filter((item) => item.id !== user.id);
        db.masters = db.masters.filter((master) => master.user_id !== user.id);
        db.services = db.services.filter((service) => !masterIds.includes(service.master_id));
        db.appointments = db.appointments.filter((appointment) => !masterIds.includes(appointment.master_id));
        db.clients = db.clients.filter((client) => !masterIds.includes(client.master_id));
        db.blocked_times = db.blocked_times.filter((item) => !masterIds.includes(item.master_id));
        changed = true;
      }
      return finish([]);
    }

    if (text.includes("count(distinct services.id) as services_count")) {
      return finish(
        db.users
          .map((user) => {
            const master = db.masters.find((item) => item.user_id === user.id);
            if (!master) return null;
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              password: user.password,
              created_at: user.created_at,
              master_id: master.id,
              master_name: master.name,
              slug: master.slug,
              services_count: String(db.services.filter((service) => service.master_id === master.id).length),
              appointments_count: String(db.appointments.filter((appointment) => appointment.master_id === master.id).length),
              revenue: "0",
            };
          })
          .filter(Boolean)
          .sort((a, b) => String(b!.created_at).localeCompare(String(a!.created_at))),
      );
    }

    if (text.includes("select coalesce(sum(services.price), 0) as total")) {
      return finish([{ total: String(revenueForMaster(db, String(params[0]))) }]);
    }

    return finish([]);
  }
}
