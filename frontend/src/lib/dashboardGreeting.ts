const GREETING_CHANGE_HOURS = [5, 12, 17, 21];

export function getDashboardGreeting(date: Date = new Date()): string {
  const hour = date.getHours();

  if (hour < 5 || hour >= 21) {
    return "Good night";
  }
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 17) {
    return "Good afternoon";
  }
  return "Good evening";
}

export function getMillisecondsUntilGreetingChanges(date: Date): number {
  const nextChangeHour = GREETING_CHANGE_HOURS.find(
    (hour) => hour > date.getHours(),
  );
  const nextChange = new Date(date);

  if (nextChangeHour === undefined) {
    nextChange.setDate(nextChange.getDate() + 1);
    nextChange.setHours(GREETING_CHANGE_HOURS[0], 0, 0, 0);
  } else {
    nextChange.setHours(nextChangeHour, 0, 0, 0);
  }

  return nextChange.getTime() - date.getTime();
}
