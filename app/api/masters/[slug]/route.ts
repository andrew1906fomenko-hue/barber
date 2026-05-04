import { NextResponse } from "next/server";
import { createUsersTable, pool } from "../../../../lib/db";

const normalizeEmailSlug = (email: string) =>
  email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "master";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    await createUsersTable();

    const result = await pool.query<{ email: string; name: string }>("SELECT email, name FROM users");
    const user = result.rows.find((item) => normalizeEmailSlug(item.email) === slug);

    if (!user) {
      return NextResponse.json({ success: false, error: "Мастер не найден." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      master: {
        email: user.email,
        name: user.name,
        slug: normalizeEmailSlug(user.email),
      },
    });
  } catch (error) {
    console.error("Master GET error:", error);
    return NextResponse.json({ success: false, error: "Ошибка загрузки мастера." }, { status: 500 });
  }
}
