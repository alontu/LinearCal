import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the session + the Google I/O layer so we test the action logic in isolation.
vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/google-calendar', () => ({
    getEventsForRange: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    createCalendar: vi.fn(),
}));

import { getServerSession } from 'next-auth/next';
import * as gcal from '@/lib/google-calendar';
import {
    fetchCalendarEventsAction,
    createEventAction,
    updateEventAction,
    deleteEventAction,
    createCalendarAction,
} from './actions';

const mockedSession = getServerSession as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.clearAllMocks();
    mockedSession.mockResolvedValue({ accessToken: 'tok-123' });
});

describe('auth enforcement', () => {
    it('throws when there is no session', async () => {
        mockedSession.mockResolvedValue(null);
        await expect(deleteEventAction('cal', 'evt')).rejects.toThrow(/Unauthorized/);
    });

    it('throws when the session has no access token', async () => {
        mockedSession.mockResolvedValue({ user: { name: 'x' } });
        await expect(createEventAction('cal', {})).rejects.toThrow(/Unauthorized/);
    });
});

describe('fetchCalendarEventsAction', () => {
    it('strips the virtual calendar ids before calling Google', async () => {
        (gcal.getEventsForRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);
        const start = new Date(2024, 0, 1);
        const end = new Date(2024, 0, 31);
        await fetchCalendarEventsAction(['primary', 'jewish-calendar', 'hebrew-date', 'work'], start, end);
        expect(gcal.getEventsForRange).toHaveBeenCalledWith('tok-123', start, end, ['primary', 'work']);
    });
});

describe('createEventAction', () => {
    it('returns success + data on success', async () => {
        (gcal.createEvent as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-1' });
        const res = await createEventAction('work@group', { summary: 'X' });
        expect(res).toEqual({ success: true, data: { id: 'new-1' } });
        expect(gcal.createEvent).toHaveBeenCalledWith('tok-123', 'work@group', { summary: 'X' });
    });

    it('maps a thrown error to { success:false, error }', async () => {
        (gcal.createEvent as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Boom'));
        const res = await createEventAction('cal', {});
        expect(res).toEqual({ success: false, error: 'Boom' });
    });
});

describe('updateEventAction', () => {
    it('passes the calendarId + eventId straight through', async () => {
        (gcal.updateEvent as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'evt-1' });
        const res = await updateEventAction('work@group', 'evt-1', { summary: 'Y' });
        expect(res.success).toBe(true);
        expect(gcal.updateEvent).toHaveBeenCalledWith('tok-123', 'work@group', 'evt-1', { summary: 'Y' });
    });

    it('reports failure without throwing', async () => {
        (gcal.updateEvent as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('404'));
        const res = await updateEventAction('cal', 'evt', {});
        expect(res).toEqual({ success: false, error: '404' });
    });
});

describe('deleteEventAction', () => {
    it('deletes via the provided calendar id', async () => {
        (gcal.deleteEvent as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
        const res = await deleteEventAction('work@group', 'evt-9');
        expect(res).toEqual({ success: true });
        expect(gcal.deleteEvent).toHaveBeenCalledWith('tok-123', 'work@group', 'evt-9');
    });
});

describe('createCalendarAction', () => {
    it('creates a calendar and returns its data', async () => {
        (gcal.createCalendar as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'cal-new', summary: 'Trips' });
        const res = await createCalendarAction('Trips');
        expect(res).toEqual({ success: true, data: { id: 'cal-new', summary: 'Trips' } });
    });
});
