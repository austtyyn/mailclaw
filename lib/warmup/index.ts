export type WarmupStage = "new" | "week1" | "week2" | "steady";

const SCHEDULE_RULES: Record<
  WarmupStage,
  { days: number; sendsPerDay: number }
> = {
  new: { days: 3, sendsPerDay: 5 },
  week1: { days: 4, sendsPerDay: 10 },
  week2: { days: 7, sendsPerDay: 17 },
  steady: { days: 999, sendsPerDay: 20 },
};

export function getWarmupTargetForDay(dayIndex: number): number {
  if (dayIndex < 3) return 5;
  if (dayIndex < 7) return 10;
  if (dayIndex < 14) return 17;
  return 20;
}

export function getStageForDay(dayIndex: number): WarmupStage {
  if (dayIndex < 3) return "new";
  if (dayIndex < 7) return "week1";
  if (dayIndex < 14) return "week2";
  return "steady";
}

export function generateDailyTargets(
  startDate: Date,
  daysToGenerate: number = 30
): Array<{ date: string; target: number; stage: WarmupStage }> {
  const result: Array<{ date: string; target: number; stage: WarmupStage }> = [];
  for (let i = 0; i < daysToGenerate; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const target = getWarmupTargetForDay(i);
    const stage = getStageForDay(i);
    result.push({
      date: d.toISOString().split("T")[0],
      target,
      stage,
    });
  }
  return result;
}
