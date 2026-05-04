import { NextResponse } from "next/server";
import { createUsersTable, pool } from "../../../lib/db";

const normalizeEmailSlug = (email: string) =>
  email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "master";

type UserRow = {
  id: number;
  email: string;
  name: string;
  password: string;
  created_at: string;
};

export async function GET() {
  try {
    await createUsersTable();
    const result = await pool.query<UserRow>(
      "SELECT id, email, name, password, created_at FROM users ORDER BY created_at DESC",
    );

    return NextResponse.json({
      success: true,
      users: result.rows.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        password: user.password,
        slug: normalizeEmailSlug(user.email),
        createdAt: user.created_at,
      })),
    });
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
      password?: string;
    };

    const email = (body.email || "").trim().toLowerCase();
    const name = body.name?.trim();
    const password = body.password;

    if (!email) {
      return NextResponse.json({ success: false, error: "Email обязателен." }, { status: 400 });
    }

    await createUsersTable();

    if (name !== undefined) {
      if (!name) {
        return NextResponse.json({ success: false, error: "Имя не может быть пустым." }, { status: 400 });
      }

      await pool.query("UPDATE users SET name = $1 WHERE email = $2", [name, email]);
    }

    if (password !== undefined) {
      if (password.length < 6) {
        return NextResponse.json({ success: false, error: "Пароль должен быть от 6 символов." }, { status: 400 });
      }

      await pool.query("UPDATE users SET password = $1 WHERE email = $2", [password, email]);
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
    const email = (searchParams.get("email") || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ success: false, error: "Email обязателен." }, { status: 400 });
    }

    await createUsersTable();
    await pool.query("DELETE FROM users WHERE email = $1", [email]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Users DELETE error:", error);
    return NextResponse.json({ success: false, error: "Ошибка удаления пользователя." }, { status: 500 });
  }
}
