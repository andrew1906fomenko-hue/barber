import { NextResponse } from "next/server";
import { getCurrentUserAndMaster, initDb, pool } from "../../../lib/db";

type BlockedTimeRow = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
};

const mapBlockedTime = (item: BlockedTimeRow) => ({
  id: item.id,
  date: item.date,
  start: item.start_time,
  end: item.end_time,
  reason: item.reason || "",
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

    const result = await pool.query<BlockedTimeRow>(
      "SELECT id, date::text, start_time, end_time, reason FROM blocked_times WHERE master_id = $1 ORDER BY date DESC, start_time",
      [masterId],
    );

    return NextResponse.json({ success: true, blockedTimes: result.rows.map(mapBlockedTime) });
  } catch (error) {
    console.error("Blocked times GET error:", error);
    return NextResponse.json({ success: false, error: "Ошибка загрузки блокировок." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });

    const body = (await request.json()) as {
      date?: string;
      start?: string;
      end?: string;
      reason?: string;
    };

    if (!body.date || !body.start || !body.end) {
      return NextResponse.json({ success: false, error: "Дата, начало и конец обязательны." }, { status: 400 });
    }

    const result = await pool.query<BlockedTimeRow>(
      `
        INSERT INTO blocked_times (master_id, date, start_time, end_time, reason)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, date::text, start_time, end_time, reason
      `,
      [session.master.id, body.date, body.start, body.end, (body.reason || "").trim()],
    );

    return NextResponse.json({ success: true, blockedTime: mapBlockedTime(result.rows[0]) });
  } catch (error) {
    console.error("Blocked times POST error:", error);
    return NextResponse.json({ success: false, error: "Ошибка создания блокировки." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "ID блокировки обязателен." }, { status: 400 });

    await pool.query("DELETE FROM blocked_times WHERE id = $1 AND master_id = $2", [id, session.master.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Blocked times DELETE error:", error);
    return NextResponse.json({ success: false, error: "Ошибка удаления блокировки." }, { status: 500 });
  }
}
