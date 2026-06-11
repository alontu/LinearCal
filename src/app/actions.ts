'use server';

import { getServerSession } from "next-auth/next";
import { calendar_v3 } from "googleapis";
import { authOptions } from "@/lib/auth";
import { getEventsForRange, createEvent, updateEvent, deleteEvent } from "@/lib/google-calendar";

function messageOf(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

async function requireAccessToken(): Promise<string> {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
        throw new Error("Unauthorized: No active session or access token");
    }
    return session.accessToken;
}

export async function fetchCalendarEventsAction(calendarIds: string[], start: Date, end: Date) {
    const accessToken = await requireAccessToken();
    const googleCalendarIds = calendarIds.filter(id => id !== 'jewish-calendar' && id !== 'hebrew-date');
    return getEventsForRange(accessToken, start, end, googleCalendarIds);
}

export async function createEventAction(calendarId: string, eventData: calendar_v3.Schema$Event) {
    const accessToken = await requireAccessToken();
    try {
        const result = await createEvent(accessToken, calendarId, eventData);
        return { success: true as const, data: result };
    } catch (error: unknown) {
        console.error("Failed to create event:", error);
        return { success: false as const, error: messageOf(error, "Failed to create event") };
    }
}

export async function updateEventAction(calendarId: string, eventId: string, eventData: calendar_v3.Schema$Event) {
    const accessToken = await requireAccessToken();
    try {
        const result = await updateEvent(accessToken, calendarId, eventId, eventData);
        return { success: true as const, data: result };
    } catch (error: unknown) {
        console.error("Failed to update event:", error);
        return { success: false as const, error: messageOf(error, "Failed to update event") };
    }
}

export async function deleteEventAction(calendarId: string, eventId: string) {
    const accessToken = await requireAccessToken();
    try {
        await deleteEvent(accessToken, calendarId, eventId);
        return { success: true as const };
    } catch (error: unknown) {
        console.error("Failed to delete event:", error);
        return { success: false as const, error: messageOf(error, "Failed to delete event") };
    }
}

export async function createCalendarAction(title: string) {
    const accessToken = await requireAccessToken();
    try {
        const { createCalendar } = await import("@/lib/google-calendar");
        const result = await createCalendar(accessToken, title);
        return { success: true as const, data: result };
    } catch (error: unknown) {
        console.error("Failed to create calendar:", error);
        return { success: false as const, error: messageOf(error, "Failed to create calendar") };
    }
}
