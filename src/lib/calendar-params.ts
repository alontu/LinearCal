/**
 * Helpers for managing the set of calendar IDs that drive both data fetching
 * and the `calendars` URL search-param.
 *
 * The calendar selection is made of two kinds of entries:
 *  - "real" Google calendars (identified by their Google calendar id), and
 *  - "virtual" calendars that are rendered purely on the client:
 *      - the Jewish holidays overlay (`jewish-calendar`)
 *      - the Hebrew date overlay (`hebrew-date`)
 *
 * All three toggles (real-calendar checkbox, holidays button, Hebrew-date
 * button) write to the *same* `calendars` URL param. Historically each toggle
 * rebuilt the param from only its own slice of state, so e.g. toggling a real
 * calendar would silently drop `jewish-calendar`/`hebrew-date` from the URL,
 * and the server round-trip would then reset those toggles to off.
 *
 * `buildCalendarsParam` is the single source of truth that recombines every
 * slice, so no toggle can clobber another.
 */

export const JEWISH_CALENDAR_ID = 'jewish-calendar';
export const HEBREW_DATE_ID = 'hebrew-date';
export const VIRTUAL_CALENDAR_IDS: readonly string[] = [JEWISH_CALENDAR_ID, HEBREW_DATE_ID];

export function isVirtualCalendarId(id: string): boolean {
    return VIRTUAL_CALENDAR_IDS.includes(id);
}

export interface CalendarSelection {
    /** Ids of the visible real Google calendars. */
    regularIds: string[];
    showJewishCalendar: boolean;
    showHebrewDate: boolean;
}

/**
 * Recombine the full calendar selection into the ordered list of ids that
 * belongs in the `calendars` URL param. Real calendars come first (virtual ids
 * are stripped from the input defensively), followed by any enabled overlays.
 */
export function buildCalendarsParam(selection: CalendarSelection): string[] {
    const ids = selection.regularIds.filter(id => !isVirtualCalendarId(id));
    if (selection.showJewishCalendar) ids.push(JEWISH_CALENDAR_ID);
    if (selection.showHebrewDate) ids.push(HEBREW_DATE_ID);
    return ids;
}

/**
 * Apply the selection onto a URLSearchParams-like object, setting or deleting
 * the `calendars` key. Returns the same params for chaining.
 */
export function applyCalendarsParam(params: URLSearchParams, selection: CalendarSelection): URLSearchParams {
    const ids = buildCalendarsParam(selection);
    if (ids.length > 0) {
        params.set('calendars', ids.join(','));
    } else {
        params.delete('calendars');
    }
    return params;
}
