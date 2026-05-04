import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createUsersTable, pool } from "../../../lib/db";

const normalizeEmailSlug = (email: string) =>
  email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "master";

export async function GET() {
  try {
    const email = (await cookies()).get("user_email")?.value;

    if (!email) {
      return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });
    }

    await createUsersTable();

    const result = await pool.query<{ email: string; name: string }>(
      "SELECT email, name FROM users WHERE email = $1",
      [email],
    );

    const user = result.rows[0];
    if (!user) {
      const response = NextResponse.json({ success: false, error: "Пользователь не найден." }, { status: 401 });
      response.cookies.delete("user_email");
      return response;
    }

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        name: user.name,
        slug: normalizeEmailSlug(user.email),
      },
    });
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json({ success: false, error: "Ошибка сервера." }, { status: 500 });
  }
}
