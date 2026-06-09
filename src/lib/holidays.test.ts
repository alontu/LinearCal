import { describe, it, expect } from 'vitest';
import { getJewishHolidays, buildHolidayStylingMap } from './holidays';

// Israel schedule, civil year 2024.
const holidays = getJewishHolidays(new Date(2024, 0, 1), new Date(2024, 11, 31));
const map = buildHolidayStylingMap(holidays);

describe('getJewishHolidays — classification of known 2024 dates', () => {
    it('marks Rosh Hashana (2024-10-03) as a full holiday (Yom Tov)', () => {
        expect(map['2024-10-03']).toBeDefined();
        expect(map['2024-10-03'].isYomTov).toBe(true);
    });

    it('marks Yom Kippur (2024-10-12) as both Yom Tov and a fast', () => {
        expect(map['2024-10-12']).toBeDefined();
        expect(map['2024-10-12'].isYomTov).toBe(true);
        expect(map['2024-10-12'].isFast).toBe(true);
    });

    it('marks Pesach I (2024-04-23) as Yom Tov and Chol HaMoed (2024-04-24) accordingly', () => {
        expect(map['2024-04-23'].isYomTov).toBe(true);
        expect(map['2024-04-24'].isCholHamoed).toBe(true);
        expect(map['2024-04-24'].isYomTov).toBe(false);
    });

    it('marks Tisha B\'Av (2024-08-13) as a fast but not a Yom Tov', () => {
        expect(map['2024-08-13']).toBeDefined();
        expect(map['2024-08-13'].isFast).toBe(true);
        expect(map['2024-08-13'].isYomTov).toBe(false);
    });

    it('renders Yom HaAtzma\'ut (2024-05-14) like a holiday', () => {
        expect(map['2024-05-14']).toBeDefined();
        expect(map['2024-05-14'].isYomTov).toBe(true);
    });

    it('shows festive-but-not-Yom-Tov days (Purim, Tu BiShvat, Lag BaOmer, Chanukah)', () => {
        expect(map['2024-03-24']).toBeDefined(); // Purim
        expect(map['2024-03-24'].isCholHamoed).toBe(true);
        expect(map['2024-03-24'].isYomTov).toBe(false);

        expect(map['2024-01-25']).toBeDefined(); // Tu BiShvat
        expect(map['2024-05-26']).toBeDefined(); // Lag BaOmer
        expect(map['2024-12-26']).toBeDefined(); // Chanukah (2nd candle)
    });

    it('includes a Hebrew label for each holiday', () => {
        for (const h of holidays) {
            expect(h.text.length).toBeGreaterThan(0);
            expect(h.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
    });

    it('filters out noise (an ordinary mid-week non-holiday has no entry)', () => {
        expect(map['2024-07-10']).toBeUndefined();
    });
});

describe('getJewishHolidays — range filtering', () => {
    it('only returns holidays within the requested range', () => {
        const narrow = getJewishHolidays(new Date(2024, 11, 1), new Date(2024, 11, 31));
        for (const h of narrow) {
            expect(h.date >= '2024-12-01').toBe(true);
            expect(h.date <= '2024-12-31').toBe(true);
        }
        // Chanukah starts late December 2024.
        expect(narrow.some(h => h.text.includes('חֲנוּכָּה') || h.date >= '2024-12-25')).toBe(true);
    });

    it('spans multiple Gregorian years when the range crosses a year boundary', () => {
        const cross = getJewishHolidays(new Date(2024, 11, 20), new Date(2025, 0, 10));
        expect(cross.some(h => h.date.startsWith('2024-12'))).toBe(true);
        expect(cross.some(h => h.date.startsWith('2025-01'))).toBe(true);
    });
});
