import { NextResponse } from "next/server";
import { getCurrentUserAndMaster, initDb, pool } from "../../../../lib/db";
import { mapBookingSettings, sanitizeBookingPageSettings } from "../../../../lib/booking-page";

export async function GET() {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });

    return NextResponse.json({
      success: true,
      settings: mapBookingSettings(session.master),
      profile: {
        name: session.master.name,
        slug: session.master.slug,
      },
    });
  } catch (error) {
    console.error("Booking page settings GET error:", error);
    return NextResponse.json({ success: false, error: "Ошибка загрузки настроек страницы." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });

    const body = (await request.json()) as Record<string, unknown>;
    const settings = sanitizeBookingPageSettings(body);

    await initDb();
    const updateSql = `
        UPDATE masters
        SET
          notes = $1,
          profession = $2,
          description = $3,
          city = $4,
          address = $5,
          is_online = $6,
          phone = $7,
          contact_link = $8,
          social_links = $9::jsonb,
          cover_position_x = $10,
          cover_position_y = $11,
          timezone = $12,
          primary_color = $13,
          button_color = $14,
          cta_text = $15,
          visible_sections = $16::jsonb,
          required_fields = $17::jsonb,
          show_price = $18,
          max_booking_days_ahead = $19,
          updated_at = NOW()
        WHERE id = $20
        RETURNING id
      `;
    const updateParams = [
        settings.notes,
        settings.profession,
        settings.description,
        settings.city,
        settings.address,
        settings.isOnline,
        settings.phone,
        settings.contactLink,
        JSON.stringify(settings.socialLinks),
        settings.coverPositionX,
        settings.coverPositionY,
        settings.timezone,
        settings.primaryColor,
        settings.buttonColor,
        settings.ctaText,
        JSON.stringify(settings.visibleSections),
        JSON.stringify(settings.requiredFields),
        settings.showPrice,
        settings.maxBookingDaysAhead,
        session.master.id,
      ];
    let result = await pool.query(updateSql, updateParams);

    if (!result.rowCount) {
      result = await pool.query(updateSql.replace("WHERE id = $20", "WHERE user_id = $20"), [
        ...updateParams.slice(0, -1),
        session.user.id,
      ]);
    }

    if (!result.rowCount && session.master.userId) {
      result = await pool.query(updateSql.replace("WHERE id = $20", "WHERE user_id = $20"), [
        ...updateParams.slice(0, -1),
        session.master.userId,
      ]);
    }

    if (!result.rowCount) {
      return NextResponse.json({ success: false, error: "Страница мастера не найдена." }, { status: 404 });
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Booking page settings PATCH error:", error);
    return NextResponse.json({ success: false, error: "Ошибка сохранения настроек страницы." }, { status: 500 });
  }
}
