'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getEventsForRange, createEvent, updateEvent, deleteEvent } from "@/lib/google-calendar";

export async function fetchCalendarEventsAction(calendarIds: string[], year: number) {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
        throw new Error("Unauthorized: No active session or access token");
    }

    // Define the full year range as per the existing logic
    const start = new Date(year, 0, 1); // Jan 1
    const end = new Date(year, 11, 31); // Dec 31

    const googleCalendarIds = calendarIds.filter(id => id !== 'jewish-calendar' && id !== 'hebrew-date');
    const events = await getEventsForRange(session.accessToken, start, end, googleCalendarIds);
    return events;
}



export async function createEventAction(calendarId: string, eventData: any) {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
        throw new Error("Unauthorized: No active session or access token");
    }

    try {
        const result = await createEvent(session.accessToken, calendarId, eventData);
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Failed to create event:", error);
        return { success: false, error: error.message || "Failed to create event" };
    }
}

export async function updateEventAction(calendarId: string, eventId: string, eventData: any) {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
        throw new Error("Unauthorized: No active session or access token");
    }

    try {
        const result = await updateEvent(session.accessToken, calendarId, eventId, eventData);
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Failed to update event:", error);
        return { success: false, error: error.message || "Failed to update event" };
    }
}

export async function deleteEventAction(calendarId: string, eventId: string) {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
        throw new Error("Unauthorized: No active session or access token");
    }

    try {
        await deleteEvent(session.accessToken, calendarId, eventId);
        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete event:", error);
        return { success: false, error: error.message || "Failed to delete event" };
    }
}

export async function createCalendarAction(title: string) {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
        throw new Error("Unauthorized: No active session or access token");
    }

    try {
        const { createCalendar } = await import("@/lib/google-calendar");
        const result = await createCalendar(session.accessToken, title);
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Failed to create calendar:", error);
        return { success: false, error: error.message || "Failed to create calendar" };
    }
}
