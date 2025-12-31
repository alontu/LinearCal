import { startOfWeek, addDays, eachDayOfInterval, format, startOfYear, endOfYear, subMonths, addMonths } from 'date-fns';
import { he } from 'date-fns/locale';

// 0 = Sunday, 1 = Monday, ..., 6 = Saturday
export const WEEK_STARTS_ON = 0;

/**
 * Returns an array of dates representing the Jewish work week (Sunday to Friday)
 * for the week containing the given date.
 */
export function getJewishWorkWeek(date: Date = new Date()): Date[] {
    const start = startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
    const end = addDays(start, 5); // Sunday + 5 days = Friday

    return eachDayOfInterval({ start, end });
}

/**
 * Returns an array of dates for a full year range (e.g. 1 month back to 11 months forward)
 * or a specific year.
 */
export function getYearRangeDates(date: Date = new Date()): Date[] {
    // Let's do 2 months back and 10 months forward to give context of recent past + future
    const start = subMonths(date, 2);
    const end = addMonths(date, 10);

    return eachDayOfInterval({ start, end });
}

/**
 * Formats a date using the Hebrew locale.
 */
export function formatDateHe(date: Date, formatStr: string): string {
    return format(date, formatStr, { locale: he });
}
