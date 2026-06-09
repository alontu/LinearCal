import { format, getYear } from 'date-fns';
import { HebrewCalendar, Event as HebcalEvent } from '@hebcal/core';

/**
 * Jewish holiday overlay used by the linear calendar.
 *
 * We generate the Israeli (`il: true`) holiday schedule for every Gregorian
 * year that the visible range touches, then keep only the days that matter for
 * a *work/visual* calendar and classify each for styling:
 *   - `isYomTov`     -> full holiday (rendered like Shabbat / no-work day)
 *   - `isCholHamoed` -> intermediate / festive (rendered like Friday)
 *   - `isFast`       -> fast day (annotated with an icon)
 */

// @hebcal/core flag bits (see https://github.com/hebcal/hebcal-es6)
const CHAG = 1;
const MINOR_FAST = 256;
const SPECIAL_SHABBAT = 512; // (kept for reference)
const MODERN_HOLIDAY = 8192;
const MAJOR_FAST = 16384;
const MINOR_HOLIDAY = 524288; // (kept for reference)
const EREV = 1048576;
const CHOL_HAMOED = 2097152;

void SPECIAL_SHABBAT;
void MINOR_HOLIDAY;

export interface HolidayInfo {
    /** Gregorian date as yyyy-MM-dd. */
    date: string;
    /** Localized (Hebrew) label. */
    text: string;
    isYomTov: boolean;
    isCholHamoed: boolean;
    isFast: boolean;
}

function isMajorErev(desc: string): boolean {
    return (
        desc.startsWith('Erev Rosh Hashana') ||
        desc.startsWith('Erev Yom Kippur') ||
        desc.startsWith('Erev Sukkot') ||
        desc.startsWith('Erev Pesach') ||
        desc.startsWith('Erev Shavuot')
    );
}

/** Raw hebcal events for every year spanned by [startDate, endDate]. */
function rawEventsForRange(startDate: Date, endDate: Date): HebcalEvent[] {
    const startYear = getYear(startDate);
    const endYear = getYear(endDate);
    const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

    let events: HebcalEvent[] = [];
    years.forEach(y => {
        events = events.concat(
            HebrewCalendar.calendar({
                isHebrewYear: false,
                il: true, // Israel schedule
                locale: 'he',
                year: y,
            }),
        );
    });
    return events;
}

/**
 * Whether a hebcal event should be surfaced on the calendar overlay.
 * Mirrors the product decision to show major chagim, chol hamoed, fasts,
 * the major erevs, and a curated set of modern / minor festive days, while
 * hiding noise (e.g. "Family Day", Rosh Chodesh).
 */
export function shouldShowHoliday(ev: HebcalEvent): boolean {
    const mask = ev.getFlags();
    const desc = ev.getDesc();

    const isChag = (mask & CHAG) !== 0;
    const isCholHamoed = (mask & CHOL_HAMOED) !== 0;
    const isFast = (mask & MAJOR_FAST) !== 0 || (mask & MINOR_FAST) !== 0;
    const isErev = (mask & EREV) !== 0;
    const isModern = (mask & MODERN_HOLIDAY) !== 0;

    const majorErev = isErev && isMajorErev(desc);
    const isShavuot = desc.startsWith('Shavuot') && !desc.includes('Isru Chag');
    const isPurim = desc.includes('Purim');
    const isChanukah = desc.includes('Chanukah');
    const isTuBiShvat = desc.includes('Tu BiShvat');
    const isLagBaOmer = desc.includes('Lag BaOmer');

    let allowedModern = false;
    if (isModern) {
        if (desc === "Yom HaAtzma'ut") allowedModern = true;
        if (desc === 'Yom HaZikaron') allowedModern = true;
        if (desc === 'Yom HaShoah') allowedModern = true;
    }

    return (
        isChag ||
        isCholHamoed ||
        isFast ||
        allowedModern ||
        majorErev ||
        isShavuot ||
        isPurim ||
        isChanukah ||
        isTuBiShvat ||
        isLagBaOmer
    );
}

/** Classify a (already-included) hebcal event into styling buckets. */
export function classifyHoliday(ev: HebcalEvent): HolidayInfo {
    const hd = ev.getDate();
    const d = hd.greg();
    const mask = ev.getFlags();
    const desc = ev.getDesc();

    const isYomTov = (mask & CHAG) !== 0;
    const isCholHamoed = (mask & CHOL_HAMOED) !== 0;
    const isFast = (mask & MAJOR_FAST) !== 0 || (mask & MINOR_FAST) !== 0;
    const isErev = (mask & EREV) !== 0;

    const isYomHaatzmaut = desc === "Yom HaAtzma'ut";
    const isShavuot = desc.startsWith('Shavuot') && !desc.includes('Isru Chag');
    const isPurim = desc.includes('Purim');
    const majorErev = isErev && isMajorErev(desc);

    return {
        date: format(d, 'yyyy-MM-dd'),
        text: ev.render('he'),
        isYomTov: isYomTov || isYomHaatzmaut || isShavuot,
        // Major erev + Purim render like a Friday (festive, not a full holiday).
        isCholHamoed: isCholHamoed || majorErev || isPurim,
        isFast,
    };
}

/**
 * Build the list of holiday styling entries for the given (inclusive) range.
 */
export function getJewishHolidays(startDate: Date, endDate: Date): HolidayInfo[] {
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    return rawEventsForRange(startDate, endDate)
        .filter(ev => {
            const dStr = format(ev.getDate().greg(), 'yyyy-MM-dd');
            if (dStr < startStr || dStr > endStr) return false;
            return shouldShowHoliday(ev);
        })
        .map(classifyHoliday);
}

/** Convenience: build a date(yyyy-MM-dd) -> HolidayInfo map. */
export function buildHolidayStylingMap(holidays: HolidayInfo[]): Record<string, HolidayInfo> {
    const map: Record<string, HolidayInfo> = {};
    holidays.forEach(h => {
        map[h.date] = h;
    });
    return map;
}
