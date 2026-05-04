import { NextResponse } from "next/server";
import { initDb, normalizeEmail, pool } from "../../../lib/db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const email = normalizeEmail(body.email || "");
    const password = body.password || "";

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Введите email и пароль." }, { status: 400 });
    }

    await initDb();

    const result = await pool.query<{ email: string }>("SELECT email FROM users WHERE email = $1 AND password = $2", [email, password]);
    if (!result.rowCount) {
      return NextResponse.json({ success: false, error: "Неверный email или пароль." }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set("user_email", email, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ success: false, error: "Ошибка сервера при входе." }, { status: 500 });
  }
}
