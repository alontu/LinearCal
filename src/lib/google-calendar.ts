import { google } from 'googleapis';
import { startOfDay, endOfDay } from 'date-fns';

// Helper to refresh token is now handled in auth.ts via NextAuth rotation.
// Ensure your NextAuth config has 'offline' access_type (already done).


export async function getCalendarList(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    try {
        const response = await calendar.calendarList.list({
            minAccessRole: 'reader',
        });
        return response.data.items || [];
    } catch (error: any) {
        console.error('Error fetching calendar list:', error?.message || error);
        return [];
    }
}

export async function getEventsForRange(accessToken: string, start: Date, end: Date, calendarIds: string[] = ['primary']) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    try {
        const promises = calendarIds.map(async (calendarId) => {
            // console.log(`Fetching events for ${calendarId} from ${start.toISOString()} to ${end.toISOString()}`);
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
                    // optimization: tag event with calendarId so frontend knows source color if needed
                    // (though google event resource usually has colorId, not calendar color directly on event)
                    _calendarId: calendarId
                }));
            } catch (e) {
                console.error(`Failed to fetch for calendar ${calendarId}`, e);
                return [];
            }
        });

        const results = await Promise.all(promises);
        return results.flat();

    } catch (error: any) {
        console.error('Error fetching calendar events:', error?.message || error);
        return [];
    }
}

export async function getEventColors(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    try {
        const response = await calendar.colors.get();
        return response.data.event || {};
    } catch (error: any) {
        console.error('Error fetching event colors:', error?.message || error);
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


export async function createEvent(accessToken: string, calendarId: string, eventDetails: any) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    try {
        const response = await calendar.events.insert({
            calendarId,
            requestBody: eventDetails,
        });
        return response.data;
    } catch (error: any) {
        console.error('Error creating event:', error?.message || error);
        throw error;
    }
}

export async function updateEvent(accessToken: string, calendarId: string, eventId: string, eventDetails: any) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    try {
        const response = await calendar.events.patch({
            calendarId,
            eventId,
            requestBody: eventDetails,
        });
        return response.data;
    } catch (error: any) {
        console.error('Error updating event:', error?.message || error);
        throw error;
    }
}

export async function deleteEvent(accessToken: string, calendarId: string, eventId: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    try {
        await calendar.events.delete({
            calendarId,
            eventId,
        });
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting event:', error?.message || error);
        throw error;
    }
}

export async function createCalendar(accessToken: string, title: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    try {
        const response = await calendar.calendars.insert({
            requestBody: {
                summary: title
            }
        });
        return response.data;
    } catch (error: any) {
        console.error('Error creating calendar:', error?.message || error);
        throw error;
    }
}
