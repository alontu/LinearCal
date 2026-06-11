import { parse, endOfMonth, isValid } from 'date-fns';

/**
 * Resolution of the calendar's visible date range.
 *
 * The view is driven by URL search params:
 *  - `start` + `end` (yyyy-MM): an explicit custom range (the date-range picker).
 *  - `year`: a full calendar year.
 *  - neither: defaults to the current calendar year.
 *
 * The `<` / `>` arrows and the "today" button operate in whole calendar years
 * (always Jan..Dec), so navigation never drifts into an off-by-a-few-months
 * window. Custom multi-month ranges remain available via the picker.
 */

export interface DateRange {
    startDate: Date;
    endDate: Date;
}

/** Full calendar year: Jan 1 .. Dec 31 of `year`. */
export function yearRange(year: number): DateRange {
    return {
        startDate: new Date(year, 0, 1),
        endDate: new Date(year, 11, 31),
    };
}

export interface RangeParams {
    year?: string | null;
    start?: string | null;
    end?: string | null;
}

/**
 * Resolve the visible range from URL params. Priority: explicit start+end,
 * then `year`, then the current calendar year. Invalid params fall back to the
 * current year.
 */
export function resolveRange(params: RangeParams, today: Date): DateRange {
    const currentYear = today.getFullYear();

    if (params.start && params.end) {
        const s = parse(params.start, 'yyyy-MM', today);
        const e = parse(params.end, 'yyyy-MM', today);
        if (isValid(s) && isValid(e)) {
            return {
                startDate: new Date(s.getFullYear(), s.getMonth(), 1),
                endDate: endOfMonth(e),
            };
        }
        return yearRange(currentYear);
    }

    if (params.year) {
        const y = parseInt(params.year, 10);
        if (!Number.isNaN(y)) return yearRange(y);
        return yearRange(currentYear);
    }

    return yearRange(currentYear);
}
