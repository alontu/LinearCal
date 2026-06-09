import { describe, it, expect } from 'vitest';
import { getJewishWorkWeek, getYearRangeDates, formatDateHe, WEEK_STARTS_ON } from './date-utils';
import { getDay, format } from 'date-fns';

describe('getJewishWorkWeek', () => {
    it('returns Sunday..Friday (6 days) for the containing week', () => {
        // 2024-01-10 is a Wednesday.
        const week = getJewishWorkWeek(new Date(2024, 0, 10));
        expect(week).toHaveLength(6);
        expect(getDay(week[0])).toBe(0); // Sunday
        expect(getDay(week[5])).toBe(5); // Friday
    });

    it('starts the week on Sunday (WEEK_STARTS_ON)', () => {
        expect(WEEK_STARTS_ON).toBe(0);
    });
});

describe('getYearRangeDates', () => {
    it('spans roughly 2 months back to 10 months forward', () => {
        const dates = getYearRangeDates(new Date(2024, 5, 15));
        const first = dates[0];
        const last = dates[dates.length - 1];
        expect(format(first, 'yyyy-MM')).toBe('2024-04'); // 2 months back
        expect(format(last, 'yyyy-MM')).toBe('2025-04'); // 10 months forward
    });
});

describe('formatDateHe', () => {
    it('formats with the Hebrew locale', () => {
        const out = formatDateHe(new Date(2024, 0, 10), 'dd/MM/yyyy');
        expect(out).toBe('10/01/2024');
    });
});
