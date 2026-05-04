import { NextResponse } from "next/server";
import { addMinutes, getCurrentUserAndMaster, initDb, pool } from "../../../lib/db";

type AppointmentRow = {
  id: string;
  service_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  client_name: string;
  client_phone: string;
};

const mapAppointment = (appointment: AppointmentRow) => ({
  id: appointment.id,
  date: appointment.date,
  time: appointment.start_time,
  start: appointment.start_time,
  end: appointment.end_time,
  client: appointment.client_name,
  phone: appointment.client_phone,
  clientName: appointment.client_name,
  clientPhone: appointment.client_phone,
  serviceId: appointment.service_id || "",
  status: "Активна",
});

async function getMasterIdFromRequest(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (slug) {
    await initDb();
    const result = await pool.query<{ id: string }>("SELECT id FROM masters WHERE slug = $1", [slug]);
    return result.rows[0]?.id || null;
  }

  const session = await getCurrentUserAndMaster();
  return session?.master.id || null;
}

export async function GET(request: Request) {
  try {
    const masterId = await getMasterIdFromRequest(request);
    if (!masterId) return NextResponse.json({ success: false, error: "Мастер не найден." }, { status: 404 });

    const result = await pool.query<AppointmentRow>(
      `
        SELECT id, service_id, date::text, start_time, end_time, client_name, client_phone
        FROM appointments
        WHERE master_id = $1
        ORDER BY date DESC, start_time DESC
      `,
      [masterId],
    );

    return NextResponse.json({ success: true, appointments: result.rows.map(mapAppointment) });
  } catch (error) {
    console.error("Appointments GET error:", error);
    return NextResponse.json({ success: false, error: "Ошибка загрузки записей." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      masterSlug?: string;
      slug?: string;
      serviceId?: string;
      date?: string;
      time?: string;
      start?: string;
      end?: string;
      client?: string;
      phone?: string;
      clientName?: string;
      clientPhone?: string;
    };

    await initDb();

    let masterId: string | null = null;
    if (body.masterSlug || body.slug) {
      const master = await pool.query<{ id: string }>("SELECT id FROM masters WHERE slug = $1", [body.masterSlug || body.slug]);
      masterId = master.rows[0]?.id || null;
    } else {
      const session = await getCurrentUserAndMaster();
      masterId = session?.master.id || null;
    }

    if (!masterId) return NextResponse.json({ success: false, error: "Мастер не найден." }, { status: 404 });

    const serviceId = body.serviceId || null;
    const date = body.date || "";
    const start = body.start || body.time || "";
    const clientName = (body.clientName || body.client || "").trim();
    const clientPhone = (body.clientPhone || body.phone || "").trim();

    if (!date || !start || !clientName || !clientPhone) {
      return NextResponse.json({ success: false, error: "Заполните дату, время, имя и телефон." }, { status: 400 });
    }

    let end = body.end || "";
    if (!end && serviceId) {
      const service = await pool.query<{ duration_min: number }>("SELECT duration_min FROM services WHERE id = $1 AND master_id = $2", [
        serviceId,
        masterId,
      ]);
      end = addMinutes(start, service.rows[0]?.duration_min || 60);
    }
    if (!end) end = addMinutes(start, 60);

    const result = await pool.query<AppointmentRow>(
      `
        INSERT INTO appointments (master_id, service_id, date, start_time, end_time, client_name, client_phone)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, service_id, date::text, start_time, end_time, client_name, client_phone
      `,
      [masterId, serviceId, date, start, end, clientName, clientPhone],
    );

    return NextResponse.json({ success: true, appointment: mapAppointment(result.rows[0]) });
  } catch (error) {
    console.error("Appointments POST error:", error);
    return NextResponse.json({ success: false, error: "Ошибка создания записи." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });

    const body = (await request.json()) as {
      id?: string;
      serviceId?: string;
      date?: string;
      time?: string;
      start?: string;
      end?: string;
      client?: string;
      phone?: string;
      clientName?: string;
      clientPhone?: string;
    };

    if (!body.id) return NextResponse.json({ success: false, error: "ID записи обязателен." }, { status: 400 });

    const start = body.start || body.time || "";
    const end = body.end || addMinutes(start, 60);
    const result = await pool.query<AppointmentRow>(
      `
        UPDATE appointments
        SET service_id = $1, date = $2, start_time = $3, end_time = $4, client_name = $5, client_phone = $6
        WHERE id = $7 AND master_id = $8
        RETURNING id, service_id, date::text, start_time, end_time, client_name, client_phone
      `,
      [
        body.serviceId || null,
        body.date,
        start,
        end,
        (body.clientName || body.client || "").trim(),
        (body.clientPhone || body.phone || "").trim(),
        body.id,
        session.master.id,
      ],
    );

    if (!result.rowCount) {
      return NextResponse.json({ success: false, error: "Запись не найдена." }, { status: 404 });
    }

    return NextResponse.json({ success: true, appointment: mapAppointment(result.rows[0]) });
  } catch (error) {
    console.error("Appointments PUT error:", error);
    return NextResponse.json({ success: false, error: "Ошибка сохранения записи." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "ID записи обязателен." }, { status: 400 });

    await pool.query("DELETE FROM appointments WHERE id = $1 AND master_id = $2", [id, session.master.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Appointments DELETE error:", error);
    return NextResponse.json({ success: false, error: "Ошибка удаления записи." }, { status: 500 });
  }
}
