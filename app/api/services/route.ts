import { NextResponse } from "next/server";
import { getCurrentUserAndMaster, initDb, pool } from "../../../lib/db";

type ServiceRow = {
  id: string;
  title: string;
  price: number;
  duration_min: number;
  notes: string;
};

const mapService = (service: ServiceRow) => ({
  id: service.id,
  title: service.title,
  category: "",
  duration: service.duration_min,
  price: service.price,
  description: service.notes || "",
  preparation: "",
  active: true,
  notes: service.notes || "",
});

export async function GET() {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });

    const result = await pool.query<ServiceRow>(
      "SELECT id, title, price, duration_min, notes FROM services WHERE master_id = $1 ORDER BY title",
      [session.master.id],
    );

    return NextResponse.json({ success: true, services: result.rows.map(mapService) });
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
    };

    const title = (body.title || "").trim();
    const price = Number(body.price) || 0;
    const duration = Number(body.durationMin ?? body.duration) || 60;
    const notes = (body.notes ?? body.description ?? "").trim();

    if (!title || price < 0 || duration <= 0) {
      return NextResponse.json({ success: false, error: "Заполните корректные данные услуги." }, { status: 400 });
    }

    await initDb();
    const result = await pool.query<ServiceRow>(
      `
        INSERT INTO services (master_id, title, price, duration_min, notes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, title, price, duration_min, notes
      `,
      [session.master.id, title, price, duration, notes],
    );

    return NextResponse.json({ success: true, service: mapService(result.rows[0]) });
  } catch (error) {
    console.error("Services POST error:", error);
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
    };

    if (!body.id) {
      return NextResponse.json({ success: false, error: "ID услуги обязателен." }, { status: 400 });
    }

    const title = (body.title || "").trim();
    const price = Number(body.price) || 0;
    const duration = Number(body.durationMin ?? body.duration) || 60;
    const notes = (body.notes ?? body.description ?? "").trim();

    const result = await pool.query<ServiceRow>(
      `
        UPDATE services
        SET title = $1, price = $2, duration_min = $3, notes = $4
        WHERE id = $5 AND master_id = $6
        RETURNING id, title, price, duration_min, notes
      `,
      [title, price, duration, notes, body.id, session.master.id],
    );

    if (!result.rowCount) {
      return NextResponse.json({ success: false, error: "Услуга не найдена." }, { status: 404 });
    }

    return NextResponse.json({ success: true, service: mapService(result.rows[0]) });
  } catch (error) {
    console.error("Services PUT error:", error);
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
    return NextResponse.json({ success: false, error: "Ошибка удаления услуги." }, { status: 500 });
  }
}
