import { NextResponse } from "next/server";
import { initDb, normalizeEmail, normalizeSlug, pool } from "../../../lib/db";

type UserListRow = {
  id: string;
  email: string;
  name: string;
  password: string;
  created_at: string;
  master_id: string;
  master_name: string;
  slug: string;
  services_count: string;
  appointments_count: string;
  revenue: string;
};

export async function GET() {
  try {
    await initDb();
    const result = await pool.query<UserListRow>(`
      SELECT
        users.id,
        users.email,
        users.name,
        users.password,
        users.created_at,
        masters.id AS master_id,
        masters.name AS master_name,
        masters.slug,
        COUNT(DISTINCT services.id) AS services_count,
        COUNT(DISTINCT appointments.id) AS appointments_count,
        COALESCE(SUM(DISTINCT services.price) FILTER (WHERE false), 0) AS revenue
      FROM users
      JOIN masters ON masters.user_id = users.id
      LEFT JOIN services ON services.master_id = masters.id
      LEFT JOIN appointments ON appointments.master_id = masters.id
      GROUP BY users.id, masters.id
      ORDER BY users.created_at DESC
    `);

    const users = await Promise.all(
      result.rows.map(async (user) => {
        const revenue = await pool.query<{ total: string }>(
          `
            SELECT COALESCE(SUM(services.price), 0) AS total
            FROM appointments
            LEFT JOIN services ON services.id = appointments.service_id
            WHERE appointments.master_id = $1
          `,
          [user.master_id],
        );

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          password: user.password,
          slug: user.slug,
          masterId: user.master_id,
          masterName: user.master_name,
          createdAt: user.created_at,
          servicesCount: Number(user.services_count),
          appointmentsCount: Number(user.appointments_count),
          revenue: Number(revenue.rows[0]?.total || 0),
        };
      }),
    );

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("Users GET error:", error);
    return NextResponse.json({ success: false, error: "Ошибка загрузки пользователей." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      name?: string;
      slug?: string;
      password?: string;
    };

    const email = normalizeEmail(body.email || "");
    if (!email) {
      return NextResponse.json({ success: false, error: "Email обязателен." }, { status: 400 });
    }

    await initDb();

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json({ success: false, error: "Имя не может быть пустым." }, { status: 400 });
      }

      await pool.query(
        `
          UPDATE users SET name = $1 WHERE email = $2;
          UPDATE masters SET name = $1, updated_at = NOW()
          WHERE user_id = (SELECT id FROM users WHERE email = $2);
        `,
        [name, email],
      );
    }

    if (body.slug !== undefined) {
      const slug = normalizeSlug(body.slug);
      if (!slug) {
        return NextResponse.json({ success: false, error: "Ссылка не может быть пустой." }, { status: 400 });
      }

      const updated = await pool.query(
        `
          UPDATE masters
          SET slug = $1, updated_at = NOW()
          WHERE user_id = (SELECT id FROM users WHERE email = $2)
          RETURNING id
        `,
        [slug, email],
      );
      if (!updated.rowCount) {
        return NextResponse.json({ success: false, error: "Мастер не найден." }, { status: 404 });
      }
    }

    if (body.password !== undefined) {
      if (body.password.length < 6) {
        return NextResponse.json({ success: false, error: "Пароль должен быть от 6 символов." }, { status: 400 });
      }

      await pool.query("UPDATE users SET password = $1 WHERE email = $2", [body.password, email]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Users PATCH error:", error);
    return NextResponse.json({ success: false, error: "Ошибка сохранения пользователя." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = normalizeEmail(searchParams.get("email") || "");

    if (!email) {
      return NextResponse.json({ success: false, error: "Email обязателен." }, { status: 400 });
    }

    await initDb();
    await pool.query("DELETE FROM users WHERE email = $1", [email]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Users DELETE error:", error);
    return NextResponse.json({ success: false, error: "Ошибка удаления пользователя." }, { status: 500 });
  }
}
