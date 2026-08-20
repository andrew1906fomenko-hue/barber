import assert from "node:assert/strict";
import test from "node:test";

function addCalendarMonthsUtc(input, months) {
  const source = new Date(input.getTime());
  const day = source.getUTCDate();
  const target = new Date(Date.UTC(
    source.getUTCFullYear(),
    source.getUTCMonth() + months,
    1,
    source.getUTCHours(),
    source.getUTCMinutes(),
    source.getUTCSeconds(),
    source.getUTCMilliseconds(),
  ));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target;
}

test("adds calendar months across shorter months", () => {
  assert.equal(addCalendarMonthsUtc(new Date("2026-01-31T10:00:00.000Z"), 1).toISOString(), "2026-02-28T10:00:00.000Z");
});

test("handles leap years", () => {
  assert.equal(addCalendarMonthsUtc(new Date("2024-01-31T10:00:00.000Z"), 1).toISOString(), "2024-02-29T10:00:00.000Z");
});

test("keeps UTC time stable when buying several months", () => {
  assert.equal(addCalendarMonthsUtc(new Date("2026-10-31T23:30:00.000Z"), 3).toISOString(), "2027-01-31T23:30:00.000Z");
});
