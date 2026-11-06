import { expect, test } from "@playwright/test";
import {
  getDashboardGreeting,
  getMillisecondsUntilGreetingChanges,
} from "../src/lib/dashboardGreeting";

const greetingCases: [number, number, string][] = [
  [0, 0, "Good night"],
  [4, 59, "Good night"],
  [5, 0, "Good morning"],
  [11, 59, "Good morning"],
  [12, 0, "Good afternoon"],
  [16, 59, "Good afternoon"],
  [17, 0, "Good evening"],
  [20, 59, "Good evening"],
  [21, 0, "Good night"],
];

for (const [hour, minute, expectedGreeting] of greetingCases) {
  test(`shows ${expectedGreeting} at ${hour}:${minute.toString().padStart(2, "0")} local time`, () => {
    const localDate = new Date(2026, 0, 15, hour, minute);

    expect(getDashboardGreeting(localDate)).toBe(expectedGreeting);
  });
}

test("schedules the next greeting change at the local boundary", () => {
  const localDate = new Date(2026, 0, 15, 11, 59);

  expect(getMillisecondsUntilGreetingChanges(localDate)).toBe(60_000);
});
