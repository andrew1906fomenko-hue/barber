import { NextResponse } from "next/server";
import { createUniqueSlug, initDb, normalizeEmail, pool } from "../../../lib/db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      name?: string;
      password?: string;
    };

    const email = normalizeEmail(body.email || "");
    const name = (body.name || "").trim();
    const password = body.password || "";

    if (!email || !name || password.length < 6) {
      return NextResponse.json({ success: false, error: "Введите имя, email и пароль от 6 символов." }, { status: 400 });
    }

    await initDb();

    const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existingUser.rowCount) {
      return NextResponse.json({ success: false, error: "Пользователь с таким email уже существует." }, { status: 409 });
    }

    const slug = await createUniqueSlug(email, name);
    const result = await pool.query<{ user_id: string; master_id: string }>(
      `
        WITH new_user AS (
          INSERT INTO users (email, name, password)
          VALUES ($1, $2, $3)
          RETURNING id
        )
        INSERT INTO masters (user_id, name, slug)
        SELECT id, $2, $4 FROM new_user
        RETURNING user_id, id AS master_id
      `,
      [email, name, password, slug],
    );

    const response = NextResponse.json({
      success: true,
      user: { id: result.rows[0].user_id, email, name },
      master: { id: result.rows[0].master_id, name, slug },
      profile: { displayName: name, slug, showOnBookingPage: true },
    });
    response.cookies.set("user_email", email, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ success: false, error: "Ошибка сервера при регистрации." }, { status: 500 });
  }
}
