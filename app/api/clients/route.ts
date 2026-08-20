import { NextResponse } from "next/server";
import { getCurrentUserAndMaster, normalizeClientPhone, pool, upsertClient } from "../../../lib/db";

type ClientRow = {
  id: string;
  name: string;
  phone: string;
  notes: string;
  telegram_chat_id?: string;
  telegram_username?: string;
  telegram_connected_at?: string | null;
  created_at: string;
  updated_at: string;
  visits: string;
  last_visit: string | null;
  total_spent: string | null;
};

const mapClient = (client: ClientRow) => ({
  id: client.id,
  name: client.name,
  phone: client.phone,
  notes: client.notes || "",
  telegramConnected: Boolean(client.telegram_chat_id),
  telegramUsername: client.telegram_username || "",
  telegramConnectedAt: client.telegram_connected_at || "",
  createdAt: client.created_at,
  updatedAt: client.updated_at,
  visits: Number(client.visits) || 0,
  lastVisit: client.last_visit || "",
  totalSpent: Number(client.total_spent) || 0,
});

async function listClients(masterId: string) {
  const result = await pool.query<ClientRow>(
    `
      SELECT
        clients.id,
        clients.name,
        clients.phone,
        clients.notes,
        clients.telegram_chat_id,
        clients.telegram_username,
        clients.telegram_connected_at::text,
        clients.created_at::text,
        clients.updated_at::text,
        COUNT(appointments.id) AS visits,
        MAX(appointments.date)::text AS last_visit,
        COALESCE(SUM(CASE WHEN appointments.status IN ('no_show', 'no_show_deleted') THEN 0 ELSE services.price END), 0)::text AS total_spent
      FROM clients
      LEFT JOIN appointments
        ON appointments.master_id = clients.master_id
        AND regexp_replace(appointments.client_phone, '\\D', '', 'g') = clients.normalized_phone
      LEFT JOIN services ON services.id = appointments.service_id
      WHERE clients.master_id = $1
      GROUP BY clients.id
      ORDER BY clients.updated_at DESC, clients.name ASC
    `,
    [masterId],
  );

  return result.rows.map(mapClient);
}

export async function GET() {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });
    return NextResponse.json({ success: true, clients: await listClients(session.master.id) });
  } catch (error) {
    console.error("Clients GET error:", error);
    return NextResponse.json({ success: false, error: "Ошибка загрузки клиентов." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });

    const body = (await request.json()) as { name?: string; phone?: string; notes?: string };
    const name = (body.name || "").trim();
    const phone = (body.phone || "").trim();
    const normalizedPhone = normalizeClientPhone(phone);

    if (!name || !normalizedPhone) {
      return NextResponse.json({ success: false, error: "Добавьте имя и телефон клиента." }, { status: 400 });
    }

    await upsertClient(session.master.id, name, phone);
    await pool.query(
      `
        UPDATE clients
        SET notes = $1, updated_at = NOW()
        WHERE master_id = $2 AND normalized_phone = $3
      `,
      [(body.notes || "").trim(), session.master.id, normalizedPhone],
    );

    return NextResponse.json({ success: true, clients: await listClients(session.master.id) });
  } catch (error) {
    console.error("Clients POST error:", error);
    if (error instanceof Error && error.name === "SUBSCRIPTION_REQUIRED") return NextResponse.json({ success: false, error: error.message }, { status: 402 });
    return NextResponse.json({ success: false, error: "Ошибка сохранения клиента." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });
    const body = (await request.json()) as { id?: string; name?: string; phone?: string; notes?: string };
    const name = (body.name || "").trim();
    const phone = (body.phone || "").trim();
    const normalizedPhone = normalizeClientPhone(phone);

    if (!body.id || !name || !normalizedPhone) {
      return NextResponse.json({ success: false, error: "Добавьте имя и телефон клиента." }, { status: 400 });
    }

    const existing = await pool.query<{ id: string }>(
      "SELECT id FROM clients WHERE master_id = $1 AND normalized_phone = $2 AND id <> $3",
      [session.master.id, normalizedPhone, body.id],
    );

    if (existing.rows[0]) {
      await pool.query(
        `
          UPDATE clients
          SET name = $1, phone = $2, notes = $3, updated_at = NOW()
          WHERE id = $4 AND master_id = $5
        `,
        [name, phone, (body.notes || "").trim(), existing.rows[0].id, session.master.id],
      );
      await pool.query("DELETE FROM clients WHERE id = $1 AND master_id = $2", [body.id, session.master.id]);
      return NextResponse.json({ success: true, clients: await listClients(session.master.id) });
    }

    const result = await pool.query(
      `
        UPDATE clients
        SET name = $1, phone = $2, normalized_phone = $3, notes = $4, updated_at = NOW()
        WHERE id = $5 AND master_id = $6
      `,
      [name, phone, normalizedPhone, (body.notes || "").trim(), body.id, session.master.id],
    );

    if (!result.rowCount) {
      return NextResponse.json({ success: false, error: "Клиент не найден." }, { status: 404 });
    }

    return NextResponse.json({ success: true, clients: await listClients(session.master.id) });
  } catch (error) {
    console.error("Clients PUT error:", error);
    if (error instanceof Error && error.name === "SUBSCRIPTION_REQUIRED") return NextResponse.json({ success: false, error: error.message }, { status: 402 });
    return NextResponse.json({ success: false, error: "Ошибка сохранения клиента." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "ID клиента обязателен." }, { status: 400 });

    await pool.query("DELETE FROM clients WHERE id = $1 AND master_id = $2", [id, session.master.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Clients DELETE error:", error);
    if (error instanceof Error && error.name === "SUBSCRIPTION_REQUIRED") return NextResponse.json({ success: false, error: error.message }, { status: 402 });
    return NextResponse.json({ success: false, error: "Ошибка удаления клиента." }, { status: 500 });
  }
}
