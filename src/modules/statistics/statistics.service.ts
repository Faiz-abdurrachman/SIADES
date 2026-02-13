import * as statisticsRepo from './statistics.repository';
import { statisticsSummaryQuerySchema } from '../../validators/statistics.validator';

interface EventTotals {
  birth: number;
  death: number;
  move_in: number;
  move_out: number;
}

interface MonthlyBucket extends EventTotals {
  month: number;
}

export async function getStatisticsSummary(query: Record<string, unknown>) {
  const parsed = statisticsSummaryQuerySchema.parse(query);
  const year = parsed.year ?? new Date().getFullYear();

  const startDate = new Date(year, 0, 1, 0, 0, 0, 0);
  const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

  const events = await statisticsRepo.findEventsByDateRange(startDate, endDate);

  const totals: EventTotals = {
    birth: 0,
    death: 0,
    move_in: 0,
    move_out: 0,
  };

  const monthly: MonthlyBucket[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    birth: 0,
    death: 0,
    move_in: 0,
    move_out: 0,
  }));

  for (const event of events) {
    const type = event.eventType;
    if (type in totals) {
      totals[type as keyof EventTotals]++;
      const month = event.eventDate.getMonth();
      monthly[month][type as keyof EventTotals]++;
    }
  }

  return {
    year,
    totals,
    monthly,
  };
}
