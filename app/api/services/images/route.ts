import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getCurrentUserAndMaster, initDb, pool } from "../../../../lib/db";

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const maxFileSize = 1024 * 1024;
const uploadRoot = path.join(process.cwd(), "public", "uploads", "masters");

async function removePublicFile(url: string, masterId: string) {
  const allowedPrefix = `/uploads/masters/${masterId}/services/`;
  if (!url.startsWith(allowedPrefix)) return;
  const filePath = path.join(process.cwd(), "public", url);
  try {
    await unlink(filePath);
  } catch {
    // Missing files should not block replacing a service photo.
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });

    const form = await request.formData();
    const file = form.get("file");
    const previousUrl = String(form.get("previousUrl") || "");
    const serviceId = String(form.get("serviceId") || "");

    if (!(file instanceof File)) return NextResponse.json({ success: false, error: "Файл не передан." }, { status: 400 });
    if (!allowedTypes.has(file.type)) return NextResponse.json({ success: false, error: "Поддерживаются JPG, PNG и WebP." }, { status: 400 });
    if (file.size > maxFileSize) return NextResponse.json({ success: false, error: "Файл должен быть не больше 2 МБ." }, { status: 400 });

    const ext = allowedTypes.get(file.type);
    const dir = path.join(uploadRoot, session.master.id, "services");
    await mkdir(dir, { recursive: true });
    const fileName = `service-${Date.now()}.${ext}`;
    const filePath = path.join(dir, fileName);
    const publicUrl = `/uploads/masters/${session.master.id}/services/${fileName}`;

    await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
    if (serviceId) {
      await initDb();
      await pool.query("UPDATE services SET photo_url = $1 WHERE id = $2 AND master_id = $3", [publicUrl, serviceId, session.master.id]);
    }
    if (previousUrl) await removePublicFile(previousUrl, session.master.id);

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error("Service image POST error:", error);
    return NextResponse.json({ success: false, error: "Ошибка загрузки изображения." }, { status: 500 });
  }
}
