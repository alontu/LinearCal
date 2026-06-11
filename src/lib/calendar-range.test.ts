import { describe, it, expect } from 'vitest';
import { eachMonthOfInterval } from 'date-fns';
import { yearRange, resolveRange } from './calendar-range';

const monthCount = (r: { startDate: Date; endDate: Date }) =>
    eachMonthOfInterval({ start: r.startDate, end: r.endDate }).length;

const TODAY = new Date(2026, 5, 11); // 2026-06-11

describe('yearRange', () => {
    it('spans Jan 1 .. Dec 31 of the given year', () => {
        const r = yearRange(2027);
        expect(r.startDate).toEqual(new Date(2027, 0, 1));
        expect(r.endDate).toEqual(new Date(2027, 11, 31));
    });

    it('is always exactly 12 months', () => {
        for (const y of [2024, 2025, 2026, 2027, 2028]) {
            expect(monthCount(yearRange(y))).toBe(12);
        }
    });
});

describe('resolveRange — default and year', () => {
    it('defaults to the current calendar year (12 months)', () => {
        const r = resolveRange({}, TODAY);
        expect(r.startDate).toEqual(new Date(2026, 0, 1));
        expect(r.endDate).toEqual(new Date(2026, 11, 31));
        expect(monthCount(r)).toBe(12);
    });

    it('year param yields exactly that calendar year (12 months)', () => {
        expect(resolveRange({ year: '2027' }, TODAY)).toEqual(yearRange(2027));
        expect(monthCount(resolveRange({ year: '2028' }, TODAY))).toBe(12);
    });

    it('falls back to the current year for an invalid year param', () => {
        expect(resolveRange({ year: 'abc' }, TODAY)).toEqual(yearRange(2026));
    });
});

describe('resolveRange — custom start+end (date-range picker)', () => {
    it('honors an explicit multi-month range (can exceed 12 months)', () => {
        const r = resolveRange({ start: '2026-04', end: '2027-04' }, TODAY);
        expect(r.startDate).toEqual(new Date(2026, 3, 1));
        // endOfMonth(Apr 2027) = Apr 30 (carries an end-of-day time component)
        expect(r.endDate.getFullYear()).toBe(2027);
        expect(r.endDate.getMonth()).toBe(3);
        expect(r.endDate.getDate()).toBe(30);
        expect(monthCount(r)).toBe(13);
    });

    it('falls back to the current year for an invalid custom range', () => {
        expect(resolveRange({ start: 'nope', end: 'nope' }, TODAY)).toEqual(yearRange(2026));
    });
});

describe('arrow navigation invariant (year ± 1 is always 12 months)', () => {
    it('stepping forward/back from any year stays a clean 12-month year', () => {
        // Arrows compute the target as startDate.getFullYear() ± 1, then the
        // page resolves it via the year param -> yearRange.
        const start = resolveRange({ start: '2026-04', end: '2027-04' }, TODAY); // a "bad" 13-month state
        const forwardYear = start.startDate.getFullYear() + 1; // 2027
        const r = resolveRange({ year: String(forwardYear) }, TODAY);
        expect(monthCount(r)).toBe(12);
        expect(r).toEqual(yearRange(2027));
    });
});
