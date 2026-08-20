import { NextResponse } from "next/server";
import { getCurrentUserAndMaster, initDb, pool } from "../../../lib/db";

type ServiceRow = {
  id: string;
  title: string;
  price: number;
  duration_min: number;
  notes?: string;
  description?: string;
  category?: string;
  included_items?: string[] | string;
  material_name?: string;
  material_cost?: number;
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
const getServiceIncludedItems = (service: ServiceRow) =>
  parseStringList(service.included_items).filter((item) => !isStoredUploadUrl(item));
const normalizeBoolean = (value: unknown) => value === true || value === 1 || value === "1" || value === "true";

const mapService = (service: ServiceRow) => ({
  id: service.id,
  title: service.title,
  category: service.category || "",
  duration: service.duration_min,
  price: service.price,
  description: service.description || "",
  preparation: service.notes || "",
  includedItems: getServiceIncludedItems(service),
  materialName: service.material_name || "",
  materialCost: Number(service.material_cost) || 0,
  priceFrom: normalizeBoolean(service.price_from),
  photoUrl: getServicePhotoUrl(service),
  onlineBookingEnabled: service.is_public !== false,
  active: service.is_active !== false,
  calendarColor: service.calendar_color || "#0f766e",
  notes: service.notes || "",
  sortOrder: service.sort_order || 0,
  isPublic: service.is_public !== false,
  isActive: service.is_active !== false,
});

export async function GET() {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });
    await initDb();
    const result = await pool.query<ServiceRow>(
      useLocalDb
        ? "SELECT id, title, price, duration_min, notes, description, category, included_items, material_name, material_cost, price_from, photo_url, calendar_color, sort_order, is_public, is_active FROM services WHERE master_id = $1 ORDER BY title"
        : "SELECT id, title, price, duration_min, notes, description, category, included_items, material_name, material_cost, price_from, photo_url, calendar_color, sort_order, is_public, is_active FROM services WHERE master_id = $1 ORDER BY sort_order, title",
      [session.master.id],
    );

    return NextResponse.json(
      { success: true, services: result.rows.map(mapService) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Services GET error:", error);
    return NextResponse.json({ success: false, error: "Ошибка загрузки услуг." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });
    const body = (await request.json()) as {
      title?: string;
      price?: number;
      duration?: number;
      durationMin?: number;
      notes?: string;
      description?: string;
      category?: string;
      includedItems?: string[];
      materialName?: string;
      materialCost?: number;
      priceFrom?: boolean;
      photoUrl?: string;
      calendarColor?: string;
      sortOrder?: number;
      active?: boolean;
      isActive?: boolean;
      onlineBookingEnabled?: boolean;
      isPublic?: boolean;
    };

    const title = (body.title || "").trim();
    const price = Number(body.price) || 0;
    const duration = Number(body.durationMin ?? body.duration) || 60;
    const notes = (body.notes ?? "").trim();
    const description = (body.description ?? "").trim();
    const category = (body.category || "").trim();
    const includedItems = Array.isArray(body.includedItems) ? body.includedItems.map((item) => String(item).trim()).filter(Boolean) : [];
    const materialName = (body.materialName || "").trim();
    const materialCost = Math.max(0, Number(body.materialCost) || 0);
    const priceFrom = normalizeBoolean(body.priceFrom);
    const photoUrl = getUsableImageUrl(body.photoUrl);
    const calendarColor = (body.calendarColor || "#0f766e").trim();
    const sortOrder = Number(body.sortOrder) || 0;
    const isPublic = body.isPublic ?? body.onlineBookingEnabled ?? true;
    const isActive = body.isActive ?? body.active ?? true;

    if (!title || price < 0 || duration <= 0) {
      return NextResponse.json({ success: false, error: "Заполните корректные данные услуги." }, { status: 400 });
    }

    await initDb();
    const result = await pool.query<ServiceRow>(
      `
        INSERT INTO services (master_id, title, price, duration_min, notes, description, category, included_items, material_name, material_cost, price_from, photo_url, calendar_color, sort_order, is_public, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id, title, price, duration_min, notes, description, category, included_items, material_name, material_cost, price_from, photo_url, calendar_color, sort_order, is_public, is_active
      `,
      [session.master.id, title, price, duration, notes, description, category, JSON.stringify(includedItems), materialName, materialCost, priceFrom, photoUrl, calendarColor, sortOrder, isPublic !== false, isActive !== false],
    );

    return NextResponse.json(
      { success: true, service: mapService(result.rows[0]) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Services POST error:", error);
    if (error instanceof Error && error.name === "SUBSCRIPTION_REQUIRED") {
      return NextResponse.json({ success: false, error: error.message }, { status: 402 });
    }
    return NextResponse.json({ success: false, error: "Ошибка создания услуги." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });
    const body = (await request.json()) as {
      id?: string;
      title?: string;
      price?: number;
      duration?: number;
      durationMin?: number;
      notes?: string;
      description?: string;
      category?: string;
      includedItems?: string[];
      materialName?: string;
      materialCost?: number;
      priceFrom?: boolean;
      photoUrl?: string;
      calendarColor?: string;
      sortOrder?: number;
      active?: boolean;
      isActive?: boolean;
      onlineBookingEnabled?: boolean;
      isPublic?: boolean;
    };

    if (!body.id) {
      return NextResponse.json({ success: false, error: "ID услуги обязателен." }, { status: 400 });
    }

    await initDb();
    const title = (body.title || "").trim();
    const price = Number(body.price) || 0;
    const duration = Number(body.durationMin ?? body.duration) || 60;
    const notes = (body.notes ?? "").trim();
    const description = (body.description ?? "").trim();
    const category = (body.category || "").trim();
    const includedItems = Array.isArray(body.includedItems) ? body.includedItems.map((item) => String(item).trim()).filter(Boolean) : [];
    const materialName = (body.materialName || "").trim();
    const materialCost = Math.max(0, Number(body.materialCost) || 0);
    const priceFrom = normalizeBoolean(body.priceFrom);
    const existingResult = await pool.query<ServiceRow>(
      "SELECT id, title, price, duration_min, notes, description, category, included_items, material_name, material_cost, price_from, photo_url, calendar_color, sort_order, is_public, is_active FROM services WHERE id = $1 AND master_id = $2",
      [body.id, session.master.id],
    );
    const existingPhotoUrl = existingResult.rows[0] ? getServicePhotoUrl(existingResult.rows[0]) : "";
    const hasPhotoUrl = Object.prototype.hasOwnProperty.call(body, "photoUrl");
    const photoUrl = hasPhotoUrl ? getUsableImageUrl(body.photoUrl) : existingPhotoUrl;
    const calendarColor = (body.calendarColor || "#0f766e").trim();
    const sortOrder = Number(body.sortOrder) || 0;
    const isPublic = body.isPublic ?? body.onlineBookingEnabled ?? true;
    const isActive = body.isActive ?? body.active ?? true;

    const result = await pool.query<ServiceRow>(
      `
        UPDATE services
        SET title = $1, price = $2, duration_min = $3, notes = $4, description = $5, category = $6, included_items = $7::jsonb, material_name = $8, material_cost = $9, price_from = $10, photo_url = $11, calendar_color = $12, sort_order = $13, is_public = $14, is_active = $15
        WHERE id = $16 AND master_id = $17
        RETURNING id, title, price, duration_min, notes, description, category, included_items, material_name, material_cost, price_from, photo_url, calendar_color, sort_order, is_public, is_active
      `,
      [title, price, duration, notes, description, category, JSON.stringify(includedItems), materialName, materialCost, priceFrom, photoUrl, calendarColor, sortOrder, isPublic !== false, isActive !== false, body.id, session.master.id],
    );

    if (!result.rowCount && useLocalDb) {
      const restored = await pool.query<ServiceRow>(
        `
          INSERT INTO services (id, master_id, title, price, duration_min, notes, description, category, included_items, material_name, material_cost, price_from, photo_url, calendar_color, sort_order, is_public, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING id, title, price, duration_min, notes, description, category, included_items, material_name, material_cost, price_from, photo_url, calendar_color, sort_order, is_public, is_active
        `,
        [body.id, session.master.id, title, price, duration, notes, description, category, JSON.stringify(includedItems), materialName, materialCost, priceFrom, photoUrl, calendarColor, sortOrder, isPublic !== false, isActive !== false],
      );
      return NextResponse.json(
        { success: true, service: mapService(restored.rows[0]) },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (!result.rowCount) {
      return NextResponse.json({ success: false, error: "Услуга не найдена." }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, service: mapService(result.rows[0]) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Services PUT error:", error);
    if (error instanceof Error && error.name === "SUBSCRIPTION_REQUIRED") {
      return NextResponse.json({ success: false, error: error.message }, { status: 402 });
    }
    return NextResponse.json({ success: false, error: "Ошибка сохранения услуги." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "ID услуги обязателен." }, { status: 400 });

    await pool.query("DELETE FROM services WHERE id = $1 AND master_id = $2", [id, session.master.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Services DELETE error:", error);
    if (error instanceof Error && error.name === "SUBSCRIPTION_REQUIRED") {
      return NextResponse.json({ success: false, error: error.message }, { status: 402 });
    }
    return NextResponse.json({ success: false, error: "Ошибка удаления услуги." }, { status: 500 });
  }
}
