import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getCurrentUserAndMaster, initDb, pool } from "../../../../lib/db";

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const maxFileSize = 5 * 1024 * 1024;
const uploadRoot = path.join(process.cwd(), "public", "uploads", "masters");

const getColumn = (type: string) => {
  if (type === "cover") return "cover_image_url";
  if (type === "avatar") return "avatar_url";
  return null;
};

async function removePublicFile(url: string) {
  if (!url.startsWith("/uploads/masters/")) return;
  const filePath = path.join(process.cwd(), "public", url);
  try {
    await unlink(filePath);
  } catch {
    // The database value is authoritative; missing files should not block replacement/removal.
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });

    const form = await request.formData();
    const type = String(form.get("type") || "");
    const file = form.get("file");
    const column = getColumn(type);

    if (!column) return NextResponse.json({ success: false, error: "Неверный тип изображения." }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ success: false, error: "Файл не передан." }, { status: 400 });
    if (!allowedTypes.has(file.type)) return NextResponse.json({ success: false, error: "Поддерживаются JPG, PNG и WebP." }, { status: 400 });
    if (file.size > maxFileSize) return NextResponse.json({ success: false, error: "Файл должен быть не больше 5 МБ." }, { status: 400 });

    const ext = allowedTypes.get(file.type);
    const dir = path.join(uploadRoot, session.master.id);
    await mkdir(dir, { recursive: true });
    const fileName = `${type}-${Date.now()}.${ext}`;
    const filePath = path.join(dir, fileName);
    const publicUrl = `/uploads/masters/${session.master.id}/${fileName}`;

    const previousUrl = type === "cover" ? session.master.coverImageUrl : session.master.avatarUrl;
    await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
    if (previousUrl) await removePublicFile(previousUrl);

    await initDb();
    await pool.query(`UPDATE masters SET ${column} = $1, updated_at = NOW() WHERE id = $2 RETURNING id`, [publicUrl, session.master.id]);

    return NextResponse.json({ success: true, type, url: publicUrl });
  } catch (error) {
    console.error("Booking page image POST error:", error);
    return NextResponse.json({ success: false, error: "Ошибка загрузки изображения." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "";
    const column = getColumn(type);
    if (!column) return NextResponse.json({ success: false, error: "Неверный тип изображения." }, { status: 400 });

    const previousUrl = type === "cover" ? session.master.coverImageUrl : session.master.avatarUrl;
    if (previousUrl) await removePublicFile(previousUrl);

    await initDb();
    await pool.query(`UPDATE masters SET ${column} = $1, updated_at = NOW() WHERE id = $2 RETURNING id`, ["", session.master.id]);

    return NextResponse.json({ success: true, type, url: "" });
  } catch (error) {
    console.error("Booking page image DELETE error:", error);
    return NextResponse.json({ success: false, error: "Ошибка удаления изображения." }, { status: 500 });
  }
}

