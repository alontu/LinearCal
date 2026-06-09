import { describe, it, expect } from 'vitest';
import {
    buildEventLayout,
    isMultiDayEvent,
    inclusiveEndDate,
    sortEventsForLayout,
} from './event-layout';
import type { CalendarEvent } from './google-calendar';

const timed = (id: string, startISO: string, endISO: string, cal = 'primary'): CalendarEvent => ({
    id,
    summary: id,
    start: { dateTime: startISO },
    end: { dateTime: endISO },
    _calendarId: cal,
});

const allDay = (id: string, startDate: string, endDateExclusive: string): CalendarEvent => ({
    id,
    summary: id,
    start: { date: startDate },
    end: { date: endDateExclusive },
    _calendarId: 'primary',
});

describe('isMultiDayEvent', () => {
    it('treats all-day events (date-based) as multi-day bars', () => {
        expect(isMultiDayEvent(allDay('a', '2024-01-10', '2024-01-11'))).toBe(true);
    });
    it('detects a same-day timed event as single-day', () => {
        expect(isMultiDayEvent(timed('a', '2024-01-10T09:00:00Z', '2024-01-10T10:00:00Z'))).toBe(false);
    });
    it('detects a timed event crossing midnight as multi-day', () => {
        expect(isMultiDayEvent(timed('a', '2024-01-10T23:00:00Z', '2024-01-11T01:00:00Z'))).toBe(true);
    });
});

describe('inclusiveEndDate (exclusive all-day end normalization)', () => {
    it('subtracts a day for all-day events', () => {
        const start = new Date(2024, 0, 10);
        const end = inclusiveEndDate(allDay('a', '2024-01-10', '2024-01-13'), start);
        expect(end.getDate()).toBe(12); // exclusive 13 -> inclusive 12
    });
    it('never returns an end before the start', () => {
        const start = new Date(2024, 0, 10);
        const end = inclusiveEndDate(allDay('a', '2024-01-10', '2024-01-10'), start);
        expect(end.getTime()).toBe(start.getTime());
    });
});

describe('buildEventLayout — single-day events', () => {
    it('puts a timed single-day event into eventsMap, not the segments', () => {
        const { eventsMap, multiDaySegments } = buildEventLayout([
            timed('m', '2024-01-15T09:00:00Z', '2024-01-15T10:00:00Z'),
        ]);
        expect(eventsMap['2024-01-15']).toHaveLength(1);
        expect(Object.keys(multiDaySegments)).toHaveLength(0);
    });

    it('renders a one-day all-day event as a single capped bar (start AND end)', () => {
        const { multiDaySegments, eventsMap } = buildEventLayout([allDay('a', '2024-01-10', '2024-01-11')]);
        expect(eventsMap['2024-01-10']).toBeUndefined();
        const seg = multiDaySegments['2024-01-10'];
        expect(seg).toHaveLength(1);
        expect(seg[0].isStart).toBe(true);
        expect(seg[0].isEnd).toBe(true);
    });
});

describe('buildEventLayout — multi-day spans', () => {
    it('spreads an all-day event across its inclusive days with start/end flags', () => {
        const { multiDaySegments, maxTracksPerDay } = buildEventLayout([allDay('trip', '2024-01-10', '2024-01-13')]);
        // Covers 10, 11, 12 (13 is exclusive)
        expect(Object.keys(multiDaySegments).sort()).toEqual(['2024-01-10', '2024-01-11', '2024-01-12']);
        expect(multiDaySegments['2024-01-10'][0].isStart).toBe(true);
        expect(multiDaySegments['2024-01-10'][0].isEnd).toBe(false);
        expect(multiDaySegments['2024-01-12'][0].isEnd).toBe(true);
        expect(multiDaySegments['2024-01-12'][0].isStart).toBe(false);
        expect(maxTracksPerDay['2024-01-11']).toBe(1);
    });

    it('allocates separate tracks for overlapping events', () => {
        const { multiDaySegments, maxTracksPerDay } = buildEventLayout([
            allDay('A', '2024-01-10', '2024-01-13'), // 10,11,12
            allDay('B', '2024-01-11', '2024-01-14'), // 11,12,13
        ]);
        const positionsOn11 = multiDaySegments['2024-01-11'].map(s => s.position).sort();
        expect(positionsOn11).toEqual([0, 1]);
        expect(maxTracksPerDay['2024-01-11']).toBe(2);
        // Day 10 only has one event -> one track used.
        expect(maxTracksPerDay['2024-01-10']).toBe(1);
    });

    it('reuses a freed track for non-overlapping events', () => {
        const { multiDaySegments } = buildEventLayout([
            allDay('A', '2024-01-10', '2024-01-12'), // 10,11
            allDay('B', '2024-01-13', '2024-01-15'), // 13,14 — no overlap with A
        ]);
        expect(multiDaySegments['2024-01-10'][0].position).toBe(0);
        expect(multiDaySegments['2024-01-13'][0].position).toBe(0);
    });
});

describe('sortEventsForLayout', () => {
    it('orders multi-day events before single-day events', () => {
        const single = timed('s', '2024-01-10T09:00:00Z', '2024-01-10T10:00:00Z');
        const multi = allDay('m', '2024-01-10', '2024-01-13');
        const sorted = sortEventsForLayout([single, multi]);
        expect(sorted[0].id).toBe('m');
    });
});
