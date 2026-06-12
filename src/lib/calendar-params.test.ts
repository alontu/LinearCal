import { describe, it, expect } from 'vitest';
import {
    buildCalendarsParam,
    applyCalendarsParam,
    isVirtualCalendarId,
    JEWISH_CALENDAR_ID,
    HEBREW_DATE_ID,
} from './calendar-params';

describe('isVirtualCalendarId', () => {
    it('recognizes the virtual overlay ids', () => {
        expect(isVirtualCalendarId(JEWISH_CALENDAR_ID)).toBe(true);
        expect(isVirtualCalendarId(HEBREW_DATE_ID)).toBe(true);
    });
    it('treats real calendar ids as non-virtual', () => {
        expect(isVirtualCalendarId('me@example.com')).toBe(false);
        expect(isVirtualCalendarId('primary')).toBe(false);
    });
});

describe('buildCalendarsParam', () => {
    it('keeps only real calendars when no overlay is enabled', () => {
        expect(
            buildCalendarsParam({ regularIds: ['a', 'b'], showJewishCalendar: false, showHebrewDate: false }),
        ).toEqual(['a', 'b']);
    });

    it('appends the enabled overlays after the real calendars', () => {
        expect(
            buildCalendarsParam({ regularIds: ['a'], showJewishCalendar: true, showHebrewDate: true }),
        ).toEqual(['a', JEWISH_CALENDAR_ID, HEBREW_DATE_ID]);
    });

    it('strips virtual ids that leak into regularIds (defensive)', () => {
        expect(
            buildCalendarsParam({
                regularIds: ['a', JEWISH_CALENDAR_ID, HEBREW_DATE_ID],
                showJewishCalendar: false,
                showHebrewDate: false,
            }),
        ).toEqual(['a']);
    });

    // --- Regression for bug #2: toggling a real calendar must NOT drop overlays ---
    it('preserves the Jewish-holidays overlay when a real calendar is toggled on', () => {
        // User had holidays on; now adds a second calendar "work".
        const result = buildCalendarsParam({
            regularIds: ['primary', 'work'],
            showJewishCalendar: true,
            showHebrewDate: false,
        });
        expect(result).toContain(JEWISH_CALENDAR_ID);
        expect(result).toContain('work');
    });

    it('preserves the Hebrew-date overlay when a real calendar is toggled off', () => {
        const result = buildCalendarsParam({
            regularIds: ['primary'],
            showJewishCalendar: false,
            showHebrewDate: true,
        });
        expect(result).toContain(HEBREW_DATE_ID);
    });
});

describe('applyCalendarsParam', () => {
    it('sets the calendars param from the full selection', () => {
        const params = new URLSearchParams('year=2026');
        applyCalendarsParam(params, { regularIds: ['primary'], showJewishCalendar: true, showHebrewDate: false });
        expect(params.get('calendars')).toBe(`primary,${JEWISH_CALENDAR_ID}`);
        expect(params.get('year')).toBe('2026'); // unrelated params untouched
    });

    it('deletes the calendars param when nothing is selected', () => {
        const params = new URLSearchParams('calendars=primary');
        applyCalendarsParam(params, { regularIds: [], showJewishCalendar: false, showHebrewDate: false });
        expect(params.has('calendars')).toBe(false);
    });

    it('round-trips: toggling a real calendar keeps overlays in the URL', () => {
        // Simulate the real scenario from the component.
        const params = new URLSearchParams(`calendars=primary,${JEWISH_CALENDAR_ID}`);
        // handleCalendarToggle would compute newVisibleIds = ['primary', 'work']
        applyCalendarsParam(params, {
            regularIds: ['primary', 'work'],
            showJewishCalendar: true, // still on in component state
            showHebrewDate: false,
        });
        const ids = params.get('calendars')!.split(',');
        expect(ids).toContain('primary');
        expect(ids).toContain('work');
        expect(ids).toContain(JEWISH_CALENDAR_ID);
    });

    // Regression: changing the year must keep the overlays even when the URL
    // hasn't committed the most recent toggle yet — by rebuilding `calendars`
    // from component state, not from the (stale) URL.
    it('year navigation rebuilds overlays from state over a stale URL', () => {
        const params = new URLSearchParams('calendars=primary&year=2026'); // URL missing overlays
        params.set('year', '2027');
        applyCalendarsParam(params, {
            regularIds: ['primary'],
            showJewishCalendar: true, // state says they ARE on
            showHebrewDate: true,
        });
        const ids = params.get('calendars')!.split(',');
        expect(ids).toContain(JEWISH_CALENDAR_ID);
        expect(ids).toContain(HEBREW_DATE_ID);
        expect(params.get('year')).toBe('2027');
    });
});
