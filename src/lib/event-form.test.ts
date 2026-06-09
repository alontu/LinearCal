import { describe, it, expect } from 'vitest';
import {
    resolveEventCalendarId,
    tagEventCalendar,
    toInclusiveEndDate,
    toExclusiveEndDate,
    buildEventPayload,
} from './event-form';

describe('resolveEventCalendarId (bug #1: edit/delete target the right calendar)', () => {
    it('uses the event\'s own calendar id when present', () => {
        expect(resolveEventCalendarId({ _calendarId: 'work@group.calendar.google.com' }, 'primary')).toBe(
            'work@group.calendar.google.com',
        );
    });

    it('falls back when the event has no calendar id', () => {
        expect(resolveEventCalendarId({}, 'primary')).toBe('primary');
        expect(resolveEventCalendarId(null, 'primary')).toBe('primary');
        expect(resolveEventCalendarId(undefined, 'primary')).toBe('primary');
    });
});

describe('tagEventCalendar', () => {
    it('attaches the calendar id without mutating the original', () => {
        const original = { id: 'evt1', summary: 'X' };
        const tagged = tagEventCalendar(original, 'cal-2');
        expect(tagged._calendarId).toBe('cal-2');
        expect(tagged.id).toBe('evt1');
        expect((original as Record<string, unknown>)._calendarId).toBeUndefined();
    });
});

describe('all-day inclusive/exclusive end-date conversion', () => {
    it('converts Google exclusive end to inclusive display date', () => {
        // Event covers the 13th; Google end is the 14th.
        const inclusive = toInclusiveEndDate(new Date(2024, 0, 14));
        expect(inclusive.getFullYear()).toBe(2024);
        expect(inclusive.getMonth()).toBe(0);
        expect(inclusive.getDate()).toBe(13);
    });

    it('converts inclusive display date back to Google exclusive end', () => {
        const exclusive = toExclusiveEndDate(new Date(2024, 0, 13));
        expect(exclusive.getDate()).toBe(14);
    });

    it('is an exact round-trip across a month boundary', () => {
        const inclusive = new Date(2024, 0, 31);
        const back = toInclusiveEndDate(toExclusiveEndDate(inclusive));
        expect(back.getTime()).toBe(inclusive.getTime());
    });
});

describe('buildEventPayload', () => {
    it('builds an all-day payload with exclusive end date', () => {
        const payload = buildEventPayload({
            title: 'Vacation',
            description: 'beach',
            isAllDay: true,
            startDate: new Date(2024, 5, 10),
            endDate: new Date(2024, 5, 12), // inclusive
            startTime: '09:00',
            endTime: '10:00',
            colorId: null,
        });
        expect(payload.start).toEqual({ date: '2024-06-10' });
        expect(payload.end).toEqual({ date: '2024-06-13' }); // exclusive (+1)
        expect(payload.summary).toBe('Vacation');
        expect(payload).not.toHaveProperty('colorId');
    });

    it('defaults an empty title to the Hebrew placeholder', () => {
        const payload = buildEventPayload({
            title: '',
            description: '',
            isAllDay: true,
            startDate: new Date(2024, 5, 10),
            endDate: new Date(2024, 5, 10),
            startTime: '09:00',
            endTime: '10:00',
            colorId: null,
        });
        expect(payload.summary).toBe('(ללא כותרת)');
    });

    it('includes colorId when provided', () => {
        const payload = buildEventPayload({
            title: 'X',
            description: '',
            isAllDay: true,
            startDate: new Date(2024, 5, 10),
            endDate: new Date(2024, 5, 10),
            startTime: '09:00',
            endTime: '10:00',
            colorId: '5',
        });
        expect(payload.colorId).toBe('5');
    });

    it('builds a timed payload as naive local dateTime + explicit timeZone', () => {
        const payload = buildEventPayload({
            title: 'Meeting',
            description: '',
            isAllDay: false,
            startDate: new Date(2024, 0, 15),
            endDate: new Date(2024, 0, 15),
            startTime: '09:00',
            endTime: '10:30',
            colorId: null,
            timeZone: 'Asia/Jerusalem',
        });
        // Unambiguous Google representation: wall-clock time + zone (no UTC math).
        expect(payload.start).toEqual({ dateTime: '2024-01-15T09:00:00', timeZone: 'Asia/Jerusalem' });
        expect(payload.end).toEqual({ dateTime: '2024-01-15T10:30:00', timeZone: 'Asia/Jerusalem' });
        expect(payload.start.date).toBeUndefined();
    });

    it('falls back to a UTC instant when no timezone is supplied (TZ=UTC in tests)', () => {
        const payload = buildEventPayload({
            title: 'Meeting',
            description: '',
            isAllDay: false,
            startDate: new Date(2024, 0, 15),
            endDate: new Date(2024, 0, 15),
            startTime: '09:00',
            endTime: '10:30',
            colorId: null,
        });
        expect(payload.start.dateTime).toBe('2024-01-15T09:00:00.000Z');
        expect(payload.start.timeZone).toBeUndefined();
    });
});
