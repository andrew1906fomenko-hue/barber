import { NextResponse } from "next/server";
import { getCurrentUserAndMaster, initDb, pool } from "../../../lib/db";

type DaySchedule = {
  enabled?: boolean;
  start?: string;
  end?: string;
  breakEnabled?: boolean;
  breakStart?: string;
  breakEnd?: string;
  breaks?: { id?: string; start?: string; end?: string }[];
};

const isTime = (value: unknown): value is string => typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
const normalizeTime = (value: unknown, fallback: string) => (isTime(value) ? value : fallback);
const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};
const intervalsOverlap = (startA: number, endA: number, startB: number, endB: number) =>
  startA < endB && startB < endA;
const assertBreaksDoNotOverlap = (breaks: Array<{ start: string; end: string }>) => {
  const sortedBreaks = [...breaks].sort((left, right) => timeToMinutes(left.start) - timeToMinutes(right.start));
  for (let index = 1; index < sortedBreaks.length; index += 1) {
    const previous = sortedBreaks[index - 1];
    const current = sortedBreaks[index];
    if (intervalsOverlap(timeToMinutes(previous.start), timeToMinutes(previous.end), timeToMinutes(current.start), timeToMinutes(current.end))) {
      throw new Error("Перерывы не должны пересекаться");
    }
  }
};
const sanitizeMinutes = (value: unknown, fallback: number, allowed: number[]) => {
  const next = Number(value);
  return allowed.includes(next) ? next : fallback;
};
const sanitizeWeeklySchedule = (schedule: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(schedule).map(([key, value]) => {
      if (key.startsWith("__")) return [key, value];
      const day = typeof value === "object" && value ? (value as DaySchedule) : {};
      const breaks: Array<{ id: string; start: string; end: string }> = Array.isArray(day.breaks)
        ? day.breaks
            .map((item, index) => ({
              id: typeof item.id === "string" ? item.id : `break-${index}`,
              start: normalizeTime(item.start, normalizeTime(day.breakStart, "13:00")),
              end: normalizeTime(item.end, normalizeTime(day.breakEnd, "14:00")),
            }))
            .filter((item) => timeToMinutes(item.start) < timeToMinutes(item.end))
        : [];
      assertBreaksDoNotOverlap(breaks);

      return [
        key,
        {
          ...day,
          breaks,
          breakEnabled: breaks.length > 0,
          breakStart: breaks[0]?.start || day.breakStart || "13:00",
          breakEnd: breaks[0]?.end || day.breakEnd || "14:00",
        },
      ];
    }),
  );

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentUserAndMaster();
    if (!session) {
      return NextResponse.json({ success: false, error: "Нет активной сессии." }, { status: 401 });
    }
    const body = (await request.json()) as {
      bookingEnabled?: boolean;
      autoTimeSnap?: boolean;
      bufferMin?: number;
      slotStepMin?: number;
      weeklySchedule?: Record<string, unknown>;
      workDays?: number[];
      workEnd?: string;
      workStart?: string;
      maxBookingDaysAhead?: number;
      timezone?: string;
    };

    const workStart = isTime(body.workStart) ? body.workStart : "10:00";
    const workEnd = isTime(body.workEnd) ? body.workEnd : "20:00";
    const slotStepMin = sanitizeMinutes(body.slotStepMin, 30, [15, 30, 45, 60]);
    const bufferMin = sanitizeMinutes(body.bufferMin, 0, [0, 5, 10, 15, 20, 30]);
    const maxBookingDaysAhead = Math.min(365, Math.max(1, Math.round(Number(body.maxBookingDaysAhead) || 14)));
    const timezone = typeof body.timezone === "string" && /^[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?$/.test(body.timezone)
      ? body.timezone
      : "Europe/Moscow";
    const workDays = Array.isArray(body.workDays)
      ? body.workDays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      : [1, 2, 3, 4, 5];
    const weeklySchedule = sanitizeWeeklySchedule(typeof body.weeklySchedule === "object" && body.weeklySchedule ? body.weeklySchedule : {});

    await initDb();
    await pool.query(
      `
        UPDATE masters
        SET
          booking_enabled = $1,
          auto_time_snap = $2,
          buffer_min = $3,
          slot_step_min = $4,
          weekly_schedule = $5::jsonb,
          work_days = $6::jsonb,
          work_end = $7,
          work_start = $8,
          max_booking_days_ahead = $9,
          timezone = $10,
          updated_at = NOW()
        WHERE id = $11
      `,
      [
        body.bookingEnabled !== false,
        body.autoTimeSnap !== false,
        bufferMin,
        slotStepMin,
        JSON.stringify(weeklySchedule),
        JSON.stringify(workDays),
        workEnd,
        workStart,
        maxBookingDaysAhead,
        timezone,
        session.master.id,
      ],
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Schedule PATCH error:", error);
    if (error instanceof Error && error.message === "Перерывы не должны пересекаться") {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Ошибка сохранения графика." }, { status: 500 });
  }
}
