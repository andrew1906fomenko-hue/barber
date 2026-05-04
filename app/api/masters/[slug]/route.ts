import { NextResponse } from "next/server";
import { initDb, pool } from "../../../../lib/db";

type ServiceRow = {
  id: string;
  title: string;
  price: number;
  duration_min: number;
  notes: string;
};

type AppointmentRow = {
  id: string;
  service_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  client_name: string;
  client_phone: string;
};

type BlockedTimeRow = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
};

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    await initDb();

    const masterResult = await pool.query<{
      id: string;
      email: string;
      name: string;
      slug: string;
      notes: string;
      work_start: string;
      work_end: string;
      slot_step_min: number;
      buffer_min: number;
      work_days: number[];
      show_price: boolean;
    }>(
      `
        SELECT
          masters.id,
          users.email,
          masters.name,
          masters.slug,
          masters.notes,
          masters.work_start,
          masters.work_end,
          masters.slot_step_min,
          masters.buffer_min,
          masters.work_days,
          masters.show_price
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

    const [services, appointments, blockedTimes] = await Promise.all([
      pool.query<ServiceRow>(
        "SELECT id, title, price, duration_min, notes FROM services WHERE master_id = $1 ORDER BY title",
        [master.id],
      ),
      pool.query<AppointmentRow>(
        "SELECT id, service_id, date::text, start_time, end_time, client_name, client_phone FROM appointments WHERE master_id = $1",
        [master.id],
      ),
      pool.query<BlockedTimeRow>(
        "SELECT id, date::text, start_time, end_time, reason FROM blocked_times WHERE master_id = $1",
        [master.id],
      ),
    ]);

    return NextResponse.json({
      success: true,
      master: {
        id: master.id,
        email: master.email,
        name: master.name,
        slug: master.slug,
        notes: master.notes || "",
        workStart: master.work_start,
        workEnd: master.work_end,
        slotStepMin: master.slot_step_min,
        bufferMin: master.buffer_min,
        workDays: master.work_days,
        showPrice: master.show_price,
      },
      services: services.rows.map((service) => ({
        id: service.id,
        title: service.title,
        duration: service.duration_min,
        durationMinutes: service.duration_min,
        price: service.price,
        notes: service.notes || "",
        active: true,
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
        status: "Активна",
      })),
      blockedTimes: blockedTimes.rows.map((item) => ({
        id: item.id,
        date: item.date,
        start: item.start_time,
        end: item.end_time,
        reason: item.reason || "",
      })),
    });
  } catch (error) {
    console.error("Master GET error:", error);
    return NextResponse.json({ success: false, error: "Ошибка загрузки мастера." }, { status: 500 });
  }
}
