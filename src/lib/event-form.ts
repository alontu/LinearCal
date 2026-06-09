import { format } from 'date-fns';

/**
 * Pure helpers behind the create/edit-event modal.
 *
 * The two important correctness concerns captured here:
 *  1. Edits and deletes must target the calendar the event actually lives in
 *     (`_calendarId`), not whatever calendar happens to be selected by default.
 *     Using the wrong id makes Google return 404 and the operation silently
 *     fails for any non-primary calendar.
 *  2. Google models all-day end dates as *exclusive* (an event on the 13th ends
 *     on the 14th). The UI shows *inclusive* dates, so we convert on the way in
 *     and out.
 */

/** Calendar an existing event belongs to, falling back when unknown. */
export function resolveEventCalendarId(
    event: { _calendarId?: string } | null | undefined,
    fallbackCalendarId: string,
): string {
    return event?._calendarId || fallbackCalendarId;
}

/** Tag an event (e.g. one returned by the Google API) with its calendar id. */
export function tagEventCalendar<T extends object>(
    event: T,
    calendarId: string,
): T & { _calendarId: string } {
    return { ...event, _calendarId: calendarId };
}

/** Google's exclusive all-day end date -> inclusive date shown to the user. */
export function toInclusiveEndDate(exclusiveEnd: Date): Date {
    const d = new Date(exclusiveEnd);
    d.setDate(d.getDate() - 1);
    return d;
}

/** Inclusive all-day end date (from the UI) -> Google's exclusive end date. */
export function toExclusiveEndDate(inclusiveEnd: Date): Date {
    const d = new Date(inclusiveEnd);
    d.setDate(d.getDate() + 1);
    return d;
}

export interface EventFormValues {
    title: string;
    description: string;
    isAllDay: boolean;
    startDate: Date;
    endDate: Date;
    /** "HH:mm" — used only when not all-day. */
    startTime: string;
    endTime: string;
    colorId: string | null;
    /** IANA timezone for timed events (e.g. "Asia/Jerusalem"). */
    timeZone?: string;
}

export interface GoogleEventPayload {
    summary: string;
    description: string;
    start: { date?: string; dateTime?: string; timeZone?: string };
    end: { date?: string; dateTime?: string; timeZone?: string };
    colorId?: string;
}

/**
 * Build the request body sent to the Google Calendar API from the modal's form
 * state.
 *  - All-day events use inclusive->exclusive date conversion.
 *  - Timed events send a *naive* local dateTime plus an explicit `timeZone`,
 *    which is the unambiguous Google representation (no reliance on the
 *    runtime's UTC offset). Falls back to a UTC instant if no timezone is given.
 */
export function buildEventPayload(values: EventFormValues): GoogleEventPayload {
    const payload: GoogleEventPayload = {
        summary: values.title || '(ללא כותרת)',
        description: values.description,
        start: {},
        end: {},
    };

    if (values.isAllDay) {
        payload.start = { date: format(values.startDate, 'yyyy-MM-dd') };
        payload.end = { date: format(toExclusiveEndDate(values.endDate), 'yyyy-MM-dd') };
    } else {
        const sDateTime = `${format(values.startDate, 'yyyy-MM-dd')}T${values.startTime}:00`;
        const eDateTime = `${format(values.endDate, 'yyyy-MM-dd')}T${values.endTime}:00`;
        if (values.timeZone) {
            payload.start = { dateTime: sDateTime, timeZone: values.timeZone };
            payload.end = { dateTime: eDateTime, timeZone: values.timeZone };
        } else {
            payload.start = { dateTime: new Date(sDateTime).toISOString() };
            payload.end = { dateTime: new Date(eDateTime).toISOString() };
        }
    }

    if (values.colorId) {
        payload.colorId = values.colorId;
    }

    return payload;
}
