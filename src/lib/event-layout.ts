import { addDays, eachDayOfInterval, format, isSameDay, parseISO } from 'date-fns';
import type { CalendarEvent } from './google-calendar';

/**
 * Turns a flat list of calendar events into the data the grid needs:
 *  - `eventsMap`: timed, single-day events keyed by yyyy-MM-dd (rendered as a
 *    count badge in the day cell).
 *  - `multiDaySegments`: per-day segments for multi-day / all-day events,
 *    laid out into horizontal "tracks" so overlapping events stack instead of
 *    colliding.
 *  - `maxTracksPerDay`: how many tracks each day needs (for reserving height).
 *
 * Note on all-day events: Google reports their end date as *exclusive*, so we
 * subtract a day to get the inclusive last day the bar should cover.
 */

export interface MultiDaySegment {
    event: CalendarEvent;
    isStart: boolean;
    isEnd: boolean;
    position: number;
    /** Inclusive last day of the event (after exclusive-end normalization). */
    realEnd: Date;
}

export interface EventLayout {
    eventsMap: Record<string, CalendarEvent[]>;
    multiDaySegments: Record<string, MultiDaySegment[]>;
    maxTracksPerDay: Record<string, number>;
}

function eventStart(e: CalendarEvent): string | null | undefined {
    return e.start?.dateTime || e.start?.date;
}
function eventEnd(e: CalendarEvent): string | null | undefined {
    return e.end?.dateTime || e.end?.date;
}

/** Is this event multi-day (spans more than one calendar day)? */
export function isMultiDayEvent(e: CalendarEvent): boolean {
    if (e.end?.date) return true; // all-day events are laid out as bars
    if (e.start?.dateTime && e.end?.dateTime) {
        return !isSameDay(parseISO(e.start.dateTime), parseISO(e.end.dateTime));
    }
    return false;
}

/** Sort: multi-day first, then by start time, then longer-first. */
export function sortEventsForLayout(events: CalendarEvent[]): CalendarEvent[] {
    return [...events].sort((a, b) => {
        const startA = new Date(eventStart(a) || 0).getTime();
        const startB = new Date(eventStart(b) || 0).getTime();

        const isMultiA = isMultiDayEvent(a);
        const isMultiB = isMultiDayEvent(b);
        if (isMultiA && !isMultiB) return -1;
        if (!isMultiA && isMultiB) return 1;

        if (startA !== startB) return startA - startB;

        const endA = new Date(eventEnd(a) || 0).getTime();
        const endB = new Date(eventEnd(b) || 0).getTime();
        return endB - endA; // longer first
    });
}

/** Inclusive last day for an event, normalizing Google's exclusive all-day end. */
export function inclusiveEndDate(event: CalendarEvent, start: Date): Date {
    const endStr = eventEnd(event);
    let end = endStr ? parseISO(endStr) : start;
    if (event.end?.date) {
        end = addDays(end, -1);
    }
    if (end < start) end = start;
    return end;
}

export function buildEventLayout(events: CalendarEvent[]): EventLayout {
    const eventsMap: Record<string, CalendarEvent[]> = {};
    const multiDaySegments: Record<string, MultiDaySegment[]> = {};
    const maxTracksPerDay: Record<string, number> = {};

    const sorted = sortEventsForLayout(events);

    sorted.forEach(event => {
        const startStr = eventStart(event);
        if (!startStr) return;

        const start = parseISO(startStr);
        const realEnd = inclusiveEndDate(event, start);

        // Timed single-day events render as a count badge, not a bar.
        const isSingleDay = isSameDay(start, realEnd) && !event.start?.date;

        if (isSingleDay) {
            const key = format(start, 'yyyy-MM-dd');
            (eventsMap[key] ||= []).push(event);
            return;
        }

        const days = eachDayOfInterval({ start, end: realEnd });

        // Allocate the first track index that is free on *every* day of the event.
        let track = 0;
        for (;;) {
            let available = true;
            for (const day of days) {
                const key = format(day, 'yyyy-MM-dd');
                if (multiDaySegments[key]?.some(s => s.position === track)) {
                    available = false;
                    break;
                }
            }
            if (available) break;
            track++;
        }

        days.forEach((day, index) => {
            const key = format(day, 'yyyy-MM-dd');
            (multiDaySegments[key] ||= []).push({
                event,
                isStart: index === 0,
                isEnd: index === days.length - 1,
                position: track,
                realEnd,
            });
            maxTracksPerDay[key] = Math.max(maxTracksPerDay[key] || 0, track + 1);
        });
    });

    return { eventsMap, multiDaySegments, maxTracksPerDay };
}
