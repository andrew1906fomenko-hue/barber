import { NextResponse } from "next/server";
import { getCurrentUserAndMaster } from "../../../lib/db";

export async function GET() {
  try {
    const session = await getCurrentUserAndMaster();

    if (!session) {
      const response = NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });
      response.cookies.delete("user_email");
      return response;
    }

    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        slug: session.master.slug,
      },
      master: session.master,
      profile: {
        displayName: session.master.name,
        slug: session.master.slug,
        showOnBookingPage: true,
      },
    });
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json({ success: false, error: "Ошибка сервера." }, { status: 500 });
  }
}
