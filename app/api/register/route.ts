import { NextResponse } from "next/server";
import { createUsersTable, pool } from "../../../lib/db";

const normalizeEmail = (value: string) => value.trim().toLowerCase();

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
      return NextResponse.json(
        { success: false, error: "Введите имя, email и пароль от 6 символов." },
        { status: 400 },
      );
    }

    await createUsersTable();

    const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existingUser.rowCount) {
      return NextResponse.json(
        { success: false, error: "Пользователь с таким email уже существует." },
        { status: 409 },
      );
    }

    await pool.query("INSERT INTO users (email, name, password) VALUES ($1, $2, $3)", [email, name, password]);

    const response = NextResponse.json({ success: true });
    response.cookies.set("user_email", email, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, error: "Ошибка сервера при регистрации." },
      { status: 500 },
    );
  }
}
