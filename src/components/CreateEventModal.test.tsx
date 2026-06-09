// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Stub the server actions so we can assert how the modal calls them.
vi.mock('@/app/actions', () => ({
    createEventAction: vi.fn(),
    updateEventAction: vi.fn(),
    deleteEventAction: vi.fn(),
}));

import { updateEventAction, deleteEventAction } from '@/app/actions';
import CreateEventModal from './CreateEventModal';
import type { CalendarListEntry } from '@/lib/google-calendar';

const calendars: CalendarListEntry[] = [
    { id: 'primary', summary: 'ראשי', primary: true },
    { id: 'work@group.calendar.google.com', summary: 'עבודה', primary: false },
];

// An all-day event that lives in the NON-default ("work") calendar.
const editEvent = {
    id: 'evt-1',
    summary: 'פגישה',
    description: '',
    start: { date: '2024-01-10' },
    end: { date: '2024-01-12' }, // exclusive
    _calendarId: 'work@group.calendar.google.com',
};

function renderEdit() {
    return render(
        <CreateEventModal
            isOpen
            onClose={vi.fn()}
            initialDateRange={null}
            calendars={calendars}
            defaultCalendarId="primary"
            eventColors={{}}
            onSaveSuccess={vi.fn()}
            initialEvent={editEvent}
            onDeleteSuccess={vi.fn()}
        />,
    );
}

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.clearAllMocks();
});

describe('CreateEventModal edit mode — bug #1: operate on the event\'s own calendar', () => {
    it('saves against the event calendar (work), not the default (primary)', async () => {
        asMock(updateEventAction).mockResolvedValue({ success: true, data: { id: 'evt-1' } });
        renderEdit();

        fireEvent.click(screen.getByRole('button', { name: 'שמור' }));

        await waitFor(() => expect(updateEventAction).toHaveBeenCalled());
        const [calendarId, eventId] = asMock(updateEventAction).mock.calls[0];
        expect(calendarId).toBe('work@group.calendar.google.com');
        expect(eventId).toBe('evt-1');
    });

    it('deletes against the event calendar (work), not the default (primary)', async () => {
        window.confirm = vi.fn(() => true);
        asMock(deleteEventAction).mockResolvedValue({ success: true });
        renderEdit();

        fireEvent.click(screen.getByRole('button', { name: 'מחק' }));

        await waitFor(() => expect(deleteEventAction).toHaveBeenCalled());
        expect(asMock(deleteEventAction).mock.calls[0][0]).toBe('work@group.calendar.google.com');
    });
});
