import { google, calendar_v3 } from 'googleapis';

// Token refresh is handled in auth.ts via NextAuth rotation
// (NextAuth config uses access_type 'offline').

/** Extract a human-readable message from an unknown thrown value. */
function errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
}

/** Build an authenticated Calendar API client for a given access token. */
function calendarClient(accessToken: string): calendar_v3.Calendar {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return google.calendar({ version: 'v3', auth });
}

export async function getCalendarList(accessToken: string) {
    const calendar = calendarClient(accessToken);
    try {
        const response = await calendar.calendarList.list({ minAccessRole: 'reader' });
        return response.data.items || [];
    } catch (error: unknown) {
        console.error('Error fetching calendar list:', errorMessage(error));
        return [];
    }
}

export async function getEventsForRange(accessToken: string, start: Date, end: Date, calendarIds: string[] = ['primary']) {
    const calendar = calendarClient(accessToken);
    try {
        const promises = calendarIds.map(async (calendarId) => {
            try {
                const response = await calendar.events.list({
                    calendarId,
                    timeMin: start.toISOString(),
                    timeMax: end.toISOString(),
                    singleEvents: true,
                    orderBy: 'startTime',
                    maxResults: 2500,
                });
                return (response.data.items || []).map(event => ({
                    ...event,
                    // Tag the event with its source calendar so the client can
                    // resolve calendar color and target edits/deletes correctly.
                    _calendarId: calendarId,
                }));
            } catch (e: unknown) {
                console.error(`Failed to fetch for calendar ${calendarId}:`, errorMessage(e));
                return [];
            }
        });

        const results = await Promise.all(promises);
        return results.flat();
    } catch (error: unknown) {
        console.error('Error fetching calendar events:', errorMessage(error));
        return [];
    }
}

export async function getEventColors(accessToken: string) {
    const calendar = calendarClient(accessToken);
    try {
        const response = await calendar.colors.get();
        return response.data.event || {};
    } catch (error: unknown) {
        console.error('Error fetching event colors:', errorMessage(error));
        return {};
    }
}


export type CalendarEvent = {
    id?: string | null;
    summary?: string | null;
    description?: string | null;
    start?: { dateTime?: string | null; date?: string | null };
    end?: { dateTime?: string | null; date?: string | null };
    location?: string | null;
    colorId?: string | null;
    _calendarId?: string; // Internal helper
};

export type CalendarListEntry = {
    id?: string | null;
    summary?: string | null;
    backgroundColor?: string | null;
    foregroundColor?: string | null;
    primary?: boolean | null;
};


export async function createEvent(accessToken: string, calendarId: string, eventDetails: calendar_v3.Schema$Event) {
    const calendar = calendarClient(accessToken);
    try {
        const response = await calendar.events.insert({ calendarId, requestBody: eventDetails });
        return response.data;
    } catch (error: unknown) {
        console.error('Error creating event:', errorMessage(error));
        throw error;
    }
}

export async function updateEvent(accessToken: string, calendarId: string, eventId: string, eventDetails: calendar_v3.Schema$Event) {
    const calendar = calendarClient(accessToken);
    try {
        const response = await calendar.events.patch({ calendarId, eventId, requestBody: eventDetails });
        return response.data;
    } catch (error: unknown) {
        console.error('Error updating event:', errorMessage(error));
        throw error;
    }
}

export async function deleteEvent(accessToken: string, calendarId: string, eventId: string) {
    const calendar = calendarClient(accessToken);
    try {
        await calendar.events.delete({ calendarId, eventId });
        return { success: true };
    } catch (error: unknown) {
        console.error('Error deleting event:', errorMessage(error));
        throw error;
    }
}

export async function createCalendar(accessToken: string, title: string) {
    const calendar = calendarClient(accessToken);
    try {
        const response = await calendar.calendars.insert({ requestBody: { summary: title } });
        return response.data;
    } catch (error: unknown) {
        console.error('Error creating calendar:', errorMessage(error));
        throw error;
    }
}
