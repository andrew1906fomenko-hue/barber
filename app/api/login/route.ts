import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createUniqueSlug, initDb, normalizeEmail, pool } from "../../../lib/db";

const canBootstrapLocalLogin = () => process.env.ALLOW_LOGIN_BOOTSTRAP === "1";

const loginResponse = (email: string) => {
  const response = NextResponse.json({ success: true });
  response.cookies.set("user_email", email, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
};

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

    const result = await pool.query<{ email: string; password: string }>("SELECT email, password FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    const passwordMatches = Boolean(
      user &&
        (user.password === password ||
          ((user.password.startsWith("$2a$") || user.password.startsWith("$2b$") || user.password.startsWith("$2y$")) &&
            (await bcrypt.compare(password, user.password)))),
    );

    if (passwordMatches) {
      return loginResponse(email);
    }

    if (!user && canBootstrapLocalLogin()) {
      const name = email.split("@")[0] || "Мастер";
      const slug = await createUniqueSlug(email, name);
      const passwordHash = await bcrypt.hash(password, 10);

      await pool.query(
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
        [email, name, passwordHash, slug],
      );

      return loginResponse(email);
    }

    return NextResponse.json({ success: false, error: "Неверный email или пароль." }, { status: 401 });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ success: false, error: "Ошибка сервера при входе." }, { status: 500 });
  }
}
