import { NextResponse } from "next/server";
import { mapBookingSettings } from "../../../../lib/booking-page";
import { initDb, pool } from "../../../../lib/db";

type ServiceRow = {
  id: string;
  title: string;
  price: number;
  duration_min: number;
  notes?: string;
  description?: string;
  category?: string;
  included_items?: string[] | string;
  price_from?: boolean;
  photo_url?: string;
  calendar_color?: string;
  sort_order?: number;
  is_public?: boolean;
  is_active?: boolean;
};

const useLocalDb = process.env.USE_LOCAL_DB === "1" || !process.env.DATABASE_URL;
const isStoredUploadUrl = (value: unknown) => typeof value === "string" && value.startsWith("/uploads/");
const getUsableImageUrl = (value: unknown) => {
  if (typeof value !== "string") return "";
  const text = value.trim();
  if (/^https?:\/\//i.test(text)) return text;
  return isStoredUploadUrl(text) ? text : "";
};
const parseStringList = (value: unknown) => {
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
const getServicePhotoUrl = (service: ServiceRow) =>
  getUsableImageUrl(service.photo_url) ||
  parseStringList(service.included_items).map(getUsableImageUrl).find(Boolean) ||
  "";
const normalizeBoolean = (value: unknown) => value === true || value === 1 || value === "1" || value === "true";

type AppointmentRow = {
  id: string;
  service_id: string | null;
  service_ids?: string[] | null;
  date: string;
  start_time: string;
  end_time: string;
  client_name: string;
  client_phone: string;
  status?: string;
};

const normalizeServiceIds = (serviceIds: unknown, fallbackServiceId: string | null) => {
  if (Array.isArray(serviceIds)) {
    const ids = serviceIds.filter((item): item is string => typeof item === "string" && item.length > 0);
    if (ids.length) return ids;
  }
  return fallbackServiceId ? [fallbackServiceId] : [];
};

type BlockedTimeRow = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
};

type MasterPublicRow = {
  id: string;
  email: string;
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
};

const formatDateKey = (date: Date) => date.toISOString().slice(0, 10);

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const url = new URL(request.url);
    const includeAvailability = url.searchParams.get("availability") === "1";

    await initDb();

    const masterResult = await pool.query<MasterPublicRow>(
      `
        SELECT
          masters.id,
          users.email,
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
          masters.max_booking_days_ahead
        FROM masters
        JOIN users ON users.id = masters.user_id
        WHERE masters.slug = $1
        LIMIT 1
      `,
      [slug],
    );

    const master = masterResult.rows[0];
    if (!master) {
      return NextResponse.json({ success: false, error: "Мастер не найден." }, { status: 404 });
    }

    const settings = mapBookingSettings(master);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + Math.max(1, Number(settings.maxBookingDaysAhead) || 14));
    const availabilityParams = [master.id, formatDateKey(today), formatDateKey(endDate)];

    const [services, appointments, blockedTimes] = await Promise.all([
      pool.query<ServiceRow>(
        useLocalDb
          ? "SELECT id, title, price, duration_min, notes, description, category, included_items, price_from, photo_url, calendar_color, sort_order, is_public, is_active FROM services WHERE master_id = $1 AND is_public = TRUE AND is_active = TRUE ORDER BY title"
          : `
            SELECT id, title, price, duration_min, notes, description, category, included_items, price_from, photo_url, calendar_color, sort_order, is_public, is_active
            FROM services
            WHERE master_id = $1 AND is_public = TRUE AND is_active = TRUE
            ORDER BY sort_order, title
        `,
        [master.id],
      ),
      includeAvailability
        ? pool.query<AppointmentRow>(
            useLocalDb
              ? "SELECT id, service_id, service_ids, date::text, start_time, end_time, client_name, client_phone FROM appointments WHERE master_id = $1 AND date BETWEEN $2 AND $3 AND COALESCE(status, 'active') <> 'cancelled'"
              : "SELECT id, service_id, service_ids, date::text, start_time, end_time, client_name, client_phone, status FROM appointments WHERE master_id = $1 AND date BETWEEN $2 AND $3 AND COALESCE(status, 'active') <> 'cancelled'",
            availabilityParams,
          )
        : Promise.resolve({ rows: [], rowCount: 0 }),
      includeAvailability
        ? pool.query<BlockedTimeRow>(
            "SELECT id, date::text, start_time, end_time, reason FROM blocked_times WHERE master_id = $1 AND date BETWEEN $2 AND $3",
            availabilityParams,
          )
        : Promise.resolve({ rows: [], rowCount: 0 }),
    ]);

    return NextResponse.json(
      {
        success: true,
        master: {
        id: master.id,
        email: master.email,
        name: master.name,
        slug: master.slug,
        notes: master.notes || "",
        profession: master.profession || "",
        description: master.description || "",
        city: master.city || "",
        address: master.address || "",
        isOnline: master.is_online,
        phone: master.phone || "",
        contactLink: master.contact_link || "",
        socialLinks: master.social_links || {},
        coverImageUrl: master.cover_image_url || "",
        avatarUrl: master.avatar_url || "",
        coverPositionX: master.cover_position_x ?? 50,
        coverPositionY: master.cover_position_y ?? 50,
        timezone: settings.timezone,
        primaryColor: settings.primaryColor,
        buttonColor: settings.buttonColor,
        ctaText: settings.ctaText,
        visibleSections: settings.visibleSections,
        requiredFields: settings.requiredFields,
        workStart: master.work_start,
        workEnd: master.work_end,
        slotStepMin: master.slot_step_min,
        bufferMin: master.buffer_min,
        workDays: master.work_days,
        bookingEnabled: master.booking_enabled,
        autoTimeSnap: master.auto_time_snap !== false,
        weeklySchedule: master.weekly_schedule || {},
        showPrice: settings.showPrice,
        maxBookingDaysAhead: settings.maxBookingDaysAhead,
        },
        services: services.rows.map((service) => ({
        id: service.id,
        title: service.title,
        category: service.category || "",
        duration: service.duration_min,
        durationMinutes: service.duration_min,
        price: service.price,
        priceFrom: normalizeBoolean(service.price_from),
        description: service.description || service.notes || "",
        notes: service.notes || "",
        active: service.is_active !== false,
        onlineBookingEnabled: service.is_public !== false,
        photoUrl: getServicePhotoUrl(service),
        calendarColor: service.calendar_color || "#0f766e",
        sortOrder: service.sort_order || 0,
        })),
        appointments: appointments.rows.map((appointment) => ({
        id: appointment.id,
        date: appointment.date,
        time: appointment.start_time,
        start: appointment.start_time,
        end: appointment.end_time,
        client: appointment.client_name,
        phone: appointment.client_phone,
        serviceId: appointment.service_id || "",
        serviceIds: normalizeServiceIds(appointment.service_ids, appointment.service_id),
        status: appointment.status || "active",
        })),
        blockedTimes: blockedTimes.rows.map((item) => ({
        id: item.id,
        date: item.date,
        start: item.start_time,
        end: item.end_time,
        reason: item.reason || "",
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Master GET error:", error);
    return NextResponse.json({ success: false, error: "Ошибка загрузки мастера." }, { status: 500 });
  }
}
